// =======================
// دُرّى — واجهة مبسطة (سؤال نصي + سؤال صوتي + إجابة صوتية)
// =======================

const API_BASE = "https://durra-server.onrender.com";

// ============ أدوات مساعدة ============

// حماية من إدخال HTML مباشر
function escapeHtml(s){
  return String(s)
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;")
    .replace(/'/g,"&#39;");
}

// تحويل الأرقام إلى عربية
function toArabicDigits(text){
  const map = "٠١٢٣٤٥٦٧٨٩";
  return String(text).replace(/[0-9]/g,d=>map[d]);
}

// توحيد رموز الرياضيات (x → س ، × ، √ …)
function localizeMathSymbols(text){
  if(!text) return "";
  let t = text;

  // المتغير x كرمز رياضي → س
  t = t
    .replace(/\bx\b/g,"س")
    .replace(/(\d)\s*x\b/g,"$1س")
    .replace(/x(?=\s*[\+\-\*\/=)\]])/g,"س");

  // لايتِك ورموز الرياضيات
  t = t
    .replace(/\\cdot/g," × ")
    .replace(/\\times/g," × ")
    .replace(/\\sqrt/g," √ ")
    .replace(/\\pm/g," ± ");

  // 3 x 4 بين أعداد → ٣ × ٤
  t = t.replace(/([0-9٠-٩]+)\s*x\s*([0-9٠-٩]+)/g,"$1 × $2");

  // الأرقام إلى عربية
  t = toArabicDigits(t);

  return t;
}

// تنظيف نص الإجابة من الرموز الزائدة وتنسيق رياضيات
function cleanAnswer(text){
  if(!text) return "";
  let cleaned = text;

  // إزالة الكود بين ```
  cleaned = cleaned.replace(/```[\s\S]*?```/g,"");

  // إزالة عناوين Markdown (# ###)
  cleaned = cleaned.replace(/^[ \t]*#{1,6}[ \t]*/gm,"");

  // إزالة النجوم ** من التنسيق
  cleaned = cleaned.replace(/\*\*/g,"");

  // إزالة الرموز \[ \] \( \)
  cleaned = cleaned.replace(/\\[\[\]\(\)]/g,"");

  // استبدال \\ بسطر جديد
  cleaned = cleaned.replace(/\\\\/g,"\n");

  // تقليل المسافات والأسطر
  cleaned = cleaned.replace(/[ \t]+/g," ");
  cleaned = cleaned.replace(/\n{3,}/g,"\n\n");

  // توحيد رياضيات عربية
  cleaned = localizeMathSymbols(cleaned);

  return cleaned.trim();
}

// تحويل الكسور والأسس إلى HTML منسّق
function fractionsAndPowersToHtml(txt){
  if(!txt) return "";
  let t = escapeHtml(txt);

  // \frac{a}{b}
  t = t.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g,
    (m,a,b)=>`[[FRAC:${a}|${b}]]`
  );

  // a / b البسيطة
  t = t.replace(
    /(^|[\s(\[])([^()\s]{1,12})[ \t]*\/[ \t]*([^()\s]{1,12})(?=([\s)\].,!?؛،]|$))/g,
    (m,lead,A,B,tail)=>`${lead}[[FRAC:${A}|${B}]]${tail||""}`
  );

  // a^2
  t = t.replace(
    /(\d+|[٠-٩]+|س|\([^()]+\))\^([0-9٠-٩]+)/g,
    (m,base,exp)=>`[[POW:${base}|${exp}]]`
  );

  // استبدال العلامات المؤقتة بعناصر HTML
  t = t.replace(/\[\[FRAC:([^|]+)\|([^\]]+)\]\]/g,
    (m,top,bot)=>`<span class="frac"><span class="top">${top}</span><span class="bot">${bot}</span></span>`
  );
  t = t.replace(/\[\[POW:([^|]+)\|([^\]]+)\]\]/g,
    (m,base,exp)=>`<span class="pow">${base}<sup>${exp}</sup></span>`
  );

  const parts = t.split(/\n{2,}/).map(p=>p.replace(/\n/g,"<br>"));
  return parts.map(p=>`<p>${p}</p>`).join("");
}

// لو ردّ الخادم برسالة Rate limit إنجليزية نرجع رسالة عربية بسيطة
function filterServerError(text){
  if(!text) return null;
  const low = String(text).toLowerCase();
  if(
    low.includes("rate limit") ||
    low.includes("tpm") ||
    low.includes("openai.com/account/rate-limits")
  ){
    return "⚠ تعذّر إكمال الإجابة الآن، يبدو أن الخادم مشغول. حاولي بعد قليل.";
  }
  return text;
}

// ============ عناصر الصفحة ============

const elForm =
  document.getElementById("form") ||
  document.querySelector("form");

const elInput =
  document.getElementById("textInput") ||
  document.querySelector("input[type='text'], textarea");

let elMessages =
  document.getElementById("messages") ||
  document.querySelector(".messages");

