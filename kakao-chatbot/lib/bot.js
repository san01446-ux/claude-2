// Kakao i Open Builder skill logic: pure functions so it can be tested without a server.
// Response format: https://kakaobusiness.gitbook.io/main/tool/chatbot/skill_guide/answer_json_format

const QUICK_REPLIES = ["영업시간", "메뉴", "위치·주차", "예약 문의"];
const TEXT_LIMIT = 1000; // simpleText max length

const INTENTS = [
  // location first: "주차 몇 시간 무료예요?" is a parking question, not opening hours
  { id: "location", words: ["위치", "주소", "어디", "주차", "오시는", "찾아"] },
  { id: "hours", words: ["영업", "몇시", "몇 시", "시간", "오픈", "마감", "휴무", "쉬는", "문 열", "닫"] },
  { id: "menu", words: ["메뉴", "가격", "얼마", "음료", "커피", "케이크", "디저트"] },
  { id: "reservation", words: ["예약", "단체", "대관", "자리 맡"] },
  { id: "greeting", words: ["안녕", "처음", "시작", "도움", "하이", "hello"] },
];

const won = n => `${Number(n).toLocaleString("ko-KR")}원`;

function normalize(text) {
  return String(text || "").trim().toLowerCase().replace(/\s+/g, " ");
}

export function detectIntent(text, store) {
  const t = normalize(text);
  if (!t) return { id: "greeting" };
  for (const item of store.faq || []) {
    if (item.keywords.some(k => t.includes(k.toLowerCase()))) return { id: "faq", answer: item.answer };
  }
  for (const intent of INTENTS) {
    if (intent.words.some(w => t.includes(w))) return { id: intent.id };
  }
  return { id: "unknown" };
}

export function fixedAnswer(intent, store) {
  switch (intent.id) {
    case "greeting":
      return store.intro;
    case "hours":
      return `🕒 영업시간\n${store.hours}`;
    case "menu": {
      const lines = (store.menu || []).map(m => `· ${m.name} ${won(m.price)}`);
      return `☕ 메뉴\n${lines.join("\n")}${store.menuNote ? `\n\n${store.menuNote}` : ""}`;
    }
    case "location":
      return `📍 위치\n${store.location}\n\n🚗 주차\n${store.parking}`;
    case "reservation":
      return `📅 예약 안내\n${store.reservation}${store.reservationUrl ? `\n예약하기: ${store.reservationUrl}` : ""}\n☎ ${store.phone}`;
    case "faq":
      return intent.answer;
    default:
      return null;
  }
}

export function fallbackAnswer(store) {
  return `죄송해요, 그 질문은 바로 답하기 어려워요.\n아래 버튼을 눌러 보시거나 ☎ ${store.phone} 으로 문의해 주세요.`;
}

export function kakaoResponse(text) {
  const body = String(text || "").slice(0, TEXT_LIMIT);
  return {
    version: "2.0",
    template: {
      outputs: [{ simpleText: { text: body } }],
      quickReplies: QUICK_REPLIES.map(label => ({ label, action: "message", messageText: label })),
    },
  };
}

function aiInstructions(store) {
  return [
    `너는 '${store.name}'의 카카오톡 상담 챗봇이야.`,
    "아래 가게 정보에 있는 내용만으로 손님 질문에 한국어 존댓말로 짧게(3문장 이내) 답해.",
    "가게 정보에 없는 내용은 지어내지 말고, 확인 후 안내드리겠다고 하며 전화번호를 알려줘.",
    "마크다운이나 표는 쓰지 말고 일반 문장으로만 답해.",
    "",
    "[가게 정보]",
    JSON.stringify(store),
  ].join("\n");
}

// OpenAI Responses API. Kakao drops skills that take longer than 5s, so this is capped.
export async function aiAnswer(question, store, { apiKey, model, timeoutMs = 3500, fetchImpl = fetch } = {}) {
  if (!apiKey) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchImpl("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: model || "gpt-5.6-luna",
        instructions: aiInstructions(store),
        input: String(question).slice(0, 500),
        reasoning: { effort: "low" },
        max_output_tokens: 300,
        store: false,
      }),
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const data = await res.json();
    const text = (data.output || [])
      .flatMap(item => item.content || [])
      .filter(part => part.type === "output_text")
      .map(part => part.text)
      .join("")
      .trim();
    return text || null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function handleSkill(payload, store, options = {}) {
  const utterance = payload?.userRequest?.utterance || "";
  const intent = detectIntent(utterance, store);
  const fixed = fixedAnswer(intent, store);
  if (fixed) return kakaoResponse(fixed);
  const ai = await aiAnswer(utterance, store, options);
  return kakaoResponse(ai || fallbackAnswer(store));
}
