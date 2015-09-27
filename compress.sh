cat "public/js/jquery-1.11.3.min.js" \
  "public/js/semantic.min.js" \
  "public/js/alertify.min.js" \
  "public/js/NodeRSA.min.js" \
  "public/js/angular/angular.min.js" \
  "public/js/angular/angular-route.min.js" \
  "public/js/angular/angular-cookies.min.js" \
  "public/js/app.js" \
  "public/js/controllers.js" \
  > public/js/all.js

cat "public/css/semantic.min.css" \
  "public/css/alertify.min.css" \
  "public/css/alertify.semantic.min.css" \
  > public/css/all.css

uglifyjs public/js/all.js -m > public/js/all.min.js
