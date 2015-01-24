(function () {
  "use strict";

  var qhweb = angular.module("qhweb", ["ngRoute", "ngResource", "ngAnimate", "ngCookies", "qhwebControllers"]);

  qhweb.config(["$routeProvider", "$locationProvider", function ($routeProvider, $locationProvider) {
    $routeProvider.
      when("/main", {
        templateUrl: "template/main.html",
        controller: "mainController"
      }).
      when("/show/:id", {
        templateUrl: "template/show.html",
        controller: "showController"
      }).
      when("/edit/:id", {
        templateUrl: "template/edit.html",
        controller: "editController"
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
      otherwise({
        redirectTo: "/main"
      });
    $locationProvider.html5Mode(true);
  }]);

  qhweb.run(["$rootScope", "$location", "$http", "$document", "$cookieStore",
    function ($rootScope, $location, $http, $document, $cookieStore) {
      
    var keys = "";
    $document.on("keypress", function (event) {
      var k = String.fromCharCode(event.which).match(/\w/);
      if (k) {
        k = k[0].toLowerCase();
        keys += k;
        if (keys.match(/new$/)) {
          keys = "";
          window.location.href = "#/new";
        }
        if (keys.match(/config$/)) {
          keys = "";
          window.location.href = "#/config";
        }
        if (keys.match(/password$/)) {
          keys = "";
          window.location.href = "#/password";
        }
        if (keys.match(/main$/)) {
          keys = "";
          window.location.href = "#/main";
        }
      }
    });
    
    var history = [];
    
    $rootScope.GoBack = function () {
      window.history.go(-1);
    };
    
    function HasKey () {
      var key = $cookieStore.get("key");
      if (typeof key == "string" && key.length) {
        return true;
      }
      return false;
    }
    
    function Key () {
      var key = $cookieStore.get("key");
      if (typeof key == "string" && key.length) {
        return key;
      }
    }
    
    function SetKey (key) {
      $cookieStore.put("key", key);
    }
    
    function ClearKey () {
      $cookieStore.remove("key");
    }
    
    function Verify (callback) {
      alertify.prompt("Please input your key:", function (evt, value) {
        if (evt && value.trim().length) {
          $http.post("/verify", {key: value})
            .success(function (result) {
              if (result.ok) {
                SetKey(value);
                alertify.success("Congratulation, your key is right!", function () {
                  if (typeof callback == "function") callback();
                });
              } else {
                alertify.error(result.message || "System Error");
              }
            });
        }
      });
    }
    
    function LoginOut () {
      ClearKey();
    }
    
    $rootScope.HasKey = HasKey;
    $rootScope.Key = Key;
    $rootScope.SetKey = SetKey;
    $rootScope.Verify = Verify;
    $rootScope.LoginOut = LoginOut;
    
  }]);

  qhweb.config(["$sceProvider", function ($sceProvider) {
    $sceProvider.enabled(false);
  }]);
  
  qhweb.factory("Util", ["$rootScope", "$location", function ($rootScope, $location) {
    return {
      Go: function (url) {
        //window.location.href = url;
        $location.url(url);
      },
      GoBack: function () {
        $rootScope.GoBack();
      },
      HasKey: function () {
        return $rootScope.HasKey();
      },
      Key: function () {
        return $rootScope.Key();
      },
      SetKey: function (key) {
        $rootScope.SetKey(key);
      },
      Title: function (str) {
        $rootScope.title = str;
      }
    };
  }]);
  
  qhweb.factory("Blog", ["$resource", function ($resource) {
    return $resource("/blog/:method", {}, {
      list: {
        method: "POST",
        params: { method: "list" }
      },
      create: {
        method: "POST",
        params: { method: "create" }
      },
      remove: {
        method: "POST",
        params: { method: "remove" }
      },
      save: {
        method: "POST",
        params: { method: "save" }
      },
      fetch: {
        method: "POST",
        params: { method: "fetch" }
      }
    });
  }]);

})();
