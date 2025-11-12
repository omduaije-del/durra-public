// =======================
// دُرى — واجهة مبسّطة لمعلّمة الرياضيات الذكيّة
// =======================

// عناصر أساسية من الصفحة
let elForm = document.getElementById("chatForm");
let elInput = document.getElementById("userInput");
let elMessages = document.getElementById("messages");

// عناصر الصوت
let elMicBtn = null;
let elReadBtn = null;
let elStopReadBtn = null;

// حالة الاستماع والقراءة
let isListening = false;
let isSpeaking = false;
let recognition = null;

// =======================
// أدوات مساعدة بسيطة
// =======================

function $(sel) {
  return document.querySelector(sel);
}

function createEl(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text != null) el.textContent = text;
  return el;
}

function appendChildren(parent, ...children) {
  for (const c of children) {
    if (c) parent.appendChild(c);
  }
}

// تنسيق بسيط للوقت
function fmtTime(d = new Date()) {
  return d.toLocaleTimeString("ar", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// =======================
// عرض الرسائل في الواجهة
// =======================

function addMessage(role, text, opts = {}) {
  if (!elMessages) return;

  const wrapper = createEl(
    "div",
    `msg msg-${role === "user" ? "user" : "bot"}`
  );

  const meta = createEl("div", "msg-meta");
  meta.textContent =
    (role === "user" ? "أنت" : "دُرّة") + " • " + fmtTime(new Date());

  const body = createEl("div", "msg-body");
  body.textContent = text || "";

  if (opts.isThinking) {
    wrapper.classList.add("msg-thinking");
  }

  appendChildren(wrapper, meta, body);

  if (opts.id) {
    wrapper.dataset.id = opts.id;
  }

  elMessages.appendChild(wrapper);
  elMessages.scrollTop = elMessages.scrollHeight;

  return wrapper;
}

// تحديث رسالة (مثلاً من "جاري التفكير" إلى الجواب النهائي)
function updateMessage(elMsg, newText, opts = {}) {
  if (!elMsg) return;

  const body = elMsg.querySelector(".msg-body");
  if (body) {
    body.textContent = newText || "";
  }

  if (opts.isThinking != null) {
    if (opts.isThinking) {
      elMsg.classList.add("msg-thinking");
    } else {
      elMsg.classList.remove("msg-thinking");
    }
  }
}

// =======================
// فورم السؤال
// =======================

// نرسل السؤال للخادم
async function ask() {
  if (!elInput) return;
  const question = (elInput.value || "").trim();
  if (!question) return;

  // نظّف الحقل
  elInput.value = "";

  // أضف رسالة المستخدم
  addMessage("user", question);

  // أضف رسالة "أفكر الآن..."
  const thinkingMsg = addMessage("assistant", "أفكّر في الحل…", {
    isThinking: true,
  });

  try {
    const res = await fetch("/api/ask", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ question }),
    });

    if (!res.ok) {
      throw new Error("NETWORK_ERR_" + res.status);
    }

    const data = await res.json();
    const answer = (data && data.answer) || "عذراً، لم أستطع فهم السؤال.";

    updateMessage(thinkingMsg, answer, { isThinking: false });

    // نقرأ الإجابة مباشرة لو أردنا (اختياري)
    // speakAnswer();
  } catch (err) {
    console.error("ASK_ERROR", err);
    updateMessage(
      thinkingMsg,
      "حدث خطأ أثناء الاتصال بالخادم. حاولي مرّة أخرى.",
      { isThinking: false }
    );
  }
}

// =======================
// تهيئة التعرف على الصوت (speechRecognition)
// =======================

