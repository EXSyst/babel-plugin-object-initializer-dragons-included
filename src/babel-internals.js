function findModules(filenamePart, exportNames) {
	var retval = [ ], searched = Object.create(null);
	function findIn(mod) {
		if (!mod || !mod.filename || (mod.filename in searched)) {
			return;
		}
		searched[mod.filename] = null;
		if (mod.filename.indexOf(filenamePart) >= 0 && exportNames.every(function (name) {
			return name in mod.exports;
		}) && retval.indexOf(mod) < 0) {
			retval.push(mod);
		}
		for (var i = 0; i < mod.children.length; ++i) {
			findIn(mod.children[i]);
		}
		return;
	}
	for (var mod = module; mod; mod = mod.parent) {
		findIn(mod);
	}
	return retval;
}
var path = require('path');
var babylonModules = findModules('babylon' + path.sep, [ 'parse', 'tokTypes' ]);
var babelTypesModules = findModules('babel-types' + path.sep, [ 'VISITOR_KEYS', 'BUILDER_KEYS', 'NODE_FIELDS', 'ALIAS_KEYS', 'TYPES' ]);

function getBabylonInternals(babylonExports) {
	if (!('Parser' in babylonExports)) {
		var Parser;
		Object.defineProperty(Object.prototype, 'options', {
			configurable: true,
			enumerable: false,
			get: function () { },
			set: function (value) {
				Parser = this.constructor;
				delete Object.prototype.options;
				throw new Error('Nailed it.');
			}
		});
		try {
			babylonExports.parse();
		} catch (e) {
			if (e.message != 'Nailed it.') {
				throw e;
			}
		}
		babylonExports.Parser = Parser;
	}
}
function makePatcher(modules) {
	return function patch(how) {
		modules.forEach(function (module) {
			how(module.exports, module);
		});
	};
}

exports.getBabylonInternals = getBabylonInternals;
exports.patchBabylon = makePatcher(babylonModules);
exports.patchBabelTypes = makePatcher(babelTypesModules);
exports.babylon = babylonModules.length ? babylonModules[0].exports : void 0;
exports.babelTypes = babelTypesModules.length ? babelTypesModules[0].exports : void 0;
