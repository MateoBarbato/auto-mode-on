import OpenAI from 'openai';
import { ExtractedTask } from '../types';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `You are a task extraction assistant for an NGO team.
Extract task commitments from WhatsApp messages and return ONLY strict JSON — no markdown, no prose outside the JSON object.

Rules:
- owner: person committing (use sender name for first-person, e.g. "yo" / "me encargo")
- task_title: concise title in the same language as the message
- due_date: resolve relative dates using today's date, return YYYY-MM-DD or null
- priority: low | normal | high | urgent (default normal; urgent = very imminent deadline)
- confidence: 0.0 to 1.0

Return exactly this JSON shape:
{"intent":"task_creation","owner":"...","task_title":"...","description":null,"due_date":null,"status":"pending","priority":"normal","confidence":0.9}`;

export async function extractTask(
  messageBody: string,
  senderName: string,
): Promise<ExtractedTask> {
  const today = new Date().toISOString().split('T')[0];

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: 512,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: `${SYSTEM_PROMPT}\n\nToday: ${today}` },
      { role: 'user', content: `Sender: ${senderName}\nMessage: ${messageBody}` },
    ],
  });

  const raw = response.choices[0].message.content ?? '{}';
  return JSON.parse(raw) as ExtractedTask;
}
