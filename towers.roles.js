// var builder = require('creep.builder');
// var charger = require('creep.charger');
// var upgreder = require('creep.upgreder');
// var harvester = require('creep.harvester');
// var rader = require('creep.rader');
var healer = require('tower.heal');
var repairer = require('tower.repair');
var attacker = require('tower.attack');



function workRole(tower){
    if(attacker.work(tower)){
        return;
    }
    if(healer.work(tower)){
        return;
    }
    if(repairer.work(tower)){
        return;
    }
}

module.exports = {
    run: workRole,
};