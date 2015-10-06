(function () {
  "use strict";

  //override defaults
  alertify.defaults.transition = "zoom";
  alertify.defaults.theme.ok = "ui positive button";
  alertify.defaults.theme.cancel = "ui black button";

  var qhweb = angular.module("qhweb", ["ngRoute", "ngCookies", "qhwebControllers"]);

  qhweb.config(["$routeProvider", "$locationProvider", function ($routeProvider, $locationProvider) {
    $routeProvider.
      when("/show/:id", {
        templateUrl: "template/show.html",
        controller: "showController"
      }).
      when("/edit/:id", {
        templateUrl: "template/edit.html",
        controller: "editController"
      }).
      when("/archive/:archive/:page", {
        templateUrl: "template/main.html",
        controller: "mainController"
      }).
      when("/archive/:archive", {
        templateUrl: "template/main.html",
        controller: "mainController"
      }).
      when("/search/:search/:page", {
        templateUrl: "template/main.html",
        controller: "mainController"
      }).
      when("/search/:search", {
        templateUrl: "template/main.html",
        controller: "mainController"
      }).
      when("/category/:category/:page", {
        templateUrl: "template/main.html",
        controller: "mainController"
      }).
      when("/category/:category", {
        templateUrl: "template/main.html",
        controller: "mainController"
      }).
      when("/new", {
        templateUrl: "template/new.html",
        controller: "newController"
      }).
      when("/config", {
        templateUrl: "template/config.html",
        controller: "configController"
      }).
      when("/password", {
        templateUrl: "template/password.html",
        controller: "passwordController"
      }).
      when("/:page/", {
        templateUrl: "template/main.html",
        controller: "mainController"
      }).
      when("/", {
        templateUrl: "template/main.html",
        controller: "mainController"
      }).
      otherwise({
        redirectTo: "/"
      });
    $locationProvider.html5Mode(true);
  }]);

  function base64decode(str) {
    return decodeURIComponent(escape(window.atob(str)));
  }

  function base64encode(str) {
    return window.btoa(unescape(encodeURIComponent(str)));
  }

  function encode (object) {
    var str = JSON.stringify(object);
    var b64 = base64encode(str);

    // fake encrypt
    var ret = "";
    for (var i = 0, len = b64.length; i < len; i += 4) {
      ret += b64[i+3];
      ret += b64[i+2];
      ret += b64[i+1];
      ret += b64[i];
    }
    return ret;
  }

  function decode (str) {
    var b64 = str;

    // fake decrypt
    var ret = "";
    for (var i = 0, len = b64.length; i < len; i += 4) {
      ret += b64[i+3];
      ret += b64[i+2];
      ret += b64[i+1];
      ret += b64[i];
    }
    var s = base64decode(ret);
    var object = null;
    try {
      object = JSON.parse(s);
    } catch (e) {
      return null;
    }
    return object;
  }

  qhweb.factory("Util", [
    "$rootScope", "$location", "$http", "$q", "$document", "$cookies",
    function ($rootScope, $location, $http, $q, $document, $cookies) {

      var Util = {};

      // 通过RSA加密手段从服务器获取信息
      Util.get = function (data) {
        return $q(function (resolve, reject) {

          var encode_data = encode(data);

          $http.post("blog", { // http://site_address/blog
            content: encode_data
          }).then(function (response) {
            if (response.data) {
              if (response.data.message) {
                // some error happend
                alertify.error(response.data.message);
              } else if (response.data.content && response.data.content.length) {
                var data = response.data.content;
                try {
                  data = decode(data);
                } catch (e) {
                  console.error("Data parse failed");
                  console.error(response);
                  reject();
                  return;
                }
                if (data) {
                  resolve(data);
                } else {
                  console.error("Data decrypt failed");
                  console.error(response);
                  reject();
                }
              } else {
                alertify.error("Unknown Error");
              }
            } else {
              alertify.error("Unknown Network Error");
            }
          });

        });
      };

      // 返回
      Util.goBack = function () {
        window.history.go(-1);
      };

      // 测试是否有密码
      Util.hasKey = function () {
        var key = $cookies.get("key");
        if (typeof key == "string" && key.length) {
          return true;
        }
        return false;
      };

      // 返回密码
      Util.key = function () {
        var key = $cookies.get("key");
        if (typeof key == "string" && key.length) {
          return key;
        }
      };

      // 设置密码
      Util.setKey = function (key) {
        $cookies.put("key", key);
      };

      // 清除密码
      Util.clearKey = function () {
        $cookies.remove("key");
      };

      // 校验密码
      Util.verify = function (callback) {
        alertify.prompt()
        .set("title", "Warning")
        .set("message", "Please input your key:")
        .set("type", "password")
        .set("onok", function (evt, value) {
          if (typeof value == "string" && value.trim().length) {
            Util.get({ method: "verify", key: value }).then(function (result) {
              if (result.ok) {
                Util.setKey(value);
                alertify.success("Congratulation, your key is right!", 5, function () {
                  if (typeof callback == "function") callback();
                });
                if (callback) {
                  callback();
                }
              } else {
                alertify.error(result.message || "System Error");
              }
            });
          } else {
            alertify.error("Invalid key");
          }
        }).show();
      };

      // 登出
      Util.loginOut = function (callback) {
        Util.clearKey();
        if (callback) {
          callback();
        }
      }

      Util.go = function (url) {
        $location.url(url); // window.location.href = url;
      };

      Util.title = function (str) {
        $rootScope.title = str;
      };

      $rootScope.Util = Util;

      return Util;
    }
  ]);

  qhweb.config(["$sceProvider", function ($sceProvider) {
    $sceProvider.enabled(false);
  }]);


})();
