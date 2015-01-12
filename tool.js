var fs = require("fs");
var util = require("util");

var config = require("./config")


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
  
  function Good(str) {
    res.write(util.format("<script>parent.callback(\"success\", \"%s\")</script>", str));
    res.end();
  }
  
  function Wrong(str) {
    res.write(util.format("<script>parent.callback(\"error\", \"%s\")</script>", str));
    res.end();
    fs.unlink(file.path, function (err) {
      if (err) throw err;      
    });
  }
    
  if (!key || key.trim() == "") {
    Wrong("key can't be empty!");
    return;
  }
  
  if (!date || date.trim() == "") {
    Wrong("date can't be empty!");
    return;
  }
  
  if (!name || name.trim() == "") {
    Wrong("file name error!");
    return;
  }
  
  key = key.trim();
  date = date.trim();
  name = name.trim();

  var d = date.match(/^(\d\d\d\d)-(\d\d)-(\d\d)\ (\d\d):(\d\d):(\d\d)$/);
  if (!d) {
    Wrong("data invalid!");
    return;
  }
  
  var year = d[1];
  var month = d[2];
  
  if (key != config.get("key")) {
    Wrong("key don't match!");
    return;
  }
  
  var filename = GetValidName(name);
  if (filename == "") {
    Wrong("file name invalid!");
    return;
  }
  
  var path = util.format(__dirname + "/database/uploads/%s/%s/%s", year, month, filename);
  
  if (fs.existsSync(path)) {
    Wrong("file conflict!");
    return;
  }
  
  if (!fs.existsSync(__dirname + "/database/uploads")) {
    fs.mkdirSync(__dirname + "/database/uploads");
  }
  
  if (!fs.existsSync(util.format(__dirname + "/database/uploads/%s", year))) {
    fs.mkdirSync(util.format(__dirname + "/database/uploads/%s", year));
  }
  
  if (!fs.existsSync(util.format(__dirname + "/database/uploads/%s/%s", year, month))) {
    fs.mkdirSync(util.format(__dirname + "/database/uploads/%s/%s", year, month));
  }
  
  fs.rename(file.path, path, function (err) {
    if (err) throw err;
    var url = path.match(/\/uploads\/.+$/)[0];
    Good(url);
  });
}

exports.upload = Upload;
exports.password = function (req, res) {
  var key = req.body.key;
  var nkey = req.body.nkey;
  
  if (key != config.get("key")) {
    return res.json({message: "invalid key"});
  }
  
  if (nkey.trim().length <= 0) {
    return res.json({message: "invalid new key"});
  }
  
  config.set("key", nkey);
  res.json({ok: "success"});
};


