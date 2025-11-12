// =======================
// دُرّى — واجهة معلّمة الرياضيات الذكية
// =======================

const API_BASE = "https://durra-server.onrender.com";
const elForm = document.getElementById("form") || document.querySelector("form");
const elInput = document.getElementById("textInput") || document.querySelector("input[type='text'], textarea");
let elMessages = document.getElementById("messages") || document.querySelector(".messages");

if (!elMessages) {
  elMessages = document.createElement("div");
  elMessages.id = "messages";
  elMessages.style.cssText =
    "max-height:420px;overflow:auto;margin-top:24px;padding:18px;border-radius:18px;border:1px solid #1e293b;background:#020617cc;color:#e5e7eb;font-size:18px;line-height:1.9;";
  (elForm?.parentElement || document.body).appendChild(elMessages);
}

let elMicBtn, elReadBtn, elStopReadBtn;
let lastAssistantText = "";

// -------- النصوص والكسور --------
function cleanText(text) {
  if (!text) return "";
  return String(text)
    .replace(/```[\s\S]*?```/g, "")
    .replace(/#+\s*/g, "\n")
    .replace(/\*\*/g, "")
    .replace(/\\left|\\right/g, "")
    .replace(/\\cdot/g, " × ")
    .replace(/\\times/g, " × ")
    .replace(/\\div/g, " ÷ ")
    .replace(/([\d\u0660-\u0669]+)\s*على\s*([\d\u0660-\u0669]+)/g, "$1/$2")
    .replace(/\\sqrt/g, " جذر ")
    .replace(/\\pm/g, " ± ")
    .replace(/\\[\[\]\(\)]/g, "")
    .replace(/`/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function renderFractions(text) {
  const re = /([\d\u0660-\u0669]+)\s*\/\s*([\d\u0660-\u0669]+)/g;
  return text.replace(re, (_, a, b) =>
    `<span class='frac'><span class='top'>${a}</span><span class='bar'></span><span class='bottom'>${b}</span></span>`
  );
}

function addMessage(text, who = "assistant") {
  const div = document.createElement("div");
  div.className = "message " + (who === "user" ? "user" : "assistant");
  div.style.margin = "10px 0";
  if (who === "assistant") {
    const cleaned = cleanText(text || "");
    const withFracs = renderFractions(cleaned);
    div.innerHTML = withFracs || "…";
    lastAssistantText = cleaned;
  } else div.textContent = text || "";
  elMessages.appendChild(div);
  elMessages.scrollTop = elMessages.scrollHeight;
}

// -------- التواصل مع السيرفر --------
async function pingOnce() {
  try {
    const res = await fetch(`${API_BASE}/health`, { cache: "no-store" });
    console.log("[PING]", await res.json().catch(() => ({})));
  } catch {}
}

async function ask() {
  const q = (elInput?.value || "").trim();
  if (!q) return addMessage("✏️ اكتب سؤالك أولًا.", "assistant");

  elMessages.innerHTML = "";
  addMessage(q, "user");
  elInput.value = "";

  const thinking = document.createElement("div");
  thinking.textContent = "… جاري التفكير";
  thinking.style.margin = "10px 0";
  elMessages.appendChild(thinking);

  try {
    let resp = await fetch(`${API_BASE}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: q }),
    }).catch(() => null);
    if (!resp || !resp.ok)
      resp = await fetch(`${API_BASE}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      }).catch(() => null);

    thinking.remove();
    if (!resp) return addMessage("حدث خطأ، حاولي مجددًا.", "assistant");
    const data = await resp.json().catch(() => ({}));
    addMessage(data.reply || data.answer || data.text || "لم أفهم السؤال.", "assistant");
  } catch {
    thinking.remove();
    addMessage("تعذر الاتصال، تأكدي من الإنترنت.", "assistant");
  }
}

// -------- الصوت: إدخال --------
let recognition = null,
  listening = false;

function ensureRecognition() {
  if (recognition) return recognition;
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    alert("المتصفح لا يدعم التسجيل الصوتي.");
    return null;
  }
  const rec = new SR();
  rec.lang = "ar-SA";
  rec.interimResults = false;
  rec.onstart = () => {
    listening = true;
    if (elMicBtn) elMicBtn.textContent = "🎙";
  };
  rec.onresult = (e) => {
    const txt = e.results?.[0]?.[0]?.transcript?.trim();
    if (txt) {
      elInput.value = txt;
      ask();
    }
  };
  rec.onend = () => {
    listening = false;
    if (elMicBtn) elMicBtn.textContent = "🎤";
  };
  recognition = rec;
  return rec;
}

function toggleListening() {
  const rec = ensureRecognition();
  if (!rec) return;
  if (!listening) rec.start();
  else rec.stop();
}

// -------- الصوت: إخراج --------
function speakAnswer() {
  if (!lastAssistantText) return addMessage("ما عندي إجابة أقرأها الآن.", "assistant");
  if (!("speechSynthesis" in window)) return alert("متصفحك لا يدعم القراءة الصوتية.");
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(lastAssistantText);
  u.lang = "ar-SA";
  window.speechSynthesis.speak(u);
}
function stopSpeaking() {
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
}

// -------- الأزرار تحت زر الإرسال --------
function ensureVoiceButtons() {
  const submitBtn =
    elForm?.querySelector("button[type='submit']") ||
    elForm?.querySelector("input[type='submit']") ||
    elForm?.querySelector("button");

  if (!submitBtn) return;

  // شريط جديد أسفل زر الإرسال
  let bar = document.getElementById("voiceBar");
  if (!bar) {
    bar = document.createElement("div");
    bar.id = "voiceBar";
    bar.style.cssText =
      "margin-top:8px;display:flex;gap:10px;justify-content:center;align-items:center;";
    submitBtn.insertAdjacentElement("afterend", bar);
  }

  // زر المايك 🎤
  if (!document.getElementById("btnMic")) {
    elMicBtn = document.createElement("button");
    elMicBtn.id = "btnMic";
    elMicBtn.type = "button";
    elMicBtn.textContent = "🎤";
    elMicBtn.title = "سؤال صوتي";
    elMicBtn.style.cssText =
      "padding:8px;border-radius:50%;border:1px solid #1d4ed8;background:#0f172a;color:#e5e7eb;cursor:pointer;font-size:18px;";
    bar.appendChild(elMicBtn);
  }

  // زر قراءة الإجابة 🔊
  if (!document.getElementById("btnRead")) {
    elReadBtn = document.createElement("button");
    elReadBtn.id = "btnRead";
    elReadBtn.type = "button";
    elReadBtn.textContent = "🔊";
    elReadBtn.title = "قراءة الإجابة";
    elReadBtn.style.cssText =
      "padding:8px;border-radius:50%;border:1px solid #16a34a;background:#052e16;color:#bbf7d0;cursor:pointer;font-size:18px;";
    bar.appendChild(elReadBtn);
  }

  // زر الإيقاف ⏹
  if (!document.getElementById("btnStopRead")) {
    elStopReadBtn = document.createElement("button");
    elStopReadBtn.id = "btnStopRead";
    elStopReadBtn.type = "button";
    elStopReadBtn.textContent = "⏹";
    elStopReadBtn.title = "إيقاف الصوت";
    elStopReadBtn.style.cssText =
      "padding:8px;border-radius:50%;border:1px solid #4b5563;background:#020617;color:#e5e7eb;cursor:pointer;font-size:18px;";
    bar.appendChild(elStopReadBtn);
  }

  // الأحداث
  elMicBtn.onclick = toggleListening;
  elReadBtn.onclick = speakAnswer;
  elStopReadBtn.onclick = stopSpeaking;
}

// -------- التشغيل --------
function wire() {
  if (elForm) {
    elForm.addEventListener("submit", (e) => {
      e.preventDefault();
      ask();
    });
    ensureVoiceButtons();
  }
  elInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      ask();
    }
  });
  console.log("[WIRE] جاهزة درّة 🪄");
}

wire();
pingOnce();
