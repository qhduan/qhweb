"use strict";

var fs = require("fs");

var path = __dirname + "/config.json";

if (fs.existsSync(path) == false) {
  var default_config = {
    siteName: "site name",
    url: "http://www.example.com/",
    siteSubtitle: "subtitle of site",
    itemOfPage: 10,
    key: "admin",
    port: 3000
  };
  fs.writeFileSync(path, JSON.stringify(default_config, null, 2));
}

var config = fs.readFileSync(path);

config = JSON.parse(config);

exports.get = function (key) {
  return config[key];
};

exports.set = function (key, value) {
  config[key] = value;
  fs.writeFileSync(path, JSON.stringify(config, null, 2));
};
