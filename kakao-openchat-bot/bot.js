/*
 * 오픈채팅방 관리 봇 (메신저봇R 레거시 API 스크립트)
 * 기능: 출석 / 미출석 / 비활동 확인 / 끝말잇기 / 초성게임 / 게임 순위
 *
 * 메신저봇R의 Rhino 엔진에서 돌아가도록 ES5 문법만 사용합니다.
 * 설치 방법은 README.md 를 보세요.
 */

/* ===== 설정: 고객 방에 맞게 바꾸는 곳 ===== */
var CONFIG = {
  // 봇이 반응할 방 이름. 비워 두면 모든 단체방에서 반응합니다.
  rooms: [],
  // 데이터 저장 위치 (메신저봇R 폴더 안)
  dataPath: "/sdcard/msgbot/openchat_bot_data.json",
  // 비활동 기본 기준 (일)
  inactiveDays: 7,
  // 초성게임 한 판의 문제 수
  chosungRounds: 5
};

/* ===== 한글 처리 ===== */
var CHO = ["ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ", "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"];
var HANGUL_BASE = 0xac00;

function isHangulSyllable(ch) {
  var c = ch.charCodeAt(0);
  return c >= 0xac00 && c <= 0xd7a3;
}

function chosungOf(word) {
  var out = "";
  for (var i = 0; i < word.length; i++) {
    var ch = word.charAt(i);
    out += isHangulSyllable(ch) ? CHO[Math.floor((ch.charCodeAt(0) - HANGUL_BASE) / 588)] : ch;
  }
  return out;
}

// 두음법칙: 끝 글자 "력" 다음에 "역"으로 시작해도 인정 (ㄹ→ㄴ/ㅇ, ㄴ→ㅇ)
function startVariants(ch) {
  var list = [ch];
  if (!isHangulSyllable(ch)) return list;
  var code = ch.charCodeAt(0) - HANGUL_BASE;
  var cho = Math.floor(code / 588);
  var jung = Math.floor((code % 588) / 28);
  var jong = code % 28;
  // ㅑ ㅕ ㅖ ㅛ ㅠ ㅣ
  var iVowel = jung === 2 || jung === 6 || jung === 7 || jung === 12 || jung === 17 || jung === 20;
  function make(c) { return String.fromCharCode(HANGUL_BASE + c * 588 + jung * 28 + jong); }
  if (cho === 5) list.push(make(iVowel ? 11 : 2)); // ㄹ → ㅇ / ㄴ
  if (cho === 2 && iVowel) list.push(make(11)); // ㄴ → ㅇ
  return list;
}

function isWordAttempt(text) {
  return /^[가-힣]{2,10}$/.test(text);
}

/* ===== 날짜 (기기 시간 기준) ===== */
function pad(n) { return n < 10 ? "0" + n : "" + n; }
function dayKey(ms) {
  var d = new Date(ms);
  return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
}
function parseDay(key) {
  var p = String(key).split("-");
  return new Date(parseInt(p[0], 10), parseInt(p[1], 10) - 1, parseInt(p[2], 10)).getTime();
}
function daysBetween(a, b) {
  return Math.round((parseDay(b) - parseDay(a)) / 86400000);
}

/* ===== 초성게임 문제 ===== */
var CHOSUNG_WORDS = {
  "음식": ["떡볶이", "김치찌개", "된장찌개", "비빔밥", "불고기", "삼겹살", "짜장면", "짬뽕", "탕수육", "냉면", "칼국수", "라면", "김밥", "순대", "치킨", "피자", "햄버거", "돈가스", "초밥", "갈비탕", "삼계탕", "제육볶음", "닭갈비", "부대찌개", "잡채", "떡국", "만두", "파전", "쌀국수", "마라탕"],
  "동물": ["호랑이", "코끼리", "기린", "강아지", "고양이", "토끼", "거북이", "다람쥐", "고슴도치", "펭귄", "원숭이", "얼룩말", "하마", "악어", "독수리", "앵무새", "돌고래", "고래", "문어", "오징어", "사자", "판다", "여우", "늑대", "너구리", "부엉이", "참새", "개구리", "햄스터", "캥거루"],
  "과일": ["사과", "바나나", "딸기", "포도", "수박", "참외", "복숭아", "자두", "체리", "귤", "오렌지", "레몬", "망고", "파인애플", "키위", "블루베리", "멜론", "석류", "감", "배"],
  "나라": ["대한민국", "일본", "중국", "미국", "영국", "프랑스", "독일", "이탈리아", "스페인", "캐나다", "호주", "브라질", "멕시코", "인도", "베트남", "태국", "러시아", "이집트", "튀르키예", "필리핀"],
  "직업": ["의사", "간호사", "선생님", "경찰관", "소방관", "요리사", "미용사", "변호사", "기자", "가수", "배우", "화가", "농부", "어부", "운전기사", "택배기사", "약사", "군인", "건축가", "프로그래머"],
  "물건": ["냉장고", "세탁기", "선풍기", "에어컨", "텔레비전", "컴퓨터", "휴대폰", "이어폰", "우산", "가방", "지갑", "안경", "시계", "연필", "지우개", "가위", "거울", "칫솔", "베개", "이불"]
};

