var fs = require("fs");
var util = require("util");
var uuid = require("node-uuid")

var config = require("./config")
var tool = require("./tool");

var Cache = {}; // 保存各种缓存

var DATABASE = __dirname + "/database/";

function ExistsOrCreate (dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }
}
ExistsOrCreate(DATABASE); // 判断根目录下的database目录是否存在，不存在则创建
ExistsOrCreate(DATABASE + "posts"); // 帖子目录
ExistsOrCreate(DATABASE + "articles"); // 文章目录
ExistsOrCreate(DATABASE + "upload"); // 附件目录


function LoadMarkdown (dir, post) {
  
	if (fs.statSync(DATABASE + dir).isDirectory()) {
		var result = [];
		var list = [];
		list.push(dir);
		while (list.length > 0) {
			var d = list.pop();
			var l = fs.readdirSync(DATABASE + d);
			for (var i in l) {
				var fn = l[i];
				var fp = d + "/" + fn;
				if (fs.statSync(DATABASE + fp).isDirectory()) {
					list.push(fp);
				} else if (fs.statSync(DATABASE + fp).isFile() && fn.match(/.md$/)) {
          
          var fid = fn.substr(0, fn.length - 3); // cut off ".md"
          
					var data = fs.readFileSync(DATABASE + fp, {encoding: "utf-8"});
          
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
          
          if (post) {          
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

function Load () {
  Cache = {
    Posts: [],
    Articles: [],
    Categories: {},
    Archives: {},
  };
  
  Cache.Posts = LoadMarkdown("posts", true);
  Cache.Articles = LoadMarkdown("articles");
  
  Cache.Posts.forEach(function (item) {
    if (item.category && item.category.length) {
      if (Cache.Categories.hasOwnProperty(item.category)) {
        Cache.Categories[item.category]++;
      } else {
        Cache.Categories[item.category] = 1;
      }
    }
    if (item.archive && item.archive.length) {
      if (Cache.Archives.hasOwnProperty(item.archive)) {
        Cache.Archives[item.archive]++;
      } else {
        Cache.Archives[item.archive] = 1;
      }
    }
  });
  
  var categories = [];
  var archives = [];
  
  for (var i in Cache.Categories) {
    categories.push({name: i, value: Cache.Categories[i]});
  }
  
  for (var i in Cache.Archives) {
    archives.push({name: i, value: Cache.Archives[i]});
  }
  
  if (categories.length > 1) {
    categories.sort(function (a, b) {
      if (a.value > b.value)
        return 1;
      if (a.value < b.value)
        return -1;
      return 0;
    });
    categories.reverse();
  }
  
  if (archives.length > 1) {
    archives.sort(function (a, b) {
      if (a > b)
        return 1;
      if (a < b)
        return -1;
      return 0;
    });
    archives.reverse();
  }
  
  Cache.Categories = categories;
  Cache.Archives = archives;
  
  var ret = ["Loaded",
    (new Date().toLocaleString()),
    ":",
    Cache.Posts.length, "posts,",
    Cache.Articles.length, "articles,",
    Cache.Archives.length, "archives,",
    Cache.Categories.length, "categories"];
  
  ret = ret.join(" ");
  console.log(ret);
  return ret;
}

function Reload (req, res) {
  res.json({ok: Load()});
}

function Find (id) {
  for (var i = 0; i < Cache.Posts.length; i++) {
    if (Cache.Posts[i].id == id) {
      return {
        ind: i,
        type: "post",
        obj: Cache.Posts[i]
      };
    }
  }

  for (var i = 0; i < Cache.Articles.length; i++) {
    if (Cache.Articles[i].id == id) {
      return {
        ind: i,
        type: "article",
        obj: Cache.Articles[i]
      };
    }
  }
  
  return null;
}

function CreatePost (req, res) {
  var title = req.body.title;
  var date = req.body.date;
  var key = req.body.key;
  var content = req.body.content;
  
  if (!title || title.trim() == "") {
    return res.json({message: "title can't be empty!"});
  }
  
  if (!date || date.trim() == "") {
    return res.json({message: "date can't be empty!"});
  }
  
  if (!key || key.trim() == "") {
    return res.json({message: "key can't be empty!"});
  }
  
  if (key != config.get("key")) {
    return res.json({message: "key don't match!"});
  }
  
  if (!content || content.trim() == "") {
    return res.json({message: "content can't be empty!"});
  }
  
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

  if (type == "post") {
    var d = date.match(/^(\d\d\d\d)-(\d\d)-(\d\d)\ (\d\d):(\d\d):(\d\d)$/);
    if (!d) {
      return res.json({message: "date invalid!"});
    }  
    var year = d[1];
    var month = d[2];
    
    var id = uuid.v1();
    
    var path = util.format(DATABASE + "posts/%s/%s/%s.md", year, month, id);
     
    if (!fs.existsSync(util.format(DATABASE + "posts/%s", year))) {
      fs.mkdirSync(util.format(DATABASE + "posts/%s", year));
    }
    
    if (!fs.existsSync(util.format(DATABASE + "posts/%s/%s", year, month))) {
      fs.mkdirSync(util.format(DATABASE + "posts/%s/%s", year, month));
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
    var id = uuid.v1();
    var path = util.format(DATABASE + "articles/%s.md", id);
    
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

function EditPost (req, res, callback) {
  var id = req.body.id;
  var title = req.body.title;
  var date = req.body.date;
  var key = req.body.key;
  var content = req.body.content;
  
  if (!id || id.trim() == "") {
    return res.json({message: "id can't be empty!"});
  }
  
  if (!title || title.trim() == "") {
    return res.json({message: "title can't be empty!"});
  }
  
  if (!date || date.trim() == "") {
    return res.json({message: "date can't be empty!"});
  }
  
  if (!key || key.trim() == "") {
    return res.json({message: "key can't be empty!"});
  }
  
  if (key != config.get("key")) {
    return res.json({message: "key don't match!"});
  }
  
  if (!content || content.trim() == "") {
    return res.json({message: "content can't be empty!"});
  }
  
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
    return res.json({message: "date invalid!"});
  }
  
  var old = Find(id);
  
  if (!old) {
    return res.json({message: "not found"});
  }
  
  var path = DATABASE + old.obj.dir + "/" + id + ".md";
  
  if (old.type == "post") {
    fs.writeFile(path, util.format("title: %s\ndate: %s\nedit: %s\ncategory: %s\naccessible: %s\n---\n\n%s",
      title, old.obj.date, date, category, accessible, content), {encoding: "utf-8"}, function (err) {
      if(err) {
        console.log(err);
        return res.json({message: err});
      }
      Load();
      res.json({success: "ok"});
    });
  } else if (old.type == "article") {
    fs.writeFile(path, util.format("title: %s\ndate: %s\nedit: %s\n---\n\n%s",
      title, old.obj.date, date, content), {encoding: "utf-8"}, function (err) {
      if(err) {
        console.log(err);
        return res.json({message: err});
      }
      Load();
      res.json({success: "ok"});
    });
  }
  
}



function DeletePost (req, res, callback) {
  var id = req.body.id;
  var key = req.body.key;
  
  if (!id || id.trim() == "") {
    return res.json({message: "id can't be empty!"});
  }
  
  if (!key || key.trim() == "") {
    return res.json({message: "key can't be empty!"});
  }

  if (key != config.get("key")) {
    return res.json({message: "key don't match!"});
  }
  
  id = id.trim();
  key = key.trim();
  
  var old = Find(id);
  
  if (!old) {
    return res.json({message: "not found"});
  }
  
  var path = DATABASE + old.obj.dir + "/" + id + ".md";
  
  fs.unlink(path, function (err) {
    if(err) {
      console.log(err);
      return res.json({message: err});
    }
    Load();
    res.json({success: "ok"});
  });
}



function GetPage (req, res) {
  var page = parseInt(req.body.page);
  
  if (isNaN(page) || page < 0) {
    return res.json({message: "invalid arguments"});
  }
  
  var private = false;
  
  if (req.body.key) {
    if (req.body.key == config.get("key")) {
      private = true;
    }
  }
  
  var result = {
    posts: []
  };
  
  var list = Cache.Posts;
  
  if (private == false) {
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
    var kw = req.body.search; // keywords
    kw = kw.split(/\s/);
    kw = kw.filter(function (item) {
      if (item.match(/^[a-zA-Z0-9]{1}$/)) return false;
      return true;
    });
    
    if (kw.length > 0) {    
      list = list.filter(function (item) {
        item.searchScore = 0;
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
  
  result.count = list.length;
  result.itemOfPage = config.get("itemOfPage");
  
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

function GetInfo (req, res) {
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

function SetConfig (req, res) {
  var siteName = req.body.siteName;
  var siteSubtitle = req.body.siteSubtitle;
  var url = req.body.url;
  var itemOfPage = req.body.itemOfPage;
  var key = req.body.key;
  
  if (key != config.get("key")) {
    return res.json({message: "invalid key"});
  }
  
  itemOfPage = parseInt(itemOfPage);
  
  if (isNaN(itemOfPage) || itemOfPage <= 0) {
    return res.json({message: "invalid item of page"});
  }
  
  if (siteName) {
    config.set("siteName", siteName);
  }
  
  if (siteSubtitle) {
    config.set("siteSubtitle", siteSubtitle);
  }
  
  if (url) {
    config.set("url", url);
  }
  
  if (itemOfPage) {
    config.set("itemOfPage", itemOfPage);
  }
  
  res.json({ok: "success"});
  
}

function GetContent (req, res) {
  var id = req.body.id;
  
  var old = Find(id);
  
  if (!old) {
    return res.json({message: "not found"});
  }
  
  var ret = {};
  for (k in old.obj) {
    ret[k] = old.obj[k];
  }
  ret.type = old.type;
  res.json(ret);
}

Load();

exports.info = GetInfo;
exports.page = GetPage;
exports.create = CreatePost;
exports.edit = EditPost;
exports.del = DeletePost;
exports.content = GetContent;
exports.config = SetConfig;
exports.reload = Reload;
