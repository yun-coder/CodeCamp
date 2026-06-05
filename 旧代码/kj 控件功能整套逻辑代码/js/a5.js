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
let control_arrs = [];

$(document).ready(function () {
    let template_id = getQuery('template_id');
    let status = getQuery('status');
    //console.log(status);
    if (!status) {
        toastr.error("缺少状态值参数");
        return;
    }
    //todo  status为1查看 status为2编辑
    if (status == 2) {
        $("#short_save").css('display', 'none');
        $("#long_save").css('display', 'none');
        $("#move_box").css('display', 'none');
        $("#move_box2").css('display', 'none');
        $("#change-btn").css('display', 'none');

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
                if (Template_Info.detailList[0].control_name == "") {
                    toastr.error("该模板没有添加任何控件，无法显示");
                } else {
                    Add_Controls2(Template_Info.detailList);
                    let num = control_arrs[control_arrs.length -1];
                    console.log(num);
                    control_code = ++num;
                }
            }
        },
        error: function (error) {
            toastr.error(error[0].data);
        }
    });

    document.getElementById('move_box').addEventListener('mousedown', function (e) {
        if (SAVED != false) {
            return;
        }
        let move_obj = document.getElementById('move_box').cloneNode(true);
        bigDiv.appendChild(move_obj);
        move_obj.id = 'node' + control_code;
        move_obj.style.width = $("#move_box").css('width');
        move_obj.style.height = $("#move_box").css('height');

        let margin_left = NP.divide(NP.minus($(window).get(0).innerWidth, rmpx(bigDiv.style.width)), 2);
        let margin_top = NP.divide(NP.minus($(window).get(0).innerHeight, rmpx(bigDiv.style.height)), 2);

        document.onmousemove = function (evt) {
            let touch = evt || event;
            move_obj.style.left = NP.minus(NP.round(touch.clientX, 2), rmpx($("#" + move_obj.id).css('width')), NP.round(margin_left, 2), globel_left) + 'px';
            move_obj.style.top = NP.minus(NP.round(touch.clientY, 2), rmpx($("#" + move_obj.id).css('height')), NP.round(margin_top, 2), globel_top) + 'px';
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

        let margin_left = NP.divide(NP.minus($(window).get(0).innerWidth, rmpx(bigDiv.style.width)), 2);
        let margin_top = NP.divide(NP.minus($(window).get(0).innerHeight, rmpx(bigDiv.style.height)), 2);
        document.onmousemove = function (evt) {
            let touch = evt || event;
            move_obj.style.left = NP.minus(NP.round(touch.clientX, 2), rmpx($("#" + move_obj.id).css('width')), NP.round(margin_left, 2), globel_left) + 'px';
            move_obj.style.top = NP.minus(NP.round(touch.clientY, 2), rmpx($("#" + move_obj.id).css('height')), NP.round(margin_top, 2), globel_top) + 'px';

            bigDiv.style.cursor = 'move';
        };
        document.onmouseup = function (ev) {
            document.onmousemove = null;
            document.onmouseup = null;
            Add_Controls(move_obj, ev, 0);
        };
    });


});

