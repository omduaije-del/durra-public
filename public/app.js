// =======================
// دُرّى — واجهة الرياضيات
// =======================

const API_BASE = "https://durra-server.onrender.com";

const elForm =
  document.getElementById("form") ||
  document.querySelector("form");

const elInput =
  document.getElementById("textInput") ||
  document.querySelector("input[type='text'], textarea");

// صندوق الإجابة
let elAnswer =
  document.getElementById("answerBox") ||
  document.querySelector(".result");

// لو ما لقيناه نخلق واحد تحته
if (!elAnswer) {
  elAnswer = document.createElement("div");
  elAnswer.id = "answerBox";
  elAnswer.className = "result";
  elAnswer.style.marginTop = "18px";
  elAnswer.style.padding = "18px";
  elAnswer.style.borderRadius = "18px";
  elAnswer.style.background = "rgba(15,23,42,.9)";
  elAnswer.style.border = "1px solid rgba(148,163,184,.7)";
  elAnswer.style.whiteSpace = "pre-wrap";
  elAnswer.style.lineHeight = "1.9";
  (elForm?.parentElement || document.body).appendChild(elAnswer);
}

// =======================
// أدوات مساعدة للنص
// =======================

// نخزن آخر إجابة خام للقراءة الصوتية
let lastAnswerPlain = "";

