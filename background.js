const extend = function () {
  //helper function to merge objects
  let target = arguments[0],
    sources = [].slice.call(arguments, 1);
  for (let i = 0; i < sources.length; ++i) {
    let src = sources[i];
    for (key in src) {
      let val = src[key];
      target[key] =
        typeof val === "object"
          ? extend(typeof target[key] === "object" ? target[key] : {}, val)
          : val;
    }
  }
  return target;
};

const WORKER_FILE = {
  wav: "WavWorker.js",
  mp3: "Mp3Worker.js",
};

// default configs
const CONFIGS = {
  workerDir: "/workers/", // worker scripts dir (end with /)
  numChannels: 2, // number of channels
  encoding: "wav", // encoding (can be changed at runtime)

  // runtime options
  options: {
    timeLimit: 1200, // recording time limit (sec)
    encodeAfterRecord: true, // process encoding after recording
    progressInterval: 1000, // encoding progress report interval (millisec)
    bufferSize: undefined, // buffer size (use browser default)

    // encoding-specific options
    wav: {
      mimeType: "audio/wav",
    },
    mp3: {
      mimeType: "audio/mpeg",
      bitRate: 192, // (CBR only): bit rate = [64 .. 320]
    },
  },
};

class Recorder {
  constructor(source, configs) {
    //creates audio context from the source and connects it to the worker
    extend(this, CONFIGS, configs || {});
    this.context = source.context;
    if (this.context.createScriptProcessor == null)
      this.context.createScriptProcessor = this.context.createJavaScriptNode;
    this.input = this.context.createGain();
    source.connect(this.input);
    this.buffer = [];
    this.initWorker();
  }

  isRecording() {
    return this.processor != null;
  }

  setEncoding(encoding) {
    if (!this.isRecording() && this.encoding !== encoding) {
      this.encoding = encoding;
      this.initWorker();
    }
  }

  setOptions(options) {
    if (!this.isRecording()) {
      extend(this.options, options);
      this.worker.postMessage({ command: "options", options: this.options });
    }
  }

  startRecording() {
    if (!this.isRecording()) {
      let numChannels = this.numChannels;
      let buffer = this.buffer;
      let worker = this.worker;
      this.processor = this.context.createScriptProcessor(
        this.options.bufferSize,
        this.numChannels,
        this.numChannels
      );
      this.input.connect(this.processor);
      this.processor.connect(this.context.destination);
      this.processor.onaudioprocess = function (event) {
        for (var ch = 0; ch < numChannels; ++ch)
          buffer[ch] = event.inputBuffer.getChannelData(ch);
        worker.postMessage({ command: "record", buffer: buffer });
      };
      this.worker.postMessage({
        command: "start",
        bufferSize: this.processor.bufferSize,
      });
      this.startTime = Date.now();
    }
  }

  cancelRecording() {
    if (this.isRecording()) {
      this.input.disconnect();
      this.processor.disconnect();
      delete this.processor;
      this.worker.postMessage({ command: "cancel" });
    }
  }

  finishRecording() {
    if (this.isRecording()) {
      this.input.disconnect();
      this.processor.disconnect();
      delete this.processor;
      this.worker.postMessage({ command: "finish" });
    }
  }

  cancelEncoding() {
    if (this.options.encodeAfterRecord)
      if (!this.isRecording()) {
        this.onEncodingCanceled(this);
        this.initWorker();
      }
  }

  initWorker() {
    if (this.worker != null) this.worker.terminate();
    this.onEncoderLoading(this, this.encoding);
    this.worker = new Worker(this.workerDir + WORKER_FILE[this.encoding]);
    let _this = this;
    this.worker.onmessage = function (event) {
      let data = event.data;
      switch (data.command) {
        case "loaded":
          _this.onEncoderLoaded(_this, _this.encoding);
          break;
        case "timeout":
          _this.onTimeout(_this);
          break;
        case "progress":
          _this.onEncodingProgress(_this, data.progress);
          break;
        case "complete":
          _this.onComplete(_this, data.blob);
      }
    };
    this.worker.postMessage({
      command: "init",
      config: {
        sampleRate: this.context.sampleRate,
        numChannels: this.numChannels,
      },
      options: this.options,
    });
  }

  onEncoderLoading(recorder, encoding) {}
  onEncoderLoaded(recorder, encoding) {}
  onTimeout(recorder) {}
  onEncodingProgress(recorder, progress) {}
  onEncodingCanceled(recorder) {}
  onComplete(recorder, blob) {}
}

