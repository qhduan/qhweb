var fs = require("fs");
var util = require("util");
var uuid = require("node-uuid")

var config = require("./config")
var tool = require("./tool");

var Posts = [];
var Articles = [];
var Categories = [];
var CategoriesNumber = {};
var MonthArchive = [];
var MonthArchiveNumber = {};

var database = __dirname + "/database/";

function ExistsOrCreate (dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }
}
ExistsOrCreate(database);
ExistsOrCreate(database + "posts");
ExistsOrCreate(database + "articles");
ExistsOrCreate(database + "upload");


function LoadMarkdown (dir, post) {
	//var dir = __dirname + "/database/posts";
	if (fs.statSync(database + dir).isDirectory()) {
		var result = [];
		var list = [];
		list.push(dir);
		while (list.length > 0) {
			var d = list.pop();
			var l = fs.readdirSync(database + d);
			for (var i in l) {
				var fn = l[i];
				var fp = d + "/" + fn;
				if (fs.statSync(database + fp).isDirectory()) {
					list.push(fp);
				} else if (fs.statSync(database + fp).isFile() && fn.match(/.md$/)) {
          
          var fid = fn.substr(0, fn.length - 3); // cut off ".md"
          
					var data = fs.readFileSync(database + fp, {encoding: "utf-8"});
          
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
            if (MonthArchiveNumber.hasOwnProperty(elem.archive)) {
              MonthArchiveNumber[elem.archive] = MonthArchiveNumber[elem.archive] + 1;
            } else {
              MonthArchiveNumber[elem.archive] = 1;
            }
            
            if (MonthArchive.indexOf(elem.archive) == -1) {
              MonthArchive.push(elem.archive);
            }
          
            elem.accessible = header.match(/accessible:\ ([^\0\n]+)\n/);
            if (elem.accessible) {
              elem.accessible = elem.accessible[1];
            } else {
              elem.accessible = "public";
            }
          
            elem.category = header.match(/category:\ ([^\0\n]+)\n/);
            if (elem.category) {
              elem.category = elem.category[1];
              
              if (Categories.indexOf(elem.category) == -1) {
                Categories.push(elem.category);
              }
              
              if (CategoriesNumber.hasOwnProperty(elem.category)) {
                CategoriesNumber[elem.category]++;
              } else {
                CategoriesNumber[elem.category] = 1;
              }
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
    
    MonthArchive.sort(function (a, b) {
      if (a < b) return 1;
      if (a > b) return -1;
      return 0;
    });
    
    return result;
	} else {
		throw "fail to load dir";
	}
}

function CreatePost (req, res, callback) {
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
  
  for (var i = 0; i < Posts.length; i++) {
    if (Posts[i].title == title)
      return res.json({message: "title conflict post"});
  }
  
  for (var i = 0; i < Articles.length; i++) {
    if (Articles[i].title == title)
      return res.json({message: "title conflict article"});
  }
  
  var type = "post";
  if (req.body.type && typeof req.body.category == "string" && req.body.type == "article") {
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
    
    var path = util.format(database + "posts/%s/%s/%s.md", year, month, id);
     
    if (!fs.existsSync(util.format(database + "posts/%s", year))) {
      fs.mkdirSync(util.format(database + "posts/%s", year));
    }
    
    if (!fs.existsSync(util.format(database + "posts/%s/%s", year, month))) {
      fs.mkdirSync(util.format(database + "posts/%s/%s", year, month));
    }
    
    fs.writeFile(path, util.format("title: %s\ndate: %s\ncategory: %s\naccessible: %s\n---\n\n%s",
      title, date, category, accessible, content), {encoding: "utf-8"}, function (err) {
      if(err) throw err;
      Posts.unshift({
        id: id,
        title: title,
        dir: "posts/" + year + "/" + month,
        content: content,
        date: date,
        category: category,
        accessible: accessible
      });
      
      if (category.length && Categories.indexOf(category) == -1) {
        Categories.push(category);
      }
      
      res.json({success: "ok"});
    });
  } else {
    var id = uuid.v1();
    var path = util.format(database + "articles/%s.md", id);
    
    fs.writeFile(path, util.format("title: %s\ndate: %s\n---\n\n%s",
      title, date, category, accessible, content), {encoding: "utf-8"}, function (err) {
      if(err) throw err;
      Articles.unshift({
        id: id,
        title: title,
        dir: "articles",
        content: content,
        date: date
      });
      
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
  
  var old = null;
  var type = "";
  var pos = -1;
  
  if (pos == -1) {
    type = "post";
    for (var i = 0; i < Posts.length; i++) {
      if (Posts[i].id == id) {
        old = Posts[i];
        pos = i;
      }
    }
  }
  
  if (pos == -1) {
    type = "article";
    for (var i = 0; i < Articles.length; i++) {
      if (Articles[i].id == id) {
        old = Articles[i];
        pos = i;
      }
    }
  }
  
  if (pos == -1) {
    return res.json({message: "not found"});
  }
  
  var path = database + old.dir + "/" + id + ".md";
  
  if (type == "post") {
    fs.writeFile(path, util.format("title: %s\ndate: %s\nedit: %s\ncategory: %s\naccessible: %s\n---\n\n%s",
      title, old.date, date, category, accessible, content), {encoding: "utf-8"}, function (err) {
      if(err) throw err;
      
      if (category.length && Categories.indexOf(category) == -1) {
        Categories.push(category);
      }
      Posts[pos] = {
        id: id,
        title: title,
        dir: old.dir,
        content: content,
        date: old.date,
        edit: date,
        category: category,
        accessible: accessible
      };
      res.json({success: "ok"});
    });
  } else if (type == "article") {
    fs.writeFile(path, util.format("title: %s\ndate: %s\nedit: %s\n---\n\n%s",
      title, old.date, date, content), {encoding: "utf-8"}, function (err) {
      if(err) throw err;
    Articles[pos] = {
      id: id,
      title: title,
      dir: old.dir,
      content: content,
      date: old.date,
      edit: date
    };
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
  
  id = id.trim();
  key = key.trim();
  
  var old = null;
  var type = "";
  var pos = -1;
  
  if (pos == -1) {
    type = "post";
    for (var i = 0; i < Posts.length; i++) {
      if (Posts[i].id == id) {
        old = Posts[i];
        pos = i;
      }
    }
  }
  
  if (pos == -1) {
    type = "article";
    for (var i = 0; i < Articles.length; i++) {
      if (Articles[i].id == id) {
        old = Articles[i];
        pos = i;
      }
    }
  }
  
  if (pos == -1) {
    return res.json({message: "not found"});
  }

  if (key != config.get("key")) {
    return res.json({message: "key don't match!"});
  }
  
  var path = database + old.dir + "/" + id + ".md";
  
  fs.unlink(path, function (err) {
    if(err) throw err;
    if (type == "post") {
      Posts.splice(pos, 1);
    } else if (type == "article") {
      Articles.splice(pos, 1);
    }
    res.json({success: "ok"});
  });
}



function GetPage (req, res) {
  var start = parseInt(req.body.start);
  var number = parseInt(req.body.number);
  
  if (isNaN(start) || isNaN(number) || start < 0 || number <= 0) {
    return res.json({message: "invalid arguments"});
  }
  
  if (start >= Posts.length) {
    return res.json({message: "out of range"});
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
  
  var list = Posts;
  
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
  
  result.count = list.length;
  
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
  result.articles = Articles;
  result.categories = Categories;
  result.categoriesNumber = CategoriesNumber;
  result.archives = MonthArchive;
  result.archivesNumber = MonthArchiveNumber;
  
  result.config = {};
  result.config.siteName = config.get("siteName"),
  result.config.siteSubtitle = config.get("siteSubtitle"),
  result.config.itemOfPage = config.get("itemOfPage"),
  result.config.url = config.get("url")
  
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
  
  if (typeof id != "string" || id.trim().length <= 0) {
    return res.json({message: "invalid arguments"});
  }
  
  function Result (obj, type) {
    var ret = {};
    for (k in obj) {
      ret[k] = obj[k];
    }
    ret.type = type;
    ret.categories = Categories;
    res.json(ret);
  }
  
  for (var i = 0; i < Articles.length; i++) {
    if (id == Articles[i].id) {
      return Result(Articles[i], "article");
    }
  }
  
  for (var i = 0; i < Posts.length; i++) {
    if (id == Posts[i].id) {
      return Result(Posts[i], "post");
    }
  }
  
  return res.json({message: "not found"});
}

Posts = LoadMarkdown("posts", true);
Articles = LoadMarkdown("articles");

exports.info = GetInfo;
exports.page = GetPage;
exports.create = CreatePost;
exports.edit = EditPost;
exports.del = DeletePost;
exports.content = GetContent;
exports.config = SetConfig;
