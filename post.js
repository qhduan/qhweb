"use strict";

var fs = require("fs");
var util = require("util");

var config = require("./config")
var tool = require("./tool");

var Cache = {}; // 保存各种缓存


// from dir load post or article
function LoadMarkdown (dir, type) {

	if (fs.statSync(tool.DATABASE + dir).isDirectory()) {
		var result = [];
		var list = [];
		list.push(dir);
		while (list.length > 0) {
			var d = list.pop();
			var l = fs.readdirSync(tool.DATABASE + d);
			for (var i in l) {
				var fn = l[i];
				var fp = d + "/" + fn;
				if (fs.statSync(tool.DATABASE + fp).isDirectory()) {
					list.push(fp);
				} else if (fs.statSync(tool.DATABASE + fp).isFile() && fn.match(/.md$/)) {

          var fid = fn.substr(0, fn.length - 3); // cut off ".md"

					var data = fs.readFileSync(tool.DATABASE + fp, {encoding: "utf-8"});

          var s = "---";
          var pos = data.indexOf(s);

					if (pos == -1) {
					  console.log(fp);
					  throw "file have not splitor";
					}

					var header = data.substr(0, pos);
          var content = data.substr(pos + s.length).trim();

					var elem = {};
          elem.id = fid;
					elem.dir = d;
          elem.type = type;

					elem.title = header.match(/title:\ ([^\0\n]+)\n/);
					elem.date = header.match(/date:\ ([^\0\n]+)\n/);
					if (!elem.title || !elem.date) {
					  console.log(d,fn);
					  throw "file can't be parsed";
					}

					elem.title = elem.title[1];
					elem.date = elem.date[1];

          var date = elem.date.match(/(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})/)
          if (!date) {
					  console.log(d,fn);
					  throw "file date can't be parsed";
          }
          elem.year = date[1];
          elem.month = date[2];
          elem.day = date[3];
          elem.hours = date[4];
          elem.minutes = date[5];
          elem.seconds = date[6];
          elem.archive = date[1] + date[2];

          if (type == "post") {
            elem.accessible = header.match(/accessible:\ ([^\0\n]+)\n/);
            if (elem.accessible) {
              elem.accessible = elem.accessible[1];
            } else {
              elem.accessible = "public";
            }

            elem.category = header.match(/category:\ ([^\0\n]+)\n/);
            if (elem.category) {
              elem.category = elem.category[1];
            } else {
              elem.category = "";
            }
          }

					elem.edit = header.match(/edit:\ ([^\0\n]+)\n/);
          if (elem.edit) {
            elem.edit = elem.edit[1];
          } else {
            elem.edit = "";
          }

          elem.content = content;

					result.push(elem)
				}
			}
		}
		result.sort(function (a, b) {
      var ta = Date.UTC(a.year, a.month, a.day, a.hours, a.minutes, a.seconds);
      var tb = Date.UTC(b.year, b.month, b.day, b.hours, b.minutes, b.seconds);
      return tb - ta;
		});

    return result;
	} else {
		throw "fail to load dir";
	}
}


