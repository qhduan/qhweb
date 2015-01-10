var fs = require("fs");
var util = require("util");
var config = require("config")
var uuid = require("node-uuid")
var tool = require("./tool");

var Posts = [];
var Articles = [];

var database = __dirname + "/database/";

function LoadMarkdown (dir) {
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
					elem.edit = header.match(/edit:\ ([^\0\n]+)\n/);
					if (!elem.title || !elem.date) {
					  console.log(d,fn);
					  throw "file can't be parsed";
					}
          
          if (elem.edit) {
            elem.edit = elem.edit[1];
          } else {
            elem.edit = "";
          }
					elem.title = elem.title[1];
					elem.date = elem.date[1];
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
  
  if (!content || content.trim() == "") {
    return res.json({message: "content can't be empty!"});
  }
  
  title = title.trim();
  date = date.trim();
  key = key.trim();
  content = content.trim();
  
  for (var i = 0; i < Posts.length; i++) {
    if (Posts[i].title == title)
      return res.json({message: "title conflict post"});
  }
  
  for (var i = 0; i < Articles.length; i++) {
    if (Articles[i].title == title)
      return res.json({message: "title conflict article"});
  }

  var d = date.match(/^(\d\d\d\d)-(\d\d)-(\d\d)\ (\d\d):(\d\d):(\d\d)$/);
  if (!d) {
    return res.json({message: "date invalid!"});
  }
  
  var year = d[1];
  var month = d[2];
  
  if (key != config.get("qhweb.key")) {
    return res.json({message: "key don't match!"});
  }
  
  var id = uuid.v1();
  
  var path = util.format(__dirname + "/database/posts/%s/%s/%s.md", year, month, id);
   
  if (!fs.existsSync(util.format(__dirname + "/database/posts/%s", year))) {
    fs.mkdirSync(util.format(__dirname + "/database/posts/%s", year));
  }
  
  if (!fs.existsSync(util.format(__dirname + "/database/posts/%s/%s", year, month))) {
    fs.mkdirSync(util.format(__dirname + "/database/posts/%s/%s", year, month));
  }
  
  fs.writeFile(path, util.format("title: %s\ndate: %s\n---\n\n%s", title, date, content), {encoding: "utf-8"}, function (err) {
    if(err) throw err;
    Posts.unshift({
      id: id,
      title: title,
      dir: "posts/" + year + "/" + month,
      content: content,
      date: date
    });
    res.json({success: "ok"});
  });
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
  
  if (!content || content.trim() == "") {
    return res.json({message: "content can't be empty!"});
  }
  
  id = id.trim();
  title = title.trim();
  date = date.trim();
  key = key.trim();
  content = content.trim();
  
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
  
  if (key != config.get("qhweb.key")) {
    return res.json({message: "key don't match!"});
  }
  
  var path = database + old.dir + "/" + id + ".md";
  
  fs.writeFile(path, util.format("title: %s\ndate: %s\nedit: %s\n---\n\n%s", title, old.date, date, content), {encoding: "utf-8"}, function (err) {
    if(err) throw err;
    if (type == "post") {
      Posts[pos] = {
        id: id,
        title: title,
        dir: old.dir,
        content: content,
        date: old.date,
        edit: date
      };
    } else if (type == "article") {
      Articles[pos] = {
        id: id,
        title: title,
        dir: old.dir,
        content: content,
        date: old.date,
        edit: date
      };
    }
    res.json({success: "ok"});
  });
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

  if (key != config.get("qhweb.key")) {
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
  var start = parseInt(req.param("start"));
  var number = parseInt(req.param("number"));
  
  if (isNaN(start) || isNaN(number) || start < 0 || number <= 0) {
    return res.json({message: "invalid arguments"});
  }  
  
  var result = {};
  result.posts = Posts.slice(start, start + number);
  result.count = Posts.length;
  return res.json(result);
}

function GetArticles (req, res) {
  var result= {};
  result.articles = Articles;
  result.count = Articles.length;
  return res.json(result);
}

function GetContent (req, res) {
  var id = req.param("id");
  
  if (typeof id != "string" || id.trim().length <= 0) {
    return res.json({message: "invalid arguments"});
  }
  
  for (var i = 0; i < Articles.length; i++) {
    if (id == Articles[i].id)
      return res.json(Articles[i]);
  }
  
  for (var i = 0; i < Posts.length; i++) {
    if (id == Posts[i].id)
      return res.json(Posts[i]);
  }
  
  return res.json({message: "not found"});
}

Posts = LoadMarkdown("posts");
Articles = LoadMarkdown("articles");

exports.article = GetArticles;
exports.page = GetPage;
exports.create = CreatePost;
exports.edit = EditPost;
exports.del = DeletePost;
exports.content = GetContent;
