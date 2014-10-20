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

app.get("/regen", function (req, res) {
  post.load();
  post.generate();
  console.log(config.get("qhweb.site_name"));
  res.redirect("/");
});

app.post("/new", function (req, res) {
  post.create(req, res, function () {
    post.load();
    post.generate()
  });
});

app.post('/upload', multipart(), tool.upload);

app.use(express.static(__dirname + "/public"));
app.use(express.static(__dirname + "/database"));

post.load();
post.generate();
app.listen(config.get("qhweb.port"));
console.log("QHWeb is running on port", config.get("qhweb.port"));
