'use strict';

// var fis = require('fis'); // to make test work, add this line
var esprima = require('esprima');
var escodegen = require('escodegen');
var minify = require('html-minifier').minify;
var CleanCss = require('clean-css');
var util = require('util');
var uuid = require('uuid');
var fs = require('fs');

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
    },
    '__INLINE__': function (args) {
        if (args.length < 2 || args[1].type !== 'Literal') {
            var message = '__INLINE__ extension requires at least 2 arguments,' + 
                'legal declarations are: __C_EXTENSION("__INLINE", filepath, filetype, needCompress)';
            fis.log.error(message);
            throw message;
        }
    }
};

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
        opt.methodMacroArr.push({
            node: opt.node
        });    
    },
    '__INLINE__': function(opt) {
        var file = opt.file;
        var path = file.realpath.substring(0, file.realpath.lastIndexOf(file.id));
        var node = opt.node;
        var args = node.arguments;
        var targetFilePath = path + args[1].value;
        if (!fs.existsSync(targetFilePath) || !fs.statSync(targetFilePath).isFile()) {
            var message = util.format('in %s: %d, target file %s for __INLINE__ not exists',
                file.id, node.loc.start.line, targetFilePath);
            fis.log.error(message);
            throw message;
        }
        var content = fis.util.read(targetFilePath);
        node.type = 'Literal';
        if (args.length === 2 || args[2].type !== 'Literal') {
            node.value = content;
            return;
        }
        var srcType = args[2].value.toLowerCase();
        switch (srcType) {
            case 'html':
            case 'htm':
                content = minifyHtml(content);
                break;
            case 'css':
                content = minifyCss(content, path);
                break;
        }
        node.value = content;
    }
};

var minifyHtml = function (htmlContent) {
    return minify(htmlContent, {
        removeComments: true,
        removeCommentsFromCDATA: true,
        removeCDATASectionsFromCDATA: true,
        collapseWhitespace: true,
        collapseBooleanAttributes: true,
        removeAttributeQuotes: true,
        removeRedundantAttributes: true,
        removeEmptyAttributes: true,
        removeScriptTypeAttributes: true,
        caseSensitive: true,
        minifyJS: true,
        minifyCSS: true,
        keepClosingSlash: true
    });
};

var minifyCss = function (cssContent, path) {
    var cleanCss = new CleanCss({
        advanced: true,
        aggressiveMerging: true,
        compatibility: true,
        relativeTo: path,
        inliner: true
    }).minify(cssContent);
    if (cleanCss.errors && cleanCss.errors.length > 0) {
        for (var i = 0; i < cleanCss.errors.length; ++i) {
            fis.log.error(cleanCss.errors[i]);
        }
    }
    if (cleanCss.warnings && cleanCss.warnings.length > 0) {
        for (var i = 0; i < cleanCss.warings.length; ++i) {
            fis.log.warning(cleanCss.warnings[i])
        }
    }
    return cleanCss.styles;
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

var toBeExported = function (content, file, conf) {
    if (file.rExt !== '.js') {
        return content;
    }
    var syntaxTree;
    try {
        syntaxTree = esprima.parse(content, {
            loc: true
        });
    
        var methodMacroArr = [];
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
                fisConf: conf,
                methodMacroArr: methodMacroArr
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

module.exports = toBeExported;
