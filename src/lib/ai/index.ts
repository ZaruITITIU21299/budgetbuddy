import { MockAIClient } from './mockAIClient';
import { GeminiAIClient } from './geminiAIClient';
import type { AIClient } from './aiClient';

let cached: AIClient | null = null;

export function getAIClient(): AIClient {
  if (cached) return cached;
  const useReal = import.meta.env.VITE_USE_REAL_AI === 'true';
  const key = import.meta.env.VITE_GEMINI_API_KEY;
  if (useReal && typeof key === 'string' && key.length > 0) {
    cached = new GeminiAIClient(key);
  } else {
    cached = new MockAIClient();
  }
  return cached;
}

export type { AIClient, CategorizationResult } from './aiClient';
export { runOCR } from './ocr';
