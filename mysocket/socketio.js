var http = require('http');
var net = require('net');
var path = require('path');
var fs = require('fs');

var port = 9088;

var server = http.createServer(function(req, res) {
  //console.log("\n==================== request received ====================\n", req);
  console.log("==================== request received: " + req.url + "\n");

  var filePath = "." + req.url;
  if (filePath == "./") {
    filePath = "./index.html";
  }

  var extname = path.extname(filePath);
  var contentType = "text/html";

  switch (extname) {
    case ".js":
      contentType = "text/javascript";
      break;
    case ".css":
      contentType = "text/css";
      break;
  }

  fs.stat(filePath, function(error, stat) {
    if (error == null) {
      fs.readFile(filePath, function(error, content) {
        if (error) {
          res.writeHead(500);
          res.end("500");
        } else {
          res.writeHead(200, {
            'Content-Type': contentType
          });
          res.end(content, "utf-8");
        }
      });
    } else {
      res.writeHead(404);
      res.end("404");
    }
  });
});

var ssrv = require("socket.io").listen(server);

server.listen(port);
console.log("server started on port " + port);

ssrv.sockets.on('connection', function(socket) {
  console.log("socket connecting...");

  //socket.volatile.emit('data', "hello");

  socket.on('disconnect', function() {
    console.log("socket disconnecting...");
    ssrv.close();
    server.close();
  });
});
