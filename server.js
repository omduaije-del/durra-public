import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import OpenAI from 'openai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

// مفاتيح
const PORT = process.env.PORT || 3000;
const CHAT_MODEL = process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini';
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// تحويل أرقام 0-9 إلى عربية-هندية
function toArabicIndicDigits(str = '') {
  return (str + '').replace(/[0-9]/g, (d) => '٠١٢٣٤٥٦٧٨٩'[+d]);
}

// بروفايل دُرى
const SYSTEM_PROMPT = `
أنت "دُرى" معلمة رياضيات ذكية باللغة العربية الفصحى فقط.
- اشرحي بخطوات قصيرة وواضحة، ثم أعطي الناتج النهائي بوضوح.
- دعّمي الإجابة عند الحاجة بصيغة رياضية (LaTeX) ضمن $$ ... $$، لكن لا تبالغي.
- اقبلي أسئلة: الحساب، الجبر، الهندسة، النِسَب، الإحصاء، الاحتمالات، التحليل،
  مسائل كلامية، تبسيط تعابير، معادلات، متباينات، متتاليات، مصفوفات... إلخ.
- الأرقام في الرد تُعرض بالأرقام العربية-الهندية.
- إن كان السؤال خارج الرياضيات فقولي باختصار أنك مختصة بالرياضيات فقط ثم وجّهي للسؤال الرياضي.
`;

// واجهة المحادثة
app.post('/api/chat', async (req, res) => {
  try {
    const { message, history = [] } = req.body || {};
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'الرسالة مطلوبة.' });
    }

    // نبني سجلًا مختصرًا
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...history.flatMap(h => ([
        { role: 'user', content: h.user },
        { role: 'assistant', content: h.assistant }
      ])).slice(-6),
      { role: 'user', content: message }
    ];

    const completion = await client.chat.completions.create({
      model: CHAT_MODEL,
      temperature: 0.2,
      messages
    });

    let text = completion.choices?.[0]?.message?.content || 'عذرًا، لم أفهم الطلب.';
    text = toArabicIndicDigits(text);

    res.json({ reply: text });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'حدث خطأ غير متوقع. تحقّق من الإعدادات ثم أعد المحاولة.' });
  }
});

// تقديم الواجهة الأمامية
app.use(express.static(path.join(__dirname, 'public')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// تشغيل
app.listen(PORT, function () {
  console.log('🚀 دُرى موهوبة الرياضيات تعمل على: http://localhost:' + PORT);
});

