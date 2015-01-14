(function () {
  "use strict";

  var qhweb = angular.module("qhweb", ["ngRoute", "ngResource", "ngAnimate", "qhwebControllers"]);

  qhweb.config(["$routeProvider", function ($routeProvider) {
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
  }]);

  qhweb.run(["$rootScope", "$location", "$http", "$document",
    function ($rootScope, $location, $http, $document) {
      
    var keys = "";
    $document.on("keypress", function (event) {
      var k = String.fromCharCode(event.which).match(/\w/);
      if (k) {
        k = k[0].toLowerCase();
        keys += k;
        console.log(keys);
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
    
    $rootScope.$on("$routeChangeSuccess", function () {
      history.push($location.url());
    });
    
    $rootScope.GoBack = function () {
      var url = "/main";
      if (history.length > 1) url = history.splice(-2)[0];
      window.location.href = "#" + url;
    };
    
    var qhwebKey = "";
    
    $rootScope.HasKey = function () {
      if (qhwebKey.length) {
        return true;
      }
      return false;
    };
    
    $rootScope.Key = function () {
      return qhwebKey;
    };
    
    $rootScope.SetKey = function (key) {
      qhwebKey = key;
    };
    
    $rootScope.Verify = function (callback) {
      alertify.prompt("Please input your key:", function (evt, value) {
        if (evt && value.trim().length) {
          $http.post("/verify", {key: value})
            .success(function (result) {
              if (result.ok) {
                qhwebKey = value;
                alertify.alert("Congratulation, your key is right!", function () {
                  if (typeof callback == "function") callback();
                });
              } else {
                alertify.alert(result.message || "System Error");
              }
            });
        }
      });
    };
    
  }]);

  qhweb.config(["$sceProvider", function ($sceProvider) {
    $sceProvider.enabled(false);
  }]);
  
  qhweb.factory("Util", ["$rootScope", function ($rootScope) {
    return {
      Go: function (url) {
        window.location.href = url;
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
