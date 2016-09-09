//
// yet another http server
//

const DEFAULT_PORT = 8086;
var optimist = require('optimist');
var util = require('util');
var fs = require('fs');
var path = require('path');

// express won't work - can't load the module after 'npm install -g express'
//var express = require('express');

var reqres = function (req, res) {
  console.log("request headers:", req.headers);

  if (req.method == 'GET') {
    // resolve file path to filesystem path
    var fileUrl = req.url;
    if (fileUrl == '/') {
      fileUrl = '/index.html';
    }

    var filepath = path.resolve('./public' + fileUrl);

    // lookup mime type
    var fileExt = path.extname(filepath);
    var mimeType = mimeLookup[fileExt];
    if (!mimeType) {
      send404(res);
      return;
    }

    // see if we have that file
    fs.exists(filepath, function (exists) {
      if (!exists) {
        send404(res);
        return;
      }

      // finally stream the file
      res.writeHead(200, { 'content-type': mimeType });
      fs.createReadStream(filepath).pipe(res);
    });
  }
  else {
    send404(res);
  }
};

var send404 = function(response) {
  response.writeHead(404, { 'Content-Type': 'text/plain' });
  response.write('Error 404: Resource not found.');
  response.end();
};

var mimeLookup = {
  '.js': 'application/javascript',
  '.html': 'text/html'
};

var argv = require('optimist').argv;
if (argv.h || argv.help) {
  console.log("--help/-h: show help content");
  console.log("--https: run as secure server");
  console.log(util.format("--port: port to listen to (default %d)", DEFAULT_PORT));
  process.exit(0);
}

var server = null;
if (argv.https) {
  var options = {
    key: fs.readFileSync('./ssl/hserver.key'),
    cert: fs.readFileSync('./ssl/hserver.crt'),
    passphrase: '1234'
  };
  server = require('https').createServer(options, reqres);
}
else {
  server = require('http').createServer(reqres);
}

var port = DEFAULT_PORT;
if (argv.port) {
  port = parseInt(argv.port);
}

// servers
server.listen(port);
console.log(util.format('hserver is ready on port %d%s', port, argv.https ? " (https)" : ""));
