$(document).ready(function() {
    Highcharts.setOptions({
        global: {
            useUTC: false
        }
    });

    chart = new Highcharts.Chart({
        chart: {
            renderTo: 'chart',
            type: 'spline',
            marginRight: 10
        },
        credits: {
          enabled: false
        },
        title: {
            text: 'Your data per second'
        },
        xAxis: {
            type: 'datetime',
            tickPixelInterval: 150
        },
        yAxis: {
            title: {
                text: 'Value'
            },
            plotLines: [{
                value: 0,
                width: 1,
                color: '#808080'
            }]
        },
        tooltip: {
            formatter: function() {
                    return '<b>'+ this.series.name +'</b><br/>'+
                    Highcharts.dateFormat('%Y-%m-%d %H:%M:%S', this.x) +'<br/>'+
                    Highcharts.numberFormat(this.y, 2);
            }
        },
        legend: {
            enabled: false
        },
        exporting: {
            enabled: false
        },
        series: [{
            name: 'Random data',
            data: []
        }]
    });

    // setInterval(function(){
    //   var shift = chart.series[0].data.length >= 20 ? true : false;
    //   chart.series[0].addPoint([(new Date()).getTime(), Math.random()])
    // }, 1000)
    socket.on('data-'+uuid, function(data){
      socket.emit('ack',true);
      console.log(data);
      var shift = chart.series[0].data.length >= 20 ? true : false;
      console.log(typeof data);
      chart.series[0].addPoint(data, true, shift);
    });
});