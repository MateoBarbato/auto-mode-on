import express from 'express';
import whatsappRouter from './routes/whatsapp';

const app = express();
const PORT = process.env.PORT ?? 3000;

app.use(express.urlencoded({ extended: false })); // Twilio sends form-encoded bodies
app.use(express.json());

app.use('/whatsapp', whatsappRouter);

app.get('/health', (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
