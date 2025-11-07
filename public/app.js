// === Durra Frontend (نهائي) ===
// نستخدم رابط السيرفر مباشرة لتفادي أي مشاكل Redirects
const API_BASE = "https://durra-server.onrender.com";

const form = document.querySelector("form");
const input = document.querySelector("input");
const out   = document.querySelector(".result") || document.getElementById("answer");
const btn   = document.querySelector('button[type="submit"]');

if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();                     // منع تبديل الصفحة
    const question = (input?.value || "").trim();
    if (!question) { if(out) out.textContent = "اكتبي سؤالك أولاً."; return; }

    if (btn) btn.disabled = true;
    if (out) out.textContent = "⏳ جاري الإرسال…";

    try {
      const res = await fetch(`${API_BASE}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question })
      });

      const text = await res.text();        // نتعامل مع أي رد (JSON/نص)
      let data; try { data = JSON.parse(text); } catch { data = { answer: text }; }

      if (res.ok && (data.answer || data.msg)) {
        if (out) out.textContent = data.answer || data.msg;
      } else {
        const msg = (data && (data.error || data.message)) || `HTTP ${res.status}`;
        if (out) out.textContent = "⚠️ " + msg;
      }
    } catch (err) {
      if (out) out.textContent = "🚨 تعذّر الاتصال بالسيرفر.";
      console.error(err);
    } finally {
      if (btn) btn.disabled = false;
    }
  });
}

// حماية إضافية: لو كان عندك <form action="/ask"> نشيله نهائيًا
if (form && form.getAttribute("action")) form.removeAttribute("action");
