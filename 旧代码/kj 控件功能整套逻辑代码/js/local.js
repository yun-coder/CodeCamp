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
let SAVED = false;
let has_translate = false;
let globel_left = 0;
let globel_top = 0;
let change_x = 0;
let change_y = 0;

$(document).ready(function () {
    //toastr.info('按住 Control_L 键或 Control_L+Shift_L 拖拽复制', '友情提示');
    let template_id = getQuery('template_id');
    if (!template_id) {
        toastr.info("请选择模板操作");
    }
    //todo 获取模板返回
    // $.ajax({
    //     url: 'http://47.96.99.70:8080/standard-test/getTemplateDetailById.html',
    //     dataType: 'json',
    //     type: 'GET',
    //     data: {'template_id': template_id},
    //     success: function (res) {
    //         if (res[0].Code == 200) {
    //             Template_Info = res[0].data;
    //             Template_Info = {
    //                 template_name:'测试',
    //                 width:1920,
    //                 height:1080,
    //                 map_width: 1123,
    //                 map_height: 796,
    //                 base_map:'../img/t2.jpg'
    //             };
    //             load_template();
    //         }
    //     },
    //     error: function (error) {
    //         toastr.error(error[0].data);
    //     }
    // });
    Template_Info = {
        template_name:'测试',
        width:1920,
        height:1080,
        map_width: 1123,
        map_height: 796,
        base_map:'../img/t2.jpg'
    };
    load_template();

    document.getElementById('move_box').addEventListener('mousedown', function (e) {
        if (SAVED != false) {
            return;
        }
        let move_obj = document.getElementById('move_box').cloneNode(true);
        bigDiv.appendChild(move_obj);
        move_obj.id = 'node' + control_code;
        move_obj.style.width = $("#move_box").css('width');
        move_obj.style.height = $("#move_box").css('height');

        let margin_left = ($(window).get(0).innerWidth - parseInt(bigDiv.style.width)) / 2;
        let margin_top = ($(window).get(0).innerHeight - parseInt(bigDiv.style.height)) / 2;
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
        if (SAVED != false) {
            return;
        }
        let move_obj = document.getElementById('move_box2').cloneNode(true);
        bigDiv.appendChild(move_obj);
        move_obj.id = 'node' + control_code;
        move_obj.style.width = $("#move_box2").css('width');
        move_obj.style.height = $("#move_box2").css('height');

        let margin_left = ($(window).get(0).innerWidth - parseInt(bigDiv.style.width)) / 2;
        let margin_top = ($(window).get(0).innerHeight - parseInt(bigDiv.style.height)) / 2;
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
    if (keyCodeArr.toString() === '27' && keyCodeArr.toString() != "") {
        isRotate = true;
        console.log(change_x);
        //console.log(change_y);
        $("#bigDiv .nodes").each(function (index, item) {
            if ($("#" + item.id + " .around").css('display') == 'block') {
                changeInputValue(item.id, change_x, change_y);
            }
        });

        $(".around").css('display', 'none');
    }
};
//todo 按键取消
document.onkeyup = function () {
    //document.onkeydown = null;
    keyCodeArr = deleteKeyCodeArr(event.keyCode, keyCodeArr);
};

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
                //console.log('放大');
            } else {
                //console.log('缩小');
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
                //console.log('放大');
            } else {
                //console.log('缩小');
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

    $(window).resize(function () {
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
        show();
    });
    img.src = Template_Info.base_map;

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
        canvas.onclick = function (e) {
            return;
        };
        canvas.onmousemove = function (e) {
            if (isMove) {
                canvas.style.cursor = 'move';
                let currentX = e.clientX;
                let currentY = e.clientY;
                //计算移动的距离
                let spanX = currentX - oldX;
                let spanY = currentY - oldY;
                spanLeft += spanX;
                spanTop += spanY;
                context.translate(spanX, spanY);
                has_translate = true;
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
            e.preventDefault();
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
        //console.log("移动距离", spanLeft, spanTop);
        globel_left = spanLeft;
        globel_top = spanTop;
        bindDom(spanLeft, spanTop);
        context.clearRect(-spanLeft, -spanTop, canvas.width, canvas.height);
        context.drawImage(img, left, top, width, height);
    }

};

function changeInputValue(id, x, y) {
    //todo 将宽高加入隐藏框
    let _value = JSON.parse($("#" + id + " input").val());
    if(parseInt(y) < 0){
        _value[0].y = _value[0].y + parseInt(y / scale);
    }

    _value[0].x = _value[0].x + parseInt(x / scale);

    _value[0].width = parseInt(parseInt($("#" + id).css('width')) / scale);
    _value[0].height = parseInt(parseInt($("#" + id).css('height')) / scale);
    $("#" + id + " input").val(JSON.stringify(_value));
    for (let k = 0; k < All_Controls.length; k++) {
        if (All_Controls[k].control_name == id) {
            All_Controls[k].control_shape.y = parseInt($("#" + id).css('top')) / scale - globel_top;
            All_Controls[k].control_shape.x = parseInt($("#" + id).css('left')) / scale - globel_left;
            All_Controls[k].control_shape.width = parseInt($("#" + id).css('width')) / scale;
            All_Controls[k].control_shape.height = parseInt($("#" + id).css('height')) / scale;
        }
    }
}

function change_value(id) {
    let str = JSON.parse($("#" + id + " input").val());
    str[0].x = parseInt($("#" + id).css('left').replace('px', '')) / scale;
    str[0].y = parseInt($("#" + id).css('top').replace('px', '')) / scale;
    str[0].width = parseInt($("#" + id).css('width')) / scale + "px";
    str[0].height = parseInt($("#" + id).css('height')) / scale + "px";
    $("#" + id + " input").val(JSON.stringify(str));
}

function BindEvent(id) {
    if (SAVED != false) {
        return;
    }
    document.getElementById(id).addEventListener('mousedown', function (e) {
        if (keyCodeArr.toString() === '17' && keyCodeArr.toString() != "") {

            let move_obj = document.getElementById(id).cloneNode(true);
            bigDiv.appendChild(move_obj);
            move_obj.id = 'node' + control_code;
            move_obj.style.width = $("#" + id).css('width');
            move_obj.style.height = $("#" + id).css('height');

            let margin_left = ($(window).get(0).innerWidth - parseInt(bigDiv.style.width)) / 2;
            let margin_top = ($(window).get(0).innerHeight - parseInt(bigDiv.style.height)) / 2;
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
        } else if ((keyCodeArr.toString() === '17,16' || keyCodeArr.toString() === '16,17') && keyCodeArr.toString() != "") {
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
                    let _left = parseInt($("#box").css('left'));
                    let _top = parseInt($("#box").css('top'));
                    $("#bigDiv").append($("#box").children());
                    for (let k = 0; k < ids.length; k++) {
                        $("#" + ids[k]).css({
                            'left': parseInt($("#" + ids[k]).css('left')) + _left + "px",
                            'top': parseInt($("#" + ids[k]).css('top')) + _top + "px"
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
            } else {
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

                let margin_left = ($(window).get(0).innerWidth - parseInt(bigDiv.style.width)) / 2;
                let margin_top = ($(window).get(0).innerHeight - parseInt(bigDiv.style.height)) / 2;
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
        } else if (keyCodeArr.toString() === '16' && keyCodeArr.toString() != "") {
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
                let _left = parseInt($("#box").css('left'));
                let _top = parseInt($("#box").css('top'));
                $("#bigDiv").append($("#box").children());
                for (let k = 0; k < ids.length; k++) {
                    $("#" + ids[k]).css({
                        'left': parseInt($("#" + ids[k]).css('left')) + _left + "px",
                        'top': parseInt($("#" + ids[k]).css('top')) + _top + "px"
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
        } else {
            // todo 绑定移动
            if (isRotate == true) {
                let touch = e || event;
                let start_position = {
                    x: touch.clientX,
                    y: touch.clientY
                };
                let margin_left = ($(window).get(0).innerWidth - parseInt(bigDiv.style.width)) / 2;
                let margin_top = ($(window).get(0).innerHeight - parseInt(bigDiv.style.height)) / 2;
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
                    if (distance.x != 0 || distance.y != 0) {
                        let input_value = JSON.parse($("#" + id + " input[name='" + id + "']").val());
                        input_value[0].x = parseInt(input_value[0].x) + parseInt(distance.x);
                        input_value[0].y = parseInt(input_value[0].y) + parseInt(distance.y);
                        $("input[name='" + id + "']").val(JSON.stringify(input_value));
                        for (let k = 0; k < All_Controls.length; k++) {
                            if (All_Controls[k].control_name == id) {
                                All_Controls[k].control_shape.y = parseInt(parseInt($("#" + id).css('top')) / scale);
                                All_Controls[k].control_shape.x = parseInt(parseInt($("#" + id).css('left')) / scale);
                            }
                        }
                    }
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
    let margin_left = ($(window).get(0).innerWidth - parseInt(bigDiv.style.width)) / 2;
    let margin_top = ($(window).get(0).innerHeight - parseInt(bigDiv.style.height)) / 2;
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
        isRotate = false;
        $("#" + copy_obj.id + " .around").css('display', 'block');
        //todo 同时只能获取一个
        $("#" + copy_obj.id).siblings().children(".around").css('display', 'none');
        $("#" + copy_obj.id).attr('data_action', 'can_copy');
    };

    //todo 显示信息
    copy_obj.onmouseenter = function () {
        if ($("#" + copy_obj.id + " .around").css('display') == 'none') {
            let tips = document.createElement('div');
            tips.innerHTML = "控件信息(" + copy_obj.id + ")<span class='arrow'></span>";
            tips.className = "tooltips " + copy_obj.id;
            bigDiv.append(tips);
            $("." + copy_obj.id).css({
                'display': 'flex',
                'left': Math.abs(parseInt(copy_obj.style.left) - parseInt(copy_obj.style.width)) + "px",
                'top': Math.abs(parseInt(copy_obj.style.top) - parseInt(copy_obj.style.height)) + "px"
            });
        }
    };
    copy_obj.onmouseleave = function () {
        $("." + copy_obj.id).remove();
    };

    //todo 初始值
    isLocal = false;
    keyCodeArr = [];
    //todo 更新控件列表
    if (isLocal == false) {
        bigDiv.appendChild(copy_obj);
    }

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
        x: parseInt((touch.clientX - parseInt($("#" + copy_obj.id).css('width')) / 2 - margin_left) / scale),
        y: parseInt((touch.clientY - parseInt($("#" + copy_obj.id).css('height')) / 2 - margin_top) / scale),
        control_name: copy_obj.id,
        control_type: shape,
        width: parseInt(parseInt(copy_obj.style.width) / scale),
        height: parseInt(parseInt(copy_obj.style.height) / scale)
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
    //todo 改变控件大小
    change_size(copy_obj.id);
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
    if (arr.length > 0) {
        for (let k = 0; k < arr.length; k++) {
            let width = parseInt(arr[k][0]['width']);
            let height = parseInt(arr[k][0]['height']);
            let x = parseInt(arr[k][0]['x']);
            let y = parseInt(arr[k][0]['y']);
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
                angle = -angle - 20;
            } else if (ox < 0 && oy > 0) {
                angle = -(180 - angle);
            } else if (ox > 0 && oy < 0) {
                angle = angle + 20;
            } else if (ox > 0 && oy > 0) {
                angle = 180 - angle;
            }
            $("#" + parent_id).css("transform", "rotate(" + angle + "deg)");
            let info = JSON.parse($("#" + parent_id + " input").val());
            info[0].control_angle = angle;
            $("#" + parent_id + " input").val(JSON.stringify(info));
            for (let k = 0; k < All_Controls.length; k++) {
                if (All_Controls[k].control_name == parent_id) {
                    All_Controls[k].control_shape.control_angle = angle;
                }
            }
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
            //鼠标移动
            if (isMouseDown) {
                let hh = parseInt(e.pageY) - parseInt(mouseDownPosiY);
                let ww = parseInt(e.pageX) - parseInt(mouseDownPosiX);
                change_x = ww;
                change_y = hh;
                let tempY = hh + parseInt(InitPositionY);
                let tempX = ww + parseInt(InitPositionX);
                // console.log(parseInt(InitPositionX));
                // console.log(tempX);
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
                        change_x = 0;
                        break;
                    case "centerleft":
                        $("#" + obj).css({"left": tempX + "px", "width": parseInt(InitWidth) - ww + "px"});
                        break;
                    case "centerright":
                        $("#" + obj).css({"width": parseInt(InitWidth) + ww + "px"});
                        change_x = 0;
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
                        change_x = 0;
                        break;
                    case "MyContent":
                        $("#" + obj).css("left", tempX + "px").css("top", tempY + "px");
                        break;
                }
            }
        }).on('mouseup', function () {
            mousedownid = "";
            isMouseDown = false;
        }).on('mouseleave', function () {
            mousedownid = "";
            isMouseDown = false;
        });
    });
}

/*****************************************************/
//todo 控件删除
function delete_control(id, obj) {
    // toastr.info("暂未开放");
    let template_id = getQuery('template_id');
    obj.parentNode.parentNode.parentNode.parentNode.removeChild(obj.parentNode.parentNode.parentNode);
    $("#bigDiv #" + id).remove();
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

//todo 临时保存
$("#short_save").on('click', function () {
    let Str = JSON.stringify(All_Controls);
    //todo status=1 临时保存可编辑   status=2 另存为可编辑    status =3  永久保存不可编辑
    $.ajax({
        url: 'http://47.96.99.70:8080/standard-test/AddTemplateDetail.html',
        dataType: 'json',
        data: {'template_id': Template_Info.template_id.toString(), 'status': "1", 'jsonString': Str.toString()},
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

//todo 永久保存
$("#long_save").on('click', function () {
    let Str = JSON.stringify(All_Controls);
    console.log(Str);
    //todo status=1 临时保存可编辑   status=2 另存为可编辑    status =3  永久保存不可编辑
    $.ajax({
        url: 'http://47.96.99.70:8080/standard-test/AddTemplateDetail.html',
        dataType: 'json',
        data: {'template_id': Template_Info.template_id.toString(), 'jsonString': Str, 'status': "2"},
        type: 'POST',
        success: function (res) {
            if (res[0].Code == 200) {
                //console.log(res[0].data);
                toastr.info('保存成功，控件已锁定');
                SAVED = true;
                isRotate = false;
                document.onkeydown = null;
                document.onkeyup = null;
                $("#bigDiv .nodes").each(function (index, item) {
                    document.getElementById(item.id).addEventListener('dblclick', function (e) {
                        e.preventDefault();
                        $("#" + item.id + " .around").css('display', 'none');
                        $("#" + item.id).removeAttr('data_action');
                    }, false);
                });
            }
        },
        error: function (error) {
            toastr.error(error[0].data);
        }
    });
});
/*****************************************************/


//todo 乘法
function chengfa(arg1, arg2) {
    var m = 0, s1 = arg1.toString().replace('px', ''), s2 = arg2.toString().replace('px', '');
    try {
        if (s1.split(".")[1] != undefined)
            m += s1.split(".")[1].length
    } catch (e) {
    }
    try {
        if (s2.split(".")[1] != undefined)
            m += s2.split(".")[1].length
    } catch (e) {
    }
    return Number(s1.replace(".", "")) * Number(s2.replace(".", "")) / Math.pow(10, m)
}

//todo 浮点数除法运算
function chufa(arg1, arg2) {
    var r1 = 0, r2 = 0, m, s1 = arg1.toString().replace('px', ''), s2 = arg2.toString().replace('px', '');
    try {
        if (s1.split(".")[1] != undefined)
            r1 = s1.split(".")[1].length;
    } catch (e) {
    }
    try {
        if (s2.split(".")[1] != undefined)
            r2 = s2.split(".")[1].length;
    } catch (e) {
    }
    m = Math.pow(10, Math.max(r1, r2));
    return (chengfa(arg1, m)) / (chengfa(arg2, m));
}

//todo 加法
function jiafa(arg1, arg2) {
    var r1 = 0, r2 = 0, m, s1 = arg1.toString().replace('px', ''), s2 = arg2.toString().replace('px', '');
    try {
        if (s1.split(".")[1] != undefined)
            r1 = s1.split(".")[1].length;
    } catch (e) {
    }
    try {
        if (s2.split(".")[1] != undefined)
            r2 = s2.split(".")[1].length;
    } catch (e) {
    }
    m = Math.pow(10, Math.max(r1, r2));
    return (chengfa(arg1, m) + chengfa(arg2, m)) / m;
}

//todo 减法
function jianfa(arg1, arg2) {
    var r1 = 0, r2 = 0, m, n, s1 = arg1.toString().replace('px', ''), s2 = arg2.toString().replace('px', '');
    try {
        if (s1.split(".")[1] != undefined)
            r1 = s1.split(".")[1].length;
    } catch (e) {
    }
    try {
        if (s2.split(".")[1] != undefined)
            r2 = s2.split(".")[1].length;
    } catch (e) {
    }
    m = Math.pow(10, Math.max(r1, r2));
    //last modify by deeka
    //动态控制精度长度
    n = (r1 >= r2) ? r1 : r2;
    return (chengfa(arg1, m) - chengfa(arg2, m)) / m;
}