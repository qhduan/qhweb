"use strict";

var NodeRSA = require('node-rsa');

function Base64Encode (d) {
  var b = new Buffer(d, "utf8");
  return b.toString("base64");
}

function Base64Decode (d) {
  var b = new Buffer(d, "base64");
  return b.toString("utf8");
}

var serverEncrypt = new NodeRSA({ b: 512 }, "pkcs1-private-pem", { encryptionScheme: "pkcs1", environment: "browser" });

var serverPublic = serverEncrypt.exportKey("public");
var serverPrivate = serverEncrypt.exportKey("private");
// cut off
serverPublic = serverPublic.replace("-----BEGIN PUBLIC KEY-----", "");
serverPublic = serverPublic.replace("-----END PUBLIC KEY-----", "");
serverPublic = serverPublic.replace(/\r?\n|\r/g, "");

function ConvertPublicKey (key) {
  var ret = [];
  ret.push("-----BEGIN PUBLIC KEY-----");
  while (key.length) {
    ret.push(key.substr(0, 64));
    key = key.substr(64);
  }
  ret.push("-----END PUBLIC KEY-----");
  return ret.join("\n");
}

var publicKeyCache = {};

function Encrypt (data, publicKey) {
  if (Object.keys(publicKeyCache).length > 20) {
    publicKeyCache = {};
  }
  if (!publicKeyCache[publicKey]) {
    publicKeyCache[publicKey] = new NodeRSA({ b: 512 }, "pkcs1-private-pem", { encryptionScheme: "pkcs1", environment: "browser" });
    publicKeyCache[publicKey].importKey(ConvertPublicKey(publicKey), "public");
  }
  //data = Base64Encode(data);
  var dataArray = [];
  while (data.length) {
    dataArray.push(data.substr(0, 32));
    data = data.substr(32);
  }
  var ret = dataArray.map(function (element) {
    return publicKeyCache[publicKey].encrypt(element, "base64");
  });
  return ret;
}

function Decrypt (dataArray) {
  try {
    var data = dataArray.map(function (element) {
      return serverEncrypt.decrypt(element);
    });
  } catch (e) {
    console.error("decrypt fail", e);
    return null;
  }
  try {
    data = data.join("");
    //data = Base64Decode(data);
    data = JSON.parse(data);
    return data;
  } catch (e) {
    console.log("json parse failed", data, e);
    return null;
  }
}

// console.log(Encrypt(JSON.stringify({"hello":"world"}), PUBLIC_KEY));

exports.publicKey = serverPublic;
exports.encrypt = Encrypt;
exports.decrypt = Decrypt;
