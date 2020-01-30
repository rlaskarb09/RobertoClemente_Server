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
var isFirstOrder = true;

var deliverying = null;
var deliverySchedule = null;
var nextPath = null;
var deliveryItems = null;

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

const robotLimitTime = 8000; //ms
const serverPort = 3000;
const maxItemNumbers = [26, 27, 25];

let exerciseNum = 10;

let status = {
    robotMode:'stop',
    robotPath: [],
    nextCommand: 'empty',
    itemsOnStop: [26, 27, 25],
    itemsOnRobot: [0, 0, 0],
    pendingOrders: 0,
    deliveredOrders: 0,
    avgDeliveryTime: 0
};

let messageToInventoryManager = {
    robotMode: 'stop',
    'deliverySchedule': {},
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
        InventoryManagerWebSocket.send(JSON.stringify(getMessageToInventoryManager()));
    } 
    // else{
    //     console.log('inventory manager not connected.');
    // }
}, 1000);


function getMessageToInventoryManager() {
    return {
        robotMode: status.robotMode, 
        robotLocation: status.robotLocation,
        'deliverySchedule': deliverySchedule,
        itemsOnStop: status.itemsOnStop, 
        itemsOnRobot: status.itemsOnRobot,
        pendingOrders: status.pendingOrders, 
        deliveredOrders: status.deliveredOrders, 
        avgDeliveryTime: status.avgDeliveryTime
    };
}

function getMessageToDashboard() {
    return {
        itemsOnStop: status.itemsOnStop,
        itemsOnRobot: status.itemsOnRobot,
        pendingOrders: status.pendingOrders,
        deliveredOrders: status.deliveredOrders,
        avgDeliveryTime: status.avgDeliveryTime
    };
}

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
    // if (isFirstOrder) {
    //     setTimeout(function() {isFirstOrder = false}, 1000);
    //     return null;
    // } else {
        sqlMethods.getItemsToDeliver(connection, function(err, rows) {
            rows.sort(addressCompare);
            deliveryItems = rows;
            var deliverySchedule = {};
            for (var i = 0; i < deliveryItems.length; i++) {
                if (!(deliveryItems[i].address in deliverySchedule)) {
                    deliverySchedule[deliveryItems[i].address] = [0,0,0];
                }
                if (deliveryItems[i].color == 'R') {
                    deliverySchedule[deliveryItems[i].address][0] += 1;
                } else if (deliveryItems[i].color == 'G') {
                    deliverySchedule[deliveryItems[i].address][1] += 1;
                } else if (deliveryItems[i].color == 'B') {
                    deliverySchedule[deliveryItems[i].address][2] += 1;
                }
            }
            console.log('deliverySchedule at getFIFOSchedule:', deliverySchedule);
            callback(deliverySchedule);
        });
    // }
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
        ws.send(JSON.stringify(getMessageToInventoryManager()));
    });
});

app.ws('/robot', function(ws, req) {
    // when received the message
    robotWebSocket = ws;
    ws.on('message', function(msg) {
        var nextPath = []
        // Clear the timer
        // clearInterval(robotConnectionTimer);
        // robotConnectionTimer = setInterval(function() {
        //     console.log('robot disconnected: ', performance.now() / 1000.0);
        //     status.robotMode = 'maintenance';
        // }, robotLimitTime);

        // Get robot status
        var robotStatus = JSON.parse(msg);
        status.robotMode = robotStatus.mode;
        status.robotLocation = robotStatus.location;
        console.log('status.robotMode: ', status.robotMode, ' robotStatus.mode: ', robotStatus.mode);
        console.log('From robot: ', msg);
        
        // The robot is stopped on the stop sign
        if (status.robotMode == 'stop' && status.robotLocation=='stop'){
            // When the robot is on the stop sign, and unload button is pressed.

            // When the load button is pressed, calculate the number of items on the robot and stop sign.
            if (status.pendingOrders > 0  && status.nextCommand == 'startDelivery') {
                for (addr in deliverySchedule) {
                    status.itemsOnStop[0] -= deliverySchedule[addr][0];
                    status.itemsOnStop[1] -= deliverySchedule[addr][1];
                    status.itemsOnStop[2] -= deliverySchedule[addr][2];
                    status.itemsOnRobot[0] += deliverySchedule[addr][0];
                    status.itemsOnRobot[1] += deliverySchedule[addr][1];
                    status.itemsOnRobot[2] += deliverySchedule[addr][2];
                }
                // Send message to the robot.
                var messageToRobot = {command: status.nextCommand, path: status.robotPath};
                ws.send(JSON.stringify(messageToRobot));
                status.nextCommand = 'empty';
            } else if (status.nextCommand == 'empty') {
                getFIFOSchedule(function(deliverySchedule_) {
                    deliverySchedule = deliverySchedule_
                    console.log('deliverySchedule: ', deliverySchedule)
                    nextPath = Object.keys(deliverySchedule);
                    nextPath.push('stop');
                    status.robotPath = nextPath;
                    console.log(status);
                    // Send message to the robot.
                    var messageToRobot = {command: status.nextCommand, path: status.robotPath};
                    ws.send(JSON.stringify(messageToRobot));
                    status.nextCommand = 'empty';
                });
            }
            else {
                // Send message to the robot.
                
                var messageToRobot = {command: status.nextCommand, path: nextPath};
                ws.send(JSON.stringify(messageToRobot));
                status.nextCommand = 'empty';
            }
        }
        // when unload button is pressed, update the ordered_items table.
        else if (status.nextCommand == 'move' && status.robotPath.includes(status.robotLocation)){
            var idString = "(";
            var isFirst = true;
            deliveryItems.forEach(obj => {
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
            status.itemsOnRobot[0] -= deliverySchedule[status.robotLocation][0];
            status.itemsOnRobot[1] -= deliverySchedule[status.robotLocation][1];
            status.itemsOnRobot[2] -= deliverySchedule[status.robotLocation][2];
            var filldate = moment(Date.now()).format('YYYY-MM-DD HH:mm:ss');
            console.log(filldate)
            sqlMethods.orderedItemsFilldateById(connection, filldate, idString, function(err, rows) {
                sqlMethods.ordersFilldate(connection, filldate, idString, function(err, rows) {
                    sqlMethods.getPendingOrders(connection, function(err, rows) {
                        status.pendingOrders = Number(rows[0]['COUNT(*)']);
                        sqlMethods.getDeliveredOrders(connection, function(err, rows) {
                            status.deliveredOrders = Number(rows[0]['COUNT(*)']);
                            // Send message to the robot.
                            var messageToRobot = {command: status.nextCommand, path: nextPath};
                            ws.send(JSON.stringify(messageToRobot));
                            status.nextCommand = 'empty';
                        })
                    })
                });
            });
        } else {
            // Send message to the robot.
            var messageToRobot = {command: status.nextCommand, path: nextPath};
            ws.send(JSON.stringify(messageToRobot));
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
    })
});

app.get('/',function(req,res){
//    res.render('dashboard', {exerciseNum: moment(Date.now()).format('YYYY-MM-DD HH:mm:ss')});
    res.render('dashboard', getMessageToDashboard());
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
        if (err) {
            console.log('Error!')
            res.json({"Error" : true, "Message" : "Error executing MySQL query"});
        } else {
            console.log('Added successfully!')
            res.json({"Error" : false, "Message" : "User Added !"});
        }
        sqlMethods.addOrderedItems(connection, rows.insertId, req.body.red, req.body.blue, req.body.green,
                                    req.body.address);
    });
});