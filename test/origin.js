

var dd = __C_EXTENSION('__LINE__');

var cc = __C_EXTENSION(
'__LINE__'
);

var mm = __C_EXTENSION('__TIME__');

var kk = __C_EXTENSION('__LINE__') +  __C_EXTENSION('__FILE__');

var lala = __C_EXTENSION('__DATE__');

__C_EXTENSION('__DEBUG__', function() {console.log(123)});

__C_EXTENSION('__METHOD__');

var a = function () {
    var methodName = __C_EXTENSION('__METHOD__');
};

(function () {
    var methodName = __C_EXTENSION('__METHOD__');
})();

a.bind('click', function () {
    var methodName = __C_EXTENSION('__METHOD__');
});


var options = {
    callback: function () {
        var methodName = __C_EXTENSION('__METHOD__');
    }
};

var a = __C_EXTENSION('__INLINE__', 'test.txt', 'html');

var b = __C_EXTENSION('__INLINE__', 'embed.css', 'css');
