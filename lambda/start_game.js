var AWS = require("aws-sdk");
var helpers = require("./game_helpers");

exports.handler = function(event, context, callback) {
    var userId = event.userId ? ("" + event.userId) : null;
    var timestamp = (new Date()).getTime();

    if (!userId) {
        callback(new Error("MISSING_PARAM: You forgot to pass a userId as a parameter."));
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
            findOpponent();
        }
    };

    var findOpponent = function() {
        if (entry.state !== "grid_ready") {
            callback(new Error("INVALID_GAME_STATE: Action is not allowed in this game state"));
            return;
        }
        // query parameters
        var params = {
            TableName: "battleship_grids",
            IndexName: "state-index",
            KeyConditionExpression: "#state = :state",
            ExpressionAttributeNames: {
                "#state": "state"
            },
            ExpressionAttributeValues: {
                ":state": "waiting_for_opponent"  
            }
        };

        docClient.query(params, onFindOpponent);
    };

    var onFindOpponent = function(err, data) {
        if (err) {
            callback(err);
        } else if (data.Items.length === 0) { //array of items returned by query (always returns an array)
            setToWaiting();
        } else {
            getOpponentGrid(data.Items[0].id);
        }
    };

    var setToWaiting = function() {
        entry.state = "waiting_for_opponent";
        entry.lastMoveTime = timestamp;
    
        var params = {
            TableName: table,
            Item: entry
        };

        docClient.put(params, onSetToWaiting); 
    };

    var onSetToWaiting = function(err, data) {
        if (err) {
            callback(err);
        } else {
            callback(null, helpers.formatResponse(entry));
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
        } else if (!data.Item || data.Item.opponentId) {
            // this will only happen when the opponent deletes their game in the middle of starting the game
            setToWaiting();
        } else {
            opponentEntry = data.Item;
            startGame();
        }
    };

    var startGame = function() {
        entry.lastMoveTime = timestamp;
        entry.state = "opponent_turn";
        opponentEntry.state = "your_turn";

        entry.opponentId = opponentEntry.id;
        opponentEntry.opponentId = entry.id;
        // API for saving into DynamoDB
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

        docClient.batchWrite(params, onStartGame);
    };

    var onStartGame = function(err, data) {
        if (err) {
            callback(err);
        } else {
            callback(null, helpers.formatResponse(entry, opponentEntry));
        }
    };

    getGrid();
};
