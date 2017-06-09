/* jshint browser: true, devel: true */

window.addEventListener('load', function () {
  var requiredGlobals = ['MediaRecorder', 'URL', 'Blob', 'AudioContext', 'FileReader'];
  var missing = requiredGlobals.filter(function (name) {
    return !window[name];
  });

  if (missing.length) {
    alert(
      'The following APIs are missing in your browser,' +
      ' so this app is not supported:\n\n' +
      missing.toString()
    );
  }

  var context = new window.AudioContext();
  var testBtn = document.querySelector('#test');

  function permissionError(err) {
    // TODO don't alert
    console.error(err);
  }

  function chunksToArrayBuffer(chunks, done) {
    var combined = new window.Blob(chunks);
    var reader = new window.FileReader();

    reader.addEventListener('loadend', function () {
      done(null, this.result);
    });

    reader.readAsArrayBuffer(combined);
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
      var recorder = new window.MediaRecorder(stream);

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

        chunksToArrayBuffer(chunks, function (err, buffer) {
          if (err) {
            console.error(err);

            return;
          }

          context.decodeAudioData(buffer, function (audioBuffer) {
            console.log('playing in audio context');

            var source = context.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(context.destination);
            source.start(0);
          });
        });
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

  function onStopEvent(func, once) {
    function onStopEvent(ev) {
      if (once) {
        testBtn.removeEventListener('mouseup', onStopEvent);
        testBtn.removeEventListener('pointerup', onStopEvent);
        testBtn.removeEventListener('touchend', onStopEvent);
      }

      func(ev);
    }

    testBtn.addEventListener('mouseup', onStopEvent);
    testBtn.addEventListener('pointerup', onStopEvent);
    testBtn.addEventListener('touchend', onStopEvent);
  }

  function onStartEvent(func) {
    var started = false;

    function onStart(ev) {
      console.log(ev.type, started);

      cancelEvent(ev);

      if (started) {
        return;
      }

      started = true;

      func(ev);
    }

    onStopEvent(function () {
      started = false;
    }, false);

    testBtn.addEventListener('mousedown', onStart);
    testBtn.addEventListener('touchstart', onStart);
    testBtn.addEventListener('pointerdown', onStart);
  }

  onStartEvent(function (ev) {
    console.log('start');

    testBtn.classList.add('active');

    var api = init();

    onStopEvent(function onStop() {
      console.log('end');

      testBtn.classList.remove('active');

      api.stop();
    }, true);
  });
});
