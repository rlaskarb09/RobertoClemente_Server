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
    password: 'Dltndk97!',
    database: 'orderdb',
    debug: false
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(bodyParser.text());
app.use(express.static(__dirname+'/web'));

app.set('view engine','ejs');
app.set('views','./web');

const robotLimitTime = 8000; //ms
const serverPort = 3000;
const maxItemNumbers = [26, 27, 25];

let exerciseNum = 10;

let status = {
    robotConnected: true,
    robotStartTime: performance.now(),
    robotMode:'stop',
    robotLocation: 'stop',
    nextCommand: 'empty',
    itemsOnStop: [26, 27, 25],
    itemsOnRobot: [0, 0, 0],
    pendingOrders: 0,
    pendingItems: 0,
    deliveredOrders: 0,
    avgDeliveryTime: 0,
    needReschedule: true,
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
    nextNextDeliveryItemIds: []
};

let messageToInventoryManager = {
    robotMode: 'stop',
    robotLocation: 'stop',
    nextLoading: [0, 0, 0],
    deliverySchedule: {},
};

let messageToDashboard = {
    itemsOnStop: [26, 27, 25],
    itemsOnRobot: [0, 0, 0],
    pendingOrders: 0,
    deliveredOrders: 0,
    avgDeliveryTime: 0
};

// let robotConnectionTimer = setInterval(function() {
//     console.log('robot disconnected: ', performance.now() / 1000.0);
//     status.robotMode = 'maintenance';
// }, robotLimitTime);

let inventoryManagerTimer = setInterval(function() {
    console.log(expressWs.getWss().clients.size);
    expressWs.getWss('/inventory_manager').clients.forEach((wsInstance) => {
        if (wsInstance.readyState == 1 && wsInstance.category == 'inventory_manager') {
            wsInstance.send(JSON.stringify(getMessageToInventoryManager(status)));
        }
    });
}, 1000);

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
        nextLoading: status.nextLoading
    };
}

