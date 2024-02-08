const {CreepsTask} = require("./creeps.tasks");
const {CreepType, RoomType, RoomMode} = require("./creeps.types");


const RoleName = "hauler";
const RoleWeight = 20;

const SubTasks = {
    Extension   : "extension",
    Spawn       : "spawn",
    Tower       : "tower",
}

function GetSubTasks(allTargets, memRoom, gameRoom, roleTasks, memTasks, roomCreeps) {
    let task;
    let taskName;
    let targets;

    targets = _.filter(allTargets, (structure) =>
        [STRUCTURE_SPAWN, STRUCTURE_EXTENSION, STRUCTURE_POWER_SPAWN].includes(structure.structureType) &&
        structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0);
    _.forEach(targets, (target) => {
        task = new CreepsTask(SubTasks.Extension, RoleName, [CreepType.Carry, CreepType.Worker], target.pos);
        taskName = task.getName();
        roleTasks.push(taskName);

        if (memTasks[taskName] == null) memTasks[taskName] = task;
        let memTask = memTasks[taskName];
        memTask.id = target.id;

        if (memTask.data == null) memTask.data = {};
        memTask.data.total = target.store.getCapacity(RESOURCE_ENERGY);
        memTask.data.progress = target.store.getUsedCapacity(RESOURCE_ENERGY);
    });
}

function GetTasks(memRoom, gameRoom, roleTasks, memTasks, roomCreeps) {
    let task;
    let taskName;
    let targets;
    let allTargets;

    allTargets = gameRoom.find(FIND_MY_STRUCTURES);
    if (memRoom.type === RoomType.My) {
        // STRUCTURE_TOWER
        targets = _.filter(allTargets, (structure) => structure.structureType === STRUCTURE_TOWER &&
            structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0);
        _.forEach(targets, (target) => {
            task = new CreepsTask(SubTasks.Tower, RoleName, [CreepType.Carry, CreepType.Worker], target.pos);
            taskName = task.getName();
            roleTasks.push(taskName);

            if (memTasks[taskName] == null) memTasks[taskName] = task;
            let memTask = memTasks[taskName];
            memTask.id = target.id;

            if (memTask.data == null) memTask.data = {};
            memTask.data.total = target.store.getCapacity(RESOURCE_ENERGY);
            memTask.data.progress = target.store.getUsedCapacity(RESOURCE_ENERGY);
        });

        if (gameRoom.energyCapacityAvailable > gameRoom.energyAvailable) {
            // STRUCTURE_EXTENSION
            let target = _.filter(allTargets, (structure) => structure.structureType === STRUCTURE_SPAWN)[0];
            task = new CreepsTask(SubTasks.Spawn, RoleName, [CreepType.Carry, CreepType.Worker], target.pos);
            taskName = task.getName();
            roleTasks.push(taskName);

            if (memTasks[taskName] == null) memTasks[taskName] = task;
            let memTask = memTasks[taskName];
            memTask.id = target.id;

            if (memTask.data == null) memTask.data = {};
            memTask.data.total = gameRoom.energyCapacityAvailable;
            memTask.data.progress = gameRoom.energyAvailable;

            if (memTask.sub_tasks == null) memTask.sub_tasks = {};
            if (memTask.sub_tasks_list == null) memTask.sub_tasks_list = [];
            let newTasks = [];

            GetSubTasks(allTargets, memRoom, gameRoom, newTasks, memTask.sub_tasks, roomCreeps);

            _.forEach(memTask.sub_tasks_list, (taskName) => {
                if (!newTasks.includes(taskName))
                    delete memTask.sub_tasks[taskName];
            });
            memTask.sub_tasks_list = newTasks;
        }
    }
}


function GetBenefits(task, gameCreep, memCreep) {
    let benefit = gameCreep.store[RESOURCE_ENERGY];
    let temp = task.data.total - (task.data.progress + task.data.predict);
    if (benefit > temp) benefit = temp;
    return benefit;
}
function SelectTask(task, gameCreep, memCreep) {
    task.data.predict += memCreep.capacity = gameCreep.store[RESOURCE_ENERGY];
}
function UnSelectTask(task, memCreep) {
    task.data.predict -= memCreep.capacity;
    memCreep.capacity = 0;
}


function changesTask(task, gameCreep, memCreep) {
    task.data.predict -= memCreep.capacity;
    SelectTask(task, gameCreep, memCreep);
}
function CheckTask(task, gameCreep, memCreep) {
    if (gameCreep.store[RESOURCE_ENERGY] === 0) return false;
    if (task.data.predict == null) task.data.predict = 0;
    return task.data.predict + task.data.progress < task.data.total;
}
function WorkChange(task, gameCreep, memCreep) {
    changesTask(task, gameCreep, memCreep);
    return memCreep.capacity === 0 ||
        task.data.predict + task.data.progress - memCreep.capacity >= task.data.total;
}


function tryToWork(task, gameCreep, gameObj) {
    if (gameObj == null) return ERR_INVALID_ARGS;
    let res = gameCreep.transfer(gameObj, RESOURCE_ENERGY);
    return res;
}
function ProcessTask(task, gameCreep, gameObj) {
    if (tryToWork(task, gameCreep, gameObj) !== OK) {
        gameCreep.moveTo(CreepsTask.getPosition(task.pos),{reusePath:15});
    }
}

module.exports = {
    roleName: RoleName,
    roleWeight: RoleWeight,
    GetTasks,

    GetBenefits,
    SelectTask,
    UnSelectTask,

    CheckTask,
    WorkChange,

    ProcessTask,
};