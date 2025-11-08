const API_BASE = "https://durra-server.onrender.com";

// عناصر الواجهة
const elForm = document.getElementById("form");
const elInput = document.getElementById("textInput");
const elMessages = document.getElementById("messages");

let history = [];

// دالة لإضافة رسالة في صندوق المحادثة
function addMessage(text, who) {
  if (!elMessages) return;
  const div = document.createElement("div");
  div.className = "message " + (who === "user" ? "user" : "assistant");
  div.textContent = text;
  elMessages.appendChild(div);
  elMessages.scrollTop = elMessages.scrollHeight;
}

// دالة إرسال السؤال إلى السيرفر
async function ask(message) {
  const text = (message || "").trim();
  if (!text) return;

  // عرض رسالة المستخدم
  addMessage(text, "user");
  if (elInput) elInput.value = "";

  // رسالة "جاري التفكير"
  const thinking = document.createElement("div");
  thinking.className = "message assistant";
  thinking.textContent = "… جاري التفكير";
  elMessages.appendChild(thinking);
  elMessages.scrollTop = elMessages.scrollHeight;

  try {
    const resp = await fetch(API_BASE + "/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text, history }),
    });

    const data = await resp.json().catch(() => ({}));
    thinking.remove();

    if (data && data.reply) {
      addMessage(data.reply, "assistant");
      history.push({ user: text, assistant: data.reply });
    } else if (data && data.error) {
      addMessage("خطأ من الخادم: " + (data.error || ""), "assistant");
    } else {
      addMessage("عذرًا، لم أتلقَّ إجابة.", "assistant");
    }
  } catch (err) {
    console.error(err);
    thinking.remove();
    addMessage("حدث خطأ في الاتصال بالخادم.", "assistant");
  }
}

// ربط زر الإرسال (النموذج) بالدالة
if (elForm && elInput) {
  elForm.addEventListener("submit", function (e) {
    e.preventDefault();
    ask(elInput.value);
  });
}
const API_BASE = "https://durra-server.onrender.com";

// عناصر الواجهة
const elForm = document.getElementById("form");
const elInput = document.getElementById("textInput");
const elMessages = document.getElementById("messages");

let history = [];

// دالة لإضافة رسالة في صندوق المحادثة
function addMessage(text, who) {
  if (!elMessages) return;
  const div = document.createElement("div");
  div.className = "message " + (who === "user" ? "user" : "assistant");
  div.textContent = text;
  elMessages.appendChild(div);
  elMessages.scrollTop = elMessages.scrollHeight;
}

// دالة إرسال السؤال إلى السيرفر
async function ask(message) {
  const text = (message || "").trim();
  if (!text) return;

  // عرض رسالة المستخدم
  addMessage(text, "user");
  if (elInput) elInput.value = "";

  // رسالة "جاري التفكير"
  const thinking = document.createElement("div");
  thinking.className = "message assistant";
  thinking.textContent = "… جاري التفكير";
  elMessages.appendChild(thinking);
  elMessages.scrollTop = elMessages.scrollHeight;

  try {
    const resp = await fetch(API_BASE + "/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text, history }),
    });

    const data = await resp.json().catch(() => ({}));
    thinking.remove();

    if (data && data.reply) {
      addMessage(data.reply, "assistant");
      history.push({ user: text, assistant: data.reply });
    } else if (data && data.error) {
      addMessage("خطأ من الخادم: " + (data.error || ""), "assistant");
    } else {
      addMessage("عذرًا، لم أتلقَّ إجابة.", "assistant");
    }
  } catch (err) {
    console.error(err);
    thinking.remove();
    addMessage("حدث خطأ في الاتصال بالخادم.", "assistant");
  }
}

// ربط زر الإرسال (النموذج) بالدالة
if (elForm && elInput) {
  elForm.addEventListener("submit", function (e) {
    e.preventDefault();
    ask(elInput.value);
  });
}
const API_BASE = "https://durra-server.onrender.com";

// عناصر الواجهة
const elForm = document.getElementById("form");
const elInput = document.getElementById("textInput");
const elMessages = document.getElementById("messages");

let history = [];

// دالة لإضافة رسالة في صندوق المحادثة
function addMessage(text, who) {
  if (!elMessages) return;
  const div = document.createElement("div");
  div.className = "message " + (who === "user" ? "user" : "assistant");
  div.textContent = text;
  elMessages.appendChild(div);
  elMessages.scrollTop = elMessages.scrollHeight;
}

