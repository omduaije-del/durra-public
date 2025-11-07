// النسخة النهائية من الواجهة - ذُرّى
const API_BASE = "https://durra-server.onrender.com";

document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector("form");
  const input = document.querySelector("input");
  const output = document.querySelector(".result") || document.getElementById("answer");
  const button = document.querySelector('button[type="submit"]');

  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const question = input.value.trim();
    if (!question) {
      output.textContent = "اكتبي سؤالك أولاً 🌸";
      return;
    }

    button.disabled = true;
    output.textContent = "⏳ جاري التفكير...";

    try {
      const res = await fetch(`${API_BASE}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });

      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        data = { answer: text };
      }

      if (res.ok && (data.answer || data.msg)) {
        output.textContent = data.answer || data.msg;
      } else {
        output.textContent = "⚠️ لم يتم الرد، أعيدي المحاولة.";
      }
    } catch (err) {
      console.error(err);
      output.textContent = "🚨 تعذر الاتصال بالسيرفر.";
    } finally {
      button.disabled = false;
    }
  });
});
