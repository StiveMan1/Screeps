const {CreepsTask, GetDistance} = require("creeps.tasks");
const {CreepType, RoomType, RoomMode, SpawnCreeps, initData} = require("creeps.types");


const arrayOfRoles = {
    "attacker"  : require('creeps.role.attacker'),
    "builder"   : require('creeps.role.builder'),
    "charger"   : require('creeps.role.charger'),
    "claim"     : require('creeps.role.claim'),
    "explore"   : require('creeps.role.explore'),
    "hauler"    : require('creeps.role.hauler'),
    "repair"    : require('creeps.role.repair'),
    "storage"   : require('creeps.role.storage'),
    "upgrade"   : require('creeps.role.upgrade'),
}

function UpdateTasks() {
    for (const roomName in Memory.rooms) {
        let gameRoom = Game.rooms[roomName];
        let memRoom = Memory.rooms[roomName];

        let spawnRoomName = roomName;
        if (memRoom.closestSpawn != null)
            spawnRoomName = memRoom.closestSpawn.roomName;


        let creepsRoles = {}

        _.forEach(CreepType, (role) => creepsRoles[role] = 0)

        { // Update room Tasks
            if (Memory.tasks[spawnRoomName] == null) Memory.tasks[spawnRoomName] = {};
            let memTasks = Memory.tasks[spawnRoomName];

            if (memRoom.task == null) memRoom.task = {};
            let roomTasks = memRoom.task;

            for (let role in arrayOfRoles) {
                if (roomTasks[role] == null) roomTasks[role] = [];
                let newTasks = [];

                if (Game.time - memRoom.time < 2 * CREEP_LIFE_TIME) {
                    if (gameRoom != null && arrayOfRoles[role].GetTasks != null)
                        arrayOfRoles[role].GetTasks(memRoom, gameRoom, newTasks, memTasks, creepsRoles);
                    else if (arrayOfRoles[role].GetOfflineTasks != null)
                        arrayOfRoles[role].GetOfflineTasks(roomName, memRoom, newTasks, memTasks);
                    else continue;
                } else if (roomTasks[role].length === 0) continue;

                _.forEach(roomTasks[role], (taskName) => {
                    if (!newTasks.includes(taskName))
                        delete memTasks[taskName];
                });
                roomTasks[role] = newTasks;
            }
        }

        { // Update spawn creeps count
            let roomCreeps = memRoom.creeps;
            let isCreepsUpdates = false;

            for (let creepType in CreepType) {
                let role = CreepType[creepType];

                if (roomCreeps[role] == null) roomCreeps[role] = {
                        max     : 0,
                        need    : 0,
                        count   : 0,
                        lastTime: null,
                    };

                if (creepsRoles[role] !== roomCreeps[role].need) {
                    isCreepsUpdates = true;
                    break;
                }
            }
            if (isCreepsUpdates) {
                let RoomCreeps = Memory.rooms[memRoom.closestSpawn.roomName].creeps;

                _.forEach(CreepType, (role) => {
                    RoomCreeps[role].max += creepsRoles[role] - roomCreeps[role].need;
                    roomCreeps[role].need = creepsRoles[role];
                })
            }
        }
    }
}

function creepCheckToChange(memTasks, memCreep, gameCreep) {
    if (memCreep == null || memCreep.task == null) return false;
    let task = memTasks[memCreep.task]
    if (task != null) {
        let gameObj; // Get game object
        if (task.id != null)
            gameObj = Game.getObjectById(task.id);
        else if (task.flagName != null)
            gameObj = Game.flags[task.flagName];


        if (gameObj != null || gameCreep.pos.roomName !== task.pos.roomName) {
            let roleFunctions = arrayOfRoles[task.role];
            if (!roleFunctions.WorkChange(task, gameCreep, memCreep)) {
                if (task.sub_tasks != null) {
                    return creepCheckToChange(task.sub_tasks, memCreep.sub, gameCreep);
                }
                roleFunctions.ProcessTask(task, gameCreep, gameObj);
                return true;
            }
        }
    }
    removeRole(memTasks, memCreep)
    return false;
}

