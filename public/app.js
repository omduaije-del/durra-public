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
  const wanted = elVoiceSelect.value || '';
  if (wanted) {
    chosenVoice = voiceList.find(v => v.name === wanted) || null;
  } else {
    // حاول اختيار صوت عربي افتراضي
    chosenVoice = voiceList.find(v =>
      v.lang &&
      v.lang.toLowerCase().startsWith('ar') &&
      v.name.toLowerCase().includes('ziraa')
    ) || voiceList.find(v => v.lang && v.lang.toLowerCase().startsWith('ar')) || null;
  }
}

if (window.speechSynthesis) {
  window.speechSynthesis.onvoiceschanged = fillVoices;
  fillVoices();
}

elVoiceSelect.addEventListener('change', () => {
  const selected = elVoiceSelect.value;
  localStorage.setItem('durra_voice_name', selected || '');
  pickVoice();
});

/* ——— TTS: نطق الجواب ——— */
function speakArabic(text){
  if (!window.speechSynthesis) return;
  const utter = new SpeechSynthesisUtterance(text);
  if (chosenVoice) utter.voice = chosenVoice;
  utter.lang = (chosenVoice && chosenVoice.lang) || 'ar-SA';
  utter.rate = 1;
  utter.pitch = 1;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utter);
}

/* ——— STT: الاستماع للسؤال ——— */
function initRecognition(){
  if (recognition) return;
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    alert('العفو، المتصفح لا يدعم التعرف على الصوت.');
    return;
  }
  recognition = new SR();
  recognition.lang = 'ar-SA';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onresult = (e)=>{
    const txt = e.results[0][0].transcript.trim();
    elVoiceQ.textContent = txt || '—';
    elInput.value = txt;
  };
  recognition.onerror = (e)=>{
    console.error('STT error', e.error);
  };
  recognition.onend = ()=>{
    elBtnMic.disabled = false;
    elBtnStop.disabled = true;
  };
}

elBtnMic?.addEventListener('click', ()=>{
  initRecognition();
  if (!recognition) return;
  elBtnMic.disabled = true;
  elBtnStop.disabled = false;
  elVoiceQ.textContent = '...استمع إليك';
  recognition.start();
});

elBtnStop?.addEventListener('click', ()=>{
  if (recognition) recognition.stop();
});

/* ——— إرسال سؤال ——— */
async function askQuestion(message){
  const safe = toArabicIndicDigits((message || elInput.value || '').trim());
  if (!safe) return;

  // عرض سؤال المستخدم في المحادثة
  addMessage(safe, 'user');
  elInput.value = '';
  elVoiceA.textContent = '';

  // رسالة "جاري التفكير"
  const thinking = document.createElement('div');
  thinking.className='message assistant'; thinking.textContent='… جاري التفكير';
  elMessages.appendChild(thinking); elMessages.scrollTop=elMessages.scrollHeight;

  try{
    const resp = await fetch('https://durra-server.onrender.com/api/chat',{
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ message: safe, history })
    });
    const data = await resp.json(); thinking.remove();

    if (data && data.reply){
      addMessage(data.reply,'assistant'); 
      elVoiceA.textContent = data.reply;
      speakArabic(data.reply);
      history.push({ user: safe, assistant: data.reply });
      cheer();
    } else addMessage('عذرًا، لم أتلقَّ إجابة.','assistant')
  }catch(err){
    console.error(err);
    thinking.remove();
    addMessage('حدث خطأ في الاتصال بالخادم.','assistant');
  }
}

/* ——— ربط الفورم والإنتر ——— */
elForm?.addEventListener('submit', (e)=>{
  e.preventDefault();
  askQuestion();
});

elInput?.addEventListener('keydown',(e)=>{
  if(e.key === 'Enter' && !e.shiftKey){
    e.preventDefault();
    askQuestion();
  }
});

/* إيقاف كل الأصوات عند الحاجة */
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
