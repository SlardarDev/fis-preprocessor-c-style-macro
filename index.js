'use strict';

// var fis = require('fis'); // to make test work, add this line
var esprima = require('esprima');
var escodegen = require('escodegen');
var util = require('util');
var uuid = require('uuid');

var traversal = function (node, func) {
    func(node);
    for (var key in node) {
        if (!node.hasOwnProperty(key) || key === '__parent') {
            continue;
        }
        var child = node[key];
        if (typeof child !== 'object' || child === null) {
            continue;
        }
        if (Array.isArray(child)) {
            for (var index = 0; index < child.length; index++) {
                traversal(child[index], func);
                child[index].__parent = node;
            }
        } else {
            traversal(child, func);
            child.__parent = node;
        }
    }
};

var clone = function (obj) {
   return JSON.parse(JSON.stringify(obj));
};

var twoDigits = function (num) {
    if (num < 10) {
        return '0' + num;
    }
    return num.toString();
};

var validateHandler = {
    '__LINE__': function (args) {
        if (args.length !== 1) {
            var message = '__LINE__ extension must only have 1 arguments';
            fis.log.error(message);
            throw message;
        }
    },
    '__FILE__': function (args) {
        if (args.length !== 1) {
            var message = '__FILE__ extension must only have 1 arguments';
            fis.log.error(message);
            throw message;
        }
    },
    '__TIME__': function (args) {
        if (args.length !== 1) {
            var message = '__TIME__ extension must only have 1 arguments';
            fis.log.error(message);
            throw message;
        }
    },
    '__DATE__': function (args) {
        if (args.length !== 1) {
            var message = '__DATE__ extension must only have 1 arguments';
            fis.log.error(message);
            throw message;
        }
    },
    '__DEBUG__': function (args) {
        if (args.length !== 2 || args[1].type !== 'FunctionExpression') {
            var message = '__DEBUG__ extension must have 2 arguments, the second one is a function expression';
            fis.log.error(message);
            throw message;
        }
    },
    '__METHOD__': function (args) {
        if (args.length !== 1) {
            var message = '__METHOD__ extension must only have 1 arguments';
            fis.log.error(message);
            throw message;
        }
    }
};

var methodMacroArr = [];

var extensionHandler = {
    // line no in the file
    '__LINE__': function (opt) {
        var node = opt.node;
        node.type = 'Literal';
        node.value = node.loc.start.line;
        node.arguments = null;
    },
    // file name
    '__FILE__': function (opt) {
        var node = opt.node;
        node.type = 'Literal';
        node.value = opt.file.id;
    },
    // when is debug, the function will be removed in the output
    '__DEBUG__': function (opt) {
        var node = opt.node;
        if (fis.cli.commander && fis.cli.commander.optimize) {
            node.type = 'EmptyStatement';
            return;
        }
        node.type = 'ExpressionStatement';
        var parent = node.__parent;
        node.__parent = null;
        var newNode = clone(node);
        node.__parent = parent;
        node.expression = newNode;
        node.callee = null;
        newNode.type = 'CallExpression';
        newNode.callee = node.arguments[1];
        newNode.__parent = node;
        node.arguments = null;
        newNode.arguments = [];
    },
    // compile time, format with 'hh:mm:ss'
    '__TIME__': function (opt) {
        var node = opt.node;
        node.type = 'Literal';
        var now = new Date();
        node.value = util.format('%s:%s:%s', twoDigits(now.getHours()), 
            twoDigits(now.getMinutes()), twoDigits(now.getSeconds()));
    },
    // compile date
    '__DATE__': function (opt) {
        var node = opt.node;
        node.type = 'Literal';
        var now = new Date();
        node.value = util.format('%s-%s-%s', now.getFullYear(),
            twoDigits(now.getMonth() + 1), twoDigits(now.getDate()));
    },
    '__METHOD__': function (opt) {
        methodMacroArr.push(opt);    
    }
};


var expandMacro = function (opt) {
    var args = opt.node.arguments;
    if (args.length === 0 || args[0].type !== 'Literal') {
        return;
    }
    var arg1 = args[0].value;
    if (validateHandler[arg1]) {
        validateHandler[arg1](args);
    }
    if (extensionHandler[arg1]) {
        extensionHandler[arg1](opt);
    }
};

var processMethodMacro = function (opt) {
    var oNode = opt.node;
    var node = oNode;
    while(node.__parent) {
        if (node.type === 'FunctionDeclaration') {
            var name = node.id.name;
            oNode.type = 'Literal';
            oNode.value = name;
            return; 
        }
        if (node.type === 'FunctionExpression') {
            var parent = node.__parent;
            if (!parent) {
                break;
            }
            if (parent.type === 'CallExpression') {
                break;
            }
            if (parent.type === 'VariableDeclarator') {
                oNode.type = 'Literal';
                oNode.value = parent.id.name;
                return;
            }
            if (parent.type === 'Property') {
                oNode.type = 'Literal';
                oNode.value = parent.key.name;
                return;
            }
        }
        node = node.__parent;
    }
    oNode.type = 'Literal';
    oNode.value = uuid.v1();
};

module.exports = function (content, file, conf) {
    if (file.rExt !== '.js') {
        return content;
    }
    var syntaxTree;
    try {
        syntaxTree = esprima.parse(content, {
            loc: true
        });
    
        methodMacroArr = [];
        traversal(syntaxTree, function (node) {
            if (node.type !== 'CallExpression' ) {
                return;
            }
            if (!node.callee || node.callee.name !== '__C_EXTENSION') {
                return;
            }
            expandMacro({
                node: node,
                file: file,
                fisConf: conf
            });
        });
        for (var i in methodMacroArr) {
            var opt = methodMacroArr[i];
            processMethodMacro(opt);
        }
    } catch (ex) {
        console.log(ex);
    }
    // console.log(util.inspect(syntaxTree, true, 20));
    return escodegen.generate(syntaxTree);
};
