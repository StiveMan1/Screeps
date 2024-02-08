const {CreepsTask, GetCountOfBodyParts, getTerrainPositions} = require("./creeps.tasks");
const {CreepType, RoomType, RoomMode} = require("./creeps.types");


const RoleName = "charger";
const SubTasks = {
    Source: "source",
    Drops: "drops",
    Tombstones: "tombstones",
}

function GetTasks(memRoom, gameRoom, roleTasks, memTasks, roomCreeps) {
    let task;
    let taskName;
    let targets;

    if ([RoomType.My, RoomType.Free].includes(memRoom.type) && RoomMode.Peaceful === memRoom.mode) {
        // FIND_DROPPED_RESOURCES
        targets = gameRoom.find(FIND_DROPPED_RESOURCES);

        _.forEach(targets, (target) => {
            task = new CreepsTask(SubTasks.Drops, RoleName, [CreepType.Carry, CreepType.Worker], target.pos);
            taskName = task.getName();
            roleTasks.push(taskName);

            if (memTasks[taskName] == null) memTasks[taskName] = task;
            let memTask = memTasks[taskName];
            memTask.id = target.id;

            if (memTask.data == null) memTask.data = {};
            memTask.data.total = target.amount;
        });

        // FIND_TOMBSTONES
        targets = gameRoom.find(FIND_TOMBSTONES, {
            filter: (s) => s.store[RESOURCE_ENERGY] > 0
        });
        _.forEach(targets, (target) => {
            task = new CreepsTask(SubTasks.Tombstones, RoleName, [CreepType.Carry, CreepType.Worker], target.pos);
            taskName = task.getName();
            roleTasks.push(taskName);

            if (memTasks[taskName] == null) memTasks[taskName] = task;
            let memTask = memTasks[taskName];
            memTask.id = target.id;

            if (memTask.data == null) memTask.data = {};
            memTask.data.total = target.store.getUsedCapacity()
        });

        // FIND_SOURCES_ACTIVE
        targets = gameRoom.find(FIND_SOURCES_ACTIVE);
        _.forEach(targets, (target) => {
            task = new CreepsTask(SubTasks.Source, RoleName, [CreepType.Worker, CreepType.Miner], target.pos);
            taskName = task.getName();
            roleTasks.push(taskName);

            if (memTasks[taskName] == null) memTasks[taskName] = task;
            let memTask = memTasks[taskName];
            memTask.id = target.id;

            if (memTask.data == null) memTask.data = {};
            if (RoomType.My) memTask.data.total = SOURCE_ENERGY_CAPACITY / ENERGY_REGEN_TIME;
            else memTask.data.total = SOURCE_ENERGY_NEUTRAL_CAPACITY / ENERGY_REGEN_TIME;
            memTask.data.total = 10;
            memTask.data.max_count = getTerrainPositions(target.pos, 1);

            if (memTask.data.miner != null && Game.creeps[memTasks[taskName].data.miner] == null)
                delete memTask.data.miner;

        });
        roomCreeps[CreepType.Miner] += targets.length;
    }
}


function GetBenefits(task, gameCreep, memCreep) {
    let benefit;
    if (task.name === SubTasks.Source)
        benefit = GetCountOfBodyParts(gameCreep, WORK) * HARVEST_POWER;
    else
        benefit = gameCreep.store.getFreeCapacity();
    let temp = task.data.total - task.data.predict;
    if (benefit > temp) benefit = temp;
    return benefit;
}
function SelectTask(task, gameCreep, memCreep) {
    task.data.count += 1;
    if (task.name === SubTasks.Source) {
        task.data.predict += memCreep.capacity = GetCountOfBodyParts(gameCreep, WORK) * HARVEST_POWER;
        if (memCreep.type === CreepType.Miner && memCreep.capacity >= task.data.total) {
            // if (memCreep.type !== CreepType.Miner) {
            //     if (memCreep.room != null && Memory.rooms[memCreep.room] != null) {
            //         let memRoom = Memory.rooms[memCreep.room];
            //         if (memRoom != null) {
            //             if (memCreep.type != null) {
            //                 let creepTypeInfo = memRoom.creeps[memCreep.type];
            //                 if (creepTypeInfo.count > 0)
            //                     creepTypeInfo.count--;
            //             }
            //
            //             memCreep.type = CreepType.Miner;
            //             creepTypeInfo = memRoom.creeps[memCreep.type];
            //             creepTypeInfo.count++;
            //         }
            //     }
            // }
            task.data.miner = memCreep.name = gameCreep.name;
        }
    } else {
        task.data.predict += memCreep.capacity = gameCreep.store.getFreeCapacity();
    }
}
function UnSelectTask(task, memCreep) {
    task.data.count -= 1;
    task.data.predict -= memCreep.capacity;
    if (task.data.miner != null && task.data.miner !== memCreep.name) task.data.miner = null;
}


function changesTask(task, gameCreep, memCreep) {
    UnSelectTask(task, memCreep);
    SelectTask(task, gameCreep, memCreep);
}
function CheckTask(task, gameCreep, memCreep) {
    if (gameCreep.store.getFreeCapacity() === 0) return false;
    if (task.data.miner != null && task.data.miner !== gameCreep.name) return false;
    if (task.data.count == null) task.data.count = 0;
    if (task.data.max_count != null && task.data.count >= task.data.max_count) return false;
    if (task.data.predict == null) task.data.predict = 0;
    return task.data.predict < task.data.total;
}
function WorkChange(task, gameCreep, memCreep) {
    changesTask(task, gameCreep, memCreep)
    if (task.data.miner != null && task.data.miner !== gameCreep.name) return true;
    if (task.data.max_count != null && task.data.count - 1 >= task.data.max_count) return true;
    return gameCreep.store.getFreeCapacity() === 0 || memCreep.capacity === 0 ||
        task.data.predict - memCreep.capacity >= task.data.total;
}


function tryToWork(task, gameCreep, gameObj) {
    if (gameObj == null) return ERR_INVALID_ARGS;
    if (task.name === SubTasks.Source) {
        return gameCreep.harvest(gameObj);
    } else if (task.name === SubTasks.Drops) {
        return gameCreep.pickup(gameObj);
    } else if (task.name === SubTasks.Tombstones) {
        return gameCreep.withdraw(gameObj, _.findKey(gameObj.store));
    }
    return ERR_INVALID_ARGS;
}
function ProcessTask(task, gameCreep, gameObj) {
    if (tryToWork(task, gameCreep, gameObj) !== OK) {
        gameCreep.moveTo(CreepsTask.getPosition(task.pos),{reusePath:15});
    }
}

module.exports = {
    roleName: RoleName,
    GetTasks,

    GetBenefits,
    SelectTask,
    UnSelectTask,

    CheckTask,
    WorkChange,

    ProcessTask,
};