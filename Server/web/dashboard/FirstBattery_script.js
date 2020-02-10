// get first bettery start time
var getString = document.getElementById('firstB').innerText;
var getTime = getString.split(":");
var startHour = getTime[0];
var startMin = getTime[1];

// Display first battery remaining time
$(document).ready(function(){
    setInterval(function(){
        var dt = new Date();
        var dh = dt.getHours();
        var dm = dt.getMinutes();
        final_time = parseInt(startHour)*60 + parseInt(startMin) + 40;
        current_time = dh*60 + dm;
        remain_time = final_time - current_time;
        // console.log(remain_time);
        if (remain_time <= 40){
            $('#firstB_time').text('First battery REMAIN time : ' + remain_time + ' mins');
        } else{
            $('#firstB_time').text('First Battery DONE!');
        }
    },1);
});

// get running time 
$(document).ready(function (){
    setInterval(function(){
        var dt = new Date();
        var dh = dt.getHours();
        var dm = dt.getMinutes();
        if (dh == startHour){
            running_time = dm - startMin;
        } else{
            running_time = 60 - startMin + dm;
        }
        $('#time').text('Running Time : ' + running_time + ' mins');
    }, 1);
});

// <-------------------FOR ORDER CHART------------------->
// get pending list
var getList = document.getElementById('pendingList').innerText;
var pendingOrderList = getList.split(',').map(Number);
console.log(pendingOrderList);

var highBacklog = 0
for (var i=0; i<pendingOrderList.length;i++){
    if (highBacklog < pendingOrderList[i]){
        highBacklog = pendingOrderList[i];
    }else{
        highBacklog = highBacklog;
    }
};
$('#highBacklog').text('Highest Backlog : ' + highBacklog);

// $(document).ready(function(){
//     var backloglist = pendingOrderList;
//     setInterval(function(){
//         var highBacklog = 0
//         for(var i=0;i<backloglist.length;i++){
//             if (highBacklog < backloglist[i]){
//                 highBacklog = backloglist[i];
//             } else{
//                 highBacklog = highBacklog;
//             }
//         }
//         $('#highBacklog').text('Highest Backlog : ' + highBacklog);
//     },1);
// });

// calculate highest backlog

// get delivered list
var getList = document.getElementById('deliveredList').innerText;
var deliveredList = getList.split(',');

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
var valueH = [ch, ch-hstep,ch-2*hstep, ch-3*hstep, ch-4*hstep, ch-5*hstep, ch-6*hstep, ch-7*hstep, ch-8*hstep, ch-9*hstep, ch-10*hstep];
var h = range(ch, 0, -colstep);

var mins = ['10','20','30','40','50','60','70', '80', '90','Min(m)'];
var values = [15, 30, 45, 60, 75, 90,105,120,135,'Items'];

// make x axis for minutes
for(var i = 0;i<mins.length;i++){
    var min = document.createElement('span');
    var text = document.createTextNode(mins[i]);
    min.appendChild(text);
    document.getElementById('mins').appendChild(min);
}
// make y axis for pendingOrders and deliveredOrders
for(var i = values.length-1;i>=0;i--){
    var value = document.createElement('span');
    var text_value = document.createTextNode(values[i]);
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
var getList = document.getElementById('avgDeliverytimeList').innerText;
var avgDeliveryTList = getList.split(',');
console.log(avgDeliveryTList);
avgDeliveryTList = avgDeliveryTList.map(function(each_element){
    return Number(Math.round(each_element/60));
});
console.log(avgDeliveryTList);

var getList = document.getElementById('downtimeList').innerText;
var downtimeList = getList.split(',');
console.log(downtimeList);
downtimeList = downtimeList.map(function(each_element){
    return Number(Math.round(each_element));
})

var timeChart = document.getElementById('timeChart').getContext("2d");

timeChart.canvas.width = "1000";
timeChart.canvas.height = "400";

var tcw = timeChart.canvas.width;
var tch = timeChart.canvas.height;

const twstep = Math.round(tcw/10);
const trowstep = Math.round(tcw/100);

const thstep = Math.round(tch/10);
const tcolstep = (tch/30).toFixed(2);
const tcolstep2 = (tch/300).toFixed(2);

var orderW = [0, twstep, 2*twstep, 3*twstep, 4*twstep, 5*twstep, 6*twstep, 7*twstep, 8*twstep, 9*twstep, 10*twstep];
var tw = range(0, tcw, trowstep);

var timeH = [ch, ch-thstep, ch-2*thstep, ch-3*thstep, ch-4*thstep, ch-5*thstep, ch-6*thstep, ch-7*thstep, ch-8*thstep, ch-9*thstep, ch-10*thstep];
var th = range(tch, 0, -tcolstep);
var th2 = range(tch, 0, -tcolstep2);
// console.log(th);

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
        timeChart.lineTo(3000, timeH[i]);
    }
    timeChart.stroke();
}
gridHT();
gridVT();

// <-------------------Draw Graph for Order Chart------------------->
var ch = document.getElementById("orderChart");
// draw pending orders
orderChart.beginPath();    
for(var i =0;i<w.length-1;i++){
    orderChart.moveTo(0, ch);
    orderChart.strokeStyle = '#004429';
    orderChart.lineWidth = 3;
    orderChart.lineTo(w[i], h[pendingOrderList[i]]);
    orderChart.stroke();
}
// draw complete orders
orderChart.beginPath();
for(var i =0;i<w.length-1;i++){
    orderChart.moveTo(0, ch);
    orderChart.strokeStyle = '#FF1800';
    orderChart.lineWidth = 3;
    orderChart.lineTo(w[i], h[deliveredList[i]]);
    orderChart.stroke();
}

// <-------------------Draw Graph for Time Chart------------------->
var timech = document.getElementById("timeChart");
timeChart.beginPath();
for(var i =0;i<w.length;i++){
    timeChart.moveTo(0, timech);
    timeChart.strokeStyle = '#004429';
    timeChart.lineWidth = 3;
    timeChart.lineTo(w[i], th[avgDeliveryTList[i]]);
    timeChart.stroke();
}

timeChart.beginPath();
for(var i =0;i<w.length;i++){
    timeChart.moveTo(0, timech);
    timeChart.strokeStyle = '#FF1800';
    timeChart.lineWidth = 3;
    timeChart.lineTo(w[i], th2[downtimeList[i]]);
    timeChart.stroke();
}