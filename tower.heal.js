function selectTragets(tower){
    return tower.room.find(FIND_MY_CREEPS, {
        filter: (s) => {
            return s.hits < s.hitsMax;
        }
    });
}

function work(tower){
    var goals = selectTragets(tower);
    for(var id in goals){
        if(tower.heal(goals[id]) == OK){
            return true;
        }
    }
    return false;
}

module.exports = {
    work:work,
};