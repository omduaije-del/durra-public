// ===== Glue: وجّه أي طلبات نسبية نحو السيرفر على Render =====
const API_URL = "https://durra-server.onrender.com";

// لزوم التوافق: إذا فيه /ask أو /v1/... أو أي مسار يبدأ بـ / ، نخليه يروح لسيرفر Render.
(function patchFetchBase() {
  if (!window.__fetchPatched) {
    const originalFetch = window.fetch.bind(window);
    window.fetch = (input, init = {}) => {
      let url = typeof input === "string" ? input : (input && input.url) || "";

      if (typeof url === "string") {
        const trim = (s) => s.trim();
        url = trim(url);

        // حالات شائعة:
        // fetch('/ask' ...)  -> https://durra-server.onrender.com/ask
        // fetch('/v1/...')   -> https://durra-server.onrender.com/v1/...
        // fetch('ask')       -> https://durra-server.onrender.com/ask
        if (url === "ask" || url.startsWith("/ask")) {
          url = API_URL + (url.startsWith("/") ? url : "/" + url);
        } else if (url.startsWith("/v1/")) {
          url = API_URL + url;
        } else if (url.startsWith("/")) {
          // أي مسار نسبي يبدأ بـ / نرسله للسيرفر
          url = API_URL + url;
        }
      }

      return originalFetch(url, init);
    };
    window.__fetchPatched = true;
  }
})();
/* واجهة دُرى */
const elMessages   = document.getElementById('messages');
const elForm       = document.getElementById('form');
const elInput      = document.getElementById('textInput');
const elBtnMic     = document.getElementById('btnMic');
const elBtnStop    = document.getElementById('btnStop');
const elVoiceQ     = document.getElementById('voiceQuestion');
const elVoiceA     = document.getElementById('voiceAnswer');
const elVoiceSelect= document.getElementById('voiceSelect');
const elLangSelect = document.getElementById('langSelect');

let recognition = null;

/* اختيار اللغة عربي/إنجليزي */
function applyLang(lang){
  const isAr = (lang === 'ar');
  document.documentElement.lang = isAr ? 'ar' : 'en';
  document.documentElement.dir  = isAr ? 'rtl' : 'ltr';
  const input = document.getElementById('textInput');
  if (input){
    input.setAttribute('lang', lang);
    input.style.direction = isAr ? 'rtl' : 'ltr';
    input.style.textAlign = isAr ? 'right' : 'left';
  }
  // اضبطي لغة التعرف الصوتي إن كانت مهيأة
  try{ if (recognition){ recognition.lang = isAr ? 'ar-SA' : 'en-US'; } }catch(e){}
  // إعادة ملء الأصوات وفق اللغة
  try{ fillVoices && fillVoices(); }catch(e){}
}
if (typeof elLangSelect !== 'undefined' && elLangSelect){
  elLangSelect.addEventListener('change', e=> applyLang(e.target.value));
  applyLang(elLangSelect.value || 'ar');
} else {
  applyLang('ar');
}

let history = [];

/* تحويل الأرقام إلى عربية-هندية */
function toArabicIndicDigits(str=''){ return (str+'').replace(/[0-9]/g, d=>'٠١٢٣٤٥٦٧٨٩'[+d]); }

/* عرض رسالة */
function addMessage(text, who='assistant'){
  const div = document.createElement('div');
  div.className = 'message ' + (who === 'user' ? 'user' : 'assistant');
  div.innerHTML = text;
  elMessages.appendChild(div);
  elMessages.scrollTop = elMessages.scrollHeight;
  if (window.MathJax) MathJax.typesetPromise();
}

/* نغمة تشجيع بسيطة */
function cheer(){
  try{
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type='triangle'; o.frequency.value=880;
    g.gain.setValueAtTime(0.001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime+0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime+0.5);
    o.connect(g).connect(ctx.destination); o.start(); o.stop(ctx.currentTime+0.6);
  }catch(e){}
}

/* ——— TTS: اختيار الصوت ——— */
let voiceList = [];
let chosenVoice = null;

