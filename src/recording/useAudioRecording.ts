import './polyfill/MediaRecorder';

import { useRef, useState } from 'react';

import { Later, later } from '../utils/later';
import { setAudioSessionType } from './audioSession';

export type RecordStatus = 'stopped' | 'pending' | 'recording';

export type RecordedResult = Blob | null | Error;

export function useAudioRecording(onRecorded?: (audioBlob: RecordedResult) => void) {
  const [status, setStatus] = useState<RecordStatus>('stopped');

  // this is to calculate recording duration
  const recordingStartTime = useRef(0);

  // this is to collect audio chunks
  const audioChunks = useRef<Blob[]>([]);
  const recorder = useRef<MediaRecorder | null>(null);
  const laterSignal = useRef<Later | null>(null);
  // undefined means not recorded yet; null means recording too short
  const [audioBlob, setAudioBlob] = useState<Blob | null | undefined>(undefined);

  const onStart = () => {
    recordingStartTime.current = Date.now();
    audioChunks.current = [];
    setAudioBlob(undefined);
    setStatus('recording');
    console.log('MediaRecorder', 'started');
  };

  const onData = (event: BlobEvent) => {
    // collect audio chunks when data available
    audioChunks.current.push(event.data);
    console.log('MediaRecorder', `data ${event.data.size}`);
  };

  const onStop = () => {
    setStatus('stopped');
    laterSignal.current?.resolve();
    console.log('MediaRecorder', 'stopped');
  };

  const startRecording = async () => {
    if (status !== 'stopped') return;

    setStatus('pending');
    laterSignal.current = later();

    setAudioSessionType('play-and-record');

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    recorder.current = new MediaRecorder(stream);
    recorder.current!.addEventListener('start', onStart);
    recorder.current!.addEventListener('dataavailable', onData);
    recorder.current!.addEventListener('stop', onStop);
    recorder.current!.start();
  };

  const stopRecording = async (abort = false) => {
    if (recorder.current?.state === 'recording') {
      const duration = Date.now() - recordingStartTime.current;

      recorder.current.stop();

      console.log('MediaRecorder', 'waiting for stop');
      await laterSignal.current?.promise;

      recorder.current.stream.getTracks().forEach(track => track.stop());
      recorder.current.removeEventListener('start', onStart);
      recorder.current.removeEventListener('dataavailable', onData);
      recorder.current.removeEventListener('stop', onStop);
      recorder.current = null;

      setAudioSessionType('playback');

      if (abort || duration < 1000) {
        const reason = abort ? 'aborted' : 'too short';
        console.error('MediaRecorder', `recording stopped due to ${reason}`);
        setAudioBlob(null);
        onRecorded?.(null);
      } else if (!audioChunks.current.length) {
        console.warn('MediaRecorder', 'no audio chunks recorded');
        setAudioBlob(null);
        onRecorded?.(null);
      } else {
        const { type } = audioChunks.current[0];
        const audioBlob = new Blob(audioChunks.current, { type });
        setAudioBlob(audioBlob);
        onRecorded?.(audioBlob);
      }
    }
  };

  const toggleRecording = () => {
    if (status === 'stopped') startRecording();
    else stopRecording();
  };

  const abort = () => stopRecording(true);

  return {
    status,
    audioBlob,
    startRecording,
    stopRecording,
    toggleRecording,
    abort,
  };
}
