const {CreepsTask, GetCountOfBodyParts} = require("./creeps.tasks");
const {CreepType, RoomType, RoomMode} = require("./creeps.types");


const RoleName = "explore";


function GetOfflineTasks(roomName, memRoom, roleTasks, memTasks) {
    let task;
    let taskName;
    let targets;

    targets =  Game.map.describeExits(roomName);
    _.forEach(targets, (targetRoom) => {
        if (Memory.rooms[targetRoom] != null && Game.time - Memory.rooms[targetRoom].time < 10 * CREEP_LIFE_TIME)
            return;

        task = new CreepsTask("", RoleName, [CreepType.Explore], new RoomPosition(25, 25, targetRoom));
        taskName = task.getName();
        roleTasks.push(taskName);

        if (memTasks[taskName] == null) memTasks[taskName] = task;
        let memTask = memTasks[taskName];

        if (memTask.data == null) memTask.data = {};
        memTask.data.max_count = 1;
        memTask.data.last_time = 1;
        if (Memory.rooms[targetRoom] != null)
            memTask.data.last_time = Memory.rooms[targetRoom].time
    });
}

function GetTasks(memRoom, gameRoom, roleTasks, memTasks, roomCreeps) {

    if (memRoom.type === RoomType.My)
        roomCreeps[CreepType.Explore] = 1;
    GetOfflineTasks(gameRoom.name, memRoom, roleTasks, memTasks)
    // for ()
}

function GetBenefits(task, gameCreep, memCreep) {
    return Game.time - task.data.last_time;
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
    return ERR_INVALID_ARGS;
}
function ProcessTask(task, gameCreep, gameObj) {
    if (tryToWork(task, gameCreep, gameObj) !== OK) {
        gameCreep.moveTo(CreepsTask.getPosition(task.pos),{reusePath:15});
    }
}

module.exports = {
    roleName: RoleName,
    GetOfflineTasks,
    GetTasks,

    GetBenefits,
    SelectTask,
    UnSelectTask,

    CheckTask,
    WorkChange,

    ProcessTask,
};