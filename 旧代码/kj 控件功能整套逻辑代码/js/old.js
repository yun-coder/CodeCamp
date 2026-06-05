/**
 * __author__ zhangyunliang
 **/


let Template_Info;
let canvas = document.querySelectorAll('#canvas_box')[0];
let context = canvas.getContext('2d');
let scale = 1.00; //缩放倍率
let isMouseDown = false; //鼠标是否按下
let isRotate = true; //是否移动
let control_code = 1;//控件标识符（测试）
let img = new Image();
let bigDiv = document.getElementById("bigDiv");
let isLocal = false; //是否水平锁定
let fx; //固定方向
let keyCodeArr = []; //判断按下了什么键
let All_Controls = []; //所有的控件
$(document).ready(function () {
    //toastr.info('按住 Control_L 键或 Control_L+Shift_L 拖拽复制', '友情提示');
    let template_id = getQuery('template_id');
    if (!template_id) {
        toastr.info("请选择模板操作");
    }
    //todo 获取模板返回
    $.ajax({
        url: 'http://47.96.99.70:8080/standard-test/getTemplateDetailById.html',
        dataType: 'json',
        type: 'GET',
        data: {'template_id': template_id},
        success: function (res) {
            if (res[0].Code == 200) {
                //console.log(res[0].data);
                Template_Info = res[0].data;
                load_template();
            }
        },
        error: function (error) {
            toastr.error(error[0].data);
        }
    });
    document.getElementById('move_box').addEventListener('mousedown', function (e) {
        let move_obj = document.getElementById('move_box').cloneNode(true);
        bigDiv.appendChild(move_obj);
        move_obj.id = 'node' + control_code;
        move_obj.style.width = $("#move_box").css('width');
        move_obj.style.height = $("#move_box").css('height');

        let margin_left = ($(window).get(0).innerWidth - parseFloat(bigDiv.style.width)) / 2;
        let margin_top = ($(window).get(0).innerHeight - parseFloat(bigDiv.style.height)) / 2;
        document.onmousemove = function (evt) {
            let touch = evt || event;
            move_obj.style.left = touch.clientX - parseInt($("#" + move_obj.id).css('width')) - margin_left + 'px';
            move_obj.style.top = touch.clientY - parseInt($("#" + move_obj.id).css('height')) - margin_top + 'px';
            bigDiv.style.cursor = 'move';
        };
        document.onmouseup = function (ev) {
            document.onmousemove = null;
            document.onmouseup = null;
            Add_Controls(move_obj, ev, 0);
        };
    });
    document.getElementById('move_box2').addEventListener('mousedown', function (e) {
        let move_obj = document.getElementById('move_box2').cloneNode(true);
        bigDiv.appendChild(move_obj);
        move_obj.id = 'node' + control_code;
        move_obj.style.width = $("#move_box2").css('width');
        move_obj.style.height = $("#move_box2").css('height');

        let margin_left = ($(window).get(0).innerWidth - parseFloat(bigDiv.style.width)) / 2;
        let margin_top = ($(window).get(0).innerHeight - parseFloat(bigDiv.style.height)) / 2;
        document.onmousemove = function (evt) {
            let touch = evt || event;
            move_obj.style.left = touch.clientX - parseInt($("#" + move_obj.id).css('width')) - margin_left + 'px';
            move_obj.style.top = touch.clientY - parseInt($("#" + move_obj.id).css('height')) - margin_top + 'px';
            bigDiv.style.cursor = 'move';
        };
        document.onmouseup = function (ev) {
            document.onmousemove = null;
            document.onmouseup = null;
            Add_Controls(move_obj, ev, 0);
        };
    });
});

//todo 添加键盘输入keycode
function addKeyCodeArr(num, arr) {
    let check = 0;
    for (let i = 0; i < arr.length; i++) {
        if (arr[i] == num) {
            check = 1;
        }
    }
    if (check == 0) {
        arr.push(num);
    }
    return arr;
}

//todo 删除键盘输入keycode
function deleteKeyCodeArr(num, arr) {
    for (let i = 0; i < arr.length; i++) {
        if (arr[i] == num) {
            arr.splice(i, 1);
        }
    }
    return arr;
}

//todo 键盘事件
document.onkeydown = function (event) {
    let e = event || window.event || arguments.callee.caller.arguments[0];
    keyCodeArr = deleteKeyCodeArr(event.keyCode, keyCodeArr);
    keyCodeArr = addKeyCodeArr(e.keyCode, keyCodeArr);
    //console.log(keyCodeArr.toString());
};
//todo 按键取消
document.onkeyup = function () {
    //document.onkeydown = null;
    keyCodeArr = deleteKeyCodeArr(event.keyCode, keyCodeArr);
};

