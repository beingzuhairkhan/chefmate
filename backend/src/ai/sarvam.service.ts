import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SarvamService {
  private readonly logger = new Logger(SarvamService.name);
  private readonly apiKey: string;
  private readonly sttUrl: string;
  private readonly ttsUrl: string;
  private readonly ttsModel = 'bulbul:v3';
  private readonly ttsLanguage = 'en-IN';
  private readonly ttsSpeaker = 'ritu';
  private readonly ttsPace = 1;
  private readonly ttsSampleRate = 22050;

  constructor(private readonly config: ConfigService) {
    this.apiKey = this.config.get<string>('app.sarvamApiKey') || '';
    this.sttUrl = this.config.get<string>('app.sarvamSttUrl') || '';
    this.ttsUrl = this.config.get<string>('app.sarvamTtsUrl') || '';
  }

  isConfigured() {
    return Boolean(this.apiKey);
  }

  async speechToText(audioBase64: string, language = 'en-IN'): Promise<string> {
    if (!this.isConfigured()) {
      return this.demoSTT(language);
    }
    try {
      const audio = Buffer.from(audioBase64, 'base64');
      const isWav =
        audio.subarray(0, 4).toString('ascii') === 'RIFF' &&
        audio.subarray(8, 12).toString('ascii') === 'WAVE';
      const fileName = isWav ? 'audio.wav' : 'audio.m4a';
      const formData = new FormData();
      formData.append(
        'file',
        new Blob([audio], { type: isWav ? 'audio/wav' : 'audio/mp4' }),
        fileName,
      );
      formData.append('language_code', language);

      const res = await fetch(this.sttUrl, {
        method: 'POST',
        headers: {
          'api-subscription-key': this.apiKey,
        },
        body: formData,
      });
      if (!res.ok) {
        throw new Error(`Sarvam STT error ${res.status}: ${await res.text()}`);
      }
      const data = await res.json();
      return data?.transcript || data?.text || '';
    } catch (err) {
      this.logger.error(`Sarvam STT failed: ${(err as Error).message}`);
      throw err;
    }
  }

  async textToSpeech(text: string, language = this.ttsLanguage): Promise<string> {
    if (!this.isConfigured()) {
      return this.demoTTS(text);
    }
    try {
      const res = await fetch(this.ttsUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-subscription-key': this.apiKey,
        },
        body: JSON.stringify({
          text,
          model: this.ttsModel,
          language_code: language,
          speaker: this.ttsSpeaker,
          pitch: 0,
          pace: this.ttsPace,
          speech_sample_rate: this.ttsSampleRate,
        }),
      });
      if (!res.ok) {
        throw new Error(`Sarvam TTS error ${res.status}: ${await res.text()}`);
      }
      const data = await res.json();
      return data?.audio || data?.audios?.[0] || '';
    } catch (err) {
      this.logger.error(`Sarvam TTS failed: ${(err as Error).message}`);
      throw err;
    }
  }

  private demoSTT(language: string): string {
    const samples: Record<string, string> = {
      'hi-IN': 'Mere paas paneer aur tomato hai, kya bana sakta hoon?',
      'en-IN': 'Suggest a healthy breakfast using what I have.',
    };
    return samples[language] || samples['en-IN'];
  }

  private demoTTS(text: string): string {
    // In demo mode return empty base64 — frontend will use browser TTS fallback
    return '';
  }
}
