const API_BASE = "https://durra-server.onrender.com";


/* واجهة دُرى */
const elMessages   = document.getElementById('messages');
const elForm       = document.getElementById('form');
const elInput      = document.getElementById('textInput');
const elBtnMic     = document.getElementById('btnMic');
const elBtnStop    = document.getElementById('btnStop');
const elVoiceQ     = document.getElementById('voiceQuestion');
const elVoiceA     = document.getElementById('voiceAnswer');
const elVoiceSelect= document.getElementById('voiceSelect');

let recognition = null;
let history = [];

/* تحويل الأرقام إلى عربية-هندية */
function toArabicIndicDigits(str=''){ return (str+'').replace(/[0-9]/g, d=>'٠١٢٣٤٥٦٧٨٩'[+d]); }

/* إضافة رسالة للمحادثة */
function addMessage(text, who='assistant'){
  if (!elMessages) return;
  const wrap = document.createElement('div');
  wrap.className = `message ${who}`;
  wrap.textContent = text;
  elMessages.appendChild(wrap);
  elMessages.scrollTop = elMessages.scrollHeight;
}

/* تشجيع بسيط */
function cheer(){
  try {
    if (!window.localStorage) return;
    const count = +localStorage.getItem('durra_uses') || 0;
    const next = count + 1;
    localStorage.setItem('durra_uses', String(next));
    if (next === 1) addMessage('شكرًا لاستخدامك دُرى لأول مرة 🤍','assistant');
    else if (next === 5) addMessage('ممتاز، استمري في التدريب على الرياضيات 👏','assistant');
  } catch(e){}
}

/* ——— TTS: اختيار الصوت ——— */
let voiceList = [];
let chosenVoice = null;

function fillVoices() {
  if (!window.speechSynthesis) return;
  voiceList = speechSynthesis.getVoices();
  // أعيدي تعبئة القائمة
  elVoiceSelect.innerHTML = '<option value="">(تلقائي)</option>';
  // أصوات عربية أولاً
  const ar = voiceList.filter(v => v.lang && v.lang.toLowerCase().startsWith('ar'));
  const nonAr = voiceList.filter(v => !(v.lang && v.lang.toLowerCase().startsWith('ar')));
  const ordered = [...ar, ...nonAr];

  ordered.forEach((v, i) => {
    const opt = document.createElement('option');
    opt.value = v.name;
    opt.textContent = `${v.name} — ${v.lang || ''}`;
    elVoiceSelect.appendChild(opt);
  });

  // استرجاع اختيار سابق
  const saved = localStorage.getItem('durra_voice_name') || '';
  if (saved) elVoiceSelect.value = saved;

  // تحديد chosenVoice
  pickVoice();
}

function pickVoice() {
  if (!window.speechSynthesis) return;
  const name = elVoiceSelect.value;
  chosenVoice = null;
  if (name) {
    chosenVoice = voiceList.find(v => v.name === name) || null;
  }
  try {
    localStorage.setItem('durra_voice_name', name || '');
  } catch(e){}
}

/* نداء لملء الأصوات */
if (window.speechSynthesis) {
  fillVoices();
  window.speechSynthesis.onvoiceschanged = fillVoices;
}

/* قراءة نص عربي */
function speakArabic(text){
  try {
    if (!elVoiceA || !elVoiceA.checked) return;
    if (!window.speechSynthesis) return;
    const msg = new SpeechSynthesisUtterance(text);
    if (chosenVoice) msg.voice = chosenVoice;
    msg.lang = (chosenVoice && chosenVoice.lang) || 'ar-SA';
    msg.rate = 1.0; msg.pitch = 1.0;
    speechSynthesis.cancel();
    speechSynthesis.speak(msg);
  } catch(e){}
}

/* الاستماع للسؤال صوتيًا */
function startRecognition(){
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    alert('التعرّف على الصوت غير مدعوم في هذا المتصفح.');
    return;
  }
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SR();
  recognition.lang = 'ar-SA';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onstart = () => {
    if (elInput) elInput.placeholder = 'أتحدث الآن…';
    if (elBtnMic) elBtnMic.disabled = true;
    if (elBtnStop) elBtnStop.disabled = false;
  };
  recognition.onerror = (e) => {
    console.error('Speech error', e);
    if (elInput) elInput.placeholder = 'حاولي مرة أخرى…';
  };
  recognition.onend = () => {
    if (elBtnMic) elBtnMic.disabled = false;
    if (elBtnStop) elBtnStop.disabled = true;
    if (elInput) elInput.placeholder = 'اكتبي سؤالك الرياضي هنا…';
  };
  recognition.onresult = (e) => {
    const text = (e.results[0] && e.results[0][0] && e.results[0][0].transcript) || '';
    if (elInput) {
      elInput.value = text;
      elInput.focus();
    }
    if (elVoiceQ && elVoiceQ.checked) {
      // إذا مفعّل "السؤال صوتي" نرسل مباشرة
      askGPT(text);
    }
  };

  recognition.start();
}

