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
  document.querySelector("[data-role='tts']");

// لتخزين آخر إجابة من دُرّى (للصوت)
let lastAssistantText = "";
// حالة قراءة الإجابة (تشغيل/إيقاف)
let isReading = false;

// =======================
// دوال مساعدة لتنظيف النص
// =======================

// دالة تنظّف النص من الرموز المزعجة قبل العرض
function cleanText(text) {
  if (!text) return "";

  return text
    // إزالة كتل الكود إن وجدت ```...```
    .replace(/```[\s\S]*?```/g, "")
    // إزالة عناوين ماركداون ### و ## و # ونبدّلها بسطر جديد
    .replace(/#+\s*/g, "\n")
    // إزالة ** من التنسيق
    .replace(/\*\*/g, "")
    // إزالة العلامات الزايدة من لاتِك
    .replace(/\\left|\\right/g, "")
    .replace(/\\cdot/g, " × ")
    .replace(/\\times/g, " × ")
    .replace(/\\div/g, " ÷ ")
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
}

// تحويل 2/3 أو ٢/٣ إلى كسر اعتيادي فوق بعض
function renderFractions(text) {
  if (!text) return "";

  // أرقام عربية (0-9) أو هندية (٠-٩)
  const fractionRegex = /([\d\u0660-\u0669]+)\s*\/\s*([\d\u0660-\u0669]+)/g;

  return text.replace(
    fractionRegex,
    (match, top, bottom) =>
      `<span class="frac"><span class="top">${top}</span><span class="bottom">${bottom}</span></span>`
  );
}

// رسالة خطأ لطيفة للمستخدم (بدون فضايح الخادم 😄)
function showFriendlyError() {
  addMessage(
    "⚠ تعذّر إكمال الإجابة الآن بسبب ضغط على الخادم. انتظر دقيقة ثم حاول مرة أخرى.",
    "assistant"
  );
}

// =======================
// عرض الرسائل في الصندوق
// =======================

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
// الاتصال بالخادم
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

// الدالة الأساسية: إرسال السؤال وقراءة الإجابة
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
    const payload = { message: q, history: [] };

    let resp = await fetch(`${API_BASE}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch(() => null);

    if (!resp || !resp.ok) {
      // جرّبي المسار الاحتياطي /ask
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
    try { thinking.remove(); } catch (_) {}
    showFriendlyError();
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
    if (txt) ask();
  };

  rec.onerror = (e) => {
    console.warn("STT_ERROR:", e.error);
    addMessage("⚠ تعذّر الاستماع، حاول مرة أخرى.", "assistant");
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
  try {
    if (!listening) rec.start();
    else rec.stop();
  } catch (e) {
    console.warn("STT_TOGGLE_ERROR:", e);
  }
}
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

  }
}

// =======================
// إنشاء أزرار الصوت تحت زر "إرسال"
// =======================

function ensureVoiceButtons(elSend) {
  if (!elSend) return;

  // نحاول نلقى شريط قديم
  let bar = document.getElementById("voiceBar");

  if (!bar) {
    bar = document.createElement("div");
    bar.id = "voiceBar";
    bar.style.cssText =
      "margin-top:10px;display:flex;gap:10px;justify-content:flex-end;";

    // نضعه تحت سطر السؤال مباشرة
    const row = elSend.closest(".ask") || elSend.parentElement || elForm || document.body;
    const parent = row.parentElement || document.body;
    parent.insertBefore(bar, row.nextSibling);
  }

  // زر السؤال الصوتي
  if (!document.getElementById("btnMic")) {
    elMicBtn = document.createElement("button");
    elMicBtn.id = "btnMic";
    elMicBtn.type = "button";
    elMicBtn.textContent = "سؤال صوتي 🎤";
    elMicBtn.style.cssText =
      "padding:8px 14px;border-radius:10px;border:1px solid #0ea5e9;background:#0f172a;color:#e5e7eb;cursor:pointer;font-size:14px;";
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
      "padding:8px 14px;border-radius:10px;border:1px solid #22c55e;background:#052e16;color:#bbf7d0;cursor:pointer;font-size:14px;";
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
    elForm.addEventListener("submit", (e) => {
      e.preventDefault();
      ask();
    });
  }

  // زر إرسال (نبحث عنه حتى لو مو داخل الفورم)
  let elSend =
    document.querySelector("[data-send]") ||
    document.getElementById("btnSend");

  if (!elSend) {
    const buttons = Array.from(document.querySelectorAll("button"));
    elSend = buttons.find((b) =>
      (b.textContent || "").trim().includes("إرسال")
    );
  }

  if (elSend) {
    elSend.setAttribute("type", "button");
    elSend.addEventListener("click", () => ask());

    // هنا نضمن إنشاء أزرار الصوت تحت زر إرسال
    ensureVoiceButtons(elSend);
  }

  if (elInput) {
    elInput.addEventListener("keydown", (e) => {
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

wire();
pingOnce();