// load posts and articles
function Load () {
  Cache = {
    Posts: [],
    Articles: [],
    Categories: [],
    Archives: [],
    Index: {}
  };

  // 把post和article都读取出来
  Cache.Posts = LoadMarkdown("posts", "post");
  Cache.Articles = LoadMarkdown("articles", "article");

  // 按照文章的最后时间进行排序，从后向前（大到小）
  if (Cache.Articles.length > 1) {
    Cache.Articles.sort(function (a, b) {
      var adate = a.date;
      var bdate = b.date;
      if (a.edit && a.edit.length) adate = a.edit;
      if (b.edit && b.edit.length) bdate = b.edit;
      if (adate > bdate) return 1;
      if (adate < bdate) return -1;
      return 0;
    });
    Cache.Articles.reverse();
  }

  var categories = {};
  var archives = {};

  Cache.Posts.forEach(function (item, ind, arr) {
    if (ind != 0 && item.accessible != "private") {
      for (var i = ind-1; i >= 0; i--) {
        if (arr[i].accessible != "private") {
          arr[ind].next = {
            id: arr[i].id,
            title: arr[i].title
          };
          break;
        }
      }
    }

    if (ind != (arr.length - 1) && item.accessible != "private") {
      for (var i = ind+1; i < arr.length; i++) {
        if (arr[i].accessible != "private") {
          arr[ind].prev = {
            id: arr[i].id,
            title: arr[i].title
          };
          break;
        }
      }
    }

    Cache.Index[item.id] = item; // 建立从id->obj的post索引

    // 统计category，放入到一个object
    if (item.category && item.category.length) {
      if (categories.hasOwnProperty(item.category)) {
        categories[item.category]++;
      } else {
        categories[item.category] = 1;
      }
    }

    // 统计archive，让入到一个object
    if (item.archive && item.archive.length) {
      if (archives.hasOwnProperty(item.archive)) {
        archives[item.archive]++;
      } else {
        archives[item.archive] = 1;
      }
    }
  });

  Cache.Articles.forEach(function (item) {
    Cache.Index[item.id] = item; // 建立从id->obj的article索引
  });

  // 把统计出来的categories和archives从object转换成array
  for (var i in categories) {
    Cache.Categories.push({name: i, value: categories[i]});
  }
  for (var i in archives) {
    Cache.Archives.push({name: i, value: archives[i]});
  }

  // 对categories进行排序，按照其中的帖子数量从大到小排序
  if (Cache.Categories.length > 1) {
    Cache.Categories.sort(function (a, b) {
      if (a.value > b.value)
        return 1;
      if (a.value < b.value)
        return -1;
      return 0;
    });
    Cache.Categories.reverse();
  }

  // 对archives进行排序，按照时间顺序从后向前（大到小）
  if (Cache.Archives.length > 1) {
    Cache.Archives.sort(function (a, b) {
      if (a > b)
        return 1;
      if (a < b)
        return -1;
      return 0;
    });
    Cache.Archives.reverse();
  }

  var ret = [ "[" + (new Date().toISOString().substring(0, 19).replace("T", " ")) + "]",
    "Loaded:",
    Cache.Posts.length, "posts,",
    Cache.Articles.length, "articles,",
    Cache.Archives.length, "archives,",
    Cache.Categories.length, "categories"];

  ret = ret.join(" ");
  console.log(ret);
  return ret;
}


