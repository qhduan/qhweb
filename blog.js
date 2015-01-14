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

app.get("/", function (req, res) {
  res.sendFile(__dirname + "/public/index.html");
});

app.post("/info", post.GetInfoHandle);

app.post("/blog/list", post.GetPageHandle);
app.post("/blog/create", post.CreatePostHandle);
app.post("/blog/remove", post.DeletePostHandle);
app.post("/blog/save", post.EditPostHandle);
app.post("/blog/fetch", post.GetContentHandle);

app.post("/config", tool.SetConfigHandle);
app.post("/verify", tool.VerifyPasswordHandle);
app.post("/password", tool.ChagnePasswordHandle);
app.post('/upload', multipart(), tool.UploadHandle);

app.use(express.static(__dirname + "/public"));
app.use(express.static(__dirname + "/database"));

var PORT = config.get("port");
app.listen(PORT, function () {
  console.log("QHWeb is running on port", PORT);
});