// لو ما لقينا صندوق رسائل، ننشئ واحد بسيط
if(!elMessages){
  elMessages = document.createElement("div");
  elMessages.id = "messages";
  (elForm?.parentElement || document.body).appendChild(elMessages);
}

// زر الميكروفون (سؤال صوتي)
let elMicBtn =
  document.getElementById("btnMic") ||
  document.querySelector("[data-mic]");

if(!elMicBtn && elInput){
  elMicBtn = document.createElement("button");
  elMicBtn.type = "button";
  elMicBtn.id = "btnMic";
  elMicBtn.textContent = "🎙 سؤال صوتي";
  const parent = elInput.parentElement || elForm || document.body;
  parent.appendChild(elMicBtn);
}

// زر الإجابة الصوتية (تبديل تشغيل/إيقاف)
let elTTSBtn = document.getElementById("btnTTS");
if(!elTTSBtn){
  elTTSBtn = document.createElement("button");
  elTTSBtn.type = "button";
  elTTSBtn.id = "btnTTS";
  elTTSBtn.textContent = "🔈 الإجابة الصوتية";
  if(elMicBtn){
    elMicBtn.insertAdjacentElement("afterend", elTTSBtn);
  }else if(elInput){
    (elInput.parentElement || elForm || document.body).appendChild(elTTSBtn);
  }
}

// ============ عرض الرسائل ============

function addMessage(text, who="assistant"){
  if(!elMessages) return;
  const div = document.createElement("div");
  div.className = "message " + (who==="user" ? "user" : "assistant");
  div.dir = "rtl";

  if(who === "assistant"){
    const cleaned = cleanAnswer(text);
    div.innerHTML = fractionsAndPowersToHtml(cleaned);
  }else{
    div.textContent = text;
  }

  elMessages.appendChild(div);
  elMessages.scrollTop = elMessages.scrollHeight;
}

// فحص بسيط للخادم (اختياري)
async function pingOnce(){
  try{
    const res = await fetch(`${API_BASE}/health`,{cache:"no-store"});
    await res.json().catch(()=>({}));
  }catch(e){
    // نطنش
  }
}

// ============ إرسال السؤال ============

async function ask(){
  if(!elInput){
    addMessage("⚠ لم أجد خانة السؤال في الصفحة.","assistant");
    return;
  }

  const q = (elInput.value || "").trim();
  if(!q){
    addMessage("✏️ اكتبي سؤالك أولاً.","assistant");
    return;
  }

  // نضيف سؤال الطالبة
  addMessage(q,"user");
  elInput.value = "";

  // رسالة "جاري التفكير"
  const thinking = document.createElement("div");
  thinking.className = "message assistant";
  thinking.textContent = "… جاري التفكير";
  thinking.dir = "rtl";
  elMessages.appendChild(thinking);
  elMessages.scrollTop = elMessages.scrollHeight;

  try{
    const payload = { message:q, history:[] };

    let resp = await fetch(`${API_BASE}/api/chat`,{
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body:JSON.stringify(payload)
    }).catch(()=>null);

    // لو /api/chat مو موجود، نجرب /ask القديم
    if(!resp || resp.status === 404){
      resp = await fetch(`${API_BASE}/ask`,{
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body:JSON.stringify({ question:q })
      }).catch(()=>null);
    }

    if(!resp){
      thinking.remove();
      addMessage("⚠ تعذر الاتصال بالخادم. حاولي بعد قليل.","assistant");
      return;
    }

    const data = await resp.json().catch(()=> ({}));
    thinking.remove();

    let reply =
      (data && (data.reply || data.answer || data.text || data.result)) ||
      null;

    reply = filterServerError(reply);

    if(reply){
      addMessage(reply,"assistant");
    }else if(data && data.error){
      addMessage("⚠ تعذّر إكمال الإجابة الآن، حاولي لاحقًا.","assistant");
    }else{
      addMessage("⚠ ما وصلت إجابة مفهومة من الخادم.","assistant");
    }

  }catch(e){
    thinking.remove();
    addMessage("⚠ صار خطأ بالاتصال، جربي مرة ثانية.","assistant");
  }
}

// ============ السؤال الصوتي (STT) ============

let recognition = null;
let listening = false;

function ensureRecognition(){
  if(recognition) return recognition;
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SR){
    alert("العفو، المتصفح لا يدعم السؤال الصوتي (جرّبي Google Chrome).");
    return null;
  }
  const rec = new SR();
  rec.lang = "ar-SA";
  rec.interimResults = false;
  rec.maxAlternatives = 1;

  rec.onstart = ()=>{
    listening = true;
    if(elMicBtn) elMicBtn.textContent = "⏹ إيقاف الاستماع";
  };

  rec.onresult = (e)=>{
    const txt = (e.results?.[0]?.[0]?.transcript || "").trim();
    if(elInput) elInput.value = txt;
    if(txt) ask();
  };

  rec.onerror = ()=>{
    addMessage("⚠ تعذر الاستماع، حاولي مرة أخرى.","assistant");
  };

  rec.onend = ()=>{
    listening = false;
    if(elMicBtn) elMicBtn.textContent = "🎙 سؤال صوتي";
  };

  recognition = rec;
  return rec;
}

