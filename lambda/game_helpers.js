function getFleet(grid) {
    var hitsLeft = {
        aircraft_carrier: 5,
        battleship: 4,
        cruiser: 3,
        destroyer: 2,
        submarine: 1
    };
    
    var colIndex, rowIndex, colCount, rowCount, row, cell;

    // if the cell's state is hit, then count down the number of hits left
     for (rowIndex = 0, rowCount = grid.length; rowIndex < rowCount; rowIndex++) {
        row = grid[rowIndex];
        for (colIndex = 0, colCount = row.length; colIndex < colCount; colIndex++) {
            cell = row[colIndex];
            if (cell && cell.ship && (cell.state === "hit")) {
                hitsLeft[cell.ship]--;
            }
        }
    }

    return {
        aircraft_carrier: (hitsLeft.aircraft_carrier > 0),
        battleship: (hitsLeft.battleship > 0),
        cruiser: (hitsLeft.cruiser > 0),
        destroyer: (hitsLeft.destroyer > 0),
        submarine: (hitsLeft.submarine > 0)
    };
}

//if any one of the conditions is true, then the ship is not sunk
function isFleetGone(grid) {
    var fleet = getFleet(grid);
    if (fleet.aircraft_carrier || fleet.battleship || fleet.cruiser || fleet.destroyer || fleet.submarine) {
        return false;
    } else {
        return true;
    }
}

function formatResponse(entry, opponentEntry) {
    var myGrid = entry.grid;
    var opponentGrid = opponentEntry ? opponentEntry.grid : null;
    var myFleet;
    var opponentFleet = null;
    var colIndex, rowIndex, colCount, rowCount, row, cell;
    var state;

    myFleet = getFleet(myGrid);

    if (opponentGrid) {
        opponentFleet = getFleet(opponentGrid);

        // hide the name & state of the opponent's ships if not hit, hide the name but not state if hit,
        // otherwise, show name & state if the ship is sunk
        for (rowIndex = 0, rowCount = opponentGrid.length; rowIndex < rowCount; rowIndex++) {
            row = opponentGrid[rowIndex];
            for (colIndex = 0, colCount = row.length; colIndex < colCount; colIndex++) {
                cell = row[colIndex];
                if (cell && cell.ship) {
                    if (cell.state !== "hit") {
                        row[colIndex] = null;
                    } else if (opponentFleet[cell.ship]) {
                        delete cell.ship;
                    }
                }
            }
        }
    }

    state = entry.state;
    switch (state) {
        case "your_turn":
        case "opponent_turn":
            if (!opponentEntry) {
                state = "opponent_left";
            }
            break;
    }

    var response = {
        state: state,
        user: {
            name: entry.name
        },
        opponent: opponentEntry ? { name: opponentEntry.name } : null,
        myFleet: myFleet,
        opponentFleet: opponentFleet,
        myGrid: myGrid,
        opponentGrid: opponentGrid
    };

    return response;
}

exports.getFleet = getFleet;
exports.isFleetGone = isFleetGone;
exports.formatResponse = formatResponse;
