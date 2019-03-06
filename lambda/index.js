const Alexa = require('ask-sdk');
const helpers = require("./alexa_helpers");

const LaunchHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'LaunchRequest'
      || (request.type === 'IntentRequest'
        && request.intent.name === 'BattleAtSea');
  },
  handle(handlerInput) {
    const attributes = handlerInput.attributesManager.getSessionAttributes();

    return new Promise(function(resolve, reject) {
      var userId = handlerInput.requestEnvelope.session.user.userId;

      helpers.invokeLambda("read_game", { userId: userId }, function(err, data) {
        var text;

        if (err && err.code === "NO_GAME") {
          text = "Welcome to Battle at Sea! Would you like to start playing now?";
          attributes.action = "prompt_for_game";
          attributes.repeatText = text;
          handlerInput.attributesManager.setSessionAttributes(attributes);

          resolve(handlerInput.responseBuilder
            .speak(text)
            .reprompt(text)
            .getResponse());
        } else if (err) {
          text = "Sorry, an error occurred";
          attributes.action = null;
          attributes.repeatText = text;
          handlerInput.attributesManager.setSessionAttributes(attributes);

          resolve(handlerInput.responseBuilder
            .speak(text)
            .getResponse());
        } else if (data.state === "you_win") {
          text = "You won the last game! Congratulations! Would you like to start a new game with your current ship placement?";
          attributes.action = "reset_game";
          attributes.repeatText = text;
          handlerInput.attributesManager.setSessionAttributes(attributes);

          resolve(handlerInput.responseBuilder
            .speak(text)
            .reprompt(text)
            .getResponse());
        } else if (data.state === "you_lose") {
          text = "Unfortunately, you lost the last game. Would you like to start a new game with your current ship placement?";
          attributes.action = "reset_game";
          attributes.repeatText = text;
          handlerInput.attributesManager.setSessionAttributes(attributes);

          resolve(handlerInput.responseBuilder
            .speak(text)
            .reprompt(text)
            .getResponse());
        } else if (data.state === "opponent_left") {
          text = "Unfortunately, it appears that your opponent quit the game. Would you like to play against a different opponent using your current ship placement?";
          attributes.action = "reset_game";
          attributes.repeatText = text;
          handlerInput.attributesManager.setSessionAttributes(attributes);

          resolve(handlerInput.responseBuilder
            .speak(text)
            .reprompt(text)
            .getResponse());
        } else {
          text = "Welcome back to Battle at Sea! You already have a game in progress. Would you like to continue?";
          attributes.state = data.state;
          attributes.game = data;
          attributes.action = "prompt_continue_game";
          attributes.repeatText = text;
          handlerInput.attributesManager.setSessionAttributes(attributes);

          resolve(handlerInput.responseBuilder
            .speak(text)
            .reprompt(text)
            .getResponse());
        }
      });
    });
  },
};

const StartNewGameHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    const attributes = handlerInput.attributesManager.getSessionAttributes();
    return attributes.action === "prompt_for_game"
      && request.type === 'IntentRequest'
      && request.intent.name === 'AMAZON.YesIntent';
  },
  handle(handlerInput) {
    const attributes = handlerInput.attributesManager.getSessionAttributes();

    return new Promise(function(resolve, reject) {
      var userId = handlerInput.requestEnvelope.session.user.userId;

      helpers.invokeLambda("create_game", { userId: userId }, function(err, data) {
        var text;

        if (err) {
          text = "Sorry, an error occurred.";
          attributes.action = null;
          attributes.repeatText = text;
          handlerInput.attributesManager.setSessionAttributes(attributes);

          resolve(handlerInput.responseBuilder
            .speak(text)
            .getResponse());
        } else {
          text = "Let's start placing your ships! For each ship, specify a row and column between 1 and 10 and direction of: up, down, left, or right. Are you ready to place your ships?";
          attributes.state = data.state;
          attributes.game = data;
          attributes.action = "prompt_place_ship";
          attributes.repeatText = text;
          handlerInput.attributesManager.setSessionAttributes(attributes);

          resolve(handlerInput.responseBuilder
            .speak(text)
            .reprompt("For each ship, specify a row and column between 1 and 10 and direction of: up, down, left, or right. Are you ready to place your ships?")
            .getResponse());
        }
      });
    });
  },
};

const ContinueExistingGameHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    const attributes = handlerInput.attributesManager.getSessionAttributes();
    return attributes.action === "prompt_continue_game"
      && request.type === 'IntentRequest'
      && request.intent.name === 'AMAZON.YesIntent';
  },
  handle(handlerInput) {
    const attributes = handlerInput.attributesManager.getSessionAttributes();

    switch (attributes.state) {
      case "place_aircraft_carrier":
      case "place_battleship":
      case "place_cruiser":
      case "place_destroyer":
      case "place_submarine":
        attributes.action = "prompt_place_ship";
        break;
      case "grid_ready":
        attributes.action = "prompt_find_opponent";
        break;      
      case "waiting_for_opponent":
      case "opponent_turn":
        attributes.action = "prompt_for_wait";
        break;
      case "your_turn":
        attributes.action = "prompt_your_turn_continue";
        break;
      case "opponent_left":
        attributes.action = "prompt_opponent_left";
        break;
      case "you_win":
        attributes.action = "you_win_game";
        break;
      case "you_lose":
        attributes.action = "you_lose_game";
        break;
			default:
				attributes.action = null;
        break;
    }

    handlerInput.attributesManager.setSessionAttributes(attributes);

    var response = helpers.invokeHandler(handlers, handlerInput);
    if (response) {
      return response;
    } else {
      return handlerInput.responseBuilder
      	.speak("Sorry, an error occurred.")
        .getResponse();
    }
  },
};

const ExitNewGameHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    const attributes = handlerInput.attributesManager.getSessionAttributes();
    return attributes.action === "prompt_for_game"
        &&  request.type === 'IntentRequest'
        && request.intent.name === 'AMAZON.NoIntent';
  },
  handle(handlerInput) {
    const attributes = handlerInput.attributesManager.getSessionAttributes();
    var text = "Let's play some other time! Goodbye!";

    attributes.repeatText = text;
    attributes.action = null;
    attributes.state = null;
    handlerInput.attributesManager.setSessionAttributes(attributes);

    return handlerInput.responseBuilder
      .speak(text)
      .getResponse();
  },
};

const PromptPlaceShipHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    const attributes = handlerInput.attributesManager.getSessionAttributes();
    return attributes.action === "prompt_place_ship"
      && request.type === 'IntentRequest'
      && request.intent.name === 'AMAZON.YesIntent';
  },
  handle(handlerInput) {
    const attributes = handlerInput.attributesManager.getSessionAttributes();
    var text;

    if (attributes.state === "place_aircraft_carrier") {
      text = "The first ship is an aircraft carrier. It has five cells. Just say its row, column and a direction.";
      attributes.action = "answer_place_multi_cell_ship";
    } else if (attributes.state === "place_battleship") {
      text = "Let's position your battleship with four cells. Please tell me: a row, column and a direction.";
      attributes.action = "answer_place_multi_cell_ship";
    } else if (attributes.state === "place_cruiser") {
      text = "Please give me a row, column and a direction for your cruiser which contains three cells.";
      attributes.action = "answer_place_multi_cell_ship";
    } else if (attributes.state === "place_destroyer") {
      text = "Your board needs a two-cell destroyer. I'm ready for your row, column and direction.";
      attributes.action = "answer_place_multi_cell_ship";
    } else if (attributes.state === "place_submarine") {
      text = "Let's place your one-cell submarine. Just give me its row and column.";
      attributes.action = "answer_place_single_cell_ship";
    } else {
      text = "Sorry, an error occurred.";
      attributes.action = null;
      attributes.state = null;
    }

    attributes.repeatText = text;
    handlerInput.attributesManager.setSessionAttributes(attributes);

    if (attributes.action) {
      return handlerInput.responseBuilder
        .speak(text)
        .reprompt(text)
        .getResponse();
    } else {
      return handlerInput.responseBuilder
        .speak(text)
        .getResponse();
    }
  },
};

const PlaceShipHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    const attributes = handlerInput.attributesManager.getSessionAttributes();
    return request.type === 'IntentRequest'
      && (attributes.action === "answer_place_multi_cell_ship"
        && request.intent.name === 'CoordinateDirectionAnswerIntent')
      || (attributes.action === "answer_place_single_cell_ship"
         && request.intent.name === 'CoordinateAnswerIntent');
  },
  handle(handlerInput) {
    const request = handlerInput.requestEnvelope.request.intent.slots;
    const attributes = handlerInput.attributesManager.getSessionAttributes();

    var rowCoordinate = helpers.normalizeRowCoordinate(request.rowCoordinate.value);
    if (rowCoordinate < 0) {
      return handlerInput.responseBuilder
        .speak("Please provide a valid row between 1 and 10.")
        .reprompt("Please provide a valid row between 1 and 10.")
        .getResponse();
    }

    var columnCoordinate = helpers.normalizeColumnCoordinate(request.columnCoordinate.value);
    if (columnCoordinate < 0) {
      return handlerInput.responseBuilder
        .speak("Please provide a valid column between 1 and 10.")
        .reprompt("Please provide a valid column between 1 and 10.")
        .getResponse();
    }

    var direction = request.direction ? helpers.normalizeDirection(request.direction.value) : null;
    if (direction == null && attributes.state !== "place_submarine") {
      return handlerInput.responseBuilder
        .speak("Please provide one of the valid directions: up, down, left or right")
        .reprompt("Your direction can be: up, down, left or right")
        .getResponse();
    }

    return new Promise(function(resolve, reject) {
      var userId = handlerInput.requestEnvelope.session.user.userId;
      var params = {
        userId: userId,
        coordinate: [rowCoordinate, columnCoordinate],
        direction: direction
      };

      helpers.invokeLambda("place_ship", params, function(err, data) {
        var text;

        if (err && err.code === "INVALID_COORDINATES") {
          text = "Unable to place your ship. Please double check that your ship is within the grid boundary and that it doesn't overlap another ship.";
          attributes.repeatText = text;
          handlerInput.attributesManager.setSessionAttributes(attributes);

          resolve(handlerInput.responseBuilder
            .speak(text)
            .reprompt(text)
            .getResponse());
        } else if (err) {
          text = "Sorry, an error occurred";
          attributes.action = null;
          attributes.repeatText = text;
          handlerInput.attributesManager.setSessionAttributes(attributes);

          resolve(handlerInput.responseBuilder
            .speak(text)
            .getResponse());
        } else {
          if (attributes.state === "place_aircraft_carrier") {
            text = "I've placed your aircraft carrier. Let's place your four-cell battleship. Please tell me: a row, column and a direction.";
            attributes.action = "answer_place_multi_cell_ship";
          } else if (attributes.state === "place_battleship") {
            text = "Your battleship's on the board. Please give me a row, column and direction for your three-cell cruiser.";
            attributes.action = "answer_place_multi_cell_ship";
          } else if (attributes.state === "place_cruiser") {
            text = "Your cruiser's been placed. Let's position a two-cell destroyer. I'm ready for your row, column and direction.";
            attributes.action = "answer_place_multi_cell_ship";
          } else if (attributes.state === "place_destroyer") {
            text = "You have your destroyer on the board. A one-cell submarine is your final ship. Just give me its row and column.";
            attributes.action = "answer_place_single_cell_ship";
          } else if (attributes.state === "place_submarine") {
            text = "Your submarine's been placed! Would you like to play now?";
            attributes.action = "find_opponent";
          } else { //this should never happen, using generic message just in case
            text = "Your ship has been placed."; 
          }

          attributes.state = data.state;
          attributes.game = data;
          attributes.repeatText = text;
          handlerInput.attributesManager.setSessionAttributes(attributes);

          resolve(handlerInput.responseBuilder
            .speak(text)
            .reprompt(text)
            .getResponse());
        }
      });
    });
  },
};

const PromptFindOpponentHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    const attributes = handlerInput.attributesManager.getSessionAttributes();

    return attributes.action === "prompt_find_opponent"
      && request.type === 'IntentRequest'
      && request.intent.name === 'AMAZON.YesIntent';
  },
  handle(handlerInput) {
    const attributes = handlerInput.attributesManager.getSessionAttributes();
    attributes.action = "find_opponent";
    handlerInput.attributesManager.setSessionAttributes(attributes);

    var text = "All your ships are placed. Would you like to find an opponent?";
    return handlerInput.responseBuilder
      .speak(text)
      .reprompt(text)
      .getResponse();
  },
};

const FindOpponentHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    const attributes = handlerInput.attributesManager.getSessionAttributes();

    return attributes.action === "find_opponent"
      && request.type === 'IntentRequest'
      && request.intent.name === 'AMAZON.YesIntent';
  },
  
  handle(handlerInput) {
    const attributes = handlerInput.attributesManager.getSessionAttributes();

    return new Promise(function(resolve, reject) {
      var userId = handlerInput.requestEnvelope.session.user.userId;

      helpers.invokeLambda("start_game", { userId: userId }, function(err, data) {
        var text;

        if (err) {
          text = "Sorry, an error occurred.";
          attributes.action = null;
          attributes.repeatText = text;
          handlerInput.attributesManager.setSessionAttributes(attributes);

          resolve(handlerInput.responseBuilder
            .speak(text)
            .getResponse());
        } else {
          attributes.state = data.state;
          attributes.game = data;

          if (attributes.state === "waiting_for_opponent") {
            text = "Looks like there is no available opponent at this moment. Would you like to wait?";
          } else {
            text = "You have an opponent, so let's start playing! Your opponent goes first. Would you like to wait?";
          }

          attributes.action = "prompt_for_wait";
          attributes.repeatText = text;
          handlerInput.attributesManager.setSessionAttributes(attributes);

          resolve(handlerInput.responseBuilder
            .speak(text)
            .reprompt(text)
            .getResponse());
        }
      });
    });
  },
};

const PromptForWaitHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    const attributes = handlerInput.attributesManager.getSessionAttributes();

    return attributes.action === "prompt_for_wait"
      && request.type === 'IntentRequest'
      && request.intent.name === 'AMAZON.YesIntent';
  },
  handle(handlerInput) {
    const attributes = handlerInput.attributesManager.getSessionAttributes();

    return new Promise(function(resolve, reject) {
      var userId = handlerInput.requestEnvelope.session.user.userId;

      helpers.invokeLambda("read_game", { userId: userId }, function(err, data) {
        var text;
        
        attributes.state = data ? data.state : null;
        attributes.game = data;

        if (err) {
          text = "Sorry, an error occurred.";
          attributes.action = null;
          attributes.repeatText = text;
          handlerInput.attributesManager.setSessionAttributes(attributes);

          resolve(handlerInput.responseBuilder
            .speak(text)
            .getResponse());
      
        } else if (attributes.state === "waiting_for_opponent") {
          text = "<break time='10s'/> I am still looking for an opponent. Would you like to keep waiting?";
          attributes.action = "prompt_for_wait";
          attributes.repeatText = "I am still looking for an opponent. Would you like to keep waiting?";
          handlerInput.attributesManager.setSessionAttributes(attributes);

          resolve(handlerInput.responseBuilder
            .speak(text)
            .reprompt(text)
            .getResponse());

        } else if (attributes.state === "your_turn" || attributes.state === "you_lose") {
          attributes.game = data;
					attributes.state = data.state;
          var myGrid = attributes.game.myGrid;
          var myFleet = attributes.game.myFleet;
          var lastMove = helpers.getLastMove(myGrid, myFleet);
          text = "";

          if (lastMove) {
            if (lastMove.isSunk) {
              text = "Your opponent fired at row " + (lastMove.row + 1) + " , column " + (lastMove.column + 1) + " and sunk your " + lastMove.ship.replace("_", " ") + "! ";
            } else if (lastMove.state === "hit") {
              text = "Your opponent hit your " + lastMove.ship.replace("_", " ") + " at row " + (lastMove.row + 1) + ", column " + (lastMove.column + 1) +"! ";
            } else {
              text = "Your opponent missed at row " + (lastMove.row + 1) + ", column " + (lastMove.column + 1) + ". ";
            }
          }
          
          if (attributes.state === "your_turn") {
            text += "It's your turn to play! Would you like to take your turn now?";
            attributes.action = "prompt_your_turn";
            attributes.repeatText = text;
					  handlerInput.attributesManager.setSessionAttributes(attributes);

            resolve(handlerInput.responseBuilder
              .speak(text)
              .reprompt(text)
              .getResponse());

          } else {
            text += "Your opponent won this game. Goodbye!";
            attributes.repeatText = text;
					  handlerInput.attributesManager.setSessionAttributes(attributes);

            resolve(handlerInput.responseBuilder
              .speak(text)
              .getResponse());
          }

        } else if (attributes.state === "opponent_turn") {
          text = "<break time='10s'/> It's your opponent's turn to fire. Would you like to keep waiting?";
          attributes.action = "prompt_for_wait";
          attributes.repeatText = "It's your opponent's turn to fire. Would you like to keep waiting?";
          handlerInput.attributesManager.setSessionAttributes(attributes);

          resolve(handlerInput.responseBuilder
            .speak(text)
            .reprompt(text)
            .getResponse());

        } else if (attributes.state === "opponent_left") {
          text = "Unfortunately, it appears that your opponent quit the game. Would you like to play against a different opponent using your current ship placement?";
          attributes.action = "reset_game";
          attributes.repeatText = text;
          handlerInput.attributesManager.setSessionAttributes(attributes);

          resolve(handlerInput.responseBuilder
            .speak(text)
            .reprompt("Would you like to play against a different opponent using your current ship placement?")
            .getResponse());

        } else {
          text = "Sorry, an error occured.";
          attributes.action = null;
          attributes.repeatText = text;
          handlerInput.attributesManager.setSessionAttributes(attributes);

          resolve(handlerInput.responseBuilder
            .speak(text)
            .getResponse());
        }
      });
    });
  },
};

