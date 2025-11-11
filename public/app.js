// =======================
// دُرّى — واجهة مبسّطة (سؤال نصي + سؤال صوتي + قراءة صوتية للإجابة)
// =======================

const API_BASE = "https://durra-server.onrender.com";

// ========== عناصر الصفحة الأساسية ==========
const elForm =
  document.getElementById("form") ||
  document.querySelector("form");

const elInput =
  document.getElementById("textInput") ||
  document.querySelector("input[type='text'], textarea");

let elMessages =
  document.getElementById("messages") ||
  document.querySelector(".messages");

// لو ما لقينا صندوق رسائل، نخلق واحد بسيط
if (!elMessages) {
  elMessages = document.createElement("div");
  elMessages.id = "messages";
  elMessages.style.cssText =
    "max-width:980px;margin:24px auto 0;padding:16px 18px;border-radius:16px;border:1px solid #1e293b;background:#020617;color:#e5e7eb;font-size:17px;line-height:1.9;white-space:pre-wrap;min-height:80px;";
  (elForm?.parentElement || document.body).appendChild(elMessages);
}

// ========== دالة تنظيف وتحسين نص الإجابة ==========
function cleanAnswer(raw) {
  if (!raw) return "";

  let t = String(raw);

  // نحذف أي بلوك كود ```...```
  t = t.replace(/```[\s\S]*?```/g, "");

  // نحذف محددات المعادلات $$ أو $
  t = t.replace(/\$\$?/g, "");

  // نحذف تنسيقات ماركداون البسيطة
  t = t.replace(/\*\*/g, "");
  t = t.replace(/`/g, "");

  // نحول بعض أوامر LaTeX لشيء مقروء بالعربي
  t = t.replace(/\\cdot/g, " × ");
  t = t.replace(/\\times/g, " × ");
  t = t.replace(/\\div/g, " ÷ ");
  t = t.replace(/\\sqrt/g, " جذر ");
  t = t.replace(/\\leq/g, " ≤ ");
  t = t.replace(/\\geq/g, " ≥ ");

  // \frac{a}{b}  =>  a على b
  t = t.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, "$1 على $2");

  // نحذف الأقواس المائلة من LaTeX مثل \( \) \[ \]
  t = t.replace(/\\[\[\]\(\)]/g, "");

  // استبدال \\ بسطر جديد
  t = t.replace(/\\\\/g, "\n");

  // نحول النجمة * إلى × بين الأرقام
  t = t.replace(/([0-9])\*([0-9])/g, "$1 × $2");

  // نحول x الإنجليزية إلى س (متغير)
  t = t.replace(/[xX]/g, " س ");

  // نحول الأرقام 0-9 إلى أرقام عربية ٠-٩
  const arabicDigits = { "0":"٠","1":"١","2":"٢","3":"٣","4":"٤","5":"٥","6":"٦","7":"٧","8":"٨","9":"٩" };
  t = t.replace(/[0-9]/g, d => arabicDigits[d] || d);

  // نقلل المسافات والأسطر الفارغة
  t = t.replace(/[ \t]+/g, " ");
  t = t.replace(/\n{3,}/g, "\n\n");

  return t.trim();
}

// ========== دالة إضافة رسالة ==========
function addMessage(text, who = "assistant") {
  if (!elMessages) return;

  const div = document.createElement("div");
  div.className = "message " + (who === "user" ? "user" : "assistant");
  div.style.margin = "6px 0";

  // نسمح بسطر جديد لكن بدون HTML خطير
  div.textContent = text;
  elMessages.appendChild(div);
  elMessages.scrollTop = elMessages.scrollHeight;
}

// نخزن آخر إجابة علشان القراءة الصوتية
let lastAnswerText = "";

// ========== الدالة الرئيسية: إرسال السؤال ==========
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

  // نبدأ سؤال جديد: نمسح الرسائل السابقة
  elMessages.innerHTML = "";
  lastAnswerText = "";

  // نعرض السؤال أعلى الإجابة كمرجع
  addMessage("❓ السؤال: " + q, "user");

  // نفرّغ خانة الإدخال
  elInput.value = "";

  // رسالة "جاري التفكير..."
  const thinking = document.createElement("div");
  thinking.className = "message assistant";
  thinking.textContent = "… جاري التفكير";
  thinking.style.margin = "6px 0";
  elMessages.appendChild(thinking);
  elMessages.scrollTop = elMessages.scrollHeight;

  try {
    const payload = { question: q };

    const resp = await fetch(`${API_BASE}/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await resp.json().catch(() => ({}));
    thinking.remove();

    // لو الخادم أرسل رسالة جاهزة للمستخدم
    if (data && data.userMessage) {
      const nice = cleanAnswer(data.userMessage);
      lastAnswerText = nice;
      addMessage(nice || "تعذّر إكمال الإجابة الآن.", "assistant");
      return;
    }

    const raw =
      (data && (data.reply || data.answer || data.text)) || "";

    if (!raw) {
      const msg =
        "⚠ تعذّر إكمال الإجابة الآن بسبب ضغط على الخادم. انتظر دقيقة ثم حاول مرة أخرى.";
      lastAnswerText = msg;
      addMessage(msg, "assistant");
      return;
    }

    const nice = cleanAnswer(raw);
    lastAnswerText = nice;
    addMessage(nice, "assistant");
  } catch (e) {
    console.error("ASK_ERROR", e);
    thinking.remove();
    const msg =
      "⚠ تعذّر إكمال الإجابة الآن بسبب خطأ مفاجئ في الخادم. انتظر قليلًا ثم حاول مرة أخرى.";
    lastAnswerText = msg;
    addMessage(msg, "assistant");
  }
}

