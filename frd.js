(function () {
    window.frd = window.frd || {};
    (function () {
    var core = ecui,
        ui = core.ui,
        util = core.util,
        dom = core.dom,
        esr = core.esr,
        socket = null,
        isToucher = document.ontouchstart !== undefined,
        safariVersion = !/(chrome|crios|ucbrowser)/i.test(navigator.userAgent) && /(\d+\.\d)(\.\d)?\s+.*safari/i.test(navigator.userAgent) ? +RegExp.$1 : undefined,
        isDingTalk = navigator.userAgent.indexOf('DingTalk') > -1,
        iosVersion = /(iPhone|iPad).*?OS (\d+(_\d+)?)/i.test(navigator.userAgent) ? +(RegExp.$2.replace('_', '.')) : undefined,
        QQVersion = /QQLiveBrowser\/(\d+\.\d)/i.test(navigator.userAgent) ? +RegExp.$1 : undefined,
        isWeixin = /MicroMessenger/i.test(navigator.userAgent) ? true : false,
        isFeishu = /Feishu/i.test(navigator.userAgent) ? true : false,
        now = new Date();

    window.frd = {
        info: {
            baseInfo: {},
            baseInfoMap: [],
            fieldBaseInfoMap: {},
            fieldMap: {},
            editLogMap: {}, // 编辑日志字段名映射
            params: {},
            permissionList: [''],
            isToucher: isToucher,
            iosVersion: iosVersion,
            isDingTalk: isDingTalk,
            safariVersion: safariVersion,
            isWeixin: isWeixin,
            isFeishu: isFeishu,
            QQVersion: QQVersion || /QQ\/(\d+\.\d)/i.test(navigator.userAgent) ? +RegExp.$1 : undefined,
            UIWebView: /UIWebView/i.test(navigator.userAgent),
            qqnews: /qqnews\/(\d+\.\d)/i.test(navigator.userAgent) ? +RegExp.$1 : undefined,
            imgRegex: /(\.jpg|\.png)/g,
            phoneRegex: '1\\d{10}',
            nationalPhoneRegex: '\\d{7,11}',
            emailRegex: '([a-zA-Z0-9\\-\\~_.]+@[a-zA-Z0-9\\-\\~_-]+(\\.[a-zA-Z0-9_-]+)+)?',
            now: util.formatDate(now, 'yyyy-MM-dd'),
            userInfo: {},
            hasShowDialog: false,
            hasLogin: false

        },
        ui: {},
        util: {
            toFixed: function (num, pow) {
                if (!pow && pow !== 0) {
                    pow = 2;
                }
                var correct = Math.pow(10, pow);
                return Math.round(Number(num) * correct) / correct;
            },
            addMessage: function (data) {
                var el = ecui.$('message_box');
                el.insertAdjacentHTML('beforeend', ecui.esr.getEngine().render('message-item', data));
                el = el.lastElementChild;
                ecui.init(el);
                el.style.left = '0px';
                util.timer(function () {
                    if (el) {
                        ecui.dispatchEvent(el.lastElementChild.getControl(), 'click');
                    }
                }, 3000);
            },
            addLoading: function () {
                dom.addClass(document.body, 'ui-loading');
            },
            addBaseInfo: function (baseInfo, isCover) {
                if (baseInfo) {
                    if (isCover) {
                        frd.info.baseInfo = baseInfo;
                        frd.info.baseInfoM = {};
                    } else {
                        Object.assign(frd.info.baseInfo, baseInfo);
                    }
                    for (var key in baseInfo) {
                        if (baseInfo.hasOwnProperty(key)) {
                            frd.info.baseInfoMap[key] = {};
                            frd.info.baseInfo[key].forEach(function (item) {
                                if (item && item instanceof Object) {
                                    frd.info.baseInfoMap[key][item.id + '' || item.code + ''] = item.value || item.text;
                                }
                            });
                        }
                    }
                }
            },
            removeLoading: function () {
                dom.removeClass(document.body, 'ui-loading');
            },
            initSocket: function () {
                if (socket) {
                    socket.close();
                }
                socket = ecui.io.openSocket(
                    
                    location.host + ':9003/serve-basic/ws/' + ecui.esr.headers['x-access-token'],
                    
                    function (data) {
                        switch (data.type) {
                        case 1 :
                            // type === 1 时是 消息数量
                            frd.util.addMessage(data);
                            break;
                        case 2 : // 场景：待办事项处理

                            break;
                        case 4 : // 场景：消息数量变化
                            var message = JSON.parse(data.message);
                            var count = (message.eventCount + message.msgCount) || 0;
                            frd.info.msgCount.eventCount = message.eventCount;
                            frd.info.msgCount.msgCount = message.msgCount;
                            var msgCount = ecui.$('msgCount');
                            dom[count ? 'removeClass' : 'addClass'](msgCount, 'ui-hide');
                            if (count) {
                                msgCount.innerHTML = count > 99 ? '99+' : count;
                            } else {
                                msgCount.innerHTML = '';
                            }
                            break;
                        case 5 : // 权限修改通知登录
                            var dialog = frd.util.initDialog('dialogContainer_2', 'alertDialog', {
                                options: this._oOptions,
                                title: '提醒',
                                content: '您的权限已更改，请重新登录更新权限',
                                confirmText: '我知道了'
                            });
                            dialog.showModal();
                            dialog.owner = this;
                            dialog.oncancel = function () {
                                var hash = window.location.hash;
                                console.log(hash);
                                window.location.href = 'login.html' + (hash ? '?redirectUrl=' + encodeURIComponent(hash.slice(1)) : '');
                            };
                            break;
                        default:
                            break;
                        }
                    // eslint-disable-next-line no-extra-bind
                    }.bind(this),
                    function () {
                        this.tip('error');
                    }.bind(this),
                    {}
                );
            },

            /**
             * 获取table单元格的值
             */
            getTdValue: function (td) {
                if (td.lastElementChild) {
                    return (td.lastElementChild.getControl ? parseFloat(td.lastElementChild.getControl().getValue()) : parseFloat(td.lastElementChild.innerHTML.replace(/,/g, ''))) || 0;
                } else {
                    return parseFloat(td.innerHTML.replace(/,/g, '')) || 0;
                }
            },

            /**
             * 设置table单元格的值
             */
            setTdValue: function (td, value) {
                if (td.lastElementChild) {
                    if (td.lastElementChild.getControl) {
                        td.lastElementChild.getControl().setValue(value);
                        if (td.firstElementChild.classList.contains('show-num')) {
                            td.firstElementChild.innerHTML = util.formatFinance(value);
                        }
                    } else {
                        td.lastElementChild.innerHTML = util.formatFinance(value);
                    }
                } else {
                    td.innerHTML = util.formatFinance(value);
                }
            },

            // 数值 千分位处理 - 方案一
            getThousandNum: function (num) {
                return num.toString().replace(/\d+/, function (n) { // 先提取整数部分
                    return n.replace(/(\d)(?=(\d{3})+$)/g, function ($1) { // 对整数部分添加分隔符
                        return $1 + ",";
                    });
                });
            },
         
            /**
             * 设置页面title标题
             * @public
             *
             * @param {Array} arr title数组
             * @param {String} splitSymbol 标题分割符
             */
            setLocationPage: function (data, splitSymbol) {
                splitSymbol = splitSymbol || '<span> / </span>';
                var location_page = ecui.$('location_page'),
                    arr = [];

                for (var i = 0, item; (item = data[i++]);) {
                    if (item.href) {
                        arr.push(util.formatString('<a href="{1}">{0}</a>', item.text, item.href));
                    } else {
                        arr.push(util.formatString('<span>{0}</span>', item.text));
                    }
                }
                ecui.dispose(location_page);
                location_page.innerHTML = arr.join(splitSymbol);
                ecui.init(location_page);
            },

            /**
             * 设置导航菜单选中效果
             * @public
             *
             * @param {String} routeName 路由名
             */
            selectedModuleLinkItem: function (routeName) {
                // 第一次进入页面、刷新页面时，设置导航栏默认选中状态
                var uNavBar = ecui.get('nav-bar');

                ecui.query(function (item) {
                    return item instanceof frd.ui.ModuleLinkItem;
                }).forEach(function (item) {
                    var loc = item.getMain().getAttribute('href').slice(1);
                    if (loc.indexOf(routeName) === 0) {
                        uNavBar.setActived(item.getParent());
                    }
                });

            },

            /**
             * 弹出确认框
             * @param {string|html} content - 确认框的内容, 可接受字符串和html
             * @param {object} options - 渲染dialog时的options, {className: string, confirmText: string}
             * @param {Function} confirm - 点击确认的回调
             * @param {Function} cancel - 点击取消的回调
             * @return {dialog} 返回弹出的dialog控件
             */
            confirm: function (content, options, confirm, cancel) {
                var dialog = frd.util.initDialog(options.container || 'dialogContainer', 'confirmDialog', {
                    title: options.title || '提醒',
                    className: options.className || '',
                    content: content,
                    cancelText: options.cancelText || '取消',
                    confirmText: options.confirmText || '确定'
                });
                dialog.onsubmit = function (event) {
                    confirm && confirm.call(dialog, event);
                };
                dialog.oncancel = function (event) {
                    cancel && cancel.call(dialog, event);
                };

                dialog.showModal();
                return dialog;
            },
            /**
             * 提示框
             * @public
             *
             * @param {string} title 提示框标题
             * @param {string} text 提示框内容
             * @param {function} submit 点击确认按钮事件
             */
            alert: function (title, text, btnText, submit) {
                var dialog = frd.util.initDialog('dialogContainer_2', 'alertDialog', {
                    NS: frd.util.getCurrentNS(),
                    title: title,
                    text: text,
                    btnText: btnText
                });
                dialog.showModal();
                dialog.onsubmit = submit;
                return dialog;
            },
            /**
             * 获取当前 dom/control 所属路由。
             * @public
             *
             * @param {Element | Control} el 当前元素
             */
            getRoute: function (el) {
                var route,
                    parent = (el instanceof ecui.ui.Control ? el.getMain().parentElement : el.parentElement);
                for (; parent; parent = parent.parentElement) {
                    if (parent === document.body) {
                        break;
                    }
                    if (parent.route !== undefined) {
                        route = parent.route;
                        break;
                    }
                }
                return route;
            },

            getSearchParams: function (searchParam) {
                var param = Object.assign({}, searchParam || {});
                var params = {};
                for (var key in param) {
                    if (param.hasOwnProperty(key)) {
                        if (param[key] !== '') {
                            params[key] = param[key];
                        } else {
                            params[key] = null;
                        }
                    }
                }
                return params;
            },

            /**
             * 获取模块名称。
             * @private
             *
             */
            getModuleName: function () {
                var loc = ecui.esr.getLocation();
                return loc.slice(1, loc.lastIndexOf('/') + 1);
            },
            /**
             * 获取当前路由对应的NS。
             * @public
             *
             */
            getCurrentNS: function () {
                return ecui.ns['_' + frd.util.getModuleName().replace(/[._]/g, '-').replace(/\//g, '_')] || {};
            },
            /**
             * 在进入主路由页面时，添加请求头里面添加 x-enter-page-sign 字段，提供给后端做防止连点作弊操作。
             * @public
             *
             */
            setEnterPageSign: function () {
                ecui.esr.headers['x-enter-page-sign'] = frd.util.getTimeRandom();
            },

            setTitle: function (title) {
                if (frd.info.isDingTalk) {
                    dd.ready(function () {
                        dd.setNavigationTitle({
                            title: title,
                            success: function () {},
                            fail: function () {},
                            complete: function () {}
                        });
                    });
                } else {
                    window.document.title = title;
                }
            },

            /**
             * 生成时间戳的随机数
             * @return {String} 
             */
            getTimeRandom: function () {
                return  Date.now() + '' + Math.round(Math.random() * 10000);
            },
            /**
             * 将带 <br/> 的字符串 通过<br/> 分割成数组。
             * @public
             *
             * @param {String} value 带 <br/> 的字符串
             */
            parseBR: function (value) {
                return value.split('<br/>');
            },

            /**
             * 遍历 children 树 结构数据
             * @public
             *
             * @param {Array} tree 树结构
             */
            mapTree: function (tree, fn) {
                tree.forEach(function (item) {
                    fn(item);
                    if (item.children) {
                        frd.util.mapTree(item.children, fn);
                    }
                });
            },
            /**
             * 移除并释放已打开的dialog控件，用于离开路由时调用
             * @public
             *
             */
            removeDialog: function () {
                var dialogContainer = ecui.$('dialogContainer'),
                    dialogContainer_1 = ecui.$('dialogContainer_1'),
                    dialogContainer_2 = ecui.$('dialogContainer_2');
                if (dialogContainer) {
                    ecui.dispose(dialogContainer);
                    dialogContainer.innerHTML = '';
                }
                if (dialogContainer_1) {
                    ecui.dispose(dialogContainer_1);
                    dialogContainer_1.innerHTML = '';
                }
                if (dialogContainer_2) {
                    ecui.dispose(dialogContainer_2);
                    dialogContainer_2.innerHTML = '';
                }
            },
            /**
             * 生成唯一的uuid
             */
            uuid: function () {
                var s = [];
                var hexDigits = "0123456789abcdef";
                for (var i = 0; i < 36; i++) {
                    s[i] = hexDigits.substr(Math.floor(Math.random() * 0x10), 1);
                }
                s[14] = "4"; // bits 12-15 of the time_hi_and_version field to 0010
                s[19] = hexDigits.substr((s[19] & 0x3) | 0x8, 1); // bits 6-7 of the clock_seq_hi_and_reserved to 01
                s[8] = s[13] = s[18] = s[23] = "-";

                var uuid = s.join("");
                return uuid;
            },

            removeInitLoading: function () {
                dom.removeClass(document.body, 'init-loading');
            },
            /**
             * 初始化dialog控件。
             * @public
             *
             * @param {string|Element} container dialog控件容器
             * @param {string} targetName 模板名称
             * @param {object} options 成功回调函数
             *
             * @return {Control} dialog 控件
             */
            initDialog: function (container, targetName, options) {
                if (typeof container === 'string') {
                    container = ecui.$(container);
                }
                ecui.dispose(container);
                container.innerHTML = ecui.esr.getEngine().render(targetName, options);
                ecui.init(container);
                return container.children[0].getControl();
            },
            redirect: function (loc) {
                history.replaceState('', '', location.pathname.split('/').pop() + '#' + loc);
                esr.callRoute(loc);
            },
            /**
             * 手机号加密
             * 
             * @param {string} str - 需要加密的字符串
             * @param {number} offset - assic码偏移量
             * @return {void}
             */
            encryption: function (str, offset) {
                offset = offset || 52;
                var res = '';
                for (var i = 0, len = str.length; i < len; i++) {
                    if (str[i]) {
                        res += String.fromCharCode(str[i].charCodeAt() + offset);
                    }
                }
                return res;
            },
            clearSizeTimer: function () {},
            /**
             * 根据基础字体大小 和 效果图宽度设置 根节点字体大小
             * @public
             *
             * @param {number} baseFontSize 浏览器默认字体大小 [注]浏览器最小字体为12像素，所以该值必需大于等于12
             * @param {number} baseWidth 设计稿的尺寸
             * @return 
             */
            initFontSize: function (baseFontSize, baseWidth) {
                var clientWidth,
                    clientHeight = document.documentElement.clientHeight || window.innerHeight;

                try {
                    // 获取当前屏幕宽度
                    if (isToucher) {
                        clientWidth = document.documentElement.clientWidth || window.innerWidth;
                    } else {
                        clientWidth = 375 / 750 * clientHeight;
                        frd.util.clearSizeTimer = util.timer(function () {
                            var body = document.body;
                            if (body) {
                                frd.util.clearSizeTimer();
                                body.style = 'margin: 0 auto !important;';
                                body.style.width = clientWidth + 'px';
                                body.style.height = clientHeight + 'px';
                                dom.addClass(body, 'pc');
                            }
                            // 在pc端展示h5页面时，调整 getView 方法的 client 固定为 body 来计算位置
                            dom.getView = function () {
                                var body = document.body,
                                    html = body.parentElement,
                                    client = body,
                                    scrollTop = html.scrollTop + body.scrollTop,
                                    scrollLeft = html.scrollLeft + body.scrollLeft,
                                    clientWidth = client.clientWidth,
                                    clientHeight = client.clientHeight;

                                return {
                                    top: scrollTop,
                                    right: scrollLeft + clientWidth,
                                    bottom: scrollTop + clientHeight,
                                    left: scrollLeft,
                                    width: clientWidth,
                                    height: clientHeight,
                                    pageWidth: Math.max(html.scrollWidth, body.scrollWidth, clientWidth),
                                    pageHeight: Math.max(html.scrollHeight, body.scrollHeight, clientHeight)
                                };
                            };
                        }, -10);
                    }
                } catch (e) {
                    console.warn(e);
                }
                // 根据宽度计算根节点字体大小
                var size = clientWidth / baseWidth * baseFontSize;
                document.querySelector('html').style.fontSize = size + 'px';
            },

            /**
             * 待ecui准备就绪后执行
             * @public
             *
             * @param {function} callback ecui就绪后要执行的函数
             * @return 
             */ 
            ecuiReady: function (callback) {

                function loadInit(body) {
                    etpl.config({
                        commandOpen: '<<<',
                        commandClose: '>>>'
                    });

                    for (var el = body.firstChild; el; el = nextSibling) {
                        var nextSibling = el.nextSibling;
                        if (el.nodeType === 8) {
                            etpl.compile(el.textContent || el.nodeValue);
                            dom.remove(el);
                        }
                    }

                    etpl.config({
                        commandOpen: '<!--',
                        commandClose: '-->'
                    });
                }

                ecui.ready(function () {
                    // 窗口大小改变时设置根节点字体大小，通过字体大小来控制页面元素尺寸的缩放
                    window.addEventListener('resize', function () {
                        frd.util.initFontSize(75, 750);
                    });

                    // 设置 选项控件的文本在 options 中的名称
                    ecui.ui.abstractSelect.prototype.TEXTNAME = 'code';
                    ui.MMultilevelSelect.prototype.Select.prototype.TEXTNAME = 'code';


                    var body = iosVersion ? document.body.firstChild : document.body;
                    loadInit(body);callback();
                    
                });

            },

            /**
             * 创建水印
             * @public
             *
             * @param {string} str 水印名字
             * @return  img base64
             */ 
            createWaterMark: function (str) {
                var canv = document.createElement('canvas');
                canv.width = 300;
                canv.height = 200;

                var ct = canv.getContext('2d');

                ct.rotate((-20 * Math.PI) / 180);
                ct.font = '15px Vedana';
                ct.fillStyle = 'rgba(0, 0, 0, 0.1)';
                ct.textAlign = 'left';
                ct.textBaseline = 'middle';
                ct.fillText(str, canv.width / 20, canv.height);
        
                return canv.toDataURL('image/png');

            },
            /**
             * 设置水印
             * @public
             *
             * @param {string} str 水印名字
             * @param {string} container 设置水印的容器
             */ 
            setWaterMark: function (str, container) {
                if (!(container instanceof window.HTMLElement)) {
                    container = ecui.$(container) || document.body;
                }
                var el = dom.create('div', {
                    className: 'ui-water-mask'
                });
                el.style.background = 'url("' + frd.util.createWaterMark(str) + '") 0 0 repeat';
                container.appendChild(el);
            },

            /**
             * 飞书登录
             * @public
             *
             * @return 
             */ 
            ttLogin: function () {
                function login(code) {
                    ecui.esr.request(
                        'data@JSON /serve-basic/v1/feishu/login?code=' + code,
                        function () {
                            var data = ecui.esr.getData('data');
                            var _code = ecui.esr.getData('data_CODE');
                            if (_code === 0) {
                                window.localStorage.setItem('token', data.data.token);
                                location.reload();
                            }
                        }
                    );
                }
                window.h5sdk.ready(function () {
                    tt.requestAuthCode({
                        appId: frd.info.appId,
                        // 获取成功后的回调
                        success: function (res) {
                            login(res.code);
                        },
                        // 获取失败后的回调
                        fail: function (err) {
                            console.log('getAuthCode failed, err: ', JSON.stringify(err));
                        }
                    });
                });
            },
            /**
             * 微信签名验证
             * @public
             *
             * @return 
             */ 
            wxSignature: function () {
                ecui.esr.headers['Content-Type'] = 'application/x-www-form-urlencoded; charset=UTF-8';

                var url = location.origin + location.pathname + (location.search ? location.search : (location.href.indexOf('?') < 0 ? '' : '?'));
                if (iosVersion) {
                    url = location.href.split('#')[0];
                }
                ecui.esr.request(
                    'signature@POST /wx_carmodel/api/v1/poll/sign?url=' + encodeURIComponent(url),
                    function () {
                        var signature = ecui.esr.getData('signature');
                        frd.info.signature = signature = signature.data || signature;
                        wx.config({
                            
                            debug: true,
                            
                            appId: signature.appId,
                            timestamp: signature.timestamp,
                            nonceStr: signature.nonceStr,
                            signature: signature.signature,
                            jsApiList: [
                                'onMenuShareTimeline',
                                'onMenuShareAppMessage',
                                'updateAppMessageShareData',
                                'onMenuShareQQ',
                                'onMenuShareQZone',
                                'launchApplication'
                            ]
                        });
                        wx.ready(function () {
                            frd.info.wxReady = true;
                        });
                    },
                    function (xhr) {
                        console.warn('获取签名失败');
                    }
                );
                ecui.esr.headers['Content-Type'] = 'application/json;charset=UTF-8';
            },
            /**
             * 设置微信分享内容
             * @public
             *
             */
            setWxShareContent: function (shareObj) {

                var commonObject = {
                    title: shareObj.title,
                    desc: shareObj.desc,
                    link: shareObj.link,
                    imgUrl: shareObj.imgUrl,
                    trigger: function (res) {
                        console.log(res);
                        //alert('选择你所要发送的好友');
                    },
                    success: function (res) {
                        console.log(res);
                        //alert('分享成功');
                    },
                    cancel: function (res) {
                        //alert('已取消');
                    },
                    fail: function (res) {
                        //alert(JSON.stringify(res));
                    }
                };
                wx.ready(function () {
                    wx.showOptionMenu();
                    //分享给朋友
                    wx.updateAppMessageShareData(Object.assign({}, commonObject));
    
                    //分享到朋友圈
                    wx.onMenuShareTimeline(Object.assign({}, commonObject));
                    wx.onMenuShareQQ(Object.assign({}, commonObject));
                    wx.onMenuShareQZone(Object.assign({}, commonObject));
                });
            },

            uploadFile: function (url, param, success, error) {
                if (param instanceof Function) {
                    error = success;
                    success = param;
                    param = {};
                }
                var data = new FormData();
                for (var key in param) {
                    data.append(key, param[key]);
                }

                if (this._bSend) {
                    return;
                }

                frd.util.addLoading();
                this._bSend = true;
                ecui.io.ajax(url, {
                    method: 'POST',
                    data: data,
                    headers: ecui.esr.headers,
                    onupload: function (e) {

                    },
                    onsuccess: function (event) {
                        this._bSend = false;
                        frd.util.removeLoading();
                        try {
                            var result = JSON.parse(event);
                            ecui.esr.onparsedata(url, result);
                            if (result.code === 0) {
                                if (success) {
                                    success();
                                }
                            } else {

                                if (error) {
                                    if (error() === false) {
                                        return;
                                    }
                                }
                                ecui.tip('error', result.msg);
                            }
                        } catch (e) {}
                    }.bind(this),
                    onerror: function () {
                        this._bSend = false;
                        frd.util.removeLoading();
                    }.bind(this)
                });
            }
        }
    };

    // 设置esr请求头
    ecui.esr.headers = {
        'http_id': frd.util.uuid(),
        'x-client': isToucher ? iosVersion ? 'ios' : 'android' : 'pc',
        'x-dev-id': '',
        'x-origin-url': location.href,
        'x-enter-page-sign': frd.util.getTimeRandom(),
        'x-access-token': window.localStorage.getItem('token')
    };
    frd.info.xAccessToken = ecui.esr.headers['x-access-token'];
    ecui.ui.Upload.prototype._oHeaders = ecui.esr.headers;

    // 解析url参数
    var paramMap = {},
        params = location.search.slice(1).split('&').filter(function (item) {
            return item !== '';
        });

    // eslint-disable-next-line no-cond-assign
    for (var i = 0, item; item = params[i++]; ) {
        var arr = item.split('=');
        if (arr.length > 1) {
            paramMap[arr[0]] = arr[1];
        }
    }
    Object.assign(frd.info.params, paramMap);

    // 添加rid防止作弊，同一个app，同一天打开落地页rid是同一个值，每天更新rid
    frd.info.rid = window.localStorage.getItem('rid');
    // 没有rid，rid的值不是当天的情况下，更新rid的值，缓存在客户端的本地缓存中
    if (!frd.info.rid || util.formatDate(new Date(+frd.info.rid), 'yyyy-MM-dd') !== util.formatDate(now, 'yyyy-MM-dd')) {
        window.localStorage.setItem('rid', now.getTime());
        frd.info.rid = now.getTime();
        frd.info.firstEnter = true;
    }
    ecui.esr.headers['x-rid'] = frd.info.rid;
    
    if (isToucher) {
        if (!iosVersion) {
            // Android手机 微信中借助WeixinJSBridge对象来阻止字体大小调整
            (function () {
                if (typeof WeixinJSBridge == "object" && typeof WeixinJSBridge.invoke == "function") {
                    handleFontSize();
                } else {
                    if (document.addEventListener) {
                        document.addEventListener("WeixinJSBridgeReady", handleFontSize, false);
                    } else if (document.attachEvent) {
                        document.attachEvent("WeixinJSBridgeReady", handleFontSize);
                        document.attachEvent("onWeixinJSBridgeReady", handleFontSize);
                    }
                }
                function handleFontSize() {
                    // 设置网页字体为默认大小
                    WeixinJSBridge.invoke('setFontSizeCallback', { 'fontSize' : 0 });
                    // 重写设置网页字体大小的事件
                    WeixinJSBridge.on('menu:setfont', function () {
                        WeixinJSBridge.invoke('setFontSizeCallback', { 'fontSize' : 0 });
                    });
                }
            })();
        }
    
        window.dispatchCustomEvent = function (eventName, options) {
            if (options) {
                options = JSON.parse(options);
                var event = document.createEvent('HTMLEvents');
                event.initEvent(eventName, true, true);
                ecui.util.extend(event, options);
                window.dispatchEvent(event);
            }
        };
        window.iosKeyboardchange = function (height) {
            var event = document.createEvent('HTMLEvents');
            event.height = height;
            event.initEvent('keyboardchange', true, true);
            window.dispatchEvent(event);
        };
    }

    /**
     * esr执行异常处理函数。
     * @public
     *
     * @param {object} e 异常对象
     *
     */
    ecui.esr.onexception = function (e) {
        console.warn(e);
    };

    /**
     * js代码执行异常处理函数。
     * @public
     *
     */
    window.addEventListener('error', function () {

    });

    /**
     * request异常处理函数。
     * @public
     *
     * @param {object} err 异常对象
     *
     */
    ecui.esr.onrequesterror = function (err) {
        // console.log('onrequesterror', err);
        var hasRequest = false;
        err.forEach(function (item) {
            if (item.url) {
                hasRequest = true;
            }
        });
        if (hasRequest) {
            // TODO
            // 接口有问题
        }
    };


    /**
     * request请求结果统一处理函数
     * @public
     *
     * @param {string} url 请求地址
     * @param {object} data 请求参数
     *
     * @return {Object|numer} data.code为0时，返回 data.data ，否则返回 data.code
     */

    var noTipCodes = [100000, 300000, 500016];
    var routeWhiteList = ['/demo/ui'];
    ecui.esr.onparsedata = function (url, data) {
        if (data) {
            if (data.code !== 0 && noTipCodes.indexOf(data.code) < 0) {
                ecui.tip('error', data.msg);
            }
            switch (data.code) {
            case 12011:
            case '12011':
                if (routeWhiteList.indexOf(ecui.esr.getLocation().split('~')[0]) === -1) {
                     var hash = window.location.hash; window.location.href = 'login.html' + (hash ? '?redirectUrl=' + encodeURIComponent(hash.slice(1)) : '');
                    
                }
                break;
            case '600021':
                break;
            case '600001':
                break;
            default:
                break;
            }
        }
        return data.data;
    };

}());
    (function () {
    var core = ecui,
        dom = core.dom,
        ui = core.ui,
        util = core.util,
        esr = core.esr;
    /**
     * submit 防止重复提交接口。
     * @public
     * @param {string} value 插件的参数
     */
    ISubmit = {
        request: function (url, onsuccess, onerror) {
            if (this._bSend) {
                return;
            }
            this._bSend = true;
            esr.request(
                url,
                function () {
                    this.clearSend();
                    onsuccess.call(this);
                }.bind(this),
                function () {
                    this.clearSend();
                    if (onerror) {
                        onerror.call(this);
                    }
                    return false;
                }.bind(this)
            );
        },
        clearSend: function () {
            this._bSend = false;
        }
    }
    ui.Submit = window._interface ? window._interface('$Submit', ISubmit) : core.interfaces('Submit', ISubmit);
})();
    (function () {
    var core = ecui,
        dom = core.dom,
        ui = core.ui,
        util = core.util,
        esr = core.esr,
        isUCBrowser = /ucbrowser/i.test(navigator.userAgent),
        chromeVersion = /(Chrome|CriOS)\/(\d+\.\d)/i.test(navigator.userAgent) ? +RegExp.$2 : undefined,
        safariVersion = !chromeVersion && !isUCBrowser && /(\d+\.\d)(\.\d)?\s+.*safari/i.test(navigator.userAgent) ? +RegExp.$1 : undefined,
        ext = core.ext;


    function searchRoute(event) {
        var route = ecui.esr.findRoute(this),
            routeName = this._sRoute || route.children || route.NAME, // 如果没有子路由就刷新当前路由
            children = ecui.esr.getRoute(routeName);

        if (children.EXTDATA) {
            children.getTableData();
            return;
        }
        // 弹窗搜索，点击确定
        if (event) {
            var submitBtn = event.getControl(),
                dialog = submitBtn.getParent(),
                form = submitBtn.getForm(),
                inputs = form.elements,
                searchNum = 0;

            dom.toArray(inputs).forEach(function (item) {
                if (item.getControl && item.getControl()) {
                    item = item.getControl();
                    var value = item.getValue ? item.getValue() : '';
                    if (value instanceof Array) {
                        if (value.length) {
                            searchNum++;
                        }
                    } else if (value) {
                        searchNum++;
                    }
                }
            });
            dom[searchNum ? 'addClass' : 'removeClass'](dialog.owner.getMain(), 'show-search-num');
            dialog.owner.getMain().setAttribute('data-search-num', searchNum ? searchNum : '');
            dialog.hide();

        }
        if (frd.info.paginationModel === 'history') {
            var searchParam = Object.assign({ }, children.searchParam, { pageNo: 1 });
            var form = this.getForm ? this.getForm() : this.getInput().form;
            if (form) {
                var data = {};
                esr.parseObject(form, data, false);
                Object.assign(searchParam, data);
            }
            esr.change(routeName, frd.util.getSearchParams(searchParam));
        } else {
            ecui.esr.callRoute(routeName + '~pageNo=1', true);
        }
    }

    var extSearch = {
        constructor: function (value, options) {
            this._sRoute = options.route;
        }
    };

    ext.blursearch = Object.assign({}, extSearch, {
        Events: {
            blur: function () {
                if (this.getValue() !== this.getDefaultValue()) {
                    searchRoute.call(this);
                }
            },
            keydown: function (e) {
                if (e.which === 13) {
                    searchRoute.call(this);
                }
            },
            clear: function () {
                searchRoute.call(this);
            }
        }
    });

    ext.changesearch = Object.assign({}, extSearch, {
        Events: {
            change: function () {
                searchRoute.call(this);
            },
            clear: function () {
                searchRoute.call(this);
            }
        }
    });

    ext.clicksearch = Object.assign({}, extSearch, {
        Events: {
            click: function () {
                searchRoute.call(this);
            },
            clear: function () {
                searchRoute.call(this);
            }
        }
    });

    ext.inputsearch = Object.assign({}, extSearch, {
        Events: {
            input: function () {
                if (this.clearSearchTimer) {
                    this.clearSearchTimer();
                }
                this.clearSearchTimer = util.timer(searchRoute, 300, this);
            },
            keydown: function (e) {
                if (e.which === 13) {
                    if (this.clearSearchTimer) {
                        this.clearSearchTimer();
                    }
                    searchRoute.call(this);
                }
            },
            clear: function () {
                if (this.clearSearchTimer) {
                    this.clearSearchTimer();
                }
                searchRoute.call(this);
            }
        }
    });

    ext.clamp = {
        /**
         * esr数据名跟踪插件初始化。
         * @public
         *
         * @param {string} value 插件的参数，格式为 变量名@#模板名 或 变量名@js函数名 ，表示指定的变量变化时，需要刷新控件内部HTML
         */
        constructor: function () {
            if (safariVersion) {
                var style = this.getMain().style;
                var height = style.height;
                
                style.height = '1px';
                util.timer(function () {
                    style.height = height || '';
                }, 10, this);
            }
        },

        Events: {
            ready: function (event) {
            }
        }
    };

    /**
     * control
     * 编辑 新增行 - 按钮。
     */
    ext.addItem = {
        constructor: function (el, options) {
            this._sTarget = options.target;
            this._bIsTable = options.isTable;
            this._sContainer = options.container;
            this._sPosition = options.position;
            this._sName = options.name;
            this._bIsCopy = options.isCopy;
            this._oOptions = options;
        },
        Events: {
            click: function (event) {
                if (ecui.dispatchEvent(this, 'beforeAdd', event) === false) {
                    return;
                }
                var el = dom.create(this._bIsTable ? 'table' : 'div');
                if (this._bIsCopy) {
                    var form = this.getForm(),
                        data = {},
                        valid = ecui.esr.parseObject(form, data, false),
                        items = util.parseValue(this._sName, data),
                        tr = this.getParent(),
                        body = tr.getMain().parentElement,
                        trs = dom.children(body),
                        index = trs.indexOf(tr.getMain()),
                        item = items[index];

                    el.innerHTML = ecui.esr.getEngine().render(this._sTarget, { timestamp: Date.now(), NS: ecui.esr.getData('NS'), item: item });
                    el = el.firstElementChild;
                    if (this._bIsTable) {
                        el = el.firstElementChild;
                    }
                    dom.insertAfter(el, tr.getMain());
                    ecui.init(el);
                    container.scrollTo(0, 100000);
                } else {
                    el.innerHTML = ecui.esr.getEngine().render(this._sTarget, { timestamp: Date.now(), NS: ecui.esr.getData('NS') });
                    if (this._sContainer) {
                        var container = ecui.$(this._sContainer);
                        if (container) {
                            el = el.firstElementChild;
                            if (this._bIsTable) {
                                el = el.firstElementChild;
                            }
                            switch (this._sPosition) {
                                case 'beforeBegin':
                                    dom.insertBefore(el, container);
                                    ecui.init(el);
                                    break;
                                case 'afterBegin':
                                    if (container.firstElementChild) {
                                        dom.insertBefore(el, container.firstElementChild);
                                        ecui.init(el);
                                    } else {
                                        container.appendChild(el);
                                        ecui.init(el);
                                    }
                                    break;
                                case 'beforeEnd':
                                    if (container.lastElementChild) {
                                        dom.insertAfter(el, container.lastElementChild);
                                        ecui.init(el);
                                    } else {
                                        container.appendChild(el);
                                        ecui.init(el);
                                    }
                                    break;
                                case 'afterEnd':
                                    dom.insertAfter(el, container);
                                    ecui.init(el);
                                    break;
                                default:
                                    break;
                            }
                            container.scrollTo(0, 100000);
                        }
                    } else {
                        var parent = this.getMain().parentElement;
                        el = dom.insertAfter(el.firstElementChild, parent);
                        ecui.init(el);
                        parent.parentElement.scrollTo(0, 100000);
                    }
                }
                ecui.dispatchEvent(this, 'itemChange', event);   
            }
        }
    };

    /**
     * control
     * 编辑 删除行 - 按钮。
     */
    ext.deleteItem = {
        constructor: function (el, options) {
            this._bMust = !!options.must;
            this._oOptions = options;
        },
        Events: {
            click: function (event) {
                
                if (ecui.dispatchEvent(this, 'beforeDelete', event) === false) {
                    return;
                }
                var parent = this.getParent();
                    
                if (this._bMust) {
                    var children = dom.children(parent.getParent().getMain());

                    if (children.length <= 1) {
                        ecui.tip('warn', '至少保留一项');
                        return;
                    }
                }

                parent = parent.getMain();
                if (frd.info.firefoxVersion) {
                    // 延时执行dom 的 remove ；解决firefox下面删除后会有选中效果的问题
                    ecui.util.timer(function () {
                        dom.remove(parent);
                        ecui.dispatchEvent(this, 'itemChange', event);
                        ecui.dispose(parent);
                    }.bind(this), 0);
                } else {
                    dom.remove(parent);
                    ecui.dispatchEvent(this, 'itemChange', event);
                    ecui.dispose(parent);
                } 
            }
        }
    };
    /*
     * 点击打开弹框的 按钮，适用于  编辑信息、查看详情 弹窗打开按钮
     * value    
     * options    属性：
     *
     */
    ext.title = {
        constructor: function (value) {
            var main = this.getMain();
            var el;
            var title = main.getAttribute('title');
            if (!title && title !== '') {
                el = main.lastElementChild;
                dom.addClass(el, 'ui-title-cont');
            } else {
                main.setAttribute('title', '');
                el = dom.create('div', { innerHTML: title, className: 'ui-title-cont' });
                main.appendChild(el);
            }

            core.$fastCreate(ui.Control, el, this);
            this.isStatic = 'static' === value;
            this._eTitle = el;
            this._eTitle.style.display = 'none';
        },
        Events: {
            mouseover: function () {
                this.mouseoverTimer = util.timer(function () {
                    var cont = ecui.$('ECUI_EXT_TITLE_CONT');
                    if (!cont) {
                        cont = dom.create('div', {
                            id: 'ECUI_EXT_TITLE_CONT'
                        });
                        document.body.append(cont);
                    }
                    cont.innerHTML = '';
                    cont.append(this._eTitle);
                    this._eTitle.style.display = '';
                    ext.title.setPosition.call(this);
                }, 100, this);

            },
            mouseout: function () {
                if (this.mouseoverTimer) {
                    this.mouseoverTimer();
                }
                this._eTitle.style.display = 'none';
            },
            mousewheel: function () {
                // this.tipsEl && (this.tipsEl.style.display = 'none');
            }
        },
        setPosition: function () {
            var main = this.getMain();
            if (main.scrollWidth > main.clientWidth || main.scrollHeight > main.clientHeight || this.isStatic) {
                var pos = ecui.dom.getPosition(main),
                    top = pos.top - this._eTitle.offsetHeight,
                    left = pos.left + this.getWidth() / 2 - this._eTitle.offsetWidth / 2;

                if (top < this._eTitle.offsetHeight) {
                    top = pos.top + this.getHeight();
                }
                if (left + this._eTitle.offsetWidth > window.innerWidth) {
                    left = window.innerWidth - this._eTitle.offsetWidth;
                }
                left = Math.max(left, 0);
                this._eTitle.style.top = top + 'px';
                this._eTitle.style.left = left + 'px';
            }
        }
    };

    /*
     * 全屏
     */
    ext.fullscreen = {
        constructor: function (value) {
            this._bBower = !!value;
        },

        Events: {
            click: function () {
                var target = this.getMain().parentElement;
                if (target.className.indexOf('ui-full-screen') < 0) {
                    if (target) {
                        ecui.fullScreen(target, this._bBower);
                    }
                } else {
                    ecui.cancleFullScreen();
                }
            }
        }
    };
    /*
     * 保存options参数
     */
    ext.options = {
        constructor: function (value, options) {
            this._oOptions = options;
        }
    };
    /*
     * 保存一组数据
     */
    ext.value = {
        constructor: function (value) {
            this._sValue = value;
        }
    };
    /*
     * 点击打开弹框的 按钮，适用于  编辑信息、查看详情 弹窗打开按钮
     * options    属性：
     * optId       操作的记录id
     * detailId    获取详情信息的记录id
     * url         获取详情信息的接口路径
     * container   dialog容器id
     * target      dialog 的 内容target 模板名称
     *
     */
    ext.showdialog = {
        constructor: function (value, options) {
            this._sOptId = options.optId || '';
            this._sUrl = options.url;
            this._sContainer = options.container || 'dialogContainer';
            this._sTarget = typeof value === 'string' ? value : options.target;
            this._sMethod = options.method || 'JSON';
            this._oOptions = options;
        },
        Events: {
            click: function (event) {
                if (ecui.dispatchEvent(this, 'beforeShowDialog', event) === false) {
                    return;
                }
                var parent = this.getParent();
                if (parent && parent.getParent() && parent.getParent().getParent() instanceof frd.ui.NotOptionalSelect) {
                    // NotOptionalSelect 控件里面的弹出框按钮不阻止冒泡
                } else {
                    event.stopPropagation();
                }
                if (this._sUrl) {
                    ecui.esr.request(
                        util.formatString('detailData@{0} {1}', this._sMethod, this._sUrl),
                        function () {
                            var code = ecui.esr.getData('detailData_CODE');
                            var data = ecui.esr.getData('detailData');
                            if (code === 0) {
                                var dialog = frd.util.initDialog(this._sContainer, this._sTarget, { optId: this._sOptId, options: this._oOptions, detail: data });
                                dialog.showModal();
                                dialog.owner = this;
                                dialog.detail = data;
                                dialog.onsubmit = this.submit || this.dialogSubmit || util.blank;
                                dialog.onhide = this.dialogHide || util.blank;

                                event.dialog = dialog;
                                if (ecui.dispatchEvent(this, 'afterShowDialog', event) === false) {
                                    return;
                                }
                            }
                        }.bind(this),
                        function () {
                            return false;
                        }
                    );
                } else {
                    var dialog = frd.util.initDialog(this._sContainer, this._sTarget, { optId: this._sOptId, options: this._oOptions });
                    dialog.showModal();
                    dialog.owner = this;
                    dialog.onsubmit = this.submit || this.dialogSubmit || util.blank;
                    dialog.onhide = this.dialogHide || util.blank;

                    event.dialog = dialog;
                    if (ecui.dispatchEvent(this, 'afterShowDialog', event) === false) {
                        return;
                    }
                }
            }
        }
    };

    /**
     * control
     * 列表操作按钮
     * options    属性：
     * optId       奖品操作记录id
     * url         操作调用的接口路径
     * tip         提示信息
     * title       提示标题
     * content     提示内容
     * container   dialog容器id
     * target      dialog 的 内容target 模板名称
     *
     */
    ext.confirm = {
        constructor: function (el, options) {
            this._sUrl = options.url;
            this._sTip = options.tip;
            this._sOptId = options.optId;
            this._bNoConfirm = options.noConfirm;
            this._sMethod = options.method || 'JSON';
            this._bReload = !!options.reload;
            this._sTitle = options.title || '提醒';
            this._sContent = options.content || '确认处理这条数据？';
            this._sConfirmText = options.confirmText || '确定';
            this._sCancelText = options.cancelText || '取消';
            this._oOptions = options;
        },
        Events: {
            click: function (event) {
                if (ecui.dispatchEvent(this, 'beforeShowDialog', event) === false) {
                    return;
                }

                var parent = this.getParent(),
                    isNotOptionalSelect = false;
                if (parent && parent.getParent() && parent.getParent().getParent() instanceof frd.ui.NotOptionalSelect) {
                    isNotOptionalSelect = true;
                    // NotOptionalSelect 控件里面的弹出框按钮不阻止冒泡
                } else {
                    event.stopPropagation();
                }
                function confirmRequest(event) {
                    var activeControl = event.getControl();
                    activeControl.disable();
                    ecui.esr.request(
                        util.formatString('confirmData@{0} {1}{2}{3}', this._sMethod, this._sUrl, (this._sUrl.indexOf('?') > 0 ? '&' : '?'), this._sOptId ? 'id=' + this._sOptId : ''),
                        function () {
                            var code = ecui.esr.getData('confirmData_CODE');
                            var data = ecui.esr.getData('confirmData');

                            activeControl.enable();
                            if (code === 0) {
                                event.data = data;
                                if (ecui.dispatchEvent(this, 'afterShowDialog', event) === false) {
                                    return;
                                }
                                if (this._sTip) {
                                    ecui.tip('success', util.formatString(this._sTip, data.result));
                                }
                                if (dialog) {
                                    dialog.hide();
                                }
                                if (this._bReload) {
                                    ecui.esr.reload();
                                } else {
                                    var route = ecui.esr.findRoute(isNotOptionalSelect ? parent.getParent().getParent() : this);
                                    if (route) {
                                        ecui.esr.callRoute(route.NAME + '~FORMDEFAULT=true', true);
                                    }
                                }
                                ecui.dispatchEvent(this, 'confirmSuccess', event);
                            }
                        }.bind(this),
                        function () {
                            activeControl.enable();
                        }.bind(this)
                    );
                }
                if (this._bNoConfirm) {
                    confirmRequest.call(this, event);
                    return;
                }

                var dialog = frd.util.initDialog('dialogContainer_2', 'confirmDialog', {
                    NS: frd.util.getCurrentNS(),
                    options: this._oOptions,
                    title: this._sTitle,
                    content: this._sContent,
                    confirmText: this._sConfirmText,
                    cancelText: this._sCancelText
                });
                dialog.showModal();
                dialog.owner = this;
                dialog.onsubmit = confirmRequest.bind(this);
            },
            onsuccess: util.blank
        }
    };
    /*
     * 点击打开弹框的 按钮，适用于  编辑信息、查看详情 弹窗打开按钮
     * options    属性：
     * optId       操作的记录id
     * detailId    获取详情信息的记录id
     * url         获取详情信息的接口路径
     * container   dialog容器id
     * target      dialog 的 内容target 模板名称
     *
     */
    ext.showconfirmdialog = ext.confirm;
    ext.showsearchdialog = {
        constructor: function (value, options) {
            options.container = options.container || 'dialogSearchContainer';
            ext.showdialog.constructor.call(this, value, options);

            this._sRoute = options.route;
            ext.showsearchdialog.initDialog.call(this);
        },
        Events: {
            click: function () {
                this._uDialog.showModal();
            }
        },
        initDialog: function () {
            var dialog = frd.util.initDialog(
                this._sContainer,
                this._sTarget,
                {
                    NS: frd.util.getCurrentNS(),
                    optId: this._sOptId,
                    options: this._oOptions
                }
            );
            this._uDialog = dialog;
            dialog.hide();
            dom.addClass(this._uDialog.getMain(), 'ui-animation-dialog ui-search-dialog');
            dialog.owner = this;
            dialog.onsubmit = searchRoute.bind(this);
            dialog.onhide = this.dialogHide || util.blank;
        }
    };

    /**
     * control
     * 导出 - 按钮。
     */
    ext['export'] = {
        constructor: function (value, options) {
            this._sRoute = options.route;
            this._sExportUrl = options.exportUrl;
        },
        Events: {
            click: function () {
                var route = this._sRoute || ecui.esr.findRoute(this).children;
                if (route) {
                    route = ecui.esr.getRoute(route);
                    var exportForm = document.forms.exportForm;
                    if (!document.forms.exportForm) {
                        document.body.insertAdjacentHTML('beforeEnd', '<form name="exportForm" action="" method="post" style="display:none;"></form>');
                        exportForm = document.forms.exportForm;
                    }
                    exportForm.innerHTML = '';
                    exportForm.action = this._sExportUrl + '?x-access-token=' + localStorage.getItem('token');
                    var paramstr = [];
                    for (var key in route.searchParam) {
                        if (route.searchParam.hasOwnProperty(key)) {
                            var item = route.searchParam[key];
                            if (key !== '' && item !== '' && key !== 'pageNo' && key !== 'pageSize') {
                                if (item instanceof Array) {
                                    item.forEach(function (_item) {
                                        paramstr.push('<input type="hidden" name="' + key + '" value="' + _item + '" style="display:none;">');
                                    });
                                } else {
                                    paramstr.push('<input type="hidden" name="' + key + '" value="' + route.searchParam[key] + '">');
                                }
                            }
                        }
                    }
                    exportForm.innerHTML = paramstr.join('');
                    exportForm.submit();
                }
            }
        }
    };
    /**
     * control
     * 复制 - 按钮。
     */
    ext.copy = {
        constructor: function (value) {
            this._sText = value;
        },
        Events: {
            click: function (event) {
                ecui.util.clipboard(this._sText, function () {
                    ecui.tip('success', '复制成功');
                });
                event.stopPropagation();
            }
        }
    };

    /**
     * 权限统一处理 ext扩展控件
     * @public
     *
     */
    ext.permission = {
        /**
         * 构造函数
         * @public
         *
         * @param {string} value 权限名称字符串
         */
        constructor: function (value) {
            this._bPermission = frd.info.permissionList.indexOf(value || '') >= 0;
            if (!this._bPermission) {
                this.hide();
            }
        },
        Events: {

        }
    };
})();
    
    (function () {
    /* 自定义etpl过滤器 - begin */
    var defaultStr = '--';
    function isNumber (num) {
        return typeof num === 'number';
    }
    /*定义etpl过滤器
     *
     *addFilter参数
     *{string}name - 过滤器名称
     *{Function}filter - 过滤函数
     */

    etpl.addFilter('parseBaseInfo', function (source, nameSpace) {
        var baseInfoMap = frd.info.baseInfoMap[nameSpace];
        if (!baseInfoMap && baseInfoMap !== 0) {
            return source;
        }
        return source === undefined ? defaultStr : baseInfoMap[source.toString()] || defaultStr;
    });
    etpl.addFilter('toFixed', function (source, pow) {
        return frd.util.toFixed(source, pow);
    });

    etpl.addFilter('unit', function (source, unit) {
        // TODO 后台有可能返回 '-'而不是空
        if (!unit && unit !== 0) {
            return source;
        }
        unit = (unit || unit === 0 ? unit : '');
        return source + unit.toString();
    });

    etpl.addFilter('default', function (source, defaultFormat) {
        // TODO 后台有可能返回 '-'而不是空
        return (source !== 0 && !source) ? defaultFormat || defaultStr : source;
    });

    etpl.addFilter('decodeHtml', function (value) {
        return ecui.util.decodeHTML(value);
    });
    etpl.addFilter('deleteHtml', function (value) {
        return value ? value.replace(/<[^>]+>|&[^>]+;/g, "").trim() : defaultStr;
    });
    etpl.addFilter('replaceBrAll', function (value) {
        return (value || '').replace(/\<br\>/g, '\n');
    });
    etpl.addFilter('replaceAlltoBr', function (value) {
        value = typeof value === 'number' ? value : (value || defaultStr);
        return (value || '').replace(/\n/g, '<br/>');
    });
    // 解析文件大小
    etpl.addFilter('parseFileSize', function (source) {
        source = +source;
        if (isNaN(source)) {
            return source;
        }
        var unit = 'b';
        if (+source / 1024 > 1) {
            source = +source / 1024;
            unit = 'kb';
        } else {
            return source.toFixed(3) + ' ' + unit;
        }
        if (+source / 1024 > 1) {
            source = +source / 1024;
            unit = 'mb';
        }
        return source.toFixed(3) + ' ' + unit;
    });

    /**
     * 日期格式化filter
     *
     * @param {string} source 源串
     * @return {string} 替换结果串
     */
    etpl.addFilter('date', function (source, format, defaultValue) {
        if (!format) {
            return source;
        }
        defaultValue = defaultValue !== undefined ? defaultValue : defaultStr;
        if (!source) {
            return defaultValue;
        }
        var date = new Date(/^\d+$/.test(source) ? +source : source);
        if (date.toDateString() === 'Invalid Date') {
            return defaultValue ;
        }
        return ecui.util.formatDate(date, format);
    });

    // \n 转换成br标签 --代替
    etpl.addFilter('parseBr', function (source) {
        if (source === '' || !source) {
            return '';
        }
        source = etpl.filters.html(source + '');
        source = String(source).replace(/\\n|\n/g, '<br/>');
        return source;
    });

    // 文本空格替换 &nbsp
    etpl.addFilter('emptyToNbsp', function (source) {
        return source = (source || '').replace(/(\s)/g, '&nbsp');
    });

    // 数组字段join处理
    etpl.addFilter('joinArr', function (source, key, symbol) {
        if (!(source instanceof Array)) {
            return source;
        }
        return source.map(function (item) {
            return key !== undefined ? item[key] : item;
        }).join(symbol || ',');
    });

    etpl.addFilter('options', function (value) {
        return encodeURIComponent(value.replace(/%/g, '%25')).replace(/;/g, '%3B');
    });
   
    etpl.addFilter('parseIndex', function (source, searchParam) {
        if (!searchParam) {
            return +source + 1;
        }
        return searchParam.pageSize * (searchParam.pageNo - 1) + +source + 1;
    });

    /* 自定义etpl过滤器 - end */
}());
    (function () {

    var core = ecui,
        ui = core.ui,
        util = core.util,
        dom = core.dom,
        socket = null,
        isToucher = document.ontouchstart !== undefined,
        safariVersion = !/(chrome|crios|ucbrowser)/i.test(navigator.userAgent) && /(\d+\.\d)(\.\d)?\s+.*safari/i.test(navigator.userAgent) ? +RegExp.$1 : undefined,
        iosVersion = /(iPhone|iPad).*?OS (\d+(_\d+)?)/i.test(navigator.userAgent) ? +(RegExp.$2.replace('_', '.')) : undefined,
        QQVersion = /QQLiveBrowser\/(\d+\.\d)/i.test(navigator.userAgent) ? +RegExp.$1 : undefined,
        isWeixin = /MicroMessenger/i.test(navigator.userAgent) ? true : false,
        isFeishu = /Feishu/i.test(navigator.userAgent) ? true : false,
        now = new Date();

    ui.Icon.register('menuCollectIcon', 'M 915.17 234.67 c 24.73 0 44.79 -17.92 44.79 -40 s -20.06 -40 -44.79 -40 H 108.81 c -24.74 0 -44.81 17.91 -44.81 40 s 20.07 40 44.81 40 Z M 915.17 552 c 24.73 0 44.79 -17.93 44.79 -40 s -20.02 -40 -44.79 -40 H 460.81 c -24.74 0 -44.81 17.91 -44.81 40 s 20.07 40 44.81 40 Z M 70.33 498.18 a 18.73 18.73 0 0 0 -1.74 26.32 c 0.46 0.58 1.16 1.16 1.74 1.75 L 262.64 694 a 9.39 9.39 0 0 0 15.5 -7.11 V 337.08 a 9.34 9.34 0 0 0 -15.5 -7 Z M 108.81 789.33 c -24.74 0 -44.81 17.92 -44.81 40 s 20.07 40 44.81 40 H 915.17 c 24.73 0 44.79 -17.91 44.79 -40 s -20.06 -40 -44.79 -40 Z');
    // 菜单-首页
    ui.Icon.register('overview', 'M13.2846847,14.7027027 C13.6429234,14.7027027 13.9333333,14.9931126 13.9333333,15.3513514 C13.9333333,15.7095901 13.6429234,16 13.2846847,16 L5.71531532,16 C5.35707656,16 5.06666667,15.7095901 5.06666667,15.3513514 C5.06666667,14.9931126 5.35707656,14.7027027 5.71531532,14.7027027 L13.2846847,14.7027027 Z M17,0 C18.1045695,-2.02906125e-16 19,0.8954305 19,2 L19,12 C19,13.1045695 18.1045695,14 17,14 L2,14 C0.8954305,14 1.3527075e-16,13.1045695 0,12 L0,2 C-1.3527075e-16,0.8954305 0.8954305,2.02906125e-16 2,0 L17,0 Z M6.49166667,7.51351351 C6.17368454,7.51351351 5.91043576,7.74785483 5.86520029,8.05325749 L5.85833333,8.14684685 L5.85833333,10.0153153 C5.85833333,10.3650957 6.14188633,10.6486486 6.49166667,10.6486486 C6.8096488,10.6486486 7.07289758,10.4143073 7.11813304,10.1089047 L7.125,10.0153153 L7.125,8.14684685 C7.125,7.79706651 6.84144701,7.51351351 6.49166667,7.51351351 Z M9.23611111,5.75198728 C8.91812898,5.75198728 8.6548802,5.9863286 8.60964474,6.29173126 L8.60277778,6.38532061 L8.60277778,10.0153153 C8.60277778,10.3650957 8.88633077,10.6486486 9.23611111,10.6486486 C9.55409324,10.6486486 9.81734202,10.4143073 9.86257748,10.1089047 L9.86944444,10.0153153 L9.86944444,6.38532061 C9.86944444,6.03554027 9.58589145,5.75198728 9.23611111,5.75198728 Z M11.9277778,3.45945946 C11.6097956,3.45945946 11.3465469,3.69380077 11.3013114,3.99920343 L11.2944444,4.09279279 L11.2944444,9.96126126 C11.2944444,10.3110416 11.5779974,10.5945946 11.9277778,10.5945946 C12.2457599,10.5945946 12.5090087,10.3602533 12.5542442,10.0548506 L12.5611111,9.96126126 L12.5611111,4.09279279 C12.5611111,3.74301245 12.2775581,3.45945946 11.9277778,3.45945946 Z');
    // 菜单-持股平台
    ui.Icon.register('shareholdingPlatform', 'M12.1348315,0 C13.3759208,0 14.3820225,1.04044212 14.3820225,2.32389252 L14.3820225,4.64778504 C14.3820225,5.93123544 13.3759208,6.97167756 12.1348315,6.97167756 L10.73,6.971 L10.73,8.714 L14.1440846,8.71459695 C15.3896646,8.71459695 16.4044944,9.65521547 16.4044944,10.8097101 L16.4044944,11.8419898 C16.4044944,11.8855001 16.4002225,11.928069 16.3920456,11.9693565 L18.2022472,11.9680465 C19.1951187,11.9680465 20,12.8004002 20,13.8271605 L20,15.9186638 C20,16.9454241 19.1951187,17.7777778 18.2022472,17.7777778 L14.6067416,17.7777778 C13.6138701,17.7777778 12.8089888,16.9454241 12.8089888,15.9186638 L12.8089888,13.8271605 C12.8089888,12.8004002 13.6138701,11.9680465 14.6067416,11.9680465 L14.9100033,11.9693565 C14.9018264,11.928069 14.8975545,11.8855001 14.8975545,11.8419898 L14.8975545,10.8097101 C14.8975545,10.425606 14.5584931,10.1113391 14.1440846,10.1113391 L5.8559154,10.1113391 C5.44150694,10.1113391 5.10244547,10.425606 5.10244547,10.8097101 L5.10244547,11.8419898 C5.10244547,11.8855001 5.09817361,11.928069 5.08999666,11.9693565 L5.39325843,11.9680465 C6.38612989,11.9680465 7.19101124,12.8004002 7.19101124,13.8271605 L7.19101124,15.9186638 C7.19101124,16.9454241 6.38612989,17.7777778 5.39325843,17.7777778 L1.79775281,17.7777778 C0.804881349,17.7777778 0,16.9454241 0,15.9186638 L0,13.8271605 C0,12.8004002 0.804881349,11.9680465 1.79775281,11.9680465 L3.60795443,11.9693565 C3.59977748,11.928069 3.59550562,11.8855001 3.59550562,11.8419898 L3.59550562,10.8097101 C3.59550562,9.65521547 4.61033543,8.71459695 5.8559154,8.71459695 L9.382,8.714 L9.382,6.971 L7.86516854,6.97167756 C6.62407921,6.97167756 5.61797753,5.93123544 5.61797753,4.64778504 L5.61797753,2.32389252 C5.61797753,1.04044212 6.62407921,0 7.86516854,0 L12.1348315,0 Z M5.41568993,13.3629508 L1.79775281,13.362382 C1.5570567,13.362382 1.36055294,13.5580501 1.34886464,13.8039634 L1.34831461,15.9186638 C1.34831461,16.1675754 1.53752455,16.3707862 1.77532131,16.3828735 L1.79775281,16.3834423 L5.39325843,16.3834423 C5.63395454,16.3834423 5.8304583,16.1877742 5.84214659,15.9418609 L5.84269663,13.8271605 C5.84269663,13.5782489 5.65348669,13.375038 5.41568993,13.3629508 Z M18.2246787,13.3629508 L14.6067416,13.362382 C14.3660455,13.362382 14.1695417,13.5580501 14.1578534,13.8039634 L14.1573034,15.9186638 C14.1573034,16.1675754 14.3465133,16.3707862 14.5843101,16.3828735 L14.6067416,16.3834423 L18.2022472,16.3834423 C18.4429433,16.3834423 18.6394471,16.1877742 18.6511354,15.9418609 L18.6516854,13.8271605 C18.6516854,13.5782489 18.4624755,13.375038 18.2246787,13.3629508 Z');
    // 菜单-企业
    ui.Icon.register('company', 'M0.859090909,17.8314326 C0.384628101,17.8314326 5.81049359e-17,17.4468045 0,16.9723417 C-5.81049359e-17,16.4978789 0.384628101,16.1132508 0.859090909,16.1132508 L2.943,16.113 L2.94348776,3.8190195 C2.94348776,3.52914655 3.09647627,3.25537765 3.33803706,3.0979158 L3.43264837,3.04451521 L9.01723192,0.0993607475 C9.33314814,-0.0331202492 9.6796369,-0.0331202492 9.99555313,0.0993607475 C10.3305218,0.220321658 10.3596495,0.434733973 10.3621824,1.72771587 L10.3624236,17.1690276 L11.3407448,17.1690276 L11.3406098,3.27119645 C11.3483879,1.8460591 11.5380766,1.57147476 11.8299054,1.45474325 C12.1050582,1.3324531 12.4107836,1.3324531 12.6859364,1.45474325 L12.6859364,1.45474325 L17.5673516,4.00245473 C17.8628862,4.14512657 18.0565122,4.43047026 18.0565122,4.75657732 L18.0565122,4.75657732 L18.0565122,15.8951719 C18.0559919,15.9646618 18.0554325,16.0372285 18.0548341,16.1128719 L20.1409091,16.1132508 C20.6153719,16.1132508 21,16.4978789 21,16.9723417 C21,17.4468045 20.6153719,17.8314326 20.1409091,17.8314326 L0.859090909,17.8314326 Z M7.34593319,12.6544829 L5.93959646,12.6544829 C5.79692462,12.6544829 5.68482531,12.7665822 5.68482531,12.909254 L5.68482531,12.909254 L5.68482531,14.101583 C5.68482531,14.2442549 5.79692462,14.3563542 5.93959646,14.3563542 L5.93959646,14.3563542 L7.31536066,14.3563542 C7.4580325,14.3563542 7.5701318,14.2442549 7.5701318,14.101583 L7.5701318,14.101583 L7.60070434,12.909254 C7.60070434,12.7665822 7.48860504,12.6544829 7.34593319,12.6544829 L7.34593319,12.6544829 Z M15.3559381,12.6341012 L13.9496013,12.6341012 C13.8069295,12.6341012 13.6948302,12.7462005 13.6948302,12.8888724 L13.6948302,12.8888724 L13.6948302,14.0913922 C13.6948302,14.234064 13.8069295,14.3461633 13.9496013,14.3461633 L13.9496013,14.3461633 L15.3559381,14.3461633 C15.4986099,14.3461633 15.6107092,14.234064 15.6107092,14.0913922 L15.6107092,14.0913922 L15.6107092,12.8888724 C15.6107092,12.7462005 15.4986099,12.6341012 15.3559381,12.6341012 L15.3559381,12.6341012 Z M7.34593319,9.0367326 L5.93959646,9.0367326 C5.79692462,9.0367326 5.68482531,9.14883191 5.68482531,9.29150375 L5.68482531,9.29150375 L5.68482531,10.5042144 C5.68482531,10.6468863 5.79692462,10.7589856 5.93959646,10.7589856 L5.93959646,10.7589856 L7.31536066,10.7589856 C7.4580325,10.7589856 7.5701318,10.6468863 7.5701318,10.5042144 L7.5701318,10.5042144 L7.60070434,9.29150375 C7.60070434,9.14883191 7.48860504,9.0367326 7.34593319,9.0367326 L7.34593319,9.0367326 Z M15.3559381,9.0367326 L13.9496013,9.0367326 C13.8069295,9.0367326 13.6948302,9.14883191 13.6948302,9.29150375 L13.6948302,9.29150375 L13.6948302,10.4940236 C13.6948302,10.6366954 13.8069295,10.7487947 13.9496013,10.7487947 L13.9496013,10.7487947 L15.3559381,10.7487947 C15.4986099,10.7487947 15.6107092,10.6366954 15.6107092,10.4940236 L15.6107092,10.4940236 L15.6107092,9.29150375 C15.6107092,9.14883191 15.4986099,9.0367326 15.3559381,9.0367326 L15.3559381,9.0367326 Z M7.34593319,5.439364 L5.93959646,5.439364 C5.79692462,5.439364 5.68482531,5.5514633 5.68482531,5.69413515 L5.68482531,5.69413515 L5.68482531,6.91703666 C5.68482531,7.0597085 5.79692462,7.1718078 5.93959646,7.1718078 L5.93959646,7.1718078 L7.31536066,7.1718078 C7.4580325,7.1718078 7.5701318,7.0597085 7.5701318,6.91703666 L7.5701318,6.91703666 L7.60070434,5.69413515 C7.60070434,5.5514633 7.48860504,5.439364 7.34593319,5.439364 L7.34593319,5.439364 Z M15.3559381,5.439364 L13.9496013,5.439364 C13.8069295,5.439364 13.6948302,5.5514633 13.6948302,5.69413515 L13.6948302,5.69413515 L13.6948302,6.90684581 C13.6948302,7.04951765 13.8069295,7.16161696 13.9496013,7.16161696 L13.9496013,7.16161696 L15.3559381,7.16161696 C15.4986099,7.16161696 15.6107092,7.04951765 15.6107092,6.90684581 L15.6107092,6.90684581 L15.6107092,5.69413515 C15.6107092,5.5514633 15.4986099,5.439364 15.3559381,5.439364 L15.3559381,5.439364 Z');
    // 菜单-合伙人
    ui.Icon.register('partner', 'M6.51162738,0 C8.87478998,0 10.7906968,1.91590682 10.7906968,4.27906942 C10.7906968,5.8202786 9.97581315,7.17134826 8.75311557,7.92483657 C11.0414875,8.87627835 12.6511618,11.1337665 12.6511618,13.7674407 L12.6511618,13.9534872 C12.6511618,15.0837443 11.7349074,16 10.6046503,16 L2.04651146,16 C0.916254391,16 0,15.0837443 0,13.9534872 L0,13.7674407 C0,11.0459526 1.71832544,8.72632488 4.12948804,7.83367379 C2.94320226,7.03997493 2.23152638,5.70638535 2.23255796,4.27906942 C2.23255796,1.91590682 4.14846478,0 6.51162738,0 Z M11.9813944,1.53599988 C12.1425106,1.60669754 12.2980455,1.688558 12.4465106,1.78009288 C13.4920919,2.42493004 14.1395337,3.51851134 14.1395337,4.71925543 C14.1395337,5.81209255 13.6037198,6.80297619 12.7471618,7.45265056 C14.688743,8.41897606 15.9999994,10.5417666 15.9999994,12.9503245 C16.0008066,13.9112998 15.2453629,14.7028106 14.2853942,14.7467895 L14.2053942,14.74865 L13.9211152,14.74865 C13.6233258,14.74865 13.3779443,14.5149592 13.3635344,14.2175186 C13.3491245,13.9200781 13.570762,13.6637112 13.8671617,13.6349756 L13.9211152,13.632371 L14.2053942,13.632371 C14.5797198,13.632371 14.8837197,13.3272547 14.8837197,12.9503245 C14.8837197,10.5570224 13.328371,8.53097605 11.2342316,8.10009237 C10.932385,8.03797974 10.7379985,7.74298538 10.7999991,7.44111568 L10.8037201,7.42288312 C10.8469788,7.22307943 10.9960105,7.06291314 11.1921851,7.00539478 C12.2805571,6.68539481 13.0232548,5.76186 13.0232548,4.71925543 C13.0232548,3.91702294 12.5853013,3.17730207 11.8608363,2.73041838 C11.7550333,2.66515947 11.644884,2.6072254 11.5311619,2.55702305 C11.3433587,2.48010693 11.2121049,2.30731292 11.1883842,2.10576031 C11.1646635,1.9042077 11.2522144,1.70566258 11.417029,1.5872469 C11.5818436,1.46883122 11.797946,1.44920811 11.9813944,1.53599988 Z');
    // 菜单-财税管理
    ui.Icon.register('finance', 'M7.49988344,1.80161032e-06 C8.28370669,-0.00089937329 9.02983243,0.336317154 9.54707702,0.925246468 L11.168468,0.848199716 C11.7296738,0.821398042 12.2498731,1.14154082 12.4788224,1.65462225 C12.7077716,2.16770368 12.5986005,2.7686866 12.2038263,3.16846607 L11.0293747,4.35723609 C12.5314455,5.22077337 13.7328293,6.61818327 14.4173863,8.31628005 C15.0163737,9.80062324 15.1534214,11.4653104 14.8288705,13.3093187 C14.6567479,14.2873029 13.8070792,15.0002563 12.8140639,15.0002563 L2.18570302,15.0002563 C1.19268773,15.0002563 0.343018999,14.2873029 0.170896356,13.3093187 C-0.153313651,11.4653104 -0.0162658878,9.80130507 0.582380559,8.31628005 C1.26761937,6.61750144 2.46968508,5.21940971 3.97277858,4.35621335 L2.79934972,3.16880699 C2.40443031,2.76914724 2.29506517,2.16817822 2.52386745,1.65501278 C2.75266973,1.14184734 3.27279647,0.821546434 3.83402624,0.848199716 L5.4533717,0.925246468 C5.97045943,0.336496151 6.71629799,-0.000702888651 7.49988344,1.80161032e-06 Z M9.20276717,6.05416975 C8.95932981,5.913617 8.64808755,5.99590446 8.50592311,6.23840414 L8.50592311,6.23840414 L7.49988344,7.98047894 L6.49384377,6.23840414 C6.35167933,5.99590446 6.04043708,5.913617 5.79699972,6.05416975 C5.55356236,6.19472249 5.46921216,6.50541207 5.60814703,6.74977639 L5.60814703,6.74977639 L6.4348655,8.18195961 L5.62485186,8.18195961 C5.34242876,8.18195961 5.11347961,8.41090876 5.11347961,8.69333186 C5.11347961,8.97575495 5.34242876,9.20470411 5.62485186,9.20470411 L5.62485186,9.20470411 L6.98851119,9.20470411 L6.98851119,10.2274486 L5.62485186,10.2274486 C5.34242876,10.2274486 5.11347961,10.4563978 5.11347961,10.7388209 C5.11347961,11.021244 5.34242876,11.2501931 5.62485186,11.2501931 L5.62485186,11.2501931 L6.98851119,11.2501931 L6.98851119,12.7843099 C6.9885112,13.0667329 7.21746035,13.2956821 7.49988344,13.2956821 C7.78230653,13.2956821 8.01125568,13.0667329 8.01125569,12.7843099 L8.01125569,12.7843099 L8.01125569,11.2501931 L9.37491502,11.2501931 C9.65733812,11.2501931 9.88628727,11.021244 9.88628727,10.7388209 C9.88628727,10.4563978 9.65733812,10.2274486 9.37491502,10.2274486 L9.37491502,10.2274486 L8.01125569,10.2274486 L8.01125569,9.20470411 L9.37491502,9.20470411 C9.65733812,9.20470411 9.88628727,8.97575495 9.88628727,8.69333186 C9.88628727,8.41090876 9.65733812,8.18195961 9.37491502,8.18195961 L9.37491502,8.18195961 L8.56456047,8.18161869 L9.39161985,6.74977639 C9.53055473,6.50541207 9.44620453,6.19472249 9.20276717,6.05416975 Z');
    // 菜单-分红管理
    ui.Icon.register('bonus', 'M6.54399468e-05,9.89925502 C-0.0155794511,6.11597172 2.77572074,2.819073 6.49396302,2.23278239 C7.41566815,2.08555247 8.22216014,2.80855657 8.22216014,3.71296898 L8.22216014,8.74770666 C8.22216014,8.97906798 8.41069074,9.1683636 8.64111702,9.1683636 L13.8335638,9.1683636 C14.2629946,9.1683636 14.6714776,9.35503011 14.951655,9.67841013 C15.2378485,10.0083445 15.3677273,10.4465465 15.3077683,10.8799115 C14.8076386,14.5527724 11.998009,17.202911 8.31118848,17.476338 C8.12527636,17.4921127 7.93412729,17.5 7.74297821,17.5 C3.49318439,17.5 0.0184607951,14.0900497 6.54399468e-05,9.89925502 Z M11.1365417,0.022998512 C14.3310879,0.585627162 16.8762509,3.0780195 17.4732645,6.22243008 C17.5570558,6.66411986 17.4418427,7.11369696 17.1564283,7.46073893 C16.8736324,7.80515179 16.4546756,8.00233473 16.0095339,8.00233473 L10.8720752,8.00233473 C10.0498723,8.00233473 9.38215979,7.33191274 9.38215979,6.50637351 L9.38215979,1.49792689 C9.38215979,0.585627162 10.2069811,-0.14000605 11.1365417,0.022998512 Z M10.8773121,1.07201174 C10.6442674,1.07201174 10.4531183,1.26130736 10.4531183,1.49792689 L10.4531183,6.50900262 C10.4531183,6.74036393 10.6416489,6.92965955 10.8720752,6.92965955 L16.0069154,6.92965955 C16.1797351,6.92965955 16.2844743,6.83238263 16.331607,6.77454231 C16.3787396,6.71670198 16.4546756,6.593134 16.4206353,6.42224212 C15.9074131,3.71426311 13.7078895,1.56628364 10.9480111,1.07726995 C10.9270633,1.07464085 10.9008785,1.07201174 10.8773121,1.07201174 Z');
    // 菜单-设置
    ui.Icon.register('setting', 'M7.5264898,0.635054786 L7.68746938,0.806881516 C7.87759183,0.985664786 8.18359183,1.10114346 8.50277551,1.10114346 C8.81987755,1.10114346 9.12032654,0.985664786 9.34930611,0.774185737 L9.47767347,0.635054786 C10.0119592,0.0715744617 10.9500816,-0.151035056 11.6647755,0.109835485 C11.7237551,0.131400775 12.0575102,0.260096905 12.7472245,0.65522878 C13.4501225,1.05940418 13.7283673,1.28827457 13.7776327,1.3293182 C14.3702041,1.83366788 14.6345714,2.7366277 14.4062857,3.47541301 L14.3410612,3.67367461 C14.2786122,3.97211048 14.3292653,4.28376379 14.4853878,4.55437349 C14.6422041,4.82359186 14.8947755,5.02463607 15.1959184,5.11994077 L15.3784082,5.16168006 C16.1347347,5.32724587 16.7883673,6.00759619 16.926449,6.77907728 C16.9389388,6.84655579 16.9958367,7.20551362 17,7.9943861 C17,8.80551951 16.9403265,9.16099906 16.9292245,9.22430364 C16.7890612,9.98395859 16.1382041,10.6629176 15.3818775,10.8361356 L15.175102,10.8834401 C14.8856822,10.9805104 14.6421033,11.1811232 14.4909388,11.4469205 C14.3298003,11.7234584 14.2818014,12.0518341 14.3570204,12.3630977 L14.4090612,12.5272723 C14.6352653,13.2716228 14.3674286,14.1731913 13.7727755,14.6719758 C13.7512653,14.6907584 13.4723265,14.927281 12.7513878,15.3411956 C12.0602857,15.7356318 11.7223674,15.8657193 11.662,15.8872846 C11.4501302,15.9625706 11.2269054,16.0006936 11.0021224,16 L11.0014286,16 C10.4185714,16 9.84889795,15.7613711 9.4762857,15.3620652 L9.31808162,15.1923255 C9.12726529,15.0128466 8.81987755,14.8959766 8.50069388,14.8959766 C8.18289796,14.8959766 7.87967348,15.0142379 7.64514286,15.2298909 L7.52718367,15.358587 C6.99289795,15.9234586 6.05477551,16.1474594 5.33730612,15.8851976 C5.24918368,15.8525018 4.91334693,15.7182405 4.25416327,15.3398043 C3.56861226,14.9453681 3.27995919,14.7116281 3.22861224,14.6691931 C2.63257143,14.1620608 2.36820409,13.259101 2.59648979,12.5196201 L2.65893877,12.3095323 C2.72138775,12.0479662 2.66865306,11.7223997 2.50836735,11.4448335 C2.34860663,11.1654717 2.08689836,10.9592103 1.77840816,10.869527 L1.62089797,10.83544 C0.860408176,10.6684828 0.206775524,9.9867412 0.0693877483,9.21456446 L0.0637962668,9.18173889 C0.0483084331,9.08349845 0.00760837588,8.77132543 0.000932587417,8.16929736 L0,7.99786436 C0,7.16099173 0.0638367414,6.80690347 0.0721632721,6.76933813 C0.210938789,6.01316146 0.861795918,5.33420244 1.6195102,5.16098441 L1.85334693,5.10811466 C2.10036735,5.0336796 2.35293877,4.82776581 2.51391837,4.55159087 C2.67073469,4.28028553 2.71861224,3.9595887 2.64991837,3.64654407 L2.59648979,3.47471737 C2.3675102,2.72758419 2.63604081,1.82601568 3.23138775,1.32792689 C3.25220407,1.30983986 3.52906122,1.07470858 4.24930611,0.658011392 C4.90571427,0.282357842 5.24710203,0.145313855 5.33591836,0.111922449 C6.07836734,-0.153817648 6.99636734,0.0667048855 7.5264898,0.635054786 Z M8.49999999,4.71013007 C6.59392905,4.71013007 5.04470663,6.2633204 5.04470663,8.17386501 C5.046711,10.0859836 6.59235862,11.63559 8.49983206,11.6375998 C10.4053771,11.6375998 11.9552934,10.083714 11.9552934,8.17386501 C11.9552934,6.26355532 10.4056114,4.71013007 8.49999999,4.71013007 Z');
    // 字段管理
    ui.Icon.register('field', 'M7.5264898,0.635054786 L7.68746938,0.806881516 C7.87759183,0.985664786 8.18359183,1.10114346 8.50277551,1.10114346 C8.81987755,1.10114346 9.12032654,0.985664786 9.34930611,0.774185737 L9.47767347,0.635054786 C10.0119592,0.0715744617 10.9500816,-0.151035056 11.6647755,0.109835485 C11.7237551,0.131400775 12.0575102,0.260096905 12.7472245,0.65522878 C13.4501225,1.05940418 13.7283673,1.28827457 13.7776327,1.3293182 C14.3702041,1.83366788 14.6345714,2.7366277 14.4062857,3.47541301 L14.3410612,3.67367461 C14.2786122,3.97211048 14.3292653,4.28376379 14.4853878,4.55437349 C14.6422041,4.82359186 14.8947755,5.02463607 15.1959184,5.11994077 L15.3784082,5.16168006 C16.1347347,5.32724587 16.7883673,6.00759619 16.926449,6.77907728 C16.9389388,6.84655579 16.9958367,7.20551362 17,7.9943861 C17,8.80551951 16.9403265,9.16099906 16.9292245,9.22430364 C16.7890612,9.98395859 16.1382041,10.6629176 15.3818775,10.8361356 L15.175102,10.8834401 C14.8856822,10.9805104 14.6421033,11.1811232 14.4909388,11.4469205 C14.3298003,11.7234584 14.2818014,12.0518341 14.3570204,12.3630977 L14.4090612,12.5272723 C14.6352653,13.2716228 14.3674286,14.1731913 13.7727755,14.6719758 C13.7512653,14.6907584 13.4723265,14.927281 12.7513878,15.3411956 C12.0602857,15.7356318 11.7223674,15.8657193 11.662,15.8872846 C11.4501302,15.9625706 11.2269054,16.0006936 11.0021224,16 L11.0014286,16 C10.4185714,16 9.84889795,15.7613711 9.4762857,15.3620652 L9.31808162,15.1923255 C9.12726529,15.0128466 8.81987755,14.8959766 8.50069388,14.8959766 C8.18289796,14.8959766 7.87967348,15.0142379 7.64514286,15.2298909 L7.52718367,15.358587 C6.99289795,15.9234586 6.05477551,16.1474594 5.33730612,15.8851976 C5.24918368,15.8525018 4.91334693,15.7182405 4.25416327,15.3398043 C3.56861226,14.9453681 3.27995919,14.7116281 3.22861224,14.6691931 C2.63257143,14.1620608 2.36820409,13.259101 2.59648979,12.5196201 L2.65893877,12.3095323 C2.72138775,12.0479662 2.66865306,11.7223997 2.50836735,11.4448335 C2.34860663,11.1654717 2.08689836,10.9592103 1.77840816,10.869527 L1.62089797,10.83544 C0.860408176,10.6684828 0.206775524,9.9867412 0.0693877483,9.21456446 L0.0637962668,9.18173889 C0.0483084331,9.08349845 0.00760837588,8.77132543 0.000932587417,8.16929736 L0,7.99786436 C0,7.16099173 0.0638367414,6.80690347 0.0721632721,6.76933813 C0.210938789,6.01316146 0.861795918,5.33420244 1.6195102,5.16098441 L1.85334693,5.10811466 C2.10036735,5.0336796 2.35293877,4.82776581 2.51391837,4.55159087 C2.67073469,4.28028553 2.71861224,3.9595887 2.64991837,3.64654407 L2.59648979,3.47471737 C2.3675102,2.72758419 2.63604081,1.82601568 3.23138775,1.32792689 C3.25220407,1.30983986 3.52906122,1.07470858 4.24930611,0.658011392 C4.90571427,0.282357842 5.24710203,0.145313855 5.33591836,0.111922449 C6.07836734,-0.153817648 6.99636734,0.0667048855 7.5264898,0.635054786 Z M8.49999999,4.71013007 C6.59392905,4.71013007 5.04470663,6.2633204 5.04470663,8.17386501 C5.046711,10.0859836 6.59235862,11.63559 8.49983206,11.6375998 C10.4053771,11.6375998 11.9552934,10.083714 11.9552934,8.17386501 C11.9552934,6.26355532 10.4056114,4.71013007 8.49999999,4.71013007 Z');
    // 放大镜搜索
    ui.Icon.register('search', 'M13.3290801,14 C13.1546025,14.000546 12.9868229,13.9328412 12.861569,13.8113367 L10.7639671,11.7325701 C10.7308263,11.6987195 10.7011633,11.6616292 10.6754233,11.6218561 L10.6231825,11.5332849 L10.545264,11.5952847 C9.39805997,12.5070974 7.9764608,13.004312 6.51120982,13.0062243 L6.50235544,13.0062243 C3.46923198,13.0066116 0.838922987,10.908809 0.16374989,7.95087022 C-0.511423208,4.99293143 0.947991754,1.96103783 3.6806963,0.644512825 C6.41340085,-0.672012184 9.69307791,0.0767464926 11.5841705,2.44889623 C13.4752631,4.82104597 13.4751435,8.18610045 11.5838824,10.5581157 L11.5219017,10.6351727 L11.6060183,10.6883154 C11.6460871,10.7140147 11.6834644,10.7436884 11.7175835,10.7768866 L13.8196126,12.8609675 C14.0661655,13.1278194 14.0591429,13.541498 13.8036747,13.7998224 C13.6774667,13.9269568 13.5055354,13.9981118 13.3264238,13.9973362 L13.3290801,14 Z M6.50501175,1.21650902 C4.36512766,1.21615085 2.43575121,2.50530987 1.61660485,4.4828151 C0.797458493,6.46032032 1.2498718,8.73670522 2.76287174,10.2504276 C4.27587168,11.7641499 6.55147531,12.2170845 8.52850473,11.3980152 C10.5055341,10.5789459 11.7946166,8.64918706 11.7946166,6.50863952 C11.791689,3.5874362 9.42530918,1.21992653 6.50501175,1.21650902 Z');
    // 复选框-选中
    ui.Icon.register('checkbox-checked', 'M6.99984069,3.29548898e-16 C3.14081526,3.29548898e-16 -4.31940105e-16,3.14049662 -4.31940105e-16,6.99984067 C-4.31940105e-16,10.8591847 3.14049662,14 6.99984069,14 C10.8591848,14 14,10.8595034 14,6.99984067 C13.9996814,3.14049662 10.8591847,3.29548898e-16 6.99984069,3.29548898e-16 Z M10.9168582,5.65773721 L6.36383913,10.3248287 C6.2547105,10.4361461 6.10549574,10.4990459 5.94960966,10.4994427 L5.94642328,10.4994427 C5.79186529,10.4996106 5.64356309,10.4384101 5.53410565,10.3292897 L3.08728406,7.88087488 C2.97775549,7.77154976 2.91620585,7.62315092 2.91620585,7.46839793 C2.91620585,7.31364493 2.97775549,7.16524609 3.08728406,7.05592097 C3.19660918,6.9463924 3.34500802,6.88484276 3.49976102,6.88484276 C3.65451401,6.88484276 3.80291285,6.9463924 3.91223797,7.05592097 L5.94355555,9.08564535 L10.0826638,4.84043062 C10.308066,4.61054104 10.6769491,4.60626661 10.9076177,4.83087147 C11.1376402,5.05702011 11.1417693,5.42650454 10.9168582,5.65773721 L10.9168582,5.65773721 Z');
    // 删除按钮
    ui.Icon.register('delete', 'M11.76,2.43055556 L9.065,2.43055556 L9.065,1.45833333 C9.065,0.65625 8.4035,0 7.595,0 L4.655,0 C3.8465,0 3.185,0.65625 3.185,1.45833333 L3.185,2.43055556 L0.49,2.43055556 C0.2205,2.43055556 0,2.64930556 0,2.91666667 C0,3.18402778 0.2205,3.40277778 0.49,3.40277778 L1.225,3.40277778 L1.225,11.1805556 C1.225,12.25 2.107,13.125 3.185,13.125 L9.065,13.125 C10.143,13.125 11.025,12.25 11.025,11.1805556 L11.025,3.40277778 L11.76,3.40277778 C12.0295,3.40277778 12.25,3.18402778 12.25,2.91666667 C12.25,2.64930556 12.0295,2.43055556 11.76,2.43055556 Z M4.165,1.45833333 C4.165,1.19097222 4.3855,0.972222222 4.655,0.972222222 L7.595,0.972222222 C7.8645,0.972222222 8.085,1.19097222 8.085,1.45833333 L8.085,2.43055556 L4.165,2.43055556 L4.165,1.45833333 Z M10.045,11.1805556 C10.045,11.7152778 9.604,12.1527778 9.065,12.1527778 L3.185,12.1527778 C2.646,12.1527778 2.205,11.7152778 2.205,11.1805556 L2.205,3.40277778 L10.045,3.40277778 L10.045,11.1805556 ZM4.655,5.34722222 C4.3855,5.34722222 4.165,5.56597222 4.165,5.83333333 L4.165,9.72222222 C4.165,9.98958333 4.3855,10.2083333 4.655,10.2083333 C4.9245,10.2083333 5.145,9.98958333 5.145,9.72222222 L5.145,5.83333333 C5.145,5.56597222 4.9245,5.34722222 4.655,5.34722222 Z M7.595,5.34722222 C7.3255,5.34722222 7.105,5.56597222 7.105,5.83333333 L7.105,9.72222222 C7.105,9.98958333 7.3255,10.2083333 7.595,10.2083333 C7.8645,10.2083333 8.085,9.98958333 8.085,9.72222222 L8.085,5.83333333 C8.085,5.56597222 7.8645,5.34722222 7.595,5.34722222 Z');
    // 锁定
    ui.Icon.register('lock', 'M9.36764706,5.95 C9.92196226,5.95 10.3713235,6.42010101 10.3713235,7 L10.3713235,11.9 C10.3713235,12.479899 9.92196226,12.95 9.36764706,12.95 L2.00735294,12.95 C1.45303774,12.95 1.00367647,12.479899 1.00367647,11.9 L1.00367647,7 C1.00367647,6.42010101 1.45303774,5.95 2.00735294,5.95 L9.36764706,5.95 M9.36764706,4.89999999 L2.00735294,4.89999999 C0.898722526,4.89999999 0,5.84020202 0,7 L0,11.9 C0,13.059798 0.898722531,14 2.00735294,14 L9.36764706,14 C10.4762775,14 11.375,13.059798 11.375,11.9 L11.375,7 C11.375,5.84020202 10.4762775,4.89999999 9.36764706,4.89999999 ZM5.6875,1.04999999 C6.98090215,1.04999999 8.02941176,2.14690235 8.02941176,3.49999999 L8.02941176,4.89999999 L3.34558824,4.89999999 L3.34558824,3.49999999 C3.34558824,2.14690235 4.39409785,1.04999999 5.6875,1.04999999 M5.6875,0 C3.83978264,0 2.34191176,1.56700337 2.34191176,3.5 L2.34191176,5.95 L9.03308824,5.95 L9.03308824,3.5 C9.03308824,1.56700337 7.53521736,0 5.6875,0 Z M5.6875,11.025 C5.4103424,11.025 5.18566176,10.7899495 5.18566176,10.5 L5.18566176,8.4 C5.18566176,8.11005051 5.4103424,7.875 5.6875,7.875 C5.9646576,7.875 6.18933824,8.11005051 6.18933824,8.4 L6.18933824,10.5 C6.18933824,10.7899495 5.9646576,11.025 5.6875,11.025 L5.6875,11.025 Z');
    // 锁定2
    ui.Icon.register('lock-2', 'M8,11.5384584 C8.8800089,11.5384584 9.60001114,12.2307681 9.60001114,13.0769303 C9.60001114,13.6153874 9.27999779,14.1442388 8.80000557,14.3750176 L8.80000557,16.153874 C8.80000557,16.6154048 8.47999222,16.9231099 8,16.9231099 C7.52000778,16.9231099 7.19999443,16.6154048 7.19999443,16.153874 L7.19999443,14.3750176 C6.72000221,14.1442388 6.39998886,13.6154142 6.39998886,13.0769303 C6.39998886,12.2307681 7.12001892,11.5384584 8,11.5384584 Z M8,0 C5.34093945,0 3.19999443,2.05860043 3.19999443,4.61538873 L3.19999443,7.69230563 C1.44000445,7.69230563 0,9.07692493 0,10.7692225 L0,16.9230831 C0,18.6154075 1.44000445,20 3.19999443,20 L12.8000056,20 C14.5599956,20 16,18.6153807 16,16.9230831 L16,10.7692225 C16,9.07692493 14.5599956,7.69230563 12.8000056,7.69230563 L4.80000557,7.69230563 L4.80000557,4.61538873 C4.80000557,2.86446662 6.17906836,1.53847184 8,1.53847184 C9.82095949,1.53847184 11.1999944,2.8644934 11.1999944,4.61538873 L11.1999944,7.69230563 L12.8000056,7.69230563 L12.8000056,4.61538873 C12.8000056,2.05860043 10.6590606,0 8,0 Z');
    // 排序-升序
    ui.Icon.register('sortAsc', 'M2.44798766,4.26870965 L9.55435128,4.26870965 C9.8869151,4.26870965 10.1144588,4.05866934 9.93942517,3.8661324 C9.74688823,3.67359545 6.52627023,0.27794387 6.38624336,0.137917001 C6.22871314,-0.0371165855 5.80863253,-0.0546199442 5.59859222,0.137917001 C5.45856535,0.312950588 2.32546415,3.58607866 2.06291377,3.8661324 C1.88788019,4.04116598 2.09792049,4.26870965 2.44798766,4.26870965 Z');
    // 排序-降序
    ui.Icon.register('sortDesc', 'M7.55435128,4.26325641e-14 L0.447987664,4.26325641e-14 C0.0979204905,4.26325641e-14 -0.112119813,0.227543663 0.0629137732,0.402577249 C0.325464153,0.682630988 3.45856535,3.95575906 3.61609558,4.11328929 C3.80863253,4.32332959 4.22871314,4.28832287 4.40374672,4.11328929 C4.52627023,3.99076578 7.74688823,0.595114195 7.93942517,0.402577249 C8.11445876,0.210040304 7.8869151,0.0175033587 7.55435128,4.26325641e-14 Z');
    // 编辑
    ui.Icon.register('edit', 'M4.45871936,7.53912201 C4.449684,7.55062154 4.44064866,7.562741 4.43658818,7.57732464 L3.73914612,10.134359 C3.69847932,10.283233 3.740138,10.4436531 3.85034444,10.5567422 C3.93277843,10.6372699 4.04138858,10.6815322 4.15706583,10.6815322 C4.19526846,10.6815322 4.23354857,10.6769603 4.27122426,10.6669486 L6.81011046,9.97448143 C6.81418644,9.97448143 6.81615468,9.97804597 6.81922329,9.97804597 C6.84839057,9.97804597 6.87704641,9.96742982 6.89868166,9.94531414 L13.6877613,3.15722636 C13.8894216,2.95530262 14,2.68024369 14,2.38097685 C14,2.04188009 13.8561783,1.70292283 13.60432,1.45173087 L12.9631512,0.809539266 C12.7116803,0.557680888 12.3722426,0.413595759 12.0333008,0.413595759 C11.7341115,0.413595759 11.4590681,0.524205148 11.2568963,0.72561747 L4.46882407,7.51551852 C4.46177246,7.5219967 4.46375621,7.53158998 4.45871936,7.53912201 M13.0234541,2.49242315 L12.3491041,3.16626171 L11.25592,2.05571985 L11.9207077,1.39091663 C12.0257533,1.2852976 12.2294283,1.30070264 12.3501269,1.42183519 L12.9917296,2.06402679 C13.0586811,2.13086977 13.0968527,2.21985942 13.0968527,2.30785718 C13.0964497,2.37998498 13.070754,2.44543314 13.0234541,2.49242315 M5.66610838,7.64577942 L10.5650026,2.74660624 L11.6587291,3.85789201 L6.76894772,8.74744092 L5.66610838,7.64577942 L5.66610838,7.64577942 Z M4.7735617,9.63202159 L5.12758304,8.33258982 L6.0719086,9.27700837 L4.7735617,9.63202159 L4.7735617,9.63202159 Z M13.0814941,5.18243058 C12.8245059,5.18243058 12.5982968,5.39137493 12.5973049,5.65185021 L12.5973049,12.0038546 C12.5973049,12.3357293 12.3277788,12.5931049 11.9953772,12.5931049 L1.55301043,12.5931049 C1.22112026,12.5931049 0.973756316,12.3357603 0.973756316,12.0038546 L0.973756316,1.55017431 C0.973756316,1.21803617 1.22110477,0.967975556 1.55301043,0.967975556 L8.71942047,0.967975556 C8.97785001,0.967975556 9.18753827,0.738325848 9.18753827,0.479818808 C9.18753827,0.221823216 8.97783452,0 8.71942047,0 L1.48159554,0 C0.672474732,0 0,0.669654118 0,1.47925536 L0,12.0753005 C0,12.8849327 0.672490241,13.5659159 1.48159554,13.5659159 L12.0662341,13.5659159 C12.8759439,13.5659159 13.5650945,12.8849327 13.5650945,12.0753005 L13.5650945,5.64889009 C13.5641026,5.39137493 13.3384204,5.18243058 13.0814941,5.18243058');
    // 消息
    ui.Icon.register('message', 'M12.5189964,11.1287508 C12.3038458,10.601567 12.227515,10.0800311 12.227515,9.7936153 L12.227515,7.41206566 L12.2441253,7.41206566 C12.2441253,5.18004205 10.7961704,3.28011778 8.77188212,2.56683966 L8.77188212,1.72489338 C8.77188212,0.773778432 7.983385,0 7.0141781,0 C6.0449712,0 5.25647408,0.773778432 5.25647408,1.72489338 L5.25647408,2.55658053 C3.21666829,3.26169066 1.75452547,5.16915735 1.75452547,7.41206566 L1.77241068,7.41206566 L1.77241068,9.79359742 C1.77241068,10.0800132 1.69607983,10.6015491 1.4809474,11.128733 C1.21068411,11.7910192 0.797065981,12.3088018 0.25160366,12.6677465 C0.0440226238,12.8043838 -0.0481207157,13.0581427 0.0246347645,13.2928093 C0.0973902447,13.5274758 0.317937962,13.6878742 0.567891305,13.6879051 L4.12854054,13.6879051 C4.39113614,15.0038986 5.5751112,16 6.99188534,16 C8.40865947,16 9.59265274,15.0038986 9.85524835,13.6879051 L13.432089,13.6879051 C13.6820527,13.6878984 13.9026193,13.5274984 13.9753713,13.2928201 C14.0481233,13.0581418 13.9559512,12.8043762 13.7483402,12.6677644 C13.2028779,12.3088197 12.7892597,11.7910192 12.5189964,11.1287508 Z M6.39227565,1.72489338 C6.39227565,1.38837938 6.67126299,1.11459983 7.0141781,1.11459983 C7.3570932,1.11459983 7.63608054,1.38837938 7.63608054,1.72489338 L7.63608054,2.30303328 C7.42479415,2.27786563 7.21215346,2.26522431 6.99931626,2.26517814 C6.79396424,2.26517814 6.59147166,2.27715309 6.39225743,2.29969102 L6.39225743,1.72489338 L6.39227565,1.72489338 Z M6.99188534,14.8550338 C6.22276689,14.8550338 5.56786241,14.365866 5.33327846,13.6879229 L8.65052863,13.6879229 C8.41592647,14.3658482 7.761022,14.8550338 6.99188534,14.8550338 L6.99188534,14.8550338 Z M1.9580744,12.5733231 C2.18845114,12.2629574 2.38256571,11.9174711 2.53533669,11.543102 C2.8813298,10.6952576 2.90821225,9.98964703 2.90821225,9.79357955 L2.90821225,7.26732961 C2.98589086,5.11553817 4.78763401,3.39445176 6.99931626,3.39445176 C9.22241808,3.39445176 11.0315739,5.13330399 11.0917134,7.30064499 L11.0917134,9.79359742 C11.0917134,9.9896649 11.1185958,10.6952755 11.4645889,11.5431199 C11.6173599,11.9174711 11.8114745,12.2629574 12.0418512,12.5733231 L1.9580744,12.5733231 L1.9580744,12.5733231 Z');
    // 设置图标
    ui.Icon.register('settingIcon', 'M7.00057143,11.339936 C7.49200001,11.339936 7.97028572,11.5256502 8.31371429,11.8490788 L8.46342857,12.0085074 C8.65028571,12.2085074 9.02914285,12.3033645 9.29771429,12.2073645 C9.29771429,12.2073645 9.53314285,12.1205074 10.0525714,11.8245074 C10.5645714,11.5313645 10.7565714,11.3713645 10.7582857,11.3696502 C10.9782857,11.1856502 11.0862857,10.8205074 11.004,10.5513645 L10.9542857,10.3890788 C10.8325714,9.88050737 10.9057143,9.37993594 11.1537143,8.95422166 C11.3962349,8.53508354 11.7874342,8.22240965 12.2497143,8.07822166 L12.4657143,8.02793595 C12.74,7.9650788 13.0051429,7.68965024 13.056,7.41365024 C13.056,7.41022167 13.0994286,7.16565024 13.0994286,6.56907881 C13.0965714,5.97593595 13.0537143,5.73022167 13.0537143,5.72736452 L13.4965714,5.64736452 L13.0531428,5.72622166 C13.004,5.45307881 12.736,5.17250738 12.468,5.11422166 L12.2674286,5.06736452 C11.7965405,4.9274649 11.3966518,4.61339805 11.1491429,4.18907882 C10.9039726,3.76958502 10.8277602,3.27246771 10.936,2.7987931 L10.9474286,2.75707881 L11.0062857,2.58222166 C11.0862857,2.32393594 10.9777143,1.9570788 10.7605714,1.77307881 C10.7594286,1.77193594 10.5668571,1.61307881 10.0485714,1.3147931 C9.52971428,1.01879309 9.29885715,0.933078806 9.29657142,0.93193596 C9.04228572,0.839364532 8.65314286,0.933650246 8.46342857,1.13365023 L8.32857142,1.27707881 C7.97085713,1.6147931 7.5,1.80050738 7.00228572,1.80050738 C6.51142858,1.80050738 6.03371429,1.61593594 5.69199999,1.29422167 L5.53942856,1.13307881 C5.34971427,0.930221675 4.968,0.838793092 4.70514286,0.933078806 C4.6857143,0.939935949 4.452,1.03022167 3.94971428,1.31707881 C3.43771428,1.61250737 3.24685714,1.77193594 3.24457143,1.77365025 C3.02457144,1.95707882 2.91657144,2.32222167 2.99885714,2.59079309 L3.056,2.77593595 C3.17102031,3.25569868 3.09694612,3.76132665 2.84914286,4.18793595 C2.60765526,4.60713702 2.21652716,4.91946791 1.75428571,5.06222167 L1.53428571,5.11307882 C1.26,5.17536452 0.994857137,5.45136452 0.944000005,5.7267931 C0.942857142,5.73250738 0.900571423,5.97422167 0.900571423,6.56965023 C0.900571423,7.16279309 0.942857142,7.40565024 0.943428565,7.40793595 C0.993714274,7.69022167 1.25657143,7.96565023 1.53028572,8.02565024 L1.69028571,8.0610788 C2.19885715,8.20965024 2.59885714,8.52393595 2.84742857,8.9547931 C3.092,9.37936453 3.16971428,9.88507882 3.05885714,10.3427931 L3.00057142,10.5427931 C2.91657142,10.8153645 3.02514284,11.1827931 3.24171428,11.3656502 C3.24171428,11.3656502 3.43542857,11.5267931 3.95314286,11.8239359 C4.46628571,12.1176502 4.69771428,12.2045074 4.70742857,12.2079359 C4.95942857,12.2993645 5.34914285,12.2056502 5.53942856,12.0050788 L5.66685715,11.8690788 C6.02740413,11.5286329 6.50469129,11.3392722 7.00057143,11.339936 Z M9.06,13.1428012 C8.58,13.1428012 8.11085713,12.9467931 7.80399999,12.6187931 L7.67371428,12.4793645 C7.51657141,12.331936 7.26342857,12.235936 7.00057143,12.235936 C6.73885714,12.235936 6.48914287,12.3330788 6.296,12.5102217 L6.19885714,12.6159359 C5.75885713,13.079936 4.98628572,13.2639359 4.39542857,13.0485074 C4.32285715,13.0216502 4.04628571,12.9113645 3.50342858,12.6005074 C2.93885715,12.2765074 2.70114286,12.0845074 2.65885714,12.0496502 C2.168,11.6330788 1.95028572,10.8913645 2.13828571,10.283936 L2.18971428,10.1113645 C2.24114285,9.89650738 2.19771428,9.62907881 2.06571428,9.40107881 C1.93414664,9.17160391 1.71862218,9.00217546 1.46457142,8.92850737 L1.33485715,8.90050738 C0.708571439,8.76336452 0.170285725,8.20336452 0.0571428515,7.5690788 C0.0525714174,7.5450788 0,7.2547931 0,6.56965023 C0,5.88222166 0.0525714341,5.59136451 0.059428577,5.56050739 C0.173714297,4.93936454 0.709714285,4.38165024 1.33371429,4.23936453 L1.52628571,4.19593596 C1.72971429,4.1347931 1.93771428,3.96565025 2.07028572,3.7387931 C2.19942857,3.51593595 2.23885714,3.25250738 2.18228571,2.99536452 L2.13828571,2.85422167 C1.94971428,2.24050738 2.17085714,1.49993595 2.66114285,1.09079309 C2.67828571,1.07593594 2.90628571,0.882793098 3.49942856,0.540507378 C4.03999999,0.23193595 4.32114284,0.119364516 4.39428571,0.0919359608 C5.00571428,-0.126349748 5.76171428,0.0547930981 6.19828572,0.521650235 L6.33085714,0.662793103 C6.48742856,0.809650252 6.73942856,0.904507389 7.00228572,0.904507389 C7.26342857,0.904507389 7.51085715,0.809650252 7.69942856,0.635935955 L7.80514285,0.521650235 C8.24514286,0.0587930925 9.01771428,-0.124064056 9.60628572,0.0902216751 C9.65485714,0.107935955 9.92971429,0.213650246 10.4977143,0.538221669 C11.0765714,0.870221675 11.3057143,1.05822166 11.3462857,1.09193595 C11.8342857,1.50622167 12.052,2.24793595 11.864,2.85479309 L11.8102857,3.01765023 C11.7588571,3.26279309 11.8005714,3.51879309 11.9291429,3.74107881 C12.0582857,3.96222166 12.2662857,4.12736451 12.5142857,4.20565023 L12.6645714,4.23993595 C13.2874286,4.37593594 13.8257143,4.93479309 13.9394286,5.56850738 C13.9497143,5.62393594 13.9965714,5.91879308 14,6.5667931 C14,7.23307882 13.9508571,7.52507882 13.9417143,7.57707881 C13.8262857,8.20107881 13.2902857,8.75879309 12.6674286,8.9010788 L12.4971429,8.93993595 C12.2587971,9.01967191 12.0582027,9.18446045 11.9337143,9.40279309 C11.801012,9.6299484 11.7614835,9.8996846 11.8234286,10.1553645 L11.8662857,10.2902217 C12.0525714,10.9016502 11.832,11.6422217 11.3422857,12.0519359 C11.3245714,12.0673645 11.0948571,12.2616502 10.5011429,12.6016502 C9.932,12.9256502 9.65371429,13.0325074 9.60399999,13.0502217 C9.42951896,13.1120635 9.24568679,13.1433788 9.06057142,13.1428012 L9.06,13.1428012 L9.06,13.1428012 Z M6.99999999,4.87993596 C5.98857142,4.87993596 5.16571428,5.7027931 5.16571428,6.71422167 C5.16571428,7.72565024 5.98857142,8.54850739 6.99999999,8.54850739 C8.01142856,8.54850739 8.83428571,7.72565024 8.83428571,6.71422167 C8.83428571,5.7027931 8.01142856,4.87993596 6.99999999,4.87993596 L6.99999999,4.87993596 Z M6.99999999,9.42850738 C5.50159417,9.42693259 4.28728907,8.21262749 4.28571428,6.71422167 C4.28571428,5.21707882 5.50285714,3.99993595 6.99999999,3.99993595 C8.49657142,3.99993595 9.71428572,5.2170788 9.71428572,6.71422167 C9.71428572,8.2107931 8.49657144,9.42850738 6.99999999,9.42850738 L6.99999999,9.42850738 Z');
    // 切换图标
    ui.Icon.register('toggle', 'M13.3239981,8.62068157 L0.676001931,8.62068157 C0.302510864,8.62068157 0,8.92319243 0,9.2966835 C0,9.43864391 0.0439401255,9.57046428 0.118300338,9.67862459 C0.15041043,9.75467481 0.19942057,9.82565501 0.260260744,9.88818519 L3.23973926,12.8659737 C3.37155963,12.9977941 3.54394013,13.0637043 3.71801062,13.0637043 C3.89208112,13.0637043 4.06446161,12.9977941 4.19628199,12.8659737 C4.45992274,12.6023329 4.45992274,12.1747617 4.19628199,11.909431 L2.25615645,9.97268543 L13.3223081,9.97268543 C13.6957991,9.97268543 13.99831,9.67017457 13.99831,9.2966835 C13.99831,8.92319243 13.6974891,8.62068157 13.3239981,8.62068157 L13.3239981,8.62068157 Z M0.676001931,5.48403261 L13.3239981,5.48403261 C13.6974891,5.48403261 14,5.18152174 14,4.80803068 C14,4.66607027 13.9560599,4.53424989 13.8816997,4.42608958 C13.8580396,4.37031942 13.8242395,4.31623927 13.7836794,4.26553913 L11.3466924,1.28775062 C11.1100917,0.998759791 10.6842105,0.956509671 10.3952197,1.19311035 C10.1062289,1.42971102 10.0639788,1.85559224 10.3005794,2.14458307 L11.9280541,4.13202874 L0.676001931,4.13202874 C0.302510864,4.13202874 0,4.43453961 0,4.80803068 C0,5.18152174 0.302510864,5.48403261 0.676001931,5.48403261 L0.676001931,5.48403261 Z');
    // 添加图标
    ui.Icon.register('add', 'M7,14 C3.1339939,14 0,10.8660061 0,7 C0,3.1339939 3.1339939,0 7,0 C10.8660061,0 14,3.1339939 14,7 C14,10.8660061 10.8655793,14 7,14 Z M7.01280487,1.09118903 C3.74307927,1.09118903 1.09246951,3.73945121 1.09246951,7.00640244 C1.09246951,10.2733537 3.74307927,12.9216158 7.01280487,12.9216158 C10.2825305,12.9216158 12.9329268,10.2733537 12.9329268,7.00640244 C12.9329268,3.73945123 10.2823171,1.09118903 7.01259147,1.09118903 L7.01280487,1.09118903 Z M9.38640244,7.53503049 L7.56939024,7.53503049 L7.56939024,9.38042684 C7.56939024,9.67791973 7.3282246,9.91908537 7.0307317,9.91908537 C6.73323881,9.91908537 6.49207316,9.67791973 6.49207316,9.38042684 L6.49207316,7.53503049 L4.65990853,7.53503049 C4.36335856,7.53503049 4.12295731,7.29462924 4.12295731,6.99807927 C4.12295731,6.7015293 4.36335856,6.46112805 4.65990853,6.46112805 L6.49207316,6.46112805 L6.49207316,4.42728658 C6.49207316,4.12979369 6.73323881,3.88862804 7.0307317,3.88862804 C7.3282246,3.88862804 7.56939024,4.12979369 7.56939024,4.42728658 L7.56939024,6.46112805 L9.38640244,6.46112805 C9.68295241,6.46112805 9.92335367,6.7015293 9.92335367,6.99807927 C9.92335367,7.29462924 9.68295241,7.53503049 9.38640244,7.53503049 Z');


    // 首页
    ui.Icon.register('home', 'M43.1802596,17.53101 L23.6234079,0.590667454 C23.6234079,0.590667454 23.5545457,0.590667454 23.5545457,0.51978736 L23.4856835,0.448907265 L23.4168214,0.378027171 C22.5216134,-0.189013585 21.2820946,-0.118133491 20.4557488,0.590667454 L0.830034892,17.53101 C-0.202897418,18.3815712 -0.271759572,19.9409333 0.62344843,20.9332546 C1.51865643,21.9255759 3.10248597,22.0673361 4.06655613,21.1458949 L5.71924782,19.6574129 L5.71924782,33.9043119 C5.71924782,37.2356763 8.47373398,40 11.8479795,40 L15.4976737,40 C16.8749168,40 17.9767112,38.9367986 17.9767112,37.5900768 L17.9767112,26.1075015 C17.9767112,25.3987005 18.5276085,24.9025399 19.21623,24.9025399 L24.7252023,24.9025399 C25.4138239,24.9025399 25.9647211,25.4695806 25.9647211,26.1075015 L25.9647211,37.3065564 C25.9647211,37.4483166 25.9647211,37.6609569 26.0335832,37.8027171 L26.1024454,38.0862374 C26.3090319,39.220319 27.3419642,40 28.5126208,40 L32.0934528,40 C35.4676983,40 38.2221845,37.2356763 38.2221845,33.9043119 L38.2221845,19.728293 L39.8748762,21.216775 C40.3569113,21.6420555 40.9078085,21.7838157 41.4587057,21.7838157 C42.1473273,21.7838157 42.8359488,21.5002953 43.3179839,20.9332546 C44.282054,20.0118133 44.2131919,18.4524513 43.1802596,17.53101 Z');
    // 持股
    ui.Icon.register('shareholding', 'M19.7331843,8.91112555 L19.7331843,20.994496 C19.7331843,21.5497631 20.1856578,22.0040726 20.7386808,22.0040726 L33.2005532,22.0040726 C34.2311871,22.0040726 35.2115462,22.4520723 35.8839719,23.2281843 C36.5708364,24.0200268 36.8825456,25.0717117 36.738644,26.1117876 C35.5383325,34.9266537 28.7952216,41.2869865 19.9468523,41.9432113 C19.5006633,41.9810704 19.0419055,42 18.5831477,42 C8.38364254,42 0.0443059083,33.8161193 0.000157055872,23.758212 C-0.0373906827,14.6783321 6.66172978,6.76577519 15.5855113,5.35867775 C17.7976036,5.00532592 19.7331843,6.74053577 19.7331843,8.91112555 Z M26.7277001,0.0551964288 C34.3946109,1.40550519 40.5030022,7.38724679 41.9358347,14.9338322 C42.136934,15.9938877 41.8604225,17.0728727 41.175428,17.9057734 C40.4967179,18.7323643 39.4912214,19.2056034 38.4228813,19.2056034 L26.0929804,19.2056034 C24.1196935,19.2056034 22.5171835,17.5965906 22.5171835,15.6152964 L22.5171835,3.59502453 C22.5171835,1.40550519 24.4967547,-0.33601452 26.7277001,0.0551964288 Z M26.1055491,2.57282818 C25.5462417,2.57282818 25.0874839,3.02713767 25.0874839,3.59502453 L25.0874839,15.6216063 C25.0874839,16.1768734 25.5399574,16.6311829 26.0929804,16.6311829 L38.416597,16.6311829 C38.8313643,16.6311829 39.0827384,16.3977183 39.1958568,16.2589015 C39.3089751,16.1200847 39.4912214,15.8235216 39.4095248,15.4133811 C38.1777915,8.91423146 32.8989349,3.75908073 26.2752267,2.58544789 C26.2249518,2.57913803 26.1621083,2.57282818 26.1055491,2.57282818 Z');
    // 分红
    ui.Icon.register('bonus-icon', 'M30.4789154,0 C37.6029206,0 41.8581515,4.04761552 41.9893368,10.9385561 L41.9924615,11.2688405 L41.9924615,11.3474929 L33.0997154,11.3474929 C28.9613154,11.3548547 25.6088,14.6408803 25.6013154,18.6971909 C25.5958802,22.6813404 28.8190955,25.931011 32.8518735,26.0646008 L33.0997692,26.0688661 L42,26.0688661 L42,26.7147578 C42,33.6956593 37.8560817,37.8682445 30.8234649,37.9969335 L30.4864,38 L11.5154846,38 C4.38962428,38 0.134364361,33.9364913 0.00312720067,27.0450025 L0,26.7147037 L0,11.2688405 C0,4.28788573 4.14386617,0.131245247 11.1783816,0.00305456688 L11.5155385,0 L30.4789154,0 Z M40.4932769,14.5612536 C41.3252,14.563094 41.9982231,15.2575413 42,16.1118376 L42,21.4561966 C42,22.3123875 41.3252,23.0049943 40.4932769,23.0049943 L33.6684385,23.0049943 C31.6690231,23.0417493 29.9177308,21.6289829 29.4785615,19.6208832 C29.4265239,19.3521104 29.4002166,19.0789445 29.3999949,18.8051282 C29.3964462,16.4664501 31.2334615,14.5686154 33.5077615,14.5612536 L40.4932769,14.5612536 Z M21.8044615,8.18037876 L9.95308462,8.18037876 C9.072,8.18401994 8.35708462,8.88480057 8.35330101,9.75019373 C8.34980561,10.5709859 8.98897932,11.2481828 9.80697126,11.3239944 L9.95308462,11.331037 L21.8193769,11.331037 C22.7060615,11.3273561 23.4229154,10.6193219 23.4191609,9.74835328 C23.4154308,8.8792792 22.6911462,8.17671225 21.8044615,8.18037876 Z');
    // 我的
    ui.Icon.register('me', 'M19.9730281,24.8611775 C26.8382527,24.8611775 32.4036169,19.2958133 32.4036169,12.4305888 C32.4036169,5.56536417 26.8382527,0 19.9730282,0 C13.1078036,0 7.54243938,5.56536411 7.54243938,12.4305887 C7.54243938,15.7273858 8.85208692,18.8891547 11.1832745,21.2203423 C13.5144621,23.5515299 16.676231,24.8611775 19.9730281,24.8611775 Z M14.3983872,17.0012206 C14.7713407,16.6304796 15.3736745,16.6304796 15.746628,17.0012206 C16.8641009,18.1611413 18.4054169,18.8164676 20.0160571,18.8164676 C21.6266973,18.8164676 23.1680133,18.1611413 24.2854862,17.0012206 C24.6525117,16.6209928 25.2582802,16.6102901 25.638508,16.9773156 C26.0187358,17.3443411 26.0294384,17.9501095 25.662413,18.3303374 C24.184485,19.8642311 22.1461043,20.7308278 20.0160571,20.7308278 C17.8860099,20.7308278 15.8476292,19.8642311 14.3697012,18.3303374 C14.0060737,17.964894 13.9976145,17.3769746 14.3505772,17.0012206 L14.3983872,17.0012206 Z M28.5788203,25.6779558 C25.624165,25.3146002 22.7842536,28.5465532 19.9730281,28.5465532 C17.1618027,28.5465532 14.3601392,25.3432861 11.3672359,25.6779558 C8.37433263,26.0126255 2.06341834,31.7840592 0.849045411,33.2757298 C-0.36532752,34.7674005 -0.699997187,39.7970487 2.7614437,39.7970487 L37.1846125,39.7970487 C40.7034254,39.8065699 40.3974416,34.7769625 39.0970108,33.2852918 C37.834828,31.7936212 31.5334757,26.0413115 28.5788203,25.6779558 Z');
    // 对比、比较
    ui.Icon.register('contrast', 'M52.1860465,4.09478201e-05 C56.1485349,-0.00687141126 60.0603701,0.86145443 63.6234059,2.53887915 L63.6234059,2.53887915 L61.5933983,9.62834935 C58.9946515,8.55103797 56.2014467,7.98126608 53.3743436,7.95178545 C52.2613598,7.94070382 51.1661454,8.22215713 50.2055514,8.76611649 C49.3940868,9.20217885 48.8845488,10.0237849 48.8687172,10.9216986 C48.8659421,11.3898527 48.9851403,11.8511361 49.2153038,12.2629498 C49.5126135,12.7422413 49.8986518,13.1644373 50.3540885,13.5083972 C51.6876218,14.408835 53.1574606,15.1036893 54.7111778,15.5681757 C56.6916729,16.2707359 58.5896473,17.1329688 60.4051013,18.1548743 C61.4283572,18.7935653 62.3690923,19.5120927 63.2273068,20.3104565 C64.1703669,21.3092596 64.8945985,22.4824805 65.3563391,23.7593879 C65.7854464,25.1645081 66,26.5855957 66,28.0226504 C65.9669917,29.4277706 65.7524381,30.7849891 65.3563391,32.0943056 C64.7951989,33.6910331 63.9039761,35.0961534 62.6826707,36.3096663 C61.4013022,37.4876973 59.8850216,38.4004716 58.2265566,38.9921685 C56.312078,39.6627941 54.3480871,39.9981069 52.3345836,39.9981069 C47.2549212,40.0572618 42.2610212,38.7290262 37.9264816,36.1659608 L37.9264816,36.1659608 L40.5011253,28.9806869 C42.0648141,29.9293678 43.7446956,30.6856666 45.5018755,31.2320727 C47.3580131,31.808111 49.2960215,32.0990544 51.2453113,32.0943056 C52.3304789,32.1373722 53.3976149,31.8157976 54.2655664,31.1841709 C54.9746866,30.6107795 55.4051996,29.7777612 55.4538635,28.8848833 C55.4208551,27.7352395 54.9257314,26.7931702 53.9684921,26.0586756 C52.8627157,25.2682954 51.6661665,24.6056536 50.3870968,24.0827253 L50.3870968,24.0827253 L49.4133533,23.7114861 C47.6309077,23.1047296 45.9309828,22.3223332 44.3135784,21.3642967 C43.0262566,20.5659328 41.9039759,19.5919291 40.9467367,18.4422853 C40.3195798,17.6439215 39.824456,16.7657214 39.4613653,15.8076849 C38.9662416,14.4344991 38.7351837,13.0134118 38.768192,11.5444224 C38.7648906,9.89979297 39.1015748,8.27113077 39.7584396,6.75423981 C40.4147107,5.29018233 41.4149604,3.99443062 42.6796699,2.96999558 C44.0712008,1.86606348 45.6924548,1.06546608 47.4328582,0.62280612 C48.984246,0.239591515 50.5686421,0.032016999 52.1860465,4.09478201e-05 Z M10.744186,0.9581189 L18.4186047,30.9925636 L18.5176294,30.9925636 L26.1425356,0.9581189 L36.9362341,0.9581189 L25.9939985,39.0400703 L10.8927232,39.0400703 L0,0.9581189 L10.744186,0.9581189 Z');
    // 上传图标
    ui.Icon.register('upload', 'M13.4283333,8.2270847 C13.7409449,8.23404187 13.9926124,8.47104662 14,8.76544477 C14,10.5629082 12.6256667,12 10.948,12 L10.948,12 L3.052,12 C1.37433333,12 0,10.5629082 0,8.76544477 C0.00738759479,8.47104662 0.259055054,8.23404187 0.571666667,8.2270847 C0.88427828,8.23404187 1.13594574,8.47104662 1.14333333,8.76544477 C1.14333333,9.96302127 1.98333333,10.9210825 3.052,10.9210825 L3.052,10.9210825 L10.948,10.9210825 C12.0166667,10.9210825 12.8566667,9.95203433 12.8566667,8.76544477 C12.8640543,8.47104662 13.1157217,8.23404187 13.4283333,8.2270847 Z M6.524,0.145091403 C6.7654397,-0.0483638011 7.12022696,-0.0483638011 7.36166667,0.145091403 L7.36166667,0.145091403 L9.45933333,2.19305708 C9.61739247,2.32458624 9.68485996,2.52786998 9.63446991,2.72075445 C9.58407986,2.91363891 9.4241619,3.0642397 9.2193443,3.11169391 C9.0145267,3.15914812 8.79866645,3.09561144 8.659,2.94676118 L8.659,2.94676118 L7.476,1.83268544 L7.476,7.93922686 C7.47600001,8.1315644 7.36704096,8.30929161 7.19016667,8.40546038 C7.01329239,8.50162915 6.79537428,8.50162915 6.61849999,8.40546038 C6.44162571,8.30929161 6.33266666,8.1315644 6.33266667,7.93922686 L6.33266667,7.93922686 L6.33266667,1.83268544 L5.14966667,2.94676118 C4.92518101,3.13356728 4.58511916,3.12368464 4.37329168,2.9241987 C4.1614642,2.72471277 4.15097015,2.40446369 4.34933333,2.19305708 L4.34933333,2.19305708 Z');
    ecui.defineElement('ICON', ui.Icon, ['name']);
}());
    (function () {

    var core = ecui,
        ui = core.ui,
        util = core.util,
        dom = core.dom,
        esr = core.esr,
        socket = null,
        isToucher = document.ontouchstart !== undefined,
        safariVersion = !/(chrome|crios|ucbrowser)/i.test(navigator.userAgent) && /(\d+\.\d)(\.\d)?\s+.*safari/i.test(navigator.userAgent) ? +RegExp.$1 : undefined,
        iosVersion = /(iPhone|iPad).*?OS (\d+(_\d+)?)/i.test(navigator.userAgent) ? +(RegExp.$2.replace('_', '.')) : undefined,
        QQVersion = /QQLiveBrowser\/(\d+\.\d)/i.test(navigator.userAgent) ? +RegExp.$1 : undefined,
        isWeixin = /MicroMessenger/i.test(navigator.userAgent) ? true : false,
        isFeishu = /Feishu/i.test(navigator.userAgent) ? true : false,
        now = new Date();

    Object.assign(
        frd.ui,
        {
            /*
            * control
            * 返回控件
            */
            Back: ecui.inherits(
                ui.Control,
                {
                    onclick: function () {
                        window.history.go(-1);
                    }
                }
            ),
            /*
            * control
            * 菜单栏展开、收起控制区域
            */
            MenuCollectCont: ecui.inherits(
                ui.Control,
                {
                    expandHandler: util.blank,
                    onmouseover: function () {
                        var uNavBar = ecui.get('nav-bar');
                        this.expandHandler();
                        if (uNavBar._bMenuCollect) {
                            uNavBar._bMenuCollect = false;
                            uNavBar.collectMenu();
                        }
                    },
                    onmouseout: function () {
                        var uNavBar = ecui.get('nav-bar');
                        if (!uNavBar._bMenuCollect) {
                            this.expandHandler();
                            this.expandHandler = util.timer(function () {
                                uNavBar._bMenuCollect = true;
                                uNavBar.collectMenu();
                            }, 100);
                        }
                    },
                    onblur: function () {
                        var uNavBar = ecui.get('nav-bar');
                        if (!uNavBar._bMenuCollect) {
                            uNavBar._bMenuCollect = true;
                            uNavBar.collectMenu();
                        }
                    }
                }
            ),
            /*
            * control
            * 导航栏控件
            */
            ModuleLink: ecui.inherits(
                ui.TreeView,
                {
                    expandHandler: util.blank,
                    init: function () {
                        ui.TreeView.prototype.init.call(this);
                        // if (!(this.getParent() instanceof ui.TreeView)) {
                        //     this._bMenuCollect = true;
                        // }
                        util.timer(function () {
                            if (this.getRoot() === this) {
                                this._bMenuCollect = true;
                            }
                        }, 0, this);
                    },
                    /*
                    * @override
                    *
                    * 重写isCollapsed，强行将树节点，点击时判断是否收缩的返回值写死为true，让它点击时永远展开
                    */
                    $nodeclick: function () {
                        if (this._eContainer) {
                            this.getParent().getChildren().forEach(function (item) {
                                if (item !== this && !item.isCollapsed()) {
                                    item.collapse();
                                }
                            }, this);

                            if (this.isCollapsed()) {
                                this.expand();
                                core.dispatchEvent(this, 'expand');
                            } else {
                                this.collapse();
                                core.dispatchEvent(this, 'collapse');
                            }
                        } else {
                                
                            this.getRoot().setActived(this);
                        }
                    },
                    setActived: function (item) {
                        var root = this.getRoot(),
                            sItem = root.getActived();
                        
                        if (sItem && sItem.getParent() && sItem.getParent() !== root) {
                            sItem.getParent().alterStatus('-childselected');
                        }

                        if (item && item.getParent() && item.getParent() !== root) {
                            item.getParent().alterStatus('+childselected');
                        }
                        ui.TreeView.prototype.setActived.call(this, item);
                    },

                    collectMenu: function () {
                        dom[this._bMenuCollect ? 'removeClass' : 'addClass'](ecui.$('cont_wrapper'), 'ui-menu-expand');
                        if (this._bMenuCollect) {
                            this.getChildren().forEach(function (item) {
                                item.collapse();
                            });
                        } else {
                            var selected = this.getActived();
                            if (selected && selected.getParent() !== this) {
                                selected.getParent().expand();
                            }
                        }
                    }
                } 
            ),
            /*
            * control
            * 导航栏菜单控件
            */
            ModuleLinkItem: ecui.inherits(
                ui.Control,
                'ui-module-link',
                {
                    onclick: function () {
                        // var tree = this.getParent(),
                        //     uNavBar = tree.getRoot();
                        // function checkedTree(tree) {
                        //     if (tree.getParent() === uNavBar) {
                        //         // tree.collapse();
                        //     } else if (tree.getParent && tree.getParent() instanceof frd.ui.ModuleLink) {
                        //         checkedTree(tree.getParent());
                        //     }
                        // }
                        // function clearTree(tree) {
                        //     tree.getChildren().forEach(function (item) {
                        //         clearTree(item);
                        //         // item.collapse();
                        //         item.lastFocused = null;
                        //     });
                        // }
                        // clearTree(uNavBar);
                        // checkedTree(tree);
                    }
                }

            ),

            MessageItem: ecui.inherits(
                ui.Control,
                {
                    onclick: function (event) {
                        this.remove();
                        event.exit();
                    },
                    remove: function () {
    
                        var el = this.getMain();
                        el.style.left = '400px';
                        util.timer(function () {
                            dom.remove(el);
                        }, 500);
                    }
                }
            ),
            MessageDelete: ecui.inherits(
                ui.Control,
                'ui-message-delete',
                {
                    onclick: function (event) {
                        this.getParent().remove();
                        event.exit();
                    }
                }
            ),
            PopupBtn: ecui.inherits(
                ui.Control,
                'ui-popup-btn',
                function (el, options) {
                    var popupEl = dom.create('div');
                    popupEl.appendChild(el.lastElementChild);
                    ui.Control.call(this, el, options);
                    popupEl.className = this.getUnitClass(ui.Control, 'options ') + ' ui-popup ui-hide';
                    dom.addClass(popupEl.firstElementChild, 'ui-popup-btn-cont');
                    this._uOptions = ecui.$fastCreate(this.Popup, popupEl, this, { focusable: false });
                    this.setPopup(this._uOptions);
                },
                {
                    Popup: ecui.inherits(ui.Control)
                },
                ui.iPopup
            ),
            /**
             * control
             * 展开股权结构树按钮
             * 
             * options   属性：
             * @param {boolean} expandParent 是否控制父节点，默认是false
             * @param {boolean} expand      是否展开子节点，默认是false
             * 
             *
             */
            NotOptionalSelect: core.inherits(
                ui.abstractSelect,
                'ui-not-optional-select',
                function (el, options) {
                    ui.abstractSelect.call(this, el, options);
                    this._sText = options.text;
                    this.setText(this._sText);
                    dom.addClass(this.getInput(), 'ui-hide');
                },
                {
                    /**
                     * 选项框部件。
                     * @unit
                     */
                    Options: core.inherits(
                        ui.abstractSelect.prototype.Options,
                        {
                            /**
                             * 属性改变事件的默认处理。
                             * @event
                             */
                            $propertychange: function () {}
                        }
                    ),
                    init: function () {
                        ui.abstractSelect.prototype.init.call(this);
    
                        var hide = true;
                        this.getItems().forEach(function (item) {
                            if (item._bPermission !== false) {
                                hide = false;
                            }
                        });
                        if (hide) {
                            this.hide();
                        }
    
                    }
                },
                ui.iPopup
            ),

            /*
            * 路由切换tab 控件
            * @control
            */
            RouteTab: core.inherits(
                ui.Tab,
                {
                    /**
                     * 选项部件。
                     * options 属性：
                     * container   容器的id，如果通过这里设置，不允许改变关联容器
                     * selected    当前项是否被选中
                     * @unit
                     */
                    Item: core.inherits(
                        ui.Tab.prototype.Item,
                        function (el, options) {
                            ui.Tab.prototype.Item.call(this, el, options);
                            this._sRouteName = options.routeName;
                        }
                    ),
                    onready: function () {
                        this.changeHandler();
                    },
                    onchange: function () {
                        this.changeHandler();
                    },
                    changeHandler: function () {
                        var selected = this.getSelected(),
                            routeName = selected._sRouteName;
                        if (typeof selected === 'number') {
                            routeName = this.getItem(Math.max(0, selected))._sRouteName;
                        }
                        if (routeName) {
                            ecui.esr.callRoute(routeName, true);
                        }
                        ecui.$('container').scrollTo(0, 0);
                        util.timer(function () {
                            ecui.dispatchEvent(this.getParent(), 'scroll');
                        }, 10, this);
                    }
                }
            ),
            /**
             * 树形穿梭框
             * options属性:        
             */            
            TreeTransfer: core.inherits(
                ui.Control,
                'ui-tree-transfer',
                function (el, options) {
                    ui.Control.call(this, el, options);
                    var els = dom.create('div', {
                        innerHTML: '<div class="ui-tree-transfer-search ui-text ui-input"></div>\
                                    <div class="ui-tree-transfer-total"></div>\
                                    <div class="ui-transfer-tree"><li class="check-all">全选</li></div>\
                                    <div class="ui-listbox ui-listbox-selected"></div>'
                    });
                    var childrens = dom.children(els);
                    childrens.forEach(function (item) {
                        el.appendChild(item);
                    });
                    this._oData = options.data || [];
                    this._oTree = options.tree || [];
        
                    var values = this._oData.map(function (item) {
                        return item.value;
                    });
                    frd.util.mapTree(this._oTree, function (item) {
                        item.checked = !!(values.indexOf(item.value) > -1);
                    });
        
                    this._uSearchText = ecui.$fastCreate(this.SearchText, childrens[0], this, { placeholder: '搜索名称' });
                    this._eNum = childrens[1];
                    this._uTargetTree = ecui.$fastCreate(this.TargetTree, childrens[2].lastElementChild, this, { collapsed: false, subject: true });
                    this._uSelectedList = ecui.$fastCreate(this.SelectedList, childrens[3], this, { name: options.name || '' });
                },
                {
                    SearchText: ecui.inherits(
                        ui.Text,
                        {
                            clearTimer: util.blank,
                            oninput: function () {
                                this.clearTimer();
                                this.clearTimer = util.timer(function () {
                                    this.searchTree();
                                }, 300, this);
                            },
                            onkeydown: function (e) {
                                if (e.switch === 32) {
                                    this.searchTree();
                                }
                            },
                            searchTree: function () {
                                var text = this.getValue().trim();
                                var uTargetTree =  this.getParent()._uTargetTree;
                                dom[text ? 'addClass' : 'removeClass'](uTargetTree.getMain().parentElement, 'ui-searching');
                                uTargetTree.forEach(function (tree) {
                                    if (tree !== uTargetTree) {
                                        tree.alterStatus(tree._oData.code.indexOf(text) > -1 ? '-miss' : '+miss');
                                    }
                                });
                            }
                        }
                    ),
                    TargetTree: core.inherits(
                        ui.CheckboxTree,
                        function (el, options) {
                            options.collapsed = false;
                            options.subject = true;
                            options.checked = !!options.checked || false;
                            dom.addClass(el, 'ui-target-tree');
                            ui.CheckboxTree.call(this, el, options);
                            // this._oData = { code: options.code || '', value: options.value, showValue: options.showValue };
        
                            var data = Object.assign({}, options);
                            delete data.parent;
                            delete data.primary;
                            delete data.uid;
                            delete data.children;
                            delete data.collapsed;
                            delete data.subject;
                            delete data.id;
        
                            this._oData = data;
                            if (this._oData.code) {
                                el.setAttribute('title', this._oData.code);
                            }
                        },
                        {
                            TEXTNAME: 'code',
                            oncollapse: function () {
                                if (this.getRoot() === this) {
                                    return false;
                                }
                            },
        
                            // change 事件全部推送到root上触发
                            onchange: function (event) {
                                var activeTree = event.item.getParent();
                                this.getParent().changeItems(activeTree, event.item.isChecked(), true);
                            }
                        }
                    ),
                    SelectedList: core.inherits(
                        ui.Listbox,
                        {
                            Item: core.inherits(
                                ui.Listbox.prototype.Item,
                                function (el, options) {
                                    delete options.selected;
                                    ui.Listbox.prototype.Item.call(this, el, options);
                                    this._bIsSeat = options.isSeat;
                                    this._bLock = options.lock;
                                    var data = Object.assign({}, options);
                                    delete data.parent;
                                    delete data.primary;
                                    delete data.uid;
                                    this._oData = data;
        
                                    if (this._oData.code) {
                                        el.setAttribute('title', this._oData.code);
                                    }
                                    var els = dom.create('div', {
                                        className: 'ui-item-operates',
                                        innerHTML: '<icon class="delete"></icon>'
                                    });
                                    el.appendChild(els);
        
                                    var icons = dom.children(el.lastElementChild);
                                    this._uDelete = core.$fastCreate(ui.Icon, icons[0], this, { name: 'delete' });
                                },
                                {
                                    /**
                                     * @override
                                     */
                                    onclick: function (event) {
                                        if (event.getControl() === this._uDelete) {
                                            this.getParent().getParent().changeItems(this, false);
                                        }
                                    }
                                }
                            )
                        }
                    ),
        
                    changeItems: function (item, isSelected, isTree) {
                        var targetTree = this._uTargetTree,
                            selectedList = this._uSelectedList,
                            selectedItems = selectedList.getItems(),
                            selectedValues = selectedItems.map(function (item) {
                                return item.getValue();
                            });
        
                        if (isSelected) {
                            var items = [];
                            item.forEach(function (tree) {
                                if (tree.getParent() !== targetTree && tree !== targetTree && selectedValues.indexOf(tree._oData.value) === -1) {
                                    items.push(tree._oData);
                                }
                            });
                            selectedList.add(items);
                        } else {
                            if (!isTree) {
                                targetTree.forEach(function (_item) {
                                    if (_item._oData.value === item._oData.value) {
                                        _item.setSelected(false);
                                    }
                                }.bind(this));
                                selectedList.remove(item);
                            } else {
                                var values = [];
                                item.forEach(function (tree) {
                                    if (tree.getParent() !== targetTree) {
                                        values.push(tree._oData.value);
                                    }
                                });
                                selectedItems.forEach(function (_item) {
                                    if (values.indexOf(_item._oData.value) > -1) {
                                        selectedList.remove(_item);
                                    }
                                });
                            }
                        }
                        this.setNum();
                        ecui.dispatchEvent(this, 'change');
                    },
        
                    getData: function () {
                        var data = [];
                        this._uSelectedList.getItems().forEach(function (item) {
                            if (!item.isDisabled() && !item._bIsSeat) {
                                data.push(item._oData);
                            }
                        });
                        return data;
                    },
        
                    onready: function () {
                        util.timer(function () {
                            var tree = this._oTree instanceof Array ? this._oTree : [this._oTree];
                            var ids = [];
                            frd.util.mapTree(tree, function (item) {
                                ids.push(item.value);
                            });
                            tree.forEach(function (item) {
                                this._uTargetTree.add(item);
                            }.bind(this));
        
                            this._uTargetTree.getChildren().forEach(
                                function (item) {
                                    item._uCheckbox.setSubject(this._uTargetTree._uCheckbox);
                                },
                                this
                            );
                            this._uSelectedList.add(this._oData);
                            this.setNum();
                        }, 0, this);
        
                    },
        
                    setNum: function () {
                        this._eNum.innerHTML = '<span class="select-num">已选择（<span class="num">' + this._uSelectedList.getItems().length + '</span>）个字段</span>';
                    }
                }
            ),
            BooleanCheckbox: ecui.inherits(
                ui.Checkbox,
                {
                    getFormValue: function () {
                        return this.getValue() !== 'false';
                    }
                }
            ),
        }
    );


    /**
     * 穿梭框选择按钮
     * options属性:
     */
    frd.ui.TransferBtn = core.inherits(
        ui.Control,
        'ui-transfer-btn',
        function (el, options) {
            ui.Control.call(this, el, options);
            var optionsEl = dom.create('div');
            optionsEl.className = 'ui-transfer-options ui-popup ui-hide ';
            this._uOptions = core.$fastCreate(this.Options, optionsEl, this, { focusable: false, data: options.data });
            optionsEl.className += ' ui-popup ui-hide';
            this.setPopup(this._uOptions);
        },
        {
            Options: core.inherits(
                frd.ui.Transfer,
                {
                    onchange: function () {
                        ecui.dispatchEvent(this.getParent(), 'change');
                    }
                }
            ),
            onchange: function () {
                
            }
        },
        ui.iPopup
    );

    /**
     * 级联选择
     * options属性:
     */
    ui.Cascader = core.inherits(
        ui.abstractInput,
        'ui-cascader',
        function (el, options) {

            var popupEl = dom.create({ className: this.getUnitClass(ui.Cascader, 'popup') + ' ui-popup ui-hide ' })
            var optionsEl = dom.remove(el.lastElementChild);

            ui.abstractInput.call(this, el, options);

            if (options.regexp) {
                this._oRegExp = new RegExp('^' + options.regexp + '$');
            }

            this._uPopup = core.$fastCreate(this.Popup, popupEl, this, { focusable: false });

            popupEl.appendChild(optionsEl);
            optionsEl.className = this.getUnitClass(ui.Control, 'options');
            this._uOptions = [core.$fastCreate(this.Options, optionsEl, this._uPopup, { focusable: false, level: 0 })];
            
            this.setPopup(this._uPopup);
            var placeholder = options.placeholder || this.getInput().getAttribute('placeholder') || '';
            text = dom.create('div', {
                className: this.getUnitClass(ui.Cascader, 'text'),
                innerHTML: '<input placeholder="' + placeholder + '">'
            });
            el.appendChild(text);
            this._uText = core.$fastCreate(ui.Text, text, this, {});
        },
        {
            Popup: core.inherits(
                ui.Control,
                function (el, options) {
                    ui.Control.call(this, el, options);
                    this._bRoot = true;
                }
            ),
            Options: core.inherits(
                ui.Control,
                'ui-cascader-options',
                function (el, options) {
                    ui.Control.call(this, el, options);
                    this._nLevel = options.level;
                    this._bLeft = true;
                    util.timer(function () {
                        this._uRoot = this.getRoot();
                    }, 10, this);
                },
                {
                    /**
                     * 菜单项部件。
                     * @unit
                     */
                    Item: core.inherits(
                        ui.Item,
                        'ui-cascader-popup-item',
                        function (el, options) {
                            if (el.tagName === 'UL') {
                                var popup = el;
                                el = dom.insertBefore(el.firstElementChild, popup);
                                dom.remove(popup);
                                dom.addClass(popup, 'ui-cascader-options');
                            }
        
                            ui.Item.call(this, el, options);
                            this._sValue = options.value === undefined ? el.textContent : String(options.value);
        
                            if (popup) {
                                this.setChildMenu(core.$fastCreate(ui.Cascader.prototype.Options, popup, this, { focusable: false }));
                            }
                        },
                        {
                            /**
                             * @override
                             */
                            onclick: function (event) {
                                this.clickHandler();
                                event.exit();
                            },
                            /**
                             * @override
                             */
                            clickHandler: function (event) {
                                var parent = this.getParent(),
                                    uRoot = parent._uRoot,
                                    cascader = uRoot.getParent();

                                if (parent._nLevel <= cascader._uOptions.length - 1) {
                                    for (var i = cascader._uOptions.length - 1; i > parent._nLevel; i--) {
                                        var item = cascader._uOptions.pop();
                                        item.setSelected();
                                        dom.remove(item.getMain());
                                    }

                                }

                                parent.setSelected(this);
                                if (this._cChildMenu) {
                                    cascader._uOptions.push(this._cChildMenu);
                                    uRoot.getMain().appendChild(this._cChildMenu.getMain());
                                } else {
                                    cascader.getPopup().hide();
                                    cascader.selectHandler();
                                    ecui.dispatchEvent(cascader, 'change');
                                }

                            },
        
                            /**
                             * 设置子菜单。
                             * @public
                             *
                             * @param {ecui.ui.iPopupMenu} popupMenu 弹出菜单控件
                             */
                            setChildMenu: function (popupMenu) {
                                if (this._cChildMenu !== popupMenu) {
                                    if (this._cChildMenu) {
                                        this._cChildMenu.hide();
                                    }
                                    if (!this._cChildMenu ^ !popupMenu) {
                                        if (this._cChildMenu) {
                                            this.alterStatus('-group');
                                        } else {
                                            this.alterStatus('+group');
                                        }
                                    }
                                    this._cChildMenu = popupMenu || null;
                                }
                            },
                            init: function () {
                                ui.Item.prototype.init.call(this);
                            },

                            /**
                             * 获取选项的值。
                             * getValue 方法返回选项控件的值，即选项选中时整个下拉框控件的值。
                             * @public
                             *
                             * @return {string} 选项的值
                             */
                            getValue: function () {
                                return this._sValue;
                            },

                            /**
                             * 设置选中状态。
                             * @public
                             *
                             * @param {boolean} status 是否选中，默认为选中
                             */
                            setSelected: function (status) {
                                this.isSelected = status === false;
                                this.alterStatus(status !== false ? '+selected' : '-selected');
                            }
                        }
                    ),
                    getRoot: function () {
                        var level = 0;
                        var popup = this;
                        for (; popup = popup.getParent(); ) {
                            if (popup._nLevel !== undefined) {
                                level++;
                            }
                            if (popup._bRoot) {
                                break;
                            }
                        }
                        this._nLevel = level;
                        return popup;
                    },
                    init: function () {
                        ui.Control.prototype.init.call(this);
                    },
        
                    /**
                     * @override
                     */
                    $alterItems: util.blank
                },
                ui.iItems,
                ui.Control.defineProperty('selected')
            ),
            /**
             * @override
             */
            $validate: function () {
                ui.abstractInput.prototype.$validate.call(this);

                var value = this.getValue(),
                    result = true;

                if (this._oRegExp && !this._oRegExp.test(value)) {
                    result = false;
                }

                if (!result) {
                    core.dispatchEvent(this, 'error');
                }
                return result;
            },
            selectHandler: function () {
                var text = [],
                    value = [];

                this._uOptions.forEach(function (item) {
                    if (item.getSelected()) {
                        text.push(item.getSelected().getContent());
                        value.push(item.getSelected().getValue());
                    }
                });

                this.setText(text.join('/'));
                this.setValue(value.join(','));
            },
            setText: function (text) {
                this._uText.setValue(text);
            },
            setValue: function (value) {
                this.getInput().value = value;
            },
            init: function () {
                ui.abstractInput.prototype.init.call(this);
                util.timer(function () {

                    var values = this.getValue().split(',');
                    for (var i = 0, len = values.length; i < len; i++) {
                        var value = values[i],
                            uOptions = this._uOptions[i];
                        if (uOptions) {
                            uOptions.getItems().forEach(function (item) {
                                if (item.getValue() === value) {
                                    item.clickHandler();
                                }
                            });
                        }
                    }
                    this.selectHandler();
                }, 10, this);
            }
        },
        ui.iPopup
    );

    /*
    @example
    <div ui="type:locked-table;left-lock:1" style="width:600px">
        <table style="width:750px">
            <thead>
                <tr>
                    <th style="width:200px;">公司名</th>
                    <th style="width:200px;">url</th>
                    <th style="width:250px;">地址</th>
                    <th style="width:100px;">创办时间</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>百度</td>
                    <td>www.baidu.com</td>
                    <td>中国北京中关村</td>
                    <td>1999</td>
                </tr>
            </tbody>
        </table>
    </div>

    @fields
    _nLeft       - 最左部未锁定列的序号
    _nRight      - 最右部未锁定列的后续序号，即未锁定的列序号+1
    _uLockedHead - 锁定的表头区
    _uLockedMain - 锁定的行内容区
    _eLeft       - 左侧锁定行的Element元素
    _eRight      - 右侧乐定行的Element元素
    */
    /**
     * 锁定式表格控件。
     * 允许锁定左右两列的高级表格控件。
     * options 属性：
     * left-lock  左边需要锁定的列数
     * right-lock 右边需要锁定的列数
     * @control
     */
    ui.LockTable = core.inherits(
        ui.Control,
        'ui-sticky-table',
        function (el, options) {
            if (el.firstElementChild.tagName === 'TABLE') {
                el.appendChild(dom.create({ className: 'ui-sticky-table-cont' }));
                el.lastElementChild.appendChild(el.firstElementChild);
            }
            ui.Control.call(this, el, options);

            this._nLeft = +options.leftLock || 0;
            this._nRight = +options.rightLock || 0;

            this._eTable = this.getMain().getElementsByTagName('TABLE')[0];
            var tHead = this._eTable.firstElementChild;
            var tBody = this._eTable.lastElementChild;
            var cont = this._eTable.parentElement;

            // 兼容ext-sort-table
            this._uTable = core.$fastCreate(ui.Control, this._eTable, this);
            this._aChildren = [];
            dom.children(tHead.firstElementChild).forEach(function (item) {
                this._aChildren.push(core.$fastCreate(ui.Control, item, this._uTable));
            }.bind(this));

            // 无数据样式处理
            if (!tBody.childElementCount) {
                tBody.innerHTML = ecui.esr.getEngine().render('no-result', { colspan: tHead.firstElementChild.childElementCount, width: cont.offsetWidth });
            }

            // 保留滚动位置
            dom.addEventListener(el.parentElement, 'scroll', tableSortContScroll.bind(this));
            if (options.scrollLeft) {
                this._nScrollLeft = +options.scrollLeft;
            }

            var shadowLayers = dom.create({ innerHTML: '<div class="ui-shadow-layer ui-shadow-layer-left"></div><div class="ui-shadow-layer ui-shadow-layer-right"></div>' });
            this._eShadowLayerLeft = shadowLayers.firstElementChild;
            this._eShadowLayerRight = shadowLayers.lastElementChild;
            el.appendChild(this._eShadowLayerLeft);
            el.appendChild(this._eShadowLayerRight);
        },
        {
            /**
             * @override
             */
            $dispose: function () {
                dom.removeEventListener(this.getMain().parentElement, 'scroll', tableSortContScroll);
                ui.Control.prototype.$dispose.call(this);
            },
            /**
             * 控件结构恢复。
             * @protected
             */
            $restoreStructure: function () {
                ui.Control.prototype.$restoreStructure.call(this);
                dom.removeClass(this.getMain(), 'ui-table-scroll');
            },
            /**
             * 初始化控件结构。
             * @protected
             */
            $initStructure: function () {
                ui.Control.prototype.$initStructure.call(this);
                var cont = this._eTable.parentElement;
                if (cont.offsetWidth < cont.scrollWidth) {
                    dom.addClass(this.getMain(), 'ui-table-scroll');
                } else {
                    dom.removeClass(this.getMain(), 'ui-table-scroll');
                }
            },
            initLock: function () {
                var tHead = this._eTable.firstElementChild;
                var tBody = this._eTable.lastElementChild;
                var trs = dom.children(tHead).concat(dom.children(tBody));

                var left = this._nLeft;
                var right = this._nRight;
                var len = trs[0].childElementCount;

                // 添加锁定列样式类
                trs.forEach(function (tr, index) {

                    dom.children(tr).forEach(function (td, _index) {
                        // 处理左边锁定列样式类
                        if (left && _index < left) {
                            dom.addClass(td, 'ui-sticky-left');
                        }
                        // 处理右边锁定列样式类
                        if (right && _index + right > len - 1) {
                            dom.addClass(td, 'ui-sticky-right');
                        }
                    });
                });


                // 计算没一列的额宽度
                var widths = [];
                dom.children(trs[0]).forEach(function (item, index) {
                    widths.push(item.offsetWidth);
                });
                // 计算左边锁定列 left 值;
                var stickyLeft = [];
                var _left = 0;
                widths.forEach(function (item) {
                    stickyLeft.push(_left);
                    _left += item
                });
                // 计算右边锁定列 right 值;
                var stickyRight = [];
                var _right = 0;
                [].concat(widths).reverse().forEach(function (item) {
                    stickyRight.push(_right);
                    _right += item
                });
                stickyRight.reverse();

                trs.forEach(function (tr, index) {

                    dom.children(tr).forEach(function (td, _index) {
                        // 处理左边锁定列left值
                        if (left && _index < left) {
                            td.style.left = stickyLeft[_index] + 'px';
                        }
                        // 处理右边锁定列right值
                        if (right && _index + right > len - 1) {
                            td.style.right = stickyRight[_index] + 'px';
                        }
                    });
                });

                if (left) {
                    this._eShadowLayerLeft.style.width = widths.slice(0, left).reduce(function (sum, item) { return sum + item }, 0) + 'px';
                }
                if (right) {
                    var cont = this._eTable.parentElement;
                    hasVertailScrollNarrow = !!(cont.scrollHeight > cont.offsetHeight);
                    this._eShadowLayerRight.style.width = (hasVertailScrollNarrow ? ecui.getScrollNarrow() : 0) + [].concat(widths).reverse().slice(0, right).reduce(function (sum, item) { return sum + item }, 0) + 'px';
                }
            },
            onready: function () {
                this.scrollHandler();
                this.initLock();

                var cont = this.getMain().parentElement;
                util.timer(function () {
                    if (cont) {
                        cont.scrollLeft = this._nScrollLeft || 0;
                    }
                }, 300, this);
            },
            onscroll: function () {
                this.scrollHandler();
            },
            scrollHandler: function () {
                var scrollCont = this._eTable.parentElement;
                dom[scrollCont.scrollLeft === 0 ? 'addClass' : 'removeClass'](this.getMain(), 'ui-table-scroll-left');
                dom[scrollCont.scrollLeft === scrollCont.scrollWidth - scrollCont.clientWidth ? 'addClass' : 'removeClass'](this.getMain(), 'ui-table-scroll-right');
            }
        }
    );

    var tableScrollLeft
    function tableSortContScroll() {
        frd.info.tableScrollLeft = this.getMain().parentElement.scrollLeft;
    }

    ui.TableSortCont = core.inherits(
        ui.Control,
        function (el, options) {
            ui.Control.call(this, el, options);
            this._aChildren = [];
            dom.children(el.firstElementChild.firstElementChild).forEach(function (item) {
                this._aChildren.push(core.$fastCreate(ui.Control, item, this));
            }.bind(this));
            dom.addEventListener(el.parentElement, 'scroll', tableSortContScroll.bind(this));
            if (options.scrollLeft) {
                this._nScrollLeft = +options.scrollLeft;
            }
        },
        {
            /**
             * @override
             */
            $dispose: function () {
                dom.removeEventListener(this.getMain().parentElement, 'scroll', tableSortContScroll);
                ui.Control.prototype.$dispose.call(this);
            },
            onready: function () {
                var cont = this.getMain().parentElement;
                util.timer(function () {
                    if (cont) {
                        cont.scrollLeft = this._nScrollLeft || 0;
                    }
                }, 0, this);
            }
        }
    );

    ui.Pagination.prototype.go = function (pageNo, pageSize) {
        var route = esr.findRoute(this),
            routeUrl = route.NAME;

        if (frd.info.paginationModel === 'history') {
            var data = {};
            if (pageNo) {
                data.pageNo = pageNo;
            }
            if (pageSize) {
                data.pageSize = pageSize;
            }
            var searchParam = Object.assign({}, route.searchParam, data);
            esr.change(routeUrl, frd.util.getSearchParams(searchParam));
        } else {

            if (pageNo) {
                routeUrl += '~pageNo=' + pageNo;
            }
            if (pageSize) {
                routeUrl += '~pageSize=' + pageSize;
            }
            esr.callRoute(routeUrl, true);
            if (pageNo) {
                this._nCurrentPage = pageNo;
            }
        }
    };
}());
})();