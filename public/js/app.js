
var qhweb = angular.module("qhweb", ["ngRoute", "qhwebControllers"]);

qhweb.config(["$routeProvider", function ($routeProvider) {
  $routeProvider.
    when("/main", {
      templateUrl: "template/main.html",
      controller: "mainController"
    }).
    when("/show", {
      templateUrl: "template/show.html",
      controller: "showController"
    }).
    when("/new", {
      templateUrl: "template/new.html",
      controller: "newController"
    }).
    otherwise({
      redirectTo: "/main"
    });
}]);

qhweb.config(["$sceProvider", function ($sceProvider) {
  $sceProvider.enabled(false);
}]);
