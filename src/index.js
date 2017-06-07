/* jshint browser: true, devel: true */

window.addEventListener('load', function () {
  console.log('page has loaded');

  var player = document.querySelector('#player');
  var testBtn = document.querySelector('#test');

  function permissionError(err) {
    // TODO don't alert
    console.error(err);
  }

  function init () {
    var chunks = [];
    var globalRecorder;

    function stop () {
      console.log('stop called');
      console.log(!!globalRecorder, chunks.length);

      if (globalRecorder) {
        globalRecorder.stop();
        globalRecorder = undefined;
      }

      if (chunks.length) {
        var blob = new window.Blob(chunks);
        var url = window.URL.createObjectURL(blob);
        player.src = url;

        player.play();
      }
    }

    function record(stream) {
      console.log('we will be recording now');

      var recorder = new MediaRecorder(stream);

      recorder.addEventListener('dataavailable', function (ev) {
        console.log('read data', ev.data.size);
        if (ev.data.size > 0) {
          chunks.push(ev.data);
        }
      });

      console.log('calling start recorder');

      recorder.start();

      return recorder;
    }

    function onMicPermission(stream) {
      globalRecorder = record(stream);
    }

    // TODO fall back to navigator.getUserMedia is necessary
    // use something like this: https://github.com/webrtc/adapter
    navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      .then(record)
      .catch(permissionError);

    return {
      stop: stop
    };
  }

  testBtn.addEventListener('mousedown', function () {
    var api = init();

    function onStop() {
      testBtn.removeEventListener('mouseup', onStop);

      api.stop();
    }

    testBtn.addEventListener('mouseup', onStop);
  });
});
