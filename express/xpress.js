//
// Use:
// curl http://localhost:8085/hello
// curl http://localhost:8085/json -H "content-type:application/json" -d "{\"foo\":12}"
// curl http://localhost:8085/form --data-urlencode "foo=123"
// curl http://127.0.0.1:8085/user/1/prod/2 ==> can be seen as normal url or as url params
//

const DEFAULT_PORT = 8085;

var util = require('util');
var express = require('express');
var serveIndex = require('serve-index');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var cookieSession = require('cookie-session');
var compression = require('compression');
var bytes = require('bytes');
var timeout = require('connect-timeout');

main();

function main() {
    buildDispatcher(express()).listen(DEFAULT_PORT);
    console.log('Express listening on port %d...', DEFAULT_PORT);
}

function buildDispatcher(app) {
    var publicPlace = __dirname + "/public";

    app.use(cookieParser());
    app.use(cookieSession( { keys: [ 'session-secret'], name: 'usersession' } ));
    app.use(compression( { threshold: bytes('1kb') } ));
    // app.use(compression( { threshold: 10 } ));

    // simpleton
    app.use("/hello", setCookieBar);
    app.use("/hello", sayHello);
    app.use("/hello", end);

    // JSON body parser
    app.use("/json", sayHello);
    app.use("/json", bodyParser.json());
    app.use("/json", handleBodyParserError);
    app.use("/json", processFoo);
    app.use("/json", end);

    // Form body parser
    app.use("/form", sayHello);
    app.use("/form", bodyParser.urlencoded({extended: true}));
    app.use("/form", handleBodyParserError);
    app.use("/form", processFoo);
    app.use("/form", end);

    app.use("/login", login);
    app.use("/login", end);

    app.use("/member", serveMember);
    app.use("/member", end);

    app.use("/logout", logout);
    app.use("/logout", end);

    app.use("/timeout", timeout(3000), doNothing);
    app.use("/timeout", handleTimeoutError);

    // cookie foo
    app.use(setCookieFoo);

    app.route("/verb/")
        .all(serveVerb("all"))
        .get(serveVerb("get"))
        .post(serveVerb("post"))
        .put(serveVerb("put"))
        .delete(serveVerb("delete"));

    app.get("/verb/*", function(req, res, next) {
        var message = util.format("%s: verb prefix received", req.originalUrl);
        console.log(message);
        req.res.write(message + "\n");
        next();
    });

    app.get(/^\/re\/[0-9]+$/, function(req, res, next) {
        var message = util.format("%s: RE url received", req.originalUrl);
        console.log(message);
        req.res.write(message + "\n");
        next();
    });

    app.get('/user/1/prod/2', function (req, res, next) {
        var message = util.format("%s: url param override received", req.originalUrl);
        console.log(message);
        req.res.write(message + "\n");
        next();
    });

    app.param('pid', function(req, res, next, pid) {
        req.newpid = { "pid": pid + 100 }
        var message = util.format("%s: pid param intercepted (%s -> %j)", req.originalUrl, pid, req.newpid);
        console.log(message);
        req.res.write(message + "\n");
        next();

    });

    app.get('/user/:uid/prod/:pid', function (req, res, next) {
        var message = util.format("%s: url param received (%s, %j -> %j)", req.originalUrl, req.params['uid'], req.params['pid'], req.newpid);
        console.log(message);
        req.res.write(message + "\n");
        next();
    });

    // serveIndex modifies the header as: “Allow: GET, HEAD, OPTIONS” (subsequently POST/PUT/DELETE --> 405)
    // this thing also does not cooperate well with others in terms of header close (premature)
    // app.use("/", serveIndex(publicPlace));  // disable express.static to see the effect or reverse the order

    // static and/or directory service
    // app.use(expressStatic(publicPlace, {'index': ['index_.html', 'default_.html']}));
    app.use("/", express.static(publicPlace, {'index': ['index.html', 'default.html']}));

    // we do not reach here because of the static/index server prior?
    app.use(end);

    return app;
}

function serveVerb(verb) {
    return function (req, res, next) {
        var message = util.format("%s: verb '%s' is served", req.originalUrl, verb);
        console.log(message);
        req.res.write(message + "\n");
        next();
    }
}

function doNothing(req, res, next) {
    // do nothing to simulate timeout
}

function login(req, res, next) {
    if (req.session && req.session.userid) {
        var message = util.format("%s: member '%s' already signed in", req.originalUrl, req.session.userid);
        res.write(message);
        console.log(message);
    }
    else {
        req.session.userid = "admin";
        req.session.views = 0;
        var message = util.format("%s: logging in member '%s'", req.originalUrl, req.session.userid);
        res.write(message);
        console.log(message);
    }

    next();
}

function serveMember(req, res, next) {
    if (req.session && req.session.userid) {
        req.session.views++;
        var message = util.format("%s: doing member stuff for %s: %d", req.originalUrl, req.session.userid, req.session.views);
        res.write(message);
        console.log(message);
    }
    else {
        var message = util.format("%s: not authorized", req.originalUrl);
        res.status(401).write(message);
        console.log(message);
    }

    next();
}

function logout(req, res, next) {
    var message = null;
    if (req.session && req.session.userid) {
        message = util.format("%s: ending the session for '%s'", req.originalUrl, req.session.userid);
        req.session = null;
    }
    else {
        message = util.format("%s: no session to logout", req.originalUrl);
    }
    res.write(message);
    console.log(message);

    next();
}

function setCookieFoo(req, res, next) {
    var cookieName = "foo";
    if (!checkCookie(req, cookieName)) {
        setCookie(req, res, "foo", "123", false);
    }
    next();
}

function setCookieBar(req, res, next) {
    var cookieName = "bar";
    if (!checkCookie(req, cookieName)) {
        setCookie(req, res, "bar", "abc", true);
    }
    next();
}

function checkCookie(req, cookieName) {
    if (req.cookies && req.cookies[cookieName]) {
        var message = util.format("%s: received cookie %s:%s", req.originalUrl, cookieName, req.cookies[cookieName]);
        console.log(message);
        return true;
    }
    return false;
}

function setCookie(req, res, cookieName, cookieValue, session) {
    var opts = { path: req.originalUrl };
    if (!session) {
        opts.maxAge = 1000000;
    }
    if (true) {
        opts.httpOnly = true;
        // opts.secure = true;
    }
    res.cookie(cookieName, cookieValue, opts);
    var message = util.format("%s: setting cookie %s:%s", req.originalUrl, cookieName, cookieValue);
    console.log(message);
}

function sayHello(req, res, next) {
    var message = util.format("%s: Greetings from Express!", req.originalUrl);
    console.log(message);
    res.write(message + "\n");
    next();
}

function end(req, res, next) {
    if (res.headersSent) {
        console.log(util.format("%s: ending response (headers sent)", req.originalUrl));
    }
    else {
        console.log(util.format("%s: ending response: (headers were not sent?)", req.originalUrl));
        res.write("");
    }
    res.end();
}

function processFoo(req, res, next) {
    var message = null;
    if (req.body && req.body.foo) {
        message = util.format("%s: foo received: %s", req.originalUrl, req.body.foo);
    }
    else {
        message = util.format("%s: foo not received", req.originalUrl);
    }

    console.log(message);
    res.write(message+"\n");

    next();
}

function handleBodyParserError(err, req, res, next) {
    var message = util.format("%s: body-parser error --> %s\n%j", req.originalUrl, err, err);
    console.log(message);
    res.end(message + "\n");
}

function handleTimeoutError(err, req, res, next) {
    if (req.timedout) {
        var message = util.format("%s: timed out --> %s\n%j", req.originalUrl, err, err);
        console.log(message);
        res.status(500).end(message + "\n");
    }
}
