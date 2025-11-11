// =======================
// دُرّى — واجهة مبسطة (سؤال نصي + زر سؤال صوتي خاص بنا)
// =======================

const API_BASE = "https://durra-server.onrender.com";

// ========= أدوات تنسيق الإجابة =========

// نهرب HTML عشان ما يصير أي إدخال خطير
function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// تحويل الأرقام 0-9 إلى أرقام عربية ٠١٢٣٤٥٦٧٨٩
function toArabicDigits(text) {
  const map = "٠١٢٣٤٥٦٧٨٩";
  return text.replace(/[0-9]/g, (d) => map[d]);
}

// تحويل المتغيرات والرموز إلى أسلوب عربي أقرب لمناهج الخليج
function localizeMathSymbols(text) {
  if (!text) return "";

  let t = text;

  // x كس متغير → س (مع محاولة تجنّب الكلمات الإنجليزية)
  // x مفردة لوحدها
  t = t.replace(/\bx\b/g, "س");
  // رقم متبوع بـ x مثل 2x
  t = t.replace(/(\d)\s*x\b/g, "$1س");
  // x قبل علامة تشغيل أو مساواة
  t = t.replace(/x(?=\s*[\+\-\*\/=)\]])/g, "س");

  // أوامر لاتِك شائعة
  t = t.replace(/\\cdot/g, " × ");
  t = t.replace(/\\sqrt/g, " √ ");

  // في النهاية نحول الأرقام إلى أرقام عربية
  t = toArabicDigits(t);

  return t;
}

// دالة تنظيف نص الإجابة من الرموز الزائدة (Markdown + LaTeX ثقيل)
function cleanAnswer(text) {
  if (!text) return "";
  let cleaned = text;

  // إزالة أي كود محصور بين ```
  cleaned = cleaned.replace(/```[\s\S]*?```/g, "");

  // إزالة عناوين Markdown (#, ##, ###) في بداية السطر
  cleaned = cleaned.replace(/^[ \t]*#{1,6}[ \t]*/gm, "");

  // إزالة النجوم ** من التنسيق
  cleaned = cleaned.replace(/\*\*/g, "");

  // إزالة الرموز \[ \] \( \)
  cleaned = cleaned.replace(/\\[\[\]\(\)]/g, "");

  // استبدال \\ بسطر جديد
  cleaned = cleaned.replace(/\\\\/g, "\n");

  // تبسيط مسافات متكررة
  cleaned = cleaned.replace(/[ \t]+/g, " ");

  // أسطر فارغة متكررة → سطرين فقط
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n");

  // في النهاية نطبّق التعريب الرياضي (س، أرقام عربية، × …)
  cleaned = localizeMathSymbols(cleaned);

  return cleaned.trim();
}

// تحويل الكسور والأسس إلى HTML بشكل مرتب
function fractionsAndPowersToHtml(txt) {
  // 1) نهرب النص كله أولًا
  let t = escapeHtml(txt);

  // 2) نحول \frac{a}{b} إلى وسم جزء كسري مؤقت
  t = t.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, (_, a, b) => {
    return `[[FRAC:${escapeHtml(a)}|${escapeHtml(b)}]]`;
  });

  // 3) نحاول أيضًا تحويل صيغ a / b القصيرة إلى كسر
  t = t.replace(
    /(^|[\s(\[])([^()\s]{1,12})[ \t]*\/[ \t]*([^()\s]{1,12})(?=([\s)\].,!?؛،]|$))/g,
    (m, lead, A, B, tail) => {
      return `${lead}[[FRAC:${escapeHtml(A)}|${escapeHtml(B)}]]${tail || ""}`;
    }
  );

  // 4) نضيف placeholder للأسس: base^exp → [[POW:base|exp]]
  // نسمح بقاعدة قصيرة (رقم/س/قوس) وأس أس قصير
  t = t.replace(
    /(\d+|[٠١٢٣٤٥٦٧٨٩]+|س|\([^()]+\))\^([0-9٠١٢٣٤٥٦٧٨٩]+)/g,
    (m, base, exp) => {
      return `[[POW:${base}|${exp}]]`;
    }
  );

  // 5) نحول العلامة المؤقتة للكسور إلى HTML للكسر
  t = t.replace(/\[\[FRAC:([^|]+)\|([^\]]+)\]\]/g, (_, top, bot) => {
    return `<span class="frac"><span class="top">${top}</span><span class="bar"></span><span class="bot">${bot}</span></span>`;
  });

  // 6) نحول الأسس إلى HTML
  t = t.replace(/\[\[POW:([^|]+)\|([^\]]+)\]\]/g, (_, base, exp) => {
    return `<span class="pow">${base}<sup>${exp}</sup></span>`;
  });

  // 7) نحافظ على الأسطر
  const parts = t.split(/\n{2,}/).map((p) => p.replace(/\n/g, "<br>"));
  return parts.map((p) => `<p>${p}</p>`).join("");
}

// نضمن إدراج ستايل الكسور مرة واحدة
let _fractionsStyleInjected = false;
function ensureAnswerStyles() {
  if (_fractionsStyleInjected) return;
  const css = `
  .message.assistant p{margin:6px 0; line-height:1.9;}
  .frac{display:inline-flex;flex-direction:column;align-items:center;vertical-align:middle;margin:0 .2em;font-size:0.95em;}
  .frac .top,.frac .bot{line-height:1.2;padding:0 2px;white-space:nowrap;}
  .frac .bar{width:100%;border-top:1px solid currentColor;margin:1px 0;}
  .pow sup{font-size:0.75em;vertical-align:super;}
  `;
  const style = document.createElement("style");
  style.setAttribute("data-durra-fractions", "1");
  style.textContent = css;
  document.head.appendChild(style);
  _fractionsStyleInjected = true;
}

// ========= عناصر الصفحة =========
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
  const parent = elInput.parentElement || elForm || document.body;
  parent.appendChild(elMicBtn);
}

// ========= عرض الرسائل =========
function addMessage(text, who = "assistant") {
  if (!elMessages) return;

  const div = document.createElement("div");
  div.className = "message " + (who === "user" ? "user" : "assistant");
  div.style.margin = "8px 0";

  if (who === "assistant") {
    ensureAnswerStyles();
    const cleaned = cleanAnswer(text);
    div.innerHTML = fractionsAndPowersToHtml(cleaned);
  } else {
    div.textContent = text;
  }

  elMessages.appendChild(div);
  elMessages.scrollTop = elMessages.scrollHeight;
}

// ============== دوال قديمة مساعدة لعرض نص ثابت (احتياط) ==============
function cleanText(text) {
  if (!text) return "";
  return text
    .replace(/\$\$/g, "")
    .replace(/\$/g, "")
    .replace(/\*\*/g, "")
    .replace(/`/g, "")
    .replace(/_/g, " ")
    .replace(/\\frac/g, " كسر ")
    .replace(/\\sqrt/g, " جذر ")
    .replace(/\\cdot/g, " × ")
    .replace(/\\pm/g, " ± ")
    .replace(/\\left/g, "")
    .replace(/\\right/g, "")
    .replace(/\\\(/g, "")
    .replace(/\\\)/g, "");
}

function show(text) {
  const clean = cleanText(text);
  if (typeof elAnswer !== "undefined" && elAnswer) {
    elAnswer.textContent = clean;
  } else {
    addMessage(clean, "assistant");
  }
}

// ========= اتصال الخادم =========
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