const audioCapture = (timeLimit, muteTab, format, quality, limitRemoved) => {
  chrome.tabCapture.capture({ audio: true }, (stream) => {
    // sets up stream for capture
    let startTabId; //tab when the capture is started
    let timeout;
    let completeTabID; //tab when the capture is stopped
    let audioURL = null; //resulting object when encoding is completed
    chrome.tabs.query(
      { active: true, currentWindow: true },
      (tabs) => (startTabId = tabs[0].id)
    ); //saves start tab
    const liveStream = stream;

    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(stream);
    scriptNode = audioContext.createScriptProcessor(4096, 1, 1);

    const access_token =
      "<ACCESS_TOKEN_HERE>";
    const content_type = `audio/x-raw;layout=interleaved;rate=${audioContext.sampleRate};format=S16LE;channels=1`;
    const baseUrl = "wss://api.rev.ai/speechtotext/v1alpha/stream";
    const query = `access_token=${access_token}&content_type=${content_type}`;
    websocket = new WebSocket(`${baseUrl}?${query}`);

    websocket.onmessage = onMessage;
    websocket.onerror = console.error;

    function onMessage(event) {
      var data = JSON.parse(event.data);
      switch (data.type) {
        case "connected":
          //     statusElement.innerHTML =`Connected, job id is ${data.id}`;
          console.log(data.id);
          break;
        case "partial":
        case "final":
          var msg = parseResponse(data);
          console.log(msg);
          chrome.tabs.sendMessage(startTabId, {
            type: "report_back",
            text: msg,
          });
          break;
        default:
          // We expect all messages from the API to be one of these types
          console.error("Received unexpected message");
          break;
      }
    }

    function processAudioEvent(e) {
      if (
        audioContext.state === "suspended" ||
        audioContext.state === "closed" ||
        !websocket
      ) {
        return;
      }

      let inputData = e.inputBuffer.getChannelData(0);

      // The samples are floats in range [-1, 1]. Convert to PCM16le.
      let output = new DataView(new ArrayBuffer(inputData.length * 2));
      for (let i = 0; i < inputData.length; i++) {
        let multiplier = inputData[i] < 0 ? 0x8000 : 0x7fff; // 16-bit signed range is -32768 to 32767
        output.setInt16(i * 2, (inputData[i] * multiplier) | 0, true); // index, value, little edian
      }

      let intData = new Int16Array(output.buffer);
      let index = intData.length;
      while (index-- && intData[index] === 0 && index > 0) {}
      websocket.send(intData.slice(0, index + 1));
    }

    function parseResponse(response) {
      var message = "";
      for (var i = 0; i < response.elements.length; i++) {
        message +=
          response.type == "final"
            ? response.elements[i].value
            : `${response.elements[i].value} `;
      }
      return message;
    }

    scriptNode.addEventListener("audioprocess", processAudioEvent);
    source.connect(scriptNode);
    scriptNode.connect(audioContext.destination);

    function onStopCommand(command) {
      //keypress
      if (command === "stop") {
        stopCapture();
      }
    }
    function onStopClick(request) {
      //click on popup
      if (request === "stopCapture") {
        stopCapture();
      } else if (request === "cancelCapture") {
        cancelCapture();
      } else if (request.cancelEncodeID) {
        // if(request.cancelEncodeID === startTabId && mediaRecorder) {
        //   mediaRecorder.cancelEncoding();
        // }
      }
    }
    chrome.commands.onCommand.addListener(onStopCommand);
    chrome.runtime.onMessage.addListener(onStopClick);
    // mediaRecorder.onComplete = (recorder, blob) => {
    //   audioURL = window.URL.createObjectURL(blob);
    //   if(completeTabID) {
    //     chrome.tabs.sendMessage(completeTabID, {type: "encodingComplete", audioURL});
    //   }
    //   mediaRecorder = null;
    // }
    // mediaRecorder.onEncodingProgress = (recorder, progress) => {
    //   if(completeTabID) {
    //     chrome.tabs.sendMessage(completeTabID, {type: "encodingProgress", progress: progress});
    //   }
    // }

    const stopCapture = function () {
      let endTabId;
      //check to make sure the current tab is the tab being captured
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        endTabId = tabs[0].id;
        // if(mediaRecorder && startTabId === endTabId){
        //   mediaRecorder.finishRecording();
        //   chrome.tabs.create({url: "complete.html"}, (tab) => {
        //     completeTabID = tab.id;
        //     let completeCallback = () => {
        //       chrome.tabs.sendMessage(tab.id, {type: "createTab", format: format, audioURL, startID: startTabId});
        //     }
        //     setTimeout(completeCallback, 500);
        //   });
        //   closeStream(endTabId);
        // }
      });
    };

    const cancelCapture = function () {
      let endTabId;
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        endTabId = tabs[0].id;
        // if(mediaRecorder && startTabId === endTabId){
        //   mediaRecorder.cancelRecording();
        //   closeStream(endTabId);
        // }
      });
    };

    //removes the audio context and closes recorder to save memory
    const closeStream = function (endTabId) {
      chrome.commands.onCommand.removeListener(onStopCommand);
      chrome.runtime.onMessage.removeListener(onStopClick);
      // mediaRecorder.onTimeout = () => {};
      audioContext.close();
      liveStream.getAudioTracks()[0].stop();
      sessionStorage.removeItem(endTabId);
      chrome.runtime.sendMessage({ captureStopped: endTabId });
    };

    // mediaRecorder.onTimeout = stopCapture;

    if (!muteTab) {
      let audio = new Audio();
      audio.srcObject = liveStream;
      audio.play();
    }
  });
};

//sends reponses to and from the popup menu
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.currentTab && sessionStorage.getItem(request.currentTab)) {
    sendResponse(sessionStorage.getItem(request.currentTab));
  } else if (request.currentTab) {
    sendResponse(false);
  } else if (request === "startCapture") {
    startCapture();
  }
});

const startCapture = function () {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    // CODE TO BLOCK CAPTURE ON YOUTUBE, DO NOT REMOVE
    // if(tabs[0].url.toLowerCase().includes("youtube")) {
    //   chrome.tabs.create({url: "error.html"});
    // } else {
    if (!sessionStorage.getItem(tabs[0].id)) {
      sessionStorage.setItem(tabs[0].id, Date.now());
      chrome.storage.sync.get(
        {
          maxTime: 1200000,
          muteTab: false,
          format: "mp3",
          quality: 192,
          limitRemoved: false,
        },
        (options) => {
          let time = options.maxTime;
          if (time > 1200000) {
            time = 1200000;
          }
          audioCapture(
            time,
            options.muteTab,
            options.format,
            options.quality,
            options.limitRemoved
          );
        }
      );
      chrome.runtime.sendMessage({
        captureStarted: tabs[0].id,
        startTime: Date.now(),
      });
    }
    // }
  });
};

chrome.commands.onCommand.addListener((command) => {
  if (command === "start") {
    startCapture();
  }
});
