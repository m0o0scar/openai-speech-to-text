import { isMobileSafari } from '../../utils/env';

import { waveEncoder } from './waveEncoder';

const createWorker = (fn) => {
  const js = fn
    .toString()
    .replace(/^(\(\)\s*=>|function\s*\(\))\s*{/, '')
    .replace(/}$/, '');
  const blob = new Blob([js]);
  return new Worker(URL.createObjectURL(blob));
};

const error = (method) => {
  const event = new Event('error');
  event.data = new Error('Wrong state for ' + method);
  return event;
};

let context;
let encoder;

/**
 * Audio Recorder with MediaRecorder API.
 *
 * @example
 * navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
 *   let recorder = new AudioRecorder(stream)
 * })
 */
class AudioRecorder {
  /**
   * @param {MediaStream} stream The audio stream to record.
   */
  constructor(stream, config = null) {
    /**
     * The `MediaStream` passed into the constructor.
     * @type {MediaStream}
     */
    this.stream = stream;
    this.config = config;

    /**
     * The current state of recording process.
     * @type {"inactive"|"recording"|"paused"}
     */
    this.state = 'inactive';

    this.em = document.createDocumentFragment();

    // Init encoder worker only once for all recorders
    if (!encoder) {
      encoder = createWorker(waveEncoder);
      console.log('[MediaRecorder] encoder created');
    }
  }

  /**
   * Begins recording media.
   *
   * @param {number} [timeslice] The milliseconds to record into each `Blob`.
   *                             If this parameter isn’t included, single `Blob`
   *                             will be recorded.
   *
   * @return {undefined}
   *
   * @example
   * recordButton.addEventListener('click', () => {
   *   recorder.start()
   * })
   */
  start = (timeslice) => {
    if (this.state !== 'inactive') {
      return this.em.dispatchEvent(error('start'));
    }

    this.state = 'recording';

    context = new AudioContext(this.config);
    this.clone = this.stream.clone();
    this.input = context.createMediaStreamSource(this.clone);
    this.processor = context.createScriptProcessor(2048, 1, 1);

    encoder.addEventListener('message', this._onEncoderMessage);
    encoder.postMessage(['init', context.sampleRate]);

    this.processor.onaudioprocess = (e) => {
      if (this.state === 'recording') {
        encoder.postMessage(['encode', e.inputBuffer.getChannelData(0)]);
      }
    };

    this.input.connect(this.processor);
    this.processor.connect(context.destination);

    this.em.dispatchEvent(new Event('start'));

    if (timeslice) {
      this.slicing = setInterval(() => {
        if (this.state === 'recording') this.requestData();
      }, timeslice);
    }

    return undefined;
  };

  /**
   * Stop media capture and raise `dataavailable` event with recorded data.
   *
   * @return {undefined}
   *
   * @example
   * finishButton.addEventListener('click', () => {
   *   recorder.stop()
   * })
   */
  stop = () => {
    if (this.state === 'inactive') {
      return this.em.dispatchEvent(error('stop'));
    }

    this.requestData();

    this.state = 'inactive';

    this.clone.getTracks().forEach((track) => {
      track.stop();
    });

    this.processor.disconnect();

    this.input.disconnect();

    return clearInterval(this.slicing);
  };

  /**
   * Pauses recording of media streams.
   *
   * @return {undefined}
   *
   * @example
   * pauseButton.addEventListener('click', () => {
   *   recorder.pause()
   * })
   */
  pause = () => {
    if (this.state !== 'recording') {
      return this.em.dispatchEvent(error('pause'));
    }

    this.state = 'paused';
    return this.em.dispatchEvent(new Event('pause'));
  };

  /**
   * Resumes media recording when it has been previously paused.
   *
   * @return {undefined}
   *
   * @example
   * resumeButton.addEventListener('click', () => {
   *   recorder.resume()
   * })
   */
  resume = () => {
    if (this.state !== 'paused') {
      return this.em.dispatchEvent(error('resume'));
    }

    this.state = 'recording';
    return this.em.dispatchEvent(new Event('resume'));
  };

  /**
   * Raise a `dataavailable` event containing the captured media.
   *
   * @return {undefined}
   *
   * @example
   * this.on('nextData', () => {
   *   recorder.requestData()
   * })
   */
  requestData = () => {
    if (this.state === 'inactive') {
      return this.em.dispatchEvent(error('requestData'));
    }

    return encoder.postMessage(['dump', context.sampleRate]);
  };

  /**
   * Add listener for specified event type.
   *
   * @param {"start"|"stop"|"pause"|"resume"|"dataavailable"|"error"}
   * type Event type.
   * @param {function} listener The listener function.
   *
   * @return {undefined}
   *
   * @example
   * recorder.addEventListener('dataavailable', e => {
   *   audio.src = URL.createObjectURL(e.data)
   * })
   */
  addEventListener(...args) {
    this.em.addEventListener(...args);
  }

  /**
   * Remove event listener.
   *
   * @param {"start"|"stop"|"pause"|"resume"|"dataavailable"|"error"}
   * type Event type.
   * @param {function} listener The same function used in `addEventListener`.
   *
   * @return {undefined}
   */
  removeEventListener(...args) {
    this.em.removeEventListener(...args);
  }

  /**
   * Calls each of the listeners registered for a given event.
   *
   * @param {Event} event The event object.
   *
   * @return {boolean} Is event was no canceled by any listener.
   */
  dispatchEvent(...args) {
    this.em.dispatchEvent(...args);
  }

  _onEncoderMessage = (e) => {
    // dataavailable event
    const event = new Event('dataavailable');
    event.data = new Blob([e.data], { type: 'audio/wav' });
    this.em.dispatchEvent(event);

    // stop event
    if (this.state === 'inactive') {
      this.em.dispatchEvent(new Event('stop'));
      encoder.removeEventListener('message', this._onEncoderMessage);
    }
  };
}

// Polyfill MediaRecorder on mobile Safari
if (typeof window !== 'undefined' && isMobileSafari()) {
  window.MediaRecorder = AudioRecorder;
  console.log('[MediaRecorder] Using custom AudioRecorder polyfill for mobile Safari');
}
