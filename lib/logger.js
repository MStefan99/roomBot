'use strict';

const fs = require('fs');
const path = require('path');


module.exports = function (...logDirPath) {
	function makeLine(dataArr) {
		let line = new Date().toLocaleString('en-GB') + ': ';
		for (const object of dataArr) {
			line += object.toString() + ' ';
		}
		return line + '\n';
	}

	function log(tag, line) {
		const filePath = path.join(...logDirPath, tag.toLowerCase() + '.txt');
		fs.open(filePath, 'a', (err, fd) => {
			if (err) {
				throw new Error('Unable to open file ' + filePath.toString());
			} else {
				fs.appendFile(fd, line, err => {
					if (err) {
						throw new Error('Unable to append file ' + filePath.toString());
					}
					fs.close(fd, err => {});
				});
			}
		});
	}

	return {
		debug: (...data) => {
			log('debug', makeLine(data));
		},
		info: (...data) => {
			log('info', makeLine(data));
		},
		log: (...data) => {
			log('log', makeLine(data));
		},
		warn: (...data) => {
			log('warn', makeLine(data));
		},
		error: (...data) => {
			log('error', makeLine(data));
		},
		print: (tag, ...data) => {
			log(tag, makeLine(data));
		}
	};
};
