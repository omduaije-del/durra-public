// =======================
// دُرى — واجهة مبسّطة لمعلّمة الرياضيات الذكية
// =======================

const API_BASE = "https://durra-server.onrender.com";

// عناصر الصفحة الأساسية
const elForm =
  document.getElementById("form") ||
  document.querySelector("form");

const elInput =
  document.getElementById("textInput") ||
  document.querySelector("input[type='text'], textarea");

let elMessages =
  document.getElementById("messages") ||
  document.querySelector(".messages");

// لو ما فيه صندوق رسائل، نخلق واحد بسيط تحت الفورم
if (!elMessages && elForm) {
  elMessages = document.createElement("div");
  elMessages.id = "messages";
  elMessages.style.cssText =
    "margin-top:16px;max-height:60vh;overflow-y:auto;padding:18px;border-radius:18px;border:1px solid #e5e7eb;background:#f9fafb;";
  (elForm?.parentElement || document.body).appendChild(elMessages);
}

// أزرار الصوت
let elMicBtn = document.getElementById("btnMic");
let elReadBtn = document.getElementById("btnRead");
let elStopReadBtn = document.getElementById("btnStopRead");

// آخر إجابة من دُرّة (للصوت)
let lastAssistantText = "";

// =======================
// دوال مساعدة للنصوص
// =======================

// إنشاء عنصر
function createEl(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text != null) el.textContent = text;
  return el;
}

// تنسيق الوقت
function fmtTime(date = new Date()) {
  return date.toLocaleTimeString("ar-SA", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// تنظيف النص من الرموز الزائدة
function cleanText(text) {
  if (!text) return "";

  return String(text)
    // إزالة كتل الكود ```...```
    .replace(/```[\s\S]*?```/g, "")
    // إزالة عناوين ماركداون ###
    .replace(/#+\s*/g, "\n")
    // إزالة ** من التنسيق
    .replace(/\*\*/g, "")
    // إزالة أوامر LaTeX الزائدة
    .replace(/\\left|\\right/g, "")
    .replace(/\\cdot/g, " × ")
    .replace(/\\times/g, " × ")
    .replace(/\\div/g, " ÷ ")
    // تحويل "٣ على ٤" أو "3 على 4" إلى 3/4 حتى نرسمها ككسر
    .replace(/([\d\u0660-\u0669]+)\s*على\s*([\d\u0660-\u0669]+)/g, "$1/$2")
    .replace(/\\sqrt/g, " جذر ")
    .replace(/\\pm/g, " ± ")
    .replace(/\\[\[\]\(\)]/g, "")
    // حذف باك-تيك
    .replace(/`/g, "")
    // تقليل المسافات المكرّرة
    .replace(/[ \t]+/g, " ")
    // ترتيب الأسطر الفارغة
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// تحويل الكسور البسيطة مثل 1/2 إلى صيغة أجمل (اختياري)
function renderFractions(text) {
  if (!text) return "";
  return text.replace(/(\d+)\s*\/\s*(\d+)/g, "<span dir='ltr'>$1⁄$2</span>");
}

// =======================
// عرض الرسائل في الواجهة
// =======================

function addMessage(text, role = "assistant") {
  if (!elMessages) return;

  const row = createEl(
    "div",
    "msg-row " + (role === "user" ? "msg-row-user" : "msg-row-bot")
  );

  const bubble = createEl(
    "div",
    "msg-bubble " + (role === "user" ? "msg-user" : "msg-bot")
  );

  const meta = createEl("div", "msg-meta");
  meta.textContent = (role === "user" ? "أنت" : "دُرّة") + " • " + fmtTime();

  const body = createEl("div", "msg-body");
  body.dir = "rtl";

  // تنظيف + تجميل الكسور
  const cleaned = cleanText(text);
  const withFracs = renderFractions(cleaned);
  body.innerHTML = withFracs || "…";

  if (role === "assistant") {
    lastAssistantText = cleaned;
  }

  bubble.appendChild(meta);
  bubble.appendChild(body);
  row.appendChild(bubble);
  elMessages.appendChild(row);
  elMessages.scrollTop = elMessages.scrollHeight;

  return body;
}

function addThinkingMessage() {
  return addMessage("أفكّر في الحل…", "assistant");
}

function updateMessageBody(bodyEl, newText) {
  if (!bodyEl) return;

  const cleaned = cleanText(newText);
  const withFracs = renderFractions(cleaned);
  bodyEl.innerHTML = withFracs || "…";
  lastAssistantText = cleaned;
}

// =======================
// الاتصال بـ API — إرسال السؤال
// =======================

async function ask() {
  if (!elInput || !elMessages) return;

  const q = (elInput.value || "").trim();
  if (!q) {
    addMessage("✏️ اكتب سؤالك أولًا.", "assistant");
    return;
  }

  // عرض سؤال المستخدم
  addMessage(q, "user");
  elInput.value = "";

  // رسالة "جاري التفكير"
  const thinkingBody = addThinkingMessage();

  try {
    const res = await fetch(`${API_BASE}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ question: q }),
    });

    if (!res.ok) {
      throw new Error("NETWORK_" + res.status);
    }

    const data = await res.json();
    const answer =
      (data && (data.answer || data.result || data.output)) ||
      "عذراً، لم أستطع فهم السؤال.";

    updateMessageBody(thinkingBody, answer);
  } catch (err) {
    console.error("ASK_ERROR", err);
    updateMessageBody(
      thinkingBody,
      "حدث خطأ أثناء الاتصال بالخادم. حاولي مرّة أخرى لاحقًا."
    );
  }
}

