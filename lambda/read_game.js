var AWS = require("aws-sdk");
var helpers = require("./game_helpers");

exports.handler = function(event, context, callback) {
    var userId = event.userId ? ("" + event.userId) : null; // if userId is passed, convert to a string, else use null

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

        docClient.get(params, onGetGrid); 
    };

    var onGetGrid = function(err, data) {
        if (err) {
            callback(err);
        } else if (!data.Item) {
            callback(new Error("NO_GAME: You have no game"));
        } else {
            entry = data.Item;
            var opponentId = entry.opponentId;
            if (opponentId) {
                getOpponentGrid(opponentId);
            } else {
                callback(null, helpers.formatResponse(entry));
            }
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
            callback(null, helpers.formatResponse(entry));
        } else {
            callback(null, helpers.formatResponse(entry, data.Item));
        }
    }; 

    getGrid();
};
