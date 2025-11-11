// =======================
// دُرّى — واجهة مبسطة (سؤال نصي + زر سؤال صوتي)
// =======================

const API_BASE = "https://durra-server.onrender.com";

// ---------- أدوات تنسيق ----------
function escapeHtml(s){
  return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;")
    .replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
}
function toArabicDigits(text){const map="٠١٢٣٤٥٦٧٨٩";return text.replace(/[0-9]/g,d=>map[d]);}
function localizeMathSymbols(text){
  if(!text) return "";
  let t=text;
  t=t.replace(/\bx\b/g,"س").replace(/(\d)\s*x\b/g,"$1س").replace(/x(?=\s*[\+\-\*\/=)\]])/g,"س");
  t=t.replace(/\\cdot/g," × ").replace(/\\sqrt/g," √ ").replace(/\\pm/g," ± ");
  t=toArabicDigits(t);
  return t;
}
function cleanAnswer(text){
  if(!text) return "";
  let cleaned=text;
  cleaned=cleaned.replace(/```[\s\S]*?```/g,"");
  cleaned=cleaned.replace(/^[ \t]*#{1,6}[ \t]*/gm,"");
  cleaned=cleaned.replace(/\*\*/g,"");
  cleaned=cleaned.replace(/\\[\[\]\(\)]/g,"");
  cleaned=cleaned.replace(/\\\\/g,"\n");
  cleaned=cleaned.replace(/[ \t]+/g," ");
  cleaned=cleaned.replace(/\n{3,}/g,"\n\n");
  return localizeMathSymbols(cleaned).trim();
}
function fractionsAndPowersToHtml(txt){
  if(!txt) return "";
  let t=escapeHtml(txt);
  t=t.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g,(m,a,b)=>`[[FRAC:${a}|${b}]]`);
  t=t.replace(/(^|[\s(\[])([^()\s]{1,12})[ \t]*\/[ \t]*([^()\s]{1,12})(?=([\s)\].,!?؛،]|$))/g,
    (m,lead,A,B,tail)=>`${lead}[[FRAC:${A}|${B}]]${tail||""}`);
  t=t.replace(/(\d+|[٠-٩]+|س|\([^()]+\))\^([0-9٠-٩]+)/g,(m,base,exp)=>`[[POW:${base}|${exp}]]`);
  t=t.replace(/\[\[FRAC:([^|]+)\|([^\]]+)\]\]/g,(m,top,bot)=>`<span class="frac"><span class="top">${top}</span><span class="bar"></span><span class="bot">${bot}</span></span>`);
  t=t.replace(/\[\[POW:([^|]+)\|([^\]]+)\]\]/g,(m,base,exp)=>`<span class="pow">${base}<sup>${exp}</sup></span>`);
  const parts=t.split(/\n{2,}/).map(p=>p.replace(/\n/g,"<br>"));
  return parts.map(p=>`<p>${p}</p>`).join("");
}

// ---------- عناصر الصفحة ----------
const elForm = document.getElementById("form") || document.querySelector("form");
const elInput = document.getElementById("textInput") || document.querySelector("input[type='text'], textarea");
let elMessages = document.getElementById("messages") || document.querySelector(".messages");

if(!elMessages){
  elMessages=document.createElement("div");
  elMessages.id="messages";
  elMessages.style.cssText="max-height:260px;overflow:auto;margin-top:10px;padding:10px;border-radius:10px;border:1px solid #444;background:#0b0f16;color:#eee;font-size:16px;line-height:1.6;";
  (elForm?.parentElement || document.body).appendChild(elMessages);
}

// زر الميكروفون (سؤال صوتي)
let elMicBtn = document.getElementById("btnMic") || document.querySelector("[data-mic]");
if(!elMicBtn && elInput){
  elMicBtn=document.createElement("button");
  elMicBtn.type="button";
  elMicBtn.id="btnMic";
  elMicBtn.textContent="🎙 سؤال صوتي";
  elMicBtn.style.cssText="margin-top:8px;padding:6px 12px;border-radius:999px;border:1px solid rgba(56,189,248,0.8);background:#020617;color:#e5e7eb;cursor:pointer;font-size:14px";
  (elInput.parentElement || elForm || document.body).appendChild(elMicBtn);
}

