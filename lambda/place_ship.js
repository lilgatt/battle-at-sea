var AWS = require("aws-sdk");
var helpers = require("./game_helpers");

exports.handler = function(event, context, callback) {
    var userId = event.userId ? ("" + event.userId) : null; 
    var coordinate = event.coordinate;
    var direction = event.direction;
    var timestamp = (new Date()).getTime();

    if (!userId) {
        callback(new Error("MISSING_PARAM: You forgot to pass a userId as a parameter."));
        return;
    }

    if (!(coordinate instanceof Array)) {
       callback(new Error("INVALID_PARAM: Invalid coordinates."));
       return; 
    }

    if (coordinate.length !== 2) {
        callback(new Error("INVALID_PARAM: You must have two coordinates."));
        return;
    }

    var rowIndex = Math.floor(coordinate[0]);
    var colIndex = Math.floor(coordinate[1]);
    if (!((rowIndex >= 0) && (rowIndex <= 9) && (colIndex >= 0) && (colIndex <= 9))) {
        callback(new Error("INVALID_PARAM: The coordinates must be between 0 and 9."));
        return;
    }

    var docClient = new AWS.DynamoDB.DocumentClient();

    var table = "battleship_grids";
    var entry;

    var getGrid = function() {
        var params = {
            TableName: table,
            Key: {
                "id": userId
            }
        };

        docClient.get(params, onGetGrid); 
    };

    var onGetGrid = function(err, data) {
        if (err) {
            callback(err);
        } else if (!data.Item) {
            callback(new Error("NO_GAME: You have no game"));
        } else {
            entry = data.Item;
            doPlaceShip();
        }
    };

    var doPlaceShip = function() {
        var shipName;
        
        if (entry.state === "place_aircraft_carrier") {
            shipName = "aircraft_carrier";
        } else if (entry.state === "place_battleship") {
            shipName = "battleship";
        } else if (entry.state === "place_cruiser") {
            shipName = "cruiser";
        } else if (entry.state === "place_destroyer") {
            shipName = "destroyer";
        } else if (entry.state === "place_submarine") {
            shipName = "submarine";
        } else {
            callback(new Error("INVALID_GAME_STATE: Action is not allowed in this game state"));
            return;
        }

        if ((shipName !== "submarine") && (direction !== "up") && (direction !== "down") && (direction !== "left") && (direction !== "right")) {
            callback(new Error("INVALID_PARAM: Invalid direction."));
            return;
        }

        var shipCoordinates = getShipCoordinates(shipName, [rowIndex, colIndex], direction);
        if (!canPlaceShip(entry.grid, shipCoordinates)) {
            callback(new Error("INVALID_COORDINATES: Invalid ship coordinates."));
            return;
        }
        
        placeShip(entry.grid, shipName, shipCoordinates);

        if (shipName === "aircraft_carrier") {
            entry.state = "place_battleship";
        } else if (shipName === "battleship") {
            entry.state = "place_cruiser";
        } else if (shipName === "cruiser") {
            entry.state = "place_destroyer";
        } else if (shipName === "destroyer") {
            entry.state = "place_submarine";
        } else {
            entry.state = "grid_ready";
        }
        
        saveGrid();        
    };

    var saveGrid = function() {     
        var params = {
            TableName: table,
            Item: entry
        };

        docClient.put(params, onSaveGrid); 
    };

    var onSaveGrid = function(err, data) {
        if (err) { //db error
            callback(err);
        } else {
            callback(null, helpers.formatResponse(entry));
        }
    };

    getGrid();
};

var getShipCoordinates = function(shipName, startCoordinate, direction) {
    var coordinates = [];
    var startRow = startCoordinate[0];
    var startColumn = startCoordinate[1];
    var deltaRow = 0;
    var deltaColumn = 0;
    var shipLength;
    var i;

    if (shipName === "aircraft_carrier") {
        shipLength = 5;
    } else if (shipName === "battleship") {
        shipLength = 4;
    } else if (shipName === "cruiser") {
        shipLength = 3;
    } else if (shipName === "destroyer") {
        shipLength = 2;
    } else if (shipName === "submarine") {
        shipLength = 1;
    } else {
        throw new Error("Invalid ship name");
    }
    
    if (shipLength > 1) {
        if (direction === "up") {
            deltaRow = -1;
        } else if (direction === "down") {
            deltaRow = 1;
        } else if (direction === "left") {
            deltaColumn = -1;
        } else if (direction === "right") {
            deltaColumn = 1;
        } else {
            throw new Error("Invalid direction");
        }
    }

    for (i = 0; i < shipLength; i++) {
        coordinates.push([startRow + (deltaRow * i), startColumn + (deltaColumn * i)]);
    }

    return coordinates;
};

var canPlaceShip = function(grid, shipCoordinates) { // can also do *function canPlaceShip(grid, shipCoordinates)* but JS will move all function declared this way to the top ("hoist")
    var coordinate;
    var row;
    var column;
    var i;
    var l;

    for (i = 0, l = shipCoordinates.length; i < l; i++) {
        coordinate = shipCoordinates[i];
        row = coordinate[0];
        column = coordinate[1];

        if (!(row >= 0 && row < 10 && column >= 0 && column < 10)) {
            return false;
        }

        if (grid[row][column]) {
            return false;
        }
    }

    return true;
};

var placeShip = function(grid, shipName, shipCoordinates) {
    var coordinate;
    var row;
    var column;
    var i;
    var l;

    for (i = 0, l = shipCoordinates.length; i < l; i++) {
        coordinate = shipCoordinates[i];
        row = coordinate[0];
        column = coordinate[1];

        grid[row][column] = {
            state: "placed",
            ship: shipName,
        };
    }
};
