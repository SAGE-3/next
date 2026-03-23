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

// Models that support vision (image input)
export const VISION_MODELS = new Set(['gpt-5.4-mini', 'gpt-5.2', 'gpt-4o-mini', 'gpt-4o']);

async function openAIChat(
  systemPrompt: string,
  userPrompt: string,
  apiKey: string,
  model: string,
  temperature = 0.7,
  imageBase64?: string
): Promise<string> {
  // Build user message content — plain text or multimodal when image is attached
  const userContent = imageBase64
    ? [
        { type: 'text', text: userPrompt },
        { type: 'image_url', image_url: { url: imageBase64 } },
      ]
    : userPrompt;

  const resp = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      temperature,
    }),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error((err as { error?: { message?: string } })?.error?.message || resp.statusText);
  }
  const data = await resp.json();
  return data.choices[0].message.content as string;
}

const JSON_SYSTEM =
  'You are a helpful assistant. Return ONLY valid JSON with no extra text, markdown, or code fences.';

const PROSE_SYSTEM =
  'You are a creative brainstorming assistant. Generate imaginative, practical, and diverse ideas. Write in clear, engaging, human-readable prose. Do not use JSON, bullet points, or structured formatting — write in natural paragraphs.';

async function callChatAPI(
  userPrompt: string, apiKey: string, model: string, temperature = 0.7, imageBase64?: string
): Promise<string> {
  return openAIChat(JSON_SYSTEM, userPrompt, apiKey, model, temperature, imageBase64);
}

