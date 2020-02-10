var getList = document.getElementById('pendingList').innerText;
var pendingOrderList = getList.split(',');

$(document).ready(function(){
    var backloglist = parseInt(pendingOrderList);
    setInterval(function(){
        var highBacklog = Math.max(backloglist);
        $('#highBacklog').text('Highest Backlog : ' + highBacklog);
    },1);
});

// <-------------------FOR ORDER CHART------------------->
var orderChart = document.getElementById("orderChart").getContext("2d");

orderChart.canvas.width = "1000";
orderChart.canvas.height = "400";

var cw = orderChart.canvas.width;
var ch = orderChart.canvas.height;

const wstep = Math.round(cw/10);
const rowstep = Math.round(cw/100);
const hstep = Math.round(ch/10);
const colstep = (ch/150).toFixed(2);

var minW = [0, wstep, 2*wstep, 3*wstep, 4*wstep, 5*wstep, 6*wstep, 7*wstep, 8*wstep, 9*wstep, 10*wstep];
const range = (start, stop, step) => Array.from({ length: (stop - start) / step + 1}, (_, i) => start + (i * step));
var w = range(0,cw, rowstep);
var valueH = [ch,ch-hstep,ch-2*hstep, ch-3*hstep, ch-4*hstep, ch-5*hstep, ch-6*hstep, ch-7*hstep, ch-8*hstep, ch-9*hstep, ch-10*hstep];
var h = range(ch, 0, -colstep);

var mins = ['10','20','30','40','50','60','70', '80', '90','Min(m)'];
var values = [15, 30, 45, 60, 75, 90,105,120,135,'Items'];

// make x axis for minutes
for(var i = 0;i<mins.length;i++){
    var min = document.createElement('span');
    var text = document.createTextNode(mins[i])
    min.appendChild(text);
    document.getElementById('mins').appendChild(min);
}
// make y axis for pendingOrders
for(var i = values.length-1;i>=0;i--){
    var value = document.createElement('span');
    var text_value = document.createTextNode(values[i])
    value.appendChild(text_value);
    document.getElementById('pendingValues').appendChild(value);
}

// vertical lines
function gridV(){
	for(var i =1;i<minW.length-1;i++){
		orderChart.strokeStyle = 'rgb(221, 222, 221)';
		orderChart.lineWidth = 1;
		orderChart.moveTo(minW[i], 0);
		orderChart.lineTo(minW[i], 400);
	  }
	      orderChart.stroke();
  	  }

// horizontal lines
function gridH(){
	for(var i =1;i<valueH.length-1;i++){
		orderChart.strokeStyle = 'rgb(221, 222, 221)';
		orderChart.lineWidth = 1;
		orderChart.moveTo(0,valueH[i]);
		orderChart.lineTo(3000,valueH[i]);
	}
    orderChart.stroke();
}

gridV();
gridH();

// <-------------------FOR TIME CHART------------------->
var timeChart = document.getElementById('timeChart').getContext("2d");

timeChart.canvas.width = "1000";
timeChart.canvas.height = "400";

var tcw = timeChart.canvas.width;
var tch = timeChart.canvas.height;

const twstep = Math.round(tcw/10);
const thstep = Math.round(tch/10);

var orderW = [0, twstep, 2*twstep, 3*twstep, 4*twstep, 5*twstep, 6*twstep, 7*twstep, 8*twstep, 9*twstep, 10*twstep, 11*twstep, 12*twstep];
var timeH = [ch, ch-thstep, ch-2*thstep, ch-3*thstep, ch-4*thstep, ch-5*thstep, ch-6*thstep, ch-7*thstep, ch-8*thstep, ch-9*thstep, ch-10*thstep];

// x axis // y axis
var minutes = ['10','20','30','40','50','60','70', '80', '90','Min(m)'];
var downs = [30, 60, 90, 120, 150, 180, 210, 240, 270, 'Sec(s)'];
var times = [3, 6, 9, 12, 15, 18, 21, 24, 27, 'Min(m)'];

for(var i = 0;i<minutes.length;i++){
    var minute = document.createElement('span');
    var text_minute = document.createTextNode(minutes[i])
    minute.appendChild(text_minute);
    document.getElementById('minutes').appendChild(minute);
}

for(var i = times.length-1;i>=0;i--){
    var time = document.createElement('span');
    var text_time = document.createTextNode(times[i])
    time.appendChild(text_time);
    document.getElementById('times').appendChild(time);
}

for(var i=downs.length-1;i>=0;i--){
    var down = document.createElement('span');
    var text_down = document.createTextNode(downs[i]);
    down.appendChild(text_down);
    document.getElementById('downs').appendChild(down);
}

function gridVT(){
    for(var i=1;i<orderW.length-1;i++){
        timeChart.strokeStyle = "rgb(221, 222, 221)";
        timeChart.lineWidth = 1;
        timeChart.moveTo(orderW[i],0);
        timeChart.lineTo(orderW[i], 400);
    }
    timeChart.stroke();
}

function gridHT(){
    for(var i=1;i<timeH.length-1;i++){
        timeChart.strokeStyle = "rgb(221, 222, 221)";
        timeChart.lineWidth = 1;
        timeChart.moveTo(0, timeH[i]);
        timeChart.lineTo(4000, timeH[i]);
    }
    timeChart.stroke();
}

gridVT();
gridHT();

// var timech = document.getElementById("timeChart");
// // draw avg delivery time
// timeChart.beginPath();
// for(var i =0;i<orderW.length;i++){
//     timeChart.moveTo(0, timech);
//     timeChart.strokeStyle = '#004429';
//     timeChart.lineWidth = 2;
//     timeChart.lineTo(orderW[i], timeH[Math.floor((Math.random() * 9) + 1)]);
//     timeChart.stroke();
// }