// دالة إرسال السؤال إلى السيرفر
async function ask(message) {
  const text = (message || "").trim();
  if (!text) return;

  // عرض رسالة المستخدم
  addMessage(text, "user");
  if (elInput) elInput.value = "";

  // رسالة "جاري التفكير"
  const thinking = document.createElement("div");
  thinking.className = "message assistant";
  thinking.textContent = "… جاري التفكير";
  elMessages.appendChild(thinking);
  elMessages.scrollTop = elMessages.scrollHeight;

  try {
    const resp = await fetch(API_BASE + "/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text, history }),
    });

    const data = await resp.json().catch(() => ({}));
    thinking.remove();

    if (data && data.reply) {
      addMessage(data.reply, "assistant");
      history.push({ user: text, assistant: data.reply });
    } else if (data && data.error) {
      addMessage("خطأ من الخادم: " + (data.error || ""), "assistant");
    } else {
      addMessage("عذرًا، لم أتلقَّ إجابة.", "assistant");
    }
  } catch (err) {
    console.error(err);
    thinking.remove();
    addMessage("حدث خطأ في الاتصال بالخادم.", "assistant");
  }
}

// ربط زر الإرسال (النموذج) بالدالة
if (elForm && elInput) {
  elForm.addEventListener("submit", function (e) {
    e.preventDefault();
    ask(elInput.value);
  });
}
const API_BASE = "https://durra-server.onrender.com";

// عناصر الواجهة
const elForm = document.getElementById("form");
const elInput = document.getElementById("textInput");
const elMessages = document.getElementById("messages");

let history = [];

// دالة لإضافة رسالة في صندوق المحادثة
function addMessage(text, who) {
  if (!elMessages) return;
  const div = document.createElement("div");
  div.className = "message " + (who === "user" ? "user" : "assistant");
  div.textContent = text;
  elMessages.appendChild(div);
  elMessages.scrollTop = elMessages.scrollHeight;
}

// دالة إرسال السؤال إلى السيرفر
async function ask(message) {
  const text = (message || "").trim();
  if (!text) return;

  // عرض رسالة المستخدم
  addMessage(text, "user");
  if (elInput) elInput.value = "";

  // رسالة "جاري التفكير"
  const thinking = document.createElement("div");
  thinking.className = "message assistant";
  thinking.textContent = "… جاري التفكير";
  elMessages.appendChild(thinking);
  elMessages.scrollTop = elMessages.scrollHeight;

  try {
    const resp = await fetch(API_BASE + "/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text, history }),
    });

    const data = await resp.json().catch(() => ({}));
    thinking.remove();

    if (data && data.reply) {
      addMessage(data.reply, "assistant");
      history.push({ user: text, assistant: data.reply });
    } else if (data && data.error) {
      addMessage("خطأ من الخادم: " + (data.error || ""), "assistant");
    } else {
      addMessage("عذرًا، لم أتلقَّ إجابة.", "assistant");
    }
  } catch (err) {
    console.error(err);
    thinking.remove();
    addMessage("حدث خطأ في الاتصال بالخادم.", "assistant");
  }
}

// ربط زر الإرسال (النموذج) بالدالة
if (elForm && elInput) {
  elForm.addEventListener("submit", function (e) {
    e.preventDefault();
    ask(elInput.value);
  });
}
const API_BASE = "https://durra-server.onrender.com";

// عناصر الواجهة
const elForm = document.getElementById("form");
const elInput = document.getElementById("textInput");
const elMessages = document.getElementById("messages");

let history = [];

// دالة لإضافة رسالة في صندوق المحادثة
function addMessage(text, who) {
  if (!elMessages) return;
  const div = document.createElement("div");
  div.className = "message " + (who === "user" ? "user" : "assistant");
  div.textContent = text;
  elMessages.appendChild(div);
  elMessages.scrollTop = elMessages.scrollHeight;
}

// دالة إرسال السؤال إلى السيرفر
async function ask(message) {
  const text = (message || "").trim();
  if (!text) return;

  // عرض رسالة المستخدم
  addMessage(text, "user");
  if (elInput) elInput.value = "";

  // رسالة "جاري التفكير"
  const thinking = document.createElement("div");
  thinking.className = "message assistant";
  thinking.textContent = "… جاري التفكير";
  elMessages.appendChild(thinking);
  elMessages.scrollTop = elMessages.scrollHeight;

  try {
    const resp = await fetch(API_BASE + "/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text, history }),
    });

    const data = await resp.json().catch(() => ({}));
    thinking.remove();

    if (data && data.reply) {
      addMessage(data.reply, "assistant");
      history.push({ user: text, assistant: data.reply });
    } else if (data && data.error) {
      addMessage("خطأ من الخادم: " + (data.error || ""), "assistant");
    } else {
      addMessage("عذرًا، لم أتلقَّ إجابة.", "assistant");
    }
  } catch (err) {
    console.error(err);
    thinking.remove();
    addMessage("حدث خطأ في الاتصال بالخادم.", "assistant");
  }
}

// ربط زر الإرسال (النموذج) بالدالة
if (elForm && elInput) {
  elForm.addEventListener("submit", function (e) {
    e.preventDefault();
    ask(elInput.value);
  });
}
