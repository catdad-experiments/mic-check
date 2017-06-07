/* jshint browser: true, devel: true */

window.addEventListener('load', function () {
  console.log('page has loaded');

  var player = document.querySelector('#player');
  var testBtn = document.querySelector('#test');

  function startCapture(stream) {
    console.log(stream);

    if (window.URL) {
      player.src = window.URL.createObjectURL(stream);
    } else {
      player.src = stream;
    }
  }

  function permissionError(err) {
    // TODO don't alert
    console.error(err);
  }

  // TODO fall back to navigator.getUserMedia is necessary
  navigator.mediaDevices.getUserMedia({ audio: true, video: false })
    .then(startCapture)
    .catch(permissionError);

  testBtn.addEventListener('click', function () {

  });


});
