// public/app.js

// ================== الإعدادات ==================
const API_BASE = "https://durra-server.onrender.com"; // رابط الخادم
const CHAT_PATH = "/ask"; // مسار السؤال في الخادم (لو تغيّر نعدله هنا فقط)

// ================== عناصر الصفحة ==================
const elInput  = document.getElementById("textInput");
const elSend   = document.getElementById("btnSend") || document.querySelector("[data-send]");
const elAnswer = document.getElementById("answer");
const elStatus = document.getElementById("serverStatus"); // اختياري لو موجود

// ================== فحص اتصال الخادم ==================
async function ping() {
  try {
    const r = await fetch(API_BASE + "/health", { cache: "no-store" });
    const j = await r.json();

    if (elStatus) {
      elStatus.textContent =
        j && j.status === "server running" ? "✅ متصل" : "⚠️ غير متصل";
    }

    return true;
  } catch (err) {
    if (elStatus) elStatus.textContent = "⚠️ غير متصل";
    console.error("PING_ERROR:", err);
    return false;
  }
}

// ================== دالة عرض النص ==================
function show(text) {
  if (!elAnswer) return;

  // لو عندك صندوق محادثة، تقدرين تغيّرين هالجزء لاحقًا
  elAnswer.textContent = text;
}

// ================== إرسال السؤال ==================
async function ask(question) {
  if (!question || !question.trim()) {
    show("اكتبي سؤالك الرياضي…");
    return;
  }

  // رسالة مؤقتة
  show("أفكر في حل سؤالك…");

  try {
    const res = await fetch(API_BASE + CHAT_PATH, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: question }),
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      console.error("HTTP_ERROR:", res.status, txt);
      show(`صار خطأ من الخادم (${res.status}).`);
      return;
    }

    const data = await res.json().catch(() => null);

    if (data && data.answer) {
      show(data.answer);
    } else {
      show("ما وصلت إجابة واضحة من الخادم.");
    }
  } catch (err) {
    console.error("ASK_ERROR:", err);
    show("صار خطأ بالاتصال، جربي مرة ثانية.");
  }
}

// ================== الأحداث (الأزرار ولوحة المفاتيح) ==================
if (elSend) {
  elSend.addEventListener("click", function () {
    ask(elInput ? elInput.value : "");
  });
}

if (elInput) {
  elInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      ask(elInput.value);
    }
  });
}

// ================== تشغيل أولي ==================
ping();
