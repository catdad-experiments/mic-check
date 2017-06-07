/* jshint browser: true */

window.addEventListener('load', function () {
  var elem = document.querySelector('#console');

  if (!elem) {
    return;
  }

  var console = window.console || {};
  window.console = console;

  var query = (function parseQuery(){
    var query = {};
    var temp = window.location.search.substring(1).split('&');
    for (var i = temp.length; i--;) {
      var q = temp[i].split('=');
      query[q.shift()] = q.join('=');
    }
    return query;
  }());

  function logger(level) {
    return function () {
      var args = [].slice.call(arguments).map(function (val) {
        return val.toString();
      });

      var textNode = document.createTextNode(args.join(' '));
      var p = document.createElement('p');

      p.classList.add(level);
      p.appendChild(textNode);

      elem.appendChild(p);
    };
  }

  if (query.debug === 'error') {
    console.error = logger('error');
  }

  if (query.debug) {
    console.log = logger('log');
  }
});
