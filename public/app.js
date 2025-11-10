// public/app.js

// ================== الإعدادات ==================
const API_BASE = "https://durra-server.onrender.com"; // عدّليها إذا اسم خدمتك مختلف

// ================== عناصر الصفحة ==================
const elInput  = document.getElementById("textInput");
const elSend   = document.getElementById("btnSend") || document.querySelector("[data-send]");
const elAnswer = document.getElementById("answer");
const elStatus = document.getElementById("serverStatus"); // اختياري لو موجود

// ============== دالة تنظيف نص الإجابة ==============
function cleanAnswer(text) {
  if (!text) return "";

  let t = String(text);

  // إزالة أقواس LaTeX مثل \( \)
  t = t.replace(/\\\(/g, "").replace(/\\\)/g, "");

  // إزالة النجوم **النص**
  t = t.replace(/\*\*(.*?)\*\*/g, "$1");

  // تحويل \frac{2}{3} إلى (2⁄3)
  t = t.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, "($1⁄$2)");

  // \times -> ×  و  \div -> ÷
  t = t.replace(/\\times/g, " × ").replace(/\\div/g, " ÷ ");

  // إزالة الباك سلاش قبل الأقواس
  t = t.replace(/\\([{}\[\]])/g, "$1");

  // ترتيب المسافات والأسطر
  t = t.replace(/[ \t]+/g, " ");
  t = t.replace(/\n{3,}/g, "\n\n");

  return t.trim();
}

// ============== فحص اتصال الخادم ==============
async function ping() {
  try {
    const r = await fetch(`${API_BASE}/health`, { cache: "no-store" });
    const j = await r.json();

    if (elStatus) {
      elStatus.textContent =
        j && j.status === "server running" ? "متصل ✅" : "غير متصل ⚠";
    }

    return true;
  } catch (err) {
    if (elStatus) elStatus.textContent = "غير متصل ⚠";
    console.error("PING_ERROR:", err);
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
    const res = await fetch(`${API_BASE}/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      console.error("HTTP_ERROR:", res.status, txt);
      show("صار خطأ في الخادم، جرّبي مرة ثانية.");
      return;
    }

    const data = await res.json();
    show((data && data.answer) || "ما وصلت إجابة من الخادم.");
  } catch (err) {
    console.error("ASK_ERROR:", err);
    show("صار خطأ بالاتصال، جرّبي ثانية.");
  }
}

// ============== عرض النص في صندوق الإجابة ==============
function show(text) {
  if (elAnswer) {
    elAnswer.textContent = cleanAnswer(text);
  }
}

// ============== أحداث الواجهة ==============
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
