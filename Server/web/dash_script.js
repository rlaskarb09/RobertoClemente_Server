function time(number){
    document.getElementById('first').innerHTML = 'First battery  :  ' + number;
}

var orderChart = document.getElementById("orderChart").getContext("2d");

orderChart.canvas.width = "1000";
orderChart.canvas.height = "400";

var cw = orderChart.canvas.width;
var ch = orderChart.canvas.height;

const wstep = Math.round(cw/12);
const hstep = Math.round(ch/10);

//var w = [0,cw/12,2*(cw/12),3*(cw/12),4*(cw/12),5*(cw/12),6*(cw/12),7*(cw/12),8*(cw/12),9*(cw/12),10*(cw/12),11*(cw/12),12*(cw/12)];
//var h = [ch,ch-ch/10,ch-2*(ch/10),ch-3*(ch/10),ch-4*(ch/10),ch-5*(ch/10),ch-6*(ch/10),ch-7*(ch/10),ch-8*(ch/10),ch-9*(ch/10),ch-10*(ch/10)];

var w = [0, wstep, 2*wstep, 3*wstep, 4*wstep, 5*wstep, 6*wstep, 7*wstep, 8*wstep, 9*wstep, 10*wstep, 11*wstep, 12*wstep];
var h = [ch,ch-hstep,ch-2*hstep, ch-3*hstep, ch-4*hstep, ch-5*hstep, ch-6*hstep, ch-7*hstep, ch-8*hstep, ch-9*hstep, ch-10*hstep];

var mins = ['5','10','15','20','25','30','35','40','45','50','55'];
var values = [10,20,30,40,50,60,70,80,90,100];
var val = [];

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

var beforex = document.querySelector('#mins>span:before');

for(var i = 1;i<w.length;i++){
    beforex.style.marginLeft = w[i];
}

var timeChart = document.getElementById('timeChart').getContext("2d");

timeChart.canvas.width = "1000";
timeChart.canvas.height = "400";

var times = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50];
var time = [];

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
    document.getElementById('times').appendChild(value);
}

var ch = document.getElementById("timeChart");
timeChart.beginPath();    
for(var i =0;i<w.length;i++){
    timeChart.moveTo(0, ch);
    timeChart.strokeStyle = '#004429';
    timeChart.lineWidth = 2;
    timeChart.lineTo(w[i], h[Math.floor((Math.random() * 9) + 1)]);
    timeChart.stroke();
}
var beforex = document.querySelector('#times>span:before');

for(var i = 1;i<w.length;i++){
    beforex.style.marginLeft = w[i];
}