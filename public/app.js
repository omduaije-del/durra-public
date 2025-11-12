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
    "max-height:420px;overflow:auto;margin-top:24px;padding:18px;border-radius:18px;border:1px solid #1e293b;background:#020617cc;color:#e2e8f0;font-size:15px;line-height:1.8;";
  elForm.insertAdjacentElement("afterend", elMessages);
}

// أزرار اختيارية (لو موجودة في الصفحة)
let elMicBtn =
  document.getElementById("btnMic") ||
  document.querySelector("[data-role='mic']");

let elReadBtn =
  document.getElementById("btnRead") ||
  document.querySelector("[data-role='tts']");

/** حالة قراءة الإجابة صوتيًا (تشغيل/إيقاف) */
let isReading = false;

// لتخزين آخر إجابة من دُرّى (للصوت)
let lastAssistantText = "";

// =======================
// دوال مساعدة لعرض الرسائل
// =======================

function scrollMessagesToBottom() {
  try {
    elMessages.scrollTop = elMessages.scrollHeight;
  } catch (e) {
    // تجاهل
  }
}

function createMessageBubble(text, sender = "assistant") {
  const wrapper = document.createElement("div");
  wrapper.className = "msg-row " + sender;

  const bubble = document.createElement("div");
  bubble.className =
    sender === "user" ? "msg msg-user" : "msg msg-assistant";

  // نُبقي النص كما هو (بدون HTML) لتفادي أي أخطار
  bubble.textContent = text;

  wrapper.appendChild(bubble);
  return wrapper;
}

function addMessage(text, sender = "assistant") {
  if (!elMessages) return;

  const bubble = createMessageBubble(text, sender);
  elMessages.appendChild(bubble);
  scrollMessagesToBottom();
}

// =======================
// تنظيف وتجميل نص الإجابة
// =======================

