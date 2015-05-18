var dd = 3;
var cc = 5;
var mm = '10:18:16';
var kk = 11 + './origin.js';
var lala = '2015-05-18';
__C_EXTENSION('__DEBUG__', function () {
    console.log(123);
});
__C_EXTENSION('__METHOD__');
var a = function () {
    var methodName = __C_EXTENSION('__METHOD__');
};
(function () {
    var methodName = __C_EXTENSION('__METHOD__');
}());
a.bind('click', function () {
    var methodName = __C_EXTENSION('__METHOD__');
});
var options = {
    callback: function () {
        var methodName = __C_EXTENSION('__METHOD__');
    }
};