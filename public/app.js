// =======================
// دُرّى — واجهة مبسطة (سؤال نصي + زر سؤال صوتي خاص بنا)
// =======================

const API_BASE = "https://durra-server.onrender.com";

// نحاول نلقَى العناصر الرئيسية في الصفحة
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
    "max-height:260px;overflow:auto;margin-top:10px;padding:10px;border-radius:10px;border:1px solid #444;background:#0b0f16;color:#eee;font-size:16px;line-height:1.6;";
  (elForm?.parentElement || document.body).appendChild(elMessages);
}

// نحاول نضيف زر ميكروفون صغير تحت خانة السؤال
let elMicBtn =
  document.getElementById("btnMic") ||
  document.querySelector("[data-mic]");

if (!elMicBtn && elInput) {
  elMicBtn = document.createElement("button");
  elMicBtn.type = "button";
  elMicBtn.id = "btnMicDynamic";
  elMicBtn.textContent = "🎙 سؤال صوتي";
  elMicBtn.style.cssText =
    "margin-top:8px;padding:6px 12px;border-radius:999px;border:none;cursor:pointer;font-size:14px;background:#243b64;color:#fff;";
  // نحاول وضعه قرب خانة السؤال
  const parent = elInput.parentElement || elForm || document.body;
  parent.appendChild(elMicBtn);
}

// دالة لإضافة رسالة في المحادثة
function addMessage(text, who = "assistant") {
  if (!elMessages) return;
  const div = document.createElement("div");
  div.className = "message " + (who === "user" ? "user" : "assistant");
  div.style.margin = "8px 0";
  div.textContent = text;
  elMessages.appendChild(div);
  elMessages.scrollTop = elMessages.scrollHeight;
}

// دالة تعرض نص عادي (مثلاً للأخطاء)
function show(text) {
  addMessage(text, "assistant");
}

// نحاول نفحص اتصال الخادم (اختياري)
async function pingOnce() {
  try {
    const res = await fetch(`${API_BASE}/health`, { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    console.log("[PING]", data);
  } catch (e) {
    console.warn("[PING_ERROR]", e);
  }
}

// الدالة الرئيسية: إرسال السؤال وجلب الجواب
async function ask() {
  if (!elInput) {
    show("⚠ لم أجد خانة السؤال في الصفحة.");
    return;
  }

  const q = (elInput.value || "").trim();
  if (!q) {
    show("✏️ اكتبي سؤالك أولاً.");
    return;
  }

  // أضيف سؤال المستخدم للمحادثة
  addMessage(q, "user");
  elInput.value = "";

  // رسالة "جاري التفكير"
  const thinking = document.createElement("div");
  thinking.className = "message assistant";
  thinking.textContent = "… جاري التفكير";
  elMessages.appendChild(thinking);
  elMessages.scrollTop = elMessages.scrollHeight;

  try {
    const payload = { message: q, history: [] };

    // نجرب /api/chat أولاً
    let resp = await fetch(`${API_BASE}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch(() => null);

    // لو ما اشتغل /api/chat أو رجع 404، نجرب /ask
    if (!resp || resp.status === 404) {
      resp = await fetch(`${API_BASE}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      }).catch(() => null);
    }

    if (!resp) {
      thinking.remove();
      show("⚠ تعذر الاتصال بالخادم. حاولي بعد قليل.");
      return;
    }

    const data = await resp.json().catch(() => ({}));
    thinking.remove();

    const reply =
      (data && (data.reply || data.answer || data.text)) || null;

    if (reply) {
      addMessage(reply, "assistant");
    } else if (data && data.error) {
      show("⚠ الخادم قال: " + data.error);
    } else {
      show("⚠ ما وصلت إجابة مفهومة من الخادم.");
    }
  } catch (e) {
    console.error("ASK_ERROR", e);
    thinking.remove();
    show("⚠ صار خطأ بالاتصال، جربي مرة ثانية.");
  }
}

// —— السؤال الصوتي (Web Speech API) ——

// لو المتصفح لا يدعمه، بنعرض رسالة للمستخدمة
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
    if (elMicBtn) elMicBtn.textContent = "⏹ إيقاف الاستماع";
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
    show("⚠ تعذر الاستماع، حاولي مرة أخرى.");
  };

  rec.onend = () => {
    listening = false;
    if (elMicBtn) elMicBtn.textContent = "🎙 سؤال صوتي";
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

// ربط الأحداث (الفورم + زر الإرسال + إنتر + زر الميكروفون)
function wire() {
  if (elForm) {
    elForm.addEventListener("submit", (e) => {
      e.preventDefault();
      ask();
    });
  }

  // نبحث عن زر "إرسال"
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
  }

  if (elInput) {
    elInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        ask();
      }
    });
  }

  if (elMicBtn) {
    elMicBtn.addEventListener("click", toggleListening);
  }

  console.log(
    "[WIRE] form:", !!elForm,
    "input:", !!elInput,
    "messages:", !!elMessages,
    "micBtn:", !!elMicBtn
  );
}

wire();
pingOnce();
