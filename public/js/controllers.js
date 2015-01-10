

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
  
  $scope.range = function (n, page) {
    var r = [];
    for (var i = (page-n); i <= (page+n); i++) {
      r.push(i);
    }
    return r;
  };
  
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
    }
    
    $http.get("/article")
      .success(function (result) {
        $scope.articles = result.articles;
        qhwebArticles = result.articles;
      });
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
  
  $scope.submit = function () {
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
  var id = $routeParams.id;
  $scope.content = "";
    
  if (typeof id != "string" || id.trim().length <= 0) {
    alertify.alert("Invalid arguments");
    $rootScope.goBack();
    return;
  }
  
  id = id.trim();
  
  $http.get("/content?id=" + encodeURIComponent(id))
    .success(function (result) {
      if (result.message) {
        alertify.alert(result.message, function () {
          $rootScope.goBack();
        });
      } else {
        $rootScope.title = result.title;
        $scope.id = id;
        $scope.title = result.title;
        
        var ta = document.createElement("textarea");
        ta.value = result.content;
        ta.style.display = "none";
        document.getElementById("content").appendChild(ta);
        
        $scope.createDate = "Created at " + result.date;
        if (result.edit && result.edit.length) {
          $scope.editDate = "Edited at " + result.edit;
        }
        setTimeout(window.LoadEditor, 200);
        
        $scope.del = function () {
          alertify.prompt("Please input your key:", function (evt, value) {
            if (evt) {
              var data = {
                id: id,
                key: value
              };
              $http.post("/del", data)
                .success(function (result) {
                  if (result.success) {
                    alertify.alert("already deleted", function () {
                      $rootScope.goBack();
                    });
                  } else {
                    alertify.alert(result.message);
                  }
                });
            }
          }, {"type" : "password"});
        };
      }
    });
});


qhwebControllers.controller("editController", function ($rootScope, $scope, $location, $routeParams, $http, $location) {
  $rootScope.title = "Edit Post";
  $scope.title = "";
  $scope.key = "";

  var id = $routeParams.id;
  $scope.content = "";
    
  if (typeof id != "string" || id.trim().length <= 0) {
    alertify.alert("Invalid arguments");
    $rootScope.goBack();
    return;
  }
  
  $http.get("/content?id=" + encodeURIComponent(id))
    .success(function (result) {
      if (result.message) {
        alertify.alert(result.message, function () {
          $rootScope.goBack();
        });
      } else {
        $scope.title = result.title;
        
        var ta = document.createElement("textarea");
        ta.style.display = "none";
        ta.value = result.content;
        document.getElementById("editor").appendChild(ta);
        setTimeout(window.LoadEditor, 200);
        
        (function InsertDate () {
          var now = new Date();
          now.setTime(now.getTime() - now.getTimezoneOffset() * 60 * 1000);
          $scope.date = now.toISOString().replace(/T|Z|\.\d{3}/g, " ").trim();
        })(); // autorun
        
        $scope.submit = function () {
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
          data.id = id;
          data.title = title;
          data.date = date;
          data.key = key;
          data.content = content;
          $http.post("/edit", data)
            .success(function (result) {
              if (result.message) {
                alertify.alert(result.message, function () {
                  $rootScope.goBack();
                });
              } else if (result.success) {
                alertify.alert("Post edit successful", function () {
                  $rootScope.goBack();
                });
              } else {
                alertify.alert("unknown error");
              }
            });
        }; // submit()
        
      }
    });

});
