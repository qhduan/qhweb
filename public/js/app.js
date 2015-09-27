(function () {
  "use strict";

  function dododo () {
    
    var clientEncrypt = new JSEncrypt({ default_key_size: 512 });

    var clientPublic = clientEncrypt.getPublicKeyB64();
    var clientPrivate = clientEncrypt.getPrivateKeyB64();

    function ConvertPrivateKey (key) {
      var ret = [];
      ret.push("-----BEGIN RSA PRIVATE KEY-----");
      while (key.length) {
        ret.push(key.substr(0, 64));
        key = key.substr(64);
      }
      ret.push("-----END RSA PRIVATE KEY-----");
      return ret.join("\n");
    }

    function ConvertPublicKey (key) {
      var ret = [];
      ret.push("-----BEGIN PUBLIC KEY-----");
      while (key.length) {
        ret.push(key.substr(0, 64));
        key = key.substr(64);
      }
      ret.push("-----END PUBLIC KEY-----");
      return ret.join("\n");
    }

    var publicKeyCache = {};

    function Encrypt (data, publicKey) {
      if (!publicKeyCache[publicKey]) {
        publicKeyCache[publicKey] = new JSEncrypt({ default_key_size: 512 });
        publicKeyCache[publicKey].setPublicKey(publicKey);
      }
      var dataArray = [];
      while (data.length) {
        dataArray.push(data.substr(0, 48));
        data = data.substr(48);
      }
      var ret = dataArray.map(function (element) {
        return publicKeyCache[publicKey].encrypt(element);
      });
      return ret;
    }

    function Decrypt (data) {
      return clientEncrypt.decrypt(data);
    }

    return {
      encrypt: Encrypt,
      decrypt: Decrypt,
      publicKey: clientPublic
    };
  }


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

  qhweb.factory("Util", [
    "$rootScope", "$location", "$http", "$q", "$document", "$cookies",
    function ($rootScope, $location, $http, $q, $document, $cookies) {

      var Util = {};

      var clientEncrypt = dododo();
      var serverPublicKey = null;

      // 从服务器获取RSA Public Key
      Util.havePublicKey = function () {
        return $q(function (resolve, reject) {
          if (typeof serverPublicKey == "string" && serverPublicKey.length) {
            resolve(serverPublicKey);
          } else {
            $http.get("/publicKey").then(function (response) {
              var data = response.data;
              if (data && data.publicKey) {
                serverPublicKey = data.publicKey;
                resolve(serverPublicKey);
              } else {
                throw new Error("Invalid server public key");
              }
            });
          }
        });
      };

      // 通过RSA加密手段从服务器获取信息
      Util.get = function (data) {
        return $q(function (resolve, reject) {

          Util.havePublicKey().then(function (serverPublicKey) {

            var encode_data = JSON.stringify(data);
            encode_data = clientEncrypt.encrypt(encode_data, serverPublicKey);

            $http.post("blog", { // http://site_address/blog
              content: encode_data,
              clientPublicKey: clientEncrypt.publicKey,
              serverPublicKey: serverPublicKey
            }).then(function (response) {
              if (response.data) {
                if (response.data.message) {
                  // some error happend
                  alertify.error(response.data.message);
                } else if (response.data.content && response.data.content.length) {
                  var data = [];
                  response.data.content.forEach(function (element, index, array) {
                    var t = clientEncrypt.decrypt(element);
                    data.push(t);
                  });
                  data = data.join("");
                  try {
                    data = JSON.parse(data);
                  } catch (e) {
                    console.error("JSON.parse failed");
                    console.error(data);
                    data = null;
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