// =======================
// التعرف على الصوت — سؤال صوتي
// =======================

let recognition = null;
let isListening = false;

function initSpeechRecognition() {
  if (recognition) return recognition;

  const SR =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition ||
    window.mozSpeechRecognition ||
    window.msSpeechRecognition;

  if (!SR) {
    console.warn("SpeechRecognition غير مدعوم.");
    return null;
  }

  recognition = new SR();
  recognition.lang = "ar-SA";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onstart = function () {
    isListening = true;
    if (elMicBtn) {
      elMicBtn.textContent = "⏹";
      elMicBtn.title = "إيقاف الاستماع";
    }
  };

  recognition.onerror = function (event) {
    console.warn("SR_ERROR", event.error);
    isListening = false;
    if (elMicBtn) {
      elMicBtn.textContent = "🎤";
      elMicBtn.title = "سؤال صوتي";
    }
  };

  recognition.onend = function () {
    isListening = false;
    if (elMicBtn) {
      elMicBtn.textContent = "🎤";
      elMicBtn.title = "سؤال صوتي";
    }
  };

  recognition.onresult = function (event) {
    try {
      const transcript =
        (event.results[0] &&
          event.results[0][0] &&
          event.results[0][0].transcript) ||
        "";
      if (!transcript) return;
      if (elInput) {
        elInput.value = transcript;
      }
      ask();
    } catch (e) {
      console.warn("SR_RESULT_ERROR", e);
    }
  };

  return recognition;
}

function toggleListening() {
  const rec = initSpeechRecognition();
  if (!rec) {
    alert("التعرّف على الصوت غير مدعوم في هذا المتصفح.");
    return;
  }

  if (!isListening) {
    try {
      rec.start();
    } catch (e) {
      console.warn("SR_START_ERR", e);
    }
  } else {
    try {
      rec.stop();
    } catch (e) {
      console.warn("SR_STOP_ERR", e);
    }
  }
}

// =======================
// قراءة آخر إجابة — Text-to-Speech
// =======================

function stopSpeaking() {
  try {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  } catch (e) {
    console.warn("TTS_STOP_ERROR", e);
  }
}

function speakAnswer() {
  if (!lastAssistantText) {
    addMessage("ما عندي إجابة أقرأها الآن.", "assistant");
    return;
  }
  if (!("speechSynthesis" in window)) {
    alert("العفو، المتصفح لا يدعم قراءة الإجابات صوتيًا.");
    return;
  }

  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(lastAssistantText);
    u.lang = "ar-SA";
    u.rate = 1;
    u.pitch = 1;

    u.onstart = function () {
      if (elReadBtn) {
        elReadBtn.textContent = "⏸";
        elReadBtn.title = "إيقاف القراءة";
      }
      if (elStopReadBtn) {
        elStopReadBtn.disabled = false;
      }
    };

    u.onend = function () {
      if (elReadBtn) {
        elReadBtn.textContent = "🔊";
        elReadBtn.title = "قراءة الإجابة";
      }
      if (elStopReadBtn) {
        elStopReadBtn.disabled = true;
      }
    };

    u.onerror = function (e) {
      console.warn("TTS_ERR", e);
      if (elReadBtn) {
        elReadBtn.textContent = "🔊";
        elReadBtn.title = "قراءة الإجابة";
      }
      if (elStopReadBtn) {
        elStopReadBtn.disabled = true;
      }
    };

    window.speechSynthesis.speak(u);
  } catch (e) {
    console.warn("TTS_ERROR", e);
  }
}

