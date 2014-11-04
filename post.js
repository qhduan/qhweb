var fs = require("fs");
var util = require("util");
var config = require("config")
var tool = require("./tool");

var Posts = [];
var Articles = [];

function LoadMarkdown (dir) {
	//var dir = __dirname + "/database/posts";
	if (fs.statSync(dir).isDirectory()) {
		var result = [];
		var list = [];
		list.push(dir);
		while (list.length > 0) {
			var d = list.pop();
			var l = fs.readdirSync(d);
			for (var i in l) {
				var f = l[i];
				f = d + "/" + f;
				if (fs.statSync(f).isDirectory()) {
					list.push(f);
				} else if (fs.statSync(f).isFile() && f.match(/.md$/)) {
					var data = fs.readFileSync(f, {encoding: "utf-8"});
          
          var s = "---";
          var pos = data.indexOf(s);
          
					if (pos == -1) {
					  console.log(f);
					  throw "file have not splitor";
					}
          
					var header = data.substr(0, pos);
          var content = data.substr(pos + s.length).trim();
          
					var elem = {};
					elem.path = f.match(/\/database([^\0]+)$/);
					elem.title = header.match(/title:\ ([^\0\n]+)\n/);
					elem.date = header.match(/date:\ ([^\0\n]+)\n/);
					if (!elem.path || !elem.title || !elem.date) {
					  console.log(f);
					  throw "file can't be parsed";
					}
					elem.path = elem.path[1];
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
  
  var filename = tool.GetValidName(title);
  if (filename == "") {
    return res.json({message: "filename invalid!"});
  }
  
  var path = util.format(__dirname + "/database/posts/%s/%s/%s.md", year, month, filename);
  
  if (fs.existsSync(path)) {
    return res.json({message: "file conflict!"});
  }
  
  if (!fs.existsSync(util.format(__dirname + "/database/posts/%s", year))) {
    fs.mkdirSync(util.format(__dirname + "/database/posts/%s", year));
  }
  
  if (!fs.existsSync(util.format(__dirname + "/database/posts/%s/%s", year, month))) {
    fs.mkdirSync(util.format(__dirname + "/database/posts/%s/%s", year, month));
  }
  
  fs.writeFile(path, util.format("title: %s\ndate: %s\n---\n\n%s", title, date, content), {encoding: "utf-8"}, function (err) {
    if(err) throw err;
    Posts.unshift({
      title: title,
      path: path,
      content: content,
      date: date
    });
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
  var title = req.param("title");
  var type = req.param("type");
  
  if (typeof title != "string" || title.trim().length <= 0 || (type != "post" && type != "article")) {
    return res.json({message: "invalid arguments"});
  }
  
  if (type == "post") {
    for (var i = 0; i < Posts.length; i++) {
      if (title == Posts[i].title)
        return res.json(Posts[i]);
    }
    return res.json({message: "post not found"});
  } else { // type == "article"
    for (var i = 0; i < Articles.length; i++) {
      if (title == Articles[i].title)
        return res.json(Articles[i]);
    }
    return res.json({message: "article not found"});
  }
}

Posts = LoadMarkdown(__dirname + "/database/posts");
Articles = LoadMarkdown(__dirname + "/database/articles");

exports.article = GetArticles;
exports.page = GetPage;
exports.create = CreatePost;
exports.content = GetContent;
