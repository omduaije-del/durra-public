const API_BASE = 'https://durra-server.onrender.com';


/* واجهة دُرى */
const elMessages   = document.getElementById('messages');
const elForm       = document.getElementById('form');
const elInput      = document.getElementById('textInput');
const elBtnMic     = document.getElementById('btnMic');
const elBtnStop    = document.getElementById('btnStop');
const elVoiceQ     = document.getElementById('voiceQuestion');
const elVoiceA     = document.getElementById('voiceAnswer');
const elVoiceSelect= document.getElementById('voiceSelect');

/* إعدادات الصوت */
let currentVoice = null;

function toArabicIndicDigits(str){
  return str.replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[Number(d)]);
}

function addMessage(text, who='assistant'){
  const div = document.createElement('div');
  div.className = 'message ' + who;
  div.textContent = text;
  elMessages.appendChild(div);
  elMessages.scrollTop = elMessages.scrollHeight;
}

/* تشجيع بسيط */
function cheer(){
  // ممكن تضيفي أي حركة بسيطة هنا لو حبيتي
}

/* إعداد الأصوات المتاحة */
function fillVoices(){
  const voices = speechSynthesis.getVoices();
  elVoiceSelect.innerHTML = '';

  const arabicVoices = voices.filter(v=> v.lang && v.lang.startsWith('ar'));
  const list = arabicVoices.length ? arabicVoices : voices;

  list.forEach(v=>{
    const opt = document.createElement('option');
    opt.value = v.name;
    opt.textContent = `${v.name} (${v.lang})`;
    elVoiceSelect.appendChild(opt);
  });

  const saved = localStorage.getItem('durra_voice_name');
  if (saved){
    const opt = [...elVoiceSelect.options].find(o=>o.value === saved);
    if (opt) elVoiceSelect.value = saved;
  }

  pickVoice();
}

function pickVoice(){
  const voices = speechSynthesis.getVoices();
  const name = elVoiceSelect.value;
  currentVoice = voices.find(v=>v.name === name) || null;
}

/* نطق عربي بسيط */
function speakArabic(text){
  if (!elVoiceA.checked) return;
  if (!window.speechSynthesis) return;

  const msg = new SpeechSynthesisUtterance(text);
  msg.lang = 'ar-SA';
  if (currentVoice) msg.voice = currentVoice;
  msg.rate = 1;
  msg.pitch = 1;
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
    const resp = await fetch(API_BASE + '/ask',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ question: safe })
    });
    const data = await resp.json();
    thinking.remove();

    if (data && data.answer){
      addMessage(data.answer,'assistant'); speakArabic(data.answer);
      history.push({ user: safe, assistant: data.answer });
    } else if (data && data.error){
      addMessage('⚠ ' + data.error,'assistant');
    } else addMessage('عذرًا، لم أتلقَّ إجابة.','assistant');
  }catch(e){
    thinking.remove();
    addMessage('حدث خطأ في الاتصال بالخادم.','assistant');
  }
}

/* نموذج الإرسال */
elForm.addEventListener('submit',(e)=>{
  e.preventDefault();
  const text = elInput.value.trim();
  if(!text) return;
  askGPT(text);
});

/* إعداد المايك */
let recognition = null;
let isRecording = false;

if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window){
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SR();
  recognition.lang = 'ar-SA';
  recognition.interimResults = false;

  recognition.onresult = (event)=>{
    const t = event.results[0][0].transcript || '';
    if (elVoiceQ.checked){
      elInput.value = t;
      askGPT(t);
    }else{
      elInput.value = t;
    }
  };

  recognition.onend = ()=>{
    isRecording = false;
    if (elBtnMic) elBtnMic.disabled = false;
    if (elBtnStop) elBtnStop.disabled = true;
  };
}

if (elBtnMic){
  elBtnMic.addEventListener('click',()=>{
    if (!recognition || isRecording) return;
    isRecording = true;
    elBtnMic.disabled = true;
    if (elBtnStop) elBtnStop.disabled = false;
    recognition.start();
  });
}

if (elBtnStop){
  elBtnStop.addEventListener('click',()=>{
    if (!recognition) return;
    recognition.stop();
  });
}

/* تغيير الصوت المختار */
if (window.speechSynthesis){
  speechSynthesis.onvoiceschanged = fillVoices;
  fillVoices();
}

elVoiceSelect?.addEventListener('change', ()=>{
  localStorage.setItem('durra_voice_name', elVoiceSelect.value || '');
  pickVoice();
});

/* قائمة محادثة بسيطة */
const history = [];

/* نهاية الملف */
