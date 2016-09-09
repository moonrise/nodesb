var os = require('os');

var interfaces = os.networkInterfaces();
for (item in interfaces) {
  console.log('========= network interface: ' + item);

  for (attr in interfaces[item]) {
    console.log("------", interfaces[item][attr]);
  }
}
