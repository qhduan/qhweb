
var qhweb = angular.module("qhweb", ["ngRoute", "ngAnimate", "qhwebControllers"]);

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

qhweb.run(function ($rootScope, $location, $http) {
  var history = [];
  
  $rootScope.$on("$routeChangeSuccess", function () {
    history.push($location.url());
  });
  
  $rootScope.goBack = function () {
    var url = "/main";
    if (history.length > 1) url = history.splice(-2)[0];
    window.location.href = "#" + url;
  };
  
  $rootScope.qhwebKey = "";  
  $rootScope.verify = function (callback) {
    alertify.prompt("Please input your key:", function (evt, value) {
      if (evt && value.trim().length) {
        $http.post("/verify", {key: value})
          .success(function (result) {
            if (result.ok) {
              $rootScope.qhwebKey = value;
              alertify.alert("Congratulation, your key is right!");
              if (callback) callback();
            } else {
              alertify.alert(result.message || "System Error");
            }
          });
      }
    });
  };
  
  
});

qhweb.config(["$sceProvider", function ($sceProvider) {
  $sceProvider.enabled(false);
}]);

qhweb.animation(".qhwebAnimation", function () {
  return {
    enter: function (element, done) {
      console.log(element);
      done();
      return function (){};
    }
  };
});