// زر تبديل “الإجابة الصوتية” بجانب الميكروفون
let elTTSBtn = document.getElementById("btnTTS");
if(!elTTSBtn){
  elTTSBtn=document.createElement("button");
  elTTSBtn.type="button";
  elTTSBtn.id="btnTTS";
  (elTTSBtn.textContent = (JSON.parse(localStorage.getItem("durra_tts_on")||"false") ? "🔊 الإجابة الصوتية" : "🔈 الإجابة الصوتية"));
  elMicBtn?.insertAdjacentElement("afterend", elTTSBtn);
}

// ---------- عرض الرسائل ----------
function addMessage(text, who="assistant"){
  if(!elMessages) return;
  const div=document.createElement("div");
  div.className="message "+(who==="user"?"user":"assistant");
  div.style.margin="8px 0";

  if(who==="assistant"){
    const cleaned=cleanAnswer(text);
    div.innerHTML=fractionsAndPowersToHtml(cleaned);
  }else{
    div.textContent=text;
  }
  elMessages.appendChild(div);
  elMessages.scrollTop=elMessages.scrollHeight;
}

// ---------- اتصال الخادم ----------
async function pingOnce(){
  try{
    const res=await fetch(`${API_BASE}/health`,{cache:"no-store"});
    await res.json().catch(()=>({}));
  }catch(e){}
}

// إرسال السؤال
async function ask(){
  if(!elInput){ addMessage("⚠ لم أجد خانة السؤال في الصفحة."); return; }
  const q=(elInput.value||"").trim();
  if(!q){ addMessage("✏️ اكتبي سؤالك أولاً."); return; }

  addMessage(q,"user");
  elInput.value="";

  const thinking=document.createElement("div");
  thinking.className="message assistant";
  thinking.textContent="… جاري التفكير";
  elMessages.appendChild(thinking);
  elMessages.scrollTop=elMessages.scrollHeight;

  try{
    const payload={message:q, history:[]};
    let resp=await fetch(`${API_BASE}/api/chat`,{
      method:"POST", headers:{"Content-Type":"application/json"},
      body:JSON.stringify(payload)
    }).catch(()=>null);

    if(!resp || resp.status===404){
      resp=await fetch(`${API_BASE}/ask`,{
        method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({question:q})
      }).catch(()=>null);
    }

    if(!resp){ thinking.remove(); addMessage("⚠ تعذر الاتصال بالخادم. حاولي بعد قليل."); return; }
    const data=await resp.json().catch(()=>({}));
    thinking.remove();

    const reply=(data && (data.reply||data.answer||data.text)) || null;
    if(reply){
      addMessage(reply,"assistant");
    }else if(data && data.error){
      // نخفي تفاصيل الخطأ التقني
      addMessage("⚠ تعذر إكمال الإجابة الآن، حاولي بعد قليل.","assistant");
    }else{
      addMessage("⚠ ما وصلت إجابة مفهومة من الخادم.","assistant");
    }
  }catch(e){
    thinking.remove();
    addMessage("⚠ صار خطأ بالاتصال، جربي مرة ثانية.","assistant");
  }
}

// —— السؤال الصوتي (Web Speech API) ——
let recognition=null, listening=false;
function ensureRecognition(){
  if(recognition) return recognition;
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR){ alert("العفو، المتصفح لا يدعم السؤال الصوتي (جرّبي Google Chrome)."); return null; }
  const rec=new SR();
  rec.lang="ar-SA"; rec.interimResults=false; rec.maxAlternatives=1;

  rec.onstart=()=>{ listening=true; if(elMicBtn) elMicBtn.textContent="⏹ إيقاف الاستماع"; };
  rec.onresult=(e)=>{ const txt=(e.results?.[0]?.[0]?.transcript||"").trim(); if(elInput) elInput.value=txt; if(txt) ask(); };
  rec.onerror=()=>{ addMessage("⚠ تعذر الاستماع، حاولي مرة أخرى.","assistant"); };
  rec.onend=()=>{ listening=false; if(elMicBtn) elMicBtn.textContent="🎙 سؤال صوتي"; };

  recognition=rec; return rec;
}
function toggleListening(){
  const rec=ensureRecognition(); if(!rec) return;
  try{ !listening? rec.start(): rec.stop(); }catch(e){}
}

