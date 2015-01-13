


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
  
  $scope.Reload = function () {
    $http.post("/reload")
      .success(function (result) {
        alertify.alert(result.ok || result.message || "System Error");
      });
  };
  
  $scope.GoArchive = function (choice) {
    if (choice != "Archive" && choice != "") {
      window.location.href = "#/main?archive=" + choice;
    }
  };
  
  $scope.range = function (n, page) {
    var r = [];
    for (var i = (page-n); i <= (page+n); i++) {
      r.push(i);
    }
    return r;
  };
  
  $scope.param = function (page) {
    var p = [];
    
    if ($scope.category && $scope.category.length) {
      p.push("category=" + $scope.category);
    }
    
    if ($scope.archive && $scope.archive.length) {
      p.push("archive=" + $scope.archive);
    }
    
    if (page > 1) {
      p.push("page=" + page);
    }
    
    if (p.length <= 0) return "";
    
    return "?" + p.join("&");
  };
    
  if (qhwebConfig) {
    $scope.title = qhwebConfig.siteName;
    $scope.subtitle = qhwebConfig.siteSubtitle;
    $rootScope.title = qhwebConfig.siteName;
  }
  
  function GetInfo () {    
    $http.post("/info")
      .success(function (result) {
        $scope.articles = result.articles;
        $scope.categories = result.categories;
        $scope.archives = result.archives;
        
        qhwebConfig = result.config;
        $scope.title = qhwebConfig.siteName;
        $scope.subtitle = qhwebConfig.siteSubtitle;
        $rootScope.title = qhwebConfig.siteName;
      });
  }
  
  function GetPosts () {    
    if ($routeParams.page && parseInt($routeParams.page)) {
      $scope.page = parseInt($routeParams.page);
    } else {
      $scope.page = 1;
    }
    
    if ($routeParams.category) {
      $scope.category = $routeParams.category;
    } else {
      $scope.category = "";
    }
    
    if ($routeParams.archive) {
      $scope.archive = $routeParams.archive;
    } else {
      $scope.archive = "";
    }
    
    var obj = {
      page: $scope.page
    };
    
    if ($scope.category.length) {
      obj.category = $scope.category;
    }
    
    if ($scope.archive.length) {
      obj.archive = $scope.archive;
    }
    
    if ($rootScope.qhwebKey.length) {
      obj.key = $rootScope.qhwebKey;
    }
    
    $http.post("/page", obj)
      .success(function (result) {
        $scope.maxPage = Math.max(Math.ceil(result.count / result.itemOfPage), 1);
        
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
  }
  
  $scope.GetPosts = GetPosts;
  
  GetInfo();
  GetPosts();
  
});



