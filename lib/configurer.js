'use strict';

const path = require('path');
const fs = require('fs').promises;

class Config {
	_filePath;
	_defaults;
	_promise = Promise.resolve();

	constructor(filePath = path.join(__dirname, 'config.json'), defaults = {}) {
		this._filePath = filePath;
		this.defaults = defaults;
	}

	set defaults(d) {
		this._defaults = structuredClone(Object.assign({}, d));
		for (const prop in this._defaults) {
			if (!this[prop]) {
				this[prop] = this._defaults[prop];
			}
		}
	}

	get defaults() {
		return structuredClone(this._defaults);
	}

	async _load() {
		try {
			const data = await fs.readFile(path.resolve(this._filePath), 'utf8');
			return Object.assign(this, JSON.parse(data));
		} catch (e) {
			if (e.errno === -2) {
				await this._save();
			}
			return this;
		}
	}

	async _save() {
		const result = Object.assign({}, this, this.defaults, this);
		delete (result._filePath);
		delete (result._promise);

		await this._promise;
		this._promise = fs.writeFile(path.resolve(this._filePath), JSON.stringify(result, null, '\t'), 'utf8');
		await this._promise;
	}
}


module.exports = Config;
