const { PerformanceObserver, performance } = require('perf_hooks');
var express = require('express'); 
var bodyParser = require('body-parser'); 
var app = express(); 
var router = express.Router();
var expressWs = require('express-ws')(app);
var mysql = require('mysql');
var async = require("async");

const sqlMethods = require('./sql_methods.js');
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

const robotLimitTime = 8000; //ms
const serverPort = 3000;

let status = {robotMode:'stop',
                nextCommand: 'empty',
                itemsOnStop: [26, 27, 25],
                itemsOnRobot: [0, 0, 0],
                pendingOrders: 0,
                deliveredOrders: 0,
                avgDeliveryTime: 0};

let messageToInventoryManager = {robotMode: 'stop',
                                itemsOnStop: [26, 27, 25],
                                itemsOnRobot: [0, 0, 0],
                                pendingOrders: 0,
                                deliveredOrders: 0,
                                avgDeliveryTime: 0};

let robotConnectionTimer = setInterval(function() {
    console.log('robot disconnected: ', performance.now() / 1000.0);
    status.robotMod = 'maintenance';
}, robotLimitTime);

function getNextSchedule() {
    //
}

app.ws('/inventory_manager', function(ws, req) {
    // when received the message
    ws.on('message', function(msg) {
        if (msg === 'load') {
            status.nextCommand = 'startDelivery';
            console.log(performance.now() + ' message: ' + 'load');
        } else if (msg === 'unload') {
            status.nextCommand = 'keepDelivery';
            console.log(performance.now() + ' message: ' + 'unload');
        } else if (msg === 'maintenance') {
            status.nextCommand = 'maintenance';
            console.log(performance.now() + ' message: ' + 'maintenance');
        } else if (msg === 'operating') {
            console.log(performance.now() + ' message: ' + 'operating');
        }
        console.log('stats.nextCommand: ', status.nextCommand);
        ws.send(msg);
    });
    console.log('From inventory manager: ', msg)
});

app.ws('/robot', function(ws, req) {
    // when received the message
    ws.on('open', ()=>{console.log('inventory_manager server open')});
    ws.on('message', function(msg) {
        clearInterval(robotConnectionTimer);
        robotConnectionTimer = setInterval(function() {
            console.log('robot disconnected: ', performance.now() / 1000.0);
            status.robotMod = 'maintenance';
        }, robotLimitTime);
        console.log('From inventory manager: ', msg);
        var nextPath = []
        var messageToRobot = {command: status.nextCommand, path: nextPath};
        ws.send(JSON.stringify(messageToRobot));
    });
    
});

connection.connect();

app.listen(serverPort, function() {
    // execute getsomedata.
    console.log('App Listening on port 3000');
    status.robotMode = 'moving';
    console.log('at listen, mode: ', status.robotMode);
    sqlMethods.rowCount(connection, 'orders', function(err, rows) {
        console.log(rows[0]['COUNT(*)']);
    })
});

app.get('/', function (req, res) {
    res.send('This is index page.');
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