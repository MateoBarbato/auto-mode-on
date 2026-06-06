export interface TwilioWebhookBody {
  Body: string;
  From: string;        // e.g. "whatsapp:+5491122334455"
  To: string;
  ProfileName: string;
  MessageSid: string;
}

export interface ExtractedTask {
  intent: 'task_creation';
  owner: string;
  task_title: string;
  description: string | null;
  due_date: string | null;   // YYYY-MM-DD
  status: 'pending';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  confidence: number;
}
