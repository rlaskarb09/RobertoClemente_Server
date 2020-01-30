const { PerformanceObserver, performance } = require('perf_hooks');
var mysql = require('mysql');

function getAllRows(connection, tableName, callback) {
    var query = "SELECT * FROM ??";
    var params = [tableName];
    query = mysql.format(query,params);
    connection.query(query, function(err,rows){
        callback(err, rows);
    });
}

function addOrder(connection, customer, red, blue, green, address, callback) {
    var query = "INSERT INTO ??(??,??,??,??,??,??) VALUES (?,?,?,?,?,?)";
    var params = ["orders","customer","red","blue","green","pending","address", customer, red, blue, green, true, address];
    
    query = mysql.format(query, params);
    console.log(query);
    connection.query(query,function(err,rows){
        console.log('at addOrder:', rows.insertId);
        callback(err, rows);
    });
}

function addOrderedItems(connection, orderId, red, blue, green, address) {
    for (i = 0; i < Number(red); i++) {
        var query = "INSERT INTO ??(??,??,??) VALUES (?,?,?)";
        var params = ["ordered_items", 'order_id', 'color', 'address', orderId, 'R', address];
        query = mysql.format(query, params);
        connection.query(query);
    }
    for (i = 0; i < Number(green); i++) {
        var query = "INSERT INTO ??(??,??,??) VALUES (?,?,?)";
        var params = ["ordered_items", 'order_id', 'color', 'address', orderId, 'G', address];
        query = mysql.format(query, params);
        connection.query(query);
    }
    for (i = 0; i < Number(blue); i++) {
        var query = "INSERT INTO ??(??,??,??) VALUES (?,?,?)";
        var params = ["ordered_items", 'order_id', 'color', 'address', orderId, 'B', address];
        query = mysql.format(query, params);
        connection.query(query);
    }
}

function rowCount(connection, tableName, callback) {
    var query = "SELECT COUNT(*) FROM ??";
    var params = [tableName];
    query = mysql.format(query, params);
    connection.query(query, function(err, rows) {
        callback(err, rows);
    });
}

function getPendingOrders(connection, callback) {
    var query = "SELECT COUNT(*) FROM ?? WHERE ?? = 1";
    var params = ['orders', 'pending'];
    query = mysql.format(query, params);
    connection.query(query, function(err, rows) {
        callback(err, rows);
    });
}

function getDeliveredOrders(connection, callback) {
    var query = "SELECT COUNT(*) FROM ?? WHERE ?? = 0";
    var params = ['orders', 'pending'];
    query = mysql.format(query, params);
    connection.query(query, function(err, rows) {
        callback(err, rows);
    });
}

function getItemsToDeliver(connection, callback) {
    var query = "SELECT * FROM ?? WHERE ?? = 0000-00-00 limit 20";
    var params = ["ordered_items", "filldate"];
    query = mysql.format(query, params);
    connection.query(query, function(err, rows) {
        callback(err, rows);
    });
}

function orderedItemsFilldateById(connection, filldate, idString, callback) {
    var query = "UPDATE ?? SET ??=? WHERE id IN " + idString;
    var params = ["ordered_items", "filldate", filldate];
    query = mysql.format(query, params);
    console.log(query);
    connection.query(query, function(err, rows) {
        callback(err, rows);
    })
}

function ordersFilldate(connection, filldate, idString, callback) {
    var query = "UPDATE ?? SET ??=?, ??=? WHERE ?? IN (SELECT DISTINCT ?? FROM ?? WHERE ?? IN " + idString
                + ") AND ?? NOT IN (SELECT DISTINCT ?? FROM ?? WHERE ??=?)";
    var params = ["orders", "filldate", filldate, "pending", 0, 'id', "order_id", "ordered_items", "id", "id",
                    "order_id", "ordered_items", "filldate", '0000-00-00'];
    query = mysql.format(query, params);
    console.log(query);
    connection.query(query, function(err, rows) {
        callback(err, rows);
    })
}

function ordersFilldateByAddress(connection, filldate, address, callback) {
    var query = "UPDATE ?? SET ??=?, ??=? WHERE ??=?";
    var params = ["orders", "pending", 0, "filldate", filldate, "address", address];
    query = mysql.format(query, params);
    
    connection.query(query, function(err, rows) {
        callback(err, rows);
    })
}

function orderedItemsFilldateByAddress(connection, filldate, address, callback) {
    var query = "UPDATE ?? SET ??=? WHERE ??=?";
    var params = ["ordered_items", "filldate", filldate, "address", address];
    query = mysql.format(query, params);
    connection.query(query, function(err, rows) {
        callback(err, rows);
    })
}

module.exports.getAllRows = getAllRows;
module.exports.addOrder = addOrder;
module.exports.addOrderedItems = addOrderedItems;
module.exports.rowCount = rowCount;
module.exports.getPendingOrders = getPendingOrders;
module.exports.getDeliveredOrders = getDeliveredOrders;
module.exports.getItemsToDeliver = getItemsToDeliver;
module.exports.orderedItemsFilldateById = orderedItemsFilldateById;
module.exports.ordersFilldate = ordersFilldate;
module.exports.ordersFilldateByAddress = ordersFilldateByAddress;
module.exports.orderedItemsFilldateByAddress = orderedItemsFilldateByAddress;