import { ExtractedTask } from '../types';

export function confirmationReply(task: ExtractedTask): string {
  const datePart = task.due_date ? ` — ${task.due_date}` : '';
  const body = `Registré: ${task.task_title}${datePart}. Confirmas?`;
  return twimlMessage(body);
}

export function clarificationReply(): string {
  return twimlMessage('No entendí bien. ¿Me podés repetir qué hay que hacer y para cuándo?');
}

function twimlMessage(body: string): string {
  return `<Response><Message>${body}</Message></Response>`;
}
