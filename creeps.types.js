const CreepType = {
    Carry       : "C",
    Worker      : "W",
    Miner       : "M",
    Attacker    : "A",
    Destroyer   : "D",
    Healer      : "H",
    Claimer     : "CL",
    Explore     : "E",
}

const RoomType = {
    Free    : "f",
    My      : "M",
    Friends : "F",
    Enemies : "E",
    Claim   : "C",
}

const RoomMode = {
    Peaceful    : "P",
    UnderAttack : "U",
    MakeAttack  : "M",
}

const FriendsNames = ["Mark", 'Outora', "Outora0"]
const MyName = "StiveMan"


function _makeBodyParts(energy, body_parts, max_count) {
    let body = [];
    let min_cost = 10000;

    _.forEach(body_parts, (body_part) => {
        if (min_cost > BODYPART_COST[body_part]) min_cost = BODYPART_COST[body_part];
    })

    while (energy >= min_cost && body.length < max_count) {
        _.forEach(body_parts, (body_part) => {
            if (energy >= BODYPART_COST[body_part] && body.length < max_count) {
                energy -= BODYPART_COST[body_part];
                body.push(body_part);
            }
        })
    }
    return body;
}

function createWorkerBody(energy) {
    if (energy < 250) return [];
    return _makeBodyParts(energy, [WORK, CARRY, MOVE], 50);
}
function createCarryBody(energy) {
    if (energy < 300) return [];
    return _makeBodyParts(energy, [CARRY, MOVE], 50);
}
function createAttackerBody(energy) {
    if (energy < 3250) return [];
    return _makeBodyParts(energy, [ATTACK, MOVE], 50);
}
function createDestroyerBody(energy) {
    if (energy < 300) return [];
    return _makeBodyParts(energy, [WORK, MOVE], 50);
}
function createHealerBody(energy) {
    if (energy < 300) return [];
    return _makeBodyParts(energy, [HEAL, MOVE], 50);
}
function createMinerBody(energy) {
    if (energy < 800) return [];
    return [WORK, WORK, WORK, WORK, WORK, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE];
}
function createExploreBody(energy) {
    if (energy < 50) return [];
    return [MOVE];
}
function createClaimBody(energy) {
    if(energy < 650){
        return [];
    }
    return [MOVE, CLAIM];
}
function createCreepBody(energy, type) {
    switch (type) {
        case CreepType.Worker:
            return createWorkerBody(energy);
        case CreepType.Carry:
            return createCarryBody(energy);
        case CreepType.Miner:
            return createMinerBody(energy);
        case CreepType.Explore:
            return createExploreBody(energy);
        case CreepType.Claimer:
            return createClaimBody(energy);
        case CreepType.Attacker:
            return createAttackerBody(energy);
        case CreepType.Destroyer:
            return createDestroyerBody(energy);
        case CreepType.Healer:
            return createHealerBody(energy);
    }
    return [];
}
function spawnCreeps(gameSpawn, roomName) {
    let RoomCreeps = Memory.rooms[roomName].creeps;

    let typeToCreate = null;
    let currentTick = Game.time;
    let minCount = -1;

    let energy = gameSpawn.room.energyAvailable;

    for (var creepType in CreepType) {
        let role = CreepType[creepType];
        let creepTypeInfo = RoomCreeps[role];

        if (creepTypeInfo.count >= creepTypeInfo.max)
            continue;

        let parts = createCreepBody(energy, role).length;
        if (creepTypeInfo.lastTime != null && (currentTick - creepTypeInfo.lastTime) + parts * CREEP_SPAWN_TIME < CREEP_LIFE_TIME / creepTypeInfo.max)
            continue;

        if ((minCount === -1 || minCount > creepTypeInfo.count) && parts !== 0) {
            typeToCreate = role;
            minCount = creepTypeInfo.count;
        }
    }

    if (typeToCreate == null) return;
    console.log(typeToCreate)


    let res = gameSpawn.spawnCreep(createCreepBody(energy, typeToCreate),
            gameSpawn.name + " " + currentTick, {
        memory: {
            type: typeToCreate,
            room: roomName,
            task: null,
            prev: null,
        }
    });
    let creepTypeInfo = RoomCreeps[typeToCreate];
    if (res === OK) {
        creepTypeInfo.lastTime = currentTick;
        creepTypeInfo.count++;
    }
}
function SpawnCreeps() {
    let gameSpawn;

    if (Memory.spawns == null) Memory.spawns = {};
    if (Memory.creeps == null) Memory.creeps = {};

    for (var spawnName in Game.spawns) {
        gameSpawn = Game.spawns[spawnName];
        if(gameSpawn.spawning) {
            var spawningCreep = Game.creeps[gameSpawn.spawning.name];
            gameSpawn.room.visual.text(
                '🛠️' + spawningCreep.name,
                gameSpawn.pos.x + 1,
                gameSpawn.pos.y,
                {align: 'left', opacity: 0.8});
            continue;
        }

        spawnCreeps(gameSpawn, gameSpawn.room.name);
    }
}


