const {CreepsTask} = require("./creeps.tasks");
const {CreepType, RoomType, RoomMode} = require("./creeps.types");


const RoleName = "storage";

const SubTasks = {
    Container       : "container",
    MyStorage       : "myStorage",
    Storage         : "storage",
    Link            : "link",
}



function GetTasks(memRoom, gameRoom, roleTasks, memTasks, roomCreeps ) {
    let task;
    let taskName;
    let targets;

    function taskMakeFunction(task, target) {
        taskName = task.getName();
        roleTasks.push(taskName);

        if (memTasks[taskName] == null) memTasks[taskName] = task;
        let memTask = memTasks[taskName];
        memTask.id = target.id;

        if (memTask.data == null) memTask.data = {};
        memTask.data.total = target.store.getCapacity();
        memTask.data.progress = target.store.getUsedCapacity();
        memTask.data.progress_energy = target.store.getUsedCapacity(RESOURCE_ENERGY);
        memTask.data.max_count = 3;
    }

    // STRUCTURE_CONTAINER
    if (memRoom.mode === RoomMode.Peaceful && memRoom.type !== RoomType.Friends) {
        targets = gameRoom.find(FIND_STRUCTURES, {
            filter: (structure) => structure.structureType === STRUCTURE_CONTAINER
        });
        _.forEach(targets, (target) => {
            task = new CreepsTask(SubTasks.Container, RoleName, [CreepType.Carry, CreepType.Miner, CreepType.Worker], target.pos);
            taskMakeFunction(task, target);
        });

        roomCreeps[CreepType.Carry] += targets.length;
    }

    if (memRoom.type === RoomType.My) {
        // STRUCTURE_STORAGE
        targets = gameRoom.find(FIND_STRUCTURES, {
            filter: (structure) => structure.structureType === STRUCTURE_STORAGE
        });
        _.forEach(targets, (target) => {
            task = new CreepsTask(SubTasks.MyStorage, RoleName, [CreepType.Carry, CreepType.Worker], target.pos);
            taskMakeFunction(task, target);
        });
    } else if (memRoom.mode === RoomMode.Peaceful && memRoom.type !== RoomType.Friends) {
        // STRUCTURE_STORAGE
        targets = gameRoom.find(FIND_STRUCTURES, {
            filter: (structure) => structure.structureType === STRUCTURE_STORAGE &&
                structure.store.getUsedCapacity() > 0
        });
        _.forEach(targets, (target) => {
            task = new CreepsTask(SubTasks.Storage, RoleName, [CreepType.Carry, CreepType.Worker], target.pos);
            taskMakeFunction(task, target);
        });

        roomCreeps[CreepType.Carry] += targets.length;
    }
}


function GetBenefits(task, gameCreep, memCreep) {
    let benefit;
    let temp;
    if (gameCreep.store.getUsedCapacity() > 0) {
        benefit = gameCreep.store.getUsedCapacity();
        temp = task.data.total - (task.data.progress + task.data.predict);
    } else {
        benefit = gameCreep.store.getFreeCapacity();
        temp = task.data.predict_energy + task.data.progress_energy;
    }
    if (benefit > temp) benefit = temp;
    return benefit;
}
function SelectTask(task, gameCreep, memCreep) {
    task.data.count += 1;
    memCreep.store = gameCreep.store.getUsedCapacity() > 0;
    if (memCreep.store) {
        task.data.predict += memCreep.capacity = gameCreep.store.getUsedCapacity();
        task.data.predict_energy += memCreep.capacity_energy = gameCreep.store.getUsedCapacity(RESOURCE_ENERGY);
    } else {
        task.data.predict += memCreep.capacity = -gameCreep.store.getFreeCapacity();
        task.data.predict_energy += memCreep.capacity_energy = -gameCreep.store.getFreeCapacity(RESOURCE_ENERGY);
    }

}
function UnSelectTask(task, memCreep) {
    task.data.count -= 1;
    task.data.predict -= memCreep.capacity;
    task.data.predict_energy -= memCreep.capacity_energy;
    memCreep.capacity = 0;
    memCreep.capacity_energy = 0;
    delete memCreep.store;
}


function changesTask(task, gameCreep, memCreep) {
    task.data.predict -= memCreep.capacity;
    task.data.predict_energy -= memCreep.capacity_energy;
    if (memCreep.store) {
        task.data.predict += memCreep.capacity = gameCreep.store.getUsedCapacity();
        task.data.predict_energy += memCreep.capacity_energy = gameCreep.store.getUsedCapacity(RESOURCE_ENERGY);
    } else {
        task.data.predict += memCreep.capacity = -gameCreep.store.getFreeCapacity();
        task.data.predict_energy += memCreep.capacity_energy = -gameCreep.store.getFreeCapacity(RESOURCE_ENERGY);
    }
}
function CheckTask(task, gameCreep, memCreep) {
    let creepType = memCreep.type;

    if (task.data.count == null) task.data.count = 0;
    if (task.data.predict == null) task.data.predict = 0;
    if (task.data.predict_energy == null) task.data.predict_energy = 0;

    if (gameCreep.store.getUsedCapacity() > 0) {
        if (task.data.predict + task.data.progress >= task.data.total)
            return false;
    } else if (gameCreep.store.getFreeCapacity() > 0) {
        if (task.data.progress_energy + task.data.predict_energy <= 0)
            return false;
    } else
        return false;

    if (creepType === CreepType.Miner) {
        return gameCreep.store.getUsedCapacity() > 0 && task.name === SubTasks.Container;
    } else if (creepType === CreepType.Carry) {
        if (gameCreep.store.getUsedCapacity() > 0)
            return task.name === SubTasks.MyStorage;
        else
            return (memCreep.prev !== RoleName && task.name === SubTasks.MyStorage) || task.name !== SubTasks.MyStorage;
    } else if (creepType === CreepType.Worker) {
        if (gameCreep.store.getUsedCapacity() > 0)
            return task.name !== SubTasks.Storage && memCreep.prev !== RoleName;
        else
            return true;

    }
    return false;
}
function WorkChange(task, gameCreep, memCreep) {
    changesTask(task, gameCreep, memCreep);
    if (memCreep.capacity === 0 || task.data.count - 1 >= task.data.max_count) return true;
    if (memCreep.store) {
        return task.data.predict + task.data.progress - memCreep.capacity >= task.data.total;
    }
    return task.data.predict_energy + task.data.progress_energy - memCreep.capacity_energy <= 0;
}

function tryToWork(task, gameCreep, gameObj) {
    if (gameObj == null) return ERR_INVALID_ARGS;
    if (Memory.creeps[gameCreep.name].store) {
        return gameCreep.transfer(gameObj, _.findKey(gameCreep.store));
    } else {
        if (task.name === SubTasks.Container)
            return gameCreep.withdraw(gameObj, _.findKey(gameObj.store));
        return gameCreep.withdraw(gameObj, RESOURCE_ENERGY);
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