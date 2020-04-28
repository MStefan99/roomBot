const path = require('path');
const fs = require ('fs');


function log(data, level = 'verbose') {
	if (!fs.existsSync(path.resolve(__dirname, 'log/'))) {
		fs.mkdirSync(path.resolve(__dirname, 'log/'));
	}
	
	console.log(data);
	const file = fs.openSync(path.resolve(__dirname, 'log/log.txt'), 'a');
	fs.appendFileSync(file, `${Date()} -> ${level.toUpperCase()}: ${data}\n`);
	fs.closeSync(file);
}

module.exports = log;
