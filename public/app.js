/* واجهة دُرى المبسّطة (نص فقط مؤقتًا) */

const API_BASE = "https://durra-server.onrender.com";

// عناصر الصفحة من الواجهة الأصلية
const elForm     = document.getElementById("form");
const elInput    = document.getElementById("textInput");
const elMessages = document.getElementById("messages");

// إضافة رسالة في صندوق المحادثة
function addMessage(text, who = "assistant") {
  if (!elMessages) return;
  const div = document.createElement("div");
  div.className = "message " + (who === "user" ? "user" : "assistant");
  div.textContent = text;
  elMessages.appendChild(div);
  elMessages.scrollTop = elMessages.scrollHeight;
}

// إرسال السؤال للسيرفر
async function ask(question) {
  const q = (question || "").trim();
  if (!q) return;

  // عرض سؤال المستخدم
  addMessage(q, "user");
  if (elInput) elInput.value = "";

  // رسالة "جاري التفكير"
  const thinking = document.createElement("div");
  thinking.className = "message assistant";
  thinking.textContent = "… جاري التفكير";
  elMessages.appendChild(thinking);
  elMessages.scrollTop = elMessages.scrollHeight;

  try {
    const res = await fetch(API_BASE + "/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: q }),
    });

    const data = await res.json().catch(() => ({}));
    thinking.remove();

    if (!res.ok) {
      const msg = (data && data.error) ? data.error : ("خطأ من الخادم (" + res.status + ")");
      addMessage("⚠ " + msg, "assistant");
      return;
    }

    if (data && data.answer) {
      addMessage(data.answer, "assistant");
    } else {
      addMessage("ما وصلت إجابة من الخادم.", "assistant");
    }
  } catch (err) {
    console.error("ASK_ERROR:", err);
    thinking.remove();
    addMessage("صار خطأ في الاتصال. جرّبي مرة ثانية.", "assistant");
  }
}

// ربط الفورم وحرف الإدخال إنتر
if (elForm && elInput) {
  elForm.addEventListener("submit", function (e) {
    e.preventDefault();
    ask(elInput.value);
  });

  elInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      ask(elInput.value);
    }
  });
}
