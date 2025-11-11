// دُرّى — واجهة مبسطة مرتبطة بالسيرفر الجديد

const API_BASE = "https://durra-server.onrender.com";

// دالة تنظيف نص الإجابة من الرموز الغريبة
function cleanAnswer(text) {
  if (!text) return "";

  let t = text;

  // إزالة أي كود محصور بين ```
  t = t.replace(/```[\s\S]*?```/g, "");

  // حذف أوامر LaTeX الشائعة
  t = t.replace(/\\(frac|sqrt|cdot|times|div|left|right|begin|end|displaystyle)[^ \n]*/g, "");

  // إزالة الأقواس الخاصة بـ LaTeX
  t = t.replace(/\\[\[\]\(\)]/g, "");

  // استبدال div / times إن ظهرت
  t = t.replace(/(\d+)\s*div\s*(\d+)/gi, "$1 ÷ $2");
  t = t.replace(/(\d+)\s*times\s*(\d+)/gi, "$1 × $2");

  // إزالة النجوم المزدوجة من التنسيق
  t = t.replace(/\*\*/g, "");

  // تصحيح بعض المسافات
  t = t.replace(/[ \t]+/g, " ");
  t = t.replace(/\n{3,}/g, "\n\n");

  return t.trim();
}

// العثور على العناصر الرئيسية
const elForm =
  document.querySelector("form") ||
  document.getElementById("form");

const elInput =
  document.getElementById("textInput") ||
  document.querySelector("input[type='text'], textarea");

let elMessages =
  document.getElementById("messages") ||
  document.querySelector(".messages");

// لو ما فيه messages ننشئ واحد تحت الفورم
if (!elMessages && elForm) {
  elMessages = document.createElement("div");
  elMessages.id = "messages";
  elForm.parentElement.appendChild(elMessages);
}

// إضافة رسالة إلى مربع المحادثة
function addMessage(text, who = "assistant") {
  if (!elMessages) return;
  const div = document.createElement("div");
  div.className = "message " + (who === "user" ? "user" : "assistant");
  div.textContent = text;
  elMessages.appendChild(div);
  elMessages.scrollTop = elMessages.scrollHeight;
  return div;
}

// دالة عرض نص بسيط (مثلاً رسائل الخطأ)
function showStatus(msg) {
  addMessage(msg, "assistant");
}

// الدالة الرئيسية لإرسال السؤال
async function ask() {
  if (!elInput) {
    showStatus("⚠ لم أجد خانة السؤال في الصفحة.");
    return;
  }

  const q = (elInput.value || "").trim();
  if (!q) {
    showStatus("✏️ اكتبي سؤالك أولاً.");
    return;
  }

  // أضيف سؤال المستخدم
  addMessage(q, "user");
  elInput.value = "";

  // رسالة "جاري التفكير..."
  const thinking = addMessage("… جاري التفكير", "assistant");

  try {
    const resp = await fetch(`${API_BASE}/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: q }),
    });

    const data = await resp.json().catch(() => ({}));
    if (thinking) thinking.remove();

    if (!resp.ok) {
      const msg = data?.error || "⚠ تعذّر الحصول على إجابة من الخادم.";
      showStatus(`⚠ الخادم قال: ${msg}`);
      return;
    }

    const raw =
      data.answer || data.reply || data.text || "لم تصل إجابة مفهومة من الخادم.";
    const cleaned = cleanAnswer(raw);
    addMessage(cleaned, "assistant");
  } catch (e) {
    console.error("ASK_ERROR", e);
    if (thinking) thinking.remove();
    showStatus("⚠ صار خطأ في الاتصال، حاولي مرة أخرى.");
  }
}

// ربط الفورم بزر «إرسال» و إنتر
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

// ===== الأزرار الصوتية: سؤال صوتي + الإجابة الصوتية =====

// ننشئ صف الأزرار تحت الفورم
let btnAskVoice = null;
let btnAnswerVoice = null;

if (elForm) {
  const row = document.createElement("div");
  row.className = "voice-row";

  btnAskVoice = document.createElement("button");
  btnAskVoice.type = "button";
  btnAskVoice.id = "btnVoiceQuestion";
  btnAskVoice.className = "voice-btn";
  btnAskVoice.textContent = "🎙 سؤال صوتي";

  btnAnswerVoice = document.createElement("button");
  btnAnswerVoice.type = "button";
  btnAnswerVoice.id = "btnVoiceAnswer";
  btnAnswerVoice.className = "voice-btn";
  btnAnswerVoice.textContent = "🔊 الإجابة الصوتية";

  row.appendChild(btnAskVoice);
  row.appendChild(btnAnswerVoice);
  elForm.parentElement.insertBefore(row, elForm.nextSibling);
}

// === السؤال الصوتي (SpeechRecognition) ===
let recognition = null;
let listening = false;

function ensureRecognition() {
  if (recognition) return recognition;
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    alert("المتصفح لا يدعم السؤال الصوتي. حاولي من Google Chrome.");
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
    if (txt) ask();
  };

  rec.onerror = () => {
    showStatus("⚠ تعذّر الاستماع، حاولي مرة أخرى.");
  };

  rec.onend = () => {
    listening = false;
    if (btnAskVoice) btnAskVoice.textContent = "🎙 سؤال صوتي";
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
    console.warn("SR_TOGGLE_ERROR", e);
  }
}

if (btnAskVoice) {
  btnAskVoice.addEventListener("click", toggleListening);
}

// === الإجابة الصوتية (SpeechSynthesis) ===
function speakLastAnswer() {
  if (!window.speechSynthesis) {
    alert("المتصفح لا يدعم قراءة الإجابة صوتيًا.");
    return;
  }
  if (!elMessages) return;

  // نأخذ آخر رسالة من المساعدة
  const msgs = Array.from(
    elMessages.querySelectorAll(".message.assistant")
  );
  if (!msgs.length) {
    showStatus("لا توجد إجابة لقراءتها بعد.");
    return;
  }
  const last = msgs[msgs.length - 1];
  const text = last.textContent || "";
  if (!text.trim()) return;

  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "ar-SA";
  u.rate = 1;
  u.pitch = 1;
  window.speechSynthesis.speak(u);
}

if (btnAnswerVoice) {
  btnAnswerVoice.addEventListener("click", speakLastAnswer);
}

console.log("[Durra] front-end wired.");
