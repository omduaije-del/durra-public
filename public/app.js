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
if (!elMessages) {
  elMessages = document.createElement("div");
  elMessages.id = "messages";
  elMessages.style.cssText =
    "max-height:420px;overflow:auto;margin-top:24px;padding:18px;border-radius:18px;border:1px solid #1e293b;background:#020617cc;color:#e5e7eb;font-size:18px;line-height:1.9;";
  (elForm?.parentElement || document.body).appendChild(elMessages);
}

// أزرار الصوت (سننشئها لاحقًا)
let elMicBtn =
  document.getElementById("btnMic") ||
  document.querySelector("[data-role='mic']");

let elReadBtn =
  document.getElementById("btnRead") ||
  document.querySelector("[data-role='tts']");

let elStopReadBtn = document.getElementById("btnStopRead");

// آخر إجابة من دُرّة (للصوت)
let lastAssistantText = "";

// =======================
// دوال مساعدة للنصوص
// =======================

// تنظيف النص من الرموز الزائدة + دعم "على" في الكسور
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

// رسم الكسور فوق بعض مع خط كسر
function renderFractions(text) {
  if (!text) return "";

  // أرقام عربية (0-9) أو هندية (٠-٩)
  const fractionRegex = /([\d\u0660-\u0669]+)\s*\/\s*([\d\u0660-\u0669]+)/g;

  return text.replace(
    fractionRegex,
    (match, top, bottom) =>
      `<span class="frac"><span class="top">${top}</span><span class="bar"></span><span class="bottom">${bottom}</span></span>`
  );
}

// عرض الرسائل في صندوق الدردشة
function addMessage(text, who = "assistant") {
  if (!elMessages) return;

  const div = document.createElement("div");
  div.className = "message " + (who === "user" ? "user" : "assistant");
  div.style.margin = "10px 0";

  if (who === "assistant") {
    const cleaned = cleanText(text || "");
    const withFracs = renderFractions(cleaned);
    div.innerHTML = withFracs || "…";
    lastAssistantText = cleaned;
  } else {
    div.textContent = text || "";
  }

  elMessages.appendChild(div);
  elMessages.scrollTop = elMessages.scrollHeight;
}

// =======================
// الاتصال بالخادم (السيرفر)
// =======================

async function pingOnce() {
  try {
    const res = await fetch(`${API_BASE}/health`, { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    console.log("[PING]", data);
  } catch (e) {
    console.warn("[PING_ERROR]", e);
  }
}

// إرسال سؤال لدُرّة
async function ask() {
  if (!elInput) {
    addMessage("⚠ لم أجد خانة السؤال في الصفحة.", "assistant");
    return;
  }

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
  const thinking = document.createElement("div");
  thinking.className = "message assistant";
  thinking.textContent = "… جاري التفكير";
  thinking.style.margin = "10px 0";
  elMessages.appendChild(thinking);
  elMessages.scrollTop = elMessages.scrollHeight;

  try {
    const payload = { message: q, history: [] };

    // المحاولة الأولى: /api/chat
    let resp = await fetch(`${API_BASE}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch(() => null);

    // احتياط: لو فشل /api/chat نجرّب /ask
    if (!resp || !resp.ok) {
      resp = await fetch(`${API_BASE}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      }).catch(() => null);
    }

    thinking.remove();

    if (!resp) {
      showFriendlyError();
      return;
    }

    const data = await resp.json().catch(() => ({}));
    const reply =
      (data && (data.reply || data.answer || data.text)) || "";

    if (reply) {
      addMessage(reply, "assistant");
    } else {
      showFriendlyError();
    }
  } catch (e) {
    console.error("ASK_ERROR", e);
    try {
      thinking.remove();
    } catch (_) {}
    showFriendlyError();
  }
}

function showFriendlyError() {
  addMessage(
    "عذرًا، حصل خطأ أثناء محاولة الحصول على الإجابة. تأكدي من الاتصال بالإنترنت ثم حاولي مرة أخرى.",
    "assistant"
  );
}

// =======================
// سؤال صوتي (SpeechRecognition)
// =======================

let recognition = null;
let listening = false;

function ensureRecognition() {
  if (recognition) return recognition;

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    alert("العفو، المتصفح لا يدعم السؤال الصوتي (جرّبي Google Chrome).");
    return null;
  }

  const rec = new SR();
  rec.lang = "ar-SA";
  rec.interimResults = false;
  rec.maxAlternatives = 1;

  rec.onstart = () => {
    listening = true;
    if (elMicBtn) elMicBtn.textContent = "🎙"; // أثناء التسجيل
  };

  rec.onresult = (e) => {
    const txt = (e.results?.[0]?.[0]?.transcript || "").trim();
    if (elInput) elInput.value = txt;
    if (txt) ask();
  };

  rec.onerror = (e) => {
    console.warn("STT_ERROR:", e.error);
    listening = false;
    if (elMicBtn) elMicBtn.textContent = "🎤"; // رجوع للمايك
  };

  rec.onend = () => {
    listening = false;
    if (elMicBtn) elMicBtn.textContent = "🎤";
  };

  recognition = rec;
  return rec;
}

