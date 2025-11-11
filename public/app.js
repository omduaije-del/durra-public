// =======================
// دُرّى — واجهة مبسطة (سؤال نصي + سؤال صوتي + قراءة الإجابة)
// =======================

const API_BASE = "https://durra-server.onrender.com";

// تعديل نص السطر التحتي من المؤنث إلى المذكر إن وُجد
const subTitle = document.querySelector(".sub");
if (subTitle) {
  subTitle.textContent =
    "فقط عن الرياضيات — اطرح سؤالك كتابياً أو صوتياً، ويمكنك سماع الإجابة اختيارياً.";
}

// نحاول التقاط عناصر الصفحة الأساسية
const elForm =
  document.getElementById("form") ||
  document.querySelector("form");

const elInput =
  document.getElementById("textInput") ||
  document.querySelector("input[type='text'], textarea");

let elAnswer =
  document.getElementById("answer") ||
  document.getElementById("result") ||
  document.querySelector(".result");

// لو ما لقينا مربع إجابة، نخلق واحد بسيط تحت الفورم
if (!elAnswer && elForm) {
  const panel = document.createElement("div");
  panel.className = "panel";
  elAnswer = document.createElement("div");
  elAnswer.id = "answer";
  elAnswer.className = "result";
  panel.appendChild(elAnswer);
  elForm.insertAdjacentElement("afterend", panel);
}

// دالّة مساعدة لعرض النص في مربع الإجابة
function setAnswer(text) {
  if (!elAnswer) return;
  elAnswer.textContent = text || "";
}

// تنظيف النص من الرموز الزائدة / تنسيقات ماركداون ولاتيك
function cleanAnswer(raw) {
  if (!raw) return "";

  let txt = String(raw);

  // إزالة أي كود محصور بين ```
  txt = txt.replace(/```[\s\S]*?```/g, "");

  // إزالة الوسوم الزائدة لو جاء HTML
  txt = txt.replace(/<\/?[^>]+>/g, "");

  // تحويل بعض أوامر LaTeX إلى أشكال أبسط
  txt = txt
    .replace(/\\times|times/g, " × ")
    .replace(/\\cdot|cdot/g, " × ")
    .replace(/\\div|div/g, " ÷ ")
    .replace(/\\pm/g, " ± ")
    .replace(/\\sqrt/g, " جذر ")
    .replace(/\\geq?/g, " ≥ ")
    .replace(/\\leq?/g, " ≤ ");

  // \frac{a}{b} → a / b
  txt = txt.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, "$1 / $2");

  // إزالة أقواس الماث \[ \] \( \)
  txt = txt.replace(/\\[\[\]\(\)]/g, "");

  // إزالة باقي الباك سلاشات التي لا نحتاجها
  txt = txt.replace(/\\+/g, "");

  // إزالة ** و _ و ` المستخدمة للتنسيق
  txt = txt
    .replace(/\*\*/g, "")
    .replace(/`/g, "")
    .replace(/_/g, " ");

  // تقليل المسافات والأسطر الفارغة
  txt = txt.replace(/[ \t]+/g, " ");
  txt = txt.replace(/\n{3,}/g, "\n\n");

  return txt.trim();
}

// نفس التنظيف تقريباً لكن أبسط للصوت
function cleanForSpeech(raw) {
  let txt = cleanAnswer(raw);

  // نحاول إزالة أشياء لا تُنطق بشكل مفيد
  txt = txt.replace(/[\{\}\[\]\^\$#]/g, " ");
  txt = txt.replace(/\s{2,}/g, " ");

  return txt.trim();
}

// =======================
// إرسال السؤال للنهاية الخلفية
// =======================

async function ask() {
  if (!elInput) {
    setAnswer("⚠ لم أجد خانة السؤال في الصفحة.");
    return;
  }

  const q = (elInput.value || "").trim();
  if (!q) {
    setAnswer("✏️ اكتب سؤالك أولاً.");
    return;
  }

  // عند البدء بسؤال جديد: نمسح الإجابة القديمة ونظهر (جاري التفكير)
  setAnswer("… جاري التفكير في الحل");
  elInput.value = "";

  try {
    const resp = await fetch(`${API_BASE}/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: q }),
    }).catch(() => null);

    if (!resp) {
      setAnswer("⚠ تعذّر الاتصال بالخادم. حاول مرة أخرى بعد قليل.");
      return;
    }

    const data = await resp.json().catch(() => null);
    if (!data) {
      setAnswer("⚠ حصل خطأ في قراءة رد الخادم.");
      return;
    }

    let answer = data.answer || data.reply || data.text || "";

    // 🔹 هنا التعديل: ما نعرض رسالة "الخادم قال"، نعطي رسالة لطيفة عامة
    if (!answer) {
      if (data.error) {
        answer =
          "⚠ تعذّر إكمال الإجابة الآن بسبب ضغط على الخادم. انتظر دقيقة ثم حاول مرة أخرى.";
      } else {
        answer =
          "⚠ لم تصل إجابة واضحة من الخادم. حاول صياغة السؤال بشكل أبسط أو جرّب مرة أخرى.";
      }
    }

    const cleaned = cleanAnswer(answer);
    setAnswer(cleaned);
    speakIfEnabled(cleanForSpeech(cleaned));
  } catch (err) {
    console.error("ASK_ERROR", err);
    setAnswer("⚠ حصل خطأ أثناء الاتصال بالخادم. حاول مرة أخرى.");
  }
}

