ecui.esr.addRoute('detail', {
    model: [''],
    main: 'container',
    view: 'demo_detail',
    onbeforerequest: function (context) {
    },
    onbeforerender: function (context) {
    },
    onafterrender: function () {
        ecui.get('button_demo').onclick = function () {
            ecui.esr.redirect('/index');
        };
    },
});
