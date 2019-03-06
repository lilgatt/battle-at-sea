var AWS = require("aws-sdk");

exports.handler = function(event, context, callback) {
    var userId = event.userId ? ("" + event.userId) : null; // if userId is passed, convert to a string, else use null

    if (!userId) {
        callback(new Error("MISSING_PARAM: You forgot to pass a userId as a parameter."));
        return;
    }

    var docClient = new AWS.DynamoDB.DocumentClient();

    var table = "battleship_grids";

    var deleteGame = function() {
        var params = {
            TableName: table,
            Key: {
                "id": userId
            }
        };

        docClient.delete(params, onDeleteGame); 
    };

    var onDeleteGame = function(err, data) {
        if (err) { //db error
            callback(err);
        } else {
            callback(null, { success: true });
        }
    };

    deleteGame();
};