// عندما يبدأ المستخدم في كتابة سؤال جديد نمسح الإجابة القديمة
if (elInput) {
  elInput.addEventListener("input", () => {
    if (!elAnswer) return;
    if (
      elAnswer.textContent &&
      !elAnswer.textContent.startsWith("… جاري التفكير")
    ) {
      elAnswer.textContent = "";
    }
  });
}

// ربط الفورم بزر الإرسال وإنتر
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

// =======================
// السؤال الصوتي (STT)
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
    if (btnMic) btnMic.textContent = "⏹ إيقاف السؤال الصوتي";
  };

  rec.onresult = (e) => {
    const txt =
      (e.results &&
        e.results[0] &&
        e.results[0][0] &&
        e.results[0][0].transcript) ||
      "";
    if (elInput) {
      elInput.value = txt.trim();
    }
    if (txt.trim()) {
      ask();
    }
  };

  rec.onerror = (e) => {
    console.warn("STT_ERROR", e);
    alert("⚠ تعذّر الاستماع للسؤال. حاول مرة أخرى.");
  };

  rec.onend = () => {
    listening = false;
    if (btnMic) btnMic.textContent = "🎙 سؤال صوتي";
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
    console.warn("STT_TOGGLE_ERROR", e);
  }
}

// =======================
// قراءة الإجابة بصوت عالٍ (TTS)
// =======================

let ttsEnabled = false;
let currentVoice = null;

function chooseVoice() {
  const voices = window.speechSynthesis
    ? window.speechSynthesis.getVoices()
    : [];
  const arVoices = voices.filter((v) =>
    (v.lang || "").toLowerCase().startsWith("ar")
  );
  currentVoice =
    arVoices[0] || voices.find((v) => /arabic/i.test(v.name)) || null;
}

if ("speechSynthesis" in window) {
  chooseVoice();
  window.speechSynthesis.onvoiceschanged = chooseVoice;
}

function speakIfEnabled(text) {
  if (!ttsEnabled) return;
  if (!("speechSynthesis" in window)) return;
  if (!text) return;

  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    if (currentVoice) {
      u.voice = currentVoice;
      u.lang = currentVoice.lang;
    } else {
      u.lang = "ar-SA";
    }
    u.rate = 1;
    u.pitch = 1;
    window.speechSynthesis.speak(u);
  } catch (e) {
    console.warn("TTS_ERROR", e);
  }
}

// =======================
// إنشاء أزرار السؤال الصوتي + الإجابة الصوتية تحت زر "إرسال"
// =======================

let btnMic =
  document.getElementById("btnMic") ||
  document.querySelector("[data-mic]");

let btnTTS =
  document.getElementById("btnTTS") ||
  document.querySelector("[data-tts]");

(function ensureAudioButtons() {
  if (!elForm) return;

  const bar = document.createElement("div");
  bar.style.display = "flex";
  bar.style.gap = "8px";
  bar.style.marginTop = "8px";

  if (!btnMic) {
    btnMic = document.createElement("button");
    btnMic.type = "button";
    btnMic.id = "btnMic";
    btnMic.textContent = "🎙 سؤال صوتي";
  }

  if (!btnTTS) {
    btnTTS = document.createElement("button");
    btnTTS.type = "button";
    btnTTS.id = "btnTTS";
    btnTTS.textContent = "🔈 تشغيل قراءة الإجابة";
  }

  bar.appendChild(btnMic);
  bar.appendChild(btnTTS);

  elForm.insertAdjacentElement("afterend", bar);
})();

// ربط الأزرار
if (btnMic) {
  btnMic.addEventListener("click", toggleListening);
}

if (btnTTS) {
  btnTTS.addEventListener("click", () => {
    ttsEnabled = !ttsEnabled;
    if (!ttsEnabled && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    btnTTS.textContent = ttsEnabled
      ? "🔊 إيقاف قراءة الإجابة"
      : "🔈 تشغيل قراءة الإجابة";
  });
}
