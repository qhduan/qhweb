
var qhweb = angular.module("qhweb", ["ngRoute", "ngAnimate", "qhwebControllers"]);

qhweb.config(["$routeProvider", function ($routeProvider) {
  $routeProvider.
    when("/main", {
      templateUrl: "template/main.html",
      controller: "mainController"
    }).
    when("/main/:page", {
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
    otherwise({
      redirectTo: "/main"
    });
}]);

qhweb.run(function ($rootScope, $location) {
  var history = [];
  
  $rootScope.$on("$routeChangeSuccess", function () {
    history.push($location.url());
  });
  
  $rootScope.goBack = function () {
    var url = "/main";
    if (history.length > 1) url = history.splice(-2)[0];
    window.location.href = "#" + url;
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