qhwebControllers.controller("newController", function ($rootScope, $scope, $location, $http, $location) {
  $rootScope.title = "New Post";
  $scope.title = "";
  $scope.key = "";
  $scope.isarticle = false;
  $scope.isprivate = false;
  $scope.categories = [];
  $scope.category = "";
  
  if ($rootScope.qhwebKey.length) {
    $scope.key = $rootScope.qhwebKey;
  }
  
  (function InsertDate () {
    var now = new Date();
    now.setTime(now.getTime() - now.getTimezoneOffset() * 60 * 1000);
    $scope.date = now.toISOString().replace(/T|Z|\.\d{3}/g, " ").trim();
  })(); // autorun
  
  $http.post("/info")
    .success(function (result) {
      $scope.categories = result.categories;
    });
  
  $scope.ChangeCategory = function (c) {
    $scope.category = c;
  };
  
  $scope.Submit = function () {
    if ($("textarea[name='content']").length == 0) return;
    var content = $("textarea[name='content']").val().trim();
        
    var title = $scope.title.trim();
    var date = $scope.date.trim();
    var key = $scope.key.trim();
    
    var type = $scope.isarticle ? "article" : "post";
    var accessible = $scope.isprivate ? "private" : "public";
    var category = $scope.category.trim();
    
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
    data.type = type;
    
    if (data.type == "post") {
      data.category = category;
      data.accessible = accessible;
    }
    
    $http.post("/new", data)
      .success(function (result) {
        if (result.message) {
          alertify.alert(result.message, function () {
            $rootScope.goBack();
          });
        } else if (result.success) {
          alertify.alert("Post create successful");
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
  
  $http.post("/content", {id: id})
    .success(function (result) {
      if (result.message) {
        alertify.alert(result.message, function () {
          $rootScope.goBack();
        });
      } else {
        $rootScope.title = result.title;
        $scope.id = id;
        $scope.title = result.title;
        $scope.type = result.type;
        
        var ta = document.createElement("textarea");
        ta.value = result.content;
        ta.style.display = "none";
        document.getElementById("content").appendChild(ta);
        
        $scope.createDate = "Created: " + result.date;
        
        if (result.type == "post") {
          $scope.accessible = result.accessible || "public";
        }
        
        if (result.edit && result.edit.length) {
          $scope.editDate = "Edited: " + result.edit;
        }
        
        if (result.category && result.category.length) {
          $scope.category = "Category: " + result.category;
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
                      $rootScope.qhwebKey = data.key;
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
  $scope.isprivate = false;
  $scope.categories = [];
  $scope.category = "";
  $scope.categoryChoice = "";
  
  $scope.changeCategory = function (c) {
    $scope.category = c;
  };
  
  if ($rootScope.qhwebKey.length) {
    $scope.key = $rootScope.qhwebKey;
  }

  var id = $routeParams.id;
  $scope.content = "";
    
  if (typeof id != "string" || id.trim().length <= 0) {
    alertify.alert("Invalid arguments");
    $rootScope.goBack();
    return;
  }
  
  $scope.ChangeCategory = function (c) {
    $scope.category = c;
  };
  
  (function GetCategories () {
    $http.post("/info")
      .success(function (result) {
        $scope.categories = result.categories;
      });
  })();
  
  $http.post("/content", {id: id})
    .success(function (result) {
      if (result.message) {
        alertify.alert(result.message, function () {
          $rootScope.goBack();
        });
      } else {
        $scope.title = result.title;
        
        $scope.type = result.type || "post";
        
        if (result.accessible && result.accessible == "private") {
          $scope.isprivate = true;
        }
        
        if (result.category && result.category.length) {
          $scope.category = result.category;
          $scope.categoryChoice = result.category;
        }
        
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
        
        $scope.Submit = function () {
          if ($("textarea[name='content']").length == 0) return;
          var content = $("textarea[name='content']").val().trim();
          
          var title = $scope.title.trim();
          var date = $scope.date.trim();
          var key = $scope.key.trim();
          var category = $scope.category.trim();
          
          var accessible = $scope.isprivate ? "private" : "public";
          
          if (title == "") {
            return alertify.alert("title can't be empty!");
          }
          if (date == "") {
            return alertify.alert("date can't be empty!");
          }
          if (key == "") {
            return alertify.alert("key can't be empty!");
          }
          if (content == "") {
            return alertify.alert("content can't be empty!");
          }
          var data = {
            id: id,
            title: title,
            date: date,
            key: key,
            content: content,
            category: category,
            accessible: accessible
          };
    
          $http.post("/edit", data)
            .success(function (result) {
              if (result.message) {
                alertify.alert(result.message, function () {
                  $rootScope.goBack();
                });
              } else if (result.success) {
                alertify.alert("Post edit successful");
              } else {
                alertify.alert("unknown error");
              }
            });
        }; // Submit()
        
      }
    });

});



qhwebControllers.controller("configController", function ($rootScope, $scope, $location, $routeParams, $http, $location) {
  $scope.siteName = "";
  $scope.siteSubtitle = "";
  $scope.url = "";
  $scope.itemOfPage = "";
  $scope.key = "";
  
  if ($rootScope.qhwebKey.length) {
    $scope.key = $rootScope.qhwebKey;
  }
  
  (function GetInfo () {    
    $http.post("/info")
      .success(function (result) {
        var cf = result.config;        
        $scope.siteName = cf.siteName;
        $scope.siteSubtitle = cf.siteSubtitle;
        $scope.url = cf.url;
        $scope.itemOfPage = cf.itemOfPage;
        
        $scope.Submit = function () {
          if ($scope.key.trim().length <= 0) {
            alertify.alert("key cannot be empty");
            return;
          }
          
          var itemOfPage = parseInt($scope.itemOfPage);
          if (isNaN(itemOfPage) || itemOfPage <= 0) {
            alertify.alert("invalid item of page");
            return;
          }
          
          var obj = {};
          obj.key = $scope.key;
          obj.itemOfPage = itemOfPage;
          obj.siteName = $scope.siteName;
          obj.siteSubtitle = $scope.siteSubtitle;
          obj.url = $scope.url;
          
          $http.post("/config", obj)
            .success(function (result) {
              if (result.ok) {
                alertify.alert("config update success", function () {
                  $rootScope.goBack();
                });
              } else {
                alertify.alert(result.message || "System Error");
              }
            });
          
        };
      });
  })(); // autorun
});



qhwebControllers.controller("passwordController", function ($rootScope, $scope, $location, $routeParams, $http, $location) {
  $scope.okey = "";
  $scope.nkey = "";
  $scope.rkey = "";
  
  if ($rootScope.qhwebKey.length) {
    $scope.okey = $rootScope.qhwebKey;
  }
  
  $scope.Submit = function () {
    if ($scope.okey == "") {
      return alertify.alert("old key is empty!");
    }
    
    if ($scope.nkey != $scope.rkey) {
      return alertify.alert("new key is different from repeat!");
    }
    
    $http.post("password", {key: $scope.okey, nkey: $scope.nkey})
      .success(function (result) {
        if (result.ok) {
          alertify.alert("success", function () {
            $rootScope.goBack();
          });
        } else {
          alertify.alert(result.message || "System Error");
        }
      });
  };

});