function getMessageToDashboard(status) {
    return {
        robotConnected: status.robotConnected,
        robotBatteryTime: parseInt((performance.now() - status.robotStartTime)/60),
        itemsOnStop: status.itemsOnStop,
        itemsOnRobot: status.itemsOnRobot,
        pendingOrders: status.pendingOrders,
        pendingItems: status.pendingItems,
        deliveredOrders: status.deliveredOrders,
        avgDeliveryTime: status.avgDeliveryTime,
        totalOrders: status.pendingOrders + status.deliveredOrders
    };
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

function getSchedule(callback) {
    if (status.nextLoading[0] + status.nextLoading[1] + status.nextLoading[2] == 0) {
        idString = "(0";
        for (idx in status.deliveryItemIds) {
            idString += ", " + String(status.deliveryItemIds[idx]);
        }
        idString += ")";
        sqlMethods.getItemsToDeliverNotInIdAll(connection, idString, function(err, rows) {
            let items = rows;
            let itemsToDeliver = [];
            let totalItemCount = 40;
            sqlMethods.getItemCount(connection, function(err, rows) {
                for (var i = 0; i < rows.length; i++) {
                    var order_id = rows[i].order_id;
                    var itemCount = rows[i]['COUNT(*)'];
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
                var nextDeliverySchedule = getInitDeliverySchedule();
                for (var i = 0; i < 20; i++) {
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
                status.nextDeliveryItems = itemsToDeliver.slice(0,20);
                status.nextDeliveryItemIds = getItemIds(status.nextDeliveryItems);

                var nextNextDeliverySchedule = getInitDeliverySchedule();
                for (var i = 20; i < 40 && i < itemsToDeliver.length; i++) {
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
                status.nextNextDeliveryItems = itemsToDeliver.slice(20);
                status.nextNextDeliveryItemIds = getItemIds(status.nextNextDeliveryItems);

                // console.log('nextDeliverySchedule: ', status.nextDeliverySchedule);
                // console.log('nextLoading: ', status.nextLoading);
                // console.log('nextRobotPath: ', status.nextRobotPath);
                // console.log('nextDeliveryItems: ', status.nextDeliveryItems);
                // console.log('nextDeliveryItemIds: ', status.nextDeliveryItemIds);
                // console.log('nextNextDeliverySchedule: ', status.nextNextDeliverySchedule);
                // console.log('nextNextLoading: ', status.nextNextLoading);
                // console.log('nextNextRobotPath: ', status.nextNextRobotPath);
                // console.log('nextNextDeliveryItems: ', status.nextNextDeliveryItems);
                // console.log('nextNextDeliveryItemIds: ', status.nextNextDeliveryItemIds);
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
        sqlMethods.getItemsToDeliverNotInIdAll(connection, idString, function(err, rows) {
            let items = rows;
            let itemsToDeliver = [];
            let totalItemCount = 20;
            sqlMethods.getItemCount(connection, function(err, rows) {
                for (var i = 0; i < rows.length; i++) {
                    var order_id = rows[i].order_id;
                    var itemCount = rows[i]['COUNT(*)'];
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

                var nextNextDeliverySchedule = getInitDeliverySchedule();
                for (var i = 0; i < 20 && i < itemsToDeliver.length; i++) {
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
                status.nextNextDeliveryItems = itemsToDeliver.slice(20);
                status.nextNextDeliveryItemIds = getItemIds(status.nextNextDeliveryItems);

                console.log('nextNextDeliverySchedule: ', status.nextNextDeliverySchedule);
                console.log('nextNextLoading: ', status.nextNextLoading);
                console.log('nextNextRobotPath: ', status.nextNextRobotPath);
                console.log('nextNextDeliveryItems: ', status.nextNextDeliveryItems);
                console.log('nextNextDeliveryItemIds: ', status.nextNextDeliveryItemIds);
            });
        });
    }
}


// function updateFillDate()
// {

//     var datetime = new Date().toLocaleString();
// }

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
            status.itemsOnStop[0] = maxItemNumbers[0] - status.itemsOnRobot[0];
            status.itemsOnStop[1] = maxItemNumbers[1] - status.itemsOnRobot[1];
            status.itemsOnStop[2] = maxItemNumbers[2] - status.itemsOnRobot[2];
        }
        ws.send(JSON.stringify(getMessageToInventoryManager(status)));
    });
    ws.on('close', function(msg) {
        console.log('inventory_manager websocket closed');
    });
});

app.ws('/robot', function(ws, req) {
    ws.category = 'robot';
    // when received the message
    ws.on('message', function(msg) {
        if (status.robotConnected == false) {
            status.robotConnected = true;
            status.robotStartTime = performance.now();
        }
        console.log((performance.now() / 1000.0), 'From robot: ', msg);
        // Clear the timer
        // clearInterval(robotConnectionTimer);
        // robotConnectionTimer = setInterval(function() {
        //     console.log('robot disconnected: ', performance.now() / 1000.0);
        //     status.robotMode = 'maintenance';
        // }, robotLimitTime);

        // Get robot status
        var robotStatus = JSON.parse(msg);
        if ((robotStatus.location == 'stop' && robotStatus.mode == 'stop') || 
            (status.robotMode != robotStatus.mode && status.needReschedule == true))
        {
            getFIFOSchedule(function(deliverySchedule_) {
                var deliveryPath = [];
                status.nextDeliverySchedule = deliverySchedule_;
                for (idx in deliverySchedule_) {
                    
                    if (deliverySchedule_[idx][1] + deliverySchedule_[idx][2] + deliverySchedule_[idx][3] > 0) {
                        deliveryPath.push(deliverySchedule_[idx][0]);
                    }
                }

                status.nextRobotPath = deliveryPath;
                // Send message to the robot.
                status.needReschedule = false;
                status.nextLoading = getNextLoading(status.nextDeliverySchedule);
                console.log('ws(/robot).onmessage getFIFOSchedule: nextDeliverySchedule: ', status.nextDeliverySchedule);
                console.log('ws(/robot).onmessage getFIFOSchedule: nextLoading: ', status.nextLoading);
                console.log('ws(/robot).onmessage getFIFOSchedule: nextRobotPath: ', status.nextRobotPath);
                console.log('ws(/robot).onmessage getFIFOSchedule: needReschedule: ', status.needReschedule);
            });
        }

        status.robotMode = robotStatus.mode;
        status.robotLocation = robotStatus.location;
        
        if (status.robotMode == 'stop') {
            // Robot is stopped on the stop sign
            if (status.robotLocation == 'stop') {
                status.deliverySchedule = JSON.parse(JSON.stringify(status.nextDeliverySchedule));
                status.deliveryItems = JSON.parse(JSON.stringify(status.nextDeliveryItems)) ;
                status.robotPath = JSON.parse(JSON.stringify(status.nextRobotPath));
                console.log('ws(/robot).onmessage: deliverySchedule: ', status.deliverySchedule);
                console.log('ws(/robot).onmessage: robotPath: ', status.robotPath);
                console.log('ws(/robot).onmessage: needReschedule: ', status.needReschedule);
                // When the load button is pressed, calculate the number of items on the robot and stop sign.
                if (status.pendingOrders > 0  && status.nextCommand == 'startDelivery') {
                    status.deliveryItemIds = JSON.parse(JSON.stringify(status.nextDeliveryItemIds));
                    for (schedule in status.deliverySchedule) {
                        status.itemsOnStop[0] -= schedule[1];
                        status.itemsOnStop[1] -= schedule[2];
                        status.itemsOnStop[2] -= schedule[3];
                        status.itemsOnRobot[0] += schedule[1];
                        status.itemsOnRobot[1] += schedule[2];
                        status.itemsOnRobot[2] += schedule[3];
                    }
                    // Send message to the robot.
                    ws.send(JSON.stringify(getMessageToRobot(status)));
                    status.nextCommand = 'empty';
                }
                else {
                    // Send message to the robot.                    
                    ws.send(JSON.stringify(getMessageToRobot(status)));
                    status.nextCommand = 'empty';
                }
            }
            // Robot is stopped next to the address
            else {
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
                    console.log(filldate)
                    sqlMethods.orderedItemsFilldateById(connection, filldate, idString, function(err, rows) {
                        sqlMethods.ordersFilldate(connection, filldate, idString, function(err, rows) {
                            sqlMethods.getPendingOrders(connection, function(err, rows) {
                                status.pendingOrders = Number(rows[0]['COUNT(*)']);
                                sqlMethods.getPendingItems(connection, function(err, rows) {
                                    status.pendingItems = Number(rows[0]['COUNT(*)']);
                                    sqlMethods.getDeliveredOrders(connection, function(err, rows) {
                                        status.deliveredOrders = Number(rows[0]['COUNT(*)']);
                                        sqlMethods.getAvgDeliveryTime(connection, function(err, rows) {
                                            status.avgDeliveryTime = Number(rows[0]['AVG(filldate-orderdate)']);
                                            ws.send(JSON.stringify(getMessageToRobot(status)));
                                            status.nextCommand = 'empty';    
                                        });
                                    });
                                });
                            });
                        });
                    });
                }
                else {
                    // Send message to the robot.
                    ws.send(JSON.stringify(getMessageToRobot(status)));
                    status.nextCommand = 'empty';
                }
            }
        }
        else if (status.robotMode == 'move') {
            status.needReschedule = true;
            // Send message to the robot.
            ws.send(JSON.stringify(getMessageToRobot(status)));
            status.nextCommand = 'empty';
        }
        else if (status.robotMode == 'maintenance') {
            status.needReschedule = true;
            // Send message to the robot.
            ws.send(JSON.stringify(getMessageToRobot(status)));
            status.nextCommand = 'empty';
        }
        else {
            // Send message to the robot.
            ws.send(JSON.stringify(getMessageToRobot(status)));
            status.nextCommand = 'empty';
        }
    });

    ws.on('close', function(msg) {
        console.log('robot websocket closed');
        status.robotConnected = false;
    });
});

app.listen(serverPort, function() {
    // execute getsomedata.
    console.log('App Listening on port 3000');
    status.robotMode = 'stop';
    console.log('at listen, mode: ', status.robotMode);

    getSchedule();

    sqlMethods.getPendingOrders(connection, function(err, rows) {
        status.pendingOrders = Number(rows[0]['COUNT(*)']);
        sqlMethods.getPendingItems(connection, function(err, rows) {
            status.pendingItems = Number(rows[0]['COUNT(*)']);
        });
    });
});

app.get('/',function(req,res){
//    res.render('dashboard', {exerciseNum: moment(Date.now()).format('YYYY-MM-DD HH:mm:ss')});
    res.render('dashboard', getMessageToDashboard(status));
});

app.post('/firstB', (req, res)=>{
    firstB_time = req.body.firstB;
    dashboard = getMessageToDashboard(status);
    dashboard["firstB"] = firstB_time;
    res.render('dash_firstB', dashboard);
});

app.get('/firstB', function(req, res){
    res.render('dash_firstB', dashboard);
})

app.get('/login',function(req,res){
    res.render('custWeb_login', {exerciseNum: moment(Date.now()).format('YYYY-MM-DD HH:mm:ss'),
                                loginLink: '/login',
                                custLink: '/custInfo'});
    // res.render('view', getMessageToDashboard());
});

app.get('/custInfo',function(req,res){
    res.render('custWeb_info', {exerciseNum: moment(Date.now()).format('YYYY-MM-DD HH:mm:ss'),
                               loginLink: "/login",
                                custLink: "/custInfo"});
    // res.render('view', getMessageToDashboard());
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
        status.needReschedule = true;
        if (err) {
            res.json({"Error" : true, "Message" : "Error executing MySQL query"});
        } else {
            res.json({"Error" : false, "Message" : "User Added !"});
        }
        sqlMethods.addOrderedItems(connection, rows.insertId, req.body.red, req.body.blue, req.body.green,
                                    req.body.address);
    });
});
