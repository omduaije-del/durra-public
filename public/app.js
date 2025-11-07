// يمنع تغيّر الصفحة ويطلب POST إلى /ask ثم يعرض الإجابة
const form = document.getElementById('askForm');
const input = document.getElementById('question');
const sendBtn = document.getElementById('sendBtn');
const answerBox = document.getElementById('answer');

form.addEventListener('submit', async (e) => {
  e.preventDefault();              // أهم سطر: لا تخلّي المتصفح يروح إلى /ask
  const question = (input.value || '').trim();
  if (!question) return;

  sendBtn.disabled = true;
  answerBox.textContent = '...جاري التفكير';

  try {
    const res = await fetch('/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question })
    });

    // إذا جاءت صفحة HTML بدل JSON (مثلاً بالغلط)، لا تكسّر
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { data = { error: text }; }

    if (data.answer) {
      answerBox.textContent = data.answer;
    } else if (data.msg) {
      answerBox.textContent = data.msg;
    } else if (data.error) {
      answerBox.textContent = 'خطأ: ' + data.error;
    } else {
      answerBox.textContent = 'لم يصل رد مفهوم من الخادم.';
    }
  } catch (err) {
    answerBox.textContent = 'تعذر الاتصال بالخادم.';
  } finally {
    sendBtn.disabled = false;
  }
});
