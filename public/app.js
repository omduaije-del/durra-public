// عدلي الرابط إذا كان اسم خدمة السيرفر مختلف
const API_BASE = "https://durra-server.onrender.com";

document.addEventListener("DOMContentLoaded", () => {
  // عناصر الواجهة
  const form = document.querySelector("form.ask");
  const input = document.getElementById("textInput");
  const output = document.getElementById("answer");
  const btnStart = document.getElementById("btnStart");
  const btnStop  = document.getElementById("btnStop");
  const elVoiceQ = document.getElementById("voiceQuestion");
  const elVoiceA = document.getElementById("voiceAnswer");
  const elLang   = document.getElementById("langSelect");
  const sendBtn  = form?.querySelector('button[type="submit"]');

  if (!form || !input || !output) return;

  // ——— التعرف الصوتي (المتصفح فقط)
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recognition = null;
  if (SR) {
    recognition = new SR();
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.lang = elLang.value;

    recognition.onresult = (e) => {
      const txt = e.results[0] && e.results[0][0] ? e.results[0][0].transcript : "";
      if (txt) {
        input.value = txt;
        form.dispatchEvent(new Event("submit"));
      }
    };
    recognition.onend = () => {
      btnStart.disabled = false;
      btnStop.disabled = true;
    };
  } else {
    // لو المتصفح لا يدعم التعرف الصوتي
    btnStart.disabled = true;
    btnStop.disabled  = true;
  }

  // زر ابدأ/إيقاف
  btnStart?.addEventListener("click", () => {
    if (!recognition) return;
    recognition.lang = elLang.value;
    btnStart.disabled = true;
    btnStop.disabled  = false;
    recognition.start();
  });
  btnStop?.addEventListener("click", () => {
    try { recognition && recognition.stop(); } catch {}
    btnStart.disabled = false;
    btnStop.disabled  = true;
  });

  // ——— الإرسال إلى السيرفر
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    let question = input.value.trim();
    if (!question && elVoiceQ.checked) {
      // لو المستخدم محدد “سؤال صوتي” لكن ما استُخدم المايك بعد
      output.textContent = "🎙 فعّلي الميك واضغطي ابدأ ثم تكلّمي، أو اكتبي سؤالك.";
      return;
    }
    if (!question) {
      output.textContent = "اكتبي سؤالك أولاً 🌸";
      return;
    }

    sendBtn.disabled = true;
    output.textContent = "⏳ جاري التفكير...";

    try {
      const res = await fetch(${API_BASE}/ask, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });

      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch { data = { answer: text }; }

      if (res.ok && (data.answer || data.msg)) {
        const ans = (data.answer || data.msg).toString();
        output.textContent = ans;

        // نطق الإجابة
        if (elVoiceA.checked && "speechSynthesis" in window) {
          const utter = new SpeechSynthesisUtterance(ans);
          utter.lang = elLang.value;
          window.speechSynthesis.cancel();
          window.speechSynthesis.speak(utter);
        }
      } else {
        output.textContent = "⚠ لم يتم الرد، أعيدي المحاولة.";
      }
    } catch (err) {
      console.error(err);
      output.textContent = "🚨 تعذر الاتصال بالسيرفر.";
    } finally {
      sendBtn.disabled = false;
    }
  });
});
