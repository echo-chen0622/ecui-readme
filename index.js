(function () {
    ecui.esr.onready = function () {
        ecui.esr.DEFAULT_PAGE = '/home/index';
        return {
            model: [],
            main: 'main',
            view: 'content',
            onbeforerender: function (context) {
            },
            onafterrender: function () {}
        };
    };

    document.write('<script type="text/javascript" src="_include/filter.js"></script>');
    document.write('<script type="text/javascript" src="_include/controls.js"></script>');
})();