const PromptOpponentLeftHandler = {
  canHandle(handlerInput) {
    const attributes = handlerInput.attributesManager.getSessionAttributes();
    return attributes.action === "prompt_opponent_left";
  },
  handle(handlerInput) {
    const attributes = handlerInput.attributesManager.getSessionAttributes();
    var text = "Unfortunately, it appears that your opponent quit the game. Would you like to play against a different opponent using your current ship placement?";
    attributes.action = "reset_game";
    attributes.repeatText = text;
    handlerInput.attributesManager.setSessionAttributes(attributes);

    return handlerInput.responseBuilder
      .speak(text)
      .reprompt("Would you like to play against a different opponent using your current ship placement?")
      .getResponse();
  },
};

const PromptYourTurnHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    const attributes = handlerInput.attributesManager.getSessionAttributes();

    return (attributes.action === "prompt_your_turn"
        || attributes.action === "prompt_your_turn_continue")
      && request.type === 'IntentRequest'
      && request.intent.name === 'AMAZON.YesIntent';
  },
 
  handle(handlerInput) {
    const attributes = handlerInput.attributesManager.getSessionAttributes();
    var myGrid = attributes.game.myGrid;
    var myFleet = attributes.game.myFleet;
    var lastMove = (attributes.action === "prompt_your_turn_continue") ? helpers.getLastMove(myGrid, myFleet) : null;
    var text = "";

    if (lastMove) {
      if (lastMove.isSunk) {
        text = "Your opponent fired at row " + (lastMove.row + 1) + " , column " + (lastMove.column + 1) + " and sunk your " + lastMove.ship.replace("_", " ") + "! ";
      } else if (lastMove.state === "hit") {
        text = "Your opponent hit your " + lastMove.ship.replace("_", " ") + " at row " + (lastMove.row + 1) + ", column " + (lastMove.column + 1) +"! ";
      } else {
        text = "Your opponent missed at row " + (lastMove.row + 1) + ", column " + (lastMove.column + 1) + ". ";
      }
    }

    text += "Please give me a row and column between 1 and 10.";
    attributes.action = "take_your_turn";
    attributes.repeatText = text;
    handlerInput.attributesManager.setSessionAttributes(attributes);

    return handlerInput.responseBuilder
      .speak(text)
      .reprompt(text)
      .getResponse();
  },
};

const YourTurnHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    const attributes = handlerInput.attributesManager.getSessionAttributes();

    return attributes.action === "take_your_turn"
      && request.type === 'IntentRequest'
      && request.intent.name === 'CoordinateAnswerIntent';
  },
  handle(handlerInput) {
    const request = handlerInput.requestEnvelope.request.intent.slots;
    const attributes = handlerInput.attributesManager.getSessionAttributes();

    var rowCoordinate = helpers.normalizeRowCoordinate(request.rowCoordinate.value);
    if (rowCoordinate < 0) {
      return handlerInput.responseBuilder
        .speak("Please provide a valid row between 1 and 10.")
        .reprompt("Please provide a valid row between 1 and 10.")
        .getResponse();
    }

    var columnCoordinate = helpers.normalizeColumnCoordinate(request.columnCoordinate.value);
    if (columnCoordinate < 0) {
      return handlerInput.responseBuilder
        .speak("Please provide a valid column between 1 and 10.")
        .reprompt("Please provide a valid column between 1 and 10.")
        .getResponse();
    }

    return new Promise(function(resolve, reject) {
      var userId = handlerInput.requestEnvelope.session.user.userId;

      var params = {
        userId: userId,
        coordinate: [rowCoordinate, columnCoordinate]
      };

      helpers.invokeLambda("play_game", params, function(err, data) {
        var text;

        if (err && err.code === "INVALID_COORDINATES") {
          text = "You've already fired at this cell. Please choose a different row and column.";
          attributes.action = "take_your_turn";
          attributes.repeatText = text;
          handlerInput.attributesManager.setSessionAttributes(attributes);

          resolve(handlerInput.responseBuilder
            .speak(text)
            .reprompt("Please give me a row and column.")
            .getResponse());
        } else if (err && err.code === "OPPONENT_QUIT") {
          text = "Unfortunately, it appears that your opponent quit the game. Would you like to play against a different opponent using your current ship placement?";
          attributes.action = "reset_game";
          attributes.repeatText = text;
          handlerInput.attributesManager.setSessionAttributes(attributes);

          resolve(handlerInput.responseBuilder
            .speak(text)
            .reprompt("Would you like to play against a different opponent using your current ship placement?")
            .getResponse());
        } else if (err) {
          text = "Sorry, an error occurred.";
          attributes.action = null;
          attributes.repeatText = text;
          handlerInput.attributesManager.setSessionAttributes(attributes);
          resolve(handlerInput.responseBuilder
            .speak(text)
            .getResponse());  
        } else {
          attributes.game = data;
          attributes.state = data.state;
          var opponentGrid = attributes.game.opponentGrid;
          var opponentFleet = attributes.game.opponentFleet;
          var lastMove = helpers.getLastMove(opponentGrid, opponentFleet);
          text = "";
      
          if (lastMove) {
            if (lastMove.isSunk) {
              text = "Hit! You sunk opponent's " + lastMove.ship.replace("_", " ") + "!";
            } else if (lastMove.state === "hit") {
              text = "Hit!";
            } else {
              text = "Miss!";
            }

            if (attributes.state === "you_win") {
              text += " Congratulations, you sunk all of your opponent's ships and you win!";
							attributes.action = "you_win_game";
						} else {
              text += " Now it's your opponent's turn. Would you like to wait?";
              attributes.action = "prompt_for_wait";
            }

            attributes.repeatText = text;
            handlerInput.attributesManager.setSessionAttributes(attributes);

            resolve(handlerInput.responseBuilder
              .speak(text)
              .reprompt(text)
              .getResponse());
          }
        }
      });
    });
  },
};

const ExitExistingGameHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    const attributes = handlerInput.attributesManager.getSessionAttributes();
    return attributes.action === "prompt_continue_game"
        && request.type === 'IntentRequest'
        && request.intent.name === 'AMAZON.NoIntent';
  },
  handle(handlerInput) {
    const attributes = handlerInput.attributesManager.getSessionAttributes();
    var text;

    if (attributes.state === "waiting_for_opponent" || attributes.state === "your_turn" || attributes.state === "opponent_turn") {
      text = "Would you like to play against a different opponent using your current ship placement?";
      attributes.action = "reset_game";
    } else {    
      text = "Would you like to erase this game?";
      attributes.action = "erase_game";
    }

    attributes.repeatText = text;
    handlerInput.attributesManager.setSessionAttributes(attributes);

    return handlerInput.responseBuilder
        .speak(text)
        .reprompt(text)
        .getResponse();
  },
};

const EraseGameHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    const attributes = handlerInput.attributesManager.getSessionAttributes();
    return attributes.action === "erase_game"
      && request.type === 'IntentRequest'
      && request.intent.name === 'AMAZON.YesIntent';
  },
  handle(handlerInput) {
    const attributes = handlerInput.attributesManager.getSessionAttributes();

    return new Promise(function(resolve, reject) {
      var userId = handlerInput.requestEnvelope.session.user.userId;

      helpers.invokeLambda("delete_game", { userId: userId }, function(err, data) {
        var text;

        if (err) {
          text = "Sorry, an error occurred.";
        } else {
          text = "Your game's been deleted. You can start a different game by saying: Alexa, play Battle at Sea.";
        }

				attributes.repeatText = text;
        attributes.action = null;
				attributes.state = null;
				attributes.game = null;
        handlerInput.attributesManager.setSessionAttributes(attributes);

        resolve(handlerInput.responseBuilder
          .speak(text)
          .getResponse());
      });
    });
  },
};

const PromptNewGameHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    const attributes = handlerInput.attributesManager.getSessionAttributes();
    return attributes.action === "reset_game"
      && request.type === 'IntentRequest'
      && request.intent.name === 'AMAZON.NoIntent';
  },
  handle(handlerInput) {
    const attributes = handlerInput.attributesManager.getSessionAttributes();
    var text = "Shall we play a game with new ships?";
    attributes.repeatText = text;
    attributes.action = "erase_then_start";
    handlerInput.attributesManager.setSessionAttributes(attributes);

    return handlerInput.responseBuilder
      .speak(text)
      .reprompt(text)
      .getResponse();
  },
};

const EraseThenStartGameHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    const attributes = handlerInput.attributesManager.getSessionAttributes();
    return attributes.action === "erase_then_start"
      && request.type === 'IntentRequest'
      && request.intent.name === 'AMAZON.YesIntent';
  },
  handle(handlerInput) {
    const attributes = handlerInput.attributesManager.getSessionAttributes();

    return new Promise(function(resolve, reject) {
      var userId = handlerInput.requestEnvelope.session.user.userId;

      helpers.invokeLambda("delete_game", { userId: userId }, function(err, data) {
        if (err) {
          var text = "Sorry, an error occurred.";
          attributes.repeatText = text;
          attributes.action = null;
          attributes.state = null;
          attributes.game = null;
          handlerInput.attributesManager.setSessionAttributes(attributes);
  
          resolve(handlerInput.responseBuilder
            .speak(text)
            .getResponse());
        } else {
          StartNewGameHandler.handle(handlerInput)
            .then(resolve);
        }			
      });
    });
  },
};

const ResetThenStartGameHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    const attributes = handlerInput.attributesManager.getSessionAttributes();
    return attributes.action === "reset_game"
      && request.type === 'IntentRequest'
      && request.intent.name === 'AMAZON.YesIntent';
  },
  handle(handlerInput) {
    const attributes = handlerInput.attributesManager.getSessionAttributes();

    return new Promise(function(resolve, reject) {
      var userId = handlerInput.requestEnvelope.session.user.userId;

      helpers.invokeLambda("reset_game", { userId: userId }, function(err, data) {
        if (err) {
          var text = "Sorry, an error occurred.";
          attributes.repeatText = text;
          attributes.action = null;
          attributes.state = null;
          attributes.game = null;
          handlerInput.attributesManager.setSessionAttributes(attributes);
  
          resolve(handlerInput.responseBuilder
            .speak(text)
            .getResponse());
        } else {
          FindOpponentHandler.handle(handlerInput)
            .then(resolve);
        }			
      });
    });
  },
};

const PauseTheGameHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    const attributes = handlerInput.attributesManager.getSessionAttributes();
    return attributes.action === "erase_game"
      && request.type === 'IntentRequest'
      && request.intent.name === 'AMAZON.NoIntent';
  },
  handle(handlerInput) {
    const attributes = handlerInput.attributesManager.getSessionAttributes();
    var text = "Let's play later. Bye!";

    attributes.repeatText = text;
    attributes.action = null;
    attributes.state = null;
    attributes.game = null;
    handlerInput.attributesManager.setSessionAttributes(attributes);

    return handlerInput.responseBuilder
      .speak(text)
      .getResponse();
  },
};

const NoHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest'
      && request.intent.name === 'AMAZON.NoIntent';
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
      .speak("Goodbye!")
      .getResponse();
  },
};

const RepeatHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    const attributes = handlerInput.attributesManager.getSessionAttributes();
    return request.type === 'IntentRequest'
      && request.intent.name === 'AMAZON.RepeatIntent'
      && attributes.repeatText != null;
  },
  handle(handlerInput) {
    const attributes = handlerInput.attributesManager.getSessionAttributes();

    return handlerInput.responseBuilder
      .speak(attributes.repeatText)
      .reprompt(attributes.repeatText)
      .getResponse();
  },
};

const HelpHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest'
      && request.intent.name === 'AMAZON.HelpIntent';
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
      .speak("You can say: play Battle at Sea, or, you can say: Alexa, stop... What can I help you with?")
      .reprompt("What can I help you with?")
      .getResponse();
  },
};

const ExitHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest'
      && (request.intent.name === 'AMAZON.CancelIntent'
        || request.intent.name === 'AMAZON.StopIntent');
  },
  handle(handlerInput) {
    const attributes = handlerInput.attributesManager.getSessionAttributes();

    attributes.action = null;
    attributes.state = null;
    handlerInput.attributesManager.setSessionAttributes(attributes);

    return handlerInput.responseBuilder
      .speak("Goodbye!")
      .getResponse();
  },
};

const SessionEndedRequestHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'SessionEndedRequest';
  },
  handle(handlerInput) {
    const attributes = handlerInput.attributesManager.getSessionAttributes();

    attributes.action = null;
    attributes.state = null;
    handlerInput.attributesManager.setSessionAttributes(attributes);

    return handlerInput.responseBuilder.getResponse();
  },
};

const MisunderstandingHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest'
      && request.intent.name === 'AMAZON.FallbackIntent';
  },
  handle(handlerInput) {
    const attributes = handlerInput.attributesManager.getSessionAttributes();
    return handlerInput.responseBuilder 
      .speak("I didn't understand. " + (attributes.repeatText || ""))
      .reprompt(attributes.repeatText)
      .getResponse();
  },
};

const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, error) {
    return handlerInput.responseBuilder
      .speak('Sorry, an error occurred.')
      .getResponse();
  },
};

const skillBuilder = Alexa.SkillBuilders.standard();

var handlers = [
    LaunchHandler,
    StartNewGameHandler,
    ExitNewGameHandler,
    ContinueExistingGameHandler,
    PromptPlaceShipHandler,
    PlaceShipHandler,    
    PromptFindOpponentHandler,
    FindOpponentHandler,
    PromptForWaitHandler,
    PromptOpponentLeftHandler,
    PromptYourTurnHandler,
    YourTurnHandler,
    ExitExistingGameHandler,
    EraseGameHandler,
    PromptNewGameHandler,
    EraseThenStartGameHandler,
    ResetThenStartGameHandler,
    PauseTheGameHandler,
    NoHandler,
    RepeatHandler,
    HelpHandler,
    ExitHandler,
    SessionEndedRequestHandler,
    MisunderstandingHandler
];

exports.handler = skillBuilder
  .addRequestHandlers.apply(skillBuilder, handlers)//this function does not expect array but arguments of handlers; therefore, we use "apply" and pass skillBuilder as "this" and our array as separate arguments
  .addErrorHandlers(ErrorHandler)
  .lambda();
