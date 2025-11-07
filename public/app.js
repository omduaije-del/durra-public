// ===== إعداد عنوان السيرفر على Render =====
const API_URL = "https://durra-server.onrender.com";

// ===== دالة عامة للطلب =====
async function askDurra(question, opts = {}) {
  const payload = { question, ...opts };
  const res = await fetch(`${API_URL}/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API error ${res.status}: ${text || res.statusText}`);
  }
  return res.json();
}

// ===== ربط سريع مع عناصر الصفحة لو كانت موجودة =====
// يحاول تلقائيًا إيجاد فورم + خانة نص + مكان لعرض الإجابة
(function wireUI() {
  // محاولة إيجاد العناصر بأكثر من اسم شائع
  const form =
    document.querySelector("#askForm") ||
    document.querySelector("form");

  const input =
    document.querySelector("#question") ||
    document.querySelector('textarea[name="question"]') ||
    document.querySelector('input[name="question"]') ||
    document.querySelector("textarea") ||
    document.querySelector('input[type="text"]');

  let answerBox =
    document.querySelector("#answer") ||
    document.querySelector(".answer");

  // لو ما فيه صندوق لعرض الإجابة، نضيف واحد تحت الفورم
  if (!answerBox && form) {
    answerBox = document.createElement("div");
    answerBox.id = "answer";
    answerBox.style.marginTop = "12px";
    form.parentNode.insertBefore(answerBox, form.nextSibling);
  }

  if (!form || !input) return; // لا نكسر الصفحة لو أسماء العناصر مختلفة بالكامل

  if (!form.dataset.bound) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const q = (input.value || "").trim();
      if (!q) return;

      if (answerBox) {
        answerBox.textContent = "⏳ جاري المعالجة…";
      }

      try {
        const data = await askDurra(q);
        // توقّع جواب نصّي داخل data.answer أو data.result
        const reply =
          (data && (data.answer || data.result || data.message)) ||
          JSON.stringify(data);

        if (answerBox) {
          answerBox.textContent = reply;
        }
      } catch (err) {
        if (answerBox) {
          answerBox.textContent =
            "حدث خطأ أثناء الاتصال بالخادم. جرّبي لاحقًا.\n" + err.message;
        }
      }
    });
    form.dataset.bound = "1";
  }
})();
