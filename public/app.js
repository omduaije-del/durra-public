// =======================
// دُرّى — واجهة مبسّطة لمعلّمة الرياضيات الذكيّة
// =======================

// عنوان السيرفر على Render
const API_BASE = "https://durra-server.onrender.com";

// -----------------------
// عناصر الصفحة الأساسية
// -----------------------

const elForm =
  document.getElementById("form") ||
  document.querySelector("form");

const elInput =
  document.getElementById("textInput") ||
  document.querySelector("input[type='text'], textarea");

let elMessages =
  document.getElementById("messages") ||
  document.querySelector(".messages");

// لو ما فيه صندوق رسائل، ننشئ واحد بسيط تحت الفورم
if (!elMessages) {
  const box = document.createElement("div");
  box.id = "messages";
  box.className = "messages";
  box.style.cssText =
    "max-height:420px;overflow:auto;margin-top:24px;padding:18px;border-radius:18px;border:1px solid #1e293b;background:#020617cc;color:#e2e8f0;font-size:15px;line-height:1.8;";
  if (elForm) {
    elForm.insertAdjacentElement("afterend", box);
  } else {
    document.body.appendChild(box);
  }
  elMessages = box;
}

// أزرار الصوت (سننشئها لاحقًا إذا كانت مفقودة)
let elMicBtn =
  document.getElementById("btnMic") ||
  document.querySelector("[data-role='mic']");

let elReadBtn =
  document.getElementById("btnRead") ||
  document.querySelector("[data-role='tts']");

// حالة قراءة الإجابة صوتيًا (تشغيل / إيقاف)
let isReading = false;

// نخزن آخر إجابة من دُرّة لقراءتها صوتيًا
let lastAssistantText = "";

// -----------------------
// دوال عرض الرسائل
// -----------------------

function scrollMessagesToBottom() {
  try {
    elMessages.scrollTop = elMessages.scrollHeight;
  } catch (e) {
    // لا شيء
  }
}

