// public/app.js

// ================== الإعدادات ==================
const API_BASE = "https://durra-server.onrender.com"; // عدّليها إذا اسم خدمتك مختلف

// عناصر الصفحة
const elInput   = document.getElementById("textInput");
const elSend    = document.getElementById("btnSend") || document.querySelector("[data-send]");
const elAnswer  = document.getElementById("answer");
const elStatus  = document.getElementById("serverStatus"); // اختياري لو موجود

// ============== فحص اتصال الخادم ==============
async function ping() {
  try {
    const r = await fetch(${API_BASE}/health, { cache: "no-store" });
    const j = await r.json();
    if (elStatus) elStatus.textContent = j?.status === "server running" ? "متصل ✅" : "غير متصل ⚠";
    return true;
  } catch {
    if (elStatus) elStatus.textContent = "غير متصل ⚠";
    return false;
  }
}

// ============== إرسال السؤال ==============
async function ask(question) {
  if (!question || !question.trim()) {
    show("اكتبي سؤالك…");
    return;
  }

  show("…أفكّر بالإجابة");
  try {
    const res = await fetch(${API_BASE}/ask, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question })
    });

    if (!res.ok) {
      const txt = await res.text().catch(()=> "");
      throw new Error(HTTP ${res.status} ${txt});
    }

    const data = await res.json();
    show(data?.answer || "ما وصلت إجابة من الخادم.");
  } catch (err) {
    show("صار خطأ بالاتصال. جرّبي ثانية.");
    console.error("ASK_ERROR:", err);
  }
}

// ============== أدوات صغيرة ==============
function show(text) {
  if (elAnswer) elAnswer.textContent = text;
}

// أحداث الواجهة
if (elSend) {
  elSend.addEventListener("click", () => ask(elInput.value));
}
if (elInput) {
  elInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") ask(elInput.value);
  });
}

// تشغيل أولي
ping();
