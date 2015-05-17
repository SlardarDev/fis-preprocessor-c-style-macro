# fis-preprocessor-c-style-macro
fis extension for C STYLE MACRO
this is a fis plugin to preprocess javascript,
it makes the javascript has ability to use predefined macros like C languange or JAVA.

for example:


var a = __C_EXTENSION('__LINE__'); // current line no

var b = __C_EXTENSION('__FILE__'); // current fine name

var c = __C_EXTENSION('__TIME__'); // fis compile time

var d = __C_EXTENSION('__DATE__'); // fis compile date

function func() {
    var methodname = __C_EXTENSION('__METHOD__'); // func
}

__C_EXTENSION('__DEBUG__', function () {
    console.log('123');
});  // when using fis with -o option, this code fragments will be removed in the out, else, the output is:
// (function () {console.log('123');}());
