/* jshint browser: true, devel: true */

window.addEventListener('load', function () {
  // get all the DOM nodes
  var testBtn = document.querySelector('#test');
  var permissionPrompt = document.querySelector('#permission-prompt');
  var permissionDeniedPrompt = document.querySelector('#permission-denied-prompt');
  var unsupportedPrompt = document.querySelector('#unsupported-prompt');
  var usagePrompt = document.querySelector('#usage-prompt');
  var deviceSelect = document.querySelector('#devices');

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
    return onMissingFeatures(missingFeatures.join(', '));
  }

  var context = new window.AudioContext();

  function closeUserMedia(mediaStream) {
    // stop all the media streams
    mediaStream.getTracks().forEach(function (track) {
      track.stop();
    });
  }

  function getMedia(done) {
    var deviceId = deviceSelect.value;

    // TODO fall back to navigator.getUserMedia is necessary
    // use something like this: https://github.com/webrtc/adapter
    navigator.mediaDevices.getUserMedia({
      audio: {
        deviceId: deviceId
      },
      video: false
    })
      .then(function (stream) {
        done(null, stream);
      })
      .catch(done);
  }

  function discoverDevices() {
    return  navigator.mediaDevices.enumerateDevices().then(function (devices) {
      return devices.filter(function (device) {
        return device.kind === 'audioinput';
      });
    }).then(function (microphones) {
      console.log(microphones);

      microphones.forEach(function (mic) {
        var opt = document.createElement('option');
        opt.appendChild(document.createTextNode(mic.label));
        opt.value = mic.deviceId;
        deviceSelect.appendChild(opt);
      });
    });
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

            // Note the start time and duration of the audio
            var startTime = context.currentTime;
            var duration = audioBuffer.duration;

            // TODO: use requestAnimationFrame instead of an interval
            var i = setInterval(function() {
              var position = context.currentTime - startTime;
              var percent = Math.min(position / duration * 100, 100);
              percent = 100 - percent;

              testBtn.style.clipPath = 'polygon(0 ' + percent + '%, 100% ' + percent + '%, 100% 100%, 0% 100%)';

              if (position >= duration) {
                testBtn.style.clipPath = '';
                clearInterval(i);
              }
            }, 16);
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
    discoverDevices();

    usagePrompt.classList.remove('hide');
    testBtn.classList.remove('hide');
  });
});