function toggleListening(){
  const rec = ensureRecognition();
  if(!rec) return;
  try{
    if(!listening) rec.start();
    else rec.stop();
  }catch(e){
    // تجاهل
  }
}

// ============ ربط الأحداث ============

function wire(){
  if(elForm){
    elForm.addEventListener("submit",e=>{
      e.preventDefault();
      ask();
    });
  }

  // زر "إرسال" إن وجد
  let elSend =
    document.querySelector("[data-send]") ||
    document.getElementById("btnSend");

  if(!elSend){
    const buttons = Array.from(document.querySelectorAll("button"));
    elSend = buttons.find(b=>(b.textContent || "").trim().includes("إرسال"));
  }

  if(elSend){
    elSend.type = "button";
    elSend.addEventListener("click",()=>ask());
  }

  if(elInput){
    elInput.addEventListener("keydown",e=>{
      if(e.key === "Enter" && !e.shiftKey){
        e.preventDefault();
        ask();
      }
    });
  }

  if(elMicBtn){
    elMicBtn.addEventListener("click",toggleListening);
  }
}

wire();
pingOnce();

// ============ الإجابة الصوتية (TTS) ============

(function(){
  if(!("speechSynthesis" in window)) return;

  let enabled = JSON.parse(localStorage.getItem("durra_tts_on") || "false");
  let voices = [];
  let currentVoice = null;

  function chooseVoice(){
    voices = speechSynthesis.getVoices();
    const ar = voices.filter(v=>(v.lang||"").toLowerCase().startsWith("ar"));
    currentVoice = ar[0] || voices.find(v=>/arabic/i.test(v.name)) || null;
  }
  chooseVoice();
  window.speechSynthesis.onvoiceschanged = chooseVoice;

  function renderTtsBtn(){
    if(!elTTSBtn) return;
    elTTSBtn.textContent = enabled ? "🔊 الإجابة الصوتية" : "🔈 الإجابة الصوتية";
  }
  renderTtsBtn();

  if(elTTSBtn){
    elTTSBtn.addEventListener("click",()=>{
      enabled = !enabled;
      localStorage.setItem("durra_tts_on",JSON.stringify(enabled));
      if(!enabled){
        try{ speechSynthesis.cancel(); }catch(e){}
      }
      renderTtsBtn();
    });
  }

  // تجهيز النص قبل نطقه
  function prepareForSpeech(text){
    let t = text || "";
    if(/جاري التفكير/.test(t)) return "";
    if(/⚠/.test(t)) return "";

    // حذف الروابط والكلام الإنجليزي الطويل
    t = t.replace(/https?:\/\/\S+/g," ");
    t = t.replace(/[A-Za-z0-9]{3,}/g," ");

    // أوامر لايتك
    t = t.replace(/\\frac/g," كسر ");
    t = t.replace(/\\/g," ");

    // الضرب والقسمة والمساواة والجمع
    t = t
      .replace(/\//g," على ")
      .replace(/\*/g," ضرب ")
      .replace(/=/g," يساوي ")
      .replace(/\+/g," زائد ");

    // ٣ × ٢ بين أعداد (سواء x أو ×)
    t = t.replace(/([0-9٠-٩]+)\s*[x×]\s*([0-9٠-٩]+)/g,"$1 ضرب $2");

    // ناقص فقط بين أعداد (٣ - ٢)
    t = t.replace(/([0-9٠-٩]+)\s*-\s*([0-9٠-٩]+)/g,"$1 ناقص $2");
    // أي شرطات ثانية (قوائم، - ١٢ حرفًا) نخليها مسافة
    t = t.replace(/-/g," ");

    // إزالة رموز لا نحتاجها
    t = t.replace(/[\[\]\{\}\(\)\|\_\^\~]/g," ");
    t = t.replace(/[.,;:،؛]{2,}/g,"، ");
    t = t.replace(/\s{2,}/g," ").trim();

    return t;
  }

  function speak(text){
    if(!enabled) return;
    const prepared = prepareForSpeech(text);
    if(!prepared) return;

    try{
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(prepared);
      u.lang = (currentVoice && currentVoice.lang) || "ar-SA";
      if(currentVoice) u.voice = currentVoice;
      u.rate = 1;
      u.pitch = 1;
      speechSynthesis.speak(u);
    }catch(e){
      // نطنش
    }
  }

  // مراقبة الرسائل الجديدة من دُرّى
  const target = elMessages || document.body;
  const observer = new MutationObserver(muts=>{
    for(const m of muts){
      m.addedNodes && m.addedNodes.forEach(node=>{
        if(!(node instanceof HTMLElement)) return;
        if(node.classList &&
           node.classList.contains("message") &&
           node.classList.contains("assistant")){
          const text = node.textContent || "";
          if(text.trim()) speak(text.trim());
        }
      });
    }
  });
  observer.observe(target,{childList:true,subtree:true});
})();
