const test = require('node:test');
const assert = require('node:assert/strict');
const { createBot, chosungOf, startVariants, CONFIG } = require('../bot.js');

function setup(start = new Date(2026, 9, 3, 12).getTime()) {
  const files = {};
  const clock = { t: start };
  const io = { read: p => files[p] ?? null, write: (p, v) => { files[p] = v; } };
  let seed = 0;
  const bot = createBot(io, () => clock.t, () => ((seed = (seed * 9301 + 49297) % 233280) / 233280));
  const say = (who, text) => bot.handle('방', text, who);
  return { bot, say, clock, files, io };
}
const DAY = 86400000;

test('한글 헬퍼', () => {
  assert.equal(chosungOf('떡볶이'), 'ㄸㅂㅇ');
  assert.deepEqual(startVariants('력'), ['력', '역']);
  assert.deepEqual(startVariants('락'), ['락', '낙']);
  assert.deepEqual(startVariants('녀'), ['녀', '여']);
  assert.deepEqual(startVariants('사'), ['사']);
});

test('출석: 중복 방지, 연속·누적, 현황, 순위', () => {
  const { say, clock } = setup();
  assert.match(say('철수', '!출석'), /1번째 · 누적 1일 · 연속 1일/);
  assert.match(say('철수', '!출석'), /이미 출석/);
  assert.match(say('영희', '!출석'), /2번째/);
  assert.equal(say('민수', '안녕하세요'), null);
  assert.match(say('철수', '!출석현황'), /2명\)\n1\. 철수\n2\. 영희/);
  assert.match(say('철수', '!미출석'), /1명\)\n민수/);
  clock.t += DAY;
  assert.match(say('철수', '!출석'), /누적 2일 · 연속 2일/);
  clock.t += 2 * DAY;
  assert.match(say('철수', '!출석'), /누적 3일 · 연속 1일/);
  assert.match(say('철수', '!출석순위'), /1\. 철수 · 누적 3일/);
});

test('비활동과 대화 순위', () => {
  const { say, clock } = setup();
  say('철수', 'ㅎㅇ'); say('영희', 'ㅎㅇ'); say('영희', '반가워');
  clock.t += 10 * DAY;
  say('영희', '오랜만');
  const out = say('영희', '!비활동');
  assert.match(out, /7일 이상 대화 없는 멤버 \(1명\)\n철수 · 10일 전/);
  assert.match(say('영희', '!비활동 14'), /조용했던 멤버가 없어요/);
  assert.match(say('영희', '!대화순위'), /1\. 영희/);
});

test('끝말잇기: 이어가기, 두음법칙, 중복·연속 금지, 일반 대화 무시', () => {
  const { say } = setup();
  assert.match(say('철수', '!끝말잇기'), /시작/);
  assert.match(say('철수', '경력'), /철수 \+1점[\s\S]*'력' 또는 '역'/);
  assert.match(say('철수', '역사'), /다른 사람 차례/);
  assert.match(say('영희', '역사'), /영희 \+1점/);
  assert.equal(say('민수', '오늘 날씨 좋네요'), null);
  assert.equal(say('민수', '배고파'), null);
  assert.match(say('민수', '사과'), /민수 \+1점/);
  assert.match(say('철수', '과일'), /\+1점/);
  assert.match(say('영희', '일기'), /\+1점/);
  assert.match(say('민수', '기차'), /\+1점/);
  assert.match(say('철수', '차기'), /\+1점/);
  assert.match(say('영희', '기차'), /이미 나온 단어/);
  assert.match(say('철수', '!끝말잇기 종료'), /이어진 단어 7개/);
  assert.equal(say('철수', '기러기'), null);
  assert.match(say('철수', '!게임순위'), /1\. 철수 · 3점/);
});

test('초성게임 전체 흐름', () => {
  const { io, say } = setup();
  say('철수', '!초성게임');
  const state = () => JSON.parse(io.read(CONFIG.dataPath)).chosung['방'];
  let g = state();
  assert.equal(say('영희', '틀린답'), null);
  assert.match(say('영희', g.answer), /영희 정답! .* \+2점[\s\S]*\[2\/5\]/);
  assert.match(say('철수', '!힌트'), new RegExp(`첫 글자는 '${state().answer[0]}'`));
  assert.match(say('철수', state().answer), /\+1점/);
  assert.match(say('철수', '!패스'), /정답은[\s\S]*\[4\/5\]/);
  say('영희', state().answer);
  const end = say('영희', state().answer);
  assert.match(end, /초성게임 끝/);
  assert.equal(state().active, false);
  const asked = state().asked;
  assert.equal(new Set(asked).size, asked.length);
  assert.match(say('영희', '!게임순위'), /1\. 영희 · 6점\n2\. 철수 · 1점/);
});

test('데이터는 파일에 저장되고 다시 불러와진다', () => {
  const { say, io } = setup();
  say('철수', '!출석');
  const bot2 = createBot(io, () => new Date(2026, 9, 3, 15).getTime());
  assert.match(bot2.handle('방', '!출석', '철수'), /이미 출석/);
});

test('메신저봇R response(): 개인톡·다른 방 무시', () => {
  const replies = [];
  // response 는 메신저봇R 전역 함수라 vm 으로 로드해서 확인
  const vm = require('node:vm');
  const fs = require('node:fs');
  const ctx = { FileStream: { read: () => null, write: () => {} }, Date, Math, JSON, String, Object, parseInt, console };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(require.resolve('../bot.js'), 'utf8'), ctx);
  const replier = { reply: t => replies.push(t) };
  ctx.response('방', '!도움말', '철수', false, replier);
  assert.equal(replies.length, 0);
  ctx.response('방', '!도움말', '철수', true, replier);
  assert.match(replies[0], /명령어 안내/);
  ctx.CONFIG.rooms = ['다른방'];
  ctx.response('방', '!도움말', '철수', true, replier);
  assert.equal(replies.length, 1);
});
