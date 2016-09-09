var app = module.exports = require("koa")();

app.use(function *() {
  this.body = "Koa says Hi!";
});

var port = (process.argv[2] || process.env.PORT || 3000);

if (!module.parent) {
  app.listen(port);
}
console.log('koa is running on port ', port);