function cleanText(raw) {
  if (!raw) return "";

  let text = String(raw);

  // إزالة المسافات في البداية والنهاية
  text = text.trim();

  // إزالة كتل الكود ``` ... ```
  text = text.replace(/```[\s\S]*?```/g, "");

  // إزالة علامات العناوين في ماركداون (#, ##, ###)
  text = text.replace(/^#{1,6}\s*/gm, "");

  // إزالة النجوم الزائدة **粗**
  text = text.replace(/\*\*/g, "");

  // إزالة الروابط بصيغة [نص](رابط)
  text = text.replace(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g, "$1");

  // استبدال بعض رموز LaTeX الشائعة برموز بسيطة
  text = text
    .replace(/\\times|\\cdot/g, "×")
    .replace(/\\div/g, "÷")
    .replace(/\\leq/g, "≤")
    .replace(/\\geq/g, "≥")
    .replace(/\\neq/g, "≠")
    .replace(/\\approx/g, "≈")
    .replace(/\\sqrt\{([^}]+)\}/g, "√($1)")
    .replace(/\\pi\b/g, "π");

  // تحويل الكسور البسيطة على شكل a/b إلى نمط مقروء (ليس ضروريًا لكنها حركة لطيفة)
  text = text.replace(/(\d+)\s*\/\s*(\d+)/g, "$1⁄$2");

  // توحيد الأسطر المكررة الفارغة
  text = text.replace(/\n{3,}/g, "\n\n");

  // إزالة العلامات الغريبة المتكررة
  text = text
    .replace(/[■◆◇◆]+/g, "")
    .replace(/[·•]+/g, "•");

  // بعض المنصات ترجع مسافات غريبة
  text = text.replace(/\u00A0/g, " ");

  // إزالة أي backticks مفردة باقية
  text = text.replace(/`/g, "");

  // تقليل المسافات المكرّرة
  text = text.replace(/ {2,}/g, " ");

  return text.trim();
}

// =======================
// استدعاء API
// =======================

async function askQuestionToAPI(question) {
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
// تشغيل واجهة المستخدم
// =======================

let isBusy = false;

async function ask() {
  if (isBusy) return;

  const q = (elInput && elInput.value ? elInput.value : "").trim();
  if (!q) {
    if (elInput) elInput.focus();
    return;
  }

  isBusy = true;

  // إضافة رسالة المستخدم
  addMessage(q, "user");

  // مسح الحقل
  if (elInput) {
    elInput.value = "";
    elInput.disabled = true;
  }

  // رسالة انتظار
  const thinkingMsg = createMessageBubble(
    "ثواني… دعيني أفكّر في الحل خطوة خطوة 🤍",
    "assistant"
  );
  elMessages.appendChild(thinkingMsg);
  scrollMessagesToBottom();

  let answerText = "";

  try {
    const data = await askQuestionToAPI(q);
    answerText = cleanText(data.answer || "");

    // تحديث آخر إجابة للصوت
    lastAssistantText = answerText || "";

    // استبدال رسالة الانتظار بالإجابة
    thinkingMsg.remove();
    addMessage(answerText || "لم أحصل على إجابة واضحة.", "assistant");
  } catch (err) {
    console.error(err);
    thinkingMsg.remove();
    addMessage(
      err.message ||
        "عذرًا، حصل خطأ أثناء محاولة الحصول على الإجابة. حاولي مرة أخرى.",
      "assistant"
    );
  } finally {
    isBusy = false;
    if (elInput) {
      elInput.disabled = false;
      elInput.focus();
    }
  }
}

// =======================
// الصوت: قراءة إجابة دُرّى
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

  // لو هي الآن تقرأ: نخلي الضغطه توقف القراءة
  if (isReading || window.speechSynthesis.speaking) {
    try {
      window.speechSynthesis.cancel();
    } catch (e) {
      console.warn("TTS_CANCEL_ERROR:", e);
    }
    isReading = false;
    if (elReadBtn) {
      elReadBtn.textContent = "قراءة الإجابة 🔊";
    }
    return;
  }

  // هنا نبدأ القراءة من جديد
  try {
    // إلغاء أي قراءة قديمة
    window.speechSynthesis.cancel();

    const u = new SpeechSynthesisUtterance(lastAssistantText);
    u.lang = "ar-SA";
    u.rate = 1;
    u.pitch = 1;

    // عدّل حالة الزر إلى "إيقاف"
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
      console.warn("TTS_ERROR:", e);
      isReading = false;
      if (elReadBtn) {
        elReadBtn.textContent = "قراءة الإجابة 🔊";
      }
    };

    window.speechSynthesis.speak(u);
  } catch (e) {
    console.warn("TTS_ERROR:", e);
    isReading = false;
    if (elReadBtn) {
      elReadBtn.textContent = "قراءة الإجابة 🔊";
    }
    alert("تعذّر تشغيل القراءة الصوتية حاليًا.");
  }
}

// =======================
// ربط الأحداث مع الواجهة
// =======================

function wire() {
  if (elForm) {
    elForm.addEventListener("submit", function (e) {
      e.preventDefault();
      ask();
    });
  }

  if (elMicBtn && window.SpeechRecognition) {
    const SR =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SR();
    rec.lang = "ar-SA";

    elMicBtn.addEventListener("click", function () {
      try {
        rec.start();
      } catch (e) {
        console.warn("SR_START_ERROR", e);
      }
    });

    rec.onresult = function (event) {
      const txt =
        event.results[0] &&
        event.results[0][0] &&
        event.results[0][0].transcript;
      if (txt && elInput) {
        elInput.value = txt;
        elInput.focus();
      }
    };

    rec.onerror = function (e) {
      console.warn("SR_ERROR", e);
    };
  }

  if (elReadBtn) {
    elReadBtn.addEventListener("click", function () {
      speakAnswer();
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

  console.log(
    "[WIRE] form:",
    !!elForm,
    "input:",
    !!elInput,
    "messages:",
    !!elMessages
  );
}

wire();

// Ping بسيط مرة واحدة للتأكد أن السيرفر حيّ
async function pingOnce() {
  try {
    await fetch(API_BASE + "/health", { method: "GET" });
  } catch (e) {
    console.warn("PING_ERROR", e);
  }
}

pingOnce();