function stopRecognition(){
  try{
    if (recognition) recognition.stop();
  }catch(e){}
}

/* زر المايك */
if (elBtnMic) {
  elBtnMic.addEventListener('click', (e)=>{
    e.preventDefault();
    startRecognition();
  });
}

/* زر الإيقاف */
if (elBtnStop) {
  elBtnStop.addEventListener('click', (e)=>{
    e.preventDefault();
    stopRecognition();
  });
}

/* تغيّر اختيار الصوت */
if (elVoiceSelect) {
  elVoiceSelect.addEventListener('change', pickVoice);
}

/* إرسال للخادم */
async function askGPT(text){
  const safe = toArabicIndicDigits(text);
  addMessage(safe,'user'); elInput.value=''; cheer();

  const thinking = document.createElement('div');
  thinking.className='message assistant'; thinking.textContent='… جاري التفكير';
  elMessages.appendChild(thinking); elMessages.scrollTop=elMessages.scrollHeight;

  try{
    const resp = await fetch(API_BASE + '/api/chat',{
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ message: safe, history })
    });
    const data = await resp.json().catch(()=>({}));
    thinking.remove();

    if (data && data.reply){
      addMessage(data.reply,'assistant'); speakArabic(data.reply);
      history.push({ user: safe, assistant: data.reply });
    } else addMessage('عذرًا، لم أتلقَّ إجابة.','assistant');
  }catch(e){
    thinking.remove(); addMessage('حدث خطأ في الاتصال بالخادم.','assistant');
  }
}

/* نموذج الإرسال */
if (elForm) {
  elForm.addEventListener('submit',(e)=>{
    e.preventDefault();
    if (!elInput) return;
    const text = elInput.value.trim();
    if (!text) return;
    askGPT(text);
  });
}

/* تفعيل إيقاف الصوت عند تغيير التبويب أو إغلاق الصفحة */
window.addEventListener('beforeunload', () => {
  try { if (window.speechSynthesis) { window.speechSynthesis.cancel(); } } catch(e){}
  try {
    if (recognition) {
      const oldOnEnd = recognition.onend;
      recognition.onend = null;
      recognition.stop();
      setTimeout(()=>{ if (recognition) recognition.onend = oldOnEnd; }, 0);
    }
  } catch(e){}
});

/* إيقاف أي صوت عند الضغط على ESC */
window.addEventListener('keydown', (e)=>{
  if (e.key === 'Escape') {
    try { if (window.speechSynthesis) { window.speechSynthesis.cancel(); } } catch(e){}
    try {
      if (recognition) {
        const oldOnEnd = recognition.onend;
        recognition.onend = null;
        recognition.stop();
        setTimeout(()=>{ if (recognition) recognition.onend = oldOnEnd; }, 0);
      }
    } catch(e){}
  }
});

/* وظيفة مساعدة لإيقاف كل الأصوات عند الحاجة */
function stopAllAudioAndTTS() {
  // Cancel browser TTS (if used)
  try { if (window.speechSynthesis) { window.speechSynthesis.cancel(); } } catch(e){ /* noop */ }

  // Stop any ongoing speech recognition safely
  try {
    if (typeof recognition !== 'undefined' && recognition) {
      const oldOnEnd = recognition.onend;
      recognition.onend = null;
      recognition.stop();
      // restore handler asynchronously (in case startRecognition is called again later)
      setTimeout(()=>{ if (recognition) recognition.onend = oldOnEnd; }, 0);
    }
  } catch(e){ /* noop */ }

  // Cancel any ongoing speech synthesis (TTS), if used
  try { if (window.speechSynthesis) { window.speechSynthesis.cancel(); } } catch(e){ /* noop */ }

  // Stop and reset any <audio> elements that might be speaking the answer
  try {
    document.querySelectorAll('audio').forEach(a => {
      try { a.pause(); a.currentTime = 0; } catch(_) {}
    });
  } catch(e){ /* noop */ }

  // Re-enable mic button, disable stop button
  try {
    if (typeof elBtnMic !== 'undefined' && elBtnMic) elBtnMic.disabled = false;
    if (typeof elBtnStop !== 'undefined' && elBtnStop) elBtnStop.disabled = true;
  } catch(e){ /* noop */ }
}