function getRoomType (gameRoom, prevType) {
    let gameController = gameRoom.controller;
    if(gameController == null || (gameController.owner == null && gameController.reservation == null)) {
        if (prevType === RoomType.Claim) return RoomType.Claim;
        return RoomType.Free;
    }
    let roomOwner = gameController.owner;
    let roomReservation = gameController.reservation;
    if ((roomOwner != null && roomOwner.username === MyName) ||
        (roomReservation != null && roomReservation.username === MyName)) {
        return RoomType.My;
    }
    if ((roomOwner != null && FriendsNames.includes(roomOwner.username)) ||
        (roomReservation != null && FriendsNames.includes(roomReservation.username))) {
        return RoomType.Friends;
    }
    return RoomType.Enemies;
}
function getRoomMode(gameRoom, prevMode, roomType) {
    let haveCreeps = hostileCreeps(gameRoom).length !== 0;

    if (!haveCreeps) {
        if (prevMode === RoomMode.MakeAttack) {
            let haveStructs = hostileStructs(gameRoom).length !== 0;
            if (haveStructs) return RoomMode.MakeAttack;
        }
        return RoomMode.Peaceful;
    }

    if ([RoomMode.UnderAttack, RoomMode.Peaceful].includes(prevMode) && roomType !== RoomType.Enemies)
        return RoomMode.UnderAttack;
    return RoomMode.MakeAttack;
}

