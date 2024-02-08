const {CreepsTask} = require("./creeps.tasks");
const {CreepType, RoomType, RoomMode} = require("./creeps.types");


const RoleName = "builder";
const RoleWeight = 20;


function GetTasks(memRoom, gameRoom, roleTasks, memTasks, roomCreeps) {
    let task;
    let taskName;
    let targets;
    let allTargets;

    // STRUCTURE_EXTENSION
    allTargets = gameRoom.find(FIND_MY_CONSTRUCTION_SITES);
    if (memRoom.mode !== RoomMode.UnderAttack) {
        targets = _.filter(allTargets, (structure) => structure.structureType !== STRUCTURE_ROAD);

        if (targets.length === 0)
            targets = allTargets;
    } else {
        targets = _.filter(allTargets, (structure) =>
            [STRUCTURE_RAMPART, STRUCTURE_TOWER, STRUCTURE_WALL, STRUCTURE_SPAWN].includes(structure.structureType));
    }

    _.forEach(targets, (target) => {
        task = new CreepsTask("", RoleName, [CreepType.Worker], target.pos);
        if ([STRUCTURE_CONTAINER, STRUCTURE_LINK, STRUCTURE_SPAWN].includes(target.structureType))
            task.type.push(CreepType.Miner);
        taskName = task.getName();
        roleTasks.push(taskName);

        if (memTasks[taskName] == null) memTasks[taskName] = task;
        let memTask = memTasks[taskName];
        memTask.id = target.id;

        if (memTask.data == null) memTask.data = {};
        memTask.data.total = target.progressTotal;
        memTask.data.progress = target.progress;
    });

    roomCreeps[CreepType.Worker] += targets.length !== 0;
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
    return gameCreep.build(gameObj);
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