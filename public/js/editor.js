(function () {

  // Editor的设置
  // Editor的载入是<div id="editor"></div>
  // 其中可以设置一些属性例如 <div id="editor" data-submitname="gogogo"></div> 就是把editor在form中textarea的name修改为gogogo
  // 其中可以设置一些属性例如 <div id="editor" data-cache="false"></div> 就是editor不去写入localstorage缓存
  var EditorConfig = {
    contentSel: ".topic-content", // 默认帖子刷新需要的selector
                                  // 格式例如<div class="topic-content"><textarea>需要转换的内容</textarea></div>
    value: null, // 默认值
    cache: true, // 将内容写入localstorage
    submitName: "content",
    mathCache: {}
  };

  // Need函数是用来导入其他css和js的，作用类似于head.js或者require.js
  // list是一个array数组或者string文件名，保存css或者js
  // callback是一个在所有文件加载后的回调函数，可以为空
  function Need (list, callback) {
    if (typeof list == "string") list = [list];
    if (typeof list != "object" || !list.length) return;
    
    // 读取css
    function LoadCss (url, callback) {
      var link = document.createElement("link");
      link.type = "text/css";
      link.rel = "stylesheet";
      link.href = url;
      if (typeof callback == "function")
        link.onload = function () { callback(url); };
      link.onerror = function () { console.log("load css", url, "failed"); };
      document.getElementsByTagName("head")[0].appendChild(link);
    }

    // 读取js
    function LoadJs (url, callback) {
      var js = document.createElement("script");
      js.type = "text/javascript";
      js.src = url;
      if (typeof callback == "function")
        js.onload = function () { callback(url); };
      js.onerror = function () { console.log("load js", url, "failed"); };
      document.getElementsByTagName("head")[0].appendChild(js);
    }
    
    function GetExt (str) {
      var ext = str.substr(str.lastIndexOf("."));
      return ext;
    }

    var count = 0;
    // 完成函数，当一个文件loadedd时候执行
    function Complete () {
      count ++;
      if (count >= list.length) {
        if (typeof callback == "function") {
          callback();
        }
      }
    }
    
    // 加载list数组里的所有文件
    for (var i = 0; i < list.length; i++) {
      var url = list[i];
      var ext = GetExt(url);
      // 不能用ext==".js"，因为有些js文件可能有后缀，例如".js?param=10"
      if (ext.match(/^\.js/)) {
        // 当js加载完之后调用complete
        LoadJs(url, Complete);
      } else if (ext.match(/^\.css/)) {
        LoadCss(url);
        Complete();
      } else {
        console.log("A file can't load", url, ext);
        Complete();
      }
    }
  }

  function utf8_to_b64( str ) {
      return window.btoa(encodeURIComponent( escape( str )));
  }

  function b64_to_utf8( str ) {
      return unescape(decodeURIComponent(window.atob( str )));
  }

  // 这个函数用来延迟运行func函数，类似$(document).ready 或者 doucment.onready
  function DocumentReadyRun(func) {
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
  function GetEditorSaveKey () {
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

  // 读取编辑器缓存
  function GetEditorCache() {
    if (!window.localStorage)
      return false;
      
    if (!window.localStorage.EditorValueCache)
      window.localStorage.EditorValueCache = "{}";
    
    var storage = JSON.parse(window.localStorage.EditorValueCache);
    
    if (storage.hasOwnProperty(GetEditorSaveKey())) {
      return storage[GetEditorSaveKey()];
    }
    return false;
  }

  // 设置编辑器缓存
  function SetEditorCache(value) {
    if (!window.localStorage)
      return;
      
    if (!window.localStorage.EditorValueCache)
      window.localStorage.EditorValueCache = "{}";
    
    var storage = JSON.parse(window.localStorage.EditorValueCache);
    
    storage[GetEditorSaveKey()] = value;
    
    window.localStorage.EditorValueCache = JSON.stringify(storage);
  }

  // 清除编辑器缓存
  function ClearEditorCache() {
    if (!window.localStorage)
      return;
      
    if (!window.localStorage.EditorValueCache) {
      window.localStorage.EditorValueCache = "{}";
      return;
    }
    
    var storage = JSON.parse(window.localStorage.EditorValueCache);
    
    if (storage.hasOwnProperty(GetEditorSaveKey())) {
      delete storage[GetEditorSaveKey()];
    }
    
    window.localStorage.EditorValueCache = JSON.stringify(storage);
    
    EditorConfig.cache = false; // 关闭继续记录
  }
  
  /*
   * 
   * 以上部分是editor的依赖的一些函数
   * 
   * 以下部分是editor的内部函数
   * 
   */
  
  function ConvertTextToHtml (text) {
    
    var markedOption = {
      gfm: true,
      table: true,
      breaks: true,
      pedantic: false,
      sanitize: false,
      smartLists: true,
      smartypants: true
    };
    
    if (typeof hljs != "undefined") {
      markedOption.highlight = function (code) {
        return hljs.highlightAuto(code).value;
      }
    }
        
    text = (function (text) {
      
      text = text.replace(/<u>/g, "[underline]");
      text = text.replace(/<\/u>/g, "[~underline]");
      
      text = text.replace(/\\\$\\\$/g, "[DDDD]");
      text = text.replace(/\\\$\$/g, "[DDDD]");
      text = text.replace(/\$\\\$/g, "[DDDD]");
      text = text.replace(/\\\$/g, "[DD]");
      
      text = text.replace(/</g, "&lt;");
      
      return text;
    })(text);
    
    var html = marked(text, markedOption);
    
    /* start do mathjax */
    
    html = html.replace(/\$/g, function (m, offset) {
      // replace '$' which in <code></code> and <pre></pre> to [CCCC]
      // make then can't convert to math
      var code1 = html.lastIndexOf("<code", offset);
      var code2 = html.lastIndexOf("</code", offset);
      if (code1 != -1 && (code2 == -1 || code1 > code2)) {
        return "[CCCC]";
      }
      code1 = html.lastIndexOf("<pre", offset);
      code2 = html.lastIndexOf("</pre", offset);
      if (code1 != -1 && (code2 == -1 || code1 > code2)) {
        return "[CCCC]";
      }
      return m;
    });
    
    var re = /\${2}[^\$]+\${2}|\${1}[^\$]+\${1}/g;
    
    function MathToText (match, matchOffset) {
      match = match.replace(/<br>/gi, "\n");
      match = $("<p>" + match + "</p>").text(); // convert html to text
      return "~mathjax" + utf8_to_b64(match) + "~";
    }
    
    html = html.replace(re, MathToText);
    
    html = html.replace(/\[DDDD\]/g, function () {return "$$";});
    html = html.replace(/\[DD\]/g, function () {return "$";});
    
    html = html.replace(/\[underline\]/g, "<u>");
    html = html.replace(/\[~underline\]/g, "</u>");
    
    (function () {
      function MathToHTML(m, offset) {
        
        m = m.substr("~mathjax".length);
        m = m.substr(0, m.length - 1);
        
        if (!window.editorMathCache) window.editorMathCache = {};
        
        if (window.editorMathCache[m]) {
          return window.editorMathCache[m];
        } else {
          var e = "<span data-id='" + m + "' class='editor-math-element'>" + b64_to_utf8(m) + "</span>";
          return e;
        }
      }
      
      // 把预处理的mathjax转换回公式
      html = html.replace(/~mathjax[^~]+~/g, MathToHTML);
    })();
    
    html = html.replace(/\[CCCC\]/g, "$");
    
    /* end do mathjax */
    
    (function () {
      // 处理@用户
      // @[\w\-\u2E80-\u9FFF]{1,50}[ \ \n\r\t\)\(\]\[\{\}\<\> ]{1} 以@开头，用户名允许字母、数字、下划线、连字符、东亚字符
      // 长度在1到50之间，结尾可以为[ \ \n\r\t\)\(\]\[\{\}\<\> ]中之一，或者为字符串末尾$
      html = html.replace(/@[\w\-\u2E80-\u9FFF]{1,50}[ \ \n\r\t\)\(\]\[\{\}\<\> ]{1}|@[\w\-\u2E80-\u9FFF]{1,50}$/g, function (m) {
        var mm = m.match(/@([\w\-\u2E80-\u9FFF]{1,50})/);
        var username = mm[1];
        
        // 提取可能有的结尾特殊字符
        var last = "";
        if (m.length > (username.length + 1)) {
          last = m[m.length - 1];
        }
        return "<a onmouseover='UserInfoPop(event)' data-username='" + username + "' href='/user/name/" + username + "'>@" + username + "</a>" + last;
      });
    })();
    
    (function () {
      // Table Of Content
      if (html.match(/[^\\]{1}\[toc\]/i) == null) return;
      
      var elements = [];
      var anchors = [];
      
      html = html.replace(/<h1[^<]+<\/h1>|<h2[^<]+<\/h2>|<h3[^<]+<\/h3>|<h4[^<]+<\/h4>|<h5[^<]+<\/h5>|<h6[^<]+<\/h6>/g, function (m) {
        var mm = m.match(/<(h[1-6]{1})[^>]*>([^<]+)</);
        var tag = mm[1];
        var text = mm[2];
        var anchor = "anchor" + utf8_to_b64(text);
        elements.push({tag: tag, text: text, anchor: anchor});
        //console.log(tag, text);
        return "<" + tag + ">" + text + "<span id='" + anchor + "' style='z-index: -9999; margin-top: -60px; padding-bottom: 60px; display: block; float: right;'>&nbsp;</span>" + "</" + tag + ">";
      });
      
      if (!elements.length) {
        return;
      }
      
      function GenerateTree(array) {
        var root = [];
        var current = [];
        root.push(array[0]);
        var head = 0;
        for (var i = 1; i < array.length; i++) {
          if (array[i].tag > root[head].tag) {
            current.push(array[i])
          } else {
            if (current.length) {
              root.push(GenerateTree(current));
              head += 2;
            } else {
              head += 1;
            }
            root.push(array[i]);
            current = [];
          }
        }
        if (current.length != 0)
          root.push(GenerateTree(current));
        return root;
      }
      
      var toc = GenerateTree(elements);
      
      // 把数组树转换为列表字符串
      var anchor_index = 0;
      function ArrayToList(array) {
        var r = "<ul class='list-group'>\n";
        for (var i = 0; i < array.length; i++) {
          if (array[i].length)
            array[i] = ArrayToList(array[i]);
          //console.log(array[i]);
          
          if (array[i].text) {
            r += "<li class='list-group-item' style='padding: 3px 0 3px 40px;'>" +
              "<a style='color: #3498db; font-size: 14px;' href='#"
              + array[i].anchor + "'>" + array[i].text + "</a></li>\n";
          } else {
            r += "<li class='list-group-item' style='padding: 3px 0 3px 40px;'>" +
              array[i] + "</li>\n";
          }
          
        }
        r += "</ul>\n";
        return r;
      }
      
      toc = ArrayToList(toc);
      
      var inserted = false;
      html = html.replace(/\[toc\]/gi, function (m, offset) {
        console.log(offset);
        
        if (inserted) return m;
        
        var code1 = html.lastIndexOf("<code", offset);
        var code2 = html.lastIndexOf("</code", offset);
        if (code1 != -1 && (code2 == -1 || code1 > code2)) {
          return m;
        }
        
        code1 = html.lastIndexOf("<pre", offset);
        code2 = html.lastIndexOf("</pre", offset);
        if (code1 != -1 && (code2 == -1 || code1 > code2)) {
          return m;
        }
        
        inserted = true;
        return toc;
      });
      
    })();
    
    return html;
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
      div.find("pre").each(function(i, block) {
        hljs.highlightBlock(block);
      });
    }
    
    // 如果有必要则刷新editor中的公式
    $(".editor-math-element").each(function () {
      var t = $(this);
      var id = t.data("id");
      
      // 其实这个调用只是一种队列，类似于MathJax.Hub.Typeset(this, function () {...});
      MathJax.Hub.Queue(["Typeset", MathJax.Hub, this, function () {
        if (!window.editorMathCache) window.editorMathCache = {};
        window.editorMathCache[id] = t.html();
      }]);
    });
  }
  
  
  
  
  // 将帖子内的内容进行转换
  function ShowPost () {
    var topics = $(EditorConfig.contentSel);
    if (!topics.length) return;
    
    topics.each(function () {
      var topic = $(this);
      var textarea = topic.find('textarea');
      if (!textarea.length) return;
      
      topic.find(".editor-content").each(function () {
        topic[0].removeChild(this);
      });
      
      var content = textarea.val();
      
      content = ConvertTextToHtml(content);
      
      var div = document.createElement("div");
      div.innerHTML = content;
      
      $(div).addClass("editor-content");
      
      topic.append($(div));
      
      ComposeElement($(div));
    });
    
    $(window).trigger("resize");//Force masonry plugins recalculate size of elements
  }
  
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
    aceEditor.renderer.onResize();
  };
  
  // 增加高度函数
  function ClearHeight () {
    var old = document.getElementById("editorHeightSetting");
    if (old) {
      document.getElementsByTagName("head")[0].removeChild(old);
    }
    aceEditor.renderer.onResize();
  };
  
  // 全屏
  function FullScreen (e) {
    if (!$) return;
    
    var ee = document.getElementById('editor');
    ee.style.position = "fixed";
    ee.style.zIndex = "999999";
    ee.style.width = "99%";
    ee.style.marginLeft = ".5%";
    ee.style.backgroundColor = "white";
    ee.style.top = "0";
    ee.style.left = "0";
    ee.style.padding = "20px;";
    SetHeight($(window).height() - 70);
    $("body").css("overflow-y", "hidden");
  };
  
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
  };
  
  
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
    window.MathJax = {
      tex2jax: {
        inlineMath: [ ['$','$'] ],
        displayMath: [ ['$$','$$'] ],
        processEscapes: true,
        displayIndent: "2em",
        "HTML-CSS": {
          scale: 90
        }
      },
      skipStartupTypeset: true
    };
    
    //如果页面没有editor元素也没有帖子元素，就走
    if (document.getElementById("editor") == null && document.querySelector(EditorConfig.contentSel) == null) {
      if (document.readyState != "complete") {
        DocumentReadyRun(LoadEditor);
      }
      return;
    }
      
    // 如果页面没有editor，但是有帖子元素，就显示
    if (document.getElementById("editor") == null && document.querySelector(EditorConfig.contentSel) != null) {
      // 为了帖子获取所需的文件
      Need([
        "http://cdn.staticfile.org/mathjax/2.4.0/MathJax.js?config=TeX-AMS_HTML",
        "http://cdn.staticfile.org/highlight.js/8.0/highlight.min.js",
        "http://cdn.staticfile.org/highlight.js/8.0/styles/atelier-forest.light.min.css",
        "/editor/markdown.min.js",
        "/editor/editor.css"
        ], function () {
          // 不等jquery，直接读取所需文件，但是等document.ready之后才开始转化
          DocumentReadyRun(function () {
            ShowPost();
          });
      });
      return;
    }
    
    // 程序分支进入这里，说明有editor，可能没有EditorConfig.contentSel

    // 如果有editor的默认值，则设置默认值
    
    var editorElement = document.getElementById("editor");
    
    if (editorElement.attributes["data-submitname"]) {
      EditorConfig.submitName = editorElement.attributes["data-submitname"].value;
    }
    
    // 如果<div id='editor'></div>中有<textarea>，则把其中内容当作默认值
    for (var i = 0; i < editorElement.children.length; i++) {
      if (editorElement.children[i].tagName == "TEXTAREA") {
        EditorConfig.value = editorElement.children[i].value;
        editorElement.removeChild(editorElement.children[i]);
        break;
      }
    }
    
    //把编辑器内容写入div
    editorElement.innerHTML = editorElement.innerHTML +
      "<div class='modal fade' id='EditorInsertPictureModal' tabindex='-1' role='dialog' aria-hidden='true' data-backdrop='static' data-keyboard='false'>\n" +
        "<div class='modal-dialog'>\n" +
          "<div class='modal-content'>\n" +
            "<div class='modal-header'>\n" +
              "<h6 class='modal-title panel-heading-lc'>插入图片 | Insert Picture</h6>\n" +
            "</div>\n" +
            "<div class='modal-body panel-body-lc'>\n" +
              "<label></label>\n" +
              "<input id='EditorInsertPictureModalUrl' class='form-control' placeholder='http://www.moozhi.com/example.jpg'></input>\n" +
            "</div>\n" +
            "<div class='modal-footer'\n>" +
              "<button id='EditorUpload' class='btn btn-default pull-left'>上传图片</button>\n" +
              "<button type='button' id='EditorInsertPictureModalYes' class='btn btn-default' data-dismiss='modal'><span class='glyphicon glyphicon-ok'></span> 确认</button>" +
              "<button type='button' id='EditorInsertPictureModalNo' class='btn btn-default' data-dismiss='modal'><span class='glyphicon glyphicon-remove'></span> 取消</button>" +
            "</div>" +
          "</div><!-- /.modal-content -->\n" +
        "</div><!-- /.modal-dialog -->\n" +
      "</div><!-- /.modal -->\n" +
      
      "<div class='modal fade' id='EditorInsertLinkModal' tabindex='-1' role='dialog' aria-hidden='true' data-backdrop='static' data-keyboard='false'>\n" +
        "<div class='modal-dialog'>\n" +
          "<div class='modal-content'>\n" +
            "<div class='modal-header'>\n" +
              "<h6 class='modal-title panel-heading-lc'>插入链接 | Insert Link</h6>\n" +
            "</div>\n" +
            "<div class='modal-body panel-body-lc'>\n" +
              "<label></label>\n" +
              "<input id='EditorInsertLinkModalUrl' class='form-control' placeholder='http://www.moozhi.com/'></input>\n" +
            "</div>\n" +
            "<div class='modal-footer'\n>" +
              "<button type='button' id='EditorInsertLinkModalYes' class='btn btn-default' data-dismiss='modal'><span class='glyphicon glyphicon-ok'></span> 确认</button>" +
              "<button type='button' id='EditorInsertLinkModalNo' class='btn btn-default' data-dismiss='modal'><span class='glyphicon glyphicon-remove'></span> 取消</button>" +
            "</div>" +
          "</div><!-- /.modal-content -->\n" +
        "</div><!-- /.modal-dialog -->\n" +
      "</div><!-- /.modal -->\n" +
    
      "<div class='container-fluid'>\n" +
        "<div id='DeditorToolbar' class='row'>\n" +
          "<div class='col-xs-12' style='padding: 0'>\n" +
            "<div id='wmd-button-bar'></div>\n" +
            "<div class='btn-group'>\n" +
              "<a href='#' id='DeditorBold' title='粗体 <strong> Ctrl+B' class='btn btn-sm'>\n" +
                "<span class='fa fa-bold'></span>\n" +
              "</a>\n" +
              "<a href='#' id='DeditorItalic' title='斜体 <em> Ctrl+I' class='btn btn-sm'>\n" +
                "<span class='fa fa-italic'></span>\n" +
              "</a>\n" +
            "</div>\n" +
            "<span style='margin: 0 1px;'>|</span>" +
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
            "<span style='margin: 0 1px;'>|</span>" +
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
            "<span style='margin: 0 1px;'>|</span>" +
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
          "</div>\n" +
        "</div>\n" +
        "<div class='row'>\n" +
          "<div id='DeditorPreview' class='col-md-6 col-xs-12'>\n" +
            "<div id='wmd-preview' class='wmd-preview'></div>\n" +
          "</div>\n" +
          "<div id='DeditorInput' class='col-md-6 col-xs-12'>\n" +
            "<div class='wmd-input' id='wmd-input'></div>\n" +
          "</div>\n" +
        "</div>\n" +
      "</div>\n" +
      "<textarea id='DeditorContent' style='display: none;' name='content'></textarea>\n";
      
    document.getElementById("DeditorContent").attributes["name"].value = EditorConfig.submitName;
      
    // 编辑器初始化函数，不着急运行在最下面的Need函数里调用
    // 这个函数运行时已经document.ready
    function EditorInit() {
      if (!$) {
        console.log("jQuery not found, editor cann't init");
        return;
      }
      
      ShowPost();
        
      //var editor = new Markdown.Editor({makeHtml: function (t){return t;}});
      var editor = new Markdown.Editor({makeHtml: function (t) {return t;} });
      
      
      $("#EditorInsertPictureModalYes").on("click", function () {
        EditorConfig.InsertImageCallback && EditorConfig.InsertImageCallback($("#EditorInsertPictureModalUrl").val());
        $("#EditorInsertPictureModalUrl").val("");
      });
      
      $("#EditorInsertPictureModalNo").on("click", function () {
        EditorConfig.InsertImageCallback && EditorConfig.InsertImageCallback(null);
        $("#EditorInsertPictureModalUrl").val("");
      });
      
      $("#EditorInsertPictureModal").on("shown.bs.modal", function () {
        $("#EditorInsertPictureModalUrl").focus();
      });
      
      editor.hooks.set("insertImageDialog", function (callback) {
        EditorConfig.InsertImageCallback = callback;
        $("#EditorInsertPictureModal").modal();
        return true;
      });
      
      
      $("#EditorInsertLinkModalYes").on("click", function () {
        EditorConfig.InsertLinkCallback && EditorConfig.InsertLinkCallback($("#EditorInsertLinkModalUrl").val());
        $("#EditorInsertLinkModalUrl").val("");
      });
      
      $("#EditorInsertLinkModalNo").on("click", function () {
        EditorConfig.InsertLinkCallback && EditorConfig.InsertLinkCallback(null);
        $("#EditorInsertLinkModalUrl").val("");
      });
      
      $("#EditorInsertLinkModal").on("shown.bs.modal", function () {
        $("#EditorInsertLinkModalUrl").focus();
      });
      
      editor.hooks.set("insertLinkDialog", function (callback) {
        EditorConfig.InsertLinkCallback = callback;
        $("#EditorInsertLinkModal").modal();
        return true;
      });
      
    
      var aceEditor = ace.edit("wmd-input");
      aceEditor.setTheme("ace/theme/eclipse");
      aceEditor.setOptions({fontSize: "14px"});
      aceEditor.setShowPrintMargin(false); // 不显示左边栏
      aceEditor.renderer.setShowGutter(false);
      aceEditor.renderer.setPrintMarginColumn(false);
      aceEditor.getSession().setNewLineMode("unix");
      aceEditor.getSession().setUseWrapMode(true);
      aceEditor.getSession().setMode("ace/mode/markdown");
      
      // 修改$padding是为了解决chrome下中文字符可能在行首重叠的问题
      aceEditor.renderer.$padding = aceEditor.renderer.characterWidth;
      
      (function () {
        // 修复一个中文输入问题，放在这里是因为css的加载顺序可能未知
        var css = document.createElement("style");
        css.innerHTML = ".ace_text-input.ace_composition { z-index: 0; }";
        document.getElementsByTagName("head")[0].appendChild(css);
      })();
      
      editor.run(aceEditor);
      
      if (typeof EditorConfig.value == "string") {
        aceEditor.setValue("");
        aceEditor.insert(EditorConfig.value);
        aceEditor.focus();
      } else if ($("#DeditorContent").val() != "") { 
        aceEditor.setValue("");
        aceEditor.insert($("#DeditorContent").val());
        aceEditor.focus();
      } else if (GetEditorCache()) {
        aceEditor.setValue("");
        aceEditor.insert(GetEditorCache());
        aceEditor.focus();
      }
      
      // 在提交时清除editor缓存
      $("form").each(function () {
        var t = $(this);
        if (t.find("#editor").length) {
          t.on("submit", function () {
            ClearEditorCache();
          });
        }
      });
      
      $("#DeditorBold").on("click", function (e) {
        e.preventDefault();
        $("#wmd-bold-button").click();
      });
      
      $("#DeditorItalic").on("click", function (e) {
        e.preventDefault();
        $("#wmd-italic-button").click();
      });
      
      $("#DeditorLink").on("click", function (e) {
        e.preventDefault();
        $("#wmd-link-button").click();
      });
      
      $("#DeditorQuote").on("click", function (e) {
        e.preventDefault();
        $("#wmd-quote-button").click();
      });
      
      $("#DeditorCode").on("click", function (e) {
        e.preventDefault();
        $("#wmd-code-button").click();
      });
      
      $("#DeditorImage").on("click", function (e) {
        e.preventDefault();
        $("#wmd-image-button").click();
      });
      
      $("#DeditorOrder").on("click", function (e) {
        e.preventDefault();
        $("#wmd-olist-button").click();
      });
      
      $("#DeditorUnorder").on("click", function (e) {
        e.preventDefault();
        $("#wmd-ulist-button").click();
      });
      
      $("#DeditorHeader").on("click", function (e) {
        e.preventDefault();
        $("#wmd-heading-button").click();
      });
      
      $("#DeditorHr").on("click", function (e) {
        e.preventDefault();
        $("#wmd-hr-button").click();
      });
      
      $("#DeditorUndo").on("click", function (e) {
        e.preventDefault();
        aceEditor.undo();
      });
      
      $("#DeditorRedo").on("click", function (e) {
        e.preventDefault();
        aceEditor.redo();
      });
      
      $("#DeditorFullscreen").on("click", function (e) {
        
        if (!EditorConfig.fullscreen) {
          FullScreen(e);
          EditorConfig.fullscreen = 1;
          if (e.target.tagName == "A") {
            $(e.target).find("span").attr("class", "fa fa-compress");
          } else {
            $(e.target).attr("class", "fa fa-compress");
          }
        } else {
          ExitFullScreen();
          EditorConfig.fullscreen = 0;
          if (e.target.tagName == "A") {
            $(e.target).find("span").attr("class", "fa fa-expand");
          } else {
            $(e.target).attr("class", "fa fa-expand");
          }
        }
        e.preventDefault();
      });
      
      var usernamePreferInit = false;
      var usernamePreferCache = {};
      window.StopEditorUsernamePrefer = false; // 用这个变量是因为aceEditor.insert会很蠢的一个一个字符插入文字，而且每次都会调用一下on change
      
      aceEditor.getSession().on('change', function() {
        if (!$) return;
        if (!$("#wmd-input").popover) return;
        if (window.StopUsernamePrefer) return;
        
        if (!usernamePreferInit) {
          $("#wmd-input").popover({
            title: "",
            content: "",
            placement: function (dom) {
              $(dom).css("position", "absolute");
            },
            trigger: "manual",
            html: true
          });
          usernamePreferInit = true;
        }
        
        var pos = aceEditor.getCursorPositionScreen();
        var screenRow = pos.row - aceEditor.getFirstVisibleRow();
        
        var crow = pos.row;
        var line = aceEditor.getSession().getLine(crow);
        line = line.substr(0, pos.column + 1);
        var m = line.match(/@([\w\-\u2E80-\u9FFF]{1,50})$/);
        if (m) {
          var username = m[1];
          
          function ShowUserPrefer (result) {
            function GeneratePreferList (a) {
              var r = "";
              for (var i = 0; i < a.length; i++) {
                var u = a[i];
                u = u.substr(username.length);
                u += " ";
                
                r += "<a href='#' onclick=\"window.StopEditorUsernamePrefer=true;aceEditor.insert('" + u + "');event.preventDefault();$('#wmd-input').popover('hide');aceEditor.focus();window.StopEditorUsernamePrefer=false;\">" + a[i] + "<a>";
                
                if (i != (a.length-1))
                  r += "<br>";
              }
              return r;
            }
            //var c = data.success.join("<br>");
            var c = GeneratePreferList(result);
            
            $("#wmd-input").attr("data-content", "hello");
            $(".popover").attr("z-index", 999999);
            $("#wmd-input").popover("show");
            $(".popover-content").html(c);
            $(".popover").css("top", (screenRow + 2) * 18);
            $(".popover").css("left", pos.column * 8);
          }
          
          if (usernamePreferCache[username]) {
            ShowUserPrefer(usernamePreferCache[username]);
          } else {          
            $.get("/user/matchUsername?username=" + username, function(data) {
              if (data.success && data.success.length) {
                usernamePreferCache[username] = data.success;
                ShowUserPrefer(data.success);
              } else {
                $("#wmd-input").popover("hide");
              }
            });
          }
        } else {
          $("#wmd-input").popover("hide");
        }
      });
      
      EditorContentRefresh();
      
      window.editor = editor;
      window.aceEditor = aceEditor;
      
      
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
        var c = $(".ace_scrollbar-v");
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
        }, 300);
      }
      
      function ScrollPreview () {
        if (stopScrollPreview) return;
        stopScrollInput = true;
        var c = $(".ace_scrollbar-v");
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
        }, 300);
      }
      
      $(".ace_scrollbar-v").on("scroll", ScrollInput);
      
      $("#wmd-preview").on("scroll", ScrollPreview);
      
      
      function EditorContentRefresh () {
        var content = aceEditor.getValue();
        if (EditorConfig.cache) {
          SetEditorCache(content);
        }
        
        //editor.refreshPreview();
        content = ConvertTextToHtml(content);
        
        $("#wmd-preview").html(content);
        ComposeElement($("#wmd-preview"));
        ScrollInput();
      }
      
      var timer = null;
      aceEditor.getSession().on('change', function () {
        var content = aceEditor.getValue();
        $("#DeditorContent").val(content);
        
        if (timer != null) {
          clearTimeout(timer);
          timer = null;
        }
        
        if (timer == null) {
          timer = setTimeout(function () {
            EditorContentRefresh();
            timer = null;
          }, 450);
        }
      });
      
      if (typeof Qiniu != "undefined") {
        //从服务器获取token
        $.get("/upload/token", function (data) {
          
          Qiniu.uploader({
            runtimes: "html5,flash,html4", //调用方法排序，html5优先
            browse_button: document.getElementById("EditorUpload"), //绑定的按钮
            uptoken: data.uptoken, //从服务器返回的json中的uptoken
            domain: data.domain, //服务器返回的bucket
            //container: "wmd-upload-container", //target（估计是和form submit有点关系）
            max_file_size: "5mb",
            flash_swf_url: "/images/Moxie.swf",
            max_retries: 3,
            dragdrop: false,
            drop_element: undefined,
            chunk_size: "4mb",
            auto_start: true,
            multi_selection: false,
            filters: {
              mime_types : [
                { title : "Image files", extensions : "jpeg,jpg,gif,png,bmp" }
              ]
            },
            init: {
              "BeforeUpload": function (up, file) {
                var count = 0;
                var timer = setInterval(function () {
                  count++;
                  var t = document.getElementById("UploadTimer");
                  if (t) t.innerHTML = "已经上传了" + count + "秒";
                }, 1000);
                Alert("上传中，请不要关闭本窗口<div id='UploadTimer'></div><div id='UploadProgress'></div>", function () {
                  up.stop();
                  clearInterval(timer);
                });
              },
              "UploadProgress": function (up, file) {
                var t = document.getElementById("UploadProgress");
                if (t) t.innerHTML = "现在进度：" + file.percent + "%";
              },
              "FileUploaded": function (up, file, info) {
                var domain = up.getOption('domain');
                var res = JSON.parse(info);
                
                var imgLink = Qiniu.watermark({
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
                
                
                var sourceLink = imgLink;//domain + res.key;
                
                //window.aceEditor.insert(format("\n![图片标题](%s)\n", imgLink));
                
                $("#EditorInsertPictureModalUrl").val(imgLink);
                
                //$("#AlertModalBody").html("上传成功，请关闭本窗口。（3秒钟后本窗口自动关闭）");
                //setTimeout(function () {
                  $("#AlertModal").modal("hide");
                //}, 3000);
              },
              "Error": function (up, err, errTip) {
                Alert("上传错误，确认您选择的文件格式正确，大小小于5MB，支持的格式有：jpg,gif,png,bmp");
                console.log(up, err, errTip);
              },
              "Key": function(up, file) {
                var key = data.id + "-" + (new Date()).getTime() + "-" + file.name;
                return key
              }
            }
          });
        }, "json").fail(function () {
          $("#wmd-upload-button").on("click", function () {
            alert("获取上传权限失败，无法上传");
          });
          console.log("获取上传权限", arguments);
        });
      }
    }
    
    // 为了编辑器获取所需的js和css
    Need([
      "http://cdn.staticfile.org/mathjax/2.4.0/MathJax.js?config=TeX-AMS_HTML",
      "http://cdn.staticfile.org/ace/1.1.3/ace.js",
      "http://cdn.staticfile.org/highlight.js/8.0/highlight.min.js",
      "http://cdn.staticfile.org/highlight.js/8.0/styles/atelier-forest.light.min.css",
      "http://cdn.staticfile.org/font-awesome/4.1.0/css/font-awesome.min.css",
      "/editor/markdown.min.js",
      "/editor/editor.css"
      ], function () {
        // 上面文件全部加载完毕之后会开始运行DocumentReadyRun函数
        DocumentReadyRun(function () {
          // 当document.readyState == complete后开始运行EditorInit
          EditorInit();
        });
      }
    );
    
  }

  // 开始加载编辑器
  LoadEditor();

})();