//todo 判断是否是手机端
function isPhone() {
    let u = navigator.userAgent;
    let isAndroid = u.indexOf('Android') > -1 || u.indexOf('Adr') > -1; //android终端
    let isiOS = !!u.match(/\(i[^;]+;( U;)? CPU.+Mac OS X/); //ios终端
    if (isAndroid || isiOS) {
        return true;
    } else {
        return false;
    }
}

//todo 鼠标滚轮
let addMouseWheel = function (dom, hander) {
    dom.addEventListener('touchmove', function (e) {
        //toastr.info(e.scale);
        if (event.touches.length > 1) {
            if (e.scale > 1) {
                e.delta = e.scale + 1;
            } else {
                e.delta = e.scale - 1;
            }
            hander(e);
        }
    });
    //兼容完整处理 通过浏览器判断
    let browser = window.navigator.userAgent.toLowerCase().indexOf('firefox');
    if (browser != -1) {
        //处理火狐滚轮事件
        dom.addEventListener('DOMMouseScroll', function (e) {
            //获取当前鼠标的滚动情况
            e.delta = -(e.detail || 0) / 3;
            hander(e);

            let oEvent = e || event;
            event.wheelDelta = event.wheelDelta ? event.wheelDelta : (event.deltalY * (-40));
            //上下滚轮动作判断
            if (oEvent.detail < 0) {
                console.log('放大');
            } else {
                console.log('缩小');
            }
        })
    } else {
        //其他浏览器
        dom.onmousewheel = function (e) {
            e.delta = e.wheelDelta / 120;
            hander(e);

            let oEvent = e || event;
            event.wheelDelta = event.wheelDelta ? event.wheelDelta : (event.deltalY * (-40));  //获取当前鼠标的滚动情况
            //上下滚轮动作判断
            if (oEvent.wheelDelta > 0) {
                console.log('放大');
            } else {
                console.log('缩小');
            }
        }
    }
};

//todo 加载地图
let load_template = function () {
    document.title = Template_Info.template_name;
    canvas.width = Template_Info.width;
    canvas.height = Template_Info.height;
    $(".control_box").css({
        'position': 'absolute',
        'left': ($(window).get(0).innerWidth - Template_Info.width) / 2,
        'top': ($(window).get(0).innerHeight - Template_Info.height) / 2,
        'width': Template_Info.width + "px",
        'height': Template_Info.height + "px"
    });
    $("#canvas_box").css({
        'margin-left': ($(window).get(0).innerWidth - Template_Info.width) / 2,
        'margin-top': ($(window).get(0).innerHeight - Template_Info.height) / 2
    });


    let oldX = 0, oldY = 0;
    let isMove = false;
    let spanLeft = 0, spanTop = 0;

    // $(window).resize(function () {
    //     canvas.width = Template_Info.width;
    //     canvas.height = Template_Info.height;
    //     $(".control_box").css({
    //         'position': 'absolute',
    //         'left': ($(window).get(0).innerWidth - Template_Info.width) / 2,
    //         'top': ($(window).get(0).innerHeight - Template_Info.height) / 2,
    //         'width': Template_Info.width + "px",
    //         'height': Template_Info.height + "px"
    //     });
    //     $("#canvas_box").css({
    //         'margin-left': ($(window).get(0).innerWidth - Template_Info.width) / 2,
    //         'margin-top': ($(window).get(0).innerHeight - Template_Info.height) / 2
    //     });
    //     show();
    // });
    if (isPhone()) {
        img.src = 'img/mobile_bg.jpg';
    } else {
        img.src = Template_Info.base_map;
    }

    img.onload = function () {
        show();
        //鼠标移动事件
        addMouseWheel(canvas, function (e) {
            let temp = e.delta > 0 ? 0.1 : -0.1;
            scale += temp;
            //缩放极限判断
            scale = scale < 0.3 ? 0.3 : scale;
            scale = scale > 2 ? 2 : scale;
            show();
        });
        canvas.onmousedown = function (e) {
            oldX = e.clientX;
            oldY = e.clientY;
            isMove = true;
        };
        canvas.onmousemove = function (e) {
            if (isMove) {
                document.body.style.background = 'black';
                canvas.style.cursor = 'move';
                let currentX = e.clientX;
                let currentY = e.clientY;
                //计算移动的距离
                let spanX = currentX - oldX;
                let spanY = currentY - oldY;
                spanLeft += spanX;
                spanTop += spanY;
                context.translate(spanX, spanY);
                show();
                //记录当前结果
                oldX = currentX;
                oldY = currentY;
            }
        };
        canvas.onmouseup = function () {
            canvas.style.cursor = 'default';
            oldX = oldY = 0;
            isMove = false;
        };
        canvas.onmouseleave = function () {
            oldX = oldY = 0;
            isMove = false;
        };
        canvas.oncontextmenu = function (e) {
            e.stopPropagation();
            e.preventDefault();
            isRotate = true;
            $(".around").css('display', 'none');
        };
    };

    //todo 画图
    function show() {
        let cWidth = canvas.width;
        let cHeight = canvas.height;
        let width = img.width * scale;
        let height = img.height * scale;
        //居中显示
        let left = (cWidth - width) / 2;
        let top = (cHeight - height) / 2;

        if (scale == 1) {
            $("#bigDiv").css({'width': img.width, 'height': img.height});
            $("#bigDiv").css({'left': left, 'top': top});
        } else {
            $("#bigDiv").css({'width': img.width * scale, 'height': img.height * scale});
            $("#bigDiv").css({'left': left, 'top': top});
        }
        //清除画布
        context.clearRect(-spanLeft, -spanTop, canvas.width, canvas.height);
        context.drawImage(img, left, top, width, height);
        bindDom(spanLeft, spanTop);
    }

};

function change_value(id) {
    let str = JSON.parse($("#" + id + " input").val());
    str[0].x = $("#" + id).css('left').replace('px', '');
    str[0].y = $("#" + id).css('top').replace('px', '');
    str[0].width = $("#" + id).css('width');
    str[0].height = $("#" + id).css('height');
    $("#" + id + " input").val(JSON.stringify(str));
}

function BindEvent(id) {
    document.getElementById(id).addEventListener('mousedown', function (e) {
        if (keyCodeArr.toString() === '17' && keyCodeArr.toString() != "") {

            let move_obj = document.getElementById(id).cloneNode(true);
            bigDiv.appendChild(move_obj);
            move_obj.id = 'node' + control_code;
            move_obj.style.width = $("#" + id).css('width');
            move_obj.style.height = $("#" + id).css('height');

            let margin_left = ($(window).get(0).innerWidth - parseFloat(bigDiv.style.width)) / 2;
            let margin_top = ($(window).get(0).innerHeight - parseFloat(bigDiv.style.height)) / 2;
            document.onmousemove = function (evt) {
                let touch = evt || event;
                move_obj.style.left = touch.clientX - parseInt($("#" + id).css('width')) / 2 - margin_left + 'px';
                move_obj.style.top = touch.clientY - parseInt($("#" + id).css('height')) / 2 - margin_top + 'px';
                bigDiv.style.cursor = 'move';
            };
            document.onmouseup = function (ev) {
                document.onmousemove = null;
                document.onmouseup = null;
                keyCodeArr = [];
                isRotate = true;
                Add_Controls(move_obj, ev, 0);
            };
        }
        else if ((keyCodeArr.toString() === '17,16' || keyCodeArr.toString() === '16,17') && keyCodeArr.toString() != "") {
            let _ids = [];
            $("#bigDiv .nodes").each(function (index, item) {
                if ($("#" + item.id).attr('data_action') == 'can_copy') {
                    _ids.push(item.id);
                }
            });
            if (_ids.length > 1) {
                //todo 多个水平复制
                let many_copy = document.createElement('div');
                many_copy.style.position = "absolute";
                many_copy.style.width = '100%';
                many_copy.style.height = '100%';
                many_copy.id = 'box';
                let touch = e || event;
                let _top = touch.clientY;
                let _left = touch.clientX;
                let _start_position = {
                    x: touch.clientX,
                    y: touch.clientY
                };
                let ids = [];
                $("#bigDiv .nodes").each(function (index, item) {
                    if ($("#" + item.id).attr('data_action') == 'can_copy') {
                        let move_obj = document.getElementById(item.id).cloneNode(true);
                        move_obj.id = 'node' + control_code++;
                        move_obj.style.width = $("#" + item.id).css('width');
                        move_obj.style.height = $("#" + item.id).css('height');
                        ids.push(move_obj.id);
                        many_copy.appendChild(move_obj);
                    }
                });
                bigDiv.appendChild(many_copy);
                document.onmousemove = function (evt) {
                    let touch = evt || event;
                    let distance = {
                        x: touch.clientX - _start_position.x,
                        y: touch.clientY - _start_position.y
                    };
                    if (Math.abs(distance.x) > Math.abs(distance.y)) {
                        many_copy.style.left = touch.clientX - _left + 'px';
                        many_copy.style.top = '0';
                    } else {
                        many_copy.style.left = '0';
                        many_copy.style.top = touch.clientY - _top + 'px';
                    }
                    bigDiv.style.cursor = 'move';
                };
                document.onmouseup = function (ev) {
                    let _left = parseFloat($("#box").css('left'));
                    let _top = parseFloat($("#box").css('top'));
                    //console.log(_left,_top);
                    $("#bigDiv").append($("#box").children());
                    for (let k = 0; k < ids.length; k++) {
                        $("#" + ids[k]).css({
                            'left': parseFloat($("#" + ids[k]).css('left')) + _left + "px",
                            'top': parseFloat($("#" + ids[k]).css('top')) + _top + "px"
                        });
                        Add_Controls(document.getElementById(ids[k]), ev, 1);
                    }
                    //todo 修改新增的内部input值
                    for (let k = 0; k < ids.length; k++) {
                        change_value(ids[k]);
                    }

                    $("#box").remove();
                    document.onmousemove = null;
                    document.onmouseup = null;
                    keyCodeArr = [];
                    isRotate = true;
                    $("#bigDiv .nodes").each(function (index, item) {
                        $("#" + item.id).removeAttr('data_action');
                        $("#" + item.id + " .around").css('display', 'none');
                    });
                };
            }
            else {
                //todo 单个水平复制
                let move_obj = document.getElementById(id).cloneNode(true);
                bigDiv.appendChild(move_obj);
                move_obj.id = 'node' + control_code;
                move_obj.style.width = $("#" + id).css('width');
                move_obj.style.height = $("#" + id).css('height');

                let touch = e || event;
                let _start_position = {
                    x: touch.clientX,
                    y: touch.clientY
                };
                let can_move_box_x = document.createElement("div");
                can_move_box_x.className = 'can_move_box';
                can_move_box_x.style.width = $(window).get(0).innerWidth;
                can_move_box_x.style.height = move_obj.style.height;
                can_move_box_x.style.top = move_obj.style.top;
                can_move_box_x.style.left = '0';

                let can_move_box_y = document.createElement("div");
                can_move_box_y.className = 'can_move_box';
                can_move_box_y.style.width = move_obj.style.width;
                can_move_box_y.style.height = bigDiv.style.height;
                can_move_box_y.style.left = move_obj.style.left;
                can_move_box_y.style.top = '0';

                let margin_left = ($(window).get(0).innerWidth - parseFloat(bigDiv.style.width)) / 2;
                let margin_top = ($(window).get(0).innerHeight - parseFloat(bigDiv.style.height)) / 2;
                document.onmousemove = function (evt) {
                    let touch = evt || event;
                    let distance = {
                        x: touch.clientX - _start_position.x,
                        y: touch.clientY - _start_position.y
                    };
                    //console.log(distance);
                    if (Math.abs(distance.x) > Math.abs(distance.y)) {
                        fx = 'x';
                        $(".can_move_box").remove();
                        bigDiv.append(can_move_box_x);
                        can_move_box_x.appendChild(move_obj);
                        bigDiv.appendChild(can_move_box_x);
                        move_obj.style.left = touch.clientX - parseInt($("#" + move_obj.id).css('width')) / 2 - margin_left + 'px';
                        move_obj.style.top = '0';
                    } else {
                        fx = 'y';
                        $(".can_move_box").remove();
                        bigDiv.append(can_move_box_y);
                        can_move_box_y.appendChild(move_obj);
                        bigDiv.appendChild(can_move_box_y);
                        move_obj.style.left = '0';
                        move_obj.style.top = touch.clientY - parseInt($("#" + move_obj.id).css('height')) / 2 - margin_top + 'px';
                    }
                    bigDiv.style.cursor = 'move';
                };
                document.onmouseup = function (ev) {
                    document.onmousemove = null;
                    document.onmouseup = null;
                    isLocal = true;
                    keyCodeArr = [];
                    isRotate = true;
                    Add_Controls(move_obj, ev, 0);
                };
            }
        }
        else if (keyCodeArr.toString() === '16' && keyCodeArr.toString() != "") {
            //todo 多重选中复制
            let many_copy = document.createElement('div');
            many_copy.style.position = "absolute";
            many_copy.style.width = '100%';
            many_copy.style.height = '100%';
            many_copy.id = 'box';
            let touch = e || event;
            let _top = touch.clientY;
            let _left = touch.clientX;
            let ids = [];
            $("#bigDiv .nodes").each(function (index, item) {
                if ($("#" + item.id).attr('data_action') == 'can_copy') {
                    let move_obj = document.getElementById(item.id).cloneNode(true);
                    move_obj.id = 'node' + control_code++;
                    move_obj.style.width = $("#" + item.id).css('width');
                    move_obj.style.height = $("#" + item.id).css('height');
                    ids.push(move_obj.id);
                    many_copy.appendChild(move_obj);
                }
            });
            bigDiv.appendChild(many_copy);
            document.onmousemove = function (evt) {
                let touch = evt || event;
                many_copy.style.left = touch.clientX - _left + 'px';
                many_copy.style.top = touch.clientY - _top + 'px';
                bigDiv.style.cursor = 'move';
            };
            document.onmouseup = function (ev) {
                let _left = parseFloat($("#box").css('left'));
                let _top = parseFloat($("#box").css('top'));
                //console.log(_left,_top);
                $("#bigDiv").append($("#box").children());
                for (let k = 0; k < ids.length; k++) {
                    $("#" + ids[k]).css({
                        'left': parseFloat($("#" + ids[k]).css('left')) + _left + "px",
                        'top': parseFloat($("#" + ids[k]).css('top')) + _top + "px"
                    });
                    Add_Controls(document.getElementById(ids[k]), ev, 1);
                }
                //todo 修改新增的内部input值
                for (let k = 0; k < ids.length; k++) {
                    change_value(ids[k]);
                }

                $("#box").remove();
                document.onmousemove = null;
                document.onmouseup = null;
                keyCodeArr = [];
                isRotate = true;
                $("#bigDiv .nodes").each(function (index, item) {
                    $("#" + item.id).removeAttr('data_action');
                    $("#" + item.id + " .around").css('display', 'none');
                });
            };
        }
        else {
            // todo 绑定移动
            if (isRotate == true) {

                let touch = e || event;
                let start_position = {
                    x: touch.clientX,
                    y: touch.clientY
                };
                let margin_left = ($(window).get(0).innerWidth - parseFloat(bigDiv.style.width)) / 2;
                let margin_top = ($(window).get(0).innerHeight - parseFloat(bigDiv.style.height)) / 2;
                document.onmousemove = function (ev) {
                    $('.' + id).css('display', 'none');
                    let touch = ev || event;
                    //todo 此处需要判断图片过高或者过宽
                    document.getElementById(id).style.left = touch.clientX - parseInt($("#" + id).css('width')) / 2 - margin_left + 'px';
                    document.getElementById(id).style.top = touch.clientY - parseInt($("#" + id).css('height')) / 2 - margin_top + 'px';
                };
                document.onmouseup = function (ev) {
                    // 移动完之后修改位置;获取移动距离在原来的基础上操作
                    let touch = ev || event;
                    let end_position = {
                        x: touch.clientX,
                        y: touch.clientY
                    };
                    let distance = {
                        x: end_position.x - start_position.x,
                        y: end_position.y - start_position.y
                    };
                    //console.log(distance);
                    let input_value = JSON.parse($("#" + id + " input[name='" + id + "']").val());
                    input_value[0].x = parseFloat(input_value[0].x) + parseFloat(distance.x);
                    input_value[0].y = parseFloat(input_value[0].y) + parseFloat(distance.y);
                    $("input[name='" + id + "']").val(JSON.stringify(input_value));
                    document.onmousemove = null;
                    document.onmouseup = null;
                    keyCodeArr = [];
                };
            }
        }
    });
}

//todo 拖拽复制、添加隐藏域(绑定旋转缩放事件)
function Add_Controls(copy_obj, ev, type) {
    let touch = ev || event;
    let margin_left = ($(window).get(0).innerWidth - parseFloat(bigDiv.style.width)) / 2;
    let margin_top = ($(window).get(0).innerHeight - parseFloat(bigDiv.style.height)) / 2;
    if (isLocal == true) {
        if (fx == 'x') {
            copy_obj.style.left = touch.clientX - parseInt($("#" + copy_obj.id).css('width')) / 2 - margin_left + 'px';
            copy_obj.style.top = $('.can_move_box').css('top');
        } else {
            copy_obj.style.top = touch.clientY - parseInt($("#" + copy_obj.id).css('height')) / 2 - margin_top + 'px';
            copy_obj.style.left = $('.can_move_box').css('left');
        }
        bigDiv.appendChild(copy_obj);
        $('.can_move_box').remove();
    } else {
        copy_obj.style.left = touch.clientX - parseInt($("#node" + control_code).css('width')) / 2 - margin_left + "px";
        copy_obj.style.top = touch.clientY - parseInt($("#node" + control_code).css('height')) / 2 - margin_top + "px";
    }
    let shape;
    if (copy_obj.className == 'square_control' || copy_obj.className == 'nodes no-radius') {
        shape = 'square';
        copy_obj.className = 'nodes no-radius';
        //todo 方形控件
        copy_obj.innerHTML = '<div class="around">\n' +
            '    <div id="topleft" class="nodebo node_top_left"></div>\n' +
            '    <div id="topcenter" class="nodebo node_top_center"></div>\n' +
            '    <div id="topright" class="nodebo node_top_right"></div>\n' +
            '    <div id="centerleft" class="nodebo node_center_left"></div>\n' +
            '    <div id="centerright" class="nodebo node_center_right"></div>\n' +
            '    <div id="bottomleft" class="nodebo node_bottom_left"></div>\n' +
            '    <div id="bottomcenter" class="nodebo node_bottom_center"></div>\n' +
            '    <div id="bottomright" class="nodebo node_bottom_right"></div>\n' +
            '    <div class="node_scale"></div>\n' +
            '    <div class="node_shu"></div>\n' +
            '</div>';
    } else {
        shape = 'circle';
        //todo 圆形控件
        copy_obj.className = 'nodes';
        copy_obj.innerHTML = '<div class="around">\n' +
            '    <div id="topleft" class="nodebo node_top_left"></div>\n' +
            '    <div id="topcenter" class="nodebo node_top_center"></div>\n' +
            '    <div id="topright" class="nodebo node_top_right"></div>\n' +
            '    <div id="centerleft" class="nodebo node_center_left"></div>\n' +
            '    <div id="centerright" class="nodebo node_center_right"></div>\n' +
            '    <div id="bottomleft" class="nodebo node_bottom_left"></div>\n' +
            '    <div id="bottomcenter" class="nodebo node_bottom_center"></div>\n' +
            '    <div id="bottomright" class="nodebo node_bottom_right"></div>\n' +
            '</div>';
    }
    copy_obj.ondblclick = function () {
        $("#" + copy_obj.id + " .around").css('display', 'block');
        $("#" + copy_obj.id).attr('data_action', 'can_copy');
        isRotate = false;
    };
    let arr = [];
    //todo 显示信息
    copy_obj.onmouseenter = function () {
        //console.log($("#" + copy_obj.id + " .around").css('display'));
        if ($("#" + copy_obj.id + " .around").css('display') == 'none') {
            let tips = document.createElement('div');
            tips.innerHTML = "控件信息(" + copy_obj.id + ")<span class='arrow'></span>";
            tips.className = "tooltips " + copy_obj.id;
            bigDiv.append(tips);
            $("." + copy_obj.id).css({
                'display': 'flex',
                'left': parseFloat(copy_obj.style.left) - parseFloat(copy_obj.style.width) + "px",
                'top': parseFloat(copy_obj.style.top) - parseFloat(copy_obj.style.height) + "px"
            });
        }
    };
    copy_obj.onmouseleave = function () {
        arr = [];
        $("." + copy_obj.id).remove();
    };

    //todo 初始值
    isLocal = false;
    keyCodeArr = [];
    //todo 更新控件列表
    if (isLocal == false) {
        bigDiv.appendChild(copy_obj);
    }
    //todo 改变控件大小
    change_size(copy_obj.id);

    //todo 保持呼吸灯效果一致
    $(".nodes").css({'animation-name': 'test', '-webkit-animation-name': 'test'});
    setTimeout(function () {
        $(".nodes").css({'animation-name': 'breathe', '-webkit-animation-name': 'breathe'});
    }, 100);
    BindEvent(copy_obj.id);

    //todo 将拖拽进来的控件节点存入 hidden input
    let _input = document.createElement("input");
    _input.type = 'hidden';
    _input.name = copy_obj.id;
    _input.className = 'hide_input';


    let arr2 = JSON.stringify([{
        x: touch.clientX - parseInt($("#" + copy_obj.id).css('width')) / 2 - margin_left,
        y: touch.clientY - parseInt($("#" + copy_obj.id).css('height')) / 2 - margin_top,
        control_name: copy_obj.id,
        control_type: shape,
        width: copy_obj.style.width,
        height: copy_obj.style.height
    }]);
    _input.value = arr2;

    //todo 更新控件列表
    let append_html = '<tr>\n' +
        '<td>' + copy_obj.id + '</td>\n' +
        '<td class="edit">\n' +
        '<a href="javascript:void(0);" data-toggle="modal" data-target="#delete_control_Model">\n' +
        '<img src="img/pic/delete.png" class="delete_img" onclick="delete_control(' + "'" + copy_obj.id + "'" + ',this)">\n' +
        '</a>\n' +
        '</td>\n' +
        '</tr>';
    $('#code_table>tbody').append(append_html);
    $("#" + copy_obj.id + " input").remove();
    copy_obj.appendChild(_input);
    if (type != 1) {
        control_code++;
    }
    if (copy_obj.className == "nodes no-radius") {
        SetRotate($("#" + copy_obj.id + " .node_scale"), copy_obj.id);
    }

    //todo 保存控件位置
    let JsonData = JSON.parse(arr2);
    JsonData[0].x = JsonData[0].x.toString();
    JsonData[0].y = JsonData[0].y.toString();
    let data = {
        'control_name': JsonData[0].control_name,
        'location_x': JsonData[0].x.toString(),
        'location_y': JsonData[0].y.toString(),
        'control_type': shape,
        'control_shape': JsonData[0]
    };
    All_Controls.push(data);
}

//todo 绑定控件同时移动放大缩小
function bindDom(oldX, oldY) {
    let arr = [];
    $(".hide_input").each(function (i, item) {
        if ($(this).val()) {
            arr.push(JSON.parse($(this).val()));
        }
    });
    //console.log(scale);
    if (arr.length > 0) {
        //console.log(margin_left, margin_top);
        for (let k = 0; k < arr.length; k++) {
            let width = parseInt(arr[k][0]['width']);
            let height = parseInt(arr[k][0]['height']);
            let x = arr[k][0]['x'];
            let y = arr[k][0]['y'];
            document.getElementById(arr[k][0]['control_name']).style.width = width * scale + 'px';
            document.getElementById(arr[k][0]['control_name']).style.height = height * scale + 'px';
            document.getElementById(arr[k][0]['control_name']).style.left = scale * x + oldX + 'px';
            document.getElementById(arr[k][0]['control_name']).style.top = scale * y + oldY + 'px';
        }
    }
}

//todo 控件旋转
function SetRotate(obj, parent_id) {
    let offsetX;
    let offsetY;
    let isMouseDown = false;
    obj.on('mousedown', function (e) { //鼠标按下
        offsetX = parseInt($("#" + parent_id).css('left').replace("px", "")) + parseInt($("#" + parent_id).css("width").replace("px", "")) / 2;
        offsetY = parseInt($("#" + parent_id).css('top').replace("px", "")) + parseInt($("#" + parent_id).css("height").replace("px", "")) / 2;
        isMouseDown = true;
    });
    $(document).on('mousemove', function (ev) {
        if (isMouseDown) {
            let ox = parseInt(ev.pageX) - parseInt(offsetX);//计算出鼠标相对于画布中心的位置
            let oy = parseInt(ev.pageY) - parseInt(offsetY);
            let to = Math.abs(ox / oy);
            let angle = Math.atan(to) / (2 * Math.PI) * 360;//鼠标相对于旋转中心的角度
            if (ox < 0 && oy < 0) {
                angle = -angle;
            } else if (ox < 0 && oy > 0) {
                angle = -(180 - angle)
            } else if (ox > 0 && oy < 0) {
                angle = angle;
            } else if (ox > 0 && oy > 0) {
                angle = 180 - angle;
            }
            $("#" + parent_id).css("transform", "rotate(" + angle + "deg)");
            let info = JSON.parse($("#" + parent_id + " input").val());
            info[0].control_angle = angle;
            $("#" + parent_id + " input").val(JSON.stringify(info));
        }
    }).on('mouseup', function () {
        isMouseDown = false;
        //todo 轮询判断更新控件
    });
}

//todo 改变控件大小
function change_size(obj) {
    let mouseDownPosiY, mouseDownPosiX, InitPositionY, InitPositionX, InitHeight, InitWidth, mousedownid;
    $("#" + obj + " .nodebo").on('mousedown', function (e) {
        //鼠标按下
        mouseDownPosiY = e.pageY;
        mouseDownPosiX = e.pageX;
        isMouseDown = true;
        mousedownid = $(this).attr("id");
        InitPositionY = $("#" + obj).css("top").replace("px", "");
        InitPositionX = $("#" + obj).css("left").replace("px", "");
        InitHeight = $("#" + obj).height();
        InitWidth = $("#" + obj).width();
        $(document).on('mousemove', function (e) {
            //"#" + obj + " .nodebo"
            //鼠标移动
            if (isMouseDown) {
                let hh = parseInt(e.pageY) - parseInt(mouseDownPosiY);
                let ww = parseInt(e.pageX) - parseInt(mouseDownPosiX);
                let tempY = hh + parseInt(InitPositionY);
                let tempX = ww + parseInt(InitPositionX);
                //console.log($("#" + obj));
                //todo 修改元素属性
                switch (mousedownid) {
                    case "topleft":
                        $("#" + obj).css({
                            "top": tempY + "px",
                            "height": parseInt(InitHeight) - hh + "px",
                            "left": tempX + "px",
                            "width": parseInt(InitWidth) - ww + "px"
                        });
                        break;
                    case "topcenter":
                        $("#" + obj).css({"top": tempY + "px", "height": parseInt(InitHeight) - hh + "px"});

                        break;
                    case "topright":
                        $("#" + obj).css({
                            "top": tempY + "px",
                            "height": parseInt(InitHeight) - hh + "px",
                            "width": parseInt(InitWidth) + ww + "px"
                        });
                        break;
                    case "centerleft":
                        $("#" + obj).css({"left": tempX + "px", "width": parseInt(InitWidth) - ww + "px"});

                        break;
                    case "centerright":
                        $("#" + obj).css({"width": parseInt(InitWidth) + ww + "px"});
                        break;
                    case "bottomleft":
                        $("#" + obj).css({
                            "height": parseInt(InitHeight) + hh + "px",
                            "left": tempX + "px",
                            "width": parseInt(InitWidth) - ww + "px"
                        });
                        break;
                    case "bottomcenter":
                        $("#" + obj).css("height", parseInt(InitHeight) + hh + "px");
                        break;
                    case "bottomright":
                        $("#" + obj).css({
                            "height": parseInt(InitHeight) + hh + "px",
                            "width": parseInt(InitWidth) + ww + "px"
                        });
                        break;
                    case "MyContent":
                        $("#" + obj).css("left", tempX + "px").css("top", tempY + "px");
                        break;
                }
            }
        }).on('mouseup', function () {
            mousedownid = "";
            isMouseDown = false;
            //todo 将宽高加入隐藏框
            //console.log($("#" + obj).css('width'), $("#" + obj).css('height'));
            //console.log($("#" + obj).css('top'), $("#" + obj).css('left'));
            let _value = JSON.parse($("#" + obj + " input").val());
            _value[0].width = $("#" + obj).css('width');
            _value[0].height = $("#" + obj).css('height');
            _value[0].y = parseFloat($("#" + obj).css('top'));
            _value[0].x = parseFloat($("#" + obj).css('left'));
            $("#" + obj + " input").val(JSON.stringify(_value));
        }).on('mouseleave', function () {
            mousedownid = "";
            isMouseDown = false;
        });
    });
}


//todo 控件删除
function delete_control(id, obj) {
    // toastr.info("暂未开放");
    let template_id = getQuery('template_id');
    console.log(id);
    //obj.parentNode.parentNode.parentNode.parentNode.removeChild(obj.parentNode.parentNode.parentNode);
    $.ajax({
        url: 'http://47.96.99.70:8080/standard-test/delTempletControl.html?template_id=42&control_name=node2',
        data: {'template_id': template_id, 'control_name': id},
        type: 'GET',
        dataType: 'json',
        success: function (res) {

        },
        error: function (res) {
            toastr.error(res[0].data);
        }
    });
}

//todo 编辑控件
function edit_control(id, obj) {
    toastr.info("暂未开放");
    //obj.parentNode.parentNode.parentNode.parentNode.removeChild(obj.parentNode.parentNode.parentNode);
}


//todo 临时保存
$("#short_save").on('click', function () {
    let Str = JSON.stringify(All_Controls);
    console.log(Str);
    //todo status=1 临时保存可编辑   status=2 另存为可编辑    status =3  永久保存不可编辑
    $.ajax({
        url: 'http://47.96.99.70:8080/standard-test/AddTemplateDetail.html',
        dataType: 'json',
        data: {'template_id': Template_Info.template_id, 'jsonString': Str},
        type: 'POST',
        success: function (res) {
            if (res[0].Code == 200) {
                console.log(res[0].data);
            }
        },
        error: function (error) {
            toastr.error(error[0].data);
        }
    });
});


//todo 移动端操作
function Mobile_move() {
    //todo 移动端参数事件
    let translateX = 0;
    let translateY = 0;
    let scaleRatio = 1;
    let scaleOrigin = {
        x: 0,
        y: 0
    };
    let preTouchesClientx1y1x2y2 = [];
    let originHaveSet = false;
    let preTouchPosition = {};
    const recordPreTouchPosition = (touch) => {
        preTouchPosition = {
            x: touch.clientX,
            y: touch.clientY
        };
    };
    const getStyle = (target, style) => {
        let styles = window.getComputedStyle(target, null);
        return styles.getPropertyValue(style);
    };
    const getTranslate = (target) => {
        let matrix = getStyle(target, 'transform');
        let nums = matrix.substring(7, matrix.length - 1).split(', ');
        let left = parseInt(nums[4]) || 0;
        let top = parseInt(nums[5]) || 0;
        return {
            left: left,
            top: top
        }
    };
    const relativeCoordinate = (x, y, rect) => {
        let cx = (x - rect.left) / scaleRatio;
        let cy = (y - rect.top) / scaleRatio;
        return {
            x: cx,
            y: cy
        };
    };
    const setStyle = (key, value) => {
        canvas.style[key] = value;
    };
    canvas.addEventListener('touchmove', e => {
        let touches = e.touches;
        if (touches.length === 1) {
            let oneTouch = touches['0'];
            let translated = getTranslate(oneTouch.target);
            translateX = oneTouch.clientX - preTouchPosition.x + translated.left;
            translateY = oneTouch.clientY - preTouchPosition.y + translated.top;
            let matrix = `matrix(${scaleRatio}, 0, 0, ${scaleRatio}, ${translateX}, ${translateY})`;
            setStyle('transform', matrix);
            recordPreTouchPosition(oneTouch);
        } else {
            let one = touches['0'];
            let two = touches['1'];
            const distance = (x1, y1, x2, y2) => {
                let a = x1 - x2;
                let b = y1 - y2;
                return Math.sqrt(a * a + b * b);
            };
            scaleRatio = distance(one.clientX, one.clientY, two.clientX, two.clientY) / distance(...preTouchesClientx1y1x2y2) * scaleRatio || 1;
            if (!originHaveSet) {
                originHaveSet = true;
                // 移动视线中心
                let origin = relativeCoordinate((one.clientX + two.clientX) / 2, (one.clientY + two.clientY) / 2, canvas.getBoundingClientRect());
                // 修正视野变化带来的平移量
                translateX = (scaleRatio - 1) * (origin.x - scaleOrigin.x) + translateX;
                translateY = (scaleRatio - 1) * (origin.y - scaleOrigin.y) + translateY;
                setStyle('transform-origin', `${origin.x}px ${origin.y}px`);
                scaleOrigin = origin;
            }
            let matrix = `matrix(${scaleRatio}, 0, 0, ${scaleRatio}, ${translateX}, ${translateY})`;
            setStyle('transform', matrix);
            preTouchesClientx1y1x2y2 = [one.clientX, one.clientY, two.clientX, two.clientY];
        }
        e.preventDefault();
    });
    canvas.addEventListener('touchstart', e => {
        let touches = e.touches;
        if (touches.length > 1) {
            let one = touches['0'];
            let two = touches['1'];
            preTouchesClientx1y1x2y2 = [one.clientX, one.clientY, two.clientX, two.clientY];
            originHaveSet = false;
        }
        recordPreTouchPosition(touches['0']);
    });
    // 触摸点离开时更新最后位置
    canvas.addEventListener('touchend', e => {
        let touches = e.touches;
        if (touches.length === 1) {
            recordPreTouchPosition(touches['0']);
        }
    });
    canvas.addEventListener('touchcancel', e => {
        let touches = e.touches;
        if (touches.length === 1) {
            recordPreTouchPosition(touches['0']);
        }
    });
    //todo 浏览器兼容
    let passiveSupport = false;
    try {
        let option = Object.defineProperty({}, 'passive', {
            get: () => {
                console.log('support');
                passiveSupport = true;
            }
        });
        window.addEventListener('passivetest', null, option);
    } catch (err) {
    }
    // 仅针对无 scroll 页面的写法
    // 现阶段无法实现兼容 scroll 与阻止默认的浏览器自定义下拉事件（如微信）
    document.body.addEventListener('touchmove', (e) => {
        e.preventDefault();
    }, passiveSupport ? {
        passive: false
    } : false);
}

//todo 矩阵坐标转换
function getXY(mouseX, mouseY) {
    let matrix = [1, 0, 0, 1, 0, 0];
    let newX = mouseX * matrix [0] + mouseY * matrix [2] + matrix [4];
    let newY = mouseX * matrix [1] + mouseY * matrix [3] + matrix [5];
    return ({x: newX, y: newY});
}