/* واجهة دُرى */
const elMessages   = document.getElementById('messages');
const elForm       = document.getElementById('form');
const elInput      = document.getElementById('textInput');
const elBtnMic     = document.getElementById('btnMic');
const elBtnStop    = document.getElementById('btnStop');
const elVoiceQ     = document.getElementById('voiceQuestion');
const elVoiceA     = document.getElementById('voiceAnswer');
const elVoiceSelect= document.getElementById('voiceSelect');

const API_URL = 'https://durra-server.onrender.com/ask';

let recognition = null;
let history = [];

function toArabicIndicDigits(str=''){
  return (str + '').replace(/[0-9]/g, d => '٠١٢٣٤٥٦٧٨٩'[+d]);
}

function addMessage(text, who='assistant'){
  const div = document.createElement('div');
  div.className = 'message ' + (who === 'user' ? 'user' : 'assistant');
  div.innerHTML = text;
  elMessages.appendChild(div);
  elMessages.scrollTop = elMessages.scrollHeight;
  if (window.MathJax) MathJax.typesetPromise();
}

function cheer(){
  try{
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'triangle'; o.frequency.value = 880;
    g.gain.setValueAtTime(0.001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
    o.connect(g).connect(ctx.destination); o.start(); o.stop(ctx.currentTime + 0.6);
  }catch(e){}
}

let voiceList = [];
let chosenVoice = null;

function fillVoices(){
  if (!window.speechSynthesis || !elVoiceSelect) return;
  voiceList = speechSynthesis.getVoices();
  elVoiceSelect.innerHTML = '<option value="">(تلقائي)</option>';

  const ar = voiceList.filter(v => v.lang && v.lang.toLowerCase().startsWith('ar'));
  const nonAr = voiceList.filter(v => !(v.lang && v.lang.toLowerCase().startsWith('ar')));
  [...ar, ...nonAr].forEach(v => {
    const opt = document.createElement('option');
    opt.value = v.name;
    opt.textContent = `${v.name} — ${v.lang || ''}`;
    elVoiceSelect.appendChild(opt);
  });

  const saved = localStorage.getItem('durra_voice_name') || '';
  if (saved) elVoiceSelect.value = saved;
  pickVoice();
}

function pickVoice(){
  const wanted = elVoiceSelect?.value || '';
  if (wanted) {
    chosenVoice = voiceList.find(v => v.name === wanted) || null;
  } else {
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

elVoiceSelect?.addEventListener('change', () => {
  localStorage.setItem('durra_voice_name', elVoiceSelect.value || '');
  pickVoice();
});

function cleanForSpeech(t){
  return (t || '')
    .replace(/[\"\'\*\-\_\[\]\{\}\~\^\:\;\@\#\$\&\!\?\|\\\/\<\>\,\.]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function speakArabic(text){
  if (!elVoiceA?.checked || !window.speechSynthesis) return;
  const msg = new SpeechSynthesisUtterance(cleanForSpeech(text));
  if (chosenVoice) msg.voice = chosenVoice;
  msg.lang = chosenVoice?.lang || 'ar-SA';
  msg.pitch = 1.25; msg.rate = 1.05; msg.volume = 1;
  speechSynthesis.cancel();
  speechSynthesis.speak(msg);
}

async function askGPT(text){
  const safe = toArabicIndicDigits(text);
  addMessage(safe, 'user');
  elInput.value = '';
  cheer();

  const thinking = document.createElement('div');
  thinking.className = 'message assistant';
  thinking.textContent = '… جاري التفكير';
  elMessages.appendChild(thinking);
  elMessages.scrollTop = elMessages.scrollHeight;

  try{
    const resp = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: safe })
    });

    const data = await resp.json().catch(() => ({}));
    thinking.remove();

    if (resp.ok && data && data.answer){
      addMessage(data.answer, 'assistant');
      speakArabic(data.answer);
      history.push({ user: safe, assistant: data.answer });
    } else {
      addMessage(data.error || 'عذرًا، لم أتلقَّ إجابة.', 'assistant');
    }
  }catch(e){
    thinking.remove();
    addMessage('حدث خطأ في الاتصال بالخادم.', 'assistant');
  }
}

elForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = elInput.value.trim();
  if (!text) return;
  askGPT(text);
});

function startRecognition(){
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    alert('التعرّف الصوتي غير مدعوم في هذا المتصفح.');
    return;
  }

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SR();
  recognition.lang = 'ar-SA';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onresult = (ev) => {
    const text = ev.results[0][0].transcript;
    elInput.value = text;
    if (elVoiceQ?.checked) askGPT(text);
  };

  recognition.onerror = () => addMessage('حدث خطأ في التعرف الصوتي.', 'assistant');
  recognition.onend = () => {
    elBtnMic.disabled = false;
    elBtnStop.disabled = true;
  };

  recognition.start();
  elBtnMic.disabled = true;
  elBtnStop.disabled = false;
}

function stopRecognition(){
  try{ recognition && recognition.stop(); }catch(e){}
  elBtnMic.disabled = false;
  elBtnStop.disabled = true;
}

elBtnMic.addEventListener('click', startRecognition);
elBtnStop.addEventListener('click', stopRecognition);