function selectTasksForCreep(tasks, memTasks, memCreep, gameCreep) {
    _.forEach(memTasks, (task, taskId) => {
        if (!task.type.includes(memCreep.type)) return;
        if (task.pos == null) return;

        let roleFunctions = arrayOfRoles[task.role];
        // Creep suits with task
        if (!roleFunctions.CheckTask(task, gameCreep, memCreep)) return;

        let dist = GetDistance(gameCreep.pos, task.pos)
        let benefit = 1;
        if (roleFunctions.GetBenefits != null)
            benefit = roleFunctions.GetBenefits(task, gameCreep, memCreep);
        if (roleFunctions.roleWeight != null)
            benefit *= roleFunctions.roleWeight;
        benefit = benefit / (dist * dist);

        tasks.push({
            benefit: benefit,
            creepName: gameCreep.name,
            taskId: taskId,
        });
    });
}

function removeRole(memTasks, memCreep) {
    let task = memTasks[memCreep.task]
    if (task != null) {
        if (task.sub_tasks != null && memCreep.sub != null)
            removeRole(task.sub_tasks, memCreep.sub);
        arrayOfRoles[task.role].UnSelectTask(task, memCreep);
        memCreep.prev = task.role;
    }
    memCreep.task = null;
}

function CreepsProcess () {
    let tasks = [];
    let sub_tasks = [];

    let memRooms = Memory.rooms;

    _.forEach(Memory.creeps, (memCreep, creepName, memCreeps) => {
        let memTasks = Memory.tasks[memCreep.room];
        if (memCreep.sub == null) memCreep.sub = {type: memCreep.type};

        if (!Game.creeps[creepName]) {
            if (memCreep.task != null)
                removeRole(memTasks, memCreep);

            if (memCreep.room != null && memCreep.type != null && memRooms[memCreep.room] != null) {
                let creepTypeInfo = memRooms[memCreep.room].creeps[memCreep.type];
                if (creepTypeInfo.count > 0)
                    creepTypeInfo.count--;
            }
            delete memCreeps[creepName];
            return;
        }

        let gameCreep = Game.creeps[creepName];

        if (creepCheckToChange(memTasks, memCreep, gameCreep))
            return;

        if (memCreep.task == null) {
            selectTasksForCreep(tasks, memTasks, memCreep, gameCreep);
        } else if (memCreep.sub.task == null) {
            let task = memTasks[memCreep.task];
            selectTasksForCreep(sub_tasks, task.sub_tasks, memCreep.sub, gameCreep);
        }
    });

    tasks = tasks.sort((a, b) => b.benefit - a.benefit);
    let usedTasks = {};
    let usedCreeps = {};
    _.forEach(tasks, (elm) => {
        if (usedTasks[elm.taskId] || usedCreeps[elm.creepName]) return;
        usedTasks[elm.taskId] = true;
        usedCreeps[elm.creepName] = true;

        // Add Task
        let memCreep = Memory.creeps[elm.creepName];
        let gameCreep = Game.creeps[elm.creepName];
        let task = Memory.tasks[memCreep.room][elm.taskId];
        arrayOfRoles[task.role].SelectTask(task, gameCreep, memCreep);
        memCreep.task = elm.taskId;
        gameCreep.say(task.name + '😨');

        if (task.sub_tasks == null)
            return arrayOfRoles[task.role].ProcessTask(task, gameCreep);

        selectTasksForCreep(sub_tasks, task.sub_tasks, memCreep.sub, gameCreep);
    });


    sub_tasks = sub_tasks.sort((a, b) => b.benefit - a.benefit);
    usedTasks = {};
    usedCreeps = {};
    _.forEach(sub_tasks, (elm) => {
        if (usedTasks[elm.taskId] || usedCreeps[elm.creepName]) return;
        usedTasks[elm.taskId] = true;
        usedCreeps[elm.creepName] = true;

        // Add Sub Task
        let memCreep = Memory.creeps[elm.creepName];
        let gameCreep = Game.creeps[elm.creepName];
        let task = Memory.tasks[memCreep.room][memCreep.task];
        let sub_task = task.sub_tasks[elm.taskId];
        arrayOfRoles[task.role].SelectTask(sub_task, gameCreep, memCreep.sub);
        memCreep.sub.task = elm.taskId;
        gameCreep.say(sub_task.name + '😨');

        arrayOfRoles[task.role].ProcessTask(sub_task, gameCreep);
    })
}

function processAllCreeps () {
    // brake_code();
    initData();

    UpdateTasks();
    CreepsProcess();

    SpawnCreeps();
}

module.exports = {
    processAllCreeps,
};