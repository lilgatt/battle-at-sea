var AWS = require("aws-sdk");
var helpers = require("./game_helpers");

exports.handler = function(event, context, callback) {
    var userId = event.userId ? ("" + event.userId) : null;
 
    if (!userId) {
        callback(new Error("MISSING_PARAM: You forgot to pass a userId as a parameter."));
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
            resetGrid();
        }
    };

    var resetGrid = function() {
        var myGrid = entry.grid;
        var colIndex, rowIndex, colCount, rowCount, row, cell;

        for (rowIndex = 0, rowCount = myGrid.length; rowIndex < rowCount; rowIndex++) {
            row = myGrid[rowIndex];
            for (colIndex = 0, colCount = row.length; colIndex < colCount; colIndex++) {
                cell = row[colIndex];
                if (cell && cell.ship) {
                    row[colIndex] = {
                        state: "placed",
                        ship: cell.ship
                    };
                } else if (cell) {
                    row[colIndex] = null;
                }
            }
        }

        switch(entry.state) {
            case "waiting_for_opponent":
            case "your_turn":
            case "opponent_turn":
            case "you_win":
            case "you_lose":
                entry.state = "grid_ready";
                break;
        }

        entry.moveCount = 0;
        entry.opponentId = null;

        var params = {
            TableName: table,
            Item: entry
        };

        docClient.put(params, onResetGrid);
    };

    var onResetGrid = function(err, data) {
        if (err) {
            callback(err);
        } else {
            callback(null, helpers.formatResponse(entry));
        }
    };

    getGrid();
};