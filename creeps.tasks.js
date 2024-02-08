class CreepsTask {
    constructor(name, role, type, pos) {
        this.name = name;
        this.role = role;
        this.type = type;
        this.pos = pos;
    }

    getName() {
        let result = "";
        if (result !== "") result += " ";
        result += this.name;
        if (result !== "") result += " ";
        result += this.role;
        if (result !== "") result += " ";
        result += this.pos;
        return result;
    }

    static getPosition(taskPos) {
        // Game.map.getRoomTerrain
        return new RoomPosition(taskPos.x, taskPos.y, taskPos.roomName);
    }
}

function GetCountOfBodyParts(gameCreep, bodyPart) {
    let body = gameCreep.body;
    var count = 0;
    for(var i = body.length-1; i>=0; i--) {
        if (body[i].hits <= 0)
            break;
        if (body[i].type === bodyPart)
            count++;
    }
    return count;
}

function GetDistance(pos1, pos2) {
    function getDirectionsRoom(roomName) {
        let arr = roomName.split(/([N,E,S,W])/);
        let x = parseInt(arr[2]);
        let y = parseInt(arr[4]);
        if (arr[1] === 'W') x = -x;
        if (arr[3] === 'N') y = -y;
        return [x, y];
    }
    function getRoomDirectionSum(roomName1, roomName2) {
        if (roomName1 === roomName2) return [0, 0];
        let [x1, y1] = getDirectionsRoom(roomName1);
        let [x2, y2] = getDirectionsRoom(roomName2);
        return [x2 - x1, y2 - y1];
    }
    function getSumByDirection(roomVector, a, b) {
        let room_w = 50;
        if (roomVector === 0) return Math.abs(b - a);
        if (roomVector < 0) return room_w * (-roomVector) + room_w + (a - b);
        if (roomVector > 0) return room_w * roomVector    + room_w + (b - a);
    }
    let [xD, yD] = getRoomDirectionSum(pos1.roomName, pos2.roomName);
    let x = getSumByDirection(xD, pos1.x, pos2.x);
    let y = getSumByDirection(yD, pos1.y, pos2.y);
    return (x > y)? x : y;
}

function getTerrainPositions(pos, delta) {
    const terrain = Game.rooms[pos.roomName].lookAtArea(pos.y - delta, pos.x - delta, pos.y + delta, pos.x + delta);

    let result = [];
    for (let y in terrain) {
        for (let x in terrain[y]) {
            if (x === pos.x && y === pos.y) continue;
            let add = false;
            for (let typeId in terrain[y][x]) {
                if (terrain[y][x][typeId].type === LOOK_TERRAIN &&
                    terrain[y][x][typeId].terrain !== 'wall') {
                    add = true;
                    break;
                }
            }
            if (add)
                result.push(new RoomPosition(x, y, pos.roomName))
        }
    }
    return result;
}

function findTerrainStruct(pos, delta, structType) {
    const terrain = Game.rooms[pos.roomName].lookAtArea(pos.y - delta, pos.x - delta, pos.y + delta, pos.x + delta);
    for (let y in terrain) {
        for (let x in terrain[y]) {
            if (x === pos.x && y === pos.y) continue;

            for (let typeId in terrain[y][x]) {
                if (terrain[y][x][typeId].type === LOOK_STRUCTURES &&
                    structType.includes(terrain[y][x][typeId].structure.structureType)) {
                    return true;
                }

                if (terrain[y][x][typeId].type === LOOK_CONSTRUCTION_SITES &&
                    structType.includes(terrain[y][x][typeId].constructionSite.structureType)) {
                    return true;
                }
            }
        }
    }
    return false;
}

Object.assign(exports, {
    CreepsTask,
    GetCountOfBodyParts,
    GetDistance,
    getTerrainPositions,
    findTerrainStruct,
});