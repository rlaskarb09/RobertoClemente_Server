const { PerformanceObserver, performance } = require('perf_hooks');
var express = require('express'); 
var bodyParser = require('body-parser'); 
var app = express(); 
var router = express.Router();
var expressWs = require('express-ws')(app);
var mysql = require('mysql');
var async = require("async");
var moment = require("moment");

var robotWebSocket = null;
var InventoryManagerWebSocket = null;

const sqlMethods = require('./sql_methods.js');
let ejs = require('ejs');
var connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'orderdb',
    debug: false
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(bodyParser.text());
app.use(express.static(__dirname+'/web'));

app.set('view engine','ejs');
app.set('views','./web');

const ROBOT_LIMIT_TIME = 8000; //ms
const SERVER_PORT = 3000;
const MAX_ITEM_NUMBERS = [26, 27, 25];
const INVENTORY_CAPACITY = 24;
const UPDATE_LIST_INTERVAL = 60 * 1000;
const UPDATE_INVENTORY_MANAGER_INTERVAL = 1000;
const DOWN_TIME_CHECK_INTERVAL = 1000;

let exerciseNum = 10;

let status = {
    isFirstSchedule: true,
    initialRobotConnection: false,
    robotConnected: false,
    isAlreadyScheduled: false,
    robotStartTime: performance.now(),
    robotMode:'stop',
    robotLocation: 'stop',
    downTime: 0,
    nextCommand: 'empty',
    itemsOnStop: [26, 27, 25],
    itemsOnRobot: [0, 0, 0],
    pendingOrders: 0,
    pendingOrderList: [0],
    avgDeliveryTimeList: [0],
    deliveredOrderList: [0],
    downTimeList: [0],
    pendingItems: 0,
    deliveredOrders: 0,
    avgDeliveryTime: 0,
    // updated when the robot is on the stop sign
    deliverySchedule: getInitDeliverySchedule(),
    deliveryItems: [],
    deliveryItemIds: [],
    robotPath: [],
    // updated while scheduling
    nextDeliverySchedule: getInitDeliverySchedule(),
    nextDeliveryItems: [],
    nextRobotPath: [],
    nextLoading: [0, 0, 0],
    // updated when the load button pressed.
    nextDeliveryItemIds: [],
    // updated while scheduling
    nextNextDeliverySchedule: getInitDeliverySchedule(),
    nextNextDeliveryItems: [],
    nextNextRobotPath: [],
    nextNextLoading: [0, 0, 0],
    // updated when the load button pressed.
    nextNextDeliveryItemIds: [],
    downTime: 0,
    robotMaintenanceStartTime: 0,
    // update customer information
};

let inventoryManagerTimer = setInterval(function() {
    expressWs.getWss('/inventory_manager').clients.forEach((wsInstance) => {
        if (wsInstance.readyState == 1 && wsInstance.category == 'inventory_manager') {
            wsInstance.send(JSON.stringify(getMessageToInventoryManager(status)));
        }
    });
}, UPDATE_INVENTORY_MANAGER_INTERVAL);

let downTimeCheckTimer = setInterval(function() {
    // console.log('downTimeTimer works');
    if (status.robotMode == 'maintenance' && status.initialRobotConnection) {
        status.downTime += 1;
        console.log('downTime:', status.downTime)
    }
}, DOWN_TIME_CHECK_INTERVAL);

function getMessageToRobot(status) {
    return {
        command: status.nextCommand, 
        path: status.robotPath
    };
}

function getMessageToInventoryManager(status) {
    return {
        robotMode: status.robotMode, 
        robotLocation: status.robotLocation,
        deliverySchedule: status.deliverySchedule,
        nextDeliverySchedule: status.nextDeliverySchedule,
        nextLoading: status.nextLoading
    };
}

function getMessageToDashboard(status) {
    return {
        robotConnected: status.robotConnected,
        robotBatteryTime: getRobotBatteryTime(status),
        downTime: status.downTime,
        itemsOnStop: status.itemsOnStop,
        itemsOnRobot: status.itemsOnRobot,
        pendingOrders: status.pendingOrders,
        pendingItems: status.pendingItems,
        deliveredOrders: status.deliveredOrders,
        avgDeliveryTime: status.avgDeliveryTime,
        totalOrders: status.pendingOrders + status.deliveredOrders,
        pendingOrderList: status.pendingOrderList,
        deliveredOrderList: status.deliveredOrderList,
        downTimeList: status.downTimeList,
        avgDeliveryTimeList: status.avgDeliveryTimeList
    };
}