function createMessageBubble(text, sender = "assistant") {
  const wrapper = document.createElement("div");
  wrapper.className = "msg-row " + sender;

  const bubble = document.createElement("div");
  bubble.className =
    sender === "user" ? "msg msg-user" : "msg msg-assistant";

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

// -----------------------
// تنظيف نص الإجابة
// -----------------------

function cleanText(raw) {
  if (!raw) return "";
  let text = String(raw);

  // إزالة مسافات أول وآخر السطر
  text = text.trim();

  // إزالة كتل الكود ```...```
  text = text.replace(/```[\s\S]*?```/g, "");

  // إزالة عناوين ماركداون (#, ##, ###)
  text = text.replace(/^#{1,6}\s*/gm, "");

  // إزالة النجوم ** **
  text = text.replace(/\*\*/g, "");

  // إزالة الروابط [نص](رابط)
  text = text.replace(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g, "$1");

  // استبدال بعض أوامر LaTeX برموز بسيطة
  text = text
    .replace(/\\times|\\cdot/g, "×")
    .replace(/\\div/g, "÷")
    .replace(/\\leq/g, "≤")
    .replace(/\\geq/g, "≥")
    .replace(/\\neq/g, "≠")
    .replace(/\\approx/g, "≈")
    .replace(/\\sqrt\{([^}]+)\}/g, "√($1)")
    .replace(/\\pi\b/g, "π");

  // تحويل كسور على شكل a/b إلى a⁄b (شكل لطيف)
  text = text.replace(/(\d+)\s*\/\s*(\d+)/g, "$1⁄$2");

  // أسطر فارغة كثيرة → سطرين فقط
  text = text.replace(/\n{3,}/g, "\n\n");

  // إزالة رموز غريبة متكررة
  text = text
    .replace(/[■◆◇◆]+/g, "")
    .replace(/[·•]+/g, "•");

  // مسافات غير قابلة للكسر
  text = text.replace(/\u00A0/g, " ");

  // إزالة backticks مفردة
  text = text.replace(/`/g, "");

  // تقليل المسافات المتكررة
  text = text.replace(/ {2,}/g, " ");

  return text.trim();
}

// -----------------------
// الاتصال بسيرفر دُرّة
// -----------------------

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

// -----------------------
// الدالة الأساسية للسؤال
// -----------------------

let isBusy = false;

async function ask() {
  if (isBusy) return;

  const q = (elInput && elInput.value ? elInput.value : "").trim();
  if (!q) {
    if (elInput) elInput.focus();
    return;
  }

  isBusy = true;

  // نضيف رسالة المستخدم
  addMessage(q, "user");

  // نفرّغ حقل الإدخال ونقفله مؤقتًا
  if (elInput) {
    elInput.value = "";
    elInput.disabled = true;
  }

  // رسالة "أفكّر"
  const thinkingMsg = createMessageBubble(
    "ثواني… دعيني أفكّر في الحل خطوة خطوة 🤍",
    "assistant"
  );
  elMessages.appendChild(thinkingMsg);
  scrollMessagesToBottom();

  try {
    const data = await askQuestionToAPI(q);
    const clean = cleanText(data.answer || "");
    lastAssistantText = clean;

    thinkingMsg.remove();
    addMessage(clean || "لم أحصل على إجابة واضحة.", "assistant");
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

// -----------------------
// قراءة الإجابة صوتيًا (زر واحد تشغيل/إيقاف)
// -----------------------

function speakAnswer() {
  if (!lastAssistantText) {
    addMessage("ما عندي إجابة أقرأها الآن.", "assistant");
    return;
  }

  if (!("speechSynthesis" in window)) {
    alert("العفو، المتصفح لا يدعم قراءة الإجابات صوتيًا.");
    return;
  }

  // لو فيه قراءة شغّالة الآن → نوقفها
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

// -----------------------
// إنشاء الأزرار إن لم تكن موجودة
// -----------------------

function ensureButtons() {
  // نحاول نقرأهم من الـ DOM أولاً
  elMicBtn =
    document.getElementById("btnMic") ||
    document.querySelector("[data-role='mic']") ||
    elMicBtn;

  elReadBtn =
    document.getElementById("btnRead") ||
    document.querySelector("[data-role='tts']") ||
    elReadBtn;

  // نحتاج حاوية نضع فيها الأزرار
  let controlsContainer = null;
  if (elForm) {
    controlsContainer = elForm.querySelector(".controls");
    if (!controlsContainer) {
      controlsContainer = document.createElement("div");
      controlsContainer.className = "controls";
      controlsContainer.style.marginTop = "12px";
      elForm.appendChild(controlsContainer);
    }
  } else if (elInput && elInput.parentElement) {
    controlsContainer = elInput.parentElement;
  } else {
    controlsContainer = document.body;
  }

  // زر الميكروفون (السؤال الصوتي)
  if (!elMicBtn) {
    elMicBtn = document.createElement("button");
    elMicBtn.id = "btnMic";
    elMicBtn.type = "button";
    elMicBtn.textContent = "🎙️ سؤال صوتي";
    elMicBtn.style.marginInlineStart = "8px";
    controlsContainer.appendChild(elMicBtn);
  }

  // زر قراءة الإجابة
  if (!elReadBtn) {
    elReadBtn = document.createElement("button");
    elReadBtn.id = "btnRead";
    elReadBtn.type = "button";
    elReadBtn.textContent = "قراءة الإجابة 🔊";
    elReadBtn.style.marginInlineStart = "8px";
    controlsContainer.appendChild(elReadBtn);
  }
}

// -----------------------
// ربط الأحداث مع الواجهة
// -----------------------

function wire() {
  // نتأكد أن الأزرار موجودة
  ensureButtons();

  if (elForm) {
    elForm.addEventListener("submit", function (e) {
      e.preventDefault();
      ask();
    });
  }

  // إرسال بالسطر (Enter)
  if (elInput) {
    elInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        ask();
      }
    });
  }

  // زر قراءة الإجابة
  if (elReadBtn) {
    elReadBtn.addEventListener("click", function () {
      speakAnswer();
    });
  }

  // زر الميكروفون (SpeechRecognition) إن كان مدعومًا
  if (elMicBtn) {
    const SR =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      // لو المتصفح ما يدعم، نخلي الزر يعطي تنبيه لطيف
      elMicBtn.addEventListener("click", function () {
        alert("العفو، المتصفح لا يدعم إدخال الصوت حاليًا.");
      });
    } else {
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
  }

  console.log(
    "[WIRE] form:", !!elForm,
    "input:", !!elInput,
    "messages:", !!elMessages,
    "micBtn:", !!elMicBtn,
    "readBtn:", !!elReadBtn
  );
}

// -----------------------
// Ping بسيط للتأكد من صحة السيرفر
// -----------------------

async function pingOnce() {
  try {
    await fetch(API_BASE + "/health", { method: "GET" });
  } catch (e) {
    console.warn("PING_ERROR", e);
  }
}

// تشغيل
wire();
pingOnce();
