(function () {
  "use strict";

  var qhwebControllers = angular.module("qhwebControllers", []);

  var qhwebConfig = null;
  var qhwebArticles = null;



  qhwebControllers.controller("mainController", [
    "$scope", "$routeParams", "$http", "Blog", "Util",
    function ($scope, $routeParams, $http, Blog, Util) {
    
    $scope.title = "title";
    $scope.subtitle = "subtitle";
    $scope.mainButton = {display: "none"};
    $scope.pages = [];
    $scope.maxPage = 1;
    $scope.info = "";
    $scope.posts = [];
    $scope.search = "";
    $scope.message = "Loading...";
    $scope.archiveSelected = "Archive";
    
    $scope.Search = function (s) {
      if (s.trim().length) {
        Util.Go("/main?search=" + encodeURIComponent(s));
      } else {
        Util.Go("/main");
      }
    };
    
    $scope.GoArchive = function (choice) {
      if (choice != "Archive" && choice != "") {
        Util.Go("/main?archive=" + encodeURIComponent(choice));
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
      
      if ($scope.search && $scope.search.length) {
        p.push("search=" + encodeURIComponent($scope.search));
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
      Util.Title(qhwebConfig.siteName);
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
          Util.Title(qhwebConfig.siteName);
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
      
      if ($routeParams.search) {
        $scope.search = $routeParams.search;
      } else {
        $scope.search = "";
      }
      
      var obj = {
        page: $scope.page
      };
      
      if ($scope.category.length) obj.category = $scope.category;
      
      if ($scope.archive.length) obj.archive = $scope.archive;
      
      if ($scope.search.length) obj.search = $scope.search;
      
      if (Util.HasKey()) obj.key = Util.Key();
      
      Blog.list(obj, function (result) {
        if (result.count) {
          $scope.message = "";
        } else {
          $scope.message = "No post found";
        }
        
        $scope.maxPage = Math.max(Math.ceil(result.count / result.itemOfPage), 1);
        
        if ($scope.page > $scope.maxPage || $scope.page < 1) {
          Util.GoBack();
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
  }]);



  qhwebControllers.controller("newController", [
    "$scope", "$http", "Blog", "Util",
    function ($scope, $http, Blog, Util) {
    Util.Title("New Post");
    $scope.title = "";
    $scope.key = "";
    $scope.isarticle = false;
    $scope.isprivate = false;
    $scope.categories = [];
    $scope.category = "";
    
    if (Util.HasKey()) {
      $scope.key = Util.Key();
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
      
      Blog.create(data, function (result) {
        if (result.success) {
          alertify.alert("Post create successful", function () {
            Util.GoBack();
          });
        } else {
          alertify.error(result.message || "System Error");
        }
      });
    };
    
    setTimeout(window.LoadEditor, 100);
  }]);



  qhwebControllers.controller("showController", [
    "$scope", "$routeParams", "Blog", "Util",
    function ($scope, $routeParams, Blog, Util) {
    var id = $routeParams.id;
    $scope.content = "";
    $scope.message = "Loading...";
      
    if (typeof id != "string" || id.trim().length <= 0) {
      return alertify.alert("Invalid arguments", Util.GoBack);
    }
    
    id = id.trim();
    
    Blog.fetch({id: id}, function (result) {
      if (result.message) {
        $scope.message = result.message;
        alertify.alert(result.message, function () {
          Util.GoBack();
        });
      } else {
        Util.Title(result.title);
        $scope.id = id;
        $scope.title = result.title;
        $scope.type = result.type;
        $scope.message = "";
        
        $scope.prev = result.prev;
        $scope.next = result.next;
        
        $scope.fetchContent = result.content;
        
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
        
        setTimeout(function () {
          $scope.$apply();
          window.LoadEditor();
        }, 200);
        
        $scope.del = function () {
          alertify.prompt("Please input your key:", function (evt, value) {
            if (evt) {
              var data = {
                id: id,
                key: value
              };
              Blog.remove(data, function (result) {
                if (result.success) {
                  alertify.alert("already deleted", Util.GoBack);
                } else {
                  alertify.error(result.message || "System Error");
                }
              });
            }
          }, {"type" : "password"});
        };
      }
    });
  }]);



  qhwebControllers.controller("editController", [
    "$scope", "$routeParams", "$http", "Blog", "Util",
    function ($scope, $routeParams, $http, Blog, Util) {
    Util.Title("Edit Post");
    $scope.title = "";
    $scope.key = "";
    $scope.isprivate = false;
    $scope.categories = [];
    $scope.category = "";
    $scope.categoryChoice = "";
    
    $scope.changeCategory = function (c) {
      $scope.category = c;
    };
    
    if (Util.HasKey()) {
      $scope.key = Util.Key();
    }

    var id = $routeParams.id;
    $scope.content = "";
      
    if (typeof id != "string" || id.trim().length <= 0) {
      return alertify.alert("Invalid arguments", function () {
        Util.GoBack();
      });
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
    
    Blog.fetch({id: id}, function (result) {
      if (result.message) {
        alertify.alert(result.message, function () {
          Util.GoBack();
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
    
          Blog.save(data, function (result) {
            if (result.success) {
              alertify.alert("Post edit successful", Util.GoBack);
            } else {
              alertify.error(result.message || "System Error");
            }
          });
        }; // Submit()
        
      }
    });

  }]);



  qhwebControllers.controller("configController", [
    "$scope", "$http", "Util",
    function ($scope, $http, Util) {
    Util.Title("Config");
    $scope.siteName = "";
    $scope.siteSubtitle = "";
    $scope.url = "";
    $scope.itemOfPage = "";
    $scope.key = "";
    
    if (Util.HasKey()) {
      $scope.key = Util.Key();
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
              return alertify.alert("key cannot be empty");
            }
            
            var itemOfPage = parseInt($scope.itemOfPage);
            if (isNaN(itemOfPage) || itemOfPage <= 0) {
              return alertify.alert("invalid item of page");
            }
            
            var obj = {
              key: $scope.key,
              itemOfPage: itemOfPage,
              siteName: $scope.siteName,
              siteSubtitle: $scope.siteSubtitle,
              url: $scope.url
            };
            
            $http.post("/config", obj)
              .success(function (result) {
                if (result.ok) {
                  alertify.success("config update success");
                } else {
                  alertify.error(result.message || "System Error");
                }
              });
            
          };
        });
    })(); // autorun
  }]);



  qhwebControllers.controller("passwordController", [
    "$scope", "$http", "Util",
    function ($scope, $http, Util) {
    Util.Title("Change Password");
    $scope.okey = "";
    $scope.nkey = "";
    $scope.rkey = "";
    
    if (Util.HasKey()) {
      $scope.okey = Util.Key();
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
              if (Util.HasKey()) {
                Util.SetKey($scope.nkey);
              }
              Util.GoBack();
            });
          } else {
            alertify.error(result.message || "System Error");
          }
        });
    };

  }]);

})();