function initSpeechRecognition() {
  if (recognition) return recognition;

  const SR =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition ||
    window.mozSpeechRecognition ||
    window.msSpeechRecognition;

  if (!SR) {
    console.warn("SpeechRecognition غير مدعوم في هذا المتصفح.");
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
        (event.results[0] && event.results[0][0] && event.results[0][0].transcript) ||
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
// تحويل النص إلى كلام (قراءة الجواب)
// =======================

function speakAnswer() {
  const msgs = elMessages ? elMessages.querySelectorAll(".msg-bot .msg-body") : [];
  if (!msgs.length) return;

  const lastAnswer = msgs[msgs.length - 1].textContent || "";
  if (!lastAnswer.trim()) return;

  if (!("speechSynthesis" in window)) {
    alert("القراءة الصوتية غير مدعومة في هذا المتصفح.");
    return;
  }

  try {
    const u = new SpeechSynthesisUtterance();
    u.text = normalizeMathForSpeech(lastAnswer);
    u.lang = "ar-SA";
    u.rate = 1;
    u.pitch = 1;

    u.onstart = function () {
      isSpeaking = true;
      if (elReadBtn) {
        elReadBtn.textContent = "⏸";
        elReadBtn.title = "إيقاف مؤقت";
      }
      if (elStopReadBtn) {
        elStopReadBtn.disabled = false;
      }
    };

    u.onend = function () {
      isSpeaking = false;
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
      isSpeaking = false;
      if (elReadBtn) {
        elReadBtn.textContent = "🔊";
        elReadBtn.title = "قراءة الإجابة";
      }
      if (elStopReadBtn) {
        elStopReadBtn.disabled = true;
      }
    };

    window.speechSynthesis.cancel();
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

  // زر السؤال الصوتي (أيقونة مايك فقط)
  if (!document.getElementById("btnMic")) {
    elMicBtn = document.createElement("button");
    elMicBtn.id = "btnMic";
    elMicBtn.type = "button";
    elMicBtn.textContent = "🎤";
    elMicBtn.title = "سؤال صوتي";
    elMicBtn.style.cssText =
      "padding:6px 12px;border-radius:999px;border:1px solid #1d...ackground:#0f172a;color:#e5e7eb;cursor:pointer;font-size:16px;";
    bar.appendChild(elMicBtn);
  } else {
    elMicBtn = document.getElementById("btnMic");
  }

  // زر قراءة الإجابة 🔊
  if (!document.getElementById("btnRead")) {
    elReadBtn = document.createElement("button");
    elReadBtn.id = "btnRead";
    elReadBtn.type = "button";
    elReadBtn.textContent = "🔊";
    elReadBtn.title = "قراءة الإجابة";
    elReadBtn.style.cssText =
      "padding:6px 12px;border-radius:999px;border:1px solid #16...ackground:#052e16;color:#bbf7d0;cursor:pointer;font-size:16px;";
    bar.appendChild(elReadBtn);
  } else {
    elReadBtn = document.getElementById("btnRead");
    bar.appendChild(elReadBtn);
  }

  // زر الإيقاف ⏹
  if (!document.getElementById("btnStopRead")) {
    elStopReadBtn = document.createElement("button");
    elStopReadBtn.id = "btnStopRead";
    elStopReadBtn.type = "button";
    elStopReadBtn.textContent = "⏹";
    elStopReadBtn.title = "إيقاف القراءة";
    elStopReadBtn.style.cssText =
      "padding:6px 12px;border-radius:999px;border:1px solid #7f1...ackground:#111827;color:#f9fafb;cursor:pointer;font-size:16px;";
    elStopReadBtn.disabled = true;
    bar.appendChild(elStopReadBtn);
  } else {
    elStopReadBtn = document.getElementById("btnStopRead");
    bar.appendChild(elStopReadBtn);
  }

  // ربط الأحداث
  elMicBtn.onclick = toggleListening;
  elReadBtn.onclick = speakAnswer;
  elStopReadBtn.onclick = stopSpeaking;
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
// اتصال مبدئي بالخادم للتأكد أنه شغّال
// =======================

async function pingOnce() {
  try {
    const res = await fetch("/api/ping", { method: "GET" });
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

    // نبحث عن زر مكتوب عليه "إرسال" (أو ارسال / send)
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
    "[WIRE] form:", !!elForm,
    "input:", !!elInput,
    "messages:", !!elMessages
  );
}

// تشغيل أولي
wire();
pingOnce();
