// Vercel serverless endpoint registered as the Open Builder skill URL: https://<project>.vercel.app/api/skill
import { readFileSync } from "node:fs";
import { handleSkill, kakaoResponse } from "../lib/bot.js";

const store = JSON.parse(readFileSync(new URL("../store.json", import.meta.url), "utf8"));

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(200).json({ ok: true, bot: store.name });
    return;
  }
  // Optional shared secret: set SKILL_TOKEN and add the same value as a header in Open Builder.
  const token = process.env.SKILL_TOKEN;
  if (token && req.headers["x-skill-token"] !== token) {
    res.status(401).json(kakaoResponse("인증되지 않은 요청입니다."));
    return;
  }
  try {
    const result = await handleSkill(req.body || {}, store, {
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL,
    });
    res.status(200).json(result);
  } catch {
    res.status(200).json(kakaoResponse(`잠시 문제가 생겼어요. ☎ ${store.phone} 으로 문의해 주세요.`));
  }
}
