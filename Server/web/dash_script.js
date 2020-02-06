// <-------------------FOR ORDER CHART------------------->
var slopeList = new Array();
var orderChart = document.getElementById("orderChart").getContext("2d");

orderChart.canvas.width = "1000";
orderChart.canvas.height = "400";

var cw = orderChart.canvas.width;
var ch = orderChart.canvas.height;

const wstep = Math.round(cw/12);
const rowstep = Math.round(cw/60);
const hstep = Math.round(ch/10);
const colstep = Math.round(ch/100);

var minW = [0, wstep, 2*wstep, 3*wstep, 4*wstep, 5*wstep, 6*wstep, 7*wstep, 8*wstep, 9*wstep, 10*wstep, 11*wstep, 12*wstep];
const range = (start, stop, step) => Array.from({ length: (stop - start) / step + 1}, (_, i) => start + (i * step));
var w = range(0,cw, rowstep);
var valueH = [ch,ch-hstep,ch-2*hstep, ch-3*hstep, ch-4*hstep, ch-5*hstep, ch-6*hstep, ch-7*hstep, ch-8*hstep, ch-9*hstep, ch-10*hstep];
var h = range(ch, 0, -colstep);
var mins = ['5','10','15','20','25','30','35','40','45','50','55'];
var values = [10,20,30,40,50,60,70,80,90,100];
var slopes = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

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
// make y axis for slope of pendingOrders
for(var i = slopes.length-1;i>=0;i--){
    var slope = document.createElement('span');
    var text_slope = document.createTextNode(slopes[i])
    slope.appendChild(text_slope);
    document.getElementById('slopeValues').appendChild(slope);
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

var tw = [0, twstep, 2*twstep, 3*twstep, 4*twstep, 5*twstep, 6*twstep, 7*twstep, 8*twstep, 9*twstep, 10*twstep];
var th = [ch, ch-thstep, ch-2*thstep, ch-3*thstep, ch-4*thstep, ch-5*thstep, ch-6*thstep, ch-7*thstep, ch-8*thstep, ch-9*thstep, ch-10*thstep];

// x axis // y axis
var items = ['5', '15', '25', '35', '45', '55', '65', '75', '85', '95', '105'];
var times = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20];

for(var i = 0;i<items.length;i++){
    var item = document.createElement('span');
    var text_item = document.createTextNode(items[i])
    item.appendChild(text_item);
    document.getElementById('items').appendChild(item);
}

for(var i = times.length-1;i>=0;i--){
    var time = document.createElement('span');
    var text_time = document.createTextNode(times[i])
    time.appendChild(text_time);
    document.getElementById('times').appendChild(time);
}

var timech = document.getElementById("timeChart");
// draw avg delivery time

timeChart.beginPath();
for(var i =0;i<tw.length;i++){
    timeChart.moveTo(0, timech);
    timeChart.strokeStyle = '#004429';
    timeChart.lineWidth = 2;
    timeChart.lineTo(tw[i], th[Math.floor((Math.random() * 9) + 1)]);
    timeChart.stroke();
}