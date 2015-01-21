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
					  console.log(f);
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
		  a = new Date(a.date);
		  b = new Date(b.date);
		  return b.getTime() - a.getTime();
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
          arr[ind].prev = {
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
          arr[ind].next = {
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
  
  var ret = ["Loaded",
    ":",
    Cache.Posts.length, "posts,",
    Cache.Articles.length, "articles,",
    Cache.Archives.length, "archives,",
    Cache.Categories.length, "categories",
    "---",
    (new Date().toLocaleString())];
  
  ret = ret.join(" ");
  console.log(ret);
  return ret;
}


// create a post in system
function CreatePostHandle (req, res) {
  var title = req.body.title;
  var date = req.body.date;
  var key = req.body.key;
  var content = req.body.content;
  
  if (!title || title.trim() == "") return res.json({message: "title can't be empty!"});
  
  if (!date || date.trim() == "") return res.json({message: "date can't be empty!"});
  
  if (!key || key.trim() == "") return res.json({message: "key can't be empty!"});
  
  if (key != config.get("key")) return res.json({message: "key don't match!"});
  
  if (!content || content.trim() == "") return res.json({message: "content can't be empty!"});
  
  title = title.trim();
  date = date.trim();
  key = key.trim();
  content = content.trim();
  
  var accessible = "public";
  if (req.body.accessible && req.body.accessible == "private") {
    accessible = "private";
  }
  
  var category = "";
  if (req.body.category && typeof req.body.category == "string" && req.body.category.trim().length) {
    category = req.body.category.trim();
  }
  
  var type = "post";
  if (req.body.type && typeof req.body.type == "string" && req.body.type == "article") {
    type = "article";
  }
  
  var d = date.match(/^(\d\d\d\d)-(\d\d)-(\d\d)\ (\d\d):(\d\d):(\d\d)$/);
  if (!d) {
    return res.json({message: "date invalid!"});
  }  
  var year = d[1];
  var month = d[2];
  var day = d[3];

  if (type == "post") {
    
    var GetId = function () {          
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
      while (fs.existsSync(tool.DATABASE + year + "/" + month + "/" + name + ".md")) {
        ind++;
        name = year + month + day + FixNumber(ind);
      }
      return name;
    };
    
    var id = GetId();
    
    var path = util.format(tool.DATABASE + "posts/%s/%s/%s.md", year, month, id);
     
    if (!fs.existsSync(util.format(tool.DATABASE + "posts/%s", year))) {
      fs.mkdirSync(util.format(tool.DATABASE + "posts/%s", year));
    }
    
    if (!fs.existsSync(util.format(tool.DATABASE + "posts/%s/%s", year, month))) {
      fs.mkdirSync(util.format(tool.DATABASE + "posts/%s/%s", year, month));
    }
    
    fs.writeFile(path, util.format("title: %s\ndate: %s\ncategory: %s\naccessible: %s\n---\n\n%s",
      title, date, category, accessible, content), {encoding: "utf-8"}, function (err) {
      if(err) {
        console.log(err);
        return res.json({message: err});
      }
      Load();
      res.json({success: "ok"});
    });
  } else {
    
    var GetId = function () {          
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
      while (fs.existsSync(tool.DATABASE + "articles/" + name + ".md")) {
        ind++;
        name = year + month + day + FixNumber(ind);
      }
      return name;
    };
    
    var id = GetId();
    var path = util.format(tool.DATABASE + "articles/%s.md", id);
    
    fs.writeFile(path, util.format("title: %s\ndate: %s\n---\n\n%s",
      title, date, category, accessible, content), {encoding: "utf-8"}, function (err) {
      if(err) {
        console.log(err);
        return res.json({message: err});
      }
      Load();
      res.json({success: "ok"});
    });
  }
}


// edit exists post or article
function EditPostHandle (req, res, callback) {
  var id = req.body.id;
  var title = req.body.title;
  var date = req.body.date;
  var key = req.body.key;
  var content = req.body.content;
  
  if (!id || id.trim() == "") return res.json({message: "invalid id"});
  
  if (!title || title.trim() == "") return res.json({message: "invalid title"});
  
  if (!date || date.trim() == "") return res.json({message: "invalid date"});
  
  if (!key || key.trim() == "") return res.json({message: "invalid key"});
  
  if (key != config.get("key")) return res.json({message: "key don't match"});
  
  if (!content || content.trim() == "") return res.json({message: "invalid content"});
  
  id = id.trim();
  title = title.trim();
  date = date.trim();
  key = key.trim();
  content = content.trim();
  
  var accessible = "public";
  if (req.body.accessible && req.body.accessible == "private") {
    accessible = "private";
  }
  
  var category = "";
  if (req.body.category && typeof req.body.category == "string" && req.body.category.trim().length) {
    category = req.body.category.trim();
  }
  
  if (!date.match(/^(\d\d\d\d)-(\d\d)-(\d\d)\ (\d\d):(\d\d):(\d\d)$/)) {
    return res.json({message: "invalid date format"});
  }
  
  var old = Cache.Index[id];
  if (!old) return res.json({message: "not found"});
  
  var path = tool.DATABASE + old.dir + "/" + id + ".md";
  
  if (old.type == "post") {
    fs.writeFile(path, util.format("title: %s\ndate: %s\nedit: %s\ncategory: %s\naccessible: %s\n---\n\n%s",
      title, old.date, date, category, accessible, content), {encoding: "utf-8"}, function (err) {
      if(err) {
        console.log(err);
        return res.json({message: err});
      }
      Load();
      res.json({success: "ok"});
    });
  } else if (old.type == "article") {
    fs.writeFile(path, util.format("title: %s\ndate: %s\nedit: %s\n---\n\n%s",
      title, old.date, date, content), {encoding: "utf-8"}, function (err) {
      if(err) {
        console.log(err);
        return res.json({message: err});
      }
      Load();
      res.json({success: "ok"});
    });
  }
  
}


// delete exists post or article
function DeletePostHandle (req, res, callback) {
  var id = req.body.id;
  var key = req.body.key;
  
  if (!id || id.trim() == "") return res.json({message: "invalid id"});
  
  if (!key || key.trim() == "") return res.json({message: "invalid key"});

  if (key != config.get("key")) return res.json({message: "key don't match"});
  
  id = id.trim();
  key = key.trim();
  
  var old = Cache.Index[id];
  if (!old) return res.json({message: "not found"});
  
  var path = tool.DATABASE + old.dir + "/" + id + ".md";
  
  fs.unlink(path, function (err) {
    if(err) {
      console.log(err);
      return res.json({message: err});
    }
    Load();
    res.json({success: "ok"});
  });
}


// return list of page
function GetPageHandle (req, res) {
  var page = parseInt(req.body.page);
  
  if (isNaN(page) || page < 0) return res.json({message: "invalid arguments"});
  
  var private_mode = false;
  if (req.body.key && req.body.key == config.get("key")) {
      private_mode = true;
  }
  
  var list = Cache.Posts;
  
  if (private_mode == false) {
    list = list.filter(function (item) {
      if (item.accessible != "private") return true;
      return false;
    });
  }
  
  if (req.body.category && typeof req.body.category == "string" && req.body.category.length) {
    list = list.filter(function (item) {
      if (item.category == req.body.category) return true;
      return false;
    });
  }
  
  if (req.body.archive && typeof req.body.archive == "string" && req.body.archive.length == 6) {
    list = list.filter(function (item) {
      if (item.archive == req.body.archive) return true;
      return false;
    });
  }
  
  if (req.body.search && typeof req.body.search == "string" && req.body.search.length) {
    var fkw = req.body.search; // keywords
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
    return res.json({message: "out of range"});
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
  
  return res.json(result);
}


// return some date to client, include articles, categories, archives, config
function GetInfoHandle (req, res) {
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
  
  return res.json(result);
}


// return content of post/article
function GetContentHandle (req, res) {
  var id = req.body.id;
  
  var old = Cache.Index[id];
  if (!old) return res.json({message: "not found"});
  
  res.json(old);
}



Load();

exports.GetInfoHandle = GetInfoHandle;
exports.GetPageHandle = GetPageHandle;
exports.CreatePostHandle = CreatePostHandle;
exports.EditPostHandle = EditPostHandle;
exports.DeletePostHandle = DeletePostHandle;
exports.GetContentHandle = GetContentHandle;
