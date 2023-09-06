import OpenAI, { ClientOptions } from 'openai';

import { OpenAISpeechToTextResponse } from './types';

export interface SpeechToTextOptions {
  clientOptions?: ClientOptions;
  transcriptionsOptions?: Partial<OpenAI.Audio.TranscriptionCreateParams>;
}

export const speechToText = async (api: string, audio: Blob | File, options?: SpeechToTextOptions) => {
  const { clientOptions, transcriptionsOptions } = options || {};

  const form = new FormData();
  form.append('file', audio, audio.name || 'audio.mp3');
  clientOptions && form.append('clientOptions', JSON.stringify(clientOptions));
  transcriptionsOptions && form.append('transcriptionsOptions', JSON.stringify(transcriptionsOptions));

  const response = await fetch(api, {
    method: 'POST',
    body: form,
  });

  const { text } = (await response.json()) as OpenAISpeechToTextResponse;
  return text;
};
