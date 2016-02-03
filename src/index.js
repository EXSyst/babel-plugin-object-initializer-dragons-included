var babelInternals = require('./babel-internals');

function patchBabylon(babylon) {
	babelInternals.getBabylonInternals(babylon);
	var pp = babylon.Parser.prototype;
	var tt = babylon.tokTypes;
	var rawParseNew = pp.parseNew;
	pp.parseNew = function () {
		var node = this.startNode();
		var baseNode = rawParseNew.call(this);
		if (this.match(tt.braceL)) {
			var objNode = this.parseObj(false);
			node.construction = baseNode;
			node.objectLiteral = objNode;
			return this.finishNode(node, "NewWithObjectExpression");
		} else {
			this.finishNode(node, "NewWithObjectExpression");
			return baseNode;
		}
	};
}
function patchBabelTypes(babelTypes) {
	babelTypes.VISITOR_KEYS.NewWithObjectExpression = [ 'construction', 'objectLiteral' ];
	babelTypes.BUILDER_KEYS.NewWithObjectExpression = [ 'construction', 'objectLiteral' ];
	babelTypes.NODE_FIELDS.NewWithObjectExpression  = {
		construction: { validate: babelTypes.NODE_FIELDS.NewExpression.callee.validate, default: null },
		objectLiteral: { validate: babelTypes.NODE_FIELDS.NewExpression.callee.validate, default: null }
	};
	babelTypes.ALIAS_KEYS.NewWithObjectExpression   = [ 'Expression' ];
	babelTypes.TYPES.push('NewWithObjectExpression');
}

babelInternals.patchBabylon(patchBabylon);
babelInternals.patchBabelTypes(patchBabelTypes);

var t = babelInternals.babelTypes;

function getObjectInitializeTemplate(id) {
	var template = babelInternals.babylon.parse(`function objectInitialize(n) {
		var a = Array.prototype.slice.call(arguments, 1);
		var o;
		while (a.length) {
			o = a.shift();
			if (o != null) {
				Object.getOwnPropertyNames(o).concat(Object.getOwnPropertySymbols(o)).forEach(function (k) {
					var d = Object.getOwnPropertyDescriptor(o, k);
					if (k in n && !d.get && !d.set) {
						n[k] = o[k];
					} else {
						Object.defineProperty(n, k, d);
					}
				});
			}
			o = a.shift();
			if (o != null) {
				Object.getOwnPropertyNames(o).concat(Object.getOwnPropertySymbols(o)).forEach(function (k) {
					Object.defineProperty(n, k, Object.getOwnPropertyDescriptor(o, k));
				});
			}
		}
		return n;
	}`).program.body[0];
	template.id = id;
	return template;
}

function isShadowing(property) {
	if (!property.decorators) {
		return false;
	}
	var index = property.decorators.findIndex(function (decorator) {
		return decorator.expression.type == 'Identifier' && decorator.expression.name == 'shadow';
	});
	if (index < 0) {
		return false;
	}
	property.decorators.splice(index, 1);
	if (!property.decorators.length) {
		delete property.decorators;
	}
	return true;
}

module.exports = function () {
	return {
		visitor: {
			Program: function (path, file) {
				var fn;
				path.traverse({
					NewWithObjectExpression: function (path, file) {
						if (!fn) {
							fn = path.scope.generateUidIdentifier('objectInitialize');
						}
						var ctorAlias = path.node.construction.callee;
						if (ctorAlias.type != 'Identifier') {
							ctorAlias = path.scope.generateDeclaredUidIdentifier("ctor");
							path.node.construction.callee = t.assignmentExpression('=', ctorAlias, path.node.construction.callee);
						}
						var args = [ path.node.construction ];
						var lastObjProps;
						var shadowing;
						path.node.objectLiteral.properties.forEach(function (property) {
							var shad = isShadowing(property);
							if (shad !== shadowing) {
								if (shad && shadowing == null) {
									args.push(t.nullLiteral());
								}
								shadowing = shad;
								lastObjProps = [ t.objectProperty(t.identifier('__proto__'), t.memberExpression(ctorAlias, t.identifier('prototype'))) ];
								args.push(t.objectExpression(lastObjProps));
							}
							lastObjProps.push(property);
						});
						path.replaceWith(t.callExpression(fn, args));
					}
				}, file);
				if (fn) {
					path.unshiftContainer('body', getObjectInitializeTemplate(fn));
				}
			}
		}
	};
};