function toggleListening() {
  const rec = ensureRecognition();
  if (!rec) return;

  if (!listening) {
    try {
      rec.start();
    } catch (e) {
      console.warn("STT_START_ERROR", e);
    }
  } else {
    try {
      rec.stop();
    } catch (e) {
      console.warn("STT_STOP_ERROR", e);
    }
  }
}

// =======================
// قراءة الإجابة صوتيًا (SpeechSynthesis)
// =======================

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
      "padding:6px 12px;border-radius:999px;border:1px solid #1d4ed8;background:#0f172a;color:#e5e7eb;cursor:pointer;font-size:16px;";
    bar.appendChild(elMicBtn);
  } else {
    elMicBtn = document.getElementById("btnMic");
  }

  // زر قراءة الإجابة (أيقونة سماعة فقط)
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

  // زر الإيقاف ⏹
  if (!document.getElementById("btnStopRead")) {
    elStopReadBtn = document.createElement("button");
    elStopReadBtn.id = "btnStopRead";
    elStopReadBtn.type = "button";
    elStopReadBtn.textContent = "⏹";
    elStopReadBtn.title = "إيقاف الصوت";
    elStopReadBtn.style.cssText =
      "padding:6px 10px;border-radius:999px;border:1px solid #4b5563;background:#020617;color:#e5e7eb;cursor:pointer;font-size:14px;";
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
// ربط الأحداث العامة
// =======================

function wire() {
  if (elForm) {
    elForm.addEventListener("submit", function (e) {
      e.preventDefault();
      ask();
    });

    // نبحث عن زر الإرسال ونمرره لإنشاء الأزرار تحته
    const submitBtn =
      elForm.querySelector("button[type='submit'], input[type='submit']") ||
      elForm.querySelector("button");
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

// =======================
// ترتيب واجهة دُرّة في النص وتصغير الصناديق
// =======================
function layoutDurraMiddle() {
  if (!elForm) return;

  // غلاف في النص يحوي الفورم وصندوق الرسائل
  let wrap = document.getElementById("durraCenterWrap");
  if (!wrap) {
    wrap = document.createElement("div");
    wrap.id = "durraCenterWrap";
    wrap.style.cssText =
      "max-width:720px;margin:24px auto 0;display:flex;flex-direction:column;gap:12px;align-items:stretch;";
    const parent = elForm.parentElement || document.body;
    parent.insertBefore(wrap, elForm);
  }

  // نحرك الفورم وصندوق الرسائل داخل الغلاف الجديد (في النص)
  if (!wrap.contains(elForm)) wrap.appendChild(elForm);
  if (elMessages && !wrap.contains(elMessages)) wrap.appendChild(elMessages);

  // نخلي الفورم صف واحد في النص
  elForm.style.display = "flex";
  elForm.style.gap = "10px";
  elForm.style.alignItems = "center";
  elForm.style.justifyContent = "center";
  elForm.style.flexWrap = "wrap";

  // تصغير خانة السؤال
  if (elInput) {
    elInput.style.flex = "1 1 260px";
    elInput.style.maxWidth = "100%";
    elInput.style.height = "44px";
    elInput.style.borderRadius = "999px";
    elInput.style.padding = "10px 16px";
    elInput.style.fontSize = "16px";
    elInput.style.lineHeight = "1.5";
  }

  // زر الإرسال جنب خانة السؤال
  const submitBtn =
    elForm.querySelector("button[type='submit'], input[type='submit']") ||
    elForm.querySelector("button");

  if (submitBtn) {
    submitBtn.style.height = "44px";
    submitBtn.style.display = "inline-flex";
    submitBtn.style.alignItems = "center";
    submitBtn.style.justifyContent = "center";
    submitBtn.style.padding = "0 22px";
  }

  // شريط أزرار الصوت بجانبهم
  const bar = document.getElementById("voiceBar");
  if (bar) {
    bar.style.marginTop = "0";
    bar.style.display = "flex";
    bar.style.gap = "8px";
  }

  // إزالة الشريط الكبير تحت (صندوق الرسائل شكله شفاف وصغير)
  if (elMessages) {
    elMessages.style.marginTop = "16px";
    elMessages.style.padding = "0";
    elMessages.style.background = "transparent";
    elMessages.style.border = "none";
    elMessages.style.maxHeight = "none";
  }
}

// تشغيل ترتيب الواجهة في النص
layoutDurraMiddle();
