// public/app.js

// رابط الخادم
const API_BASE = "https://durra-server.onrender.com";

// عناصر الواجهة
const elInput  = document.getElementById("textInput");
const elSend   = document.getElementById("btnSend") || document.querySelector("[data-send]");
const elAnswer = document.getElementById("answer");
const elStatus = document.getElementById("serverStatus");

// دالة عرض النص في صندوق الإجابة
function show(text) {
  if (elAnswer) {
    elAnswer.textContent = text;
  }
}

// فحص اتصال الخادم
async function ping() {
  try {
    if (!elStatus) return;

    elStatus.textContent = "جارٍ فحص الاتصال…";

    const r = await fetch(API_BASE + "/health", { cache: "no-store" });
    const j = await r.json();

    elStatus.textContent =
      j && j.status === "server running" ? "✅ متصل" : "⚠️ غير متصل";
  } catch (err) {
    console.error("PING_ERROR:", err);
    if (elStatus) elStatus.textContent = "⚠️ غير متصل";
  }
}

// إرسال السؤال إلى /api/chat
async function ask(question) {
  if (!question || !question.trim()) {
    show("اكتبي سؤالك أولاً…");
    return;
  }

  show("… جاري التفكير");

  try {
    const res = await fetch(API_BASE + "/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: question,
        history: [] // بدون محادثة سابقة الآن
      }),
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      console.error("HTTP_ERROR:", res.status, txt);
      show("⚠️ خطأ من الخادم (HTTP " + res.status + ")");
      return;
    }

    const data = await res.json();
    // السيرفر يرجع { reply: "النص" }
    show((data && data.reply) || "ما وصلت إجابة من الخادم.");

  } catch (err) {
    console.error("ASK_ERROR:", err);
    show("⚠️ صار خطأ بالاتصال، جربي مرة ثانية.");
  }
}

// ربط زر الإرسال
if (elSend) {
  elSend.addEventListener("click", function () {
    ask(elInput ? elInput.value : "");
  });
}

// الإرسال بزر Enter
if (elInput) {
  elInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      ask(elInput.value);
    }
  });
}

// تشغيل فحص الاتصال أول ما تفتح الصفحة
ping();
// public/app.js

// رابط الخادم
const API_BASE = "https://durra-server.onrender.com";

// عناصر الواجهة
const elInput  = document.getElementById("textInput");
const elSend   = document.getElementById("btnSend") || document.querySelector("[data-send]");
const elAnswer = document.getElementById("answer");
const elStatus = document.getElementById("serverStatus");

// دالة عرض النص في صندوق الإجابة
function show(text) {
  if (elAnswer) {
    elAnswer.textContent = text;
  }
}

// فحص اتصال الخادم
async function ping() {
  try {
    if (!elStatus) return;

    elStatus.textContent = "جارٍ فحص الاتصال…";

    const r = await fetch(API_BASE + "/health", { cache: "no-store" });
    const j = await r.json();

    elStatus.textContent =
      j && j.status === "server running" ? "✅ متصل" : "⚠️ غير متصل";
  } catch (err) {
    console.error("PING_ERROR:", err);
    if (elStatus) elStatus.textContent = "⚠️ غير متصل";
  }
}

// إرسال السؤال إلى /api/chat
async function ask(question) {
  if (!question || !question.trim()) {
    show("اكتبي سؤالك أولاً…");
    return;
  }

  show("… جاري التفكير");

  try {
    const res = await fetch(API_BASE + "/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: question,
        history: [] // بدون محادثة سابقة الآن
      }),
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      console.error("HTTP_ERROR:", res.status, txt);
      show("⚠️ خطأ من الخادم (HTTP " + res.status + ")");
      return;
    }

    const data = await res.json();
    // السيرفر يرجع { reply: "النص" }
    show((data && data.reply) || "ما وصلت إجابة من الخادم.");

  } catch (err) {
    console.error("ASK_ERROR:", err);
    show("⚠️ صار خطأ بالاتصال، جربي مرة ثانية.");
  }
}

// ربط زر الإرسال
if (elSend) {
  elSend.addEventListener("click", function () {
    ask(elInput ? elInput.value : "");
  });
}

// الإرسال بزر Enter
if (elInput) {
  elInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      ask(elInput.value);
    }
  });
}

// تشغيل فحص الاتصال أول ما تفتح الصفحة
ping();
// public/app.js

