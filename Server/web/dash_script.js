function time(number){
    document.getElementById('first').innerHTML = 'First battery  :  ' + number;
}

var orderChart = document.getElementById("orderChart").getContext("2d");

orderChart.canvas.width = "1000";
orderChart.canvas.height = "400";

var cw = orderChart.canvas.width;
var ch = orderChart.canvas.height;

const wstep = Math.round(cw/12);

//var w = [0,cw/12,2*(cw/12),3*(cw/12),4*(cw/12),5*(cw/12),6*(cw/12),7*(cw/12),8*(cw/12),9*(cw/12),10*(cw/12),11*(cw/12),12*(cw/12)];

var w = [0, wstep, 2*wstep, 3*wstep, 4*wstep, 5*wstep, 6*wstep, 7*wstep, 8*wstep, 9*wstep, 10*wstep, 11*wstep, 12*wstep];
var h = [ch,ch-ch/10,ch-2*(ch/10),ch-3*(ch/10),ch-4*(ch/10),ch-5*(ch/10),ch-6*(ch/10),ch-7*(ch/10),ch-8*(ch/10),ch-9*(ch/10),ch-10*(ch/10)];

var weeks = ['5','10','15','20','25','30','35','40','45','50','55'];
var values = [10,20,30,40,50,60,70,80,90,100];
var val = [];

for(var i = 0;i<weeks.length;i++){
    var week = document.createElement('span');
    var text = document.createTextNode(weeks[i])
    week.appendChild(text);
    document.getElementById('weeks').appendChild(week);
}

for(var i = values.length-1;i>=0;i--){
    var value = document.createElement('span');
    var text_value = document.createTextNode(values[i])
    value.appendChild(text_value);
    document.getElementById('values').appendChild(value);
}

var ch = document.getElementById("orderChart");
orderChart.beginPath();

//actual graph      
for(var i =0;i<w.length;i++){
    orderChart.moveTo(0, ch);
    orderChart.strokeStyle = '#004429';
    orderChart.lineWidth = 2;
    orderChart.lineTo(w[i], h[Math.floor((Math.random() * 9) + 1)]);
    orderChart.stroke();
}

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

var beforex = document.querySelector('#weeks>span:before');

for(var i = 1;i<w.length;i++){
    beforex.style.marginLeft = w[i];
}