/**
 * __author__ zhangyunliang
 **/



let canvas = document.querySelectorAll('#canvas_box')[0];
let context = canvas.getContext('2d');
let scale = 1.00; //缩放倍率
let img = new Image();
let bigDiv = document.getElementById("bigDiv");

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
                let spanX = NP.minus(currentX, oldX);
                let spanY = NP.minus(currentY, oldY);
                spanLeft = NP.plus(spanLeft, spanX);
                spanTop = NP.plus(spanTop, spanY);
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
            $("#bigDiv").css({'left': NP.plus(left, spanLeft), 'top': NP.plus(top, spanTop)});
        } else {
            $("#bigDiv").css({'width': NP.times(img.width, scale), 'height': NP.times(img.height, scale)});
            $("#bigDiv").css({'left': NP.plus(left, spanLeft), 'top': NP.plus(top, spanTop)});
        }
        //清除画布
        context.clearRect(-spanLeft, -spanTop, canvas.width, canvas.height);
        context.drawImage(img, left, top, width, height);
        bindDom();
    }
};

function Refresh_List(doms) {
    $('#code_table>tbody').html("");
    let append_html = '';
    for (let k = 0; k < doms.length; k++) {
        //todo 更新控件列表
        append_html += '<tr>\n' +
            '<td>' + doms[k].control_name + '</td>\n' +
            '<td>' + doms[k].qrCode + '</td>\n' +
            '<td>' + doms[k].assetName + '</td>\n' +
            '<td class="edit">\n' +
            '<a href="javascript:void(0);" data-toggle="modal" data-target="#delete_control_Model">\n' +
            '<img src="img/pic/edit.png" class="edit_img" data-toggle="modal" data-target="#editControlModel" onclick="edit_control(' + "'" + doms[k].control_name + "'" + ',this)">\n' +
            '</a>\n' +
            '</td>\n' +
            '</tr>';

    }
    $('#code_table>tbody').append(append_html);
}

//todo 拖拽复制、添加隐藏域(绑定旋转缩放事件)
function Add_Controls(doms) {
    //console.log(doms);
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
        } else {
            move_obj.className = 'nodes no-radius';
        }


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
            '<img src="img/pic/edit.png" class="edit_img" data-toggle="modal" data-target="#editControlModel" onclick="edit_control(' + "'" + move_obj.id + "'" + ',this)">\n' +
            '</a>\n' +
            '</td>\n' +
            '</tr>';
        $('#code_table>tbody').append(append_html);
        // $("#" + move_obj.id + " input").remove();
        bigDiv.append(move_obj);
        $("#" + move_obj.id ).css("transform", "rotate(" + shape.control_angle + "deg)");
        move_obj.onmouseenter = function () {
            let tips = document.createElement('div');
            tips.innerHTML = "控件信息(" + move_obj.id + ")<span class='arrow'></span>";
            tips.className = "tooltips " + move_obj.id;
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
    }
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
            document.getElementById(arr[k][0]['control_name']).style.left = NP.times(scale, x) + 'px';
            document.getElementById(arr[k][0]['control_name']).style.top = NP.times(scale, y) + 'px';
        }
    }
}

//todo 替换变量里面的px
function rmpx(str) {
    return str.toString().replace('px', '');
}