// زر إيقاف الصوت ⏹
function stopSpeaking() {
  try {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  } catch (e) {
    console.warn("TTS_STOP_ERROR", e);
  }
}

// =======================
// إنشاء شريط الأزرار الصوتية تحت مربع السؤال
// =======================
function ensureVoiceButtons() {
  if (!elForm || !elInput) return;

  // نضع الشريط تحت مربع إدخال السؤال مباشرة
  const inputContainer = elInput.parentElement || elForm;

  let bar = document.getElementById("voiceBar");
  if (!bar) {
    bar = document.createElement("div");
    bar.id = "voiceBar";
    bar.style.cssText =
      "margin-top:8px;display:flex;gap:10px;align-items:center;justify-content:flex-start;flex-wrap:wrap;";
    // نحطه مباشرة بعد عنصر الإدخال
    inputContainer.insertAdjacentElement("afterend", bar);
  } else {
    // نتأكد أنه فعلاً تحت مربع السؤال
    if (bar.previousElementSibling !== inputContainer) {
      bar.remove();
      inputContainer.insertAdjacentElement("afterend", bar);
    }
  }

  // زر السؤال الصوتي 🎤
  if (!document.getElementById("btnMic")) {
    elMicBtn = document.createElement("button");
    elMicBtn.id = "btnMic";
    elMicBtn.type = "button";
    elMicBtn.textContent = "🎤";
    elMicBtn.title = "سؤال صوتي";
    elMicBtn.style.cssText =
      "padding:6px 10px;border-radius:999px;border:1px solid #1d4ed8;background:#0f172a;color:#e5e7eb;cursor:pointer;font-size:15px;";
    bar.appendChild(elMicBtn);
  } else {
    elMicBtn = document.getElementById("btnMic");
    bar.appendChild(elMicBtn);
  }

  // زر قراءة الإجابة 🔊
  if (!document.getElementById("btnRead")) {
    elReadBtn = document.createElement("button");
    elReadBtn.id = "btnRead";
    elReadBtn.type = "button";
    elReadBtn.textContent = "🔊";
    elReadBtn.title = "قراءة آخر إجابة";
    elReadBtn.style.cssText =
      "padding:6px 10px;border-radius:999px;border:1px solid #16a34a;background:#052e16;color:#bbf7d0;cursor:pointer;font-size:15px;";
    bar.appendChild(elReadBtn);
  } else {
    elReadBtn = document.getElementById("btnRead");
    bar.appendChild(elReadBtn);
  }

  // زر إيقاف القراءة ⏹
  if (!document.getElementById("btnStopRead")) {
    elStopReadBtn = document.createElement("button");
    elStopReadBtn.id = "btnStopRead";
    elStopReadBtn.type = "button";
    elStopReadBtn.textContent = "⏹";
    elStopReadBtn.title = "إيقاف الصوت";
    elStopReadBtn.style.cssText =
      "padding:6px 10px;border-radius:999px;border:1px solid #4b5563;background:#020617;color:#e5e7eb;cursor:pointer;font-size:14px;";
    elStopReadBtn.disabled = true;
    bar.appendChild(elStopReadBtn);
  } else {
    elStopReadBtn = document.getElementById("btnStopRead");
    bar.appendChild(elStopReadBtn);
  }

  // ربط الأحداث
  if (elMicBtn) elMicBtn.onclick = toggleListening;
  if (elReadBtn) elReadBtn.onclick = speakAnswer;
  if (elStopReadBtn) elStopReadBtn.onclick = stopSpeaking;
}

// =======================
// اتصال مبدئي بالخادم
// =======================

async function pingOnce() {
  try {
    const res = await fetch(`${API_BASE}/ping`, { method: "GET" });
    if (!res.ok) {
      console.warn("PING_FAIL", res.status);
    } else {
      console.log("PING_OK");
    }
  } catch (e) {
    console.warn("PING_ERR", e);
  }
}

// =======================
// ربط الأحداث العامة
// =======================

function wire() {
  if (elForm) {
    elForm.addEventListener("submit", function (e) {
      e.preventDefault();
      ask();
    });

    // نستدعي إنشاء الأزرار الصوتية (تحت مربع السؤال)
    ensureVoiceButtons();
  }

  if (elInput) {
    elInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        ask();
      }
    });
  }

  console.log(
    "[WIRE] form:", !!elForm,
    "input:", !!elInput,
    "messages:", !!elMessages
  );
}

// تشغيل أولي
wire();
pingOnce();
