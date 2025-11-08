// public/app.js

// ================== الإعدادات ==================
const API_BASE = "https://durra-server.onrender.com";

// عناصر الصفحة
const elInput  = document.getElementById("textInput");
const elSend   = document.getElementById("btnSend") || document.querySelector("[data-send]");
const elAnswer = document.getElementById("answer");
const elStatus = document.getElementById("serverStatus"); // لو عندك خانة حالة السيرفر

// ============== فحص اتصال الخادم ==============
async function ping() {
  try {
    const r = await fetch(`${API_BASE}/health`, { cache: "no-store" });
    const j = await r.json();

    if (elStatus) {
      if (j && j.status === "server running") {
        elStatus.textContent = "متصل ✅";
      } else {
        elStatus.textContent = "غير متصل ⚠";
      }
    }

    return true;
  } catch (err) {
    console.error("PING_ERROR:", err);
    if (elStatus) {
      elStatus.textContent = "غير متصل ⚠";
    }
    return false;
  }
}

// ============== إرسال السؤال ==============
async function ask(question) {
  const q = (question || "").trim();
  if (!q) {
    show("اكتبي سؤالك…");
    return;
  }

  show("…أفكّر بالإجابة");

  try {
    const res = await fetch(`${API_BASE}/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: q }),
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      console.error("HTTP_ERROR:", res.status, txt);
      show("صار خطأ في الخادم، جرّبي مرة ثانية.");
      return;
    }

    const data = await res.json();
    if (data && data.answer) {
      show(data.answer);
    } else {
      show("ما وصلت إجابة من الخادم.");
    }
  } catch (err) {
    console.error("ASK_ERROR:", err);
    show("صار خطأ بالاتصال، جرّبي ثانية.");
  }
}

// ============== أداة عرض النص ==============
function show(text) {
  if (elAnswer) {
    elAnswer.textContent = text;
  }
}

// أحداث الواجهة
if (elSend && elInput) {
  elSend.addEventListener("click", () => {
    ask(elInput.value);
  });
}

if (elInput) {
  elInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      ask(elInput.value);
    }
  });
}

// تشغيل أولي
ping();
// public/app.js

// ================== الإعدادات ==================
const API_BASE = "https://durra-server.onrender.com";

// عناصر الصفحة
const elInput  = document.getElementById("textInput");
const elSend   = document.getElementById("btnSend") || document.querySelector("[data-send]");
const elAnswer = document.getElementById("answer");
const elStatus = document.getElementById("serverStatus"); // لو عندك خانة حالة السيرفر

// ============== فحص اتصال الخادم ==============
async function ping() {
  try {
    const r = await fetch(`${API_BASE}/health`, { cache: "no-store" });
    const j = await r.json();

    if (elStatus) {
      if (j && j.status === "server running") {
        elStatus.textContent = "متصل ✅";
      } else {
        elStatus.textContent = "غير متصل ⚠";
      }
    }

    return true;
  } catch (err) {
    console.error("PING_ERROR:", err);
    if (elStatus) {
      elStatus.textContent = "غير متصل ⚠";
    }
    return false;
  }
}

// ============== إرسال السؤال ==============
async function ask(question) {
  const q = (question || "").trim();
  if (!q) {
    show("اكتبي سؤالك…");
    return;
  }

  show("…أفكّر بالإجابة");

  try {
    const res = await fetch(`${API_BASE}/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: q }),
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      console.error("HTTP_ERROR:", res.status, txt);
      show("صار خطأ في الخادم، جرّبي مرة ثانية.");
      return;
    }

    const data = await res.json();
    if (data && data.answer) {
      show(data.answer);
    } else {
      show("ما وصلت إجابة من الخادم.");
    }
  } catch (err) {
    console.error("ASK_ERROR:", err);
    show("صار خطأ بالاتصال، جرّبي ثانية.");
  }
}

// ============== أداة عرض النص ==============
function show(text) {
  if (elAnswer) {
    elAnswer.textContent = text;
  }
}

// أحداث الواجهة
if (elSend && elInput) {
  elSend.addEventListener("click", () => {
    ask(elInput.value);
  });
}

if (elInput) {
  elInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      ask(elInput.value);
    }
  });
}

// تشغيل أولي
ping();
// public/app.js

// ================== الإعدادات ==================
const API_BASE = "https://durra-server.onrender.com";

// عناصر الصفحة
const elInput  = document.getElementById("textInput");
const elSend   = document.getElementById("btnSend") || document.querySelector("[data-send]");
const elAnswer = document.getElementById("answer");
const elStatus = document.getElementById("serverStatus"); // لو عندك خانة حالة السيرفر

// ============== فحص اتصال الخادم ==============
async function ping() {
  try {
    const r = await fetch(`${API_BASE}/health`, { cache: "no-store" });
    const j = await r.json();

    if (elStatus) {
      if (j && j.status === "server running") {
        elStatus.textContent = "متصل ✅";
      } else {
        elStatus.textContent = "غير متصل ⚠";
      }
    }

    return true;
  } catch (err) {
    console.error("PING_ERROR:", err);
    if (elStatus) {
      elStatus.textContent = "غير متصل ⚠";
    }
    return false;
  }
}

// ============== إرسال السؤال ==============
async function ask(question) {
  const q = (question || "").trim();
  if (!q) {
    show("اكتبي سؤالك…");
    return;
  }

  show("…أفكّر بالإجابة");

  try {
    const res = await fetch(`${API_BASE}/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: q }),
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      console.error("HTTP_ERROR:", res.status, txt);
      show("صار خطأ في الخادم، جرّبي مرة ثانية.");
      return;
    }

    const data = await res.json();
    if (data && data.answer) {
      show(data.answer);
    } else {
      show("ما وصلت إجابة من الخادم.");
    }
  } catch (err) {
    console.error("ASK_ERROR:", err);
    show("صار خطأ بالاتصال، جرّبي ثانية.");
  }
}

// ============== أداة عرض النص ==============
function show(text) {
  if (elAnswer) {
    elAnswer.textContent = text;
  }
}

// أحداث الواجهة
if (elSend && elInput) {
  elSend.addEventListener("click", () => {
    ask(elInput.value);
  });
}

if (elInput) {
  elInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      ask(elInput.value);
    }
  });
}

// تشغيل أولي
ping();