// تهريب HTML بسيط
function escapeHtml(str) {
  return (str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// تنظيف النص + تحويل الكسور إلى بسط/مقام بخط كسر
function formatAnswer(text) {
  if (!text) return "";

  // نخزن النسخة الخام (بدون تنسيق HTML) للصوت
  lastAnswerPlain = text;

  let cleaned = text;

  // إزالة كود بين ```
  cleaned = cleaned.replace(/```[\s\S]*?```/g, "");

  // إزالة نجوم و Markdown بسيط
  cleaned = cleaned
    .replace(/\*\*/g, "")
    .replace(/`/g, "")
    .replace(/_/g, " ");

  // حذف أوامر لاتِك غير مهمة
  cleaned = cleaned
    .replace(/\\left/g, "")
    .replace(/\\right/g, "");

  // تقليل الأسطر الفارغة
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n");

  // نهرب HTML أولاً
  let html = escapeHtml(cleaned);

  // 1) \frac{a}{b}
  html = html.replace(
    /\\frac\{([^}]+)\}\{([^}]+)\}/g,
    (_m, a, b) =>
      `<span class="frac"><span class="top">${a}</span><span class="bottom">${b}</span></span>`
  );

  // 2) أي شيء على شكل عدد / عدد (أرقام عربية أو عادية)
  const digit = "0-9٠-٩";
  const fracRe = new RegExp(`([${digit}]+)\\s*\\/\\s*([${digit}]+)`, "g");
  html = html.replace(
    fracRe,
    `<span class="frac"><span class="top">$1</span><span class="bottom">$2</span></span>`
  );

  // نحول الأسطر إلى <br>
  html = html.replace(/\n/g, "<br>");

  return html.trim();
}

// عرض النص في صندوق الإجابة
function show(text) {
  if (!elAnswer) return;
  const html = formatAnswer(text);
  elAnswer.innerHTML = html || "";
}

// =======================
// الاتصال بالخادم
// =======================

async function ask() {
  if (!elInput) {
    show("⚠ لم أجد خانة السؤال في الصفحة.");
    return;
  }

  const q = (elInput.value || "").trim();
  if (!q) {
    show("✏️ اكتب سؤالك الرياضي أولاً.");
    return;
  }

  // نفضي خانة الإدخال ونمسح الإجابة القديمة
  elInput.value = "";
  elAnswer.innerHTML = "… جاري التفكير";

  try {
    const payload = { message: q, history: [] };

    // نحاول /api/chat أولاً
    let resp = await fetch(`${API_BASE}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch(() => null);

    // لو ما اشتغل /api/chat نرجع لـ /ask
    if (!resp || resp.status === 404) {
      resp = await fetch(`${API_BASE}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      }).catch(() => null);
    }

    if (!resp) {
      show("⚠ تعذّر الاتصال بالخادم. جرّب مرة أخرى بعد قليل.");
      return;
    }

    const data = await resp.json().catch(() => ({}));

    if (data.reply) {
      show(data.reply);
    } else if (data.answer) {
      show(data.answer);
    } else if (data.error) {
      // نعرض رسالة عربية مهذّبة بدون كلمة "الخادم قال"
      show(data.error);
    } else {
      show("⚠ لم تصل إجابة مفهومة، جرّب إعادة صياغة السؤال.");
    }
  } catch (e) {
    console.error("ASK_ERROR", e);
    show("⚠ تعذّر إكمال الإجابة الآن. انتظر دقيقة ثم حاول مرة أخرى.");
  }
}

// ربط الفورم و زر الإرسال
function wireForm() {
  if (elForm) {
    elForm.addEventListener("submit", (e) => {
      e.preventDefault();
      ask();
    });
  }

  if (elInput) {
    elInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        ask();
      }
    });
  }

  // لو في زر إرسال مستقل
  const sendBtn = Array.from(
    document.querySelectorAll("button")
  ).find((b) => (b.textContent || "").trim().includes("إرسال"));

  if (sendBtn) {
    sendBtn.type = "button";
    sendBtn.addEventListener("click", ask);
  }
}

// =======================
// السؤال الصوتي (STT)
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
    if (elMicBtn) elMicBtn.textContent = "إيقاف الاستماع ⏹";
  };

  rec.onresult = (e) => {
    const txt = (e.results?.[0]?.[0]?.transcript || "").trim();
    if (elInput) elInput.value = txt;
    if (txt) ask();
  };

  rec.onerror = () => {
    show("⚠ تعذّر الاستماع، حاوِل مرة أخرى.");
  };

  rec.onend = () => {
    listening = false;
    if (elMicBtn) elMicBtn.textContent = "سؤال صوتي 🎙";
  };

  recognition = rec;
  return rec;
}

function toggleListening() {
  const rec = ensureRecognition();
  if (!rec) return;
  try {
    if (!listening) {
      rec.start();
    } else {
      rec.stop();
    }
  } catch (e) {
    console.warn("STT_TOGGLE_ERROR:", e);
  }
}

// =======================
// قراءة الإجابة (TTS)
// =======================

let elMicBtn = null;
let elTtsBtn = null;

function textForVoice(str) {
  if (!str) return "";
  // نستخدم النسخة الخام قدر الإمكان بدون رموز غريبة
  return str
    .replace(/[*_`]/g, "")
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, "$1 على $2")
    .replace(/([0-9٠-٩]+)\s*\/\s*([0-9٠-٩]+)/g, "$1 على $2");
}

function speakAnswer() {
  if (!("speechSynthesis" in window)) {
    alert("الجهاز لا يدعم قراءة الإجابات صوتيًا.");
    return;
  }
  const raw = textForVoice(lastAnswerPlain);
  if (!raw.trim()) return;

  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(raw);
    u.lang = "ar-SA";
    u.rate = 1;
    u.pitch = 1;
    window.speechSynthesis.speak(u);
  } catch (e) {
    console.warn("TTS_ERROR", e);
  }
}

// =======================
// إنشاء أزرار تحت "إرسال"
// =======================

function makeActionsRow() {
  if (!elForm && !elInput) return;

  // نبحث عن الفورم أو صف الإدخال لنضيف تحته
  const anchor =
    elForm ||
    (elInput ? elInput.closest("form") : null) ||
    document.querySelector(".ask") ||
    document.body;

  let row = document.querySelector(".actions-row");
  if (!row) {
    row = document.createElement("div");
    row.className = "actions-row";
  } else {
    row.innerHTML = "";
  }

  // زر قراءة الإجابة
  elTtsBtn = document.createElement("button");
  elTtsBtn.type = "button";
  elTtsBtn.className = "tts-btn";
  elTtsBtn.textContent = "قراءة الإجابة 🔊";
  elTtsBtn.addEventListener("click", speakAnswer);

  // زر السؤال الصوتي
  elMicBtn = document.createElement("button");
  elMicBtn.type = "button";
  elMicBtn.className = "mic-btn";
  elMicBtn.textContent = "سؤال صوتي 🎙";
  elMicBtn.addEventListener("click", toggleListening);

  row.appendChild(elTtsBtn);
  row.appendChild(elMicBtn);

  // نضع الصف مباشرة بعد الفورم / سطر الإدخال
  if (anchor.nextSibling) {
    anchor.parentNode.insertBefore(row, anchor.nextSibling);
  } else {
    anchor.parentNode.appendChild(row);
  }
}

// تشغيل كل شيء
wireForm();
makeActionsRow();
