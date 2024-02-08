
let playersNotAttack = ['Outora', "Outora0"]

function selectTragets(tower){
    return tower.room.find(FIND_HOSTILE_CREEPS, {
        filter: (creep) => !playersNotAttack.includes(creep.owner.username)
    });
}

function work(tower){
    var goals = selectTragets(tower);
    for(var id in goals){
        if(tower.attack(goals[id]) === OK){
            return true;
        }
    }
    return false;
}

module.exports = {
    work:work,
};