// ========== السؤال الصوتي (تحويل الكلام إلى نص) ==========
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
    if (btnAskVoice) btnAskVoice.textContent = "⏹ إيقاف الاستماع";
  };

  rec.onresult = (e) => {
    const txt = (e.results?.[0]?.[0]?.transcript || "").trim();
    if (elInput) elInput.value = txt;
    if (txt) {
      ask();
    }
  };

  rec.onerror = (e) => {
    console.warn("STT_ERROR:", e.error);
    addMessage("⚠ تعذّر الاستماع، حاوِل مرة أخرى.", "assistant");
  };

  rec.onend = () => {
    listening = false;
    if (btnAskVoice) btnAskVoice.textContent = "🎤 سؤال صوتي";
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

// ========== القراءة الصوتية للإجابة (Text-to-Speech) ==========
let ttsEnabled = true;
let currentUtterance = null;

function speakAnswer() {
  if (!lastAnswerText) {
    addMessage("لا توجد إجابة لقراءتها الآن.", "assistant");
    return;
  }
  if (!("speechSynthesis" in window)) {
    alert("العفو، المتصفح لا يدعم قراءة الإجابة صوتيًا.");
    return;
  }
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(lastAnswerText);
    u.lang = "ar-SA";
    u.rate = 1;
    u.pitch = 1;
    currentUtterance = u;
    window.speechSynthesis.speak(u);
  } catch (e) {
    console.warn("TTS_ERROR", e);
  }
}

function stopSpeaking() {
  try {
    window.speechSynthesis.cancel();
  } catch (e) {
    console.warn("TTS_CANCEL_ERROR", e);
  }
}

// ========== إنشاء الأزرار وتوصيل الأحداث ==========
let btnAskVoice = document.getElementById("btnAskVoice");
let btnReadAnswer = document.getElementById("btnReadAnswer");

(function setupButtons() {
  const buttonsWrapper = document.createElement("div");
  buttonsWrapper.style.cssText =
    "display:flex;gap:8px;margin-top:10px;justify-content:flex-end;";

  const parent = elForm || elInput?.parentElement || document.body;

  if (!btnAskVoice) {
    btnAskVoice = document.createElement("button");
    btnAskVoice.id = "btnAskVoice";
    btnAskVoice.type = "button";
    btnAskVoice.textContent = "🎤 سؤال صوتي";
    btnAskVoice.style.cssText =
      "padding:9px 14px;border-radius:10px;border:1px solid #1d4ed8;background:#020617;color:#e5e7eb;cursor:pointer;font-size:14px;";
    buttonsWrapper.appendChild(btnAskVoice);
  }

  if (!btnReadAnswer) {
    btnReadAnswer = document.createElement("button");
    btnReadAnswer.id = "btnReadAnswer";
    btnReadAnswer.type = "button";
    btnReadAnswer.textContent = "🔊 قراءة الإجابة";
    btnReadAnswer.style.cssText =
      "padding:9px 14px;border-radius:10px;border:1px solid #22c55e;background:#022c22;color:#dcfce7;cursor:pointer;font-size:14px;";
    buttonsWrapper.appendChild(btnReadAnswer);
  }

  if (buttonsWrapper.children.length > 0) {
    parent.appendChild(buttonsWrapper);
  }
})();

// ========== ربط الأحداث الرئيسية ==========
function wire() {
  if (elForm) {
    elForm.addEventListener("submit", (e) => {
      e.preventDefault();
      ask();
    });
  } else if (elInput) {
    // في حال ما فيه فورم، نرسل بالسطر "إنتر"
    elInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        ask();
      }
    });
  }

  if (btnAskVoice) {
    btnAskVoice.addEventListener("click", toggleListening);
  }

  if (btnReadAnswer) {
    btnReadAnswer.addEventListener("click", () => {
      if (window.speechSynthesis.speaking) {
        stopSpeaking();
      } else {
        speakAnswer();
      }
    });
  }

  console.log("[DURRA] wired: form=%s input=%s messages=%s",
    !!elForm, !!elInput, !!elMessages);
}

wire();
