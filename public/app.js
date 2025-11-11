// =======================
// دُرّى – واجهة الرياضيات
// =======================

// عنوان الخادم
const API_BASE = "https://durra-server.onrender.com";

// عناصر الصفحة
const elForm =
  document.getElementById("form") ||
  document.querySelector("form");

const elInput =
  document.getElementById("textInput") ||
  document.querySelector("#textInput, textarea, input[type='text']");

const elAnswer =
  document.getElementById("answer") ||
  document.querySelector("#answerBox, .result");

// أزرار الواجهة (ارسال – سؤال صوتي – قراءة الإجابة)
const elBtnSend =
  document.getElementById("btnSend") ||
  document.querySelector("[data-send]");

const elBtnMic =
  document.getElementById("btnMic") ||
  document.querySelector("[data-mic]");

const elBtnTts =
  document.getElementById("btnTts") ||
  document.querySelector("[data-tts]");

// صندوق لعرض السؤال + الإجابة (لو موجود)
const elPanel =
  document.getElementById("panel") ||
  document.querySelector(".panel");

let lastAnswerText = "";
let isLoading = false;

// =======================
// دوال مساعدة للنص
// =======================

// تنظيف النص من ماركداون/لاتك و أشياء مزعجة للقراءة
function basicClean(text) {
  if (!text) return "";

  let t = String(text);

  // نحذف كود محصور بين ```
  t = t.replace(/```[\s\S]*?```/g, "");

  // نحذف ** التسمين و ` الكود
  t = t.replace(/\*\*/g, "");
  t = t.replace(/`/g, "");

  // نحذف أوامر لاتك الشائعة
  t = t.replace(/\frac|sqrt|cdot|pm|left|right|times|div)\b/g, "");
  t = t.replace(/\\[\[]/g, "");

  // نحول عناوين ### و ## إلى سطر جديد
  t = t.replace(/#+\s*/g, "\n");

  // نقلل التكرار في الفراغات والأسطر
  t = t.replace(/[ \t]+/g, " ");
  t = t.replace(/\n{3,}/g, "\n\n");

  return t.trim();
}

// تحويل الأسس 5^2 → 5² (تقريب بسيط)
const superMap = {
  "0": "⁰", "1": "¹", "2": "²", "3": "³",
  "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷",
  "8": "⁸", "9": "⁹"
};
function toSuperscript(numStr) {
  return String(numStr).split("").map(ch => superMap[ch] || ch).join("");
}
function convertPowers(text) {
  return text.replace(/(\d+)\s*\^\s*(\d+)/g, (m, base, power) => {
    return base + toSuperscript(power);
  });
}

// تحويل كسور بسيطة 1/4 → عنصر بسط/مقام
function convertFractionsToHtml(text) {
  return text.replace(/\b(\d{1,3})\s*\/\s*(\d{1,3})\b/g, (m, top, bottom) => {
    return `<span class="frac"><span class="top">${top}</span><span class="bottom">${bottom}</span></span>`;
  });
}

// تحضير النص للعرض في الـ HTML
function prepareForDisplay(rawText) {
  let t = basicClean(rawText);
  t = convertPowers(t);
  t = t.replace(/\n/g, "<br>");
  t = convertFractionsToHtml(t);
  return t;
}

// تحضير النص للقراءة الصوتية (بدون رموز HTML)
function prepareForSpeech(rawText) {
  let t = basicClean(rawText);
  // نلطف الكسور 1/4 → "واحد على أربعة"
  t = t.replace(/\b(\d{1,3})\s*\/\s*(\d{1,3})\b/g, (m, a, b) => {
    return `${a} على ${b}`;
  });
  // الأسس 5^2 → "خمسة أس اثنين"
  t = t.replace(/(\d+)\s*\^\s*(\d+)/g, (m, base, power) => {
    return `${base} أس ${power}`;
  });
  return t;
}

// إظهار نص في مربع الإجابة
function showAnswer(text) {
  if (!elAnswer) return;
  const html = prepareForDisplay(text);
  elAnswer.innerHTML = html || "";
  lastAnswerText = text || "";
}

// مسح السؤال والإجابة القديمة
function clearQA() {
  if (elInput) elInput.value = "";
  if (elAnswer) elAnswer.innerHTML = "";
  lastAnswerText = "";
}

// تفعيل / إيقاف حالة "جاري التفكير"
function setLoading(state) {
  isLoading = !!state;
  if (elBtnSend) elBtnSend.disabled = isLoading;
  if (elBtnMic) elBtnMic.disabled = isLoading;

  if (isLoading) {
    showAnswer("… جاري التفكير");
  }
}

// =======================
// الاتصال بالـ API
// =======================

function pickReplyFromData(data) {
  if (!data) return "";
  if (typeof data === "string") return data;

  // أشكال مختلفة ممكن يرجعها الخادم
  if (data.reply) return data.reply;
  if (data.answer) return data.answer;
  if (data.text) return data.text;

  if (Array.isArray(data.choices) &&
      data.choices[0] &&
      data.choices[0].message &&
      data.choices[0].message.content) {
    return data.choices[0].message.content;
  }

  return "";
}

async function ask(questionOverride) {
  if (!elInput) {
    alert("⚠ لم أجد خانة السؤال في الصفحة.");
    return;
  }

  const q = (questionOverride || elInput.value || "").trim();
  if (!q) {
    showAnswer("✏️ اكتب سؤالك أولاً.");
    return;
  }

  setLoading(true);

  try {
    const payload = {
      message: q,
      question: q,
      history: [],
      subject: "math"
    };

    // نحاول /api/chat أولاً
    let resp = await fetch(`${API_BASE}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch(() => null);

    // في حال ما اشتغل المسار هذا، نجرب /ask كخطة بديلة
    if (!resp || resp.status === 404) {
      resp = await fetch(`${API_BASE}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      }).catch(() => null);
    }

    if (!resp) {
      showAnswer("⚠ تعذّر الاتصال بالخادم الآن. جرّبي بعد قليل.");
      return;
    }

    const data = await resp.json().catch(() => ({}));

    // لو الخادم رجّع رسالة خطأ داخل JSON
    if (data && data.error) {
      console.warn("SERVER_ERROR:", data.error);
      showAnswer("⚠ تعذّر إكمال الإجابة الآن بسبب ضغط على الخادم. انتظر دقيقة ثم جرّب مرة أخرى.");
      return;
    }

    const reply = pickReplyFromData(data);
    if (!reply) {
      showAnswer("⚠ لم تصل إجابة مفهومة من الخادم.");
      return;
    }

    clearQA(); // نمسح السؤال من الخانة
    showAnswer(reply);
    speakAnswer(reply);
  } catch (err) {
    console.error("ASK_ERROR", err);
    showAnswer("⚠ حدث خطأ غير متوقّع. حاول مرة أخرى.");
  } finally {
    setLoading(false);
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
    alert("العفو، المتصفح لا يدعم السؤال الصوتي (جرّبي Google Chrome).");
    return null;
  }
  const rec = new SR();
  rec.lang = "ar-SA";
  rec.interimResults = false;
  rec.maxAlternatives = 1;

  rec.onstart = () => {
    listening = true;
    if (elBtnMic) elBtnMic.textContent = "إيقاف الاستماع";
  };

  rec.onresult = (e) => {
    const txt = (e.results?.[0]?.[0]?.transcript || "").trim();
    if (elInput) elInput.value = txt;
    if (txt) ask(txt);
  };

  rec.onerror = () => {
    showAnswer("⚠ تعذّر الاستماع، حاوِل مرة أخرى.");
  };

  rec.onend = () => {
    listening = false;
    if (elBtnMic) elBtnMic.textContent = "سؤال صوتي 🎙";
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
// قراءة الإجابة (SpeechSynthesis)
// =======================

let ttsEnabled = true;
let currentVoice = null;

function chooseVoice() {
  const voices = speechSynthesis.getVoices();
  const ar = voices.filter(v => (v.lang || "").toLowerCase().startsWith("ar"));
  currentVoice = ar[0] || voices.find(v => /arabic/i.test(v.name)) || null;
}
if ("speechSynthesis" in window) {
  chooseVoice();
  window.speechSynthesis.onvoiceschanged = chooseVoice;
}

function speakAnswer(text) {
  if (!ttsEnabled) return;
  if (!("speechSynthesis" in window)) return;
  const clean = prepareForSpeech(text);
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(clean);
    if (currentVoice) u.voice = currentVoice;
    u.lang = (currentVoice && currentVoice.lang) || "ar-SA";
    u.rate = 1;
    u.pitch = 1;
    speechSynthesis.speak(u);
  } catch (e) {
    console.warn("TTS_ERROR", e);
  }
}

function manualRead() {
  if (!lastAnswerText) return;
  speakAnswer(lastAnswerText);
}

// =======================
// ربط الأحداث
// =======================

function wire() {
  if (elForm) {
    elForm.addEventListener("submit", (e) => {
      e.preventDefault();
      ask();
    });
  }

  if (elBtnSend) {
    elBtnSend.addEventListener("click", () => ask());
  }

  if (elInput) {
    elInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        ask();
      }
    });
  }

  if (elBtnMic) {
    elBtnMic.addEventListener("click", toggleListening);
  }

  if (elBtnTts) {
    elBtnTts.addEventListener("click", manualRead);
  }

  console.log("[Durra] wired ✅");
}

wire();
