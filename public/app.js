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

// تحويل المتغيرات والرموز إلى أسلوب عربي أقرب للمناهج
function localizeMathSymbols(text) {
  if (!text) return "";

  let t = text;

  // x كس متغير → س (مع محاولة تجنّب الكلمات)
  t = t.replace(/\bx\b/g, "س");
  t = t.replace(/(\d)\s*x\b/g, "$1س");
  t = t.replace(/x(?=\s*[\+\-\*\/=)\]])/g, "س");

  // أوامر لاتِك شائعة
  t = t.replace(/\\cdot/g, " × ");
  t = t.replace(/\\sqrt/g, " √ ");
  t = t.replace(/\\pm/g, " ± ");

  // الأرقام إلى عربية
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

  // 2) \frac{a}{b} → placeholder
  t = t.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, (_, a, b) => {
    return `[[FRAC:${escapeHtml(a)}|${escapeHtml(b)}]]`;
  });

  // 3) a / b القصيرة → كسر
  t = t.replace(
    /(^|[\s(\[])([^()\s]{1,12})[ \t]*\/[ \t]*([^()\s]{1,12})(?=([\s)\].,!?؛،]|$))/g,
    (m, lead, A, B, tail) => {
      return `${lead}[[FRAC:${escapeHtml(A)}|${escapeHtml(B)}]]${tail || ""}`;
    }
  );

  // 4) base^exp → placeholder للأسس
  t = t.replace(
    /(\d+|[٠-٩]+|س|\([^()]+\))\^([0-9٠-٩]+)/g,
    (m, base, exp) => {
      return `[[POW:${base}|${exp}]]`;
    }
  );

  // 5) نحول الكسور إلى HTML
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

// نضمن إدراج ستايل الكسور مرة واحدة (لو نسيتِ تضيفينه في CSS)
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

// نحاول نضيف زر ميكروفون صغير تحت خانة السؤال (لو مو موجود)
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

// ============== دوال مساعدة قديمة (احتياط) ==============
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

// ==== ملحق: "الإجابة الصوتية" مع تنظيف بسيط للنطق ====
(function () {
  if (!("speechSynthesis" in window)) return;

  let enabled = JSON.parse(localStorage.getItem("durra_tts_on") || "false");
  let voices = [];
  let currentVoice = null;

  function chooseVoice() {
    voices = speechSynthesis.getVoices();
    const ar = voices.filter((v) =>
      (v.lang || "").toLowerCase().startsWith("ar")
    );
    currentVoice =
      ar[0] || voices.find((v) => /arabic/i.test(v.name)) || null;
  }
  chooseVoice();
  window.speechSynthesis.onvoiceschanged = chooseVoice;

  // زر صغير تحت في الزاوية (تبديل تشغيل/إيقاف)
  const box = document.createElement("div");
  box.style.cssText =
    "position:fixed;bottom:16px;left:16px;display:flex;gap:8px;z-index:99999";
  const btnToggle = document.createElement("button");
  btnToggle.textContent = enabled ? "🔊 صوت الإجابة: شغّال" : "🔈 صوت الإجابة: مطفي";
  btnToggle.style.cssText =
    "padding:8px 12px;border-radius:999px;border:none;background:#1f3b70;color:#fff;cursor:pointer;font-size:14px";
  box.append(btnToggle);
  document.body.appendChild(box);

  btnToggle.addEventListener("click", () => {
    enabled = !enabled;
    localStorage.setItem("durra_tts_on", JSON.stringify(enabled));
    btnToggle.textContent = enabled
      ? "🔊 صوت الإجابة: شغّال"
      : "🔈 صوت الإجابة: مطفي";
    if (!enabled) {
      try {
        speechSynthesis.cancel();
      } catch (e) {}
    }
  });

  function prepareForSpeech(text) {
    return text
      .replace(/\\frac/g, " كسر ")
      .replace(/\//g, " على ")
      .replace(/=/g, " يساوي ")
      .replace(/\*/g, " ضرب ")
      .replace(/[\[\]\{\}\(\)]/g, " ")
      .replace(/[|]/g, " ");
  }

  function speak(text) {
    if (!enabled) return;
    try {
      speechSynthesis.cancel();
      const t = prepareForSpeech(text.trim());
      const u = new SpeechSynthesisUtterance(t);
      u.lang = (currentVoice && currentVoice.lang) || "ar-SA";
      if (currentVoice) u.voice = currentVoice;
      u.rate = 1;
      u.pitch = 1;
      speechSynthesis.speak(u);
    } catch (e) {
      console.warn("TTS error", e);
    }
  }

  // مراقبة أي رسالة "assistant" جديدة والنطق تلقائيًا
  const target =
    typeof elMessages !== "undefined" && elMessages ? elMessages : document.body;
  const observer = new MutationObserver((mut) => {
    for (const m of mut) {
      m.addedNodes &&
        m.addedNodes.forEach((node) => {
          if (!(node instanceof HTMLElement)) return;
          if (
            node.classList &&
            node.classList.contains("message") &&
            node.classList.contains("assistant")
          ) {
            const text = node.textContent || "";
            if (text.trim()) speak(text.trim());
          }
        });
    }
  });
  observer.observe(target, { childList: true, subtree: true });
})();
