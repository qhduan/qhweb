var fs = require("fs");
var util = require("util");
var tool = require("./tool");

var CurrentList = [];
function LoadPosts () {
	var dir = __dirname + "/public/posts";
	if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
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
					var header = data.substr(0, data.indexOf("---"));
					var elem = {};
					elem.path = f.match(/\/public([^\0]+)$/);
					elem.title = header.match(/title:\ ([^\0\n]+)\n/);
					elem.date = header.match(/date:\ ([^\0\n]+)\n/);
					if (!elem.path || !elem.title || !elem.date) {
					  console.log(elem);
					  throw "A post can't be parsed";
					}
					elem.path = elem.path[1];
					elem.title = elem.title[1];
					elem.date = elem.date[1];
					result.push(elem)
				}
			}
		}
		result.sort(function (a, b) {
		  a = new Date(a.date);
		  b = new Date(b.date);
		  return b.getTime() - a.getTime();
		});
		CurrentList = result;
	} else {
		throw "Fail to load posts";
	}
}


function CreatePost (req, res, callback) {
  var title = req.body.title;
  var date = req.body.date;
  var key = req.body.key;
  var content = req.body.content;
  
  if (!title || title.trim() == "") {
    res.json({info: "title can't be empty!"});
    return;
  }
  
  if (!date || date.trim() == "") {
    res.json({info: "date can't be empty!"});
    return;
  }
  
  if (!key || key.trim() == "") {
    res.json({info: "key can't be empty!"});
    return;
  }
  
  if (!content || content.trim() == "") {
    res.json({info: "content can't be empty!"});
    return;
  }
  
  title = title.trim();
  date = date.trim();
  key = key.trim();
  content = content.trim();
  
  if (CurrentList.indexOf(title) != -1) {
    res.json({info: "title conflict"});
    return;
  }

  var d = date.match(/^(\d\d\d\d)-(\d\d)-(\d\d)\ (\d\d):(\d\d):(\d\d)$/);
  if (!d) {
    res.json({info: "date invalid!"});
    return;
  }
  
  var year = d[1];
  var month = d[2];
  
  if (key != tool.config.key) {
    res.json({info: "key don't match!"});
    return;
  }
  
  var filename = tool.GetValidName(title);
  if (filename == "") {
    res.json({info: "filename invalid!"});
    return;
  }
  
  var path = util.format(__dirname + "/public/posts/%s/%s/%s.md", year, month, filename);
  
  if (fs.existsSync(path)) {
    res.json({info: "file conflict!"});
    return;
  }
  
  if (!fs.existsSync(util.format(__dirname + "/public/posts/%s", year))) {
    fs.mkdirSync(util.format(__dirname + "/public/posts/%s", year));
  }
  
  if (!fs.existsSync(util.format(__dirname + "/public/posts/%s/%s", year, month))) {
    fs.mkdirSync(util.format(__dirname + "/public/posts/%s/%s", year, month));
  }
  
  fs.writeFile(path, util.format("title: %s\ndate: %s\n---\n\n%s", title, date, content), {encoding: "utf-8"}, function (err) {
    if(err) throw err;
    res.json({info: "ok"});
    if (callback) callback();
  });
}


function GetPage (num) {
  var list = CurrentList;
  if (list.length == 0)
    return [];
  
  var max_page = Math.ceil(list.length / tool.config.post_per_page);
  if (num < 0 || num >= max_page)
    return undefined;
  
  var begin = num * tool.config.post_per_page;
  var end = begin + tool.config.post_per_page;
  end = Math.min(end, list.length);
  return list.slice(begin, end);
}


function GenerateJson () {
	var path = __dirname + "/public/json";
  
	if (fs.existsSync(path) == false)
		fs.mkdirSync(path);
		
	var files = fs.readdirSync(path);
	if (files.length > 0) {
		for (var i in files) {
			fs.unlinkSync(path + "/" + files[i]);
		}
	}
	
	// main.json
	var data = {};
	data.name = tool.config.site_subtitle;
	data.url = tool.config.url;
	data.maxpage = Math.ceil(CurrentList.length / tool.config.post_per_page);
	fs.writeFileSync(path + "/main.json", JSON.stringify(data), {encoding: "utf-8"});
	
	for (var i = 0; i < data.maxpage; i++) {
		fs.writeFileSync(path + "/page" + i + ".json", JSON.stringify(GetPage(i)), {encoding: "utf-8"});
	}
	
	console.log("Generate", data.maxpage, "+ 1 json");
}

exports.create = CreatePost;
exports.generate = GenerateJson;
exports.load = LoadPosts;
