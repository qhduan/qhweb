"use strict";

var fs = require("fs");
var util = require("util");

var config = require("./config");


var DATABASE = __dirname + "/database/";

function ExistsOrCreate (dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir);
}

ExistsOrCreate(DATABASE); // 判断根目录下的database目录是否存在，不存在则创建
ExistsOrCreate(DATABASE + "posts"); // 帖子目录
ExistsOrCreate(DATABASE + "articles"); // 文章目录
ExistsOrCreate(DATABASE + "uploads"); // 附件目录

// convert a name to a valid filename
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


// upload file
function UploadHandle(req, res) {
  var key = req.body.key;
  var date = req.body.date;
  var file = req.files.file;
  var name = file.originalFilename;

  var Good = function (str) {
    res.write(util.format("<script>parent.callback(\"success\", \"%s\")</script>", str));
    res.end();
  }

  var Wrong = function (str) {
    res.write(util.format("<script>parent.callback(\"error\", \"%s\")</script>", str));
    res.end();
    fs.unlink(file.path, function (err) {
      if (err) throw err;
    });
  }

  if (!key || key.trim() == "") return Wrong("key can't be empty!");
  if (key != config.get("key")) return Wrong("key don't match!");
  if (!date || date.trim() == "") return Wrong("date can't be empty!");
  if (!name || name.trim() == "") return Wrong("file name error!");

  key = key.trim();
  date = date.trim();
  name = name.trim();

  var d = date.match(/^(\d\d\d\d)-(\d\d)-(\d\d)\ (\d\d):(\d\d):(\d\d)$/);
  if (!d) return Wrong("date invalid!");
  var year = d[1];
  var month = d[2];

  var filename = GetValidName(name);
  if (filename == "") return Wrong("file name invalid!");

  var path = util.format(__dirname + "/database/uploads/%s/%s/%s", year, month, filename);

  if (fs.existsSync(path)) {
    Wrong("file conflict!");
    return;
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


// change password in config
function ChagnePasswordHandle (data, callback) {
  var key = data.key;
  var nkey = data.nkey;

  if (key != config.get("key")) {
    return callback({message: "invalid key"});
  }

  if (nkey.trim().length <= 0) {
    return callback({message: "invalid new key"});
  }

  config.set("key", nkey);
  callback({ok: "success"});
};


// update config
function SetConfigHandle (data, callback) {
  var siteName = data.siteName;
  var siteSubtitle = data.siteSubtitle;
  var url = data.url;
  var itemOfPage = data.itemOfPage;
  var key = data.key;

  if (key != config.get("key")) {
    return callback({message: "invalid key"});
  }

  itemOfPage = parseInt(itemOfPage);

  if (isNaN(itemOfPage) || itemOfPage <= 0) {
    return callback({message: "invalid item of page"});
  }

  if (siteName) config.set("siteName", siteName);

  if (siteSubtitle) config.set("siteSubtitle", siteSubtitle);

  if (url) config.set("url", url);

  if (itemOfPage) config.set("itemOfPage", itemOfPage);

  callback({ok: "success"});

}


// verify password in config
function VerifyPasswordHandle (data, callback) {
  var key = data.key;

  if (!key || key.trim() == "") {
    return callback({message: "Key can't be empty!"});
  }

  if (key != config.get("key")) {
    return callback({message: "Key doesn't match!"});
  }

  return callback({ok: "success"});
}

exports.UploadHandle = UploadHandle;
exports.ChagnePasswordHandle = ChagnePasswordHandle;
exports.VerifyPasswordHandle = VerifyPasswordHandle;
exports.SetConfigHandle = SetConfigHandle;
exports.DATABASE = DATABASE;
