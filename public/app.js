// واجهة ذرى - معلمة الرياضيات الذكية
const form = document.querySelector("form");
const input = document.querySelector("input");
const resultBox = document.querySelector(".result");

const API_URL = "https://durra-server.onrender.com/ask"; // <-- تأكدي أنه هذا نفس رابط السيرفر

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const question = input.value.trim();
  if (!question) return;

  resultBox.innerHTML = "⏳ جاري التفكير...";

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
    });

    const data = await response.json();

    if (data.answer) {
      resultBox.innerHTML = `<b>الإجابة:</b> ${data.answer}`;
    } else if (data.error) {
      resultBox.innerHTML = `<span style="color:red">⚠️ ${data.error}</span>`;
    } else {
      resultBox.innerHTML = "❔ لم تصل إجابة من الخادم.";
    }
  } catch (err) {
    console.error(err);
    resultBox.innerHTML = "🚨 خطأ في الاتصال بالسيرفر.";
  }
});