// رابط الخادم
const API_BASE = "https://durra-server.onrender.com";

// عناصر الواجهة
const elInput  = document.getElementById("textInput");
const elSend   = document.getElementById("btnSend") || document.querySelector("[data-send]");
const elAnswer = document.getElementById("answer");
const elStatus = document.getElementById("serverStatus");

// دالة عرض النص في صندوق الإجابة
function show(text) {
  if (elAnswer) {
    elAnswer.textContent = text;
  }
}

// فحص اتصال الخادم
async function ping() {
  try {
    if (!elStatus) return;

    elStatus.textContent = "جارٍ فحص الاتصال…";

    const r = await fetch(API_BASE + "/health", { cache: "no-store" });
    const j = await r.json();

    elStatus.textContent =
      j && j.status === "server running" ? "✅ متصل" : "⚠️ غير متصل";
  } catch (err) {
    console.error("PING_ERROR:", err);
    if (elStatus) elStatus.textContent = "⚠️ غير متصل";
  }
}

// إرسال السؤال إلى /api/chat
async function ask(question) {
  if (!question || !question.trim()) {
    show("اكتبي سؤالك أولاً…");
    return;
  }

  show("… جاري التفكير");

  try {
    const res = await fetch(API_BASE + "/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: question,
        history: [] // بدون محادثة سابقة الآن
      }),
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      console.error("HTTP_ERROR:", res.status, txt);
      show("⚠️ خطأ من الخادم (HTTP " + res.status + ")");
      return;
    }

    const data = await res.json();
    // السيرفر يرجع { reply: "النص" }
    show((data && data.reply) || "ما وصلت إجابة من الخادم.");

  } catch (err) {
    console.error("ASK_ERROR:", err);
    show("⚠️ صار خطأ بالاتصال، جربي مرة ثانية.");
  }
}

// ربط زر الإرسال
if (elSend) {
  elSend.addEventListener("click", function () {
    ask(elInput ? elInput.value : "");
  });
}

// الإرسال بزر Enter
if (elInput) {
  elInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      ask(elInput.value);
    }
  });
}

// تشغيل فحص الاتصال أول ما تفتح الصفحة
ping();
// public/app.js

// رابط الخادم
const API_BASE = "https://durra-server.onrender.com";

// عناصر الواجهة
const elInput  = document.getElementById("textInput");
const elSend   = document.getElementById("btnSend") || document.querySelector("[data-send]");
const elAnswer = document.getElementById("answer");
const elStatus = document.getElementById("serverStatus");

// دالة عرض النص في صندوق الإجابة
function show(text) {
  if (elAnswer) {
    elAnswer.textContent = text;
  }
}

// فحص اتصال الخادم
async function ping() {
  try {
    if (!elStatus) return;

    elStatus.textContent = "جارٍ فحص الاتصال…";

    const r = await fetch(API_BASE + "/health", { cache: "no-store" });
    const j = await r.json();

    elStatus.textContent =
      j && j.status === "server running" ? "✅ متصل" : "⚠️ غير متصل";
  } catch (err) {
    console.error("PING_ERROR:", err);
    if (elStatus) elStatus.textContent = "⚠️ غير متصل";
  }
}

// إرسال السؤال إلى /api/chat
async function ask(question) {
  if (!question || !question.trim()) {
    show("اكتبي سؤالك أولاً…");
    return;
  }

  show("… جاري التفكير");

  try {
    const res = await fetch(API_BASE + "/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: question,
        history: [] // بدون محادثة سابقة الآن
      }),
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      console.error("HTTP_ERROR:", res.status, txt);
      show("⚠️ خطأ من الخادم (HTTP " + res.status + ")");
      return;
    }

    const data = await res.json();
    // السيرفر يرجع { reply: "النص" }
    show((data && data.reply) || "ما وصلت إجابة من الخادم.");

  } catch (err) {
    console.error("ASK_ERROR:", err);
    show("⚠️ صار خطأ بالاتصال، جربي مرة ثانية.");
  }
}

// ربط زر الإرسال
if (elSend) {
  elSend.addEventListener("click", function () {
    ask(elInput ? elInput.value : "");
  });
}

// الإرسال بزر Enter
if (elInput) {
  elInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      ask(elInput.value);
    }
  });
}

// تشغيل فحص الاتصال أول ما تفتح الصفحة
ping();
