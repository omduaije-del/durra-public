// =======================
// دُرّى — واجهة مبسطة للسؤال النصي + صوت اختياري
// (نسخة آمنة لا تغيّر الواجهة، بس تنظّف وتلتقط الردود بشكل أذكى)
// =======================

const API_BASE = "https://durra-server.onrender.com";

(function bootstrap() {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initDurra);
  } else {
    initDurra();
  }
})();

function initDurra() {
  try {
    coreInit();
  } catch (e) {
    console.error("[Durra Init Error]", e);
  }
}

function coreInit() {
  // ---------- العثور على عناصر الصفحة الأصلية ----------
  const elForm =
    document.getElementById("form") ||
    document.querySelector("form");

  const elInput =
    document.getElementById("textInput") ||
    document.querySelector("input[type='text'], textarea");

  // مكان عرض النتيجة (المربع الرمادي اللي عندك)
  let elAnswer =
    document.querySelector(".result") ||
    document.getElementById("answer");

  // لو ما فيه result نخلق واحد بسيط بنفس الفكرة، بدون تغيير الستايل العام
  if (!elAnswer) {
    elAnswer = document.createElement("div");
    elAnswer.className = "result";
    elAnswer.style.cssText = "white-space:pre-wrap;line-height:1.9;direction:rtl;text-align:right;margin-top:10px;";
    (elForm?.parentElement || document.body).appendChild(elAnswer);
  }

  // ---------- صندوق "جاري التفكير" ----------
  let thinking = null;
  function setThinking(on) {
    if (on) {
      if (!thinking) {
        thinking = document.createElement("div");
        thinking.textContent = "… جاري التفكير";
        thinking.style.opacity = ".75";
        thinking.style.marginTop = "6px";
        thinking.style.direction = "rtl";
        thinking.style.textAlign = "right";
        elAnswer.insertAdjacentElement("beforebegin", thinking);
      }
    } else if (thinking) {
      thinking.remove();
      thinking = null;
    }
  }

  // ---------- توابع مساعدة للتنظيف ----------
  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function toArabicDigits(text) {
    const map = "٠١٢٣٤٥٦٧٨٩";
    return String(text).replace(/[0-9]/g, (d) => map[d]);
  }

  function localizeMathSymbols(text) {
    if (!text) return "";
    let t = String(text);

    // x كمتغيّر → س  (بحذر فقط لو مستقلة)
    t = t.replace(/\bx\b/g, "س");

    // أوامر لاTex شائعة
    t = t
      .replace(/\\cdot/g, " × ")
      .replace(/\\times/g, " × ")
      .replace(/\\sqrt/g, " √ ")
      .replace(/\\pm/g, " ± ")
      .replace(/\\div/g, " ÷ ");

    // كلمة div لو ظهرت كنص
    t = t.replace(/\bdiv\b/g, " ÷ ");

    // ضرب بسيط: 15 x 15
    t = t.replace(
      /([0-9٠-٩]+)\s*[x×]\s*([0-9٠-٩]+)/g,
      "$1 × $2"
    );

    // الأرقام إلى عربية
    t = toArabicDigits(t);
    return t;
  }

  function cleanAnswer(text) {
    if (!text) return "";
    let t = String(text);

    // إزالة كتل الكود بين ```
    t = t.replace(/```[\s\S]*?```/g, "");

    // حذف الروابط
    t = t.replace(/https?:\/\/\S+/g, " ");

    // إزالة معرفات org الطويلة
    t = t.replace(/org-[A-Za-z0-9_-]+/g, " ");

    // لو الرد عبارة عن رسالة Rate limit من OpenAI
    if (/\brate limit\b/i.test(t) || /\bTPM\b/i.test(t)) {
      return "⚠ الخادم مشغول حاليًّا. حاولي إعادة المحاولة بعد ثوانٍ.";
    }

    // إزالة عناوين Markdown: ### عنوان
    t = t.replace(/^[ \t]*#{1,6}[ \t]*/gm, "");

    // تلطيف أوامر LaTeX بدون كسر \pi و r وغَيرها
    t = t.replace(/\\(left|right|displaystyle)/g, "");
    t = t.replace(/\\[\[\]\(\)]/g, ""); // بس الأقواس \( \) \[ \]

    // الأسطر المزدوجة
    t = t.replace(/\\\\/g, "\n");

    // مسافات وأسطر زائدة
    t = t.replace(/[ \t]+/g, " ");
    t = t.replace(/\n{3,}/g, "\n\n");

    t = localizeMathSymbols(t);
    return t.trim();
  }

  // تحويل الكسور والأسس إلى HTML منسّق
  function mathToHtml(txt) {
    if (!txt) return "";
    let t = escapeHtml(txt);

    // \frac{a}{b}
    t = t.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, (m, a, b) => {
      return `[[FRAC:${a}|${b}]]`;
    });

    // الكسور البسيطة a/b بين أعداد أو س
    t = t.replace(
      /(^|[\s(\[])([0-9٠-٩س]+)[ \t]*\/[ \t]*([0-9٠-٩س]+)(?=([\s)\].,!?؛،]|$))/g,
      (m, lead, A, B, tail) => `${lead}[[FRAC:${A}|${B}]]${tail || ""}`
    );

    // أسس:  س^2  أو  10^3
    t = t.replace(
      /(\d+|[٠-٩]+|س|\([^()]+\))\^([0-9٠-٩]+)/g,
      (m, base, exp) => `[[POW:${base}|${exp}]]`
    );

    // استبدال العلامات المؤقتة بـ span
    t = t.replace(
      /\[\[FRAC:([^|]+)\|([^\]]+)\]\]/g,
      (m, top, bot) =>
        `<span class="frac"><span class="top">${top}</span><span class="bottom">${bot}</span></span>`
    );
    t = t.replace(
      /\[\[POW:([^|]+)\|([^\]]+)\]\]/g,
      (m, base, exp) =>
        `<span class="pow">${base}<sup>${exp}</sup></span>`
    );

    // تقسيم إلى فقرات
    return t
      .split(/\n{2,}/)
      .map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`)
      .join("");
  }

  function showAnswer(text) {
    const cleaned = cleanAnswer(text);
    elAnswer.innerHTML = mathToHtml(cleaned);
    elAnswer.dir = "rtl";
  }

  // ---------- استدعاء الخادم ----------
  async function ask() {
    if (!elInput) {
      showAnswer("⚠ لم أجد خانة السؤال في الصفحة.");
      return;
    }

    const q = (elInput.value || "").trim();
    if (!q) {
      showAnswer("✏️ اكتبي سؤالك الرياضي أولًا.");
      return;
    }

    setThinking(true);

    try {
      const payload = { message: q, history: [] };

      // نحاول /api/chat أولاً
      let resp = await fetch(`${API_BASE}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).catch(() => null);

      // لو ما اشتغل، نجرب /ask
      if (!resp || resp.status === 404) {
        resp = await fetch(`${API_BASE}/ask`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question: q }),
        }).catch(() => null);
      }

      setThinking(false);

      if (!resp) {
        showAnswer("⚠ تعذّر الاتصال بالخادم. حاولي بعد قليل.");
        return;
      }

      const data = await resp.json().catch(() => ({}));

      // نحاول استخراج الإجابة من أكثر من حقل محتمل
      let reply = null;
      if (data) {
        reply =
          data.reply ||
          data.answer ||
          data.text ||
          data.result ||
          data.output;

        if (!reply && Array.isArray(data.choices)) {
          const c = data.choices[0];
          if (c && c.message && c.message.content) {
            reply = c.message.content;
          }
        }

        if (!reply && typeof data === "string") {
          reply = data;
        }
      }

      if (reply) {
        showAnswer(reply);
      } else if (data && data.error) {
        showAnswer("⚠ الخادم قال: " + (data.error.message || data.error));
      } else {
        showAnswer("⚠ ما وصلت إجابة مفهومة من الخادم، حاولي صياغة السؤال بطريقة أخرى.");
      }
    } catch (e) {
      console.error("ASK_ERROR", e);
      setThinking(false);
      showAnswer("⚠ صار خطأ بالاتصال، جربي مرة ثانية.");
    }
  }

  // ---------- ربط الإرسال ----------
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

  const elSend =
    document.querySelector("[data-send]") ||
    document.getElementById("btnSend");

  if (elSend) {
    elSend.type = "button";
    elSend.addEventListener("click", ask);
  }

  // ====== الصوت (سؤال صوتي + إجابة صوتية) بدون تغيير الواجهة ======

  // زر الميكروفون الأصلي إن وجد
  let elMicBtn =
    document.getElementById("btnMic") ||
    document.querySelector("[data-mic]");

  // زر "الإجابة الصوتية" إن وجد
  let elTTSBtn = document.getElementById("btnTTS");

  // لو مو موجودين، ما نخترع شي جديد عشان ما نغيّر تصميمك
  // فقط نفعّل السلوك لو الأزرار موجودة

  // STT ـــــ
  let recognition = null;
  let listening = false;

  function ensureRecognition() {
    if (recognition) return recognition;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return null;
    const rec = new SR();
    rec.lang = "ar-SA";
    rec.interimResults = false;
    rec.maxAlternatives = 1;

    rec.onstart = () => {
      listening = true;
      if (elMicBtn) elMicBtn.textContent = "⏹ إيقاف الاستماع";
    };
    rec.onend = () => {
      listening = false;
      if (elMicBtn) elMicBtn.textContent = "🎙 سؤال صوتي";
    };
    rec.onresult = (e) => {
      const txt = (e.results?.[0]?.[0]?.transcript || "").trim();
      if (elInput) elInput.value = txt;
      if (txt) ask();
    };

    recognition = rec;
    return rec;
  }

  if (elMicBtn) {
    elMicBtn.addEventListener("click", () => {
      const rec = ensureRecognition();
      if (!rec) {
        showAnswer("ℹ️ جهازك لا يدعم السؤال الصوتي، جرّبي Google Chrome على الكمبيوتر.");
        return;
      }
      try {
        if (!listening) rec.start();
        else rec.stop();
      } catch {}
    });
  }

  // TTS ـــــ
  if ("speechSynthesis" in window && elTTSBtn) {
    let enabled = JSON.parse(
      localStorage.getItem("durra_tts_on") || "false"
    );

    function renderBtn() {
      elTTSBtn.textContent = enabled
        ? "🔊 الإجابة الصوتية"
        : "🔈 الإجابة الصوتية";
    }
    renderBtn();

    elTTSBtn.addEventListener("click", () => {
      enabled = !enabled;
      localStorage.setItem("durra_tts_on", JSON.stringify(enabled));
      renderBtn();
      if (!enabled) {
        try {
          speechSynthesis.cancel();
        } catch {}
      }
    });

    const obs = new MutationObserver(() => {
      if (!enabled) return;
      const raw = elAnswer.textContent || "";
      let t = raw;

      // تبسيط النطق للرموز
      t = t
        .replace(/×/g, " ضرب ")
        .replace(/\//g, " على ")
        .replace(/=/g, " يساوي ")
        .replace(/([0-9٠-٩]+)\s*-\s*([0-9٠-٩]+)/g, "$1 ناقص $2")
        .replace(/-/g, " ");

      // إزالة ضوضاء
      t = t.replace(/[\[\]\{\}\(\)\|\_\^\~]/g, " ");
      t = t.replace(/[A-Za-z]{3,}/g, " ");
      t = t.replace(/\s{2,}/g, " ").trim();

      if (!t || /جاري التفكير|⚠/.test(t)) return;

      try {
        speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(t);
        u.lang = "ar-SA";
        u.rate = 1;
        u.pitch = 1;
        speechSynthesis.speak(u);
      } catch {}
    });

    obs.observe(elAnswer, { childList: true, subtree: true });
  }
}
