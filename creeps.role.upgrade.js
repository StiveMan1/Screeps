const {CreepsTask} = require("./creeps.tasks");
const {CreepType, RoomType, RoomMode} = require("./creeps.types");


const RoleName = "upgrade";
const RoleWeight = 0.5;

function GetTasks(memRoom, gameRoom, roleTasks, memTasks, roomCreeps) {
    let task;
    let taskName;

    if (memRoom.type === RoomType.My) {
        // STRUCTURE_CONTROLLER
        task = new CreepsTask("", RoleName, [CreepType.Worker], gameRoom.controller.pos);
        taskName = task.getName();
        roleTasks.push(taskName);

        if (memTasks[taskName] == null) memTasks[taskName] = task;
        let memTask = memTasks[taskName];
        memTask.id = gameRoom.controller.id;

        if (memTask.data == null) memTask.data = {};
        memTasks[taskName].data.max_count = (memRoom.level === 8) ? 1 : 6;

        roomCreeps[CreepType.Worker] += (memRoom.level === 8) ? 1 : 2;
    }
}

function GetBenefits(task, gameCreep, memCreep) {
    return gameCreep.store.getUsedCapacity(RESOURCE_ENERGY);
}
function SelectTask(task, gameCreep, memCreep) {
    task.data.count += 1;
}
function UnSelectTask(task, memCreep) {
    task.data.count -= 1;
}


function CheckTask(task, gameCreep, memCreep) {
    if (gameCreep.store[RESOURCE_ENERGY] === 0) return false;
    if (task.data.count == null) task.data.count = 0;
    return task.data.count < task.data.max_count;
}
function WorkChange(task, gameCreep, memCreep) {
    return gameCreep.store[RESOURCE_ENERGY] === 0 ||
        task.data.count - 1 >= task.data.max_count;
}


function tryToWork(task, gameCreep, gameObj) {
    if (gameObj == null) return ERR_INVALID_ARGS;
    return gameCreep.upgradeController(gameObj);
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