function updateSpawnRoom(currentRoom, oldRoomName, newRoomName) {
    let oldSpawnRoom = Memory.rooms[oldRoomName]
    let newSpawnRoom = Memory.rooms[newRoomName]
    _.forEach(CreepType, (role) => {
        oldSpawnRoom.creeps[role].max -= currentRoom.creeps[role].need;
        newSpawnRoom.creeps[role].max += currentRoom.creeps[role].need;

        if (currentRoom.task != null) {
            _.forEach(currentRoom.task[role], (taskName) => {
                delete Memory.tasks[oldRoomName][taskName];
            });
            currentRoom.task[role] = [];
        }
    })
}
function updateDistance(roomNames, spawnNames) {
    let memRooms = Memory.rooms;
    let memSpawns = Memory.spawns;

    for (let roomName in roomNames) {
        if (memRooms[roomName].closestSpawn == null)
            memRooms[roomName].closestSpawn = {
                distance: null,
                roomName: null,
            };
        let currentRoom = memRooms[roomName];
        let closestSpawn = memRooms[roomName].closestSpawn;

        for (let spawnName in spawnNames) {
            let spawnRoomName = memSpawns[spawnName].roomName;
            let _distance = Game.map.getRoomLinearDistance(roomName, spawnRoomName);
            if (closestSpawn.distance == null || closestSpawn.distance > _distance) {
                if (closestSpawn.roomName != null)
                    updateSpawnRoom(currentRoom, closestSpawn.roomName, spawnRoomName);
                closestSpawn.distance = _distance;
                closestSpawn.roomName = spawnRoomName;
            }
        }
    }
}
function initData() {
    if (Memory.rooms == null) Memory.rooms = {};
    if (Memory.tasks == null) Memory.tasks = {};
    if (Memory.spawns == null) Memory.spawns = {};
    if (Memory.creeps == null) Memory.creeps = {};

    let memRooms = Memory.rooms;
    let memSpawns = Memory.spawns;
    let gameSpawns = Game.spawns;
    let currentTime = Game.time;


    let updateAll = false;
    let newRooms = {};
    let newSpawns = {};


    // Find new Rooms

    for (const roomName in Game.rooms) {
        if (memRooms[roomName] == null) {
            memRooms[roomName] = {
                type    : null,
                mode    : RoomMode.Peaceful,
                level   : 0,
                spawns  : 0,
                creeps  : {},
                flags   : {},
            };
            let RoomCreeps = memRooms[roomName].creeps;

            for (let creepType in CreepType) {
                let role = CreepType[creepType];
                if (RoomCreeps[role] == null)
                    RoomCreeps[role] = {
                        max     : 0,
                        need    : 0,
                        count   : 0,
                        lastTime: null,
                    };
            }
            newRooms[roomName] = null;
        }

        let memRoom = memRooms[roomName];

        memRoom.type = getRoomType(Game.rooms[roomName], memRoom.type);
        memRoom.mode = getRoomMode(Game.rooms[roomName], memRoom.mode, memRoom.type);
        memRoom.time = currentTime;

        if (memRoom.type === RoomType.My)
            memRoom.level = Game.rooms[roomName].controller.level;

        memRoom.flags = {};
    }

    for (const roomName in Memory.rooms) {
        let memRoom = memRooms[roomName];
        memRoom.flags = {};
    }

    _.forEach(Game.flags, (flag, flagName) => {
        let roomName = flag.pos.roomName;
        if (memRooms[roomName] == null) {
            memRooms[roomName] = {
                type    : null,
                mode    : RoomMode.Peaceful,
                level   : 0,
                spawns  : 0,
                creeps  : {},
                flags   : {},
            };
            let RoomCreeps = memRooms[roomName].creeps;

            for (let creepType in CreepType) {
                let role = CreepType[creepType];
                if (RoomCreeps[role] == null)
                    RoomCreeps[role] = {
                        max     : 0,
                        need    : 0,
                        count   : 0,
                        lastTime: null,
                    };
            }
            newRooms[roomName] = null;
        }
        memRooms[roomName].flags[flagName] = {
            pos : flag.pos,
            id  : flag.id,
        }
    })

    // Find new spawns
    for (let spawnName in gameSpawns) {
        if (memSpawns[spawnName] == null) {
            let roomName = gameSpawns[spawnName].room.name
            memSpawns[spawnName] = {
                roomName: roomName,
            };
            if (memRooms[roomName].spawns ++ === 0)
                newSpawns[spawnName] = null;
        }
    }
    // Find destroy spawns
    for (let spawnName in memSpawns) {
        if (Game.spawns[spawnName] == null) {
            if(--memRooms[memSpawns[spawnName].roomName].spawns === 0)
                updateAll = true;
            delete memSpawns[spawnName];
        }
    }
    if (updateAll || (Object.keys(newRooms).length !== 0 && Object.keys(newSpawns).length !== 0)) {
        updateDistance(memRooms, memSpawns);
    }
    else {
        if (Object.keys(newSpawns).length !== 0) {
            updateDistance(memRooms, newSpawns);
        }
        if (Object.keys(newRooms).length !== 0) {
            updateDistance(newRooms, memSpawns);
        }
    }
}


function hostileCreeps(gameRoom) {
    return gameRoom.find(FIND_CREEPS, {
        filter: (structure) =>
            structure.owner.username !== MyName &&
            !FriendsNames.includes(structure.owner.username)
    });
}
function hostileStructs(gameRoom) {
    return gameRoom.find(FIND_STRUCTURES, {
        filter: (structure) =>
            (structure.structureType === STRUCTURE_TOWER || structure.structureType === STRUCTURE_SPAWN) &&
            !FriendsNames.includes(structure.owner.username) && structure.owner.username !== MyName
    });
}


module.exports = {
    CreepType,
    RoomType,
    RoomMode,
    hostileCreeps,
    hostileStructs,
    SpawnCreeps,
    initData,
};