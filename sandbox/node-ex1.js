function greet() { return "hi node"; }
function sq(v) { return v * v; }
var b = function() { return "good-bye"; }

exports.g = greet;
exports.sq = sq;
exports.bye = b;
exports.b2 = function() { return "i'm b2"; }
exports.n = 123;
