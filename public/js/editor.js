(function () {
  "use strict";
  
  // Editor的设置
  // Editor的载入是<div id="editor"></div>
  // 其中可以设置一些属性例如 <div id="editor" data-submitname="gogogo"></div> 就是把editor在form中textarea的name修改为gogogo
  // 其中可以设置一些属性例如 <div id="editor" data-cache="false"></div> 就是editor不去写入localstorage缓存
  var Config = {
    init: false,
    contentSel: ".topic-content", // 默认帖子刷新需要的selector
                                  // 格式例如<div class="topic-content"><textarea>需要转换的内容</textarea></div>
    submitName: "content", // 用来控制textarea的名字，需要表单提交时使用，默认为content
    saveLocalStorage: true,
    value: null, // 如果<div id="editor"><textarea>ABC</textarea></div> 那么ABC会写入这里
    converter: null, // 如果markdown converter初始化后，这里是一个对象，可以Config.converter.makeHtml(text)
    lastCache: null // 保存一下刚刚载入时localStorage的副本，避免被saveLocalStorage覆盖
  };

  // Need函数是用来导入其他css和js的，作用类似于head.js或者require.js
  // list是一个array数组或者string文件名，保存css或者js
  // callback是一个在所有文件加载后的回调函数，可以为空
  var NeedLoaded = {};
  function Need (list, callback) {
    if (typeof list == "string") list = [list];
    if (typeof list != "object" || !list.length) return;
    
    function LoadCss (url, callback) { // 读取css
      if (callback)
        callback(url);
      var link = document.createElement("link");
      link.type = "text/css";
      link.rel = "stylesheet";
      link.href = url;
      //if (callback)
      //  link.onload = function () { callback(url); };
      link.onerror = function () { console.log("load css", url, "failed"); };
      document.getElementsByTagName("head")[0].appendChild(link);
    }
    
    function LoadJs (url, callback) { // 读取js
      var js = document.createElement("script");
      js.type = "text/javascript";
      js.src = url;
      if (callback)
        js.onload = function () { callback(url); };
      js.onerror = function () { console.log("load js", url, "failed"); };
      document.getElementsByTagName("body")[0].appendChild(js);
    }
    
    function GetExt (str) { // 获取后缀名，返回类似".js"或者".js?abc=1"
      var ext = str.substr(str.lastIndexOf("."));
      return ext;
    }
    var count = 0;
    
    function Complete (url) { // 完成函数，当一个文件loadedd时候执行
      count ++;
      if (!NeedLoaded[url]) {
        NeedLoaded[url] = 1;
      }
      if (count >= list.length) {
        if (typeof callback == "function") {
          callback();
        }
      }
    }
    
    for (var i = 0; i < list.length; i++) { // 加载list数组里的所有文件
      var url = list[i];
      
      if (NeedLoaded[url]) {
        Complete(url);
        continue;
      }
      
      var ext = GetExt(url);
      // 不能用ext==".js"，因为有些js文件可能有后缀，例如".js?param=10"
      if (ext.match(/^\.js/)) {
        // 当js加载完之后调用complete
        LoadJs(url, Complete);
      } else if (ext.match(/^\.css/)) {
        LoadCss(url, Complete);
      } else {
        console.log("A file can't load", url, ext);
        Complete();
      }
    }
  }

  function Ready (func) { // 这个函数用来延迟运行func函数，类似$(document).ready 或者 doucment.onready
    if (typeof func != "function") return;
    
    if (document.readyState == "complete") {
      func();
    } else {
      if (document.addEventListener) {
        document.addEventListener("readystatechange", func); 
      } else if (document.attachEvent) {
        document.attachEvent("onreadystatechange", func);
      }
    }
  }

  // 获取缓存的key（就是去掉?后面的URL）
  function SaveKey () {
    var r = document.URL;
    
    var p = r.indexOf("?");
    if (p != -1) {
      r = r.substr(0, p);
    }
    
    p = r.indexOf("#");
    if (p != -1) {
      r = r.substr(0, p);
    }
    
    return r;
  }
  
  
  
  function ReadStorage () {
    if (typeof window.localStorage == "undefined") {
      return false;
    }
      
    if (!window.localStorage.getItem("editorCache")) {
      window.localStorage.setItem("editorCache", "{}")
    }
    
    var storage = JSON.parse(window.localStorage.getItem("editorCache"));
    
    var now = new Date().getTime();
    
    for (var key in storage) {
      if (!storage[key].time) {
        delete storage[key];
      } else if (Math.abs(storage[key].time - now) > 1000*60*60*24*10) { // 10 days
        delete storage[key];
      }
    }
    
    window.localStorage.setItem("editorCache", JSON.stringify(storage))
    
    return storage;
  }
  

  // 读取编辑器缓存
  function GetCache() {
    var storage = ReadStorage();
    if (storage && storage.hasOwnProperty(SaveKey()) && storage[SaveKey()].content) {
      return storage[SaveKey()];
    }
  }

  // 设置编辑器缓存
  function SetCache(value) {
    var storage = ReadStorage();
    if (storage) {
      storage[SaveKey()] = {
        content: value,
        time: new Date().getTime(),
        hide: false
      }
      window.localStorage.setItem("editorCache", JSON.stringify(storage))
    }
  }

  // 清除编辑器缓存
  function ClearCache() {
    var storage = ReadStorage();
    if (storage) {
      if (storage.hasOwnProperty(SaveKey()) && storage[SaveKey()].content) {
        storage[SaveKey()].hide = true;
      }
      window.localStorage.setItem("editorCache", JSON.stringify(storage))
      Config.saveLocalStorage = false; // 关闭继续记录
    }
  }
    
  var stopScrollInput = false;
  var stopScrollPreview = false;
  
  var lastInputTop = -1;
  var lastPreviewTop = -1;
  
  var inputScrollTimer = null;
  var previewScrollTimer = null;
    
  //当input栏滚动时调用此函数
  function ScrollInput () {
    if (stopScrollInput) return;
    stopScrollPreview = true;
    var c = $("#wmd-input");
    var v = $("#wmd-preview");
    
    var ch = c[0].scrollTop;
    (ch < 0) && (ch = 0);
    
    if (lastInputTop == -1) lastInputTop = ch;
    
    var c_height = c[0].scrollHeight - c.height();
    var v_height = v[0].scrollHeight - v.height();
    
    var top = v_height * (ch / c_height) ;
    
    if (ch < lastInputTop) {
      v[0].scrollTop = top - 30;
    } else if (ch > lastInputTop) {
      v[0].scrollTop = top + 30;
    } else {
      v[0].scrollTop = top;
    }
    
    if (inputScrollTimer) {
      clearTimeout(inputScrollTimer);
      inputScrollTimer = null;
    }
    
    inputScrollTimer = setTimeout(function () {
      stopScrollPreview = false;
    }, 100);
  }
  
  function ScrollPreview () {
    if (stopScrollPreview) return;
    stopScrollInput = true;
    var c = $("#wmd-input");
    var v = $("#wmd-preview");
      
    var ch = v[0].scrollTop;
    (ch < 0) && (ch = 0);
    
    if (lastPreviewTop == -1) lastPreviewTop = ch;
    
    var c_height = c[0].scrollHeight - c.height();
    var v_height = v[0].scrollHeight - v.height();
    
    var top = c_height * (ch / v_height);
    
    if (ch < lastPreviewTop) {
      c[0].scrollTop = top - 30;
    } else if (ch > lastPreviewTop) {
      c[0].scrollTop = top + 30;
    } else {
      c[0].scrollTop = top;
    }
    
    if (previewScrollTimer) {
      clearTimeout(previewScrollTimer);
      previewScrollTimer = null;
    }
    
    previewScrollTimer = setTimeout(function () {
      stopScrollInput = false;
    }, 100);
  }
  
  /*
   * 
   * 以上部分是editor的依赖的一些函数
   * 
   * 以下部分是editor的内部函数
   * 
   */
  
  var HTML = "" +
      "<div class='container-fluid'>\n" +
        "<div id='DeditorToolbar' class='row'>\n" +
          "<div class='col-xs-12' style='padding: 0'>\n" +
            "<div class='btn-group'>\n" +
              "<button id='EditorUpload' onclick='event.preventDefault()' style='display: none;'></button>" +
              "<a href='#' id='DeditorBold' title='粗体 <strong> Ctrl+B' class='btn btn-sm'>\n" +
                "<span class='fa fa-bold'></span>\n" +
              "</a>\n" +
              "<a href='#' id='DeditorItalic' title='斜体 <em> Ctrl+I' class='btn btn-sm'>\n" +
                "<span class='fa fa-italic'></span>\n" +
              "</a>\n" +
            "</div>\n" +
            "<span style='border-right: 1px solid #ccc;'></span>" +
            "<div class='btn-group'>\n" +
              "<a href='#' id='DeditorLink' title='插入链接 <a> Ctrl+L' class='btn btn-sm'>\n" +
                "<span class='fa fa-link'></span>\n" +
              "</a>\n" +
              "<a href='#' id='DeditorQuote' title='引用 <blockquote> Ctrl+Q' class='btn btn-sm'>\n" +
                "<span class='fa fa-indent'></span>\n" +
              "</a>\n" +
              "<a href='#' id='DeditorCode' title='代码 <pre><code> Ctrl+K' class='btn btn-sm'>\n" +
                "<span class='fa fa-code'></span>\n" +
              "</a>\n" +
              "<a href='#' id='DeditorImage' title='插入图片 <img> Ctrl+G' class='btn btn-sm'>\n" +
                "<span class='fa fa-file-image-o'></span>\n" +
              "</a>\n" +
            "</div>\n" +
            "<span style='border-right: 1px solid #ccc;'></span>" +
            "<div class='btn-group'>\n" +
              "<a href='#' id='DeditorOrder' title='有序列表 <ol> Ctrl+O' class='btn btn-sm'>\n" +
                "<span class='fa fa-list-ol'></span>\n" +
              "</a>\n" +
              "<a href='#' id='DeditorUnorder' title='无序列表 <ul> Ctrl+U' class='btn btn-sm'>\n" +
                "<span class='fa fa-list-ul'></span>\n" +
              "</a>\n" +
              "<a href='#' id='DeditorHeader' title='标题 <h1>/<h2> Ctrl-H' class='btn btn-sm'>\n" +
                "<span class='fa fa-header'></span>\n" +
              "</a>\n" +
              "<a href='#' id='DeditorHr' title='分割线 <hr> Ctrl+R' class='btn btn-sm'>\n" +
                "<span class='fa fa-ellipsis-h'></span>\n" +
              "</a>\n" +
            "</div>\n" +
            "<span style='border-right: 1px solid #ccc;'></span>" +
            "<div class='btn-group'>\n" +
              "<a href='#' id='DeditorUndo' title='撤销 Ctrl+Z' class='btn btn-sm'>\n" +
                "<span class='fa fa-undo'></span>\n" +
              "</a>\n" +
              "<a href='#' id='DeditorRedo' title='重做 Ctrl+Y / Ctrl+Shift+Z' class='btn btn-sm'>\n" +
                "<span class='fa fa-repeat'></span>\n" +
              "</a>\n" +
            "</div>\n" +
            "<a id='DeditorFullscreen' class='btn btn-sm pull-right' href='#'>\n" +
              "<span class='fa fa-expand'></span>\n" +
            "</a>\n" +
            "<a href='#' target='_blank' id='DeditorHelp' class='btn btn-sm pull-right'>\n" +
              "<span class='fa fa-question'></span>\n" +
            "</a>\n" +
            
            "<label class='pull-right' style='display: inline; margin-top: 4px;'>preview</label>" +
            "<input id='DeditorPreviewEnable' class='pull-right' type='checkbox' checked style='display: inline; margin-top: 8px;'>" +
            
            "<a href='#' id='DeditorLost' style='display: none;' class='btn btn-sm pull-right' href='#'>\n" +
              "上次编辑的内容\n" +
            "</a>\n" +
          "</div>\n" +
        "</div>\n" +
        "<div id='DeditorInputRow' class='row'>\n" +
          "<div id='DeditorInputSpace' class='col-md-3' style='display: none;'>\n" +
          "</div>\n" +
          "<div id='DeditorInput' class='col-md-6 col-xs-12'>\n" +
            "<div id='wmd-button-bar'></div>\n" +
            "<textarea placeholder='在这里输入' spellcheck='false' class='wmd-input' id='wmd-input' name='content'></textarea>\n" +
          "</div>\n" +
          "<div id='DeditorPreview' class='col-md-6 col-xs-12'>\n" +
            "<div id='wmd-preview' class='wmd-preview'></div>\n" +
          "</div>\n" +
        "</div>\n" +
      "</div>\n" +
      "<div class='modal fade' id='EditorHelpModal' tabindex='-1' role='dialog' aria-hidden='true' data-backdrop='true' data-keyboard='true'>" +
        "<div class='modal-dialog'>" +
          "<div class='modal-content'>" +
            "<div class='modal-header panel-heading-lc'>" +
              "<button type='button' class='close' data-dismiss='modal' aria-label='Close'><span aria-hidden='true'>&times;</span></button>" +
              "<h6 class='modal-title'>帮助</h6>" +
            "</div>" +
            "<div class='modal-body panel-body-lc'>" +
              "<span><a class='btn btn-sm' href='#'><span class='fa fa-bold'></span></a>&nbsp;&nbsp;  粗体文字按钮，或输入**包裹文字则为粗体文字，例如：<div style='margin-left: 50px;'>**<b>粗体文字</b>**</div></span><hr>" + 
              "<span><a class='btn btn-sm' href='#'><span class='fa fa-italic'></span></a>&nbsp;&nbsp;  斜体文字按钮，或输入*包裹文字则为斜体，例如：<div style='margin-left: 50px;'>*<em>斜体文字</em>*</div></span><hr>" +
              "<span><a class='btn btn-sm' href='#'><span class='fa fa-link'></span></a>&nbsp;&nbsp;  超链接按钮，或直接输入格式：<div style='margin-left: 50px;'>[谷歌](http://www.google.com)</div></span><hr>" +
              "<span><a class='btn btn-sm' href='#'><span class='fa fa-indent'></span></a>&nbsp;&nbsp;  引用文字按钮，或直接在要引用文字所在行开头写&gt;+引用文字：<div style='margin-left: 50px;'>&gt;引用文字</div></span><hr>" +
              "<span><a class='btn btn-sm' href='#'><span class='fa fa-code'></span></a>&nbsp;&nbsp;  代码按钮，代码有多种方式： 1.直接在代码行开头写四个空格；2.用三个```包裹代码（键盘字母Q左上，同~），```必须单独一行，例如：<div style='margin-left: 50px;'>```<br>代码<br>```</div></span><hr>" +
              "<span><a class='btn btn-sm' href='#'><span class='fa fa-file-image-o'></span></a>&nbsp;&nbsp;  图片按钮，或直接输入格式（和超链接相比多了一个叹号）：<div style='margin-left: 50px;'>![图片说明](http://图片地址)</div></span><hr>" +
              "<span><a class='btn btn-sm' href='#'><span class='fa fa-list-ol'></span></a>&nbsp;&nbsp;  有序列表按钮  <a class='btn btn-sm' href='#'><span class='fa fa-list-ul'></span></a>&nbsp;&nbsp;  无序列表按钮</span><hr>" +
              "<span><a class='btn btn-sm' href='#'><span class='fa fa-header'></span></a>&nbsp;&nbsp;  标题按钮，或直接在标题前写一个或多个#+空格，例如：<div style='margin-left: 50px;'># 一级标题<br>## 二级标题<br>### 三级标题</div></span><hr>" +
              "<span><a class='btn btn-sm' href='#'><span class='fa fa-ellipsis-h'></span></a>&nbsp;&nbsp;  插入分隔符按钮</span>" +
              "<span><a class='btn btn-sm' href='#'><span class='fa fa-undo'></span></a>&nbsp;&nbsp;  撤销按钮  <a class='btn btn-sm' href='#'><span class='fa fa-repeat'></span></a>&nbsp;&nbsp;  重做按钮</span>" +
              "<span><a class='btn btn-sm' href='#'><span class='fa fa-question'></span></a>&nbsp;&nbsp;  帮助按钮  <a class='btn btn-sm' href='#'><span class='fa fa-expand'></span></a>&nbsp;&nbsp;  全屏按钮</span><hr>" +
              "<span><a target='_blank' href='http://www.moozhi.com/topic/show/540747763a0ef475770873e8'>详细帮助点击这里</a></span>"
            "</div>" +
          "</div><!-- /.modal-content -->" +
        "</div><!-- /.modal-dialog -->" +
      "</div><!-- /.modal -->";
    
  
  
  // 设置高度函数
  function SetHeight (height) {
    var old = document.getElementById("editorHeightSetting");
    if (old) {
      document.getElementsByTagName("head")[0].removeChild(old);
    }
    
    var css = document.createElement("style");
    css.id = "editorHeightSetting";
    css.innerHTML = "" + 
      "@media (min-width: 992px) {" +
      ".wmd-preview-div {" +
        "float: right;" +
      "}" +
      ".wmd-preview {" +
        "min-height: " + height + "px;" +
        "max-height: " + height + "px;" +
        "height: " + height + "px;" +
      "}" +
      ".wmd-input {" +
        "min-height: " + height + "px;" +
        "max-height: " + height + "px;" +
        "height: " + height + "px;" +
      "}";
    document.getElementsByTagName("head")[0].appendChild(css);
  };
  
  // 增加高度函数
  function ClearHeight () {
    var old = document.getElementById("editorHeightSetting");
    if (old) {
      document.getElementsByTagName("head")[0].removeChild(old);
    }
  };
  
  // 全屏
  function FullScreen (e) {
    if (!$) return;
    
    var ee = document.getElementById('editor');
    ee.style.position = "fixed";
    ee.style.zIndex = "9998";
    ee.style.width = "99%";
    ee.style.marginLeft = ".5%";
    ee.style.backgroundColor = "white";
    ee.style.top = "0";
    ee.style.left = "0";
    ee.style.padding = "20px;";
    SetHeight($(window).height() - 70);
    $("body").css("overflow-y", "hidden");
  }
  
  // 退出全屏
  function ExitFullScreen (e) {
    var ee = document.getElementById('editor');
    ee.style.position = "static";
    ee.style.marginLeft = "0";
    ee.style.zIndex = "auto";
    ee.style.width = "auto";
    ee.style.background = "transparent";
    ee.style.padding = "0;";
    ClearHeight();
    $("body").css("overflow-y", "auto");
  }
  
  
  
  
  function QiniuUpload () {
    if (typeof Qiniu != "undefined" && document.getElementById("EditorUpload") != null) {
      
      var uploadTimer = null;
      var count = 0;
              
      //从服务器获取token
      $.ajax({url: "/upload/token", dataType: "json", cache: false, success: function (data) {
        
        window.QiniuUploader = Qiniu.uploader({
          runtimes: "html5", //调用方法排序，html5优先
          browse_button: document.getElementById("EditorUpload"), //绑定的按钮
          uptoken: data.uptoken, //从服务器返回的json中的uptoken
          domain: data.domain, //服务器返回的bucket
          //container: document.getElementById("DeditorUploadContainer"), //target（估计是和form submit有点关系）
          max_file_size: "5mb",
          flash_swf_url: "/images/Moxie.swf",
          max_retries: 0,
          dragdrop: false,
          drop_element: undefined,
          chunk_size: "5mb",
          auto_start: true,
          multi_selection: false,
          filters: {
            mime_types : [
              { title : "Image files", extensions : "jpeg,jpg,gif,png,bmp,svg" }
            ]
          },
          init: {
            "BeforeUpload": function (up, file) {              
              if (uploadTimer !== null) {
                clearInterval(uploadTimer);
                uploadTimer = null;
              }
              count = 0;
              uploadTimer = setInterval(function () {
                count++;
                var t = document.getElementById("UploadTimer");
                if (t) t.innerHTML = "已经上传了" + count + "秒";
              }, 1000);
              Alert("上传中，请不要关闭本窗口<div id='UploadTimer'></div><div id='UploadProgress'></div>", function () {
                up.stop();
                up.splice(0, up.files.length);
                if (uploadTimer !== null) {
                  clearInterval(uploadTimer);
                  uploadTimer = null;
                }
              });
            },
            "UploadProgress": function (up, file) {
              var t = document.getElementById("UploadProgress");
              if (t) t.innerHTML = "现在进度：" + file.percent + "%";
            },
            "FileUploaded": function (up, file, info) {
              var domain = up.getOption('domain');
              var res = JSON.parse(info);
              
              var imgLink;
              
              if (res.key.match(/\.jpg$|\.gif$|\.png$|\.bmp$|\.jpeg$/)) {
                imgLink = Qiniu.watermark({
                  mode: 2,  // 文字水印
                  text: 'www.moozhi.com', // 水印文字，mode = 2 时 **必需**
                  dissolve: 50,          // 透明度，取值范围1-100，非必需，下同
                  gravity: 'SouthWest',  // 水印位置，同上
                  fontsize: 500,         // 字体大小，单位: 缇
                  font : '黑体',          // 水印文字字体
                  dx: 5,  // 横轴边距，单位:像素(px)
                  dy: 5,  // 纵轴边距，单位:像素(px)
                  fill: '#2c3e50'        // 水印文字颜色，RGB格式，可以是颜色名称
                }, res.key);
              } else {
                imgLink = domain + res.key;
              }
              
              var sourceLink = imgLink;//domain + res.key;
              
              if ($(".wmd-prompt-dialog").length) {
                $(".wmd-prompt-dialog").find("input[type='text']").val(imgLink);
              }
              
              //$("#EditorInsertPictureModalUrl").val(imgLink);
              $("#AlertModalBody").html("上传成功");
              if (uploadTimer !== null) {
                clearInterval(uploadTimer);
                uploadTimer = null;
                up.stop();
                up.splice(0, up.files.length);
                if ($("#AlertModal").css("display") != "none")
                  $("#AlertModal").modal("hide");
              }
            },
            "Error": function (up, err, errTip) {
              console.log("Error");
              Alert("上传错误，确认您选择的文件格式正确，大小小于5MB，支持的格式有：jpg,gif,png,bmp" + "<div><br>错误信息为：<br>" + err.message + "</div>");
              console.log(up, err, errTip);
              if (uploadTimer) {
                clearInterval(uploadTimer);
                uploadTimer = null;
              }
            },
            "Key": function(up, file) {
              var key = data.id + "-" + (new Date()).getTime() + "-" + file.name;
              return key
            }
          }
        });
      }});
      
    }
    
  }
  

  // 对一个div中的内容进行转换
  function ComposeElement (div) {
    
    // 之前处理标签可能导致的后遗症
    div.find("code").each(function(){
      var h = this.innerHTML;
      h = h.replace(/&amp;lt;/g, "&lt;");
      this.innerHTML = h;
    });
        
    // 更新所有img，为了限制宽度和点击打开，可选magnificPopup插件
    div.find("img").each(function () {
      var img = $(this);
      img.css("max-width", "80%");
      img.attr("href", img.attr("src"));
      
      if (div.magnificPopup) {
        $(this).magnificPopup({
          type:'image'
        });
      }
    });
    
    // 执行highlight.js，针对pre而不是code，因为针对code的话会有一个奇怪的样式问题
    if (typeof hljs != "undefined") {
      div.find("code").each(function(i, block) {
        hljs.highlightBlock(block);
      });
    }
    
    div.find("pre code").each(function () {
      $(this).find(".editor-math-element").each(function () {
        $(this).removeClass("editor-math-element");
      });
    });
    
    // 如果有必要则刷新editor中的公式
    div.find(".editor-math-element").each(function () {
      var t = $(this);
      var id = t.data("id");
      
      if (window.editorMathCache && window.editorMathCache[id]) {
        $(this).html(window.editorMathCache[id]);
      } else {      
        // 其实这个调用只是一种队列，类似于MathJax.Hub.Typeset(this, function () {...});
        MathJax.Hub.Queue(["Typeset", MathJax.Hub, this, function () {        
          if (!window.editorMathCache) window.editorMathCache = {};
          window.editorMathCache[id] = t.html();
        }]);
      }
    });
    
    
  }
  
  function InitConverter () {
    if (!Config.converter) {
      if (typeof Markdown != "undefined" && Markdown.Converter) {
        Config.converter = new Markdown.Converter({asteriskIntraWordEmphasis: true});
        //Config.converter = Markdown.getSanitizingConverter();
        Markdown.Extra.init(Config.converter);
        
        Config.converter.hooks.chain("postNormalization", function (text) {
          // postNormalization里面多行代码段就已经消失了，但是`abc`和```sss```这种算inline的还在
          text = Markdown.Plugin.RemoveMath(text);
          return text;
        });
        
        Config.converter.hooks.chain("postConversion", function (html) {
          html = Markdown.Plugin.ReplaceMath(html);
          html = Markdown.Plugin.ProcessAtUser(html);
          html = Markdown.Plugin.ProcessToc(html);
          return html;
        });
        
        Config.converter.hooks.chain("preConversion", function (text) {
          text = text.replace(/</g, "&lt;");
          return text;
        });
        
      }
    }
  }
  
  
  // 将帖子内的内容进行转换
  function ShowPost () {
    InitConverter();
    
    var topics = $(Config.contentSel);
    if (!topics.length) return;
    
    topics.each(function () {
      var topic = $(this);
      var textarea = topic.find('textarea');
      if (!textarea.length) return;
      
      topic.find(".editor-content").each(function () {
        topic[0].removeChild(this);
      });
      
      var content = textarea.val();
      
      content = Config.converter.makeHtml(content);
      
      var div = document.createElement("div");
      div.innerHTML = content;
      
      $(div).addClass("editor-content");
      
      topic.append($(div));
      
      ComposeElement($(div));
    });
    
    $(window).trigger("resize");//Force masonry plugins recalculate size of elements
  }
  
  
  window.InsertUserPrefer = function (u) {
    $("#wmd-input").val($("#wmd-input").val() + u);
    $('#wmd-input').popover('hide');
    pagedownEditor.refreshPreview();
    $("#wmd-input").focus();
  }
  
  function ShowUserPrefer (result, username) {
    var c = (function (a) {
      var r = "";
      for (var i = 0; i < a.length; i++) {
        var u = a[i];
        u = u.substr(username.length); // 减去已经输入的用户名的长度，得到需要补充的用户名后半部分u
        u += " ";
        
        r += "<a style='padding: 5px;' href='#' onclick=\"InsertUserPrefer('" + u + "');event.preventDefault();\">" + a[i] + "<a>";
        
        if (i != (a.length-1))
          r += "<br>";
      }
      return r;
    }) (result)
    
    $("#wmd-input").attr("data-content", "hello");
    $(".popover").attr("z-index", 999999);
    $("#wmd-input").popover("show");
    $(".popover-content").html(c);
    
    var in_pos = $("#wmd-input").offset();
    var pre_pos = $("#wmd-preview").offset();
    
    if (in_pos.left == pre_pos.left) {
      $(".popover").css("top", in_pos.top);
    } else {
      $(".popover").css("top", 0);
    }
    
    $(".popover").css("left", pre_pos.left - 15);
  }
  
  function UserPrefer (e) {
    if (!$) return;
    var textarea = document.getElementById("wmd-input");
    if (!textarea || !$(textarea).popover) return;
    if (!textarea.selectionStart) return;
    if (Config.StopUsernamePrefer) return;
    
    if (!Config.usernamePreferInit) {
      $("#wmd-input").popover({
        title: "",
        content: "",
        placement: function (dom) {
          $(dom).css("position", "absolute");
        },
        trigger: "manual",
        html: true
      });
      Config.usernamePreferInit = true;
    }
    
    var pos = textarea.selectionStart;
    
    var str = textarea.value.substring(Math.max(0, pos - 51), pos);
    
    var m = str.match(/@([\w\-\u2E80-\u9FFF]{1,50})$/);
    if (m) {
      var username = m[1];
      
      if (Config.usernamePreferCache && Config.usernamePreferCache[username]) {
        ShowUserPrefer(Config.usernamePreferCache[username], username);
      } else {          
        $.ajax({url: "/user/matchUsername?username=" + encodeURIComponent(username), success: function(data) {
          if (data.success && data.success.length) {
            if (!Config.usernamePreferCache) Config.usernamePreferCache = {};
            Config.usernamePreferCache[username] = data.success;
            ShowUserPrefer(data.success, username);
          } else {
            $("#wmd-input").popover("hide");
          }
        }, dataType: "json", cache: false});
      }
    } else {
      $("#wmd-input").popover("hide");
    }
  }
  
  function DeditorPreviewEnable () {
    var checkbox = $("#DeditorPreviewEnable");
    var yes = checkbox.prop("checked");
    if (yes) {
      $("#DeditorInputSpace").hide();
      $("#DeditorPreview").show();
      $("#DeditorInput").removeClass("border-left-right");
    } else {
      $("#DeditorPreview").hide();
      $("#DeditorInputSpace").show();
      $("#DeditorInput").addClass("border-left-right");
    }
  }
  
  
  
  function InsertContent () {
    Config.lastCache = GetCache();
    
    if (typeof Config.value == "string") {
      console.log("load config.value");
      $("#wmd-input").val(Config.value);
      $("#wmd-input").focus();
      
      if (Config.lastCache) { // 如果是编辑的情况，则有Config.value，但是依然可能丢失
        $("#DeditorLost").show();
      }
      
    } else if (Config.lastCache) {
      
      if (Config.lastCache.hide) {
        $("#DeditorLost").show();
      } else {      
        console.log("load localStorage");
        $("#wmd-input").val(Config.lastCache.content);
        $("#wmd-input").focus();
      }
    }
  }
    
        
  // 编辑器初始化函数，不着急运行在最下面的Need函数里调用
  // 这个函数运行时已经document.ready，也应该初始好了jquery
  function EditorInit() {
    if (!$) {
      console.log("jQuery not found, editor can't init");
      return;
    }
    
    if (Config.init == true) {
      InsertContent();
      return;
    }
    Config.init = true;
    
    ShowPost();
    
    var options = {
      strings: {
        boldexample: "粗体文字",
        italicexample: "斜体文字",
        linkdescription: "超链接描述",
        linkdialog: "<p><b>插入超链接</b></p><p>http://example.com/ \"可选标题\"</p>",
        quoteexample: "引用文字",
        codeexample: "在这里输入代码",
        imagedescription: "图片描述",
        imagedialog: "<p><b>插入图片</b></p><p>http://example.com/images/diagram.jpg \"可选标题\"<div style='text-align: center;'><button onclick=\"event.preventDefault();document.getElementById('EditorUpload').click();\" style='margin: 10px; display: inline; width: 10em; height: 3em;'>上传</button></div><br></p>",
        litem: "列表项",
        headingexample: "标题"
      }
    };
    
    var pagedownEditor = new Markdown.Editor(Config.converter, "", options);
    pagedownEditor.hooks.set("onPreviewRefresh", function () {
      ComposeElement($("#wmd-preview"));
    });
    
    window.pagedownEditor = pagedownEditor;
    pagedownEditor.run();
    
    InsertContent();
    
    // 在提交时清除editor缓存
    $("form").each(function () {
      var t = $(this);
      if (t.find("#editor").length) {
        t.on("submit", function () {
          ClearCache();
        });
      }
    });
    
    
    function RefreshPreview() {
      pagedownEditor.refreshPreview();
    }
    
    var timer = null;
    function RefreshPreviewDelay () {
      
      if ($("#DeditorPreviewEnable").length) {
        if ($("#DeditorPreviewEnable").prop("checked") == false) return;
      }
      
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      timer = setTimeout(RefreshPreview, 750);
    }
    
    
    var ButtonLink = function (btn_id_1, btn_id_2) {
      // link btn_id_1 to btn_id_2
      if (!btn_id_1 || !btn_id_2) return;
      btn_id_1 = document.getElementById(btn_id_1);
      btn_id_2 = document.getElementById(btn_id_2);
      if (!btn_id_1 || !btn_id_2) return;
      $(btn_id_1).on("click", function (e) {
        e.preventDefault();
        btn_id_2.click();
        RefreshPreview();
      });
    };
    
    $("#DeditorImage").on("click", function (e) {
      e.preventDefault();
      setTimeout(function () {
        if ($(".wmd-prompt-dialog").length) {
          $(".wmd-prompt-dialog").css("z-index", "9999");
        }
      }, 50);
    });
    $("#DeditorLink").on("click", function (e) {
      e.preventDefault();
      setTimeout(function () {
        if ($(".wmd-prompt-dialog").length) {
          $(".wmd-prompt-dialog").css("z-index", "9999");
        }
      }, 50);
    });
    
    ButtonLink("DeditorBold", "wmd-bold-button");
    ButtonLink("DeditorItalic", "wmd-italic-button");
    ButtonLink("DeditorLink", "wmd-link-button");
    ButtonLink("DeditorQuote", "wmd-quote-button");
    ButtonLink("DeditorCode", "wmd-code-button");
    ButtonLink("DeditorImage", "wmd-image-button");
    ButtonLink("DeditorOrder", "wmd-olist-button");
    ButtonLink("DeditorUnorder", "wmd-ulist-button");
    ButtonLink("DeditorHeader", "wmd-heading-button");
    ButtonLink("DeditorHr", "wmd-hr-button");
    ButtonLink("DeditorUndo", "wmd-undo-button");
    ButtonLink("DeditorRedo", "wmd-redo-button");
    
    $("#DeditorFullscreen").on("click", function (e) {
      if (!Config.fullscreen) {
        FullScreen(e);
        Config.fullscreen = 1;
        if (e.target.tagName == "A") {
          $(e.target).find("span").attr("class", "fa fa-compress");
        } else {
          $(e.target).attr("class", "fa fa-compress");
        }
      } else {
        ExitFullScreen();
        Config.fullscreen = 0;
        if (e.target.tagName == "A") {
          $(e.target).find("span").attr("class", "fa fa-expand");
        } else {
          $(e.target).attr("class", "fa fa-expand");
        }
      }
      e.preventDefault();
    });
    
    
    $("#DeditorHelp").on("click", function (e) {
      e.preventDefault();
      //Alert(helpHTML);
      $("#EditorHelpModal").modal();
    });
    
    $("#DeditorHelp").on("mouseover", function (e) {
      $("#DeditorHelp").html("帮助");
    });
    
    $("#DeditorHelp").on("mouseout", function (e) {
      $("#DeditorHelp").html("<span class='fa fa-question'></span>");
    });
    
    $("#DeditorLost").on("click", function (e) {
      e.preventDefault();
      if (Config.lastCache && Config.lastCache.content) {
        console.log("restore localStorage");
        $("#wmd-input").val(Config.lastCache.content);
        pagedownEditor.refreshPreview();
        $("#wmd-input").focus();
      }
      
    });
    
    pagedownEditor.hooks.chain("onPreviewRefresh", ScrollInput);
    $("#wmd-input").on("scroll", ScrollInput);
    $("#wmd-input").on("keydown", ScrollInput);
    $("#wmd-input").on("keypress", ScrollInput);
    $("#wmd-input").on("input", ScrollInput);
    $("#wmd-input").on("mousedown", ScrollInput);
    $("#wmd-preview").on("scroll", ScrollPreview);
  
    $("#wmd-input").on('keydown', function (e) {
      var textarea = document.getElementById("wmd-input");
      if (e.which == 9 && textarea && typeof textarea.selectionStart == "number") {
        var val = textarea.value;
        var s = textarea.selectionStart;
        val = val.substr(0, textarea.selectionStart) + "    " + val.substr(textarea.selectionStart);
        textarea.value = val;
        textarea.selectionStart = s + 4;
        textarea.selectionEnd = s + 4;
        e.preventDefault();
      }
    });
    
    $("#wmd-input").on('keyup', UserPrefer);
    $("#wmd-input").on('mousedown', UserPrefer);
    QiniuUpload ();
    
    var save2cache = function () {
      if (Config.saveLocalStorage) {
        SetCache($("#wmd-input").val());
      }
    };
    $("#wmd-input").on('keyup', save2cache);
    $("#wmd-input").on('change', save2cache);
    $("#wmd-input").on('mousedown', save2cache);
    
    RefreshPreviewDelay();
    
    $("#wmd-input").on("input", RefreshPreviewDelay);
    $("#wmd-input")[0].onpaste = RefreshPreviewDelay;
    $("#wmd-input")[0].ondrop = RefreshPreviewDelay;

    $("#wmd-input").on("keypress", RefreshPreviewDelay);
    $("#wmd-input").on("keydown", RefreshPreviewDelay);
    
    
    $("#DeditorPreviewEnable").on("click", function () {
      DeditorPreviewEnable();
      RefreshPreviewDelay();
    });
    
    pagedownEditor.hooks.chain("onPreviewRefresh", function () {
      if ($("#wmd-preview").length && typeof $("#wmd-preview").html() == "string" && $("#wmd-preview").html().trim() == "") {
        $("#wmd-preview").html("<span style='color: grey'>Markdown预览，需要帮助请点击右上角的问号</span>");
      }
    });
  }
  
  
  /*
   * 
   * 开始加载Editor
   * 
   */
   
   
  // 这个函数用来加载显示帖子的部分
  function LoadEditor () {
    
    // 设置Mathjax, > 2.3 版本支持这么设置
    // Mathjax类型为TeX-AMS_HTML，即tex，latex转为html
    // AMS扩展是必须的为了一些latex语句
    if (!window.MathJax) {
      window.MathJax = {
        TeX: {
          equationNumbers: {
            autoNumber: "none"
          }
        },
        tex2jax: {
          inlineMath: [ ['$','$'] ],
          displayMath: [ ['$$','$$'] ],
          processEscapes: true,
          displayIndent: "1.5em",
          "HTML-CSS": {
            scale: 90
          }
        },
        skipStartupTypeset: true
      };
    }
    
    if (document.getElementById("editor") == null && document.querySelector(Config.contentSel) == null) {
      
      //如果页面没有editor元素也没有帖子元素，就走
      if (document.readyState != "complete") {
        Ready(LoadEditor); // 双重保险，避免editor的script载入在body载入之前
        return;
      }
      
    } else if (document.getElementById("editor") == null && document.querySelector(Config.contentSel) != null) {
      
      // 如果页面没有editor，但是有帖子元素，就显示
      // 为了帖子获取所需的文件
      Need([
        "http://cdn.staticfile.org/mathjax/2.4.0/MathJax.js?config=TeX-AMS_HTML",
        "http://cdn.staticfile.org/highlight.js/8.2/styles/monokai_sublime.min.css",
        "/editor/markdown.min.js",
        "/editor/editor.css"
        ], function () {
          // 不等jquery，直接读取所需文件，但是等document.ready之后才开始转化
          Ready(function () {
            ShowPost();
          });
      });
      
    } else {
    
      // 程序分支进入这里，说明有editor，可能没有Config.contentSel

      // 如果有editor的默认值，则设置默认值
      var editorElement = document.getElementById("editor");
      
      // 如果编辑器对象中有textarea，则把其中内容当作默认值，例如<div id="editor"><textarea>abc123</textarea></div>则abc123为默认值
      for (var i = 0; i < editorElement.children.length; i++) {
        if (editorElement.children[i].tagName == "TEXTAREA") {
          Config.value = editorElement.children[i].value;
          editorElement.removeChild(editorElement.children[i]);
          break;
        }
      }
      
      //把编辑器内容写入div
      editorElement.innerHTML = editorElement.innerHTML + HTML;
      
      // 如果编辑器的对象中有data-submitname属性，则获取，例如<div id="editor" data-submitname="topic"></div>
      if (editorElement.attributes["data-submitname"]) {
        Config.submitName = editorElement.attributes["data-submitname"].value;
      }
      // 设置submitname
      document.getElementById("wmd-input").attributes["name"].value = Config.submitName;
      
      // 为了编辑器获取所需的js和css
      Need([
        "http://cdn.staticfile.org/mathjax/2.4.0/MathJax.js?config=TeX-AMS_HTML",
        "http://cdn.staticfile.org/highlight.js/8.2/styles/monokai_sublime.min.css",
        "http://cdn.staticfile.org/font-awesome/4.1.0/css/font-awesome.min.css",
        "/editor/markdown.min.js",
        "/editor/editor.css"
        ], function () {
          // 上面文件全部加载完毕之后会开始运行Ready函数
          Ready(function () {
            // 当document.readyState == complete后开始运行EditorInit
            EditorInit();
          });
        }
      );
    
    }
    
  }
  
  window.LoadEditor = LoadEditor;

  // 开始加载编辑器
  LoadEditor();

})();
