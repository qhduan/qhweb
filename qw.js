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

app.post("/new", post.create);
app.post("/edit", post.edit);
app.post("/del", post.del);

app.post("/verify", function (req, res) {
  var key = req.body.key;
  
  if (!key || key.trim() == "") {
    return res.json({message: "key can't be empty!"});
  }
  
  if (key != config.get("key")) {
    return res.json({message: "key don't match!"});
  }
  
  return res.json({ok: "success"});
});

app.post("/page", post.page);

app.post("/info", post.info);
app.post("/content", post.content);
app.post("/config", post.config);
app.post("/password", tool.password);

app.post('/upload', multipart(), tool.upload);

app.use(express.static(__dirname + "/public"));
app.use(express.static(__dirname + "/database"));

app.listen(config.get("port"), function () {
  console.log("QHWeb is running on port", config.get("port"));
});