//todo 显示控件添加
function Add_Controls2(doms) {
    //todo 保持呼吸灯效果一致
    $(".nodes").css({'animation-name': 'test', '-webkit-animation-name': 'test'});
    setTimeout(function () {
        $(".nodes").css({'animation-name': 'breathe', '-webkit-animation-name': 'breathe'});
    }, 100);
    $('#code_table>tbody').html("");
    for (let k = 0; k < doms.length; k++) {
        let move_obj = document.createElement('div');
        move_obj.id = doms[k].control_name;
        let shape = JSON.parse(doms[k].control_shape);
        move_obj.style.left = shape.x + "px";
        move_obj.style.top = shape.y + "px";

        move_obj.style.width = shape.width + "px";
        move_obj.style.height = shape.height + "px";

        if (doms[k].qrCode == 'undefined' || doms[k].qrCode == undefined) {
            doms[k].qrCode = '暂未绑定控件';
        }
        if (doms[k].assetName == 'undefined' || doms[k].assetName == undefined) {
            doms[k].assetName = '暂未绑定控件';
        }
        if (doms[k].control_type == "circle") {
            move_obj.className = 'nodes';
            move_obj.innerHTML = '<div class="around">\n' +
                '    <div id="topleft" class="nodebo node_top_left"></div>\n' +
                '    <div id="topcenter" class="nodebo node_top_center"></div>\n' +
                '    <div id="topright" class="nodebo node_top_right"></div>\n' +
                '    <div id="centerleft" class="nodebo node_center_left"></div>\n' +
                '    <div id="centerright" class="nodebo node_center_right"></div>\n' +
                '    <div id="bottomleft" class="nodebo node_bottom_left"></div>\n' +
                '    <div id="bottomcenter" class="nodebo node_bottom_center"></div>\n' +
                '    <div id="bottomright" class="nodebo node_bottom_right"></div>\n' +
                '</div>';
        } else {
            move_obj.className = 'nodes no-radius';
            //todo 方形控件
            move_obj.innerHTML = '<div class="around">\n' +
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
        }
        move_obj.ondblclick = function () {
            $("#" + move_obj.id + " .around").css('display', 'block');
            $("#" + move_obj.id).attr('data_action', 'can_copy');
            isRotate = false;
        };

        //todo 将拖拽进来的控件节点存入 hidden input
        let _input = document.createElement("input");
        _input.type = 'hidden';
        _input.name = move_obj.id;
        _input.className = 'hide_input';
        let arr2 = JSON.stringify([{
            x: shape.x,
            y: shape.y,
            control_name: move_obj.id,
            width: rmpx(move_obj.style.width),
            height: rmpx(move_obj.style.height)
        }]);
        _input.value = arr2;
        move_obj.appendChild(_input);

        //todo 更新控件列表
        let append_html = '<tr>\n' +
            '<td>' + move_obj.id + '</td>\n' +
            '<td>' + doms[k].qrCode + '</td>\n' +
            '<td>' + doms[k].assetName + '</td>\n' +
            '<td class="edit">\n' +
            '<a href="javascript:void(0);" data-toggle="modal" data-target="#delete_control_Model">\n' +
            '<img src="img/pic/delete.png" class="delete_img" onclick="delete_control(' + "'" + move_obj.id + "'" + ',this)">\n' +
            '</a>\n' +
            '</td>\n' +
            '</tr>';
        $('#code_table>tbody').append(append_html);
        // $("#" + move_obj.id + " input").remove();
        bigDiv.append(move_obj);
        $("#" + move_obj.id ).css("transform", "rotate(" + shape.control_angle + "deg)");
        if (move_obj.className == "nodes no-radius") {
            SetRotate($("#" + move_obj.id + " .node_scale"), move_obj.id);
        }
        move_obj.onmouseenter = function () {
            let tips = document.createElement('div');
            tips.innerHTML = "控件信息(" + doms[k].control_name + ")<span class='arrow'></span>";
            tips.className = "tooltips " + doms[k].control_name;
            bigDiv.append(tips);
            $("." + move_obj.id).css({
                'display': 'flex',
                'left': Math.abs(parseInt(move_obj.style.left) - parseInt(move_obj.style.width)) + "px",
                'top': Math.abs(parseInt(move_obj.style.top) - parseInt(move_obj.style.height)) + "px"
            });
        };
        move_obj.onmouseleave = function () {
            $("." + move_obj.id).remove();
        };
        //todo 改变控件大小
        change_size(move_obj.id);
        BindEvent(move_obj.id);

        //todo 保存控件位置
        let JsonData = JSON.parse(arr2);
        JsonData[0].x = JsonData[0].x.toString();
        JsonData[0].y = JsonData[0].y.toString();
        let data = {
            'control_name': JsonData[0].control_name,
            'location_x': JsonData[0].x.toString(),
            'location_y': JsonData[0].y.toString(),
            'control_type': doms[k].control_type,
            'control_shape': JsonData[0]
        };
        All_Controls.push(data);
        console.log(JsonData[0].control_name.split('node')[1]);
        control_arrs.push(JsonData[0].control_name.split('node')[1]);
    }
}

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
    if (keyCodeArr.toString() === '27' && keyCodeArr.toString() != "") {
        isRotate = true;
        let cid;
        $("#bigDiv .nodes").each(function (index, item) {
            if ($("#" + item.id).children('.around').css('display') == 'block') {
                cid = item.id;
            }
        });
        changeInputValue(cid);
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
        'left': NP.round(NP.divide(NP.minus($(window).get(0).innerWidth, Template_Info.width), 2), 2),
        'top': NP.round(NP.divide(NP.minus($(window).get(0).innerHeight, Template_Info.height), 2), 2),
        'width': Template_Info.width + "px",
        'height': Template_Info.height + "px"
    });
    $("#canvas_box").css({
        'margin-left': NP.round(NP.divide(NP.minus($(window).get(0).innerWidth, Template_Info.width), 2), 2),
        'margin-top': NP.round(NP.divide(NP.minus($(window).get(0).innerHeight, Template_Info.height), 2), 2)
    });


    let oldX = 0, oldY = 0;
    let isMove = false;
    let spanLeft = 0, spanTop = 0;

    $(window).resize(function () {
        canvas.width = Template_Info.width;
        canvas.height = Template_Info.height;
        $(".control_box").css({
            'position': 'absolute',
            'left': NP.round(NP.divide(NP.minus($(window).get(0).innerWidth, Template_Info.width), 2), 2),
            'top': NP.round(NP.divide(NP.minus($(window).get(0).innerHeight, Template_Info.height), 2), 2),
            'width': Template_Info.width + "px",
            'height': Template_Info.height + "px"
        });
        $("#canvas_box").css({
            'margin-left': NP.round(NP.divide(NP.minus($(window).get(0).innerWidth, Template_Info.width), 2), 2),
            'margin-top': NP.round(NP.divide(NP.minus($(window).get(0).innerHeight, Template_Info.height), 2), 2)
        });
        show();
    });
    img.src = Template_Info.base_map;
    // if (isPhone()) {
    //     Mobile_move();
    // }
    img.onload = function () {
        show();
        //鼠标移动事件
        addMouseWheel(canvas, function (e) {
            let temp = e.delta > 0 ? 0.1 : -0.1;
            scale = NP.plus(scale, temp);
            //缩放极限判断
            scale = scale < 0.3 ? 0.3 : scale;
            scale = scale > 2 ? 2 : scale;
            scale = NP.round(scale, 2);
            //console.log(scale);
            show();
        });
        canvas.onmousedown = function (e) {
            oldX = e.clientX;
            oldY = e.clientY;
            isMove = true;
        };
        canvas.onclick = function (e) {
            e.preventDefault();
        };
        canvas.onmousemove = function (e) {
            if (isMove) {
                canvas.style.cursor = 'move';
                let currentX = e.clientX;
                let currentY = e.clientY;
                //计算移动的距离
                let spanX = NP.minus(currentX, oldX);
                let spanY = NP.minus(currentY, oldY);
                spanLeft = NP.plus(spanLeft, spanX);
                spanTop = NP.plus(spanTop, spanY);
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

        let width = NP.times(img.width, scale);
        let height = NP.times(img.height, scale);
        //居中显示
        let left = NP.divide(NP.minus(cWidth, width), 2);
        let top = NP.divide(NP.minus(cHeight, height), 2);

        if (scale == 1) {
            $("#bigDiv").css({'width': img.width, 'height': img.height});
            //$("#bigDiv").css({'left': left, 'top': top});
            $("#bigDiv").css({'left': NP.plus(left, spanLeft), 'top': NP.plus(top, spanTop)});
        } else {
            $("#bigDiv").css({'width': NP.times(img.width, scale), 'height': NP.times(img.height, scale)});
            //$("#bigDiv").css({'left': left, 'top': top});
            $("#bigDiv").css({'left': NP.plus(left, spanLeft), 'top': NP.plus(top, spanTop)});
        }
        //清除画布
        //console.log("移动距离", spanLeft, spanTop);
        globel_left = spanLeft;
        globel_top = spanTop;
        //console.log(spanLeft, spanTop);
        bindDom();
        context.clearRect(-spanLeft, -spanTop, canvas.width, canvas.height);
        context.drawImage(img, left, top, width, height);
    }

};

function changeInputValue(id) {
    //todo 将宽高加入隐藏框
    let _value = JSON.parse($("#" + id + " input").val());
    $("#bigDiv .nodes").each(function (index, item) {
        $("#" + item.id).removeAttr('data_action');
        $("#" + item.id + " .around").css('display', 'none');
    });
    _value[0].y = NP.round(NP.divide(rmpx($("#" + id).css('top')), scale), 2);
    _value[0].x = NP.round(NP.divide(rmpx($("#" + id).css('left')), scale), 2);
    _value[0].width = NP.round(NP.divide(rmpx($("#" + id).css('width')), scale), 2);
    _value[0].height = NP.round(NP.divide(rmpx($("#" + id).css('height')), scale), 2);
    $("#" + id + " input").val(JSON.stringify(_value));
    for (let k = 0; k < All_Controls.length; k++) {
        if (All_Controls[k].control_name == id) {
            All_Controls[k].control_shape.y = NP.round(NP.minus(NP.divide(rmpx($("#" + id).css('top')), scale), 0), 2);
            All_Controls[k].control_shape.x = NP.round(NP.minus(NP.divide(rmpx($("#" + id).css('left')), scale), 0), 2);
            All_Controls[k].control_shape.width = NP.round(NP.divide(rmpx($("#" + id).css('width')), scale), 2);
            All_Controls[k].control_shape.height = NP.round(NP.divide(rmpx($("#" + id).css('height')), scale), 2);
        }
    }
}

function change_value(id) {
    let str = JSON.parse($("#" + id + " input").val());
    str[0].x = NP.round(NP.divide(rmpx($("#" + id).css('left')), scale), 2);
    str[0].y = NP.round(NP.divide(rmpx($("#" + id).css('top')), scale), 2);
    str[0].width = NP.round(NP.divide(rmpx($("#" + id).css('width')), scale), 2);
    str[0].height = NP.round(NP.divide(rmpx($("#" + id).css('height')), scale), 2);
    $("#" + id + " input").val(JSON.stringify(str));
    for (let k = 0; k < All_Controls.length; k++) {
        if (All_Controls[k].control_name == id) {
            All_Controls[k].control_shape.y = NP.round(NP.minus(NP.divide(rmpx($("#" + id).css('top')), scale), 0), 2);
            All_Controls[k].control_shape.x = NP.round(NP.minus(NP.divide(rmpx($("#" + id).css('left')), scale), 0), 2);
            All_Controls[k].control_shape.width = NP.round(NP.divide(rmpx($("#" + id).css('width')), scale), 2);
            All_Controls[k].control_shape.height = NP.round(NP.divide(rmpx($("#" + id).css('height')), scale), 2);
        }
    }
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

            let margin_left = NP.divide(NP.minus($(window).get(0).innerWidth, rmpx(bigDiv.style.width)), 2);
            let margin_top = NP.divide(NP.minus($(window).get(0).innerHeight, rmpx(bigDiv.style.height)), 2);
            document.onmousemove = function (evt) {
                let touch = evt || event;
                move_obj.style.left = NP.minus(NP.round(touch.clientX, 2), NP.divide(rmpx($("#" + id).css('width')), 2), NP.round(margin_left, 2), globel_left) + 'px';
                move_obj.style.top = NP.minus(NP.round(touch.clientY, 2), NP.divide(rmpx($("#" + id).css('height')), 2), NP.round(margin_top, 2), globel_top) + 'px';
                bigDiv.style.cursor = 'move';
            };
            document.onmouseup = function (ev) {
                document.onmousemove = null;
                document.onmouseup = null;
                keyCodeArr = [];
                isRotate = true;
                $("#bigDiv .nodes").each(function (index, item) {
                    $("#" + item.id).removeAttr('data_action');
                    $("#" + item.id + " .around").css('display', 'none');
                });
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
                        x: NP.minus(touch.clientX, _start_position.x),
                        y: NP.minus(touch.clientY, _start_position.y)
                    };
                    if (Math.abs(distance.x) > Math.abs(distance.y)) {
                        many_copy.style.left = NP.minus(touch.clientX, _left) + 'px';
                        many_copy.style.top = '0';
                    } else {
                        many_copy.style.left = '0';
                        many_copy.style.top = NP.minus(touch.clientY, _top) + 'px';
                    }
                    bigDiv.style.cursor = 'move';
                };
                document.onmouseup = function (ev) {
                    let _left = rmpx($("#box").css('left'));
                    let _top = rmpx($("#box").css('top'));
                    $("#bigDiv").append($("#box").children());
                    for (let k = 0; k < ids.length; k++) {
                        $("#" + ids[k]).css({
                            'left': NP.plus(rmpx($("#" + ids[k]).css('left')), _left) + "px",
                            'top': NP.plus(rmpx($("#" + ids[k]).css('top')), _top) + "px"
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

                let margin_left = NP.divide(NP.minus($(window).get(0).innerWidth, rmpx(bigDiv.style.width)), 2);
                let margin_top = NP.divide(NP.minus($(window).get(0).innerHeight, rmpx(bigDiv.style.height)), 2);
                document.onmousemove = function (evt) {
                    let touch = evt || event;
                    let distance = {
                        x: NP.minus(touch.clientX, _start_position.x),
                        y: NP.minus(touch.clientY, _start_position.y)
                    };
                    if (Math.abs(distance.x) > Math.abs(distance.y)) {
                        fx = 'x';
                        $(".can_move_box").remove();
                        bigDiv.append(can_move_box_x);
                        can_move_box_x.appendChild(move_obj);
                        bigDiv.appendChild(can_move_box_x);
                        move_obj.style.left = NP.minus(touch.clientX, NP.divide(rmpx($("#" + move_obj.id).css('width')), 2), margin_left) + 'px';
                        move_obj.style.top = '0';
                    } else {
                        fx = 'y';
                        $(".can_move_box").remove();
                        bigDiv.append(can_move_box_y);
                        can_move_box_y.appendChild(move_obj);
                        bigDiv.appendChild(can_move_box_y);
                        move_obj.style.left = '0';
                        move_obj.style.top = NP.minus(touch.clientY, NP.divide(rmpx($("#" + move_obj.id).css('height')), 2), margin_top) + 'px';
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
                    $("#bigDiv .nodes").each(function (index, item) {
                        $("#" + item.id).removeAttr('data_action');
                        $("#" + item.id + " .around").css('display', 'none');
                    });
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
                many_copy.style.left = NP.minus(touch.clientX, _left) + 'px';
                many_copy.style.top = NP.minus(touch.clientY, _top) + 'px';
                bigDiv.style.cursor = 'move';
            };
            document.onmouseup = function (ev) {
                let _left = rmpx($("#box").css('left'));
                let _top = rmpx($("#box").css('top'));
                $("#bigDiv").append($("#box").children());
                for (let k = 0; k < ids.length; k++) {
                    $("#" + ids[k]).css({
                        'left': NP.plus(rmpx($("#" + ids[k]).css('left')), _left) + "px",
                        'top': NP.plus(rmpx($("#" + ids[k]).css('top')), _top) + "px"
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
                let margin_left = NP.divide(NP.minus($(window).get(0).innerWidth, rmpx(bigDiv.style.width)), 2);
                let margin_top = NP.divide(NP.minus($(window).get(0).innerHeight, rmpx(bigDiv.style.height)), 2);
                document.onmousemove = function (ev) {
                    $('.' + id).css('display', 'none');
                    let touch = ev || event;
                    //todo 此处需要判断图片过高或者过宽
                    document.getElementById(id).style.left = NP.minus(touch.clientX, NP.divide(rmpx($("#" + id).css('width')), 2), margin_left, globel_left) + 'px';
                    document.getElementById(id).style.top = NP.minus(touch.clientY, NP.divide(rmpx($("#" + id).css('height')), 2), margin_top, globel_top) + 'px';
                };
                document.onmouseup = function (ev) {
                    // 移动完之后修改位置;获取移动距离在原来的基础上操作
                    let touch = ev || event;
                    let end_position = {
                        x: touch.clientX,
                        y: touch.clientY
                    };
                    let distance = {
                        x: NP.round(NP.divide(NP.minus(end_position.x, start_position.x), scale), 2),
                        y: NP.round(NP.divide(NP.minus(end_position.y, start_position.y), scale), 2)
                    };
                    if (distance.x != 0 || distance.y != 0) {
                        let input_value = JSON.parse($("#" + id + " input[name='" + id + "']").val());
                        input_value[0].x = NP.round(NP.plus(input_value[0].x, distance.x), 2);
                        input_value[0].y = NP.round(NP.plus(input_value[0].y, distance.y), 2);
                        $("#" + id + " input").val(JSON.stringify(input_value));
                        for (let k = 0; k < All_Controls.length; k++) {
                            if (All_Controls[k].control_name == id) {
                                All_Controls[k].control_shape.y = NP.divide(rmpx($("#" + id).css('top')), scale);
                                All_Controls[k].control_shape.x = NP.divide(rmpx($("#" + id).css('left')), scale);
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
    let margin_left = NP.divide(NP.minus($(window).get(0).innerWidth, rmpx(bigDiv.style.width)), 2);
    let margin_top = NP.divide(NP.minus($(window).get(0).innerHeight, rmpx(bigDiv.style.height)), 2);
    if (isLocal == true) {
        if (fx == 'x') {
            copy_obj.style.left = NP.round(NP.minus(touch.clientX, NP.divide(rmpx($("#" + copy_obj.id).css('width')), 2), margin_left, globel_left), 2) + 'px';
            copy_obj.style.top = $('.can_move_box').css('top');
        } else {
            copy_obj.style.top = NP.round(NP.minus(touch.clientY, NP.divide(rmpx($("#" + copy_obj.id).css('height')), 2), margin_top, globel_top), 2) + 'px';
            copy_obj.style.left = $('.can_move_box').css('left');
        }
        bigDiv.appendChild(copy_obj);
        $('.can_move_box').remove();
    } else {
        copy_obj.style.left = NP.round(NP.minus(touch.clientX, NP.divide(parseInt($("#node" + control_code).css('width')), 2), margin_left, globel_left), 2) + "px";
        copy_obj.style.top = NP.round(NP.minus(touch.clientY, NP.divide(parseInt($("#node" + control_code).css('height')), 2), margin_top, globel_top), 2) + "px";
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
                'left': Math.abs(NP.minus(rmpx(copy_obj.style.left), rmpx(copy_obj.style.width))) + "px",
                'top': Math.abs(NP.minus(rmpx(copy_obj.style.top), rmpx(copy_obj.style.height))) + "px"
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
        x: NP.round(NP.divide(NP.minus(NP.round(touch.clientX, 2), NP.divide(rmpx($("#" + copy_obj.id).css('width')), 2), margin_left, globel_left), scale), 2),
        y: NP.round(NP.divide(NP.minus(NP.round(touch.clientY, 2), NP.divide(rmpx($("#" + copy_obj.id).css('height')), 2), margin_top, globel_top), scale), 2),
        control_name: copy_obj.id,
        control_type: shape,
        width: NP.round(NP.divide(rmpx(copy_obj.style.width), scale), 2),
        height: NP.round(NP.divide(rmpx(copy_obj.style.height), scale), 2)
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
function bindDom() {
    let arr = [];
    $(".hide_input").each(function (i, item) {
        if ($(this).val()) {
            arr.push(JSON.parse($(this).val()));
        }
    });
    if (arr.length > 0) {
        for (let k = 0; k < arr.length; k++) {
            let width = arr[k][0]['width'];
            let height = arr[k][0]['height'];
            let x = arr[k][0]['x'];
            let y = arr[k][0]['y'];
            document.getElementById(arr[k][0]['control_name']).style.width = NP.times(width, scale) + 'px';
            document.getElementById(arr[k][0]['control_name']).style.height = NP.times(height, scale) + 'px';
            // document.getElementById(arr[k][0]['control_name']).style.left = NP.plus(NP.times(scale, x), oldX) + 'px';
            // document.getElementById(arr[k][0]['control_name']).style.top = NP.plus(NP.times(scale, y), oldY) + 'px';
            document.getElementById(arr[k][0]['control_name']).style.left = NP.times(scale, x) + 'px';
            document.getElementById(arr[k][0]['control_name']).style.top = NP.times(scale, y) + 'px';
        }
    }
}

//todo 控件旋转
function SetRotate(obj, parent_id) {
    let offsetX;
    let offsetY;
    let isMouseDown = false;
    obj.on('mousedown', function (e) { //鼠标按下
        offsetX = NP.divide(NP.plus(rmpx($("#" + parent_id).css('left')), rmpx($("#" + parent_id).css("width"))), 2);
        offsetY = NP.divide(NP.plus(rmpx($("#" + parent_id).css('top')), rmpx($("#" + parent_id).css("height"))), 2);
        isMouseDown = true;
    });
    $(document).on('mousemove', function (ev) {
        if (isMouseDown) {
            let ox = NP.minus(rmpx(ev.pageX), rmpx(offsetX));//计算出鼠标相对于画布中心的位置
            let oy = NP.minus(rmpx(ev.pageY), rmpx(offsetY));
            let to = Math.abs(NP.divide(ox, oy));
            let angle = NP.times(NP.divide(Math.atan(to), (2 * Math.PI)), 360);//鼠标相对于旋转中心的角度
            if (ox < 0 && oy < 0) {
                angle = -angle - 5;
            } else if (ox < 0 && oy > 0) {
                angle = -(180 - angle);
            } else if (ox > 0 && oy < 0) {
                angle = angle + 5;
            } else if (ox > 0 && oy > 0) {
                angle = 180 - angle;
            }
            $("#" + parent_id).css("transform", "rotate(" + angle + "deg)");
            $("#" + parent_id).attr('degs', angle);
            let info = JSON.parse($("#" + parent_id + " input").val());
            info[0].control_angle = angle;
            $("#" + parent_id + " input").val(JSON.stringify(info));
        }
    }).on('mouseup', function () {
        for (let k = 0; k < All_Controls.length; k++) {
            if (All_Controls[k].control_name == parent_id) {
                All_Controls[k].control_shape.control_angle = $("#" + parent_id).attr('degs');
            }
        }
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
        InitPositionY = rmpx($("#" + obj).css("top"));
        InitPositionX = rmpx($("#" + obj).css("left"));
        InitHeight = rmpx($("#" + obj).height());
        InitWidth = rmpx($("#" + obj).width());
        let now_control = 0;
        $("#bigDiv .nodes").each(function (index, item) {
            if ($("#" + item.id).children('.around').css('display') == 'block') {
                now_control++;
            }
        });
        if (now_control > 1) {
            toastr.error("只能修改一个目标控件");
            return;
        }
        $(document).on('mousemove', function (e) {
            //鼠标移动
            if (isMouseDown) {
                let hh = NP.minus(rmpx(e.pageY), rmpx(mouseDownPosiY));
                let ww = NP.minus(rmpx(e.pageX), rmpx(mouseDownPosiX));
                let tempY = NP.plus(hh, InitPositionY);
                let tempX = NP.plus(ww, InitPositionX);
                //todo 修改元素属性
                switch (mousedownid) {
                    case "topleft":
                        $("#" + obj).css({
                            "top": tempY + "px",
                            "height": NP.minus(InitHeight, hh) + "px",
                            "left": tempX + "px",
                            "width": NP.minus(InitWidth, ww) + "px"
                        });
                        break;
                    case "topcenter":
                        $("#" + obj).css({"top": tempY + "px", "height": NP.minus(InitHeight, hh) + "px"});
                        break;
                    case "topright":
                        $("#" + obj).css({
                            "top": tempY + "px",
                            "height": NP.minus(InitHeight, hh) + "px",
                            "width": NP.plus(InitWidth, ww) + "px"
                        });
                        break;
                    case "centerleft":
                        $("#" + obj).css({"left": tempX + "px", "width": NP.minus(InitWidth, ww) + "px"});
                        break;
                    case "centerright":
                        $("#" + obj).css({"width": NP.plus(InitWidth, ww) + "px"});
                        break;
                    case "bottomleft":
                        $("#" + obj).css({
                            "height": NP.plus(InitHeight, hh) + "px",
                            "left": tempX + "px",
                            "width": NP.minus(InitWidth, ww) + "px"
                        });
                        break;
                    case "bottomcenter":
                        $("#" + obj).css("height", NP.plus(InitHeight, hh) + "px");
                        break;
                    case "bottomright":
                        $("#" + obj).css({
                            "height": NP.plus(InitHeight, hh) + "px",
                            "width": NP.plus(InitWidth, ww) + "px"
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
    obj.parentNode.parentNode.parentNode.parentNode.removeChild(obj.parentNode.parentNode.parentNode);
    $("#bigDiv #" + id).remove();
    $.ajax({
        url: 'http://47.96.99.70:8080/standard-test/delTempletControl.html',
        data: {'template_id': template_id, 'control_name': id},
        type: 'GET',
        dataType: 'json',
        success: function (res) {
            for (let k = 0; k < All_Controls.length; k++) {
                if(All_Controls[k].control_name == id){
                    All_Controls.splice(k,1);
                }
            }
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
    //todo status=1 临时保存可编辑   status=2 另存为可编辑    status =3  永久保存不可编辑
    $.ajax({
        url: 'http://47.96.99.70:8080/standard-test/AddTemplateDetail.html',
        dataType: 'json',
        data: {'template_id': Template_Info.template_id.toString(), 'jsonString': Str, 'status': "2"},
        type: 'POST',
        success: function (res) {
            if (res[0].Code == 200) {
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


//todo 替换变量里面的px
function rmpx(str) {
    return str.toString().replace('px', '');
}