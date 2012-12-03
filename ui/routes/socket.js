/*
 * Serve content over a socket
 */

module.exports = function (socket) {
  socket.emit('news', {
    name: 'Bob'
  });

  setInterval(function () {
    socket.emit('news', {
      time: (new Date()).toString()
    });
  }, 1000);
};
