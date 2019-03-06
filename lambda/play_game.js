var AWS = require("aws-sdk");
var helpers = require("./game_helpers");

exports.handler = function(event, context, callback) {
    //verify that coordinates are passed and check that coordinates are within range (0 to 9)
    //get your grid if none then error
    //check the state: if != your turn, then error
    //get the opponentId, if null - error
    //fetch the opponentGrid. If empty - error
    //get the cell from opponentGrid
    //if !cell then update the cell to miss { state: "miss" }, save the move
    //if cell.state === "placed", then set the state to "hit", save the move
    //otherwise error
    //saving the game: batchWrite, set our state to "opponent_turn" and opp. state to "your_turn"
    //detect end of game, update state to winner/loser

    var userId = event.userId ? ("" + event.userId) : null;
    var coordinate = event.coordinate;
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
    var opponentEntry;
    
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
            checkState();
        }
    };

    var checkState = function() {
        if (entry.state !== "your_turn") {
            callback(new Error("INVALID_GAME_STATE: It's not your turn."));
        } else if (!entry.opponentId) {
            callback(new Error("INVALID_GAME_STATE: There is no opponent."));
        } else {
            getOpponentGrid(entry.opponentId);
        }
    };

    var getOpponentGrid = function(opponentId) {
        var params = {
            TableName: table,
            Key: {
                "id": opponentId
            }
        };

        docClient.get(params, onGetOpponentGrid); 
    };

    var onGetOpponentGrid = function(err, data) {
        if (err) {
            callback(err);
        } else if (!data.Item || (data.Item.opponentId !== entry.id)) {
            callback(new Error("OPPONENT_QUIT: Opponent quit the game."));
        } else {
            opponentEntry = data.Item;
            changeState();
        }
    };

    var changeState = function() {
        var opponentGrid = opponentEntry.grid;
        var cell = opponentGrid[rowIndex][colIndex]; //coordinates
        var count = opponentEntry.moveCount;

        if (!cell) {
            cell = {
                state: "miss", //cell is null so can't be cell.state, need to create an object
                moveIndex: count
            };
            opponentGrid[rowIndex][colIndex] = cell; //saving the state
            opponentEntry.moveCount = count + 1;
        } else if (cell.state === "placed") {
            cell.state = "hit";
            cell.moveIndex = count;
            opponentEntry.moveCount = count + 1;
        } else {
            callback(new Error("INVALID_COORDINATES: You've already fired at this cell. Please choose a different row and column."));
            return;
        }

        entry.lastMoveTime = timestamp;

        //check if the move sunk all of the opponent's ships
        if (helpers.isFleetGone(opponentGrid)) {
            entry.state = "you_win";
            opponentEntry.state = "you_lose";
        } else {     
            entry.state = "opponent_turn";
            opponentEntry.state = "your_turn";
        }

        var params = {
            RequestItems: {
                "battleship_grids": [{
                    PutRequest: {
                        Item: entry
                    }
                }, {
                    PutRequest: {
                        Item: opponentEntry
                    }
                }]
            }
        };

        docClient.batchWrite(params, onChangeState);
    };

    var onChangeState = function(err, data) {
        if (err) {
            callback(err);
        } else {
            callback(null, helpers.formatResponse(entry, opponentEntry));
        }
    };

    getGrid();
};