export async function callProseAPI(
  userPrompt: string, apiKey: string, model: string, temperature = 0.7, imageBase64?: string
): Promise<string> {
  return openAIChat(PROSE_SYSTEM, userPrompt, apiKey, model, temperature, imageBase64);
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
  numDims: number,
  imageBase64?: string
): Promise<{ categorical: Record<string, string[]>; ordinal: Record<string, string[]> }> {
  const nominalDef = `A nominal dimension contains categorical values that are qualitative and distinct — no right answer. Good examples for brainstorming: Approach, Stakeholder, Domain, Format, Timeframe, Constraint, Innovation Type. Do NOT use: Quality, Clarity, Grammar, Length.\n\n`;
  const ordinalDef = `An ordinal dimension contains values measured in order (e.g., least → most). Good examples for brainstorming: Feasibility, Novelty, Scope, Risk Level, Resource Intensity. Do NOT use: Quality, Creativity, Length.\n\n`;

  const imageNote = imageBase64
    ? `An image has been provided for inspiration — use it to inform relevant dimensions, but keep them broadly applicable and diverse.\n\n`
    : '';

  const catMsg =
    `${imageNote}${nominalDef}List ${numDims} nominal dimensions and 4 possible values each for the prompt: "${prompt}"` +
    `\nReturn ONLY this JSON (${numDims} items):\n{"<dim1>":["v1","v2","v3","v4"],...}`;

  const ordMsg =
    `${imageNote}${ordinalDef}List ${numDims} ordinal dimensions for the prompt: "${prompt}"` +
    `\nReturn ONLY this JSON:\n{"<dim>":["<lowest>","less","neutral","more","<highest>"]}`;

  const [catRaw, ordRaw] = await Promise.all([
    callChatAPI(catMsg, apiKey, model, 0.7, imageBase64),
    callChatAPI(ordMsg, apiKey, model, 0.7, imageBase64),
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
  model: string,
  imageBase64?: string
): Promise<string> {
  const imageNote = imageBase64
    ? `An image has been provided for inspiration — let it loosely inform the mood, context, or aesthetic of your idea, but do not describe or analyse it directly. Remain diverse and imaginative.\n\n`
    : '';
  const msg = `${imageNote}Brainstorming prompt: ${prompt}\n\nIdea constraints:\n${requirements}\n\nDescribe one specific, actionable idea that satisfies all constraints in 1–2 natural paragraphs (up to 150 words). Be concrete and practical. Write as flowing prose, not lists or JSON.`;
  return callProseAPI(msg, apiKey, model, 0.8, imageBase64);
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

// ─── Image generation ────────────────────────────────────────────────────────

const DALLE_URL = 'https://api.openai.com/v1/images/generations';

export async function generateNodeImage(
  title: string,
  summary: string,
  keywords: string[],
  apiKey: string
): Promise<string> {
  const prompt =
    `A conceptual illustration representing an idea titled "${title}". ` +
    `${summary} ` +
    `Visual themes: ${keywords.join(', ')}. ` +
    `Abstract, minimal, clean design. No text, labels, or words.`;
  const resp = await fetch(DALLE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: 'dall-e-3', prompt, n: 1, size: '1024x1024', response_format: 'url' }),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error((err as { error?: { message?: string } })?.error?.message || resp.statusText);
  }
  const data = await resp.json();
  return (data as { data: { url: string }[] }).data[0].url;
}

// ─── Favorites summary ────────────────────────────────────────────────────────

export async function summarizeFavorites(
  nodes: Array<{ Title: string; Summary: string; Keywords: string[] }>,
  prompt: string,
  apiKey: string,
  model: string
): Promise<string> {
  const nodeList = nodes.map((n, i) => `${i + 1}. "${n.Title}": ${n.Summary}`).join('\n');
  const msg =
    `Brainstorming topic: "${prompt}"\n\n` +
    `These ideas were favorited:\n${nodeList}\n\n` +
    `Write a concise synthesis with three clearly labeled sections (2–3 sentences each):\n` +
    `Common Themes — what do these ideas share?\n` +
    `Key Contrasts — how do they meaningfully differ?\n` +
    `Synthesis — what single direction or key insight emerges from combining them?\n\n` +
    `Write in flowing prose. Do not use JSON, markdown symbols, or bullet points.`;
  return callProseAPI(msg, apiKey, model, 0.7);
}

// ─── User-defined dimension generation ───────────────────────────────────────

export async function generateUserDimension(
  dimName: string,
  prompt: string,
  nodes: Array<{ ID: string; Title: string; Summary: string }>,
  apiKey: string,
  model: string
): Promise<{
  type: 'categorical' | 'ordinal';
  values: string[];
  assignments: Record<string, string>;
}> {
  // Step 1: generate type + values for the new dimension
  const typeMsg =
    `Brainstorming topic: "${prompt}"\n` +
    `A user wants to add a dimension called "${dimName}" to evaluate ideas.\n` +
    `Decide if it is categorical (distinct qualitative options) or ordinal (ranked low→high).\n` +
    `Suggest exactly 4 values.\n` +
    `Return ONLY valid JSON: {"type":"categorical","values":["v1","v2","v3","v4"]}`;

  const typeRaw = await callChatAPI(typeMsg, apiKey, model, 0);
  let type: 'categorical' | 'ordinal' = 'categorical';
  let values: string[] = [];
  try {
    const j = JSON.parse(extractJSON(typeRaw));
    type = j.type === 'ordinal' ? 'ordinal' : 'categorical';
    values = Array.isArray(j.values) ? j.values.slice(0, 4) : [];
  } catch { /* use defaults */ }
  if (values.length === 0) values = ['Low', 'Medium', 'High', 'Very High'];

  // Step 2: assign a value to each existing node in one batch call
  const nodeList = nodes
    .map((n) => `- ID: ${n.ID} | Title: "${n.Title}" | Summary: "${n.Summary}"`)
    .join('\n');
  const assignMsg =
    `Dimension: "${dimName}" (${type})\n` +
    `Values: ${JSON.stringify(values)}\n\n` +
    `Assign each idea exactly one value from the list above.\n` +
    `Ideas:\n${nodeList}\n\n` +
    `Return ONLY valid JSON mapping each ID to its assigned value:\n{"<id>":"<value>",...}`;

  const assignRaw = await callChatAPI(assignMsg, apiKey, model, 0);
  let assignments: Record<string, string> = {};
  try {
    assignments = JSON.parse(extractJSON(assignRaw));
  } catch { /* assignments stay empty — nodes get first value as fallback */ }

  return { type, values, assignments };
}
