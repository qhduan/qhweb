(function () {
  "use strict";

  function dddd () {

    var serverEncrypt = new NodeRSA({ b: 512 }, "pkcs1-private-pem", { encryptionScheme: "pkcs1", environment: "browser" });

    var serverPublic = serverEncrypt.exportKey("public");
    var serverPrivate = serverEncrypt.exportKey("private");
    // cut off
    serverPublic = serverPublic.replace("-----BEGIN PUBLIC KEY-----", "");
    serverPublic = serverPublic.replace("-----END PUBLIC KEY-----", "");
    serverPublic = serverPublic.replace(/\r?\n|\r/g, "");

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
      if (Object.keys(publicKeyCache).length > 20) {
        publicKeyCache = {};
      }
      if (!publicKeyCache[publicKey]) {
        publicKeyCache[publicKey] = new NodeRSA({ b: 512 }, "pkcs1-private-pem", { encryptionScheme: "pkcs1", environment: "browser" });
        publicKeyCache[publicKey].importKey(ConvertPublicKey(publicKey), "public");
      }
      //data = Base64Encode(data);
      var dataArray = [];
      while (data.length) {
        dataArray.push(data.substr(0, 32));
        data = data.substr(32);
      }
      var ret = dataArray.map(function (element) {
        return publicKeyCache[publicKey].encrypt(element, "base64");
      });
      return ret;
    }

    function Decrypt (dataArray) {
      try {
        var data = dataArray.map(function (element) {
          return serverEncrypt.decrypt(element);
        });
      } catch (e) {
        console.error("decrypt fail", e);
        return null;
      }
      try {
        data = data.join("");
        //data = Base64Decode(data);
        data = JSON.parse(data);
        return data;
      } catch (e) {
        console.log("json parse failed", data, e);
        return null;
      }
    }

    // console.log(Encrypt(JSON.stringify({"hello":"world"}), PUBLIC_KEY));
    return {
      publicKey: serverPublic,
      encrypt: Encrypt,
      decrypt: Decrypt
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

      var clientEncrypt = dddd();
      var serverPublicKey = null;

      // 从服务器获取RSA Public Key
      Util.havePublicKey = function () {
        return $q(function (resolve, reject) {
          if (typeof serverPublicKey == "string" && serverPublicKey.length) {
            resolve(serverPublicKey);
          } else {
            $http.get("/publicKey?" + Math.random().toString().substr(2)).then(function (response) {
              var data = response.data;
              if (data && data.publicKey) {
                serverPublicKey = data.publicKey;
                resolve(data.publicKey);
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
                  var data = clientEncrypt.decrypt(response.data.content);
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
