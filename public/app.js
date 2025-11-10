// public/app.js

// ================== الإعدادات ==================
const API_BASE = "https://durra-server.onrender.com"; // عدّليها لو رابط خدمتك مختلف

// ================== عناصر الصفحة ==================
const elInput = document.getElementById("textInput");
const elSend =
  document.getElementById("btnSend") || document.querySelector("[data-send]");
const elAnswer = document.getElementById("answer");
const elStatus = document.getElementById("serverStatus"); // اختياري لو موجود

// ============== فحص اتصال الخادم ==============
async function ping() {
  try {
    const r = await fetch(API_BASE + "/health", { cache: "no-store" });
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
    const res = await fetch(API_BASE + "/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: question }),
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

// ============== دالة عرض النص ==============
function show(text) {
  if (elAnswer) {
    elAnswer.textContent = text;
  }
}

// ============== الأحداث (الأزرار ولوحة المفاتيح) ==============
if (elSend) {
  elSend.addEventListener("click", function () {
    ask(elInput.value);
  });
}

if (elInput) {
  elInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      ask(elInput.value);
    }
  });
}

// ============== تشغيل أولي ==============
ping();// public/app.js

// ================== الإعدادات ==================
const API_BASE = "https://durra-server.onrender.com"; // عدّليها لو رابط خدمتك مختلف

// ================== عناصر الصفحة ==================
const elInput = document.getElementById("textInput");
const elSend =
  document.getElementById("btnSend") || document.querySelector("[data-send]");
const elAnswer = document.getElementById("answer");
const elStatus = document.getElementById("serverStatus"); // اختياري لو موجود

// ============== فحص اتصال الخادم ==============
async function ping() {
  try {
    const r = await fetch(API_BASE + "/health", { cache: "no-store" });
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
    const res = await fetch(API_BASE + "/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: question }),
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

// ============== دالة عرض النص ==============
function show(text) {
  if (elAnswer) {
    elAnswer.textContent = text;
  }
}

// ============== الأحداث (الأزرار ولوحة المفاتيح) ==============
if (elSend) {
  elSend.addEventListener("click", function () {
    ask(elInput.value);
  });
}

if (elInput) {
  elInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      ask(elInput.value);
    }
  });
}

// ============== تشغيل أولي ==============
ping();// public/app.js

// ================== الإعدادات ==================
const API_BASE = "https://durra-server.onrender.com"; // عدّليها لو رابط خدمتك مختلف

// ================== عناصر الصفحة ==================
const elInput = document.getElementById("textInput");
const elSend =
  document.getElementById("btnSend") || document.querySelector("[data-send]");
const elAnswer = document.getElementById("answer");
const elStatus = document.getElementById("serverStatus"); // اختياري لو موجود

// ============== فحص اتصال الخادم ==============
async function ping() {
  try {
    const r = await fetch(API_BASE + "/health", { cache: "no-store" });
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
    const res = await fetch(API_BASE + "/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: question }),
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

// ============== دالة عرض النص ==============
function show(text) {
  if (elAnswer) {
    elAnswer.textContent = text;
  }
}

// ============== الأحداث (الأزرار ولوحة المفاتيح) ==============
if (elSend) {
  elSend.addEventListener("click", function () {
    ask(elInput.value);
  });
}

if (elInput) {
  elInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      ask(elInput.value);
    }
  });
}

// ============== تشغيل أولي ==============
ping();// public/app.js

// ================== الإعدادات ==================
const API_BASE = "https://durra-server.onrender.com"; // عدّليها لو رابط خدمتك مختلف

// ================== عناصر الصفحة ==================
const elInput = document.getElementById("textInput");
const elSend =
  document.getElementById("btnSend") || document.querySelector("[data-send]");
const elAnswer = document.getElementById("answer");
const elStatus = document.getElementById("serverStatus"); // اختياري لو موجود

// ============== فحص اتصال الخادم ==============
async function ping() {
  try {
    const r = await fetch(API_BASE + "/health", { cache: "no-store" });
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
    const res = await fetch(API_BASE + "/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: question }),
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

// ============== دالة عرض النص ==============
function show(text) {
  if (elAnswer) {
    elAnswer.textContent = text;
  }
}

// ============== الأحداث (الأزرار ولوحة المفاتيح) ==============
if (elSend) {
  elSend.addEventListener("click", function () {
    ask(elInput.value);
  });
}

if (elInput) {
  elInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      ask(elInput.value);
    }
  });
}

// ============== تشغيل أولي ==============
ping();// public/app.js

// ================== الإعدادات ==================
const API_BASE = "https://durra-server.onrender.com"; // عدّليها لو رابط خدمتك مختلف

// ================== عناصر الصفحة ==================
const elInput = document.getElementById("textInput");
const elSend =
  document.getElementById("btnSend") || document.querySelector("[data-send]");
const elAnswer = document.getElementById("answer");
const elStatus = document.getElementById("serverStatus"); // اختياري لو موجود

// ============== فحص اتصال الخادم ==============
async function ping() {
  try {
    const r = await fetch(API_BASE + "/health", { cache: "no-store" });
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
    const res = await fetch(API_BASE + "/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: question }),
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

// ============== دالة عرض النص ==============
function show(text) {
  if (elAnswer) {
    elAnswer.textContent = text;
  }
}

// ============== الأحداث (الأزرار ولوحة المفاتيح) ==============
if (elSend) {
  elSend.addEventListener("click", function () {
    ask(elInput.value);
  });
}

if (elInput) {
  elInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      ask(elInput.value);
    }
  });
}

// ============== تشغيل أولي ==============
ping();// public/app.js

// ================== الإعدادات ==================
const API_BASE = "https://durra-server.onrender.com"; // عدّليها لو رابط خدمتك مختلف

// ================== عناصر الصفحة ==================
const elInput = document.getElementById("textInput");
const elSend =
  document.getElementById("btnSend") || document.querySelector("[data-send]");
const elAnswer = document.getElementById("answer");
const elStatus = document.getElementById("serverStatus"); // اختياري لو موجود

// ============== فحص اتصال الخادم ==============
async function ping() {
  try {
    const r = await fetch(API_BASE + "/health", { cache: "no-store" });
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
    const res = await fetch(API_BASE + "/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: question }),
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

// ============== دالة عرض النص ==============
function show(text) {
  if (elAnswer) {
    elAnswer.textContent = text;
  }
}

// ============== الأحداث (الأزرار ولوحة المفاتيح) ==============
if (elSend) {
  elSend.addEventListener("click", function () {
    ask(elInput.value);
  });
}

if (elInput) {
  elInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      ask(elInput.value);
    }
  });
}

// ============== تشغيل أولي ==============
ping();
