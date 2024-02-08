function selectTragets(tower){
    if(tower.store.getUsedCapacity(RESOURCE_ENERGY) < 250) return [];
    var goals = tower.room.find(FIND_STRUCTURES, {
        filter: (s) => {
            if(s.structureType == STRUCTURE_WALL) return false;
            // return true;
            return s.hits < s.hitsMax;
        }
    });
    if(goals.length == 0){
        goals = tower.room.find(FIND_STRUCTURES, {
            filter: (s) => {
                if(s.structureType == STRUCTURE_WALL) return s.hits * 10000 < s.hitsMax;
                // if(s.structureType == STRUCTURE_RAMPART) return false;
                // return true;
                return s.hits < s.hitsMax;
            }
        });
    }
    return goals;
}

function work(tower){
    var goals = selectTragets(tower);
    for(var id in goals){
        if(tower.repair(goals[id]) === OK){
            return true;
        }
    }
    return false;
}

module.exports = {
    work:work,
};