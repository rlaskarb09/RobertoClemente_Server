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
    password: 'ehfpalvkthf',
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
    robotMode:'stop',
    nextCommand: 'empty',
    itemsOnStop: [26, 27, 25],
    itemsOnRobot: [0, 0, 0],
    pendingOrders: 0,
    pendingItems: 0,
    deliveredOrders: 0,
    avgDeliveryTime: 0,
    needReschedule: true,
    // updated when the robot is on the stop sign
    deliverySchedule: {},
    deliveryItems: [],
    robotPath: [],
    // updated while scheduling
    nextDeliverySchedule: {},
    nextDeliveryItems: [],
    nextRobotPath: [],
    nextLoading: [0, 0, 0]
};

let messageToInventoryManager = {
    robotMode: 'stop',
    deliverySchedule: {},
    itemsOnStop: [26, 27, 25],
    itemsOnRobot: [0, 0, 0],
    pendingOrders: 0,
    deliveredOrders: 0,
    avgDeliveryTime: 0
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
    if (InventoryManagerWebSocket != null){
        InventoryManagerWebSocket.send(JSON.stringify(getMessageToInventoryManager(status)));
    } 
    // else{
    //     console.log('inventory manager not connected.');
    // }
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
    Object.keys(deliverySchedule_).forEach(key => {
        nextLoading[0] += deliverySchedule_[key][0];        
        nextLoading[1] += deliverySchedule_[key][1];
        nextLoading[2] += deliverySchedule_[key][2];
    });

    return nextLoading;
}

