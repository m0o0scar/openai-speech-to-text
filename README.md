# Audio Recorder and OpenAI Speech to Text

## Install

```
npm i @nospoon/speech-to-text
```

## Usage

### Edge Function

```typescript
// /pages/api/xxx

import { handler } from '@nospoon/speech-to-text/build/server';

export const config = {
  runtime: 'edge',
};

export default handler;
```

### Client

```typescript
import { speechToText, useAudioRecording } from '@nospoon/speech-to-text';

const { status, toggleRecording } = useAudioRecording(async data => {
  if (data) {
    const text = await speechToText('/api/xxx', data as Blob, {
      transcriptionsOptions: { language: 'en' },
    });
    onNewUserMessage(text);
  }
});
```
