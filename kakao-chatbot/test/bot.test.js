import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { detectIntent, handleSkill, kakaoResponse, aiAnswer } from "../lib/bot.js";
import handler from "../api/skill.js";

const store = JSON.parse(readFileSync(new URL("../store.json", import.meta.url), "utf8"));
const ask = (utterance, opts) => handleSkill({ userRequest: { utterance } }, store, opts);
const text = r => r.template.outputs[0].simpleText.text;

test("quick reply buttons map to fixed answers", async () => {
  assert.match(text(await ask("영업시간")), /10:00~22:00/);
  assert.match(text(await ask("메뉴")), /아메리카노 4,500원/);
  assert.match(text(await ask("위치·주차")), /공영주차장/);
  assert.match(text(await ask("예약 문의")), /02-000-0000/);
});

test("natural questions find the right intent", () => {
  assert.equal(detectIntent("몇 시에 문 닫아요?", store).id, "hours");
  assert.equal(detectIntent("주차 몇 시간 무료예요?", store).id, "location");
  assert.equal(detectIntent("아이스 아메리카노 얼마예요", store).id, "menu");
  assert.equal(detectIntent("와이파이 비번 뭐예요", store).id, "faq");
  assert.equal(detectIntent("아기랑 가도 돼요?", store).id, "faq");
  assert.equal(detectIntent("", store).id, "greeting");
});

test("unknown question without an AI key falls back to phone guidance", async () => {
  const r = await ask("사장님 MBTI 뭐예요?", { apiKey: "" });
  assert.match(text(r), /02-000-0000/);
});

test("AI answer is parsed from the Responses API output and used for unknown questions", async () => {
  let sent;
  const fakeFetch = async (url, init) => {
    sent = JSON.parse(init.body);
    return { ok: true, json: async () => ({ output: [{ type: "message", content: [{ type: "output_text", text: "네, 노트북 작업 가능해요." }] }] }) };
  };
  const r = await ask("노트북 오래 해도 돼요?", { apiKey: "k", fetchImpl: fakeFetch });
  assert.equal(text(r), "네, 노트북 작업 가능해요.");
  assert.equal(sent.model, "gpt-5.6-luna");
  assert.match(sent.instructions, /대신 카페/);
});

test("AI timeout or error returns null so the bot never exceeds Kakao's 5s limit", async () => {
  const slow = (url, init) => new Promise((_, reject) => init.signal.addEventListener("abort", () => reject(new Error("aborted"))));
  const started = Date.now();
  assert.equal(await aiAnswer("q", store, { apiKey: "k", fetchImpl: slow, timeoutMs: 200 }), null);
  assert.ok(Date.now() - started < 1500);
  assert.equal(await aiAnswer("q", store, { apiKey: "k", fetchImpl: async () => ({ ok: false }) }), null);
});

test("Kakao response shape: v2.0, simpleText under 1000 chars, quick replies", () => {
  const r = kakaoResponse("x".repeat(1500));
  assert.equal(r.version, "2.0");
  assert.equal(text(r).length, 1000);
  assert.equal(r.template.quickReplies.length, 4);
  assert.ok(r.template.quickReplies.every(q => q.label.length <= 14 && q.action === "message"));
});

test("HTTP handler: POST answers, token is enforced when configured", async () => {
  const call = async (body, headers = {}) => {
    let status, json;
    const res = { status(s) { status = s; return this; }, json(j) { json = j; } };
    await handler({ method: "POST", body, headers }, res);
    return { status, json };
  };
  const ok = await call({ userRequest: { utterance: "메뉴" } });
  assert.equal(ok.status, 200);
  assert.match(text(ok.json), /카페라떼/);
  process.env.SKILL_TOKEN = "secret";
  assert.equal((await call({ userRequest: { utterance: "메뉴" } })).status, 401);
  assert.equal((await call({ userRequest: { utterance: "메뉴" } }, { "x-skill-token": "secret" })).status, 200);
  delete process.env.SKILL_TOKEN;
});
