

(function () {
  if (typeof Markdown == "undefined") return;


  function utf8_to_b64( str ) { // str转换为base64
      return window.btoa(encodeURIComponent( escape( str )));
  }

  function b64_to_utf8( str ) { // base64编码转换回str
      return unescape(decodeURIComponent(window.atob( str )));
  }

  Markdown.Plugin = {};

  Markdown.Plugin.RemoveMath = function (text) {

    text = text.replace(/\\~D\\{0,1}~D/g, function (match) {
      return "[DDDDDDDD]";
    });

    text = text.replace(/\\~D/g, function (match) {
      return "[DDDD]";
    });

    //console.log(text);

    text = text.replace(/~D~D((?!~D)[^\0]){0,1000}~D~D(\n{0,1})|~D((?!~D)[^\0]){0,1000}~D/g, function (match) {
      //console.log(match.length);
      //console.log(match);
      if (match.match(/^~D~D/)) {
        match = match.substr(4);
        match = match.substr(0, match.length - 4);
        match = "$$" + match + "$$";
      }
      if (match.match(/^~D/)) {
        match = match.substr(2);
        match = match.substr(0, match.length - 2);
        match = "$" + match + "$";
      }
      return "[mathjax" + utf8_to_b64(match) + "]";
    });
    //console.log(text);


    return text;
  }

  Markdown.Plugin.ReplaceMath = function (text) {
    text = text.replace(/\[DDDDDDDD\]/g, function () {
      return "$$";
    });

    text = text.replace(/\[DDDD\]/g, function () {
      return "$";
    });

    text = text.replace(/\[mathjax([^\]]+)\]/g, function (match, math, offset) {
      return "<span data-id='" + math + "' class='editor-math-element'>" + b64_to_utf8(math) + "</span>";
    });

    return text;
  }

  Markdown.Plugin.ProcessAtUser = function (html) {
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

      if (typeof UserInfoPop == "function" || typeof window.UserInfoPop == "function")
        return "<a onmouseover='UserInfoPop(event)' data-username='" + username + "' href=''>@" + username + "</a>" + last;
      else
        return "<a>@" + username + "</a>" + last;
    });
    return html;
  }


  /*
    生成目录列表，对应window.GotoAnchor函数必须已经定义，以angular为例可以为

    angular.module("xxxController", []).run(["$anchorScroll", "$window", "$location",
    function ($anchorScroll, $window, $location) {
      $window.GotoAnchor = function (event) {
        var target = event.target;
        var id = $(target).attr("data-anchor");
        $location.hash(id);
        $anchorScroll();
      };
    }]);

   */
  Markdown.Plugin.ProcessToc = function (html) {
    // Table Of Content
    if (html.match(/[^\\]{1}\[toc\]/i) == null) return html;

    var elements = [];
    var anchors = [];

    if (typeof window.ProcessTocTempDom == "undefined") {
      window.ProcessTocTempDom = document.createElement("div");
    }
    ProcessTocTempDom = window.ProcessTocTempDom;
    ProcessTocTempDom.innerHTML = html;
    var nodeList = ProcessTocTempDom.querySelectorAll("h1,h2,h3,h4,h5,h6,h7");

    if (!nodeList.length) {
      return html;
    }

    for (var i = 0; i < nodeList.length; i++) {
      var node = nodeList[i];
      var tag = node.tagName;
      var text = node.innerHTML;
      var anchor = "anchor_" + utf8_to_b64(text + "" + i);
      //node.innerHTML += "<span id='" + anchor + "' style='z-index: -9999;>&nbsp;</span>";
      node.id = anchor;
      elements.push({tag: tag, text: text, anchor: anchor});
    }

    html = ProcessTocTempDom.innerHTML;

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
      var r = "<ul class='deditor-toc-group'>\n";
      for (var i = 0; i < array.length; i++) {
        if (array[i].length)
          array[i] = ArrayToList(array[i]);
        //console.log(array[i]);

        if (array[i].text) {
          r += "<li class='deditor-toc-item'>" +
            "<a href='' data-anchor='"
            + array[i].anchor + "' onclick='if(window.GotoAnchor){GotoAnchor(event);}event.preventDefault();'>" + array[i].text + "</a></li>\n";
        } else {
          r += "<li class='deditor-toc-item'>" +
            array[i] + "</li>\n";
        }

      }
      r += "</ul>\n";
      return r;
    }

    toc = ArrayToList(toc);
    toc = "<div class='container-fluid'><div class='row'><div class='deditor-toc-div col-lg-5 col-md-8 col-sm-10 col-xs-12'><h6>目录</h6>" + toc + "</div></div></div>"

    var inserted = false;
    html = html.replace(/\[toc\]/gi, function (m, offset) {
      //console.log(offset);

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
    return html
  }





  // make IE 5.5-7 support window.localStorage
	/*
	 * @ NAME: Cross-browser TextStorage
	 * @ DESC: text storage solution for your pages
	 * @ COPY: sofish, http://sofish.de
	 */
  typeof window.localStorage == 'undefined' && ~function(){

	    var localStorage = window.localStorage = {},
	        prefix = 'data-userdata',
	        doc = document,
	        attrSrc = doc.body,
	        html = doc.documentElement,

	        // save attributeNames to <html>'s
	        // data-userdata attribute
	        mark = function(key, isRemove, temp, reg){

	            html.load(prefix);
	            temp = html.getAttribute(prefix);
	            reg = RegExp('\\b' + key + '\\b,?', 'i');

	            hasKey = reg.test(temp) ? 1 : 0;

	            temp = isRemove ? temp.replace(reg, '').replace(',', '') :
	                    hasKey ? temp : temp === '' ? key :
	                        temp.split(',').concat(key).join(',');


	            html.setAttribute(prefix, temp);
	            html.save(prefix);

	        };

	    // add IE behavior support
	    attrSrc.addBehavior('#default#userData');
	    html.addBehavior('#default#userData');

	    //
	    localStorage.getItem = function(key){
	        attrSrc.load(key);
	        return attrSrc.getAttribute(key);
	    };

	    localStorage.setItem = function(key, value){
	        attrSrc.setAttribute(key, value);
	        attrSrc.save(key);
	        mark(key);
	    };

	    localStorage.removeItem = function(key){
	        attrSrc.removeAttribute(key);
	        attrSrc.save(key);
	        mark(key, 1);
	    };

	    // clear all attributes on <body> that using for textStorage
	    // and clearing them from the 'data-userdata' attribute's value of <html>
	    localStorage.clear = function(){

	        html.load(prefix);

	        var attrs = html.getAttribute(prefix).split(','),
	            len = attrs.length;

	        for(var i=0;i<len;i++){
	            attrSrc.removeAttribute(attrs[i]);
	            attrSrc.save(attrs[i]);
	        };

	        html.setAttribute(prefix,'');
	        html.save(prefix);

	    };

  }();


})();
