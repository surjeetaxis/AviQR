import * as SecureStore from 'expo-secure-store';
import { BASE_URL } from './index.js';

// Mobile port of aviqr-ui-web's aiClient.js — calls the SAME real gateway
// route (/api/v1/ai/messages, routes[20] in api-gateway, proxied straight to
// https://api.anthropic.com with a server-side ANTHROPIC_API_KEY). Not a
// mock: this is genuine Claude API infrastructure, already live for the web
// app's 11 AI Hub features. If the gateway's ANTHROPIC_API_KEY isn't
// configured (e.g. local dev), Anthropic rejects the call and the caller
// falls back to the rule-based logic in aiFallback.js — same resilience
// pattern the web app already uses, not a mobile-only shortcut.
const MODEL = 'claude-sonnet-4-6';
const API_URL = `${BASE_URL}/api/v1/ai/messages`;

async function authHeaders() {
  const token = await SecureStore.getItemAsync('aviqr_token');
  return token ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } : { 'Content-Type': 'application/json' };
}

export async function callAI(systemPrompt, userMessage, maxTokens = 1000) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, system: systemPrompt, messages: [{ role: 'user', content: userMessage }] }),
  });
  if (!res.ok) throw new Error(`AI API error: ${res.status}`);
  const data = await res.json();
  return data.content?.[0]?.text || '';
}

export async function callAIJson(systemPrompt, userMessage, maxTokens = 1000) {
  const text = await callAI(systemPrompt + '\n\nIMPORTANT: Respond ONLY with valid JSON. No markdown, no backticks, no explanation.', userMessage, maxTokens);
  try { return JSON.parse(text.replace(/```json|```/g, '').trim()); } catch { return null; }
}
