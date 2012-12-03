var net = require('net');
var redis = require('redis');
var memStore = redis.createClient();

// Opens a pipe to the UI server
var socket = net.createConnection(1407, '127.0.0.1');

socket.on('connect', function(connect) {
  console.log('connection established');
  

  socket.on('end', function() {
    console.log('socket closing...')
  })
})



// Opens up a port to listen for incoming TCP connections
listener = net.createServer(function(stream) {
  stream.setEncoding('ascii');

  stream.on('data', function(incomingData) {
    incomingData = incomingData.replace(/\n/g, '');
    // var tokens = incomingData.split('|');
    memStore.get(incomingData, function(err, response){
      if(!err){
        socket.write(incomingData);
      }
    })

  });
});
listener.listen(1409);


