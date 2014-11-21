var fs = require("fs");
var express = require("express");
var bodyParser = require("body-parser");
var multipart = require('connect-multiparty');
var compression = require('compression');
var config = require("config");

var tool = require("./tool");
var post = require("./post");

var app = express();
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.use(compression());

app.get("/", function (req, res) {
  res.sendFile(__dirname + "/public/index.html");
});

app.post("/new", function (req, res) {
  post.create(req, res);
});

app.get("/page", post.page);
app.get("/article", post.article);
app.get("/content", post.content);
app.get("/config", tool.config);

app.post('/upload', multipart(), tool.upload);

app.use(express.static(__dirname + "/public"));
app.use(express.static(__dirname + "/database"));

app.listen(config.get("qhweb.port"), function () {
  console.log("QHWeb is running on port", config.get("qhweb.port"));
});

