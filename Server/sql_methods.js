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

module.exports.getAllRows = getAllRows;
module.exports.addOrder = addOrder;
module.exports.addOrderedItems = addOrderedItems;
module.exports.rowCount = rowCount;