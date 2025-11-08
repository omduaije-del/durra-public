// =======================
// دُرّى — واجهة مبسطة (سؤال نصي + سؤال صوتي)
// =======================

const API_BASE = "https://durra-server.onrender.com";

// العناصر الرئيسية
const elForm =
  document.getElementById("form") || document.querySelector("form");

const elInput =
  document.getElementById("textInput") ||
  document.querySelector("input[type='text'], textarea");

let elMessages =
  document.getElementById("messages") ||
  document.querySelector(".messages");

// أزرار الصوت (إن وجدت في الصفحة)
const elBtnMic =
  document.getElementById("btnMic") || document.querySelector("[data-mic]");
const elBtnStop =
  document.getElementById("btnStop") || document.querySelector("[data-stop]");
const elVoiceQ =
  document.getElementById("voiceQuestion") ||
  document.querySelector("[data-voice-q]");

// لو ما في صندوق رسائل، ننشئ واحد بسيط
if (!elMessages) {
  elMessages = document.createElement("div");
  elMessages.id = "messages";
  elMessages.style.cssText =
    "max-height:260px;overflow:auto;margin-top:10px;padding:10px;border-radius:10px;border:1px solid #444;background:#0b0f16;color:#eee;font-size:16px;line-height:1.6;";
  (elForm?.parentElement || document.body).appendChild(elMessages);
}

// عرض رسالة في المحادثة
function addMessage(text, who = "assistant") {
  if (!elMessages) return;
  const div = document.createElement("div");
  div.className = "message " + (who === "user" ? "user" : "assistant");
  div.style.margin = "8px 0";
  div.textContent = text;
  elMessages.appendChild(div);
  elMessages.scrollTop = elMessages.scrollHeight;
}

function show(text) {
  addMessage(text, "assistant");
}

// فحص سريع للخادم (اختياري)
async function pingOnce() {
  try {
    const res = await fetch(`${API_BASE}/health`, { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    console.log("[PING]", data);
  } catch (e) {
    console.warn("[PING_ERROR]", e);
  }
}

// إرسال السؤال للنظام
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

  // أضيف سؤال المستخدم
  addMessage(q, "user");
  elInput.value = "";

  // جاري التفكير
  const thinking = document.createElement("div");
  thinking.className = "message assistant";
  thinking.textContent = "… جاري التفكير";
  elMessages.appendChild(thinking);
  elMessages.scrollTop = elMessages.scrollHeight;

  try {
    const payload = { message: q, history: [] };

    // جرب /api/chat أولاً
    let resp = await fetch(`${API_BASE}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch(() => null);

    // لو 404 أو ما رد، جرب /ask
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

    if (reply) addMessage(reply, "assistant");
    else if (data && data.error) show("⚠ الخادم قال: " + data.error);
    else show("⚠ ما وصلت إجابة مفهومة من الخادم.");
  } catch (e) {
    console.error("ASK_ERROR", e);
    thinking.remove();
    show("⚠ صار خطأ بالاتصال، جربي مرة ثانية.");
  }
}

// ——— السؤال الصوتي (Web Speech API) ———
let recognition = null;
let listening = false;

function ensureRecognition() {
  if (recognition) return recognition;
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    alert("العفو، المتصفح لا يدعم السؤال الصوتي.");
    return null;
  }
  const rec = new SR();
  rec.lang = "ar-SA";
  rec.interimResults = false;
  rec.maxAlternatives = 1;

  rec.onstart = () => {
    listening = true;
    if (elBtnMic) elBtnMic.disabled = true;
    if (elBtnStop) elBtnStop.disabled = false;
    if (elVoiceQ) elVoiceQ.textContent = "… أستمع إليك";
  };

  rec.onresult = (e) => {
    const txt = (e.results?.[0]?.[0]?.transcript || "").trim();
    if (elVoiceQ) elVoiceQ.textContent = txt || "—";
    if (elInput) elInput.value = txt;
    // نرسل تلقائيًا
    if (txt) ask();
  };

  rec.onerror = (e) => {
    console.warn("STT_ERROR:", e.error);
    if (elVoiceQ) elVoiceQ.textContent = "⚠ تعذر الاستماع";
  };

  rec.onend = () => {
    listening = false;
    if (elBtnMic) elBtnMic.disabled = false;
    if (elBtnStop) elBtnStop.disabled = true;
  };

  recognition = rec;
  return rec;
}

function startListening() {
  const rec = ensureRecognition();
  if (!rec) return;
  if (!listening) rec.start();
}

function stopListening() {
  try {
    if (recognition && listening) recognition.stop();
  } catch (_) {}
}

// ربط الأحداث (فورم + زر إرسال + إنتر + صوت)
function wire() {
  if (elForm) {
    elForm.addEventListener("submit", (e) => {
      e.preventDefault();
      ask();
    });
  }

  // زر "إرسال"
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

  // أزرار الصوت
  if (elBtnMic) elBtnMic.addEventListener("click", startListening);
  if (elBtnStop) elBtnStop.addEventListener("click", stopListening);

  console.log(
    "[WIRE] form:", !!elForm,
    "input:", !!elInput,
    "messages:", !!elMessages,
    "mic:", !!elBtnMic,
    "stop:", !!elBtnStop
  );
}

wire();
pingOnce();
