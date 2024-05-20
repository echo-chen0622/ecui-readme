ecui.esr.addRoute('list', {
    model: [''],
    main: 'container',
    view: 'demo_list',
    onbeforerequest: function (context) {
    },
    onbeforerender: function (context) {
    },
    onafterrender: function () {
        ecui.get('button_demo').onclick = function () {
            ecui.esr.redirect('/demo/detail');
        };
    },
});
