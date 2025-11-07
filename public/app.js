// عدلّي هذا لو كان اسم خدمة السيرفر مختلف
const API_BASE = "https://durra-server.onrender.com";

const form = document.getElementById("askForm");
const input = document.getElementById("question");
const out = document.getElementById("answer");

form.addEventListener("submit", async (e) => {
  e.preventDefault(); // يمنع تبديل الصفحة
  const question = (input.value || "").trim();

  if (!question) {
    out.textContent = "اكتبي سؤالك أولاً.";
    return;
  }

  out.textContent = "جاري الإرسال…";

  try {
    const res = await fetch(`${API_BASE}/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question })
    });

    if (!res.ok) {
      // حاول نقرأ رسالة الخطأ من السيرفر
      let msg = `HTTP ${res.status}`;
      try {
        const j = await res.json();
        if (j && j.error) msg = j.error;
      } catch {}
      throw new Error(msg);
    }

    const data = await res.json();
    out.textContent = data.answer || "تم الاستلام ✅";
  } catch (err) {
    console.error(err);
    out.textContent = "صار خطأ أثناء الإرسال. جرّبي مرة ثانية.";
  }
});
