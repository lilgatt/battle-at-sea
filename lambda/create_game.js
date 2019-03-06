var AWS = require("aws-sdk");
var helpers = require("./game_helpers");

exports.handler = function(event, context, callback) {
    var userId = event.userId ? ("" + event.userId) : null; // if userId is passed, convert to a string, else use null
    var userName = event.userName ? ("" + event.userName) : null;
    var timestamp = (new Date()).getTime();

    // if userId is null, or empty string, zero or undefined 
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

        docClient.get(params, onGetGrid); //get is read
    };

    var onGetGrid = function(err, data) {
        if (err) { //db error
            callback(err);
        } else if (data.Item) { // there is Item
            callback(new Error("EXISTING_GAME: You already have a game started."));
        } else {
            createGrid(); //if id is not there, create a board
        }
    };

    var createGrid = function() {
        entry = {
            "id": userId,
            "name": userName,
            "state": "place_aircraft_carrier",
            "moveCount": 0,
            "lastMoveTime": timestamp,
            "opponentId": null,
            "grid": [
                [null, null, null, null, null, null, null, null, null, null],
                [null, null, null, null, null, null, null, null, null, null],
                [null, null, null, null, null, null, null, null, null, null],
                [null, null, null, null, null, null, null, null, null, null],
                [null, null, null, null, null, null, null, null, null, null],
                [null, null, null, null, null, null, null, null, null, null],
                [null, null, null, null, null, null, null, null, null, null],
                [null, null, null, null, null, null, null, null, null, null],
                [null, null, null, null, null, null, null, null, null, null],
                [null, null, null, null, null, null, null, null, null, null]
            ]
        };

        var params = {
            TableName: table,
            Item: entry
        };

        docClient.put(params, onCreateGrid); //put is create
    };

    var onCreateGrid = function(err, data) {
        if (err) { //db error
            callback(err);
        } else {
            callback(null, helpers.formatResponse(entry)); // board was saved
        }
    };

    getGrid();
};
