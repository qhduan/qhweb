var fs = require("fs");
var express = require("express");
var bodyParser = require("body-parser");
var multipart = require('connect-multiparty');
var tool = require("./tool");
var post = require("./post");

var app = express();
app.use(bodyParser.urlencoded({extended: true}))
app.use(bodyParser.json())

app.get("/", function (req, res) {
  res.sendfile(__dirname + "/public/index.html");
});

var last_regen = null;
app.get("/regen", function (req, res) {
  var t = (new Date()).getTime();
  if (last_regen == null || Math.abs(t - last_regen) > 5000) { // 5s
    last_regen = t;
    post.load();
    post.generate();
    res.end("OK");
  } else {
    res.end("NO");
  }
});

app.post("/new", function (req, res) {
  post.create(req, res, function () {
    post.load();
    post.generate()
  });
});

app.post('/upload', multipart(), tool.upload);

app.use(express.static(__dirname + "/public"));

post.load();
post.generate();
app.listen(tool.config.port);
console.log("NLWEB is running on port", tool.config.port);