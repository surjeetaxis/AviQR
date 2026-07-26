const MODEL = 'claude-sonnet-4-6';
const API_URL = '/api/v1/ai/messages';

// Fallback provider — used only when the primary Anthropic call fails (network
// error or non-OK response). If OPENAI_API_KEY isn't configured server-side,
// the gateway forwards "not-configured" as the bearer token and OpenAI itself
// rejects the request, so this fails closed straight through to each feature's
// existing rule-based JS fallback (aiFallback.js) — no behavior change for
// deployments that haven't set up OpenAI.
const OPENAI_MODEL = 'gpt-4o-mini';
const OPENAI_API_URL = '/api/v1/ai-openai/chat/completions';

function authHeaders() {
  const token = localStorage.getItem('aviqr_token');
  return token ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
               : { 'Content-Type': 'application/json' };
}

async function callOpenAI(systemPrompt, userMessage, maxTokens) {
  const res = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      model: OPENAI_MODEL,
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
    }),
  });
  if (!res.ok) throw new Error(`OpenAI fallback error: ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

export async function callAI(systemPrompt, userMessage, maxTokens = 1000) {
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        model: MODEL,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      }),
    });
    if (!res.ok) throw new Error(`AI API error: ${res.status}`);
    const data = await res.json();
    return data.content?.[0]?.text || '';
  } catch (err) {
    return callOpenAI(systemPrompt, userMessage, maxTokens);
  }
}

export async function callAIJson(systemPrompt, userMessage, maxTokens = 1000) {
  const text = await callAI(
    systemPrompt + '\n\nIMPORTANT: Respond ONLY with valid JSON. No markdown, no backticks, no explanation.',
    userMessage,
    maxTokens
  );
  try {
    return JSON.parse(text.replace(/```json|```/g, '').trim());
  } catch {
    return null;
  }
}

async function streamFrom(url, body, onChunk) {
  const res = await fetch(url, { method: 'POST', headers: authHeaders(), body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`AI stream error: ${res.status}`);
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let gotChunk = false;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6);
      if (data === '[DONE]') return;
      try {
        const parsed = JSON.parse(data);
        const delta = parsed.delta?.text || parsed.choices?.[0]?.delta?.content || '';
        if (delta) { gotChunk = true; onChunk(delta); }
      } catch {}
    }
  }
  return gotChunk;
}

export async function callAIStream(systemPrompt, userMessage, onChunk, maxTokens = 1000) {
  try {
    const gotChunk = await streamFrom(API_URL, {
      model: MODEL,
      max_tokens: maxTokens,
      stream: true,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    }, onChunk);
    // Only fall back if the primary stream produced nothing — once any chunk has
    // reached the caller, retrying would duplicate output already shown to the user.
    if (gotChunk) return;
    throw new Error('AI stream produced no output');
  } catch (err) {
    await streamFrom(OPENAI_API_URL, {
      model: OPENAI_MODEL,
      max_tokens: maxTokens,
      stream: true,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
    }, onChunk);
  }
}