function fillVoices(){
  if (!window.speechSynthesis || !elVoiceSelect) return;
  const lang = (elLangSelect && elLangSelect.value) || 'ar';
  const prefer = lang === 'ar' ? 'ar' : 'en-';
  const voices = speechSynthesis.getVoices() || [];
  // إعادة بناء القائمة
  elVoiceSelect.innerHTML = '<option value="">(تلقائي)</option>';
  const sorted = voices.slice().sort((a,b)=>{
    const ap = (a.lang||'').toLowerCase().startsWith(prefer) ? -1 : 1;
    const bp = (b.lang||'').toLowerCase().startsWith(prefer) ? -1 : 1;
    return ap - bp || a.name.localeCompare(b.name);
  });
  for (const v of sorted){
    const opt = document.createElement('option');
    opt.value = v.name; opt.textContent = `${v.name} (${v.lang||''})`;
    elVoiceSelect.appendChild(opt);
  }
} — ${v.lang || ''}`;
    elVoiceSelect.appendChild(opt);
  });

  // استرجاع اختيار سابق
  const saved = localStorage.getItem('durra_voice_name') || '';
  if (saved) elVoiceSelect.value = saved;

  // تحديد chosenVoice
  pickVoice();
}

function pickVoice() {
  const wanted = elVoiceSelect.value || '';
  if (wanted) {
    chosenVoice = voiceList.find(v => v.name === wanted) || null;
  } else {
    // تلقائي: حاولي اختيار بنت عربية
    const ar = voiceList.filter(v => v.lang && v.lang.toLowerCase().startsWith('ar'));
    chosenVoice =
      ar.find(v => /(hanan|hoda|salma|noura|female)/i.test(v.name)) ||
      ar[0] || null;
  }
}

if (window.speechSynthesis){
  speechSynthesis.onvoiceschanged = fillVoices;
  fillVoices();
}

elVoiceSelect?.addEventListener('change', ()=>{
  localStorage.setItem('durra_voice_name', elVoiceSelect.value || '');
  pickVoice();
});

// تنظيف النص قبل القراءة (لا يقرأ علامات)
function cleanForSpeech(t){
  return t.replace(/[\"\'\*\-\_\[\]\{\}\~\^\:\;\@\#\$\&\!\?\|\\\/\<\>\,\.]+/g,' ')
          .replace(/\s{2,}/g,' ').trim();
}

function speakArabic(text){
  if(!elVoiceA?.checked || !window.speechSynthesis) return;
  const msg = new SpeechSynthesisUtterance(cleanForSpeech(text));
  if(chosenVoice) msg.voice = chosenVoice;
  msg.lang = (chosenVoice?.lang) || 'ar-SA';
  msg.pitch = 1.25; msg.rate = 1.05; msg.volume = 1;
  speechSynthesis.cancel();
  speechSynthesis.speak(msg);
}

/* إرسال للخادم */
async function askGPT(text){
  const safe = toArabicIndicDigits(text);
  addMessage(safe,'user'); elInput.value=''; cheer();

  const thinking = document.createElement('div');
  thinking.className='message assistant'; thinking.textContent='… جاري التفكير';
  elMessages.appendChild(thinking); elMessages.scrollTop=elMessages.scrollHeight;

  try{
    const resp = await fetch('/api/chat',{
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ message: safe, history })
    });
    const data = await resp.json(); thinking.remove();

    if (data && data.reply){
      addMessage(data.reply,'assistant'); speakArabic(data.reply);
      history.push({ user: safe, assistant: data.reply });
    } else addMessage('عذرًا، لم أتلقَّ إجابة.','assistant');
  }catch(e){
    thinking.remove(); addMessage('حدث خطأ في الاتصال بالخادم.','assistant');
  }
}

/* نموذج الإرسال */
elForm.addEventListener('submit',(e)=>{
  e.preventDefault();
  const text = elInput.value.trim(); if(!text) return;
  askGPT(text);
});

/* التعرف الصوتي للسؤال (اختياري) */
function startRecognition(){
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    alert('التعرّف الصوتي غير مدعوم في هذا المتصفح.'); return;
  }
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SR(); recognition.lang = (elLangSelect && elLangSelect.value === 'en') ? 'en-US' : 'ar-SA'; recognition.interimResults=false; recognition.maxAlternatives=1;
  recognition.onresult = (ev)=>{
    const text = ev.results[0][0].transcript; elInput.value=text;
    if (elVoiceQ?.checked) askGPT(text);
  };
  recognition.onerror = ()=> addMessage('حدث خطأ في التعرف الصوتي.','assistant');
  recognition.onend = ()=>{ elBtnMic.disabled=false; elBtnStop.disabled=true; };
  recognition.start(); elBtnMic.disabled=true; elBtnStop.disabled=false;
}
function stopRecognition(){
  try{ recognition && recognition.stop(); }catch(e){}
  try{ recognition && recognition.abort && recognition.abort(); }catch(e){}
  if (window.speechSynthesis && (speechSynthesis.speaking || speechSynthesis.paused)){
    try{ speechSynthesis.cancel(); }catch(e){}
  }
  if (window.mediaRecorder && mediaRecorder.state && mediaRecorder.state !== 'inactive'){
    try{ mediaRecorder.stop(); }catch(e){}
  }
  try{ elBtnMic && (elBtnMic.disabled=false); }catch(e){}
  try{ elBtnStop && (elBtnStop.disabled=true); }catch(e){}
}catch(e){} elBtnMic.disabled=false; elBtnStop.disabled=true; }

elBtnMic.addEventListener('click', startRecognition);
elBtnStop.addEventListener('click', stopRecognition);

