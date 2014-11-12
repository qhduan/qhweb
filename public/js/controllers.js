

var qhwebControllers = angular.module("qhwebControllers", []);

var qhwebConfig = null;
var qhwebArticles = null;

qhwebControllers.controller("mainController", function ($rootScope, $scope, $routeParams, $http, $location) {
  $scope.title = "title";
  $scope.subtitle = "subtitle";
  $scope.mainButton = {display: "none"};
  $scope.pages = [];
  $scope.maxPage = 1;
  $scope.info = "";
  $scope.posts = [];
  $scope.encodeURIComponent = encodeURIComponent;
  var itemOfPage = 12;
  
  (function GetConfig (callback) {
    if (qhwebConfig) {
      $scope.title = qhwebConfig.siteName;
      $scope.subtitle = qhwebConfig.siteSubtitle;
      $rootScope.title = qhwebConfig.siteName;
      callback && callback();
    } else {
      $http.get("/config")
        .success(function (result) {
          qhwebConfig = result;
          GetConfig(callback);
        });
    }
  })();// autorun
  
  (function GetArticles () {
    if (qhwebArticles) {
      $scope.articles = qhwebArticles;
    } else {  
      $http.get("/article")
        .success(function (result) {
          $scope.articles = result.articles;
          qhwebArticles = result.articles;
        });
    }
  })(); // autorun
  
  (function GetPosts () {
    if ($routeParams.page && parseInt($routeParams.page)) {
      $scope.page = parseInt($routeParams.page);
    } else {
      $scope.page = 1;
    }
    
    $http.get("/page?start="+ ($scope.page - 1)*itemOfPage + "&number=" + itemOfPage)
      .success(function (result) {
        $scope.maxPage = Math.max(Math.ceil(result.count / itemOfPage), 1);
        
        if ($scope.page > $scope.maxPage || $scope.page < 1) {
          $rootScope.goBack();
        } else {
          $scope.posts = result.posts;
          $scope.info = "" + $scope.page + " / " + $scope.maxPage;
          $scope.mainButton = {display: ""};
          $scope.pages = [];
          for (var i = Math.max(1, $scope.page - 4); i <= Math.min($scope.maxPage, $scope.page + 4); i++) {
            $scope.pages.push(i);
          }
        }
      });
  })(); // autorun
  
});



qhwebControllers.controller("newController", function ($rootScope, $scope, $location, $http, $location) {
  $rootScope.title = "New Post";
  $scope.title = "";
  $scope.key = "";
  
  (function InsertDate () {
    var now = new Date();
    now.setTime(now.getTime() - now.getTimezoneOffset() * 60 * 1000);
    $scope.date = now.toISOString().replace(/T|Z|\.\d{3}/g, " ").trim();
  })(); // autorun
  
  $scope.create = function () {
    if ($("textarea[name='content']").length == 0) return;
    var content = $("textarea[name='content']").val().trim();
    
    var title = $scope.title.trim();
    var date = $scope.date.trim();
    var key = $scope.key.trim();
    
    if (title == "") {
      alertify.alert("title can't be empty!");
      return;
    }
    if (date == "") {
      alertify.alert("date can't be empty!");
      return;
    }
    if (key == "") {
      alertify.alert("key can't be empty!");
      return;
    }
    if (content == "") {
      alertify.alert("content can't be empty!");
      return;
    }
    var data = {};
    data.title = title;
    data.date = date;
    data.key = key;
    data.content = content;
    $http.post("/new", data)
      .success(function (result) {
        if (result.message) {
          alertify.alert(result.message, function () {
            $rootScope.goBack();
          });
        } else if (result.success) {
          alertify.alert("Post create successful", function () {
            $rootScope.goBack();
          });
        } else {
          alertify.alert("unknown error");
        }
      });
  };
  
  setTimeout(window.LoadEditor, 100);
});

qhwebControllers.controller("showController", function ($rootScope, $scope, $location, $routeParams, $http, $location) {
  var title = $routeParams.title;
  var type = $routeParams.type;
  $scope.content = "";
    
  if (typeof title != "string" || title.trim().length <= 0 || (type != "post" && type != "article")) {
    alertify.alert("Invalid arguments");
    $rootScope.goBack();
    return;
  }
  
  $http.get("/content?type=" + type + "&title=" + encodeURIComponent(title))
    .success(function (result) {
      if (result.message) {
        alertify.alert(result.message, function () {
          $rootScope.goBack();
        });
      } else {
        $rootScope.title = result.title;
        $scope.title = result.title;
        $scope.subtitle = result.date;
        $scope.content = result.content;
        setTimeout(window.LoadEditor, 100);
      }
    });  
});
