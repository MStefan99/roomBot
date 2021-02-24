// Shared library by MStefan99


/* Usage:
 *
 * const config = configurer('./your_config_file.json');
 *
 * You can change the file path using config.filePath = './other_file.json'.
 * Set the default options using config.defaults = {...};
 * If the property is not present in the object on save, its default value will be taken from the defaults.
 *
 * Use config.load() to load values from file. They will be stored inside the config object itself.
 * Use config.save() to save values to file.
 *
 * Use the config object just like any other object: you can read and write all others properties as usual.
 */

'use strict';

const path = require('path');
const fs = require('fs');


module.exports = function (filePath = './config.json') {
	let configReadable = null;
	let configWritable = null;
	let directoryWritable = null;

	let configObject = {};
	Object.defineProperty(configObject, 'defaults', {
		writable: true,
		value: {}
	});
	Object.defineProperty(configObject, 'filePath', {
		writable: true,
		value: filePath
	});
	Object.defineProperty(configObject, 'load', {
		value: load
	});
	Object.defineProperty(configObject, 'save', {
		value: save
	});


	function isReadable() {
		return new Promise(resolve => {
			if (configReadable === null) {
				fs.access(path.resolve(configObject.filePath),
					fs.constants.R_OK, err => {
					resolve(configReadable = !err);
				});
			} else {
				resolve(configReadable);
			}
		});
	}


	function isWritable() {
		return new Promise(resolve => {
			if (configWritable === null) {
				fs.access(path.resolve(configObject.filePath),
					fs.constants.W_OK, err => {
					resolve(configWritable = !err);
				});
			} else {
				resolve(configWritable);
			}
		});
	}


	function isDirectoryWritable() {
		return new Promise(resolve => {
			if (directoryWritable === null) {
				fs.access(path.dirname(path.resolve(configObject.filePath)),
					fs.constants.W_OK, err => {
					resolve(directoryWritable = !err);
				});
			} else {
				resolve(directoryWritable);
			}
		});
	}


	function load() {
		return new Promise((resolve, reject) => {
			isReadable().then(readable => {
				if (readable) {
					fs.readFile(path.resolve(configObject.filePath), 'utf8', (err, data) => {
						resolve(Object.assign(configObject, configObject.defaults, JSON.parse(data)));
					});
				} else {
					reject('Config not readable');
				}
			});
		});
	}


	function save() {
		return new Promise((resolve, reject) => {
			isWritable().then(writable => {
				if (writable) {
					fs.writeFile(path.resolve(configObject.filePath),
						JSON.stringify(configObject, null, '\t'), 'utf8', err => {
							if (err) {
								reject('Failed to write config');
							}
						});
				} else {
					isDirectoryWritable().then(writable => {
						if (writable) {
							fs.writeFile(path.resolve(configObject.filePath),
								JSON.stringify(configObject, null, '\t'), 'utf8', err => {
									if (err) {
										reject('Failed to create config');
									} else {
										resolve();
									}
								});
						} else {
							reject('Config directory not writable');
						}
					});
				}
			});
		});
	}

	return configObject;
};
