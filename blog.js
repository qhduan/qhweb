"use strict";

var fs = require("fs");
var express = require("express");
var bodyParser = require("body-parser");
var multipart = require('connect-multiparty');
var compression = require('compression');

var config = require("./config");
var tool = require("./tool");
var post = require("./post");

var app = express();
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.use(compression());

app.post('/upload', multipart(), tool.UploadHandle);

function base64decode(str) {
  var b = new Buffer(str, "base64");
  return b.toString();
}

function base64encode(str) {
  var b = new Buffer(str, "utf8");
  return b.toString("base64");
}

function encode (object) {
  var str = JSON.stringify(object);
  var b64 = base64encode(str);

  // fake encrypt
  var ret = "";
  for (var i = 0, len = b64.length; i < len; i += 4) {
    ret += b64[i+3];
    ret += b64[i+2];
    ret += b64[i+1];
    ret += b64[i];
  }
  return ret;
}

function decode (str) {
  var b64 = str;

  // fake decrypt
  var ret = "";
  for (var i = 0, len = b64.length; i < len; i += 4) {
    ret += b64[i+3];
    ret += b64[i+2];
    ret += b64[i+1];
    ret += b64[i];
  }
  var s = base64decode(ret);
  var object = null;
  try {
    object = JSON.parse(s);
  } catch (e) {
    return null;
  }
  return object;
}

app.post("/blog", function (req, res) {
  var clientData = req.body;

  if (typeof clientData == "object" && clientData.content) {
    var data = decode(clientData.content);

    if (!data) {
      res.json({ message: "Invalid data parse" });
      res.end();
      return;
    }

    var callback = function (json) {
      try {
        var str = encode(json);
        res.json({ content: str });
        res.end();
      } catch (e) {
        console.log(data, json);
        throw e;
      }
    };

    if (data && data.method) {
      switch (data.method) {
        case "info":
          post.GetInfoHandle(data, callback);
          break;
        case "list":
          post.GetPageHandle(data, callback);
          break;
        case "get":
          post.GetContentHandle(data, callback);
          break;
        case "create":
          post.CreatePostHandle(data, callback);
          break;
        case "save":
          post.EditPostHandle(data, callback);
          break;
        case "remove":
          post.DeletePostHandle(data, callback);
          break;
        case "verify":
          tool.VerifyPasswordHandle(data, callback);
          break;
        case "config":
          tool.SetConfigHandle(data, callback);
          break;
        case "password":
          tool.ChagnePasswordHandle(data, callback);
          break;
        default:
          res.json({ message: "Invalid method" });
          res.end();
      }
    } else {
      res.json({ message: "Invalid data" });
      res.end();
    }
  } else {
    res.json({ message: "Invalid access" });
    res.end();
    return;
  }

});

app.use(express.static(__dirname + "/public"));
app.use(express.static(__dirname + "/database"));

app.get("*", function (req, res) {
  // 这部分要在所有的其他项目之下，最后处理
  res.redirect("/#" + req.path);
});

var PORT = config.get("port");
app.listen(PORT, function () {
  console.log("QHWeb is running on port", PORT);
});
