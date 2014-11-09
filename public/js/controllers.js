

var qhwebControllers = angular.module("qhwebControllers", []);

var qhwebConfig = null;
var qhwebArticles = null;

qhwebControllers.controller("mainController", function ($scope, $routeParams, $http) {
  document.title = "title";
  $scope.title = "title";
  $scope.subtitle = "subtitle";
  $scope.mainButton = {display: "none"};
  $scope.pages = [];
  $scope.maxPage = 1;
  
  function GetConfig (callback) {
    if (qhwebConfig) {
      $scope.title = qhwebConfig.siteName;
      $scope.subtitle = qhwebConfig.siteSubtitle;
      document.title = qhwebConfig.siteName;
      callback && callback();
    } else {
      $http.get("/config")
        .success(function (result) {
          qhwebConfig = result;
          GetConfig(callback);
        });
    }
  }
  
  GetConfig();
  
  var itemOfPage = 12;
  
  if ($routeParams.page) {
    $scope.page = parseInt($routeParams.page);
  } else {
    $scope.page = 1;
  }
  
  $scope.info = "";
  $scope.posts = [];
  
  $http.get("/page?start="+ ($scope.page - 1)*itemOfPage + "&number=" + itemOfPage)
    .success(function (result) {
      $scope.maxPage = Math.max(Math.ceil(result.count / itemOfPage), 1);
      
      if ($scope.page > $scope.maxPage || $scope.page < 1) {
        if (window.history && window.history.length > 1) {
          window.history.go(-1);
        } else {
          window.location.href = "#/main";
        }
      } else {
        $scope.posts = result.posts;
        $scope.info = "" + $scope.page + " / " + $scope.maxPage;
        $scope.mainButton = {display: ""};
        $scope.pages = [];
        for (var i = Math.max(1, $scope.page - 4); i <= Math.min($scope.maxPage, $scope.page + 4); i++) {
          $scope.pages.push(i);
        }
      }
    })
    .error(function () {
    });
    
  if (qhwebArticles) {
    $scope.articles = qhwebArticles;
  } else {  
    $http.get("/article")
      .success(function (result) {
        $scope.articles = result.articles;
        qhwebArticles = result.articles;
      })
      .error(function () {
      });
  }
  
  $scope.encodeURIComponent = encodeURIComponent;
    
});



qhwebControllers.controller("newController", function ($scope, $location, $http) {
  $scope.title = "";
  $scope.key = "";
  document.title = "New Post";
  
  $scope.goHome = function (e) {
    if (window.history.length > 1) {
      window.history.go(-1);
    } else {
      window.location.href = "#/main";
    }
  };
  
  var now = new Date();
  now.setTime(now.getTime() - now.getTimezoneOffset() * 60 * 1000);
  $scope.date = now.toISOString().replace(/T|Z|\.\d{3}/g, " ").trim();
  
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
          alertify.alert(result.message);
        } else if (result.success) {
          alertify.alert("Post create successful", function () {
            window.location.href = "#/main";
          });
        } else {
          alertify.alert("unknown error");
        }
      });
  };
  
  
  setTimeout(window.LoadEditor, 100);
});

qhwebControllers.controller("showController", function ($scope, $location, $routeParams, $http) {
  var title = $routeParams.title;
  var type = $routeParams.type;
  
  $scope.goHome = function () { 
    if (window.history.length > 1) {
      window.history.go(-1);
    } else {
      window.location.href = "#/main";
    }
  };
    
  if (typeof title != "string" || title.trim().length <= 0 || (type != "post" && type != "article")) {
    alertify.alert("Invalid arguments");
    $location.path("#/main");
    return;
  }
  
  $http.get("/content?type=" + type + "&title=" + encodeURIComponent(title))
    .success(function (result) {
      if (result.message) {
        alertify.alert(result.message);
      } else {
        $scope.title = result.title;
        $scope.subtitle = result.date;
        $scope.content = result.content;
        document.title = result.title;
        setTimeout(window.LoadEditor, 100);
      }
    })
    .error();
  
});
