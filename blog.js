"use strict";

var fs = require("fs");
var express = require("express");
var bodyParser = require("body-parser");
var multipart = require('connect-multiparty');
var compression = require('compression');

var config = require("./config");
var tool = require("./tool");
var post = require("./post");
var encrypt = require("./encrypt");

var app = express();
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.use(compression());

app.get("/publicKey", function (req, res) {
  res.json({ publicKey: encrypt.publicKey });
  res.end();
});

app.post('/upload', multipart(), tool.UploadHandle);

app.post("/blog", function (req, res) {
  var clientData = req.body;

  if (typeof clientData == "object" && clientData.content) {
    var data = encrypt.decrypt(clientData.content);

    if (!data || !clientData.clientPublicKey || !encrypt.encrypt("test", clientData.clientPublicKey)) {
      console.error(clientData);
      res.json({ message: "Invalid public key" });
      return;
    }

    var callback = function (json) {
      try {
        var str = JSON.stringify(json);
        res.json({ content: encrypt.encrypt(str, clientData.clientPublicKey) });
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
