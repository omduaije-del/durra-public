// Robust front-end wiring for Durra

const API_BASE = "https://durra-server.onrender.com";

// ---------- helpers ----------
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function pickOne(selectors) {
  for (const s of selectors) {
    const el = $(s);
    if (el) return el;
  }
  return null;
}

// Try to find elements even if IDs/classnames differ
const elForm = pickOne(["#form", "form"]);
const elInput = pickOne([
  "#textInput",
  "textarea#textInput",
  "textarea[name='question']",
  "textarea[name='q']",
  "textarea",
  "input#textInput",
  "input[name='question']",
  "input[type='text']",
  "input"
]);

let elSend = pickOne([
  "#btnSend",
  "[data-send]",
  "button[type='submit']",
  "button.send",
  "button#send",
  "button"
]);

let elMessages = pickOne(["#messages", ".messages", "#answer", ".answer"]);
if (!elMessages) {
  // Create a simple messages panel if page doesn't have one
  const holder = document.createElement("div");
  holder.id = "messages";
  holder.style.cssText =
    "max-height:280px; overflow:auto; padding:10px; border:1px solid #444; border-radius:10px; background:#0c0f14; color:#eee; margin-top:10px; font-size:16px; line-height:1.6;";
  (elForm || document.body).appendChild(holder);
  elMessages = holder;
}

function addMessage(text, who = "assistant") {
  if (!elMessages) return;
  const div = document.createElement("div");
  div.className = "message " + (who === "user" ? "user" : "assistant");
  div.style.margin = "8px 0";
  div.textContent = text;
  elMessages.appendChild(div);
  elMessages.scrollTop = elMessages.scrollHeight;
}

function getQuestion() {
  const v = (elInput && elInput.value) || "";
  return (v || "").trim();
}

// ---------- core ----------
async function askRaw(message) {
  const q = (message || getQuestion()).trim();
  if (!q) return;

  // show user message
  addMessage(q, "user");
  if (elInput) elInput.value = "";

  // thinking
  const thinking = document.createElement("div");
  thinking.textContent = "… جاري التفكير";
  thinking.style.opacity = "0.8";
  elMessages.appendChild(thinking);
  elMessages.scrollTop = elMessages.scrollHeight;

  try {
    console.log("[ASK] POST", `${API_BASE}/api/chat`, q);
    const res = await fetch(`${API_BASE}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: q })
    });

    const data = await res.json().catch(() => ({}));
    thinking.remove();

    if (!res.ok) {
      console.error("HTTP_ERROR", res.status, data);
      addMessage(`⚠ خطأ من الخادم (${res.status}).`, "assistant");
      return;
    }

    const reply = (data && (data.reply || data.answer || data.text)) || "";
    if (reply) {
      addMessage(reply, "assistant");
    } else {
      addMessage("عذرًا، لم أتلقَّ إجابة.", "assistant");
    }
  } catch (err) {
    thinking.remove();
    console.error("ASK_EXCEPTION", err);
    addMessage("حدث خطأ في الاتصال بالخادم.", "assistant");
  }
}

// ---------- wiring (button / form / Enter) ----------
function wire() {
  // If we have a form, intercept submit
  if (elForm) {
    elForm.addEventListener("submit", (e) => {
      e.preventDefault();
      askRaw();
    });
  }

  // If we have a dedicated send button, ensure it's type=button to stop page reloads
  if (elSend) {
    try { if (elSend.getAttribute("type") !== "button") elSend.setAttribute("type", "button"); } catch (_) {}
    elSend.addEventListener("click", () => askRaw());
  }

  // Hitting Enter in input sends too
  if (elInput) {
    elInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        askRaw();
      }
    });
  }

  console.log("[WIRE] form:", !!elForm, "input:", !!elInput, "send:", !!elSend, "messages:", !!elMessages);
}

async function ping() {
  try {
    const r = await fetch(`${API_BASE}/health`, { cache: "no-store" });
    const j = await r.json();
    console.log("[PING]", j);
  } catch (e) {
    console.warn("[PING_ERROR]", e);
  }
}

wire();
ping();
