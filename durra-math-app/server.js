// server.js — fixed & debug-friendly
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;
const OPENAI_KEY = process.env.OPENAI_API_KEY;
const MODEL = process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini';

if (!OPENAI_KEY) {
  console.error('⚠️ OPENAI_API_KEY غير موجود في .env. أضف OPENAI_API_KEY ثم أعد التشغيل.');
  // لا نغلق الخادم كي تبقى الواجهة تعمل وتظهر تحذيراً بدلاً من التعطل
}

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

// Endpoint for health check
app.get('/ping', (req, res) => res.json({ ok: true, model: MODEL, hasKey: Boolean(OPENAI_KEY) }));

// Helper: call OpenAI Chat Completions REST
async function openaiChat(messages, model = MODEL) {
  if (!OPENAI_KEY) {
    return { error: { message: 'OPENAI_API_KEY مفقود في الخادم' } };
  }
  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.0,
      max_tokens: 1000,
    }),
  });
  const data = await resp.json().catch(() => ({}));
  return { status: resp.status, ok: resp.ok, data };
}

// Restrict to math only by simple system message (optional)
const systemPrompt = 'أنت معلمة رياضيات ذكية. جاوبي حصرياً على أسئلة الرياضيات باللغة العربية وباختصار واضح وخطوات صحيحة. إذا كان السؤال خارج الرياضيات، اعتذري واطلبي سؤالاً رياضياً.';

app.post('/api/chat', async (req, res) => {
  try {
    const { message, history } = req.body || {};
    if (!message) return res.status(400).json({ error: 'حقل message مطلوب' });

    const messages = [{ role: 'system', content: systemPrompt }];
    if (Array.isArray(history)) {
      for (const h of history) {
        if (h.user) messages.push({ role: 'user', content: h.user });
        if (h.assistant) messages.push({ role: 'assistant', content: h.assistant });
      }
    }
    messages.push({ role: 'user', content: message });

    const result = await openaiChat(messages);
    if (result.error) {
      console.error('OpenAI missing key error:', result.error);
      return res.status(500).json({ error: 'مفقود مفتاح OpenAI على الخادم', details: result.error });
    }
    if (!result.ok) {
      console.error('OpenAI API error', result.status, result.data);
      return res.status(502).json({ error: 'خطأ من مزوِّد الخدمة', status: result.status, details: result.data });
    }
    const reply = result.data?.choices?.[0]?.message?.content ?? null;
    if (!reply) {
      console.warn('Unexpected OpenAI response shape:', result.data);
      return res.json({ reply: null, raw: result.data });
    }
    res.json({ reply });
  } catch (e) {
    console.error('Server /api/chat error:', e);
    res.status(500).json({ error: 'خطأ داخلي في الخادم', message: String(e) });
  }
});

// Serve static frontend
app.use(express.static(path.join(__dirname, 'public')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, () => {
  console.log(`🚀 Durra Math listening on http://localhost:${PORT}`);
});
