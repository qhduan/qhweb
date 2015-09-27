"use strict";

var NodeRSA = require('node-rsa');

var serverEncrypt = new NodeRSA({ b: 512 }, "pkcs1-private-pem", { encryptionScheme: "pkcs1" });

var serverPublic = serverEncrypt.exportKey("public");
var serverPrivate = serverEncrypt.exportKey("private");
// cut off
serverPublic = serverPublic.replace("-----BEGIN PUBLIC KEY-----", "");
serverPublic = serverPublic.replace("-----END PUBLIC KEY-----", "");
serverPublic = serverPublic.replace(/\r?\n|\r/g, "");

serverPrivate = serverPrivate.replace("-----BEGIN RSA PRIVATE KEY-----", "");
serverPrivate = serverPrivate.replace("-----END RSA PRIVATE KEY-----", "");
serverPrivate = serverPrivate.replace(/\r?\n|\r/g, "");

function ConvertPrivateKey (key) {
  var ret = [];
  ret.push("-----BEGIN RSA PRIVATE KEY-----");
  while (key.length) {
    ret.push(key.substr(0, 64));
    key = key.substr(64);
  }
  ret.push("-----END RSA PRIVATE KEY-----");
  return ret.join("\n");
}

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
  if (!publicKeyCache[publicKey]) {
    publicKeyCache[publicKey] = new NodeRSA({ b: 512 }, { encryptionScheme: "pkcs1" });
    publicKeyCache[publicKey].importKey(ConvertPublicKey(publicKey), "public");
  }
  var dataArray = [];
  while (data.length) {
    dataArray.push(data.substr(0, 48));
    data = data.substr(48);
  }
  var ret = dataArray.map(function (element) {
    return publicKeyCache[publicKey].encrypt(element, "base64");
  });
  return ret;
}

function Decrypt (dataArray, second) {
  try {
    var data = [];
    dataArray.forEach(function (element, index, array) {
      var t = serverEncrypt.decrypt(element);
      data.push(t);
    });
    data = data.join("");
    data = JSON.parse(data);
    return data;
  } catch (e) {
    if (!second) {
      return Decrypt(dataArray, true);
    } else {
      console.error(e);
      return null;
    }
  }
}

// console.log(Encrypt(JSON.stringify({"hello":"world"}), PUBLIC_KEY));

exports.publicKey = serverPublic;
exports.encrypt = Encrypt;
exports.decrypt = Decrypt;