// create a post in system
function CreatePostHandle (data, callback) {
  var title = data.title;
  var date = data.date;
  var key = data.key;
  var content = data.content;

  if (!title || title.trim() == "") return callback({message: "title can't be empty!"});

  if (!date || date.trim() == "") return callback({message: "date can't be empty!"});

  if (!key || key.trim() == "") return callback({message: "key can't be empty!"});

  if (key != config.get("key")) return callback({message: "key don't match!"});

  if (!content || content.trim() == "") return callback({message: "content can't be empty!"});

  title = title.trim();
  date = date.trim();
  key = key.trim();
  content = content.trim();

  var accessible = "public";
  if (data.accessible && data.accessible == "private") {
    accessible = "private";
  }

  var category = "";
  if (data.category && typeof data.category == "string" && data.category.trim().length) {
    category = data.category.trim();
  }

  var type = "post";
  if (data.type && typeof data.type == "string" && data.type == "article") {
    type = "article";
  }

  var d = date.match(/^(\d\d\d\d)-(\d\d)-(\d\d)\ (\d\d):(\d\d):(\d\d)$/);
  if (!d) {
    return callback({message: "date invalid!"});
  }
  var year = d[1];
  var month = d[2];
  var day = d[3];

  var ExistsOrCreate = function (path) {
    if (!fs.existsSync(path)) {
      fs.mkdirSync(path);
    }
  };

  var GetId = function (year, month, day) {
    var FixNumber = function (n) {
      n = parseInt(n);
      if (isNaN(n) || n < 0) {
        throw "invalid number";
      }
      if (n <= 9) {
        return "0" + n;
      }
      return "" + n;
    }

    var ind = 1;
    var name = year + month + day + FixNumber(ind);

    var post_dir = tool.DATABASE + "posts/" + year + "/" + month + "/";
    var article_dir = tool.DATABASE + "articles/";

    while (true) {
      var has = false;
      if (fs.existsSync(post_dir + name + ".md")
        || fs.existsSync(article_dir + name + ".md")
        || Cache.Index.hasOwnProperty(name)) {
        has = true;
      }

      if (has) {
        ind++;
        name = year + month + day + FixNumber(ind);
      } else {
        break;
      }
    }
    return name;
  };

  if (type == "post") {

    var id = GetId(year, month, day);

    ExistsOrCreate(tool.DATABASE);
    ExistsOrCreate(tool.DATABASE + "posts/" + year);
    ExistsOrCreate(tool.DATABASE + "posts/" + year + "/" + month);

    var path = util.format(tool.DATABASE + "posts/%s/%s/%s.md", year, month, id);

    var data = util.format(
      "title: %s\n" +
      "date: %s\n" +
      "category: %s\n" +
      "accessible: %s\n" +
      "---\n\n" +
      "%s",
      title, date, category, accessible, content);

    fs.writeFile(path, data, {encoding: "utf-8"}, function (err) {
      if(err) {
        console.log(err);
        return callback({message: err});
      }
      Load();
      callback({success: "ok"});
    });
  } else if (type == "article") { // article

    var id = GetId(year, month, day);

    ExistsOrCreate(tool.DATABASE);
    ExistsOrCreate(tool.DATABASE + "articles");

    var path = util.format(tool.DATABASE + "articles/%s.md", id);
    var data = util.format(
      "title: %s\n" +
      "date: %s\n" +
      "---\n\n" +
      "%s",
      title, date, content);

    fs.writeFile(path, data, {encoding: "utf-8"}, function (err) {
      if(err) {
        console.log(err);
        return callback({message: err});
      }
      Load();
      callback({success: "ok"});
    });
  } else {
    return callback({message: "unknown type"});
  }
}


// edit exists post or article
function EditPostHandle (data, callback) {
  var id = data.id;
  var title = data.title;
  var date = data.date;
  var key = data.key;
  var content = data.content;

  if (!id || id.trim() == "") return callback({message: "invalid id"});

  if (!title || title.trim() == "") return callback({message: "invalid title"});

  if (!date || date.trim() == "") return callback({message: "invalid date"});

  if (!key || key.trim() == "") return callback({message: "invalid key"});

  if (key != config.get("key")) return callback({message: "key don't match"});

  if (!content || content.trim() == "") return callback({message: "invalid content"});

  id = id.trim();
  title = title.trim();
  date = date.trim();
  key = key.trim();
  content = content.trim();

  var accessible = "public";
  if (data.accessible && data.accessible == "private") {
    accessible = "private";
  }

  var category = "";
  if (data.category && typeof data.category == "string" && data.category.trim().length) {
    category = data.category.trim();
  }

  if (!date.match(/^(\d\d\d\d)-(\d\d)-(\d\d)\ (\d\d):(\d\d):(\d\d)$/)) {
    return callback({message: "invalid date format"});
  }

  var old = Cache.Index[id];
  if (!old) return callback({message: "not found"});

  var path = tool.DATABASE + old.dir + "/" + id + ".md";

  if (old.type == "post") {
    var data = util.format(
      "title: %s\n" +
      "date: %s\n" +
      "edit: %s\n" +
      "category: %s\n" +
      "accessible: %s\n" +
      "---\n\n" +
      "%s",
      title, old.date, date, category, accessible, content);
    fs.writeFile(path, data, {encoding: "utf-8"}, function (err) {
      if(err) {
        console.log(err);
        return callback({message: err});
      }
      Load();
      callback({success: "ok"});
    });
  } else if (old.type == "article") {
    fs.writeFile(path, util.format(
      "title: %s\n" +
      "date: %s\n" +
      "edit: %s\n" +
      "---\n\n" +
      "%s",
      title, old.date, date, content), {encoding: "utf-8"}, function (err) {
      if(err) {
        console.log(err);
        return callback({message: err});
      }
      Load();
      callback({success: "ok"});
    });
  } else {
    return callback({message: "unknown type"});
  }

}


