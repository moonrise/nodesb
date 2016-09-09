var app = require("../koa.js");
var request = require("supertest").agent(app.listen());

describe("Our amazing site", function() {
  it("has a nice welcoming message", function(done) {
    request
      .get("/")
      .expect("Koa says Hi!")
      .end(done);
  });
});
