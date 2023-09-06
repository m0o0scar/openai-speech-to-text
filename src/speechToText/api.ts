import { NextRequest, NextResponse } from 'next/server';
import OpenAI, { ClientOptions } from 'openai';

import { OpenAISpeechToTextResponse } from './types';

export async function handler(request: NextRequest) {
  // get file, language, and other params from request form
  const form = await request.formData();
  const file = form.get('file') as File;
  const clientOptions = JSON.parse((form.get('clientOptions') as string) || '{}') as ClientOptions;
  const transcriptionsOptions = JSON.parse(
    (form.get('transcriptionsOptions') as string) || '{}',
  ) as Partial<OpenAI.Audio.TranscriptionCreateParams>;

  // call the OpenAI API
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_TOKEN, ...clientOptions });
  const { text } = await openai.audio.transcriptions.create({
    model: 'whisper-1',
    temperature: 0.2,
    ...transcriptionsOptions,
    file,
  });

  return NextResponse.json({ text } as OpenAISpeechToTextResponse);
}
