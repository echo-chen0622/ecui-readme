
(function () {
    var core = ecui,
        util = core.util,
        ui = ecui.ui,
        dom = ecui.dom;

    Object.assign(
        NS.data,
        {
        }
    );
    Object.assign(
        NS.ui,
        {
        }
    );
    ecui.esr.addRoute('index', {
        model: [''],
        main: 'container',
        onbeforerequest: function (context) {
            context.num = frd.util.getTimeRandom();
        },
        onbeforerender: function (context) {
        },
        onafterrender: function (context) {
        },
        onleave: function () {
            frd.util.removeDialog();
        }
    });
}());

