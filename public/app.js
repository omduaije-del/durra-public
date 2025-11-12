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
    "margin-top:16px;max-height:60vh;overflow-y:auto;padding:12px;border-radius:12px;border:1px solid #e5e7eb;background:#f9fafb;";
  elForm.insertAdjacentElement("afterend", elMessages);
}

// مراجع لأزرار الصوت
let elMicBtn = null;
let elReadBtn = null;
let elStopReadBtn = null;

// حالة الصوت
let isListening = false;
let recognition = null;

// =======================
// أدوات مساعدة بسيطة
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

// =======================
// عرض الرسائل
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
  body.textContent = text;

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
  bodyEl.textContent = newText;
}

// =======================
// تنظيف النص القادم من السيرفر
// =======================

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

// =======================
// الاتصال بـ API
// =======================

async function ask() {
  if (!elInput || !elMessages) return;

  const q = (elInput.value || "").trim();
  if (!q) {
    addMessage("✏️ اكتب سؤالك أولًا.", "assistant");
    return;
  }

  // مسح الرسائل السابقة في كل سؤال جديد
  elMessages.innerHTML = "";

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
    const answer = cleanText(
      (data && (data.answer || data.result || data.output)) ||
        "عذراً، لم أستطع فهم السؤال."
    );

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
// التعرف على الصوت (سؤال صوتي)
// =======================

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
// قراءة آخر إجابة (Text-to-Speech)
// =======================

function getLastAssistantText() {
  if (!elMessages) return "";

  const bubbles = elMessages.querySelectorAll(".msg-row-bot .msg-body");
  if (!bubbles.length) return "";

  const last = bubbles[bubbles.length - 1];
  return (last.textContent || "").trim();
}

function stopSpeaking() {
  try {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  } catch (e) {
    console.warn("TTS_STOP_ERROR", e);
  }
}

function speakLastAnswer() {
  const text = getLastAssistantText();
  if (!text) {
    alert("لا توجد إجابة لقراءتها بعد.");
    return;
  }

  if (!("speechSynthesis" in window)) {
    alert("القراءة الصوتية غير مدعومة في هذا المتصفح.");
    return;
  }

  try {
    stopSpeaking();

    const u = new SpeechSynthesisUtterance(text);
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

// =======================
// إنشاء شريط الأزرار تحت زر "إرسال" مباشرة
// =======================

function ensureVoiceButtons(submitBtn) {
  if (!elForm || !elInput) return;

  // نحدد أين نضع الشريط: تحت زر الإرسال مباشرة
  let container = elForm;
  if (submitBtn && submitBtn.parentElement) {
    container = submitBtn.parentElement;
  }

  let bar = document.getElementById("voiceBar");
  if (!bar) {
    bar = document.createElement("div");
    bar.id = "voiceBar";
    bar.style.cssText =
      "margin-top:8px;display:flex;gap:10px;align-items:center;justify-content:flex-start;";
    if (submitBtn) {
      // نضع الشريط تحت زر الإرسال مباشرة
      submitBtn.insertAdjacentElement("afterend", bar);
    } else {
      container.appendChild(bar);
    }
  }

  // زر السؤال الصوتي (🎤)
  if (!document.getElementById("btnMic")) {
    elMicBtn = document.createElement("button");
    elMicBtn.id = "btnMic";
    elMicBtn.type = "button";
    elMicBtn.textContent = "🎤";
    elMicBtn.title = "سؤال صوتي";
    elMicBtn.style.cssText =
      "padding:6px 12px;border-radius:999px;border:1px solid #1d4ed8;background:#0f172a;color:#e5e7eb;cursor:pointer;font-size:16px;";
    bar.appendChild(elMicBtn);
  } else {
    elMicBtn = document.getElementById("btnMic");
    bar.appendChild(elMicBtn);
  }

  // زر قراءة الإجابة (🔊)
  if (!document.getElementById("btnRead")) {
    elReadBtn = document.createElement("button");
    elReadBtn.id = "btnRead";
    elReadBtn.type = "button";
    elReadBtn.textContent = "🔊";
    elReadBtn.title = "قراءة الإجابة";
    elReadBtn.style.cssText =
      "padding:6px 12px;border-radius:999px;border:1px solid #16a34a;background:#052e16;color:#bbf7d0;cursor:pointer;font-size:16px;";
    bar.appendChild(elReadBtn);
  } else {
    elReadBtn = document.getElementById("btnRead");
    bar.appendChild(elReadBtn);
  }

  // زر إيقاف القراءة (⏹)
  if (!document.getElementById("btnStopRead")) {
    elStopReadBtn = document.createElement("button");
    elStopReadBtn.id = "btnStopRead";
    elStopReadBtn.type = "button";
    elStopReadBtn.textContent = "⏹";
    elStopReadBtn.title = "إيقاف القراءة";
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
  if (elReadBtn) elReadBtn.onclick = speakLastAnswer;
  if (elStopReadBtn) elStopReadBtn.onclick = stopSpeaking;
}

// =======================
// تنعيم بعض رموز الرياضيات للنطق
// =======================

function normalizeMathForSpeech(txt) {
  if (!txt) return "";

  return txt
    .replace(/\\n/g, "، ")
    .replace(/\\\((.*?)\\\)/g, "$1")
    .replace(/\\\[(.*?)\\\]/g, "$1")
    .replace(/\\frac\{(.*?)\}\{(.*?)\}/g, " ($1 على $2) ")
    .replace(/\^2\b/g, " تربيع")
    .replace(/\^3\b/g, " تكعيب")
    .replace(/\^(\d+)/g, " أس $1")
    .replace(/_/g, " ")
    .replace(/\*/g, " في ")
    .replace(/=/g, " يساوي ")
    .replace(/≤/g, " أصغر أو يساوي ")
    .replace(/≥/g, " أكبر أو يساوي ")
    .replace(/≠/g, " لا يساوي ")
    .replace(/\+/g, " زائد ")
    .replace(/-/g, " ناقص ")
    .replace(/\//g, " على ")
    .replace(/%/g, " بالمائة ")
    .replace(/π/g, " باي ")
    .replace(/√/g, " جذر ")
    .replace(/\\/g, " ")
    .replace(/\s+/g, " ");
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

// دالّة للعثور على زر "إرسال" بالنص
function findSubmitButtonWithSendText() {
  if (!elForm) return null;

  const candidates = elForm.querySelectorAll("button, input[type='submit']");

  for (const el of candidates) {
    // لو الزر من نوع <button>
    if (el.tagName === "BUTTON") {
      const txt = (el.textContent || "").trim();
      if (
        txt.includes("إرسال") ||
        txt.includes("ارسال") ||
        txt.toLowerCase().includes("send")
      ) {
        return el;
      }
    }

    // لو الزر من نوع <input type="submit">
    if (el.tagName === "INPUT") {
      const val = (el.value || "").trim();
      if (
        val.includes("إرسال") ||
        val.includes("ارسال") ||
        val.toLowerCase().includes("send")
      ) {
        return el;
      }
    }
  }

  // رجوع للسلوك القديم لو ما لقينا كلمة "إرسال"
  return (
    elForm.querySelector("button[type='submit'], input[type='submit']") ||
    elForm.querySelector("button")
  );
}

function wire() {
  if (elForm) {
    elForm.addEventListener("submit", function (e) {
      e.preventDefault();
      ask();
    });

    // نبحث عن زر مكتوب عليه "إرسال" (أو ارسال / send) ونضع الأزرار تحته
    const submitBtn = findSubmitButtonWithSendText();
    ensureVoiceButtons(submitBtn || null);
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
    "[WIRE] form:",
    !!elForm,
    "input:",
    !!elInput,
    "messages:",
    !!elMessages
  );
}

// تشغيل أولي
wire();
pingOnce();