// ربط الأحداث
function wire(){
  elForm?.addEventListener("submit",(e)=>{ e.preventDefault(); ask(); });

  // زر إرسال إن وجد
  let elSend=document.querySelector("[data-send]")||document.getElementById("btnSend");
  if(!elSend){
    const buttons=[...document.querySelectorAll("button")];
    elSend=buttons.find(b=>(b.textContent||"").trim().includes("إرسال"));
  }
  if(elSend){ elSend.type="button"; elSend.addEventListener("click",()=>ask()); }

  elInput?.addEventListener("keydown",(e)=>{ if(e.key==="Enter" && !e.shiftKey){ e.preventDefault(); ask(); }});
  elMicBtn?.addEventListener("click",toggleListening);
}
wire();
pingOnce();

// ==== الإجابة الصوتية: زر صغير بجانب "سؤال صوتي" + تنظيف للنص المنطوق ====
(function(){
  if(!("speechSynthesis" in window)) return;

  let enabled=JSON.parse(localStorage.getItem("durra_tts_on")||"false");
  let voices=[], currentVoice=null;

  function chooseVoice(){
    voices=speechSynthesis.getVoices();
    const ar=voices.filter(v=>(v.lang||"").toLowerCase().startsWith("ar"));
    currentVoice= ar[0] || voices.find(v=>/arabic/i.test(v.name)) || null;
  }
  chooseVoice();
  window.speechSynthesis.onvoiceschanged=chooseVoice;

  // ربط زر TTS بجانب الميكروفون
  function renderTtsBtn(){
    if(!elTTSBtn) return;
    elTTSBtn.textContent = enabled? "🔊 الإجابة الصوتية" : "🔈 الإجابة الصوتية";
  }
  renderTtsBtn();
  elTTSBtn?.addEventListener("click",()=>{
    enabled=!enabled;
    localStorage.setItem("durra_tts_on", JSON.stringify(enabled));
    if(!enabled) try{ speechSynthesis.cancel(); }catch(e){}
    renderTtsBtn();
  });

  // تنظيف النص قبل النطق
  function prepareForSpeech(text){
    let t=text||"";
    if(/جاري التفكير/.test(t)) return "";
    if(/⚠/.test(t)) return "";

    t=t.replace(/https?:\/\/\S+/g," ");    // الروابط
    t=t.replace(/[A-Za-z0-9]{3,}/g," ");   // سلاسل إنجليزية طويلة
    t=t.replace(/\\frac/g," كسر ");
    t=t.replace(/\\/g," ");
    t=t.replace(/\//g," على ").replace(/\*/g," ضرب ").replace(/=/g," يساوي ").replace(/\+/g," زائد ").replace(/-/g," ناقص ");
    t=t.replace(/[\[\]\{\}\(\)\|\_\^\~]/g," ");
    t=t.replace(/[.,;:،؛]{2,}/g,"، ");
    t=t.replace(/\s{2,}/g," ").trim();
    return t;
  }

  function speak(text){
    if(!enabled) return;
    const prepared=prepareForSpeech(text);
    if(!prepared) return;
    try{
      speechSynthesis.cancel();
      const u=new SpeechSynthesisUtterance(prepared);
      u.lang=(currentVoice&&currentVoice.lang)||"ar-SA";
      if(currentVoice) u.voice=currentVoice;
      u.rate=1; u.pitch=1;
      speechSynthesis.speak(u);
    }catch(e){}
  }

  // نطق أي رسالة مساعدة جديدة
  const target=elMessages||document.body;
  const observer=new MutationObserver((mut)=>{
    for(const m of mut){
      m.addedNodes?.forEach(node=>{
        if(!(node instanceof HTMLElement)) return;
        if(node.classList?.contains("message") && node.classList?.contains("assistant")){
          const txt=node.textContent||"";
          if(txt.trim()) speak(txt.trim());
        }
      });
    }
  });
  observer.observe(target,{childList:true,subtree:true});
})();
