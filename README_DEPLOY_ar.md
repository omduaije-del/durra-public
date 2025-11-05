# دُرّى — معلمة الرياضيات الذكية (جاهز للتشغيل على أي جهاز)
## تشغيل محليًا
1) أنشئ `.env`:
```
OPENAI_API_KEY=ضع_المفتاح_هنا
OPENAI_CHAT_MODEL=gpt-4o-mini
```
2) ثم:
```
npm install
npm start
```
افتح: `http://localhost:3000`

## Docker
```
docker build -t durra-math .
docker run -p 3000:3000 --env OPENAI_API_KEY=sk-... --env OPENAI_CHAT_MODEL=gpt-4o-mini durra-math
```

## Render (نشر على الويب بسهولة)
- Build: `npm install`
- Start: `node server.js`
- Environment: `OPENAI_API_KEY` و `OPENAI_CHAT_MODEL`
