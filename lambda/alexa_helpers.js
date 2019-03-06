var AWS = require("aws-sdk");
var lambda = new AWS.Lambda();
var LAMBDA_ARN = "arn:aws:lambda:[LAMBDA_ARN]";

// executes the lambda function given by name
// invokes the callback when the lambda function returns
// passing an error as a first parameter 
// or the response data as the second parameter
function invokeLambda(name, event, callback) {
    var params = { 
        FunctionName: LAMBDA_ARN + name, 
        InvocationType: "RequestResponse", 
        LogType: "None", 
        Payload: JSON.stringify(event)
    };

    lambda.invoke(params, function(err, data) {
        if (err) {
            callback(err);
        } else if (data.FunctionError) {
            err = JSON.parse(data.Payload);
            var msg = err.errorMessage;
            var match = msg.match(/^(\w+):\s*/); //regular expression to match the error code (in the form of any word) at the beginning of an error message until it reaches colon and any spaces (exclusive) one+ times
            if (match) {
                err = new Error(msg.substring(match[0].length)); //our error message after the colon and spaces
                err.code = match[1];  
            } else {
                err = new Error(msg);
            }
            callback(err);
        } else {
            callback(null, JSON.parse(data.Payload));
        }
    });
}

function invokeHandler(handlers, value) {
    for (var i = 0, length = handlers.length; i < length; i++) {
        var handler = handlers[i];
        if (handler.canHandle(value)) {
            return handler.handle(value);
        }
    }
    return null;
}

function normalizeRowCoordinate(rowCoordinate) {
    if (rowCoordinate == null) {
        return -1;
    }

    rowCoordinate = ("" + rowCoordinate).toUpperCase();

    switch (rowCoordinate) {
        case "1":
        case "A":
        case "A.":
        case "AY":
            return 0;
        case "2":
        case "B":
        case "B.":
        case "BEE":
            return 1;
        case "3":
        case "C":
        case "C.":
        case "CEE":
        case "SEE":
        case "SEA":
            return 2;
        case "4":
        case "D":
        case "D.":
        case "DEE":
            return 3;
        case "5":
        case "E":
        case "E.":
        case "EE":
            return 4;
        case "6":
        case "F":
        case "F.":
        case "EF":
        case "EFF":
            return 5;
        case "7":
        case "G":
        case "G.":
        case "GEE":
        case "JEE":
            return 6;
        case "8":
        case "H":
        case "H.":
        case "AITCH":
            return 7;
        case "9":
        case "I":
        case "I.":
        case "EYE":
        case "IE":
        case "AYE":
            return 8;
        case "10":
        case "J":
        case "J.":
        case "JAY":
            return 9;
        default:
            return -1;
    }
}

function normalizeColumnCoordinate(columnCoordinate) {
    if (columnCoordinate == null) {
        return -1;
    }

    columnCoordinate = "" + columnCoordinate;

    switch (columnCoordinate) {
        case "1":
            return 0;
        case "2":
            return 1;
        case "3":
            return 2;
        case "4":
            return 3;
        case "5":
            return 4;
        case "6":
            return 5;
        case "7":
            return 6;
        case "8":
            return 7;
        case "9":
            return 8;
        case "10":
            return 9;
        default:
            return -1;
    }
}

function normalizeDirection(direction) {
    if (direction == null) {
        return null;
    }

    direction = ("" + direction).toUpperCase();

    switch (direction) {
        case "UP":
            return "up";
        case "DOWN":
            return "down";
        case "LEFT":
            return "left";
        case "RIGHT":
            return "right";
        default:
            return null;
    }
}

function getLastMove(grid, fleet) {
    var lastMoveIndex = -1;
    var lastMove = null;

    var colIndex, rowIndex, colCount, rowCount, row, cell;

    for (rowIndex = 0, rowCount = grid.length; rowIndex < rowCount; rowIndex++) {
        row = grid[rowIndex];
        for (colIndex = 0, colCount = row.length; colIndex < colCount; colIndex++) {
            cell = row[colIndex];
            if (cell && (cell.moveIndex > lastMoveIndex)) {
                lastMoveIndex = cell.moveIndex;
                lastMove = {
                    ship: cell.ship,
                    state: cell.state,
                    row: rowIndex,
                    column: colIndex,
                    isSunk: cell.ship ? !fleet[cell.ship] : false
                };
            }
        }
    }

    return lastMove;
}

exports.invokeLambda = invokeLambda;
exports.invokeHandler = invokeHandler;
exports.normalizeColumnCoordinate = normalizeColumnCoordinate;
exports.normalizeRowCoordinate = normalizeRowCoordinate;
exports.normalizeDirection = normalizeDirection;
exports.getLastMove = getLastMove;
