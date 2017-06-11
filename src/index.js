/* jshint browser: true, devel: true */

window.addEventListener('load', function () {
  // get all the DOM nodes
  var testBtn = document.querySelector('#test');
  var permissionPrompt = document.querySelector('#permission-prompt');
  var permissionDeniedPrompt = document.querySelector('#permission-denied-prompt');
  var unsupportedPrompt = document.querySelector('#unsupported-prompt');
  var usagePrompt = document.querySelector('#usage-prompt');

  function hidePrompts() {
    permissionPrompt.classList.add('hide');
    permissionDeniedPrompt.classList.add('hide');
    unsupportedPrompt.classList.add('hide');
    usagePrompt.classList.add('hide');
  }

  function onMissingFeatures(missing) {
    hidePrompts();

    unsupportedPrompt.classList.remove('hide');

    var p = document.createElement('p');
    p.appendChild(
      document.createTextNode(missing.toString())
    );

    unsupportedPrompt.appendChild(p);
  }

  function onPermissionError(err) {
    permissionDeniedPrompt.classList.remove('hide');

    permissionDeniedPrompt.querySelector('button').onclick = window.location.reload.bind(window.location);

    console.error(err);
  }

  // detect missing features in the browser
  var missingFeatures = [
    'MediaRecorder', 'URL', 'Blob', 'AudioContext', 'FileReader'
  ].filter(function (name) {
    return !window[name];
  });

  if (missingFeatures.length) {
    return onMissingFeatures(missingFeatures);
  }

  var context = new window.AudioContext();

  function closeUserMedia(mediaStream) {
    // stop all the media streams
    mediaStream.getTracks().forEach(function (track) {
      track.stop();
    });
  }

  function getMedia(done) {
    // TODO fall back to navigator.getUserMedia is necessary
    // use something like this: https://github.com/webrtc/adapter
    navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      .then(function (stream) {
        done(null, stream);
      })
      .catch(done);
  }

  var recordAndPlay = (function () {
    function chunksToArrayBuffer(chunks, done) {
      var combined = new window.Blob(chunks);
      var reader = new window.FileReader();

      reader.addEventListener('loadend', function () {
        done(null, this.result);
      });

      reader.readAsArrayBuffer(combined);
    }

    function init () {
      var globalRecorder;

      function playback(chunks) {
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
      }

      function stop () {
        if (globalRecorder) {
          globalRecorder.stop();
          globalRecorder = undefined;
        }
      }

      function record(stream) {
        var chunks = [];
        var recorder = new window.MediaRecorder(stream);

        recorder.addEventListener('dataavailable', function (ev) {
          if (ev.data.size > 0) {
            chunks.push(ev.data);
          }
        });

        recorder.addEventListener('stop', function () {
          closeUserMedia(stream);

          if (chunks.length) {
            return playback(chunks);
          }

          // TODO handle this error better
          console.error('nothing was recorded');
        });

        recorder.start();

        return recorder;
      }

      getMedia(function (err, stream) {
        if (err) {
          return onPermissionError(err);
        }

        globalRecorder = record(stream);
      });

      return {
        stop: stop
      };
    }

    return init;
  }());

  function stopEventHandler(func, once) {
    function onStop(ev) {
      if (once) {
        testBtn.removeEventListener('mouseup', onStop);
        testBtn.removeEventListener('touchend', onStop);
        testBtn.removeEventListener('pointerup', onStop);
      }

      func(ev);
    }

    testBtn.addEventListener('mouseup', onStop);
    testBtn.addEventListener('touchend', onStop);
    testBtn.addEventListener('pointerup', onStop);
  }

  function startEventHandler(func) {
    var started = false;

    function onStart(ev) {
      console.log(ev.type, started);

      if (started) {
        return;
      }

      started = true;

      func(ev);
    }

    stopEventHandler(function () {
      started = false;
    }, false);

    testBtn.addEventListener('mousedown', onStart);
    testBtn.addEventListener('touchstart', onStart);
    testBtn.addEventListener('pointerdown', onStart);
  }

  startEventHandler(function (ev) {
    console.log('start');

    testBtn.classList.add('active');

    var api = recordAndPlay();

    stopEventHandler(function onStop() {
      console.log('end');

      testBtn.classList.remove('active');

      api.stop();
    }, true);
  });

  // prompt the user for media immediately, then initialize
  // the app in the correct state
  getMedia(function (err, stream) {
    hidePrompts();

    if (err) {
      return onPermissionError(err);
    }

    closeUserMedia(stream);

    usagePrompt.classList.remove('hide');
    testBtn.classList.remove('hide');
  });
});
