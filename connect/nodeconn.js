//
// yet another http server
//
// try
// curl http://localhost:8085 -H "content-type: application/json" -d "{\"foo\":123}" -u foo:bar
//
// for https
// curl http://localhost:8085 -H "content-type: application/json" -d "{\"foo\":123}" -u foo:bar -k
//
'use strict';

var util = require('util');
var connect = require('connect');

const DEFAULT_PORT = 8085;

main();

function main() {
    var program = require('commander');

    program
        .version('0.0.1')
        .option('-s, --https', 'use https')
        .option('-f, --forcehttps', 'force https by redirect (http_port+1)')
        .option('-p, --port <port>', util.format('connection port (default: %s)', DEFAULT_PORT))
        .parse(process.argv);

    startServer(program.port || DEFAULT_PORT, program.https || false, program.forcehttps || false);
}

function startServer(port, isHttps, isForceHttps) {
    var app = getConnectDispatcher();
    //var app = getConnectDispatcher2();

    function startHttps(port) {
        var fs = require('fs');
        var options = {
            key: fs.readFileSync('./ssl/hserver.key'),
            cert: fs.readFileSync('./ssl/hserver.crt'),
            passphrase: '1234'
        };

        var https = require('https');
        https.createServer(options, app).listen(port);
        console.log('connect listening on port %d (https)...', port);
    }

    if (isHttps) {
        startHttps(port);
    }
    else if (isForceHttps) {
        var httpsPort = port + 1;

        // http port
        var http = require('http');
        http.createServer(function (req, res) {
            console.log('redirecting (301) to https at port %d...', httpsPort);
            var httpsHost = req.headers['host'].replace(""+port, ""+httpsPort);
            var redirectUrl = util.format("https://%s%s", httpsHost, req.url);
            res.writeHead(301, { "Location": redirectUrl });
            res.end();
        }).listen(port);
        console.log('connect listening on port %d...', port);

        // listen on https port as well
        startHttps(httpsPort);
    }
    else {
        app.listen(port);
        console.log('connect listening on port %d...', port);
    }
}

//
// [TODO]: Figure out how to close current write stream when error occurs. If the write stream is open, the error
// processing doe snot work with the open stream open; Client browser is not happy with stream (chunked-encoding)
// not terminating.
//
function getConnectDispatcher() {
    return connect()
        .use(logger)
        .use(auth)
        .use('/echo', echo)
        .use(factory("fiat"))
        .use(factory("smart for two"))
        .use(parseJSON)
        .use(showFoo)
        //.use(raiseError)
        //.use(handleError)
        .use(getLastMiddleware());
}

function getConnectDispatcher2() {
    return connect()
        .use(raiseError)
        .use(handleError);
}

function raiseError(req, res, next) {
    //res.clear();
    //next("nexting string error");
    throw new Error("throwing error")
    // next(new Error("nexting new error")); res.end();
    //res.writeHeader(500, "no good"); // not here, but in the error handler!
}

function handleError(err, req, res, next) {
    console.error("Error Log: ", err);
    res.writeHead(500);
    res.end("Error occurred!");
    // res.write("Error: 500; Can't do it.\n"); next();
}

function logger(req, res, next) {
    console.log("\nlogger: ", req.url);
    next();
}

function echo(req, res, next) {
    console.log("echo: ", req.url);
    req.pipe(res);
    // next(); // can't have next()!!
}

function factory(message) {
    return function (req, res, next) {
        console.log("factory: ", message);
        res.write(message + "\n");
        next();
    }
}

function parseJSON(req, res, next) {
    console.log("parseJSON: ", req.body);
    if (req.headers['content-type'] == 'application/json') {

        // Load all the data
        var readData = '';
        req.on('readable', function () {
            readData += req.read();
        });

        // Try to parse
        req.on('end', function () {
            try {
                req.body = JSON.parse(readData);
            }
            catch (e) {
            }
            next();
        })
    }
    else {
        next();
    }
}

function showFoo(req, res, next) {
    if (req.body) {
        res.write('JSON parsed!, value of foo: ' + req.body.foo);
    }
    else {
        res.write('no JSON detected!');
    }
    res.write('\n');
    next();
}

function auth(req, res, next) {
    function send401() {
        res.writeHead(401, {'WWW-Authenticate': 'Basic'});
        res.end();
    }

    var authHeader = req.headers.authorization;
    if (!authHeader) {
        send401();
        return;
    }

    var auth = new Buffer(authHeader.split(' ')[1], 'base64').toString().split(':');
    var user = auth[0];
    var pass = auth[1];
    if (user == 'foo' && pass == 'bar') {
        next(); // all good
    }
    else {
        send401();
    }
}

function getLastMiddleware() {
    return {
        handle: function (req, res, next) {
            console.log("last: %s", req.url);
            res.end("bye\n");
            //next();
        }
    }
}