/* ===== 저장소 ===== */
function createStore(io) {
  var data = null;
  function blank() {
    return { users: {}, attendance: {}, wordchain: {}, chosung: {}, points: {} };
  }
  function load() {
    if (data) return data;
    try {
      var raw = io.read(CONFIG.dataPath);
      data = raw ? JSON.parse(raw) : blank();
    } catch (e) {
      data = blank();
    }
    var base = blank();
    for (var k in base) if (!data[k]) data[k] = base[k];
    return data;
  }
  function save() {
    try { io.write(CONFIG.dataPath, JSON.stringify(data)); } catch (e) { /* 저장 실패해도 봇은 계속 동작 */ }
  }
  function room(section, name, init) {
    var d = load();
    if (!d[section][name]) d[section][name] = init();
    return d[section][name];
  }
  return { load: load, save: save, room: room };
}

/* ===== 봇 본체 ===== */
function createBot(io, nowFn, randomFn) {
  var store = createStore(io);
  var now = nowFn || function () { return Date.now(); };
  var random = randomFn || Math.random;

  function users(roomName) { return store.room("users", roomName, function () { return {}; }); }
  function points(roomName) { return store.room("points", roomName, function () { return {}; }); }

  function touch(roomName, sender) {
    var u = users(roomName)[sender];
    if (!u) u = users(roomName)[sender] = { firstSeen: dayKey(now()), messages: 0 };
    u.messages += 1;
    u.lastSeen = dayKey(now());
    return u;
  }

  function addPoint(roomName, sender, n) {
    var p = points(roomName);
    p[sender] = (p[sender] || 0) + n;
  }

  /* --- 출석 --- */
  function attend(roomName, sender) {
    var today = dayKey(now());
    var att = store.room("attendance", roomName, function () { return { days: {}, members: {} }; });
    var list = att.days[today] || (att.days[today] = []);
    var m = att.members[sender] || (att.members[sender] = { total: 0, streak: 0, last: "" });
    if (m.last === today) {
      return sender + "님은 오늘 이미 출석했어요. (오늘 " + (list.indexOf(sender) + 1) + "번째)";
    }
    m.streak = m.last && daysBetween(m.last, today) === 1 ? m.streak + 1 : 1;
    m.total += 1;
    m.last = today;
    list.push(sender);
    // 오래된 날짜 기록은 60일만 보관
    for (var day in att.days) if (daysBetween(day, today) > 60) delete att.days[day];
    return "✅ " + sender + "님 출석 완료!\n오늘 " + list.length + "번째 · 누적 " + m.total + "일 · 연속 " + m.streak + "일";
  }

  function attendanceToday(roomName) {
    var att = store.room("attendance", roomName, function () { return { days: {}, members: {} }; });
    var list = att.days[dayKey(now())] || [];
    if (!list.length) return "오늘 출석한 사람이 아직 없어요. !출석 으로 첫 출석을 해 보세요!";
    return "📋 오늘 출석 (" + list.length + "명)\n" + list.map(function (n, i) { return (i + 1) + ". " + n; }).join("\n");
  }

  function notAttended(roomName) {
    var att = store.room("attendance", roomName, function () { return { days: {}, members: {} }; });
    var done = att.days[dayKey(now())] || [];
    var all = Object.keys(users(roomName));
    var missing = all.filter(function (n) { return done.indexOf(n) < 0; });
    if (!all.length) return "아직 기록된 멤버가 없어요.";
    if (!missing.length) return "🎉 봇이 아는 멤버 " + all.length + "명 모두 오늘 출석했어요!";
    return "🙋 오늘 미출석 (" + missing.length + "명)\n" + missing.join(", ") +
      "\n\n※ 봇이 한 번이라도 본 멤버 기준이에요.";
  }

  function attendanceRanking(roomName) {
    var att = store.room("attendance", roomName, function () { return { days: {}, members: {} }; });
    var rows = Object.keys(att.members).map(function (n) { return [n, att.members[n].total, att.members[n].streak]; });
    if (!rows.length) return "아직 출석 기록이 없어요.";
    rows.sort(function (a, b) { return b[1] - a[1] || b[2] - a[2]; });
    return "🏆 출석 순위\n" + rows.slice(0, 10).map(function (r, i) {
      return (i + 1) + ". " + r[0] + " · 누적 " + r[1] + "일 (연속 " + r[2] + "일)";
    }).join("\n");
  }

  /* --- 활동 / 비활동 --- */
  function inactive(roomName, daysArg) {
    var limit = parseInt(daysArg, 10);
    if (!(limit > 0)) limit = CONFIG.inactiveDays;
    var today = dayKey(now());
    var all = users(roomName);
    var rows = Object.keys(all).map(function (n) { return [n, daysBetween(all[n].lastSeen, today)]; })
      .filter(function (r) { return r[1] >= limit; })
      .sort(function (a, b) { return b[1] - a[1]; });
    if (!rows.length) return "💬 최근 " + limit + "일 동안 조용했던 멤버가 없어요.";
    return "😴 " + limit + "일 이상 대화 없는 멤버 (" + rows.length + "명)\n" +
      rows.map(function (r) { return r[0] + " · " + r[1] + "일 전"; }).join("\n");
  }

  function activity(roomName) {
    var all = users(roomName);
    var rows = Object.keys(all).map(function (n) { return [n, all[n].messages]; });
    if (!rows.length) return "아직 기록이 없어요.";
    rows.sort(function (a, b) { return b[1] - a[1]; });
    return "💬 대화 순위\n" + rows.slice(0, 10).map(function (r, i) { return (i + 1) + ". " + r[0] + " · " + r[1] + "개"; }).join("\n");
  }

  /* --- 끝말잇기 --- */
  function wordchainStart(roomName, sender) {
    var g = store.room("wordchain", roomName, function () { return {}; });
    if (g.active) return "이미 끝말잇기 중이에요! '" + g.next + "'(으)로 시작하는 단어를 말해 주세요.";
    g.active = true;
    g.used = [];
    g.next = "";
    g.lastPlayer = "";
    g.startedBy = sender;
    return "🔤 끝말잇기 시작!\n아무 단어(한글 2글자 이상)나 먼저 말해 주세요.\n· 같은 사람이 연속으로 못 이어요\n· 한 번 나온 단어는 다시 못 써요\n· 끝내려면 !끝말잇기 종료";
  }

  function wordchainStop(roomName) {
    var g = store.room("wordchain", roomName, function () { return {}; });
    if (!g.active) return "진행 중인 끝말잇기가 없어요.";
    g.active = false;
    return "🛑 끝말잇기 종료! 이어진 단어 " + (g.used || []).length + "개\n순위는 !게임순위 로 확인하세요.";
  }

  function wordchainTry(roomName, sender, text) {
    var g = store.room("wordchain", roomName, function () { return {}; });
    if (!g.active || !isWordAttempt(text)) return null;
    if (g.next && startVariants(g.next).indexOf(text.charAt(0)) < 0) return null; // 그냥 대화로 보고 무시
    if (g.used.indexOf(text) >= 0) return "❌ '" + text + "'은(는) 이미 나온 단어예요!";
    if (g.lastPlayer === sender) return "⏳ " + sender + "님, 다른 사람 차례예요!";
    g.used.push(text);
    g.lastPlayer = sender;
    g.next = text.charAt(text.length - 1);
    addPoint(roomName, sender, 1);
    var alt = startVariants(g.next);
    return "⭕ " + sender + " +1점\n다음: '" + alt.join("' 또는 '") + "'(으)로 시작!";
  }

  /* --- 초성게임 --- */
  function pickQuestion(g) {
    var cats = Object.keys(CHOSUNG_WORDS);
    for (var tries = 0; tries < 50; tries++) {
      var cat = cats[Math.floor(random() * cats.length)];
      var words = CHOSUNG_WORDS[cat];
      var word = words[Math.floor(random() * words.length)];
      if (g.asked.indexOf(word) < 0) {
        g.asked.push(word);
        g.answer = word;
        g.category = cat;
        g.hinted = false;
        return;
      }
    }
  }

  function questionText(g) {
    return "❓ [" + g.round + "/" + CONFIG.chosungRounds + "] " + g.category + " · " + chosungOf(g.answer) +
      " (" + g.answer.length + "글자)";
  }

  function chosungStart(roomName) {
    var g = store.room("chosung", roomName, function () { return {}; });
    if (g.active) return "이미 초성게임 중이에요!\n" + questionText(g);
    g.active = true;
    g.round = 1;
    g.asked = [];
    pickQuestion(g);
    return "🎯 초성게임 시작! 정답을 채팅으로 바로 입력하세요.\n!힌트 · !패스 · !초성게임 종료\n\n" + questionText(g);
  }

  function chosungAdvance(g, prefix) {
    if (g.round >= CONFIG.chosungRounds) {
      g.active = false;
      return prefix + "\n\n🏁 초성게임 끝! 순위는 !게임순위 로 확인하세요.";
    }
    g.round += 1;
    pickQuestion(g);
    return prefix + "\n\n" + questionText(g);
  }

  function chosungHint(roomName) {
    var g = store.room("chosung", roomName, function () { return {}; });
    if (!g.active) return "진행 중인 초성게임이 없어요. !초성게임 으로 시작하세요.";
    g.hinted = true;
    return "💡 힌트: 첫 글자는 '" + g.answer.charAt(0) + "' (힌트 후 정답은 1점)";
  }

  function chosungPass(roomName) {
    var g = store.room("chosung", roomName, function () { return {}; });
    if (!g.active) return "진행 중인 초성게임이 없어요.";
    return chosungAdvance(g, "⏭️ 정답은 '" + g.answer + "' 였어요.");
  }

  function chosungStop(roomName) {
    var g = store.room("chosung", roomName, function () { return {}; });
    if (!g.active) return "진행 중인 초성게임이 없어요.";
    g.active = false;
    return "🛑 초성게임 종료! (정답: " + g.answer + ")";
  }

  function chosungTry(roomName, sender, text) {
    var g = store.room("chosung", roomName, function () { return {}; });
    if (!g.active || text.replace(/\s/g, "") !== g.answer) return null;
    var gain = g.hinted ? 1 : 2;
    addPoint(roomName, sender, gain);
    return chosungAdvance(g, "🎉 " + sender + " 정답! '" + g.answer + "' +" + gain + "점");
  }

  function gameRanking(roomName) {
    var p = points(roomName);
    var rows = Object.keys(p).map(function (n) { return [n, p[n]]; });
    if (!rows.length) return "아직 게임 점수가 없어요.";
    rows.sort(function (a, b) { return b[1] - a[1]; });
    return "🏅 게임 순위\n" + rows.slice(0, 10).map(function (r, i) { return (i + 1) + ". " + r[0] + " · " + r[1] + "점"; }).join("\n");
  }

  var HELP = [
    "🤖 명령어 안내",
    "",
    "[출석]",
    "!출석 · !출석현황 · !미출석 · !출석순위",
    "",
    "[활동]",
    "!비활동 (기본 " + CONFIG.inactiveDays + "일, 예: !비활동 14) · !대화순위",
    "",
    "[게임]",
    "!끝말잇기 · !끝말잇기 종료",
    "!초성게임 · !힌트 · !패스 · !초성게임 종료",
    "!게임순위"
  ].join("\n");

  function handle(roomName, text, sender) {
    var msg = String(text || "").trim();
    var who = String(sender || "").trim();
    if (!who) return null;
    var reply = null;
    try {
      reply = route(roomName, msg, who);
    } finally {
      touch(roomName, who);
      store.save();
    }
    return reply;
  }

  function route(roomName, msg, who) {
    var parts = msg.split(/\s+/);
    switch (parts[0]) {
      case "!도움말": case "!명령어": return HELP;
      case "!출석": return attend(roomName, who);
      case "!출석현황": return attendanceToday(roomName);
      case "!미출석": return notAttended(roomName);
      case "!출석순위": return attendanceRanking(roomName);
      case "!비활동": return inactive(roomName, parts[1]);
      case "!대화순위": return activity(roomName);
      case "!끝말잇기": return parts[1] === "종료" ? wordchainStop(roomName) : wordchainStart(roomName, who);
      case "!초성게임": return parts[1] === "종료" ? chosungStop(roomName) : chosungStart(roomName);
      case "!힌트": return chosungHint(roomName);
      case "!패스": return chosungPass(roomName);
      case "!게임순위": return gameRanking(roomName);
    }
    if (msg.charAt(0) === "!") return null;
    return chosungTry(roomName, who, msg) || wordchainTry(roomName, who, msg);
  }

  return { handle: handle };
}

/* ===== 메신저봇R 연결 ===== */
var BOT = null;

function response(room, msg, sender, isGroupChat, replier, imageDB, packageName) {
  if (!isGroupChat) return;
  if (CONFIG.rooms.length && CONFIG.rooms.indexOf(room) < 0) return;
  if (!BOT) {
    BOT = createBot({
      read: function (path) { return FileStream.read(path); },
      write: function (path, text) { FileStream.write(path, text); }
    });
  }
  var reply = BOT.handle(room, msg, sender);
  if (reply) replier.reply(reply);
}

/* Node 테스트용 (메신저봇R에서는 무시됨) */
if (typeof module !== "undefined" && module.exports) {
  module.exports = { createBot: createBot, chosungOf: chosungOf, startVariants: startVariants, CONFIG: CONFIG, CHOSUNG_WORDS: CHOSUNG_WORDS };
}
