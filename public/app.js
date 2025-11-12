// =======================
// دُرّى — واجهة مبسّطة لمعلمـة الرياضيات الذكية
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

// أزرار الصوت (سيتــم إنشاؤها لاحقًا لو مش موجودة)
let elMicBtn =
  document.getElementById("btnMic") ||
  document.querySelector("[data-role='mic']");

let elReadBtn =
  document.getElementById("btnRead") ||
  document.querySelector("[data-role='tts"]);

// لتخزين آخر إجابة من دُرّى (للصوت)
let lastAssistantText = "";

// حالة قراءة الإجابة (تشغيل/إيقاف)
let isReading = false;

// =======================
// دوال مساعدة لتنظيف النص
// =======================

// دالة تنظّف النص من الرموز المزعجة قبل العرض
function cleanText(raw) {
  if (!raw) return "";

  let text = String(raw);

  // إزالة مسافات البداية والنهاية
  text = text.trim();

  // إزالة كتل الكود ```...```
  text = text.replace(/```[\s\S]*?```/g, "");

  // إزالة عناوين ماركداون (#, ##, ###)
  text = text.replace(/^#{1,6}\s*/gm, "");

  // إزالة النجوم ** **
  text = text.replace(/\*\*/g, "");

  // إزالة الروابط [نص](رابط)
  text = text.replace(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g, "$1");

  // استبدال أوامر LaTeX برموز مبسّطة
  text = text
    .replace(/\\times|\\cdot/g, "×")
    .replace(/\\div/g, "÷")
    .replace(/\\leq/g, "≤")
    .replace(/\\geq/g, "≥")
    .replace(/\\neq/g, "≠")
    .replace(/\\approx/g, "≈")
    .replace(/\\sqrt\{([^}]+)\}/g, "جذر ($1)")
    .replace(/\\sqrt/g, " جذر ")
    .replace(/\\pm/g, " ± ")
    .replace(/\\[\[\]\(\)]/g, "")
    // حذف باك-تيك وبقية الزينة
    .replace(/`/g, "")
    // تقليل المسافات المكرّرة
    .replace(/[ \t]+/g, " ")
    // ترتيب الأسطر الفارغة
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return text;
}

// تحويل 2/3 أو ٢/٣ إلى كسر اعتيادي فوق بعض (لو حابة تستعمليه مستقبلاً)
function renderFractions(text) {
  if (!text) return "";

  // أرقام عربية (0-9) أو هندية (٠-٩)
  const fractionRegex = /([\d\u0660-\u0669]+)\s*\/\s*([\d\u0660-\u0669]+)/g;

  return text.replace(
    fractionRegex,
    (match, num, den) => `${num}⁄${den}`
  );
}

// عرض رسالة داخل صندوق الرسائل
function addMessage(text, sender = "assistant") {
  if (!elMessages) return;

  const msg = document.createElement("div");
  msg.className = "message " + sender;
  msg.textContent = text;

  elMessages.appendChild(msg);
  elMessages.scrollTop = elMessages.scrollHeight;
}

// =======================
// استدعاء API دُرّة
// =======================

async function askDurra(question) {
  const payload = { question };

  const res = await fetch(API_BASE + "/ask", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    let msg = "حدث خطأ أثناء الاتصال بالخادم.";
    try {
      const data = await res.json();
      if (data && data.error) msg = data.error;
    } catch (e) {
      // تجاهل
    }
    throw new Error(msg);
  }

  const data = await res.json();
  return data;
}

// =======================
// إرسال السؤال من الواجهة
// =======================

async function handleAsk() {
  if (!elInput || !elMessages) return;

  const q = (elInput.value || "").trim();
  if (!q) {
    addMessage("✏️ اكتب سؤالك أولًا.", "assistant");
    return;
  }

  // مسح الأسئلة/الإجابات السابقة عند كل سؤال جديد
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
    const data = await askDurra(q);
    let answer = cleanText(data.answer || "");

    // لو حبيتي تفعّلين الكسور فوق بعض:
    // answer = renderFractions(answer);

    lastAssistantText = answer;
    thinking.remove();
    addMessage(answer || "لم أحصل على إجابة واضحة.", "assistant");
  } catch (err) {
    console.error(err);
    thinking.remove();
    addMessage(
      err.message ||
        "عذرًا، حصل خطأ أثناء محاولة الحصول على الإجابة. حاولي مرة أخرى.",
      "assistant"
    );
  }
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
    alert("العفو، المتصفح لا يدعم السؤال الصوتي (جرّب Google Chrome).");
    return null;
  }

  const rec = new SR();
  rec.lang = "ar-SA";
  rec.interimResults = false;
  rec.maxAlternatives = 1;

  rec.onstart = () => {
    listening = true;
    if (elMicBtn) elMicBtn.textContent = "إيقاف التسجيل 🎙";
  };

  rec.onresult = (e) => {
    const txt = (e.results?.[0]?.[0]?.transcript || "").trim();
    if (elInput) elInput.value = txt;
    if (txt) handleAsk();
  };

  rec.onerror = (e) => {
    console.warn("STT_ERROR:", e.error);
    listening = false;
    if (elMicBtn) elMicBtn.textContent = "سؤال صوتي 🎤";
  };

  rec.onend = () => {
    listening = false;
    if (elMicBtn) elMicBtn.textContent = "سؤال صوتي 🎤";
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
      console.warn("STT_START_ERROR:", e);
    }
  } else {
    try {
      rec.stop();
    } catch (e) {
      console.warn("STT_STOP_ERROR:", e);
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

  // لو القراءة شغّالة الآن: نوقفها ونرجّع الزر لحالته العادية
  if (isReading || window.speechSynthesis.speaking) {
    try {
      window.speechSynthesis.cancel();
    } catch (e) {
      console.warn("TTS_CANCEL_ERROR", e);
    }
    isReading = false;
    if (elReadBtn) {
      elReadBtn.textContent = "قراءة الإجابة 🔊";
    }
    return;
  }

  // نبدأ قراءة جديدة
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(lastAssistantText);
    u.lang = "ar-SA";
    u.rate = 1;
    u.pitch = 1;

    isReading = true;
    if (elReadBtn) {
      elReadBtn.textContent = "إيقاف القراءة ⏸";
    }

    u.onend = function () {
      isReading = false;
      if (elReadBtn) {
        elReadBtn.textContent = "قراءة الإجابة 🔊";
      }
    };

    u.onerror = function (e) {
      console.warn("TTS_ERROR", e);
      isReading = false;
      if (elReadBtn) {
        elReadBtn.textContent = "قراءة الإجابة 🔊";
      }
    };

    window.speechSynthesis.speak(u);
  } catch (e) {
    console.warn("TTS_ERROR", e);
    isReading = false;
    if (elReadBtn) {
      elReadBtn.textContent = "قراءة الإجابة 🔊";
    }
  }
}

// =======================
// إنشاء أزرار الصوت تحت زر "إرسال"
// =======================

function ensureVoiceButtons(elSend) {
  if (!elForm || !elInput) return;

  // شريط بسيط تحت الفورم للأزرار
  let bar = document.getElementById("voiceBar");
  if (!bar) {
    bar = document.createElement("div");
    bar.id = "voiceBar";
    bar.style.cssText =
      "margin-top:12px;display:flex;gap:10px;align-items:center;justify-content:flex-start;";
    elForm.appendChild(bar);
  }

  // زر السؤال الصوتي
  if (!document.getElementById("btnMic")) {
    elMicBtn = document.createElement("button");
    elMicBtn.id = "btnMic";
    elMicBtn.type = "button";
    elMicBtn.textContent = "سؤال صوتي 🎤";
    elMicBtn.style.cssText =
      "padding:8px 14px;border-radius:10px;border:1px solid #1d4ed8;background:#0f172a;color:#e5e7eb;cursor:pointer;font-size:14px;";
    bar.appendChild(elMicBtn);
  } else {
    elMicBtn = document.getElementById("btnMic");
  }

  // زر قراءة الإجابة
  if (!document.getElementById("btnRead")) {
    elReadBtn = document.createElement("button");
    elReadBtn.id = "btnRead";
    elReadBtn.type = "button";
    elReadBtn.textContent = "قراءة الإجابة 🔊";
    elReadBtn.style.cssText =
      "padding:8px 14px;border-radius:10px;border:1px solid #16a34a;background:#052e16;color:#bbf7d0;cursor:pointer;font-size:14px;";
    bar.appendChild(elReadBtn);
  } else {
    elReadBtn = document.getElementById("btnRead");
  }

  // ربط الأحداث
  elMicBtn.onclick = toggleListening;
  elReadBtn.onclick = speakAnswer;
}

// =======================
// ربط الأحداث العامة
// =======================

function wire() {
  if (elForm) {
    elForm.addEventListener("submit", function (e) {
      e.preventDefault();
      handleAsk();
    });

    // زر الإرسال
    const submitBtn =
      elForm.querySelector("button[type='submit'], input[type='submit']") ||
      elForm.querySelector("button");
    if (submitBtn) {
      ensureVoiceButtons(submitBtn);
    } else {
      ensureVoiceButtons(null);
    }
  }

  if (elInput) {
    elInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleAsk();
      }
    });
  }

  console.log(
    "[WIRE] form:", !!elForm,
    "input:", !!elInput,
    "messages:", !!elMessages
  );
}

// Ping بسيط على السيرفر عند بداية التشغيل
function pingOnce() {
  fetch(API_BASE + "/health").catch(() => {});
}

wire();
pingOnce();
