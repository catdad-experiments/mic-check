/* jshint node: true */
var root = require('rootrequire');
var bs = require('browser-sync').create();

bs.init({
  server: root
}, function (err) {
  if (err) {
    console.error(err);
  } else {
    console.log('ready');
  }
});

bs.watch('*.html').on('change', bs.reload);
bs.watch('src/**').on('change', bs.reload);
