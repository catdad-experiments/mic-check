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
      if (globalRecorder) {
        globalRecorder.stop();
        globalRecorder = undefined;
      }
    }

    function record(stream) {
      var recorder = new MediaRecorder(stream);

      recorder.addEventListener('dataavailable', function (ev) {
        if (ev.data.size > 0) {
          chunks.push(ev.data);
        }
      });

      recorder.addEventListener('stop', function () {
        // stop all the media streams
        stream.getTracks().forEach(function (track) {
          track.stop();
        });

        if (!chunks.length) {
          // TODO handle this error better
          console.error('nothing was recorded');

          return;
        }

        var blob = new window.Blob(chunks);
        var url = window.URL.createObjectURL(blob);
        player.src = url;

        player.play();
      });

      recorder.start();

      return recorder;
    }

    function onMicPermission(stream) {
      try {
        globalRecorder = record(stream);
      } catch (e) {
        // TODO remove this
        console.error(e);
      }
    }

    // TODO fall back to navigator.getUserMedia is necessary
    // use something like this: https://github.com/webrtc/adapter
    navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      .then(onMicPermission)
      .catch(permissionError);

    return {
      stop: stop
    };
  }

  function cancelEvent(ev) {
    ev.stopPropagation();
    ev.preventDefault();
  }

  function onStartEvent(func) {
    function onStart(ev) {
      cancelEvent(ev);

      func(ev);
    }

    testBtn.addEventListener('mousedown', onStart);
    testBtn.addEventListener('touchstart', onStart);
    testBtn.addEventListener('pointerdown', onStart);
  }

  function onStopEventOnce(func) {
    function onStopEvent(ev) {
      testBtn.removeEventListener('mouseup', onStopEvent);
      testBtn.removeEventListener('pointerup', onStopEvent);
      testBtn.removeEventListener('touchend', onStopEvent);

      func(ev);
    }

    testBtn.addEventListener('mouseup', onStopEvent);
    testBtn.addEventListener('pointerup', onStopEvent);
    testBtn.addEventListener('touchend', onStopEvent);
  }

  onStartEvent(function () {
    var api = init();

    onStopEventOnce(function onStop() {
      api.stop();
    });
  });
});
