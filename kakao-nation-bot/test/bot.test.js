const test = require('node:test');
const assert = require('node:assert/strict');
const { createBot, CONFIG } = require('../bot.js');

const DAY = 86400000;
function setup(http) {
  const files = {};
  const clock = { t: new Date(2026, 9, 3, 12).getTime() };
  const io = { read: p => files[p] ?? null, write: (p, v) => { files[p] = v; } };
  const bot = createBot(io, () => clock.t, http);
  const say = (who, text) => bot.handle('나라방', text, who);
  const state = () => JSON.parse(files[CONFIG.dataPath]).rooms['나라방'];
  return { say, clock, io, state };
}

test('국민등록, 신분증, 명부', () => {
  const { say } = setup();
  assert.match(say('철수', '!국민등록'), /국민번호 0001[\s\S]*1,000 골드/);
  assert.match(say('철수', '!국민등록'), /이미 국민/);
  assert.match(say('영희', '!국민등록'), /0002/);
  assert.match(say('영희', '!신분증 철수'), /이름  철수\n번호  0001\n관직  국민/);
  assert.match(say('민수', '!송금 철수 10'), /먼저 !국민등록/);
  assert.match(say('철수', '!국민목록'), /2명\)\n0001 철수\n0002 영희/);
});

test('송금: 잔고 부족, 자기 자신, 띄어쓰기 닉네임, 쉼표 금액', () => {
  const { say } = setup();
  say('철수', '!국민등록'); say('달빛 고양이', '!국민등록');
  assert.match(say('철수', '!송금 달빛 고양이 1,000'), /달빛 고양이 1,000 골드 송금 완료\n남은 잔고: 0 골드/);
  assert.match(say('철수', '!송금 달빛 고양이 1'), /잔고가 부족/);
  assert.match(say('철수', '!송금 철수 1'), /자기 자신/);
  assert.match(say('철수', '!송금 없는사람 1'), /국민이 아니에요/);
  assert.match(say('철수', '!송금 달빛 고양이 -5'), /사용법/);
  assert.match(say('달빛 고양이', '!잔고'), /2,000 골드/);
});

test('월급은 관직별 금액으로 하루 한 번, 출석 보상', () => {
  const { say, clock } = setup();
  say('철수', '!국민등록');
  assert.match(say('철수', '!월급'), /국민 철수님 오늘의 월급 100 골드[\s\S]*1,100 골드/);
  assert.match(say('철수', '!월급'), /이미 받았어요/);
  assert.match(say('철수', '!출석'), /1번째 · 누적 1일 · 연속 1일\n출석 보상 50 골드/);
  clock.t += DAY;
  assert.match(say('철수', '!출석'), /연속 2일/);
  assert.match(say('철수', '!월급'), /100 골드 지급/);
  assert.match(say('철수', '!잔고'), /1,300 골드/);
});

