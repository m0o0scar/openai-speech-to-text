export function setAudioSessionType(type: 'play-and-record' | 'playback') {
  // iOS Safari lowers audio playback volume when mic is in use
  // https://stackoverflow.com/questions/76083738/ios-safari-lowers-audio-playback-volume-when-mic-is-in-use
  if ('audioSession' in navigator) {
    (navigator.audioSession as any).type = type;
  }
}
