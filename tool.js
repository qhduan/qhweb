var fs = require("fs");
var util = require("util");

var config = JSON.parse(fs.readFileSync(__dirname + "/config.json", {encoding: "utf-8"}));

fs.watch(__dirname + "/config.json", { persistent: true }, function () {
	config = JSON.parse(fs.readFileSync(__dirname + "/config.json", {encoding: "utf-8"}));
	console.log("config reloaded");
});

// Convert a name to a valid filename
function GetValidName (oname) {
  oname = oname.trim();
  var invalid = ["\\","/",":","*","?","\"","<",">", "|", //http://support.microsoft.com/kb/177506
    "\n", "\r", "\t", "\0", "\f", "`"];
  for (var i in invalid) {
    var c = invalid[i];
    while(oname.indexOf(c) != -1) {
      oname = oname.replace(c, "");
    }
  }
  while(oname.indexOf(" ") != -1) {
    oname = oname.replace(" ", "_");
  }
  return oname;
}

function Upload(req, res) {
  var key = req.body.key;
  var date = req.body.date;
  var file = req.files.file;
  var name = file.originalFilename;
    
  if (!key || key.trim() == "") {
    res.json({info: "key can't be empty!"});
    fs.unlink(file.path, function (err) {
    if(err) throw err;
  });
    return;
  }
  
  if (!date || date.trim() == "") {
    res.json({info: "date can't be empty!"});
    fs.unlink(file.path, function (err) {
    if(err) throw err;
  });
    return;
  }
  
  if (!name || name.trim() == "") {
    res.json({info: "name can't be empty!"});
    fs.unlink(file.path, function (err) {
    if(err) throw err;
  });
    return;
  }
  
  key = key.trim();
  date = date.trim();
  name = name.trim();

  var d = date.match(/^(\d\d\d\d)-(\d\d)-(\d\d)\ (\d\d):(\d\d):(\d\d)$/);
  if (!d) {
    res.json({info: "date invalid!"});
    fs.unlink(file.path, function (err) {
    if(err) throw err;
  });
    return;
  }
  
  var year = d[1];
  var month = d[2];
  
  if (key != config.key) {
    res.json({info: "key don't match!"});
    fs.unlink(file.path, function (err) {
    if(err) throw err;
  });
    return;
  }
  
  var filename = GetValidName(name);
  if (filename == "") {
  res.json({info: "filename invalid!"});
    fs.unlink(file.path, function (err) {
    if(err) throw err;
  });
  return;
  }
  
  var path = util.format(__dirname + "/public/uploads/%s/%s/%s", year, month, filename);
  
  if (fs.existsSync(path)) {
    res.json({info: "file conflict!"});
      fs.unlink(file.path, function (err) {
      if(err) throw err;
    });
    return;
  }
  
  if (!fs.existsSync(__dirname + "/public/uploads")) {
    fs.mkdirSync(__dirname + "/public/uploads");
  }
  
  if (!fs.existsSync(util.format(__dirname + "/public/uploads/%s", year))) {
    fs.mkdirSync(util.format(__dirname + "/public/uploads/%s", year));
  }
  
  if (!fs.existsSync(util.format(__dirname + "/public/uploads/%s/%s", year, month))) {
    fs.mkdirSync(util.format(__dirname + "/public/uploads/%s/%s", year, month));
  }
  
  fs.rename(file.path, path, function (err) {
    if (err) throw err;
    res.json({info: "ok", name: file.originalFilename, path: path.match(/\/uploads\/[^\0]+$/)[0]});
  });
}


exports.config = config;
exports.upload = Upload;
exports.GetValidName = GetValidName;
