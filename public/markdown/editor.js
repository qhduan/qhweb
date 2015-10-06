

(function (window) {
  "use strict";

  var NeedLoaded = {}; // 已经加载了的文件列表
  var NeedLoading = {}; // 正在加载了的文件列表
  function Need (list, callback) {
    if (typeof list == "string") list = [list];
    if (typeof list != "object" || !list.length) return;

    function LoadCss (url, callback) { // 读取css
      var link = document.createElement("link");
      link.type = "text/css";
      link.rel = "stylesheet";
      link.href = url;
      link.onerror = function () { console.log("load css failed:", url); };
      (typeof callback == "function") && (link.onload = function () { callback(url); });
      document.getElementsByTagName("head")[0].appendChild(link);
    }

    function LoadJs (url, callback) { // 读取js
      var js = document.createElement("script");
      js.type = "text/javascript";
      js.src = url;
      js.onerror = function () { console.log("load js failed:", url); };
      (typeof callback == "function") && (js.onload = function () { callback(url); });
      document.getElementsByTagName("body")[0].appendChild(js);
    }

    function GetExt (str) { // 获取后缀名，返回类似".js"或者".js?abc=1"
      var ext = str.substr(str.lastIndexOf("."));
      return ext;
    }
    var count = 0;

    function Complete (url) { // 完成函数，当一个文件loadedd时候执行
      count ++;
      if (!NeedLoaded.hasOwnProperty(url)) {
        NeedLoaded[url] = 1;
      }
      if (NeedLoading.hasOwnProperty(url)) {
        while (NeedLoading[url] && NeedLoading[url].length) {
          var lastcb = NeedLoading[url][NeedLoading[url].length - 1];
          NeedLoading[url].pop();
          (typeof lastcb == "function") && lastcb(url);
        }
        delete NeedLoading[url];
      }
      if (count >= list.length) {
        (typeof callback == "function") && callback();
      }
    }

    list.forEach(function (url) {

      var ext = GetExt(url);
      if (!ext.match(/^\.js|^\.css/)) {
        console.log("load file faile, unknown type:", url);
        return;
      }

      if (NeedLoaded.hasOwnProperty(url)) {
        Complete(url);
        return;
      }

      if (NeedLoading.hasOwnProperty(url)) {
        NeedLoading[url].push(function () {
          Complete(url);
        });
        return;
      }

      // 不能用ext==".js"，因为有些js文件可能有后缀，例如".js?param=10"
      if (ext.match(/^\.js/)) {
        // 当js加载完之后调用complete
        LoadJs(url, Complete);
      } else if (ext.match(/^\.css/)) {
        LoadCss(url, Complete);
      }

      NeedLoading[url] = [];

    });
  }


  var icon = {
    bold:     '<svg width="1792" height="1792" viewBox="0 0 1792 1792" xmlns="http://www.w3.org/2000/svg"><path d="M747 1521q74 32 140 32 376 0 376-335 0-114-41-180-27-44-61.5-74t-67.5-46.5-80.5-25-84-10.5-94.5-2q-73 0-101 10 0 53-.5 159t-.5 158q0 8-1 67.5t-.5 96.5 4.5 83.5 12 66.5zm-14-746q42 7 109 7 82 0 143-13t110-44.5 74.5-89.5 25.5-142q0-70-29-122.5t-79-82-108-43.5-124-14q-50 0-130 13 0 50 4 151t4 152q0 27-.5 80t-.5 79q0 46 1 69zm-541 889l2-94q15-4 85-16t106-27q7-12 12.5-27t8.5-33.5 5.5-32.5 3-37.5.5-34v-65.5q0-982-22-1025-4-8-22-14.5t-44.5-11-49.5-7-48.5-4.5-30.5-3l-4-83q98-2 340-11.5t373-9.5q23 0 68.5.5t67.5.5q70 0 136.5 13t128.5 42 108 71 74 104.5 28 137.5q0 52-16.5 95.5t-39 72-64.5 57.5-73 45-84 40q154 35 256.5 134t102.5 248q0 100-35 179.5t-93.5 130.5-138 85.5-163.5 48.5-176 14q-44 0-132-3t-132-3q-106 0-307 11t-231 12z"/></svg>',
    italic:   '<svg width="1792" height="1792" viewBox="0 0 1792 1792" xmlns="http://www.w3.org/2000/svg"><path d="M384 1662l17-85q6-2 81.5-21.5t111.5-37.5q28-35 41-101 1-7 62-289t114-543.5 52-296.5v-25q-24-13-54.5-18.5t-69.5-8-58-5.5l19-103q33 2 120 6.5t149.5 7 120.5 2.5q48 0 98.5-2.5t121-7 98.5-6.5q-5 39-19 89-30 10-101.5 28.5t-108.5 33.5q-8 19-14 42.5t-9 40-7.5 45.5-6.5 42q-27 148-87.5 419.5t-77.5 355.5q-2 9-13 58t-20 90-16 83.5-6 57.5l1 18q17 4 185 31-3 44-16 99-11 0-32.5 1.5t-32.5 1.5q-29 0-87-10t-86-10q-138-2-206-2-51 0-143 9t-121 11z"/></svg>',
    link:     '<svg width="1792" height="1792" viewBox="0 0 1792 1792" xmlns="http://www.w3.org/2000/svg"><path d="M1520 1216q0-40-28-68l-208-208q-28-28-68-28-42 0-72 32 3 3 19 18.5t21.5 21.5 15 19 13 25.5 3.5 27.5q0 40-28 68t-68 28q-15 0-27.5-3.5t-25.5-13-19-15-21.5-21.5-18.5-19q-33 31-33 73 0 40 28 68l206 207q27 27 68 27 40 0 68-26l147-146q28-28 28-67zm-703-705q0-40-28-68l-206-207q-28-28-68-28-39 0-68 27l-147 146q-28 28-28 67 0 40 28 68l208 208q27 27 68 27 42 0 72-31-3-3-19-18.5t-21.5-21.5-15-19-13-25.5-3.5-27.5q0-40 28-68t68-28q15 0 27.5 3.5t25.5 13 19 15 21.5 21.5 18.5 19q33-31 33-73zm895 705q0 120-85 203l-147 146q-83 83-203 83-121 0-204-85l-206-207q-83-83-83-203 0-123 88-209l-88-88q-86 88-208 88-120 0-204-84l-208-208q-84-84-84-204t85-203l147-146q83-83 203-83 121 0 204 85l206 207q83 83 83 203 0 123-88 209l88 88q86-88 208-88 120 0 204 84l208 208q84 84 84 204z"/></svg>',
    indent:   '<svg width="1792" height="1792" viewBox="0 0 1792 1792" xmlns="http://www.w3.org/2000/svg"><path d="M352 832q0 14-9 23l-288 288q-9 9-23 9-13 0-22.5-9.5t-9.5-22.5v-576q0-13 9.5-22.5t22.5-9.5q14 0 23 9l288 288q9 9 9 23zm1440 480v192q0 13-9.5 22.5t-22.5 9.5h-1728q-13 0-22.5-9.5t-9.5-22.5v-192q0-13 9.5-22.5t22.5-9.5h1728q13 0 22.5 9.5t9.5 22.5zm0-384v192q0 13-9.5 22.5t-22.5 9.5h-1088q-13 0-22.5-9.5t-9.5-22.5v-192q0-13 9.5-22.5t22.5-9.5h1088q13 0 22.5 9.5t9.5 22.5zm0-384v192q0 13-9.5 22.5t-22.5 9.5h-1088q-13 0-22.5-9.5t-9.5-22.5v-192q0-13 9.5-22.5t22.5-9.5h1088q13 0 22.5 9.5t9.5 22.5zm0-384v192q0 13-9.5 22.5t-22.5 9.5h-1728q-13 0-22.5-9.5t-9.5-22.5v-192q0-13 9.5-22.5t22.5-9.5h1728q13 0 22.5 9.5t9.5 22.5z"/></svg>',
    code:     '<svg width="1792" height="1792" viewBox="0 0 1792 1792" xmlns="http://www.w3.org/2000/svg"><path d="M553 1399l-50 50q-10 10-23 10t-23-10l-466-466q-10-10-10-23t10-23l466-466q10-10 23-10t23 10l50 50q10 10 10 23t-10 23l-393 393 393 393q10 10 10 23t-10 23zm591-1067l-373 1291q-4 13-15.5 19.5t-23.5 2.5l-62-17q-13-4-19.5-15.5t-2.5-24.5l373-1291q4-13 15.5-19.5t23.5-2.5l62 17q13 4 19.5 15.5t2.5 24.5zm657 651l-466 466q-10 10-23 10t-23-10l-50-50q-10-10-10-23t10-23l393-393-393-393q-10-10-10-23t10-23l50-50q10-10 23-10t23 10l466 466q10 10 10 23t-10 23z"/></svg>',
    image:    '<svg width="1792" height="1792" viewBox="0 0 1792 1792" xmlns="http://www.w3.org/2000/svg"><path d="M576 576q0 80-56 136t-136 56-136-56-56-136 56-136 136-56 136 56 56 136zm1024 384v448h-1408v-192l320-320 160 160 512-512zm96-704h-1600q-13 0-22.5 9.5t-9.5 22.5v1216q0 13 9.5 22.5t22.5 9.5h1600q13 0 22.5-9.5t9.5-22.5v-1216q0-13-9.5-22.5t-22.5-9.5zm160 32v1216q0 66-47 113t-113 47h-1600q-66 0-113-47t-47-113v-1216q0-66 47-113t113-47h1600q66 0 113 47t47 113z"/></svg>',
    order:    '<svg width="1792" height="1792" viewBox="0 0 1792 1792" xmlns="http://www.w3.org/2000/svg"><path d="M381 1620q0 80-54.5 126t-135.5 46q-106 0-172-66l57-88q49 45 106 45 29 0 50.5-14.5t21.5-42.5q0-64-105-56l-26-56q8-10 32.5-43.5t42.5-54 37-38.5v-1q-16 0-48.5 1t-48.5 1v53h-106v-152h333v88l-95 115q51 12 81 49t30 88zm2-627v159h-362q-6-36-6-54 0-51 23.5-93t56.5-68 66-47.5 56.5-43.5 23.5-45q0-25-14.5-38.5t-39.5-13.5q-46 0-81 58l-85-59q24-51 71.5-79.5t105.5-28.5q73 0 123 41.5t50 112.5q0 50-34 91.5t-75 64.5-75.5 50.5-35.5 52.5h127v-60h105zm1409 319v192q0 13-9.5 22.5t-22.5 9.5h-1216q-13 0-22.5-9.5t-9.5-22.5v-192q0-14 9-23t23-9h1216q13 0 22.5 9.5t9.5 22.5zm-1408-899v99h-335v-99h107q0-41 .5-122t.5-121v-12h-2q-8 17-50 54l-71-76 136-127h106v404h108zm1408 387v192q0 13-9.5 22.5t-22.5 9.5h-1216q-13 0-22.5-9.5t-9.5-22.5v-192q0-14 9-23t23-9h1216q13 0 22.5 9.5t9.5 22.5zm0-512v192q0 13-9.5 22.5t-22.5 9.5h-1216q-13 0-22.5-9.5t-9.5-22.5v-192q0-13 9.5-22.5t22.5-9.5h1216q13 0 22.5 9.5t9.5 22.5z"/></svg>',
    unorder:  '<svg width="1792" height="1792" viewBox="0 0 1792 1792" xmlns="http://www.w3.org/2000/svg"><path d="M384 1408q0 80-56 136t-136 56-136-56-56-136 56-136 136-56 136 56 56 136zm0-512q0 80-56 136t-136 56-136-56-56-136 56-136 136-56 136 56 56 136zm1408 416v192q0 13-9.5 22.5t-22.5 9.5h-1216q-13 0-22.5-9.5t-9.5-22.5v-192q0-13 9.5-22.5t22.5-9.5h1216q13 0 22.5 9.5t9.5 22.5zm-1408-928q0 80-56 136t-136 56-136-56-56-136 56-136 136-56 136 56 56 136zm1408 416v192q0 13-9.5 22.5t-22.5 9.5h-1216q-13 0-22.5-9.5t-9.5-22.5v-192q0-13 9.5-22.5t22.5-9.5h1216q13 0 22.5 9.5t9.5 22.5zm0-512v192q0 13-9.5 22.5t-22.5 9.5h-1216q-13 0-22.5-9.5t-9.5-22.5v-192q0-13 9.5-22.5t22.5-9.5h1216q13 0 22.5 9.5t9.5 22.5z"/></svg>',
    header:   '<svg width="1792" height="1792" viewBox="0 0 1792 1792" xmlns="http://www.w3.org/2000/svg"><path d="M1682 1664q-44 0-132.5-3.5t-133.5-3.5q-44 0-132 3.5t-132 3.5q-24 0-37-20.5t-13-45.5q0-31 17-46t39-17 51-7 45-15q33-21 33-140l-1-391q0-21-1-31-13-4-50-4h-675q-38 0-51 4-1 10-1 31l-1 371q0 142 37 164 16 10 48 13t57 3.5 45 15 20 45.5q0 26-12.5 48t-36.5 22q-47 0-139.5-3.5t-138.5-3.5q-43 0-128 3.5t-127 3.5q-23 0-35.5-21t-12.5-45q0-30 15.5-45t36-17.5 47.5-7.5 42-15q33-23 33-143l-1-57v-813q0-3 .5-26t0-36.5-1.5-38.5-3.5-42-6.5-36.5-11-31.5-16-18q-15-10-45-12t-53-2-41-14-18-45q0-26 12-48t36-22q46 0 138.5 3.5t138.5 3.5q42 0 126.5-3.5t126.5-3.5q25 0 37.5 22t12.5 48q0 30-17 43.5t-38.5 14.5-49.5 4-43 13q-35 21-35 160l1 320q0 21 1 32 13 3 39 3h699q25 0 38-3 1-11 1-32l1-320q0-139-35-160-18-11-58.5-12.5t-66-13-25.5-49.5q0-26 12.5-48t37.5-22q44 0 132 3.5t132 3.5q43 0 129-3.5t129-3.5q25 0 37.5 22t12.5 48q0 30-17.5 44t-40 14.5-51.5 3-44 12.5q-35 23-35 161l1 943q0 119 34 140 16 10 46 13.5t53.5 4.5 41.5 15.5 18 44.5q0 26-12 48t-36 22z"/></svg>',
    ellipsis: '<svg width="1792" height="1792" viewBox="0 0 1792 1792" xmlns="http://www.w3.org/2000/svg"><path d="M576 736v192q0 40-28 68t-68 28h-192q-40 0-68-28t-28-68v-192q0-40 28-68t68-28h192q40 0 68 28t28 68zm512 0v192q0 40-28 68t-68 28h-192q-40 0-68-28t-28-68v-192q0-40 28-68t68-28h192q40 0 68 28t28 68zm512 0v192q0 40-28 68t-68 28h-192q-40 0-68-28t-28-68v-192q0-40 28-68t68-28h192q40 0 68 28t28 68z"/></svg>',
    undo:     '<svg width="1792" height="1792" viewBox="0 0 1792 1792" xmlns="http://www.w3.org/2000/svg"><path d="M1664 896q0 156-61 298t-164 245-245 164-298 61q-172 0-327-72.5t-264-204.5q-7-10-6.5-22.5t8.5-20.5l137-138q10-9 25-9 16 2 23 12 73 95 179 147t225 52q104 0 198.5-40.5t163.5-109.5 109.5-163.5 40.5-198.5-40.5-198.5-109.5-163.5-163.5-109.5-198.5-40.5q-98 0-188 35.5t-160 101.5l137 138q31 30 14 69-17 40-59 40h-448q-26 0-45-19t-19-45v-448q0-42 40-59 39-17 69 14l130 129q107-101 244.5-156.5t284.5-55.5q156 0 298 61t245 164 164 245 61 298z"/></svg>',
    repeat:   '<svg width="1792" height="1792" viewBox="0 0 1792 1792" xmlns="http://www.w3.org/2000/svg"><path d="M1664 256v448q0 26-19 45t-45 19h-448q-42 0-59-40-17-39 14-69l138-138q-148-137-349-137-104 0-198.5 40.5t-163.5 109.5-109.5 163.5-40.5 198.5 40.5 198.5 109.5 163.5 163.5 109.5 198.5 40.5q119 0 225-52t179-147q7-10 23-12 14 0 25 9l137 138q9 8 9.5 20.5t-7.5 22.5q-109 132-264 204.5t-327 72.5q-156 0-298-61t-245-164-164-245-61-298 61-298 164-245 245-164 298-61q147 0 284.5 55.5t244.5 156.5l130-129q29-31 70-14 39 17 39 59z"/></svg>',
    expand:   '<svg width="1792" height="1792" viewBox="0 0 1792 1792" xmlns="http://www.w3.org/2000/svg"><path d="M883 1056q0 13-10 23l-332 332 144 144q19 19 19 45t-19 45-45 19h-448q-26 0-45-19t-19-45v-448q0-26 19-45t45-19 45 19l144 144 332-332q10-10 23-10t23 10l114 114q10 10 10 23zm781-864v448q0 26-19 45t-45 19-45-19l-144-144-332 332q-10 10-23 10t-23-10l-114-114q-10-10-10-23t10-23l332-332-144-144q-19-19-19-45t19-45 45-19h448q26 0 45 19t19 45z"/></svg>',
    question: '<svg width="1792" height="1792" viewBox="0 0 1792 1792" xmlns="http://www.w3.org/2000/svg"><path d="M1088 1256v240q0 16-12 28t-28 12h-240q-16 0-28-12t-12-28v-240q0-16 12-28t28-12h240q16 0 28 12t12 28zm316-600q0 54-15.5 101t-35 76.5-55 59.5-57.5 43.5-61 35.5q-41 23-68.5 65t-27.5 67q0 17-12 32.5t-28 15.5h-240q-15 0-25.5-18.5t-10.5-37.5v-45q0-83 65-156.5t143-108.5q59-27 84-56t25-76q0-42-46.5-74t-107.5-32q-65 0-108 29-35 25-107 115-13 16-31 16-12 0-25-8l-164-125q-13-10-15.5-25t5.5-28q160-266 464-266 80 0 161 31t146 83 106 127.5 41 158.5z"/></svg>'
  };


  var buttonTitle = {
    bold:     "粗体",
    italic:   "斜体",
    link:     "超链接",
    indent:   "缩进",
    code:     "代码段",
    image:    "插入图片",
    order:    "有序列表",
    unorder:  "无序列表",
    header:   "标题",
    ellipsis: "分割线",
    undo:     "撤销",
    repeat:   "重复",
    expand:   "切换全屏",
    question: "帮助"
  };

  function MakeImage (name) {
    return "data:image/svg+xml;base64," + window.btoa(icon[name]);
  }

  var template = [
    "<div class=\"EditorToolbar\">",
    "  <div style=\"float: left;\">",
    "    <img name=\"bold\" />",
    "    <img name=\"italic\" />",
    "    <img name=\"link\" />",
    "    <img name=\"indent\" />",
    "  </div>",
    "  <div style=\"float: left; margin-left: 20px;\">",
    "    <img name=\"code\" />",
    "    <img name=\"image\" />",
    "    <img name=\"order\" />",
    "    <img name=\"unorder\" />",
    "    <img name=\"header\" />",
    "    <img name=\"ellipsis\" />",
    "  </div>",
    "  <div style=\"float: right;\">",
    "    <img name=\"undo\" />",
    "    <img name=\"repeat\" />",
    "    <img name=\"question\" />",
    "    <img name=\"expand\" />",
    "  </div>",
    "</div>",
    "<div spellcheck=\"false\" class=\"EditorInputRender\"></div>",
    "<textarea spellcheck=\"false\" class=\"EditorInput\"></textarea>",
    "<iframe class=\"EditorOutputRender\"></iframe>",
    ""
  ];
  template = template.join("\n");

  function Renderer () {
    var languagesList = hljs.listLanguages();
    marked.setOptions({
      renderer: new marked.Renderer(),
      gfm: true,
      tables: true,
      breaks: true,
      pedantic: false,
      sanitize: true,
      smartLists: true,
      smartypants: false,
      highlight: function (code, lang) {
        var out;
        if (lang && languagesList.indexOf(lang) != -1) {
          out = hljs.highlight(lang, code).value;
        } else {
          out = hljs.highlightAuto(code).value;
        }
        return "<pre><code class=\"hljs\">" + out + "</code></pre>";
      }
    });
  }

  Renderer.prototype.render = function (content) {
    var converted = content;
    var mathArray = [];

    // 把latex公式挑出来，行内的$之间，跨行的$$之间
    converted = converted.replace(/\$\$((?!\$\$)[^\0]){0,1024}\$\$|\$((?!\$)[^\0\r\n]){0,128}\$/g, function (match) {
      var possibleMath = match;
      while (possibleMath[0] == "$") possibleMath = possibleMath.substr(1);
      while (possibleMath[possibleMath.length - 1] == "$") possibleMath = possibleMath.substr(0, possibleMath.length - 1);
      var math = null;
      try {
        math = katex.renderToString(possibleMath);
      } catch (e) {}
      if (math) {
        mathArray.push(math);
        return "[MATH-" + (mathArray.length - 1).toString() + "]";
      }
      return match;
    });

    converted = marked(converted);

    converted = converted.replace(/\[MATH-(\d+)\]/g, function (match) {
      var m = match.match(/\[MATH-(\d+)\]/);
      var index = parseInt(m[1]);
      return mathArray[index];
    });

    return converted;
  };

  function Editor (dom) {
    var that = this;
    if (dom && dom.appendChild && dom.style) {

      that.renderer = new Renderer();
      that.editorDOM = dom;
      that.editorDOM.innerHTML = template;
      that.editorDOM.classList.add("Editor");
      that.editorInput = document.querySelector("#Editor.Editor > .EditorInput");
      that.editorInputRender = document.querySelector("#Editor.Editor > .EditorInputRender");
      that.editorOutputRender = document.querySelector("#Editor.Editor > .EditorOutputRender");

      that.button = {};
      Array.prototype.slice.call(
        document.querySelectorAll("#Editor.Editor > .EditorToolbar img")
      ).forEach(function (button) {
        var name = button.name;
        button.src = MakeImage(name);
        button.title = buttonTitle[name];
        button.alt = buttonTitle[name];
        that.button[name] = button;
      });

      if (that.editorDOM) {

        that.outputRenderStyle = document.createElement("link");
        that.outputRenderStyle.rel = "stylesheet";
        that.outputRenderStyle.type = "text/css";
        that.outputRenderStyle.href = "highlight/styles/monokai_sublime.css";

        that.outputRenderMathStyle = document.createElement("link");
        that.outputRenderMathStyle.rel = "stylesheet";
        that.outputRenderMathStyle.type = "text/css";
        that.outputRenderMathStyle.href = "KaTeX/katex.min.css";

        that.outputRenderContainer = document.createElement("div");

        that.resize();
        that.sync();

        that.editorInput.addEventListener("keyup", function (event)  {
          that.sync();
          that.editorInputRender.scrollTop = that.editorInput.scrollTop;
        });
        that.editorInput.addEventListener("keydown", function (event)  {
          that.sync();
          that.editorInputRender.scrollTop = that.editorInput.scrollTop;
        });
        that.editorInput.addEventListener("mousedown", function (event)  {
          that.sync();
          that.editorInputRender.scrollTop = that.editorInput.scrollTop;
        });
        that.editorInput.addEventListener("mouseup", function (event)  {
          that.sync();
          that.editorInputRender.scrollTop = that.editorInput.scrollTop;
        });
        that.editorInput.addEventListener("scroll", function (event) {
          that.editorInputRender.scrollTop = that.editorInput.scrollTop;
          var body = that.editorOutputRender.contentWindow.document.body;
          body.scrollTop = Math.floor(that.editorInput.scrollTop / that.editorInput.scrollHeight * body.scrollHeight);
        });
        window.addEventListener("resize", function (event) {
          that.resize();
        });
      } else {
        console.error("Editor: Invalid Editor DOM");
      }
    } else {
      console.error("Editor: Invalid DOM");
    }
  };

  Editor.prototype.sync = function () {
    var that = this;
    that.resize();

    var content = that.editorInput.value;
    if (content == that.lastContent) {
      return;
    }
    that.lastContent = content;

    var inputRenderContent = content;
    inputRenderContent = inputRenderContent.replace(/</g, "&lt;");
    inputRenderContent = inputRenderContent.replace(/</g, "&gt;");
    inputRenderContent = hljs.fixMarkup(inputRenderContent);
    that.editorInputRender.classList.add("markdown");
    that.editorInputRender.innerHTML = "<pre>" + inputRenderContent + "<br><br></pre>";
    hljs.configure({useBR: true});
    hljs.highlightBlock(that.editorInputRender);

    var elements = document.querySelectorAll(".EditorInputRender *");
    for (var i = 0; i < elements.length; i++) {
      elements[i].style.fontSize = "14px";
      elements[i].style.fontWeight = "normal";
    }

    var converted = content;
    converted = that.renderer.render(converted);
    that.outputRenderContainer.innerHTML = converted;

    var outputRenderDocument = that.editorOutputRender.contentWindow.document;
    outputRenderDocument.body.appendChild(that.outputRenderStyle);
    outputRenderDocument.body.appendChild(that.outputRenderMathStyle);
    outputRenderDocument.body.appendChild(that.outputRenderContainer);
  };

  Editor.prototype.resize = function () {
    var that = this;
    that.editorDOM.style.minHeight = "500px";
    var width = that.editorDOM.clientWidth;
    var height = that.editorDOM.clientHeight;

    var toolbarHeight = 36;

    that.editorInput.style.width = Math.floor(width * 0.5) - 14 + "px";
    that.editorInput.style.height = Math.floor(height) - toolbarHeight - 16 + "px";
    that.editorInput.style.left = "9px";
    that.editorInputRender.style.width = that.editorInput.style.width;
    that.editorInputRender.style.height = that.editorInput.style.height;
    that.editorInputRender.style.left = that.editorInput.style.left;

    that.editorOutputRender.style.width = Math.floor(width * 0.5) - 4 + "px";
    that.editorOutputRender.style.height = Math.floor(height) - toolbarHeight - 6 + "px";
    that.editorOutputRender.style.left = Math.floor(width * 0.5) + 8 + "px";
  };

  var editor;
  var dom = document.querySelector("#Editor");
  if (dom) {
    Need([
      "KaTeX/katex.min.js",
      "KaTeX/katex.min.css",
      "highlight/highlight.pack.js",
      "input-highlight.css",
      "marked.min.js",
      "editor.css"
    ], function () {
      editor = new Editor(dom);
    });
  }

})(window);