test('권한: 운영자 임명, 관직 권한, 정원, 지급·회수, 공지', () => {
  const { say } = setup();
  ['운영자', '철수', '영희', '민수'].forEach(n => say(n, '!국민등록'));
  assert.match(say('철수', '!공지등록 내일 회의'), /권한/);
  assert.match(say('운영자', '!관직임명 철수 대통령'), /대통령\(으\)로 임명/);
  assert.match(say('운영자', '!관직임명 영희 대통령'), /정원\(1명\)이 가득/);
  assert.match(say('철수', '!관직임명 영희 장관'), /장관/);
  assert.match(say('영희', '!지급 민수 500'), /지급 완료: 민수 500 골드\n민수님 잔고: 1,500 골드/);
  assert.match(say('영희', '!회수 민수 9999'), /민수님 잔고: 0 골드/);
  assert.match(say('영희', '!공지등록 내일 9시 국무회의'), /1번/);
  assert.match(say('민수', '!공지'), /1\. 내일 9시 국무회의  \(영희/);
  assert.match(say('민수', '!관직임명 민수 대통령'), /권한/);
  assert.match(say('철수', '!월급'), /대통령 철수님 오늘의 월급 500 골드/);
  assert.match(say('민수', '!국가정보'), /국민 4명[\s\S]*대통령: 철수\n장관: 영희/);
  assert.match(say('운영자', '!관직해임 영희'), /장관에서 해임/);
  assert.match(say('영희', '!지급 민수 1'), /권한/);
  assert.match(say('철수', '!도움말'), /\[관리 · 내 권한\][\s\S]*!지급/);
  assert.doesNotMatch(say('민수', '!도움말'), /관리/);
});

test('투표: 1인 1표, 결과', () => {
  const { say } = setup();
  ['운영자', '철수', '영희'].forEach(n => say(n, '!국민등록'));
  assert.match(say('철수', '!투표생성 국기 색 | 빨강 | 파랑'), /권한/);
  assert.match(say('운영자', '!투표생성 국기 색 | 빨강 | 파랑'), /1\. 빨강\n2\. 파랑/);
  assert.match(say('철수', '!투표 2'), /1명 참여/);
  assert.match(say('철수', '!투표 1'), /이미 투표/);
  assert.match(say('영희', '!투표 3'), /1~2 중에서/);
  say('영희', '!투표 2');
  assert.match(say('운영자', '!투표종료'), /2\. 파랑 — 2표[\s\S]*결과: 파랑/);
  assert.match(say('영희', '!투표 1'), /진행 중인 투표가 없어요/);
});

test('선거: 출마, 투표, 당선 시 관직 자동 교체', () => {
  const { say, state } = setup();
  ['운영자', '철수', '영희', '민수', '지수'].forEach(n => say(n, '!국민등록'));
  say('운영자', '!관직임명 지수 대통령');
  assert.match(say('운영자', '!선거시작 대통령'), /대통령 선거가 시작/);
  say('철수', '!출마'); say('영희', '!출마');
  assert.match(say('민수', '!선거투표 없는후보'), /후보가 아니에요/);
  say('민수', '!선거투표 영희'); say('운영자', '!선거투표 영희'); say('철수', '!선거투표 철수');
  assert.match(say('민수', '!선거투표 철수'), /이미 투표/);
  const out = say('운영자', '!선거종료');
  assert.match(out, /영희님이 대통령에 당선됐어요! \(2표\)\n이전 대통령: 지수 → 국민/);
  const s = state();
  assert.equal(s.citizens['영희'].role, '대통령');
  assert.equal(s.citizens['지수'].role, '국민');
});

test('요약: 마지막 발언 이후 대화를 AI로 요약, 키 없으면 안내', () => {
  let sent;
  const http = { post: (url, headers, body) => { sent = { url, headers, body: JSON.parse(body) }; return JSON.stringify({ output: [{ content: [{ type: 'output_text', text: '- 철수: 회의 9시로 결정' }] }] }); } };
  const { say } = setup(http);
  say('영희', '나 잠깐 나갔다 올게');
  say('철수', '회의 언제 해?');
  say('민수', '9시 어때');
  say('철수', '좋아 9시로 하자');
  assert.match(say('영희', '!요약'), /요약 기능이 아직 설정되지 않았어요/);
  CONFIG.summary.apiKey = 'sk-test';
  const out = say('영희', '!요약');
  assert.match(out, /영희님이 안 보는 동안 \(3개 대화[\s\S]*회의 9시로 결정/);
  assert.equal(sent.url, 'https://api.openai.com/v1/responses');
  assert.equal(sent.headers.Authorization, 'Bearer sk-test');
  assert.doesNotMatch(sent.body.input, /잠깐 나갔다/);
  assert.match(sent.body.input, /민수: 9시 어때/);
  assert.match(say('철수', '!요약'), /요약할 대화가 별로 없어요/);
  CONFIG.summary.apiKey = '';
});

test('저장 후 다시 불러와도 상태가 유지된다', () => {
  const { say, io } = setup();
  say('철수', '!국민등록');
  const bot2 = createBot(io, () => new Date(2026, 9, 3, 15).getTime());
  assert.match(bot2.handle('나라방', '!잔고', '철수'), /1,000 골드/);
});
