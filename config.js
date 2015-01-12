var fs = require("fs");

var path = __dirname + "/config.json";

var config = fs.readFileSync(path);

config = JSON.parse(config);

exports.get = function (key) {
  return config[key];
};

exports.set = function (key, value) {
  config[key] = value;
  fs.writeFileSync(path, JSON.stringify(config, null, 2));
};