// Get Priority of the address
function getPriority(a) {
    numbered = Number(a);
    switch (numbered) {
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

function addressCompare(a, b) {
    return getPriority(b.address) - getPriority(a.address);
}

function getFIFOSchedule(callback) {
    sqlMethods.getItemsToDeliver(connection, function(err, rows) {
        rows.sort(addressCompare);
        status.nextDeliveryItems = rows;
        var deliverySchedule_ = {};
        for (var i = 0; i < status.nextDeliveryItems.length; i++) {
            if (!(status.nextDeliveryItems[i].address in deliverySchedule_)) {
                deliverySchedule_[status.nextDeliveryItems[i].address] = [0,0,0];
            }
            if (status.nextDeliveryItems[i].color == 'R') {
                deliverySchedule_[status.nextDeliveryItems[i].address][0] += 1;
            } else if (status.nextDeliveryItems[i].color == 'G') {
                deliverySchedule_[status.nextDeliveryItems[i].address][1] += 1;
            } else if (status.nextDeliveryItems[i].color == 'B') {
                deliverySchedule_[status.nextDeliveryItems[i].address][2] += 1;
            }
        }
        console.log('deliverySchedule at getFIFOSchedule:', deliverySchedule_);
        callback(deliverySchedule_);
    });
}


// function updateFillDate()
// {

//     var datetime = new Date().toLocaleString();
// }

connection.connect();

app.ws('/inventory_manager', function(ws, req) {
    InventoryManagerWebSocket = ws;
    // when received the message
    ws.on('message', function(msg) {
        if (msg === 'load') {
            status.nextCommand = 'startDelivery';
            console.log(performance.now() + ' message: ' + 'load');
        } else if (msg === 'unload') {
            status.nextCommand = 'move';
            console.log(performance.now() + ' message: ' + 'unload');
        } else if (msg === 'maintenance') {
            status.nextCommand = 'maintenance';
            console.log(performance.now() + ' message: ' + 'maintenance');
        } else if (msg === 'operating') {
            status.nextCommand = 'move';
            console.log(performance.now() + ' message: ' + 'operating');
        } else if (msg === 'replenishment') {
            console.log(performance.now() + ' message: ' + 'replenishment');
            status.itemsOnStop[0] = maxItemNumbers[0] - status.itemsOnRobot[0];
            status.itemsOnStop[1] = maxItemNumbers[1] - status.itemsOnRobot[1];
            status.itemsOnStop[2] = maxItemNumbers[2] - status.itemsOnRobot[2];
        }
        console.log('stats.nextCommand: ', status.nextCommand);
        ws.send(JSON.stringify(getMessageToInventoryManager(status)));
    });
});

app.ws('/robot', function(ws, req) {
    // when received the message
    robotWebSocket = ws;

    ws.on('message', function(msg) {
        console.log((performance.now() / 1000.0), 'From robot: ', msg);
        var deliveryPath = [];
        // Clear the timer
        // clearInterval(robotConnectionTimer);
        // robotConnectionTimer = setInterval(function() {
        //     console.log('robot disconnected: ', performance.now() / 1000.0);
        //     status.robotMode = 'maintenance';
        // }, robotLimitTime);

        // Get robot status
        var robotStatus = JSON.parse(msg);
        if (status.robotMode != robotStatus.mode && status.needReschedule == true)
        {
            getFIFOSchedule(function(deliverySchedule_) {
                status.nextDeliverySchedule = deliverySchedule_;
                deliveryPath = Object.keys(status.deliverySchedule);
                deliveryPath.push('stop');
                status.nextRobotPath = deliveryPath;
                // Send message to the robot.
                status.needReschedule = false;
                status.nextLoading = getNextLoading(status.nextDeliverySchedule);
                console.log('ws(/robot).onmessage: nextDeliverySchedule: ', status.nextDeliverySchedule);
                console.log('ws(/robot).onmessage: nextLoading: ', status.nextLoading);
                console.log('ws(/robot).onmessage: nextRobotPath: ', status.nextRobotPath);
                console.log('ws(/robot).onmessage: needReschedule: ', status.needReschedule);
            });
        }
        status.robotMode = robotStatus.mode;
        status.robotLocation = robotStatus.location;
        
        if (status.robotMode == 'stop') {
            // Robot is stopped on the stop sign
            if (status.robotLocation == 'stop') {
                status.deliverySchedule = Array.from(status.nextDeliverySchedule);
                status.deliveryItems = JSON.parse(JSON.stringify(status.nextDeliveryItems)) ;
                status.robotPath = Array.from(status.nextRobotPath);
                console.log('ws(/robot).onmessage: deliverySchedule: ', status.deliverySchedule);
                console.log('ws(/robot).onmessage: robotPath: ', status.robotPath);
                console.log('ws(/robot).onmessage: needReschedule: ', status.needReschedule);
                // When the load button is pressed, calculate the number of items on the robot and stop sign.
                if (status.pendingOrders > 0  && status.nextCommand == 'startDelivery') {
                    for (addr in status.deliverySchedule) {
                        status.itemsOnStop[0] -= status.deliverySchedule[addr][0];
                        status.itemsOnStop[1] -= status.deliverySchedule[addr][1];
                        status.itemsOnStop[2] -= status.deliverySchedule[addr][2];
                        status.itemsOnRobot[0] += status.deliverySchedule[addr][0];
                        status.itemsOnRobot[1] += status.deliverySchedule[addr][1];
                        status.itemsOnRobot[2] += status.deliverySchedule[addr][2];
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
                    status.itemsOnRobot[0] -= status.deliverySchedule[status.robotLocation][0];
                    status.itemsOnRobot[1] -= status.deliverySchedule[status.robotLocation][1];
                    status.itemsOnRobot[2] -= status.deliverySchedule[status.robotLocation][2];
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
                                            var messageToRobot = {command: status.nextCommand, path: deliveryPath};
                                            ws.send(JSON.stringify(messageToRobot));
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
    });
});

app.listen(serverPort, function() {
    // execute getsomedata.
    console.log('App Listening on port 3000');
    status.robotMode = 'stop';
    console.log('at listen, mode: ', status.robotMode);
    sqlMethods.getPendingOrders(connection, function(err, rows) {
        status.pendingOrders = Number(rows[0]['COUNT(*)']);
        sqlMethods.getPendingItems(connection, function(err, rows) {
            status.pendingItems = Number(rows[0]['COUNT(*)']);
            console.log(status.pendingItems);
        });
    })
});

app.get('/',function(req,res){
//    res.render('dashboard', {exerciseNum: moment(Date.now()).format('YYYY-MM-DD HH:mm:ss')});
    dashboard = getMessageToDashboard(status);
    exerciseNum = new Date()
    dashboard['exerciseNum'] = exerciseNum.getMinutes();
    res.render('dashboard', dashboard);
});

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
    console.log('order requested')
    console.log(req.body)
    status.pendingOrders += 1;
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
