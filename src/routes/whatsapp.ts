import { Router, Request, Response } from 'express';
import { extractTask } from '../services/openai';
import { confirmationReply, clarificationReply } from '../services/twiml';
import { TwilioWebhookBody } from '../types';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
  const { Body, From, ProfileName } = req.body as TwilioWebhookBody;

  res.setHeader('Content-Type', 'text/xml');

  try {
    const task = await extractTask(Body, ProfileName ?? From);

    if (task.confidence < 0.6) {
      return res.send(clarificationReply());
    }

    return res.send(confirmationReply(task));
  } catch (err) {
    console.error('Extraction error:', err);
    return res.send(clarificationReply());
  }
});

export default router;
