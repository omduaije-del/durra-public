// =======================
// دُرّى — واجهة معلّمة الرياضيات الذكية
// =======================

const API_BASE = "https://durra-server.onrender.com";

// عناصر الصفحة
const elForm =
  document.getElementById("form") ||
  document.querySelector("form");

const elInput =
  document.getElementById("textInput") ||
  document.querySelector("input[type='text'], textarea");

let elMessages =
  document.getElementById("messages") ||
  document.querySelector(".messages");

// لو ما فيه صندوق رسائل، نخلق واحد بسيط (احتياط)
if (!elMessages) {
  elMessages = document.createElement("div");
  elMessages.id = "messages";
  elMessages.style.cssText =
    "max-height:420px;overflow:auto;margin-top:24px;padding:18px;border-radius:18px;border:1px solid #1e293b;background:#020617cc;color:#e5e7eb;font-size:18px;line-height:1.9;";
  (elForm?.parentElement || document.body).appendChild(elMessages);
}

// أزرار جاهزة من الـ HTML (نربطها لاحقًا فقط)
let elMicBtn = null;
let elReadBtn = null;
let elStopReadBtn = null;

// آخر إجابة من دُرّى (للصوت)
let lastAssistantText = "";

// =======================
// دوال النصوص والكسور
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
    // تحويل "٣ على ٤" أو "3 على 4" إلى 3/4 عشان تُرسم ككسر
    .replace(/([\d\u0660-\u0669]+)\s*على\s*([\d\u0660-\u0669]+)/g, "$1/$2")
    .replace(/\\sqrt/g, " جذر ")
    .replace(/\\pm/g, " ± ")
    .replace(/\\[\[\]\(\)]/g, "")
    // حذف باك-تيك
    .replace(/`/g, "")
    // تقليل المسافات
    .replace(/[ \t]+/g, " ")
    // ترتيب الأسطر الفارغة
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// رسم الكسور فوق بعض مع خط الكسر (يعتمد على CSS .frac .bar)
function renderFractions(text) {
  if (!text) return "";
  const re = /([\d\u0660-\u0669]+)\s*\/\s*([\d\u0660-\u0669]+)/g;
  return text.replace(
    re,
    (_, a, b) =>
      `<span class="frac"><span class="top">${a}</span><span class="bar"></span><span class="bottom">${b}</span></span>`
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
// الاتصال بالسيرفر
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

  // مسح الرسائل السابقة لكل سؤال جديد
  elMessages.innerHTML = "";
  addMessage(q, "user");
  elInput.value = "";

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
      addMessage("عذرًا، تعذر الحصول على إجابة. حاولي مرة أخرى.", "assistant");
      return;
    }

    const data = await resp.json().catch(() => ({}));
    const reply =
      (data && (data.reply || data.answer || data.text)) || "";

    addMessage(reply || "لم أحصل على إجابة واضحة.", "assistant");
  } catch (e) {
    console.error("ASK_ERROR", e);
    try {
      thinking.remove();
    } catch (_) {}
    addMessage("عذرًا، حصل خطأ في الاتصال. تأكدي من الإنترنت ثم حاولي مرة أخرى.", "assistant");
  }
}

// =======================
// الصوت — سؤال صوتي
// =======================

let recognition = null;
let listening = false;

function ensureRecognition() {
  if (recognition) return recognition;

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    alert("المتصفح لا يدعم السؤال الصوتي (جرّبي Google Chrome).");
    return null;
  }

  const rec = new SR();
  rec.lang = "ar-SA";
  rec.interimResults = false;
  rec.maxAlternatives = 1;

  rec.onstart = () => {
    listening = true;
    if (elMicBtn) elMicBtn.textContent = "🎙"; // وقت التسجيل
  };

  rec.onresult = (e) => {
    const txt = (e.results?.[0]?.[0]?.transcript || "").trim();
    if (elInput) elInput.value = txt;
    if (txt) ask();
  };

  rec.onerror = (e) => {
    console.warn("STT_ERROR", e.error);
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
// الصوت — قراءة وإيقاف
// =======================

function speakAnswer() {
  if (!lastAssistantText) {
    addMessage("ما عندي إجابة أقرأها الآن.", "assistant");
    return;
  }
  if (!("speechSynthesis" in window)) {
    alert("متصفحك لا يدعم قراءة الإجابات صوتيًا.");
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
// ربط الأزرار الموجودة في HTML
// =======================

function wireVoiceButtons() {
  // هنا لا ننشئ أزرار ولا نغيّر ستايل
  // فقط نقرأ الأزرار الموجودة أصلاً في الصفحة
  elMicBtn =
    document.getElementById("btnMic") ||
    document.querySelector("[data-role='mic']");

  elReadBtn =
    document.getElementById("btnRead") ||
    document.querySelector("[data-role='tts']");

  elStopReadBtn =
    document.getElementById("btnStopRead") ||
    document.querySelector("[data-role='tts-stop']");

  if (elMicBtn) {
    elMicBtn.onclick = toggleListening;
  }

  if (elReadBtn) {
    elReadBtn.onclick = speakAnswer;
  }

  if (elStopReadBtn) {
    elStopReadBtn.onclick = stopSpeaking;
  }

  console.log("[VOICE_BUTTONS]", {
    mic: !!elMicBtn,
    read: !!elReadBtn,
    stop: !!elStopReadBtn,
  });
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
  }

  if (elInput) {
    elInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        ask();
      }
    });
  }

  wireVoiceButtons();
  console.log("[WIRE] form:", !!elForm, "input:", !!elInput, "messages:", !!elMessages);
}

// تشغيل أولي
wire();
pingOnce();
