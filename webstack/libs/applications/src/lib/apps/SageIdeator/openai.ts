/**
 * Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

// ─── OpenAI helpers ──────────────────────────────────────────────────────────

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

export const MODELS = ['gpt-5.4-mini', 'gpt-5.2', 'gpt-4o-mini', 'gpt-4o', 'gpt-3.5-turbo'];

async function openAIChat(
  systemPrompt: string,
  userPrompt: string,
  apiKey: string,
  model: string,
  temperature = 0.7
): Promise<string> {
  const resp = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature,
    }),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error((err as any)?.error?.message || resp.statusText);
  }
  const data = await resp.json();
  return data.choices[0].message.content as string;
}

const JSON_SYSTEM =
  'You are a helpful assistant. Return ONLY valid JSON with no extra text, markdown, or code fences.';

const PROSE_SYSTEM =
  'You are a creative brainstorming assistant. Generate imaginative, practical, and diverse ideas. Write in clear, engaging, human-readable prose. Do not use JSON, bullet points, or structured formatting — write in natural paragraphs.';

async function callChatAPI(userPrompt: string, apiKey: string, model: string, temperature = 0.7): Promise<string> {
  return openAIChat(JSON_SYSTEM, userPrompt, apiKey, model, temperature);
}

export async function callProseAPI(userPrompt: string, apiKey: string, model: string, temperature = 0.7): Promise<string> {
  return openAIChat(PROSE_SYSTEM, userPrompt, apiKey, model, temperature);
}

function extractJSON(text: string): string {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}') + 1;
  if (start === -1 || end === 0) throw new Error('No JSON object found in response');
  return text.slice(start, end);
}

export async function generateDimensionsFromPrompt(
  prompt: string,
  apiKey: string,
  model: string,
  numDims: number
): Promise<{ categorical: Record<string, string[]>; ordinal: Record<string, string[]> }> {
  const nominalDef = `A nominal dimension contains categorical values that are qualitative and distinct — no right answer. Good examples for brainstorming: Approach, Stakeholder, Domain, Format, Timeframe, Constraint, Innovation Type. Do NOT use: Quality, Clarity, Grammar, Length.\n\n`;
  const ordinalDef = `An ordinal dimension contains values measured in order (e.g., least → most). Good examples for brainstorming: Feasibility, Novelty, Scope, Risk Level, Resource Intensity. Do NOT use: Quality, Creativity, Length.\n\n`;

  const catMsg =
    `${nominalDef}List ${numDims} nominal dimensions and 4 possible values each for the prompt: "${prompt}"` +
    `\nReturn ONLY this JSON (${numDims} items):\n{"<dim1>":["v1","v2","v3","v4"],...}`;

  const ordMsg =
    `${ordinalDef}List ${numDims} ordinal dimensions for the prompt: "${prompt}"` +
    `\nReturn ONLY this JSON:\n{"<dim>":["<lowest>","less","neutral","more","<highest>"]}`;

  const [catRaw, ordRaw] = await Promise.all([
    callChatAPI(catMsg, apiKey, model),
    callChatAPI(ordMsg, apiKey, model),
  ]);

  let categorical: Record<string, string[]> = {};
  let ordinal: Record<string, string[]> = {};
  try { categorical = JSON.parse(extractJSON(catRaw)); } catch { /* use empty */ }
  try { ordinal = JSON.parse(extractJSON(ordRaw)); } catch { /* use empty */ }

  return { categorical, ordinal };
}

export async function generateNodeContent(
  prompt: string,
  requirements: string,
  apiKey: string,
  model: string
): Promise<string> {
  const msg = `Brainstorming prompt: ${prompt}\n\nIdea constraints:\n${requirements}\n\nDescribe one specific, actionable idea that satisfies all constraints in 1–2 natural paragraphs (up to 150 words). Be concrete and practical. Write as flowing prose, not lists or JSON.`;
  return callProseAPI(msg, apiKey, model, 0.8);
}

export async function abstractNode(
  text: string,
  apiKey: string,
  model: string
): Promise<{ Title: string; Summary: string; Keywords: string[]; Steps: string[]; Structure: string }> {
  const msg =
    `Given the following idea text, return a structured JSON summary.\nText: ${text}\n` +
    `Rules: title ≤ 5 words, summary ≤ 20 words, 3–5 concrete action steps, ≤ 5 keywords.\n` +
    `Return ONLY valid JSON:\n` +
    `{"Title":"<title>","Summary":"<one sentence>","Steps":["Do X","Do Y","Do Z"],"Key Words":["w1","w2"]}`;
  const raw = await callChatAPI(msg, apiKey, model, 0);
  try {
    const j = JSON.parse(extractJSON(raw));
    return {
      Title: (j['Title'] as string) || '',
      Summary: (j['Summary'] as string) || '',
      Keywords: Array.isArray(j['Key Words']) ? (j['Key Words'] as string[]) : [],
      Steps: Array.isArray(j['Steps']) ? (j['Steps'] as string[]) : [],
      Structure: (j['Structure'] as string) || '',
    };
  } catch {
    return { Title: text.slice(0, 30), Summary: text.slice(0, 80) + '…', Keywords: [], Steps: [], Structure: '' };
  }
}

export function buildRequirements(dims: {
  categorical: Record<string, string[]>;
  ordinal: Record<string, string[]>;
}): {
  requirements: string;
  categorical: Record<string, string>;
  ordinal: Record<string, string>;
} {
  let req = '';
  const categorical: Record<string, string> = {};
  const ordinal: Record<string, string> = {};
  Object.entries(dims.categorical).forEach(([name, values]) => {
    const v = values[Math.floor(Math.random() * values.length)];
    req += `${name}: ${v}\n`;
    categorical[name] = v;
  });
  Object.entries(dims.ordinal).forEach(([name, values]) => {
    const v = values[Math.floor(Math.random() * values.length)];
    req += `${name}: ${v}\n`;
    ordinal[name] = v;
  });
  return { requirements: req, categorical, ordinal };
}
