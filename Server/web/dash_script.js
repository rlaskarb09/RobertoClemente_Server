// <-------------------FOR BATTERY------------------->
function first_time(number){
    const rest_time = (30+number)%60 - number; 
    document.getElementById('first').innerHTML = 'First battery REST TIME : ' + rest_time;
}
function second_time(number){
    const rest_time = (30+number)%60 - number; 
    document.getElementById('second').innerHTML = 'Second battery REST TIME : ' + rest_time;
}
function third_time(number){
    const rest_time = (30+number)%60 - number; 
    document.getElementById('third').innerHTML = 'Third battery REST TIME : ' + rest_time;
}

// <-------------------FOR ORDER CHART------------------->
var orderChart = document.getElementById("orderChart").getContext("2d");

orderChart.canvas.width = "1000";
orderChart.canvas.height = "400";

var cw = orderChart.canvas.width;
var ch = orderChart.canvas.height;

const wstep = Math.round(cw/12);
const hstep = Math.round(ch/10);

var w = [0, wstep, 2*wstep, 3*wstep, 4*wstep, 5*wstep, 6*wstep, 7*wstep, 8*wstep, 9*wstep, 10*wstep, 11*wstep, 12*wstep];
var h = [ch,ch-hstep,ch-2*hstep, ch-3*hstep, ch-4*hstep, ch-5*hstep, ch-6*hstep, ch-7*hstep, ch-8*hstep, ch-9*hstep, ch-10*hstep];

var mins = ['5','10','15','20','25','30','35','40','45','50','55'];
var values = [10,20,30,40,50,60,70,80,90,100];

for(var i = 0;i<mins.length;i++){
    var min = document.createElement('span');
    var text = document.createTextNode(mins[i])
    min.appendChild(text);
    document.getElementById('mins').appendChild(min);
}

for(var i = values.length-1;i>=0;i--){
    var value = document.createElement('span');
    var text_value = document.createTextNode(values[i])
    value.appendChild(text_value);
    document.getElementById('values').appendChild(value);
}
var ch = document.getElementById("orderChart");
// draw pending orders
orderChart.beginPath();    
for(var i =0;i<w.length;i++){
    orderChart.moveTo(0, ch);
    orderChart.strokeStyle = '#004429';
    orderChart.lineWidth = 2;
    orderChart.lineTo(w[i], h[Math.floor((Math.random() * 9) + 1)]);
    orderChart.stroke();
}
// draw slope of pending orders
orderChart.beginPath();
for(var i =0;i<w.length;i++){
    orderChart.moveTo(0, ch);
    orderChart.strokeStyle = '#d59096';
    orderChart.lineWidth = 2;
    orderChart.lineTo(w[i], h[Math.floor((Math.random() * 9) + 1)]);
    orderChart.stroke();
}

//vertical lines
function gridV(){
	for(var i =1;i<w.length-1;i++){
		orderChart.strokeStyle = 'rgb(221, 222, 221)';
		orderChart.lineWidth = 1;
		orderChart.moveTo(w[i], 0);
		orderChart.lineTo(w[i], 400);
	  }
	      orderChart.stroke();
  	  }

//horizontal lines
function gridH(){
	for(var i =1;i<h.length-1;i++){
		orderChart.strokeStyle = 'rgb(221, 222, 221)';
		orderChart.lineWidth = 1;
		orderChart.moveTo(0,h[i]);
		orderChart.lineTo(3000,h[i]);
	  }
	      orderChart.stroke();
  	  }

  
gridV();
gridH();

//var beforex = document.querySelector('#mins>span:before');
//for(var i = 1;i<w.length;i++){
//    beforex.style.marginLeft = w[i];
//}

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
var items = ['5', '15', '25', '35', '45', '55', '65', '75', '85', '95'];
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

var tch = document.getElementById("timeChart");
// draw avg delivery time
timeChart.beginPath();
for(var i =0;i<tw.length;i++){
    timeChart.moveTo(0, tch);
    timeChart.strokeStyle = '#004429';
    timeChart.lineWidth = 2;
    timeChart.lineTo(tw[i], th[Math.floor((Math.random() * 9) + 1)]);
    timeChart.stroke();
}

//var tbeforex = document.querySelector('#times>span:before');
//for(var i = 1;i<tw.length;i++){
//    tbeforex.style.marginLeft = tw[i];
//}