function getRobotBatteryTime(status) {
    if (status.robotConnected) {
        return (performance.now() - status.robotStartTime) / 60000;
    } else {
        return 0;
    }
}

// get nextLoading from deliverySchedule
function getNextLoading(deliverySchedule_) {
    var nextLoading = [0, 0, 0];
    
    for(schedule in deliverySchedule_) {
        nextLoading[0] += deliverySchedule_[schedule][1];
        nextLoading[1] += deliverySchedule_[schedule][2];
        nextLoading[2] += deliverySchedule_[schedule][3];
    }

    return nextLoading;
}

function getRobotPath(deliverySchedule_) {
    var robotPath = [];
    for (idx in deliverySchedule_) {
        if (deliverySchedule_[idx][1] + deliverySchedule_[idx][2] + deliverySchedule_[idx][3] > 0) {
            robotPath.push(deliverySchedule_[idx][0]);
        }
    }
    return robotPath;
}

function getItemIds(items) {
    var itemIds = [];
    for (idx in items) {
        itemIds.push(items[idx].id);
    }

    return itemIds;
}

function getInitDeliverySchedule()
{
    return [
        ['101', 0, 0, 0], 
        ['102', 0, 0, 0], 
        ['103', 0, 0, 0], 
        ['203', 0, 0, 0], 
        ['202', 0, 0, 0], 
        ['201', 0, 0, 0]]
    ;
}

// Get Priority of the address
function getPriority(a) {
    switch (String(a)) {
        case 101:
          return 1;
        case 102:
          return 2;
        case 103:
          return 3;
        case 203:
          return 4;
        case 202:
          return 5;
        case 201:
          return 6;
      }
}

function addressToIndex(address) {
    switch (String(address)) {
        case '101':
            return 0;
        case '102':
            return 1;
        case '103':
            return 2;
        case '203':
            return 3;
        case '202':
            return 4;
        case '201':
            return 5;
    }
}

function addressCompare(a, b) {
    return getPriority(b[0]) - getPriority(a[0]);
}

function getFIFOSchedule(callback) {
    var sqlMethod = null;
    var idString = "";
    console.log('status.deliveryItemIds at getFIFOSchedule: ', status.deliveryItemIds)
    if (Array.isArray(status.deliveryItemIds) && status.deliveryItemIds.length) {
        idString = "(";
        var isFirst = true;
        for (idx in status.deliveryItemIds) {
            if (isFirst) {
                isFirst = false;
                idString += String(status.deliveryItemIds[idx]);
            } else {
                idString += ", " + String(status.deliveryItemIds[idx]);
            }
        }
        idString += ")";
        sqlMethod = sqlMethods.getItemsToDeliverNotInId;
    } else {
        sqlMethod = sqlMethods.getItemsToDeliver;
    }

    console.log('idString at getFIFOSchedule: ', idString);
    
    sqlMethod(connection, idString, function(err, rows) {
        var itemIds = [];
        rows.sort(addressCompare);
        status.nextDeliveryItems = rows;
        for (idx in rows) {
            itemIds.push(rows[idx].id);
        }
        status.nextDeliveryItemIds = itemIds;
        console.log('deliveryItemIds at getFIFOSchedule:', status.nextDeliveryItemIds);
        var deliverySchedule_ = getInitDeliverySchedule();
        for (var i = 0; i < status.nextDeliveryItems.length; i++) {
            if (status.nextDeliveryItems[i].color == 'R') {
                deliverySchedule_[addressToIndex(status.nextDeliveryItems[i].address)][1] += 1;
            } else if (status.nextDeliveryItems[i].color == 'G') {
                deliverySchedule_[addressToIndex(status.nextDeliveryItems[i].address)][2] += 1;
            } else if (status.nextDeliveryItems[i].color == 'B') {
                deliverySchedule_[addressToIndex(status.nextDeliveryItems[i].address)][3] += 1;
            }
        }
        console.log('deliverySchedule at getFIFOSchedule:', deliverySchedule_);
        callback(deliverySchedule_);
    });
}

function setNextDelivery(itemsToDeliver, status){
    var nextDeliverySchedule = getInitDeliverySchedule();
    for (var i = 0; i < INVENTORY_CAPACITY; i++) {
        if (itemsToDeliver[i].color == 'R') {
            nextDeliverySchedule[addressToIndex(itemsToDeliver[i].address)][1] += 1;
        } else if (itemsToDeliver[i].color == 'G') {
            nextDeliverySchedule[addressToIndex(itemsToDeliver[i].address)][2] += 1;
        } else if (itemsToDeliver[i].color == 'B') {
            nextDeliverySchedule[addressToIndex(itemsToDeliver[i].address)][3] += 1;
        }
    }
    status.nextDeliverySchedule = nextDeliverySchedule;
    status.nextLoading = getNextLoading(status.nextDeliverySchedule);
    status.nextRobotPath = getRobotPath(status.nextDeliverySchedule);
    status.nextDeliveryItems = itemsToDeliver.slice(0,INVENTORY_CAPACITY);
    status.nextDeliveryItemIds = getItemIds(status.nextDeliveryItems);
}

function setNextNextDelivery(itemsToDeliver, status) {
    var nextNextDeliverySchedule = getInitDeliverySchedule();
    for (var i = 0; i < INVENTORY_CAPACITY && i < itemsToDeliver.length; i++) {
        if (itemsToDeliver[i].color == 'R') {
            nextNextDeliverySchedule[addressToIndex(itemsToDeliver[i].address)][1] += 1;
        } else if (itemsToDeliver[i].color == 'G') {
            nextNextDeliverySchedule[addressToIndex(itemsToDeliver[i].address)][2] += 1;
        } else if (itemsToDeliver[i].color == 'B') {
            nextNextDeliverySchedule[addressToIndex(itemsToDeliver[i].address)][3] += 1;
        }
    }
    status.nextNextDeliverySchedule = nextNextDeliverySchedule;
    status.nextNextLoading = getNextLoading(status.nextNextDeliverySchedule);
    status.nextNextRobotPath = getRobotPath(status.nextNextDeliverySchedule);
    status.nextNextDeliveryItems = itemsToDeliver.slice(0,INVENTORY_CAPACITY);
    status.nextNextDeliveryItemIds = getItemIds(status.nextNextDeliveryItems);
}

function getItemsToDeliver(itemCounts, items, totalItemCount_) {
    var totalItemCount = totalItemCount_;
    var itemsToDeliver = [];
    for (var i = 0; i < itemCounts.length; i++) {
        var order_id = itemCounts[i].order_id;
        var itemCount = itemCounts[i]['COUNT(*)'];
        for (var j = 0; j < items.length; j++) {
            if (items[j]['order_id'] == order_id) {
                for (var k = j; k < j + itemCount; k++) {
                    itemsToDeliver.push(items[k]);
                    totalItemCount -= 1;
                    if (totalItemCount <= 0) {
                        break;
                    }
                }
                break;
            }
        }
        if (totalItemCount <= 0) {
            break;
        }
    }
    return itemsToDeliver;
}

function getSchedule(callback) {
    if (status.nextNextLoading[0] + status.nextNextLoading[1] + status.nextNextLoading[2] == 0) {
        idString = "(0";
        for (idx in status.deliveryItemIds) {
            idString += ", " + String(status.deliveryItemIds[idx]);
        }
        idString += ")";
        sqlMethods.getItemsToDeliverNotInIdAll(connection, idString, function(err, rows) {
            let items = rows;
            let totalItemCount = INVENTORY_CAPACITY * 2;
            sqlMethods.getItemCount(connection, idString, function(err, rows) {
                let itemCounts = rows;
                console.log('getSchedule::else::counts.length:', rows.length);
                console.log('getSchedule::else::counts:', rows);
                if (itemCounts.length == 0) {
                    status.nextDeliverySchedule = getInitDeliverySchedule();
                    status.nextLoading = [0, 0, 0];
                    status.nextRobotPath = [];
                    status.nextDeliveryItems = [];
                    status.nextDeliveryItemIds = [];
                    status.nextNextDeliverySchedule = getInitDeliverySchedule();
                    status.nextNextLoading = [0, 0, 0];
                    status.nextNextRobotPath = [];
                    status.nextNextDeliveryItems = [];
                    status.nextNextDeliveryItemIds = [];
                }
                else {
                    let itemsToDeliver = getItemsToDeliver(itemCounts, items, totalItemCount * 2);
                    console.log('getSchedule::if::itemsToDeliver.length', itemsToDeliver.length);
                    setNextDelivery(itemsToDeliver, status);
                    setNextNextDelivery(itemsToDeliver.slice(30,60), status);
                }
                console.log('nextDeliverySchedule: ', status.nextDeliverySchedule);
                console.log('nextLoading: ', status.nextLoading);
                console.log('nextRobotPath: ', status.nextRobotPath);
                // console.log('nextDeliveryItems: ', status.nextDeliveryItems);
                console.log('nextDeliveryItemIds: ', status.nextDeliveryItemIds);
                console.log('nextNextDeliverySchedule: ', status.nextNextDeliverySchedule);
                console.log('nextNextLoading: ', status.nextNextLoading);
                console.log('nextNextRobotPath: ', status.nextNextRobotPath);
                // console.log('nextNextDeliveryItems: ', status.nextNextDeliveryItems);
                console.log('nextNextDeliveryItemIds: ', status.nextNextDeliveryItemIds);
                callback();
            });
        });
        // next, nextnext both scheduling
    } else {
        //nextNext only scheduling
        idString = "(0";
        for (idx in status.deliveryItemIds) {
            idString += ", " + String(status.deliveryItemIds[idx]);
        }
        for (idx in status.nextDeliveryItemIds) {
            idString += ", " + String(status.nextDeliveryItemIds[idx]);
        }
        idString += ")";
        console.log('idString:', idString);
        sqlMethods.getItemsToDeliverNotInIdAll(connection, idString, function(err, rows) {
            let items = rows;
            let totalItemCount = INVENTORY_CAPACITY;
            sqlMethods.getItemCount(connection, idString, function(err, rows) {
                let itemCounts = rows;
                console.log('getSchedule::else::counts.length:', rows.length);
                console.log('getSchedule::else::counts:', rows);
                if (itemCounts.length == 0) {
                    status.nextNextDeliverySchedule = getInitDeliverySchedule();
                    status.nextNextLoading = [0, 0, 0];
                    status.nextNextRobotPath = [];
                    status.nextNextDeliveryItems = [];
                    status.nextNextDeliveryItemIds = [];
                }
                else {
                    let itemsToDeliver = getItemsToDeliver(itemCounts, items, totalItemCount);
                    console.log('getSchedule::else::itemsToDeliver.length', itemsToDeliver.length);
                    setNextNextDelivery(itemsToDeliver, status);
                }
                console.log('nextNextDeliverySchedule: ', status.nextNextDeliverySchedule);
                console.log('nextNextLoading: ', status.nextNextLoading);
                console.log('nextNextRobotPath: ', status.nextNextRobotPath);
                // console.log('nextNextDeliveryItems: ', status.nextNextDeliveryItems);
                console.log('nextNextDeliveryItemIds: ', status.nextNextDeliveryItemIds);
                callback();
            });
        });
    }
}

connection.connect();

app.ws('/inventory_manager', function(ws, req) {
    ws.category = 'inventory_manager';
    // when received the message
    ws.on('message', function(msg) {
        console.log((performance.now() / 1000.0), 'message from IM: ', msg)
        if (msg === 'load') {
            status.nextCommand = 'startDelivery';
        } else if (msg === 'unload') {
            status.nextCommand = 'move';
        } else if (msg === 'maintenance') {
            status.nextCommand = 'maintenance';
        } else if (msg === 'operating') {
            status.nextCommand = 'move';
        } else if (msg === 'replenishment') {
            status.itemsOnStop[0] = MAX_ITEM_NUMBERS[0] - status.itemsOnRobot[0];
            status.itemsOnStop[1] = MAX_ITEM_NUMBERS[1] - status.itemsOnRobot[1];
            status.itemsOnStop[2] = MAX_ITEM_NUMBERS[2] - status.itemsOnRobot[2];
            status.nextCommand = 'empty';
        } else if (msg == 'unloadFail') {
            status.nextCommand = 'move';
            var idString = "(0";
            for (idx in status.deliveryItemIds) {
                idString += ", " + String(status.deliveryItemIds[idx]);
            }
            idString += ")";
            sqlMethods.rollbackItemsById(connection, idString, function(err, rows) {
                var orderIdString = "(0";
                var orderIdSet = new Set();
                status.deliveryItems.forEach(item => {
                    orderIdSet.add(item.order_id);
                });
                orderIdSet.forEach(orderId => {
                    orderIdString += ", " + String(orderId);
                });
                orderIdString += ")";
                sqlMethods.rollbackOrdersById(connection, orderIdString, function(err, rows) {
                    status.nextCommand = 'empty';
                });
            });
        }
        ws.send(JSON.stringify(getMessageToInventoryManager(status)));
    });
    ws.on('close', function(msg) {
        console.log('inventory_manager websocket closed');
    });
});

app.ws('/robot', function(ws, req) {
    console.log('connected')
    ws.category = 'robot';
    status.initialRobotConnection = true;
    // when received the message
    ws.on('message', function(msg) {
        if (status.robotConnected == false) {
            status.robotConnected = true;
            status.robotStartTime = performance.now();
        }
        console.log((performance.now() / 1000.0), 'From robot: ', msg);

        // Get robot status
        var robotStatus = JSON.parse(msg);
        
        if (robotStatus.mode == 'stop') {
            // Robot is stopped on the stop sign
            if (robotStatus.location == 'stop') {
                if (status.robotMode == 'move') {
                    var scheduleStart = performance.now();
                    getSchedule(function() {
                        var scheduleEnd = performance.now();
                        status.isAlreadyScheduled = true;
                        console.log('Scheduled, running time:', scheduleEnd - scheduleStart);
                    });
                }
                else if (status.pendingItems >= 40 && !status.isAlreadyScheduled) {
                        var scheduleStart = performance.now();
                        getSchedule(function() {
                            var scheduleEnd = performance.now();
                            status.isAlreadyScheduled = true;
                            console.log('Scheduled, running time:', scheduleEnd - scheduleStart);
                        });
                }
                // When the load button is pressed, calculate the number of items on the robot and stop sign.
                if (status.pendingOrders > 0  && status.nextCommand == 'startDelivery') {

                    status.deliverySchedule = JSON.parse(JSON.stringify(status.nextDeliverySchedule));
                    status.robotPath = JSON.parse(JSON.stringify(status.nextRobotPath));
                    status.deliveryItems = JSON.parse(JSON.stringify(status.nextDeliveryItems));
                    status.deliveryItemIds = JSON.parse(JSON.stringify(status.nextDeliveryItemIds));

                    status.nextDeliverySchedule = JSON.parse(JSON.stringify(status.nextNextDeliverySchedule));
                    status.nextRobotPath = JSON.parse(JSON.stringify(status.nextNextRobotPath));
                    status.nextDeliveryItems = JSON.parse(JSON.stringify(status.nextNextDeliveryItems));
                    status.nextDeliveryItemIds = JSON.parse(JSON.stringify(status.nextNextDeliveryItemIds));
                    status.nextLoading = JSON.parse(JSON.stringify(status.nextNextLoading));

                    for (schedule in status.deliverySchedule) {
                        status.itemsOnStop[0] -= status.deliverySchedule[schedule][1];
                        status.itemsOnStop[1] -= status.deliverySchedule[schedule][2];
                        status.itemsOnStop[2] -= status.deliverySchedule[schedule][3];
                        status.itemsOnRobot[0] = status.deliverySchedule[schedule][1];
                        status.itemsOnRobot[1] = status.deliverySchedule[schedule][2];
                        status.itemsOnRobot[2] = status.deliverySchedule[schedule][3];
                    }
                    console.log('status.itemsOnStop:', status.itemsOnStop);
                    console.log('status.itemsOnRobot:', status.itemsOnRobot);

                    // Send message to the robot.
                    ws.send(JSON.stringify(getMessageToRobot(status)));
                    status.nextCommand = 'empty';
                }
                else if (status.nextCommand == 'maintenance') {
                    // Send message to the robot.                    
                    ws.send(JSON.stringify(getMessageToRobot(status)));
                    status.nextCommand = 'empty';
                }
                else {
                    // Send empty message to the robot.                    
                    status.nextCommand = 'empty';
                    ws.send(JSON.stringify(getMessageToRobot(status)));
                }
            }
            // Robot is stopped next to the address
            else {
                status.isAlreadyScheduled = false;
                // when unload button is pressed, update the ordered_items table.
                if (status.nextCommand == 'move' && status.robotPath.includes(status.robotLocation)){
                    var idString = "(";
                    var isFirst = true;
                    status.deliveryItems.forEach(obj => {
                        if (String(obj.address) === status.robotLocation) {
                            if (isFirst) {
                                isFirst = false;
                                idString += String(obj.id);
                            } else {
                                idString += ", " + obj.id; 
                            }
                        }
                    });
                    idString += ")";
                    // minus the number of items on the robot
                    status.itemsOnRobot[0] -= status.deliverySchedule[addressToIndex(status.robotLocation)][1];
                    status.itemsOnRobot[1] -= status.deliverySchedule[addressToIndex(status.robotLocation)][2];
                    status.itemsOnRobot[2] -= status.deliverySchedule[addressToIndex(status.robotLocation)][3];
                    var filldate = moment(Date.now()).format('YYYY-MM-DD HH:mm:ss');
                    sqlMethods.orderedItemsFilldateById(connection, filldate, idString, function(err, rows) {
                        sqlMethods.ordersFilldate(connection, filldate, idString, function(err, rows) {
                            sqlMethods.getPendingOrders(connection, function(err, rows) {
                                status.pendingOrders = Number(rows[0]['COUNT(*)']);
                                sqlMethods.getPendingItems(connection, function(err, rows) {
                                    status.pendingItems = Number(rows[0]['COUNT(*)']);
                                    sqlMethods.getDeliveredOrders(connection, function(err, rows) {
                                        status.deliveredOrders = Number(rows[0]['COUNT(*)']);
                                        sqlMethods.getAvgDeliveryTime(connection, function(err, rows) {
                                            status.avgDeliveryTime = Number(rows[0]['AVG(TIMESTAMPDIFF(SECOND,`orderdate`,`filldate`))']);
                                            ws.send(JSON.stringify(getMessageToRobot(status)));
                                            status.nextCommand = 'empty';    
                                        });
                                    });
                                });
                            });
                        });
                    });
                }
                else if (status.nextCommand == 'maintenance') {
                    // Send message to the robot.                    
                    ws.send(JSON.stringify(getMessageToRobot(status)));
                    status.nextCommand = 'empty';
                }
                else {
                    // Send empty message to the robot.                    
                    status.nextCommand = 'empty';
                    ws.send(JSON.stringify(getMessageToRobot(status)));
                }
            }
        }
        else if (robotStatus.mode == 'move') {
            // Send message to the robot.
            ws.send(JSON.stringify(getMessageToRobot(status)));
            status.nextCommand = 'empty';
        }
        else if (robotStatus.mode == 'maintenance') {
            // Send message to the robot.
            ws.send(JSON.stringify(getMessageToRobot(status)));
            status.nextCommand = 'empty';
        }
        else {
            // Send message to the robot.
            ws.send(JSON.stringify(getMessageToRobot(status)));
            status.nextCommand = 'empty';
        }
        status.robotMode = robotStatus.mode;
        status.robotLocation = robotStatus.location;
    });

    ws.on('close', function(msg) {
        // console.log('robot websocket closed');
        status.robotMode = 'maintenance';
        status.robotMaintenanceStartTime = performance.now();
        status.robotConnected = false;
    });
});

app.listen(SERVER_PORT, function() {
    // execute getsomedata.
    console.log('App Listening on port 3000');
    status.robotMode = 'stop';
    console.log('at listen, mode: ', status.robotMode);

    sqlMethods.sqlModeInit(connection, function(err, rows) {
        sqlMethods.getPendingOrders(connection, function(err, rows) {
            status.pendingOrders = Number(rows[0]['COUNT(*)']);
            sqlMethods.getDeliveredOrders(connection, function(err, rows) {
                status.deliveredOrders = Number(rows[0]['COUNT(*)']);
                status.deliveredOrderList = [status.deliveredOrders];
                sqlMethods.getPendingItems(connection, function(err, rows) {
                    status.pendingItems = Number(rows[0]['COUNT(*)']);
                    status.pendingOrderList = [status.pendingOrders];
                    sqlMethods.getAvgDeliveryTime(connection, function(err, rows) {
                        status.avgDeliveryTime = Number(rows[0]['AVG(TIMESTAMPDIFF(SECOND,`orderdate`,`filldate`))']);
                        status.avgDeliveryTimeList = [status.avgDeliveryTime];
                        updateListTimer = setInterval(function() {
                            status.pendingOrderList.push(status.pendingOrders);
                            status.avgDeliveryTimeList.push(status.avgDeliveryTime);
                            status.deliveredOrderList.push(status.deliveredOrders);
                            status.downTimeList.push(status.downTime);
                            console.log(performance.now(), "");
                            console.log('pendingOrderList:', status.pendingOrderList);
                            console.log('avgDelieryTimeList:', status.avgDeliveryTimeList);
                            console.log('deliveredOrderList:', status.deliveredOrderList);
                            console.log('downTimeList:', status.downTimeList);
                        }, UPDATE_LIST_INTERVAL);
                    });
                });
            });
        });
    });
});

app.get('/',function(req,res){
//    res.render('dashboard', {exerciseNum: moment(Date.now()).format('YYYY-MM-DD HH:mm:ss')});
    res.render('./dashboard/dashboard', getMessageToDashboard(status));
});

var firstB_time = null;

app.post('/firstB', (req, res)=>{
    // firstB_time = req.body.firstB;
    firstB_time = moment(Date.now()).format('HH:mm');
    dashboard = getMessageToDashboard(status);
    dashboard["firstB"] = firstB_time;
    res.render('./dashboard/dash_firstB', dashboard);
});

app.get('/firstB', function(req, res){
    dashboard = getMessageToDashboard(status);
    if (firstB_time != null){
        dashboard["firstB"] = firstB_time;
    }
    res.render('./dashboard/dash_firstB', dashboard);
});

var secondB_time = null;

app.post('/secondB', (req, res)=>{
    // secondB_time = req.body.secondB;
    secondB_time = moment(Date.now()).format('HH:mm');
    dashboard = getMessageToDashboard(status);
    dashboard["firstB"] = firstB_time;
    dashboard['secondB'] = secondB_time;
    res.render('./dashboard/dash_secondB', dashboard);
});

app.get('/secondB', function(req, res){
    dashboard = getMessageToDashboard(status);
    if (secondB_time != null){
        dashboard["firstB"] = firstB_time;
        dashboard["secondB"] = secondB_time;
    }
    res.render('./dashboard/dash_secondB', dashboard);
});

app.get('/custWeb', function(req, res){
    res.render('./custWeb/custWeb_basic', {loginLink: '/login', custLink: '/custInfo'});
});

app.get('/login',function(req,res){
    res.render('./custWeb/custWeb_login', {loginLink: '/login',
                                custLink: '/custInfo'});
});

app.post('/custInfo', (req,res)=>{
    id = req.body.loginId;
    sqlMethods.getCustInfo(connection, id, function(err, rows) {
        console.log('rows:', rows, err);
        var info_dict = {'rows':rows};
        info_dict["loginLink"] = '/login';
        info_dict["custLink"] = '/custInfo';
        res.render('./custWeb/custWeb_info', info_dict);
    })
});

app.get('/custInfo',function(req,res){
    res.render('./custWeb/custWeb_info', {loginLink: "/login",
                                custLink: "/custInfo"});
});

app.get('/api/pending', function (req, res) {
    sqlMethods.getAllRows(connection, 'orders', function(err, rows) {
        if (err) {
            res.json({"Error" : true, "Message" : "Error executing MySQL query"});
        } else {
            res.send(rows);
        }
    });
});

app.post('/api/neworder', function (req, res) {
    console.log('order requested');
    console.log(req.body);
    status.pendingOrders += 1;
    status.pendingItems += Number(req.body.red) + Number(req.body.green), Number(req.body.blue);
    sqlMethods.addOrder(connection, req.body.customer, req.body.red, req.body.blue, req.body.green, req.body.address,
    function(err, rows) {
        if (err) {
            res.json({"Error" : true, "Message" : "Error executing MySQL query"});
        } else {
            res.json({"Error" : false, "Message" : "User Added !"});
        }
        sqlMethods.addOrderedItems(connection, rows.insertId, req.body.red, req.body.blue, req.body.green,
                                    req.body.address);
    });
});
