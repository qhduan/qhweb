(function () {
  "use strict";

  var qhwebControllers = angular.module("qhwebControllers", []);

  var qhwebConfig = null;
  var qhwebArticles = null;

  qhwebControllers.run(["$anchorScroll", "$window", "$location",
  function ($anchorScroll, $window, $location) {
    $window.GotoAnchor = function (event) {
      var target = event.target;
      var id = $(target).attr("data-anchor");
      $location.hash(id);
      $anchorScroll();
    };
  }]);

  qhwebControllers.controller("mainController", [
    "$scope", "$routeParams", "Util",
    function ($scope, $routeParams, Util) {

    $scope.title = "title";
    $scope.subtitle = "subtitle";
    $scope.mainButton = {display: "none"};
    $scope.pages = [];
    $scope.maxPage = 1;
    $scope.info = "";
    $scope.posts = [];
    $scope.searchText = "";
    $scope.searchParam = "";
    $scope.searchMode = false;
    $scope.message = "Loading...";
    $scope.archiveSelected = "Archive";

    $scope.Search = function () {
      var s = $scope.searchText;
      if (typeof s == "string" && s.trim().length) {
        Util.go("/search/" + encodeURIComponent(s));
      } else {
        Util.go("/");
      }
    };

    $scope.GoArchive = function (choice) {
      if (choice.length) {
        if (choice != "Archive") {
          Util.go("/archive/" + encodeURIComponent(choice));
        }
      }
    };

    $scope.Range = function (n, page) {
      var r = [];
      for (var i = (page-n); i <= (page+n); i++) {
        r.push(i);
      }
      return r;
    };

    $scope.Param = function (page) {
      var p = [];

      if ($scope.category && $scope.category.length) {
        p.push("category");
        p.push($scope.category);
      }

      if ($scope.archive && $scope.archive.length) {
        p.push("archive");
        p.push($scope.archive);
      }

      if ($scope.searchParam && $scope.searchParam.length) {
        p.push("search");
        p.push(encodeURIComponent($scope.searchParam));
      }

      if (page > 1 && page <= $scope.maxPage) {
        p.push(page);
      }

      if (p.length == 0 && page == 1) {
        return "/";
      }

      if (p.length <= 0) return "";

      return "/" + p.join("/");
    };

    if (qhwebConfig) {
      $scope.title = qhwebConfig.siteName;
      $scope.subtitle = qhwebConfig.siteSubtitle;
      $scope.url = qhwebConfig.url;
      Util.title(qhwebConfig.siteName);
    }

    function GetInfo () {
      Util.get({ method: "info" }).then(function (result) {
        $scope.articles = result.articles;
        $scope.categories = result.categories;
        $scope.archives = result.archives;

        qhwebConfig = result.config;
        $scope.title = qhwebConfig.siteName;
        $scope.subtitle = qhwebConfig.siteSubtitle;
        $scope.url = qhwebConfig.url;
        Util.title(qhwebConfig.siteName);
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
        $scope.searchParam = $routeParams.search;
        $scope.searchMode = true;
      } else {
        $scope.searchParam = "";
      }

      var obj = {
        method: "list",
        page: $scope.page
      };

      if ($scope.category.length) obj.category = $scope.category;

      if ($scope.archive.length) obj.archive = $scope.archive;

      if ($scope.searchParam.length) obj.search = $scope.searchParam;

      if (Util.hasKey()) obj.key = Util.key();

      Util.get(obj).then(function (result) {
        if (result.count) {
          $scope.message = "";
        } else {
          $scope.message = "No post found";
        }

        $scope.maxPage = Math.max(Math.ceil(result.count / result.itemOfPage), 1);
        $scope.info = "" + result.count + " posts";

        if ($scope.page > $scope.maxPage || $scope.page < 1) {
          Util.goBack();
        } else {
          $scope.posts = result.posts;
          $scope.mainButton = {display: ""};
          $scope.pages = [];
          for (var i = Math.max(1, $scope.page - 4); i <= Math.min($scope.maxPage, $scope.page + 4); i++) {
            $scope.pages.push(i);
          }
        }
      }); // Util.get
    }

    $scope.GetPosts = GetPosts;

    GetInfo();
    GetPosts();

  }]);



  qhwebControllers.controller("newController", [
    "$scope", "Util",
    function ($scope, Util) {
    Util.title("New Post");
    $scope.title = "";
    $scope.key = "";
    $scope.categories = [];
    $scope.category = "";
    $scope.choiceType = "post";
    $scope.choiceAccessible = "public";

    if (Util.hasKey()) {
      $scope.key = Util.key();
    }

    (function InsertDate () {
      var now = new Date();
      now.setTime(now.getTime() - now.getTimezoneOffset() * 60 * 1000);
      $scope.date = now.toISOString().replace(/T|Z|\.\d{3}/g, " ").trim();
    })(); // autorun

    Util.get({ method: "info" }).then(function (result) {
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

      var type = $scope.choiceType;
      var accessible = $scope.choiceAccessible;
      var category = $scope.category.trim();

      if (title == "") {
        alertify.error("title can't be empty!");
        return;
      }
      if (date == "") {
        alertify.error("date can't be empty!");
        return;
      }
      if (key == "") {
        alertify.error("key can't be empty!");
        return;
      }
      if (content == "") {
        alertify.error("content can't be empty!");
        return;
      }
      var data = {
        method: "create",
        title: title,
        date: date,
        key: key,
        content: content,
        type: type
      };

      if (data.type == "post") {
        data.category = category;
        data.accessible = accessible;
      }

      Util.get(data).then(function (result) {
        if (result.success) {
          alertify
          .alert("Post create successful")
          .set("closable", false)
          .set("onok", function () {
            Util.goBack();
          });
        } else {
          alertify.error(result.message || "System Error");
        }
      });
    };

    setTimeout(window.LoadEditor, 100);
  }]);



  qhwebControllers.controller("showController", [
    "$scope", "$routeParams", "Util",
    function ($scope, $routeParams, Util) {
    var id = $routeParams.id;
    $scope.content = "";
    $scope.message = "Loading...";

    $scope.dropdown = function () {
      $('.dropdown').dropdown({ transition: 'drop' });
    };

    if (typeof id != "string" || id.trim().length <= 0) {
      return alertify.error("Invalid arguments", Util.goBack);
    }

    id = id.trim();

    Util.get({ id: id, method: "get" }).then(function (result) {
      if (result.message) {
        $scope.message = result.message;
        alertify.error(result.message, 5, function () {
          Util.goBack();
        });
      } else {
        Util.title(result.title);
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
        }, 1);

        $scope.Delete = function () {
          if (!Util.hasKey()) {
            alertify.error("your're not sign in");
          } else {
            alertify.confirm("Are you sure? We will throw it to Mars and you'll never have it again!", function (evt) {
              if (evt) {
                var data = {
                  method: "remove",
                  id: id,
                  key: Util.key()
                };

                Util.get(data).then(function (result) {
                  if (result.success) {
                    alertify
                    .alert("Post deleted successful")
                    .set("closable", false)
                    .set("onok", function () {
                      Util.goBack();
                    });
                  } else {
                    alertify.error(result.message || "System Error");
                  }
                });
              }
            });
          }
        };
      }
    });
  }]);



  qhwebControllers.controller("editController", [
    "$scope", "$routeParams", "Util",
    function ($scope, $routeParams, Util) {
      Util.title("Edit");
      $scope.title = "";
      $scope.key = "";
      $scope.categories = [];
      $scope.category = "";
      $scope.categoryChoice = "";
      $scope.choiceAccessible = "public";
      $scope.choiceType = "post";

      $scope.changeCategory = function (c) {
        $scope.category = c;
      };

      if (Util.hasKey()) {
        $scope.key = Util.key();
      }

      var id = $routeParams.id;
      $scope.id = id;
      $scope.content = "";

      if (typeof id != "string" || id.trim().length <= 0) {
        return alertify.error("Invalid arguments", function () {
          Util.goBack();
        });
      }

      $scope.ChangeCategory = function (c) {
        $scope.category = c;
      };

      (function GetCategories () {
        Util.get({ method: "info" }).then(function (result) {
          $scope.categories = result.categories;
        });
      })();

      Util.get({ method: "get", id: id }).then(function (result) {
        if (result.message) {
          alertify.error(result.message, function () {
            Util.goBack();
          });
        } else {
          $scope.title = result.title;

          $scope.type = result.type || "post";

          $scope.createDate = result.date;

          if (result.accessible && result.accessible == "private") {
            $scope.choiceAccessible = "private";
          }

          console.log($scope.choiceAccessible);

          if (result.category && result.category.length) {
            $scope.category = result.category;
            $scope.categoryChoice = result.category;
          }

          $scope.oldContent = result.content;

          setTimeout(function () {
            $scope.$apply();
            window.LoadEditor();
          }, 1);

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

            var accessible = $scope.choiceAccessible;

            if (title == "") {
              return alertify.error("title can't be empty!");
            }
            if (date == "") {
              return alertify.error("date can't be empty!");
            }
            if (key == "") {
              return alertify.error("key can't be empty!");
            }
            if (content == "") {
              return alertify.error("content can't be empty!");
            }
            var data = {
              method: "save",
              id: id,
              title: title,
              date: date,
              key: key,
              content: content,
              category: category,
              accessible: accessible
            };

            Util.get(data).then(function (result) {
              if (result.success) {
                alertify
                .alert("Post edited successful")
                .set("closable", false)
                .set("onok", function () {
                  Util.goBack();
                });
              } else {
                alertify.error(result.message || "System Error");
              }
            });
          }; // Submit()

        }
      });

    }
  ]);



  qhwebControllers.controller("configController", [
    "$scope", "Util",
    function ($scope, Util) {
    Util.title("Config");
    $scope.siteName = "";
    $scope.siteSubtitle = "";
    $scope.url = "";
    $scope.itemOfPage = "";
    $scope.key = "";

    if (Util.hasKey()) {
      $scope.key = Util.key();
    }

    (function GetInfo () {
      Util.get({ method: "info" }).then(function (result) {
          var cf = result.config;
          $scope.siteName = cf.siteName;
          $scope.siteSubtitle = cf.siteSubtitle;
          $scope.url = cf.url;
          $scope.itemOfPage = cf.itemOfPage;

          $scope.Submit = function () {
            if ($scope.key.trim().length <= 0) {
              return alertify.error("key cannot be empty");
            }

            var itemOfPage = parseInt($scope.itemOfPage);
            if (isNaN(itemOfPage) || itemOfPage <= 0) {
              return alertify.error("invalid item of page");
            }

            var obj = {
              method: "config",
              key: $scope.key,
              itemOfPage: itemOfPage,
              siteName: $scope.siteName,
              siteSubtitle: $scope.siteSubtitle,
              url: $scope.url
            };

            Util.get(obj).then(function (result) {
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
    "$scope", "Util",
    function ($scope, Util) {
    Util.title("Change Password");
    $scope.okey = "";
    $scope.nkey = "";
    $scope.rkey = "";

    if (Util.hasKey()) {
      $scope.okey = Util.key();
    }

    $scope.Submit = function () {
      if ($scope.okey == "") {
        return alertify.alert("old key is empty!");
      }

      if ($scope.nkey != $scope.rkey) {
        return alertify.alert("new key is different from repeat!");
      }

      Util.get({ method: "password", key: $scope.okey, nkey: $scope.nkey }).then(function (result) {
        if (result.ok) {
          alertify.success("success", 5, function () {
            if (Util.hasKey()) {
              Util.setKey($scope.nkey);
            }
            Util.goBack();
          });
        } else {
          alertify.error(result.message || "System Error");
        }
      });
    };

  }]);

})();
