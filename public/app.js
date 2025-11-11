// =======================
// دُرّى — نسخة آمنة لا تكسر الصفحة
// تنظّف النص + تدعم الكسور والأسس + سؤال/إجابة صوتية اختيارية
// =======================

const API_BASE = "https://durra-server.onrender.com";

(function bootstrap(){
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initSafe);
  } else {
    initSafe();
  }
})();

function initSafe(){
  try { coreInit(); }
  catch (e) {
    console.error("[Durra Init Error]", e);
  }
}

function coreInit(){
  // ---------- عناصر الصفحة الأصلية ----------
  const elForm =
    document.getElementById("form") ||
    document.querySelector("form");

  const elInput =
    document.getElementById("textInput") ||
    document.querySelector("input[type='text'], textarea");

  // مكان عرض النتيجة الأصلي
  let elAnswer =
    document.querySelector(".result") ||
    document.getElementById("answer");

  let createdAnswerCard = false;

  // لو ما في .result نخلق كرت أنيق مع مربع إجابة
  if (!elAnswer) {
    const card = document.createElement("div");
    card.id = "durraAnswerCard";
    card.style.cssText = [
      "margin-top:16px",
      "padding:16px 18px",
      "border-radius:16px",
      "background:#020617cc",
      "border:1px solid rgba(148,163,184,.5)",
      "color:#e5e7eb",
      "font-size:17px",
      "line-height:1.8",
      "direction:rtl",
      "text-align:right",
      "max-height:420px",
      "overflow-y:auto",
      "box-shadow:0 18px 40px rgba(15,23,42,.6)"
    ].join(";");

    elAnswer = document.createElement("div");
    elAnswer.className = "result";
    elAnswer.style.cssText = "white-space:pre-wrap;line-height:1.9;";

    card.appendChild(elAnswer);
    (elForm?.parentElement || document.body).appendChild(card);
    createdAnswerCard = true;
  }

  // صندوق «جاري التفكير» صغير
  let thinking = null;
  function setThinking(on){
    if (on) {
      if (!thinking){
        thinking = document.createElement("div");
        thinking.textContent = "… جاري التفكير";
        thinking.style.opacity = ".75";
        thinking.style.marginTop = "8px";
        thinking.style.direction = "rtl";
        thinking.style.textAlign = "right";
        elAnswer.insertAdjacentElement("beforebegin", thinking);
      }
    } else {
      if (thinking){ thinking.remove(); thinking = null; }
    }
  }

  // ---------- أدوات تنسيق / تنظيف ----------
  function escapeHtml(s){
    return String(s)
      .replace(/&/g,"&amp;").replace(/</g,"&lt;")
      .replace(/>/g,"&gt;").replace(/"/g,"&quot;")
      .replace(/'/g,"&#39;");
  }

  function toArabicDigits(text){
    const map = "٠١٢٣٤٥٦٧٨٩";
    return String(text).replace(/[0-9]/g, d => map[d]);
  }

  function localizeMathSymbols(text){
    if(!text) return "";
    let t = String(text);

    // x كمتغير → س (بحذر)
    t = t.replace(/\bx\b/g,"س");

    // LaTeX → رموز عربية
    t = t.replace(/\\cdot/g," × ")
         .replace(/\\times/g," × ")
         .replace(/\\sqrt/g," √ ")
         .replace(/\\pm/g," ± ")
         .replace(/\\div/g," ÷ ");

    // كلمة div إن ظهرت
    t = t.replace(/\bdiv\b/g," ÷ ");

    // 15 x 15 → ١٥ × ١٥
    t = t.replace(/([0-9٠-٩]+)\s*[x×]\s*([0-9٠-٩]+)/g,"$1 × $2");

    // أرقام عربية
    t = toArabicDigits(t);
    return t;
  }

  function cleanAnswer(text){
    if(!text) return "";
    let t = String(text);

    // امسح كتل الكود والروابط ورسائل OpenAI
    t = t.replace(/```[\s\S]*?```/g,"");
    t = t.replace(/https?:\/\/\S+/g," ");
    t = t.replace(/org-[A-Za-z0-9_-]+/g," ");
    if (/\brate limit\b/i.test(t) || /\bTPM\b/i.test(t)) {
      t = "⚠ تعذّر إكمال الإجابة الآن، الخادم مشغول. حاولي لاحقًا.";
    }

    // عناوين Markdown وفضلات LaTeX
    t = t.replace(/^[ \t]*#{1,6}[ \t]*/gm,"");
    t = t.replace(/\\(left|right|displaystyle)/g,"");
    t = t.replace(/\\[\[\]\(\)]/g,"");
    t = t.replace(/\\\\/g,"\n");

    // مسافات وأسطر
    t = t.replace(/[ \t]+/g," ");
    t = t.replace(/\n{3,}/g,"\n\n");

    t = localizeMathSymbols(t);
    return t.trim();
  }

  // يحوّل الكسور والأسس إلى HTML منسّق
  function mathToHtml(txt){
    if(!txt) return "";
    let t = escapeHtml(txt);

    // \frac{a}{b}
    t = t.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g,
      (m,a,b) => `[[FRAC:${a}|${b}]]`
    );

    // a / b البسيطة (بين أعداد / س)
    t = t.replace(
      /(^|[\s(\[])([0-9٠-٩س]+)[ \t]*\/[ \t]*([0-9٠-٩س]+)(?=([\s)\].,!?؛،]|$))/g,
      (m,lead,A,B,tail) => `${lead}[[FRAC:${A}|${B}]]${tail||""}`
    );

    // a^2 → أس
    t = t.replace(
      /(\d+|[٠-٩]+|س|\([^()]+\))\^([0-9٠-٩]+)/g,
      (m,base,exp) => `[[POW:${base}|${exp}]]`
    );

    // استبدالات HTML
    t = t.replace(/\[\[FRAC:([^|]+)\|([^\]]+)\]\]/g,
      (m,top,bot) =>
        `<span class="frac"><span class="top">${top}</span><span class="bottom">${bot}</span></span>`
    );
    t = t.replace(/\[\[POW:([^|]+)\|([^\]]+)\]\]/g,
      (m,base,exp) => `<span class="pow">${base}<sup>${exp}</sup></span>`
    );

    // فقرات
    return t.split(/\n{2,}/).map(p => `<p>${p.replace(/\n/g,"<br>")}</p>`).join("");
  }

  // عرض في .result
  function showAnswer(text){
    const cleaned = cleanAnswer(text);
    elAnswer.innerHTML = mathToHtml(cleaned);
    elAnswer.dir = "rtl";
  }

  // ---------- سؤال الخادم ----------
  async function ask(){
    if(!elInput){ showAnswer("⚠ لم أجد خانة السؤال."); return; }

    const q = (elInput.value || "").trim();
    if(!q){ showAnswer("✏️ اكتبي سؤالك أولًا."); return; }

    setThinking(true);

    try{
      const payload = { message:q, history:[] };
      let resp = await fetch(`${API_BASE}/api/chat`,{
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body:JSON.stringify(payload),
      }).catch(()=>null);

      if(!resp || resp.status === 404){
        resp = await fetch(`${API_BASE}/ask`,{
          method:"POST",
          headers:{ "Content-Type":"application/json" },
          body:JSON.stringify({ question:q }),
        }).catch(()=>null);
      }

      setThinking(false);
      if(!resp){ showAnswer("⚠ تعذّر الاتصال بالخادم. حاولي لاحقًا."); return; }

      const data = await resp.json().catch(()=>({}));
      const reply = data.reply || data.answer || data.text || data.result || "";
      showAnswer(reply || "⚠ ما وصلت إجابة مفهومة.");
    }catch(e){
      setThinking(false);
      showAnswer("⚠ صار خطأ بالاتصال، جربي مرة ثانية.");
    }
  }

  // ---------- ربط «إرسال» و Enter ----------
  if (elForm) {
    elForm.addEventListener("submit", e => { e.preventDefault(); ask(); });
  }
  if (elInput) {
    elInput.addEventListener("keydown", e => {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(); }
    });
  }
  const elSend =
    document.querySelector("[data-send]") ||
    document.getElementById("btnSend");
  if (elSend) {
    elSend.type = "button";
    elSend.addEventListener("click", ask);
  }

  // ---------- أزرار الصوت تحت خانة السؤال ----------
  let elMicBtn =
    document.getElementById("btnMic") ||
    document.querySelector("[data-mic]");
  let elTTSBtn = document.getElementById("btnTTS");

  // وعاء صغير للأزرار
  let tools = document.getElementById("durra-audio-tools");
  if (!tools && (elInput || elForm)){
    tools = document.createElement("div");
    tools.id = "durra-audio-tools";
    tools.style.cssText = "display:flex;flex-direction:column;gap:6px;margin-top:6px;";
    (elInput?.parentElement || elForm || document.body).appendChild(tools);
  }

  // نخلق الأزرار إذا مو موجودة
  if (!elMicBtn) {
    elMicBtn = document.createElement("button");
    elMicBtn.id = "btnMic";
    elMicBtn.type = "button";
    elMicBtn.textContent = "🎙 سؤال صوتي";
  }
  if (!elTTSBtn) {
    elTTSBtn = document.createElement("button");
    elTTSBtn.id = "btnTTS";
    elTTSBtn.type = "button";
    elTTSBtn.textContent = "🔈 الإجابة الصوتية";
  }
  if (tools){
    tools.appendChild(elMicBtn);
    tools.appendChild(elTTSBtn);
  }

  // ستايل مربّع ناعم للأزرار (يغطي على أي CSS قديم)
  function styleAudioButton(btn){
    if (!btn) return;
    btn.style.display = "inline-flex";
    btn.style.alignItems = "center";
    btn.style.justifyContent = "center";
    btn.style.gap = "4px";
    btn.style.padding = "6px 10px";
    btn.style.fontSize = "0.85rem";
    btn.style.borderRadius = "10px";     // مربعات ناعمة، مو بيضاوية
    btn.style.border = "1px solid rgba(56,189,248,0.8)";
    btn.style.background = "#020617";
    btn.style.color = "#e5e7eb";
    btn.style.cursor = "pointer";
    btn.style.transition = "transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease";
  }
  styleAudioButton(elMicBtn);
  styleAudioButton(elTTSBtn);

  // STT
  let recognition = null, listening = false;
  function ensureRecognition(){
    if (recognition) return recognition;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return null;
    const rec = new SR();
    rec.lang = "ar-SA";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onstart = () => { listening = true; elMicBtn && (elMicBtn.textContent = "⏹ إيقاف الاستماع"); };
    rec.onend   = () => { listening = false; elMicBtn && (elMicBtn.textContent = "🎙 سؤال صوتي"); };
    rec.onresult = (e) => {
      const txt = (e.results?.[0]?.[0]?.transcript || "").trim();
      if (elInput) elInput.value = txt;
      if (txt) ask();
    };
    recognition = rec;
    return rec;
  }
  elMicBtn && elMicBtn.addEventListener("click", () => {
    const rec = ensureRecognition();
    if (!rec) { showAnswer("ℹ️ جهازك لا يدعم السؤال الصوتي."); return; }
    try { listening ? rec.stop() : rec.start(); } catch {}
  });

  // TTS
  if ("speechSynthesis" in window){
    let enabled = JSON.parse(localStorage.getItem("durra_tts_on") || "false");
    const render = () => { elTTSBtn && (elTTSBtn.textContent = enabled ? "🔊 الإجابة الصوتية" : "🔈 الإجابة الصوتية"); };
    render();
    elTTSBtn && elTTSBtn.addEventListener("click", () => {
      enabled = !enabled; localStorage.setItem("durra_tts_on", JSON.stringify(enabled)); render();
      if (!enabled) try{ speechSynthesis.cancel(); }catch{}
    });

    // نطق آخر إجابة تظهر في .result
    const obs = new MutationObserver(() => {
      if (!enabled) return;
      const raw = elAnswer.textContent || "";
      let t = raw;

      // تنعيم النطق: × / = -
      t = t.replace(/×/g," ضرب ")
           .replace(/\//g," على ")
           .replace(/=/g," يساوي ")
           .replace(/([0-9٠-٩]+)\s*-\s*([0-9٠-٩]+)/g,"$1 ناقص $2")
           .replace(/-/g," ");

      // إزالة الضوضاء
      t = t.replace(/[\[\]\{\}\(\)\|\_\^\~]/g," ");
      t = t.replace(/[A-Za-z]{3,}/g," ");
      t = t.replace(/\s{2,}/g," ").trim();

      if (!t || /جاري التفكير|⚠/.test(t)) return;
      try{
        speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(t);
        u.lang = "ar-SA"; u.rate = 1; u.pitch = 1;
        speechSynthesis.speak(u);
      }catch{}
    });
    obs.observe(elAnswer, { childList:true, subtree:true });
  }
}
