const {CreepsTask, GetCountOfBodyParts} = require("./creeps.tasks");
const {CreepType, RoomType, RoomMode, hostileCreeps, hostileStructs} = require("./creeps.types");


const RoleName = "attacker";
const SubTasks = {
    Creep: "creep",
    Struct: "struct",
}


function GetTasks(memRoom, gameRoom, roleTasks, memTasks, roomCreeps) {
    let task;
    let taskName;
    let targets;
    let needSpawn;

    if (memRoom.mode === RoomMode.MakeAttack) return;
    // HOSTILE_CREEPS
    if ([RoomMode.UnderAttack, RoomMode.MakeAttack].includes(memRoom.mode)) {
        targets = hostileCreeps(gameRoom);
        _.forEach(targets, (target) => {
            task = new CreepsTask(SubTasks.Creep, RoleName, [CreepType.Attacker], target.pos);
            taskName = task.getName();
            roleTasks.push(taskName);

            if (memTasks[taskName] == null) memTasks[taskName] = task;
            let memTask = memTasks[taskName];
            memTask.id = target.id;

            if (memTask.data == null) memTask.data = {};
        });
        needSpawn = targets.length !== 0;

        // HOSTILE_STRUCTS
        targets = hostileStructs(gameRoom);
        _.forEach(targets, (target) => {
            task = new CreepsTask(SubTasks.Struct, RoleName, [CreepType.Attacker, CreepType.Destroyer], target.pos);
            taskName = task.getName();
            roleTasks.push(taskName);

            if (memTasks[taskName] == null) memTasks[taskName] = task;
            let memTask = memTasks[taskName];
            memTask.id = target.id;

            if (memTask.data == null) memTask.data = {};
        });
        needSpawn = targets.length !== 0;
    }
    if (needSpawn)
        roomCreeps[CreepType.Attacker] += 5;
}


function GetBenefits(task, gameCreep, memCreep) {
    if (task.name === SubTasks.Creep) return 100;
    return 1;
}
function SelectTask(task, gameCreep, memCreep) {
}
function UnSelectTask(task, memCreep) {
}


function CheckTask(task, gameCreep, memCreep) {
    return true;
}
function WorkChange(task, gameCreep, memCreep) {
    return false;
}


function tryToWork(task, gameCreep, gameObj) {
    if (gameObj == null) return ERR_INVALID_ARGS;
    if (task.name === SubTasks.Struct && GetCountOfBodyParts(gameCreep, WORK) > 0) {
        return gameCreep.dismantle(gameObj);
    } else {
        return gameCreep.attack(gameObj);
    }
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