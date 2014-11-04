

function Encode (d) {
  return btoa(unescape(encodeURIComponent(d)));
}

function Decode (d) {
  return decodeURIComponent(escape(atob(d)));
}
