const {CreepsTask, GetCountOfBodyParts} = require("./creeps.tasks");
const {CreepType, RoomType, RoomMode} = require("./creeps.types");


const RoleName = "claim";
const RoleWeight = 100;


function GetTasks(memRoom, gameRoom, roleTasks, memTasks, roomCreeps) {
    let task;
    let taskName;

    if (memRoom.type === RoomType.Claim) {
        // STRUCTURE_CONTROLLER
        task = new CreepsTask("", RoleName, [CreepType.Claimer], gameRoom.controller.pos);
        taskName = task.getName();
        roleTasks.push(taskName);

        if (memTasks[taskName] == null) memTasks[taskName] = task;
        let memTask = memTasks[taskName];
        memTask.id = gameRoom.controller.id;

        if (memTask.data == null) memTask.data = {};
        memTasks[taskName].data.max_count = 1;

        roomCreeps[CreepType.Claimer] += 1;
    }
}

function GetBenefits(task, gameCreep, memCreep) {
    return 1000;
}
function SelectTask(task, gameCreep, memCreep) {
    task.data.count += 1;
}
function UnSelectTask(task, memCreep) {
    task.data.count -= 1;
}


function CheckTask(task, gameCreep, memCreep) {
    if (task.data.count == null) task.data.count = 0;
    return task.data.count < task.data.max_count;
}
function WorkChange(task, gameCreep, memCreep) {
    return task.data.count - 1 >= task.data.max_count;
}


function tryToWork(task, gameCreep, gameObj) {
    if (gameObj == null) return ERR_INVALID_ARGS;
    return gameCreep.claimController(gameObj);
    // return gameCreep.upgradeController(gameObj);
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