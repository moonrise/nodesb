function Logger() {
	function say() { console.log("hi"); };

	// should not return anything if used as a constructor function
	// return {
		// say: say
	// }
}
Logger.prototype.log = function(message) {
	console.log.apply(console, arguments);
};

//console.log (__dirname, __filename)
console.log ("exporting logger");
module.exports = Logger;