// delete exists post or article
function DeletePostHandle (data, callback) {
  var id = data.id;
  var key = data.key;

  if (!id || id.trim() == "") return callback({message: "invalid id"});

  if (!key || key.trim() == "") return callback({message: "invalid key"});

  if (key != config.get("key")) return callback({message: "key don't match"});

  id = id.trim();
  key = key.trim();

  var old = Cache.Index[id];
  if (!old) return callback({message: "not found"});

  var path = tool.DATABASE + old.dir + "/" + id + ".md";

  fs.unlink(path, function (err) {
    if(err) {
      console.log(err);
      return callback({message: err});
    }
    Load();
    callback({success: "ok"});
  });
}


// return list of page
function GetPageHandle (data, callback) {
  var page = parseInt(data.page);

  if (isNaN(page) || page <= 0) {
    page = 1;
  }

  var private_mode = false;
  if (data.key && data.key == config.get("key")) {
      private_mode = true;
  }

  var list = Cache.Posts;

  if (private_mode == false) {
    list = list.filter(function (item) {
      if (item.accessible != "private") return true;
      return false;
    });
  }

  if (data.category && typeof data.category == "string" && data.category.length) {
    list = list.filter(function (item) {
      if (item.category == data.category) return true;
      return false;
    });
  }

  if (data.archive && typeof data.archive == "string" && data.archive.length == 6) {
    list = list.filter(function (item) {
      if (item.archive == data.archive) return true;
      return false;
    });
  }

  if (data.search && typeof data.search == "string" && data.search.length) {
    var fkw = data.search; // keywords
    var kw = fkw.split(/\s/);
    kw = kw.filter(function (item) {
      if (item.match(/^[a-zA-Z0-9]{1}$/)) return false;
      return true;
    });

    if (kw.length > 0) {
      list = list.filter(function (item) {
        item.searchScore = 0;
        if (item.title.indexOf(fkw) != -1)
          item.searchScore += 50;
        if (item.content.indexOf(fkw) != -1)
          item.searchScore += 20;
        for (var i = 0; i < kw.length; i++) {
          if (item.title.indexOf(kw[i]) != -1)
            item.searchScore += 10;
          if (item.content.indexOf(kw[i]) != -1)
            item.searchScore += 2;
        }
        if (item.searchScore > 0) return true;
        return false;
      });

      list.sort(function (a, b) {
        if (a.searchScore > b.searchScore) return 1;
        if (a.searchScore < b.searchScore) return -1;
        return 0;
      });
      list.reverse();
    }
  }


  var result = {
    posts: [],
    count: list.length,
    itemOfPage: config.get("itemOfPage")
  };

  var start = (page - 1) * result.itemOfPage;

  if (start >= list.length) {
    return callback({message: "out of range"});
  }

  var number = result.itemOfPage;

  while (number) {
    if (start >= list.length) {
      break;
    }

    result.posts.push(list[start]);
    number--;
    start++;
  }

	callback(result);
}


// return some date to client, include articles, categories, archives, config
function GetInfoHandle (data, callback) {

  var result= {};
  result.articles = Cache.Articles;
  result.categories = Cache.Categories;
  result.archives = Cache.Archives;

  result.config = {
    siteName: config.get("siteName"),
    siteSubtitle: config.get("siteSubtitle"),
    itemOfPage: config.get("itemOfPage"),
    url: config.get("url")
  };

	callback(result);
}


// return content of post/article
function GetContentHandle (data, callback) {
	var id = data.id;
  var old = Cache.Index[id];
  if (!old) {
		callback({ message: "Not found" });
	} else {
		callback(old);
	}
}


Load();


exports.GetInfoHandle = GetInfoHandle;
exports.GetPageHandle = GetPageHandle;
exports.CreatePostHandle = CreatePostHandle;
exports.EditPostHandle = EditPostHandle;
exports.DeletePostHandle = DeletePostHandle;
exports.GetContentHandle = GetContentHandle;
