// =======================
// دُرّى — نسخة مبسّطة وآمنة
// تنظف الرموز الرياضية وتعرض إجابة عربية مرتبة في .result
// =======================

const API_BASE = "https://durra-server.onrender.com";

// تشغيل الكود بعد تحميل الصفحة
(function () {
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
    console.error("[Durra init error]", e);
  }
}

function coreInit() {
  // عناصر الصفحة الأصلية
  const elForm =
    document.getElementById("form") ||
    document.querySelector("form");

  const elInput =
    document.getElementById("textInput") ||
    document.querySelector("input[type='text'], textarea");

  const elSendBtn =
    document.querySelector("[data-send]") ||
    document.getElementById("btnSend");

  // مربع الإجابة من الواجهة الأصلية
  let elAnswer =
    document.querySelector(".result") ||
    document.getElementById("answer");

  // لو ما وجدناه، نخلق واحد بسيط تحت الفورم
  if (!elAnswer) {
    const panel = document.createElement("div");
    panel.className = "panel";
    panel.style.cssText =
      "margin-top:16px;padding:16px 18px;border-radius:16px;background:#020617cc;border:1px solid rgba(148,163,184,.5);color:#e5e7eb;direction:rtl;text-align:right;max-height:420px;overflow-y:auto;font-size:17px;line-height:1.8;";
    elAnswer = document.createElement("div");
    elAnswer.className = "result";
    panel.appendChild(elAnswer);
    (elForm?.parentElement || document.body).appendChild(panel);
  }

  // صندوق "جاري التفكير"
  let thinkingEl = null;
  function setThinking(on) {
    if (on) {
      if (!thinkingEl) {
        thinkingEl = document.createElement("div");
        thinkingEl.textContent = "… جاري التفكير";
        thinkingEl.style.cssText =
          "margin-top:8px;opacity:.75;direction:rtl;text-align:right;";
        elAnswer.insertAdjacentElement("beforebegin", thinkingEl);
      }
    } else if (thinkingEl) {
      thinkingEl.remove();
      thinkingEl = null;
    }
  }

  // ===== أدوات مساعدة =====

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  // أرقام عربية
  function toArabicDigits(text) {
    const map = "٠١٢٣٤٥٦٧٨٩";
    return String(text).replace(/[0-9]/g, (d) => map[d]);
  }

  // تعريب الرموز الرياضية + x → س
  function localizeMathSymbols(text) {
    if (!text) return "";
    let t = String(text);

    // استبدال متغير x بس (بحذر)
    t = t.replace(/\bx\b/g, "س");

    // أوامر لاتك إلى رموز
    t = t
      .replace(/\\cdot/g, " × ")
      .replace(/\\times/g, " × ")
      .replace(/\\div/g, " ÷ ")
      .replace(/\bdiv\b/g, " ÷ ")
      .replace(/\\sqrt/g, " √ ")
      .replace(/\\pm/g, " ± ");

    // 15 x 15 → ١٥ × ١٥
    t = t.replace(
      /([0-9٠-٩]+)\s*[x×]\s*([0-9٠-٩]+)/g,
      "$1 × $2"
    );

    // أرقام عربية
    t = toArabicDigits(t);
    return t;
  }

  // تنظيف النص من اللاتك والكود والروابط
  function cleanAnswer(text) {
    if (!text) return "";
    let t = String(text);

    // إزالة كتل الكود ```...```
    t = t.replace(/```[\s\S]*?```/g, " ");

    // إزالة روابط
    t = t.replace(/https?:\/\/\S+/g, " ");

    // رسائل rate limit من OpenAI
    if (/\brate limit\b/i.test(t) || /\bTPM\b/i.test(t)) {
      return "⚠ الخادم مشغول حاليًا، حاولي مرة أخرى بعد قليل.";
    }

    // عناوين Markdown
    t = t.replace(/^[ \t]*#{1,6}[ \t]*/gm, "");

    // أوامر لاتك غير مهمة
    t = t.replace(/\\(left|right|displaystyle)/g, "");
    t = t.replace(/\\[\[\]\(\)]/g, "");
    t = t.replace(/\\\\/g, "\n");

    // نجوم وتنسيقات
    t = t.replace(/\*\*/g, "");
    t = t.replace(/[_`]/g, " ");

    // تصحيح الإشارات
    t = t.replace(/=\s*-/g, "= -");

    // تقليل المسافات والأسطر
    t = t.replace(/[ \t]+/g, " ");
    t = t.replace(/\n{3,}/g, "\n\n");

    t = localizeMathSymbols(t);
    return t.trim();
  }

  // تحويل كسور وأسس إلى HTML مبسّط
  function mathToHtml(txt) {
    if (!txt) return "";
    let t = escapeHtml(txt);

    // \frac{a}{b} → كسر
    t = t.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, (m, a, b) => {
      return `[[FRAC:${a}|${b}]]`;
    });

    // a / b بين أعداد/س → كسر
    t = t.replace(
      /(^|[\s(\[])([0-9٠-٩س]+)[ \t]*\/[ \t]*([0-9٠-٩س]+)(?=([\s)\].,!?؛،]|$))/g,
      (m, lead, A, B, tail) =>
        `${lead}[[FRAC:${A}|${B}]]${tail || ""}`
    );

    // a^2 → أس
    t = t.replace(
      /(\d+|[٠-٩]+|س|\([^()]+\))\^([0-9٠-٩]+)/g,
      (m, base, exp) => `[[POW:${base}|${exp}]]`
    );

    // استبدال العلامات
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

    // فقرات
    return t
      .split(/\n{2,}/)
      .map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`)
      .join("");
  }

  function showAnswer(rawText) {
    if (!elAnswer) return;

    const cleaned = cleanAnswer(rawText);
    let html = mathToHtml(cleaned);

    // لو التنظيف شدّ حيله زيادة وفضّى النص، نرجع للخام
    if (!cleaned && rawText) {
      html = escapeHtml(rawText);
    }

    elAnswer.innerHTML = html || "⚠ لم تصل إجابة من الخادم.";
    elAnswer.dir = "rtl";
  }

  // ===== إرسال السؤال للخادم =====

  async function ask() {
    if (!elInput) {
      showAnswer("⚠ لم أجد خانة السؤال.");
      return;
    }

    const q = (elInput.value || "").trim();
    if (!q) {
      showAnswer("✏️ اكتبي سؤالك أولًا.");
      return;
    }

    setThinking(true);

    try {
      const payload = { message: q, history: [] };

      let resp = await fetch(`${API_BASE}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).catch(() => null);

      if (!resp || resp.status === 404) {
        resp = await fetch(`${API_BASE}/ask`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question: q }),
        }).catch(() => null);
      }

      setThinking(false);

      if (!resp) {
        showAnswer("⚠ تعذّر الاتصال بالخادم، حاولي بعد قليل.");
        return;
      }

      const data = await resp.json().catch(() => ({}));

      const reply =
        data.reply ||
        data.answer ||
        data.text ||
        data.result ||
        "";

      if (reply) {
        showAnswer(reply);
      } else if (data.error) {
        showAnswer("⚠ الخادم قال: " + data.error);
      } else {
        showAnswer("⚠ لم تصل إجابة واضحة من الخادم.");
      }
    } catch (e) {
      console.error("[Durra ask error]", e);
      setThinking(false);
      showAnswer("⚠ صار خطأ بالاتصال، جربي مرة أخرى.");
    }
  }

  // ===== ربط الفورم وزر الإرسال =====

  if (elForm) {
    elForm.addEventListener("submit", (e) => {
      e.preventDefault();
      ask();
    });
  }

  if (elSendBtn) {
    elSendBtn.type = "button";
    elSendBtn.addEventListener("click", ask);
  }

  if (elInput) {
    elInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        ask();
      }
    });
  }

  console.log("[Durra] جاهزة ✅");
}
