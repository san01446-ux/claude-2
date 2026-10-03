/*
 * 가상국가 운영 봇 (메신저봇R 레거시 API 스크립트)
 * 국민 등록 · 화폐/송금 · 월급 · 출석 · 국가 정보/공지 · 관직/권한 · 투표 · 선거 · AI 메시지 요약
 *
 * 메신저봇R의 Rhino 엔진에서 돌아가도록 ES5 문법만 사용합니다.
 * 설치와 설정 방법은 README.md 를 보세요.
 */

/* ===== 설정: 나라에 맞게 바꾸는 곳 ===== */
var CONFIG = {
  // 봇이 반응할 방 이름. 비워 두면 모든 단체방에서 반응합니다.
  rooms: [],
  dataPath: "/sdcard/msgbot/nation_bot_data.json",

  nation: {
    name: "대한가상공화국",
    currency: "골드",
    founded: "2026-01-01",
    motto: "함께 만드는 나라",
    constitution: [
      "제1조 이 나라는 민주공화국이며, 모든 권력은 국민에게서 나온다.",
      "제2조 국민은 국민등록을 한 사람으로 한다.",
      "제3조 대통령은 선거로 선출한다."
    ]
  },

  // 모든 권한을 가진 운영자 닉네임 (처음 세팅용)
  admins: ["운영자"],

  // 관직: perms 에 "*" 는 모든 권한. max 는 최대 인원(0 = 제한 없음). salary 는 하루 월급.
  // 권한 종류: notice(공지), money(지급/회수), appoint(임명/해임), vote(투표 관리), election(선거 관리)
  roles: {
    "대통령": { perms: ["*"], max: 1, salary: 500 },
    "국무총리": { perms: ["notice", "appoint", "vote"], max: 1, salary: 400 },
    "장관": { perms: ["notice", "money"], max: 5, salary: 300 },
    "국회의원": { perms: ["vote"], max: 10, salary: 200 },
    "국민": { perms: [], max: 0, salary: 100 }
  },
  defaultRole: "국민",

  startBalance: 1000,
  attendanceReward: 50,

  summary: {
    enabled: true,
    apiKey: "",            // OpenAI API 키 (sk-...). 비워 두면 요약 기능이 꺼집니다.
    model: "gpt-5.6-luna", // 사용할 모델
    keepMessages: 400,     // 방마다 보관할 최근 대화 수
    maxLines: 200          // 한 번에 요약할 최대 줄 수
  }
};

/* ===== 공통 유틸 ===== */
function pad(n) { return n < 10 ? "0" + n : "" + n; }
function dayKey(ms) {
  var d = new Date(ms);
  return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
}
function timeText(ms) {
  var d = new Date(ms);
  return pad(d.getHours()) + ":" + pad(d.getMinutes());
}
function parseDay(key) {
  var p = String(key).split("-");
  return new Date(parseInt(p[0], 10), parseInt(p[1], 10) - 1, parseInt(p[2], 10)).getTime();
}
function daysBetween(a, b) { return Math.round((parseDay(b) - parseDay(a)) / 86400000); }
function money(n) {
  var s = String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return (n < 0 ? "-" : "") + s + " " + CONFIG.nation.currency;
}
function parseAmount(text) {
  var t = String(text || "").replace(/,/g, "");
  if (!/^\d{1,9}$/.test(t)) return -1;
  return parseInt(t, 10);
}
function padNo(n) { var s = String(n); while (s.length < 4) s = "0" + s; return s; }

/* ===== 저장소 ===== */
function createStore(io) {
  var data = null;
  function blank() {
    return { rooms: {} };
  }
  function load() {
    if (data) return data;
    try {
      var raw = io.read(CONFIG.dataPath);
      data = raw ? JSON.parse(raw) : blank();
    } catch (e) {
      data = blank();
    }
    if (!data.rooms) data.rooms = {};
    return data;
  }
  function room(name) {
    var d = load();
    var r = d.rooms[name];
    if (!r) r = d.rooms[name] = {};
    var base = { citizens: {}, nextNo: 1, notices: [], attendance: {}, poll: null, election: null, log: [], seq: 0, lastSpoke: {}, ledger: [] };
    for (var k in base) if (r[k] === undefined) r[k] = base[k];
    return r;
  }
  function save() {
    try { io.write(CONFIG.dataPath, JSON.stringify(data)); } catch (e) { /* 저장 실패해도 계속 동작 */ }
  }
  return { room: room, save: save };
}

/* ===== 봇 본체 ===== */
function createBot(io, nowFn, http) {
  var store = createStore(io);
  var now = nowFn || function () { return Date.now(); };

  /* --- 권한 --- */
  function citizen(r, name) { return r.citizens[name] || null; }
  function roleOf(r, name) {
    var c = citizen(r, name);
    return c ? c.role : null;
  }
  function can(r, name, perm) {
    if (CONFIG.admins.indexOf(name) >= 0) return true;
    var role = roleOf(r, name);
    var def = role && CONFIG.roles[role];
    if (!def) return false;
    return def.perms.indexOf("*") >= 0 || def.perms.indexOf(perm) >= 0;
  }
  function deny() { return "🚫 이 명령은 권한이 있는 관직만 쓸 수 있어요. (!관직목록 참고)"; }
  function needCitizen(r, name) {
    return citizen(r, name) ? null : "먼저 !국민등록 으로 국민이 되어 주세요.";
  }
  function holders(r, role) {
    var list = [];
    for (var n in r.citizens) if (r.citizens[n].role === role) list.push(n);
    return list;
  }

  function addLedger(r, from, to, amount, memo) {
    r.ledger.push({ t: now(), from: from, to: to, a: amount, m: memo });
    if (r.ledger.length > 300) r.ledger.splice(0, r.ledger.length - 300);
  }

  /* --- 국민 --- */
  function register(r, name) {
    if (citizen(r, name)) return name + "님은 이미 국민이에요. (국민번호 " + padNo(r.citizens[name].no) + ")";
    var c = r.citizens[name] = { no: r.nextNo++, joined: dayKey(now()), role: CONFIG.defaultRole, balance: CONFIG.startBalance, lastSalary: "", attend: { total: 0, streak: 0, last: "" } };
    addLedger(r, "국고", name, CONFIG.startBalance, "국민등록 지원금");
    return "🎉 " + CONFIG.nation.name + "에 오신 것을 환영합니다!\n국민번호 " + padNo(c.no) + " · " + name + "\n정착 지원금: " + money(CONFIG.startBalance) + " 지급\n!도움말 로 명령어를 확인하세요.";
  }

  function idCard(r, name, target) {
    var who = target || name;
    var c = citizen(r, who);
    if (!c) return who + "님은 아직 국민이 아니에요." + (who === name ? "\n!국민등록 으로 먼저 등록해 주세요." : "");
    return "🪪 " + CONFIG.nation.name + " 국민증\n" +
      "────────────\n" +
      "이름  " + who + "\n" +
      "번호  " + padNo(c.no) + "\n" +
      "관직  " + c.role + "\n" +
      "등록  " + c.joined + "\n" +
      "출석  누적 " + c.attend.total + "일";
  }

  function citizenList(r) {
    var names = Object.keys(r.citizens);
    if (!names.length) return "아직 등록한 국민이 없어요. !국민등록 으로 첫 국민이 되어 보세요!";
    names.sort(function (a, b) { return r.citizens[a].no - r.citizens[b].no; });
    return "👥 국민 명부 (" + names.length + "명)\n" + names.map(function (n) {
      var c = r.citizens[n];
      return padNo(c.no) + " " + n + (c.role !== CONFIG.defaultRole ? " · " + c.role : "");
    }).join("\n");
  }

  /* --- 화폐 --- */
  function balance(r, name, target) {
    var who = target || name;
    var c = citizen(r, who);
    if (!c) return who + "님은 아직 국민이 아니에요." + (who === name ? "\n!국민등록 으로 먼저 등록해 주세요." : "");
    return "💰 " + who + "님의 잔고: " + money(c.balance);
  }

  function transfer(r, name, target, amountText) {
    var err = needCitizen(r, name); if (err) return err;
    var amount = parseAmount(amountText);
    if (!target || amount <= 0) return "사용법: !송금 받는사람 금액  (예: !송금 철수 100)";
    if (target === name) return "자기 자신에게는 보낼 수 없어요.";
    var to = citizen(r, target);
    if (!to) return target + "님은 국민이 아니에요. 닉네임을 정확히 입력해 주세요.";
    var from = citizen(r, name);
    if (from.balance < amount) return "잔고가 부족해요. (현재 " + money(from.balance) + ")";
    from.balance -= amount;
    to.balance += amount;
    addLedger(r, name, target, amount, "송금");
    return "💸 " + name + " → " + target + " " + money(amount) + " 송금 완료\n남은 잔고: " + money(from.balance);
  }

  function grant(r, name, target, amountText, sign) {
    if (!can(r, name, "money")) return deny();
    var amount = parseAmount(amountText);
    var c = citizen(r, target);
    if (!target || amount <= 0) return "사용법: " + (sign > 0 ? "!지급" : "!회수") + " 닉네임 금액";
    if (!c) return target + "님은 국민이 아니에요.";
    if (sign < 0 && c.balance < amount) amount = c.balance;
    c.balance += sign * amount;
    addLedger(r, sign > 0 ? "국고" : target, sign > 0 ? target : "국고", amount, (sign > 0 ? "지급" : "회수") + " by " + name);
    return (sign > 0 ? "🏦 지급" : "🏦 회수") + " 완료: " + target + " " + money(amount) + "\n" + target + "님 잔고: " + money(c.balance);
  }

  function salary(r, name) {
    var err = needCitizen(r, name); if (err) return err;
    var c = citizen(r, name);
    var today = dayKey(now());
    if (c.lastSalary === today) return "오늘 월급은 이미 받았어요. 내일 다시 받을 수 있어요.";
    var def = CONFIG.roles[c.role] || CONFIG.roles[CONFIG.defaultRole];
    var amount = def ? def.salary : 0;
    c.lastSalary = today;
    c.balance += amount;
    addLedger(r, "국고", name, amount, "월급");
    return "💼 " + c.role + " " + name + "님 오늘의 월급 " + money(amount) + " 지급!\n잔고: " + money(c.balance);
  }

  function richList(r) {
    var names = Object.keys(r.citizens);
    if (!names.length) return "아직 국민이 없어요.";
    names.sort(function (a, b) { return r.citizens[b].balance - r.citizens[a].balance; });
    return "🏆 재산 순위\n" + names.slice(0, 10).map(function (n, i) {
      return (i + 1) + ". " + n + " · " + money(r.citizens[n].balance);
    }).join("\n");
  }

  /* --- 출석 --- */
  function attend(r, name) {
    var err = needCitizen(r, name); if (err) return err;
    var c = citizen(r, name);
    var today = dayKey(now());
    var list = r.attendance[today] || (r.attendance[today] = []);
    if (c.attend.last === today) return name + "님은 오늘 이미 출석했어요. (오늘 " + (list.indexOf(name) + 1) + "번째)";
    c.attend.streak = c.attend.last && daysBetween(c.attend.last, today) === 1 ? c.attend.streak + 1 : 1;
    c.attend.total += 1;
    c.attend.last = today;
    list.push(name);
    c.balance += CONFIG.attendanceReward;
    addLedger(r, "국고", name, CONFIG.attendanceReward, "출석 보상");
    for (var day in r.attendance) if (daysBetween(day, today) > 30) delete r.attendance[day];
    return "✅ " + name + "님 출석! 오늘 " + list.length + "번째 · 누적 " + c.attend.total + "일 · 연속 " + c.attend.streak + "일\n출석 보상 " + money(CONFIG.attendanceReward);
  }

  function attendanceToday(r) {
    var list = r.attendance[dayKey(now())] || [];
    var all = Object.keys(r.citizens);
    var missing = all.filter(function (n) { return list.indexOf(n) < 0; });
    return "📋 오늘 출석 " + list.length + "명 / 국민 " + all.length + "명" +
      (list.length ? "\n출석: " + list.join(", ") : "") +
      (missing.length ? "\n미출석: " + missing.join(", ") : "");
  }

  /* --- 국가 정보 · 공지 --- */
  function nationInfo(r) {
    var leaders = [];
    for (var role in CONFIG.roles) {
      if (role === CONFIG.defaultRole) continue;
      var h = holders(r, role);
      if (h.length) leaders.push(role + ": " + h.join(", "));
    }
    var total = 0;
    for (var n in r.citizens) total += r.citizens[n].balance;
    return "🏛️ " + CONFIG.nation.name + "\n\"" + CONFIG.nation.motto + "\"\n" +
      "건국 " + CONFIG.nation.founded + " · 국민 " + Object.keys(r.citizens).length + "명\n" +
      "화폐 " + CONFIG.nation.currency + " · 총 유통량 " + money(total) +
      (leaders.length ? "\n\n[주요 관직]\n" + leaders.join("\n") : "");
  }

  function constitution() {
    return "📜 " + CONFIG.nation.name + " 헌법\n" + CONFIG.nation.constitution.join("\n");
  }

  function notices(r) {
    if (!r.notices.length) return "등록된 공지가 없어요.";
    return "📢 공지사항\n" + r.notices.map(function (n, i) {
      return (i + 1) + ". " + n.text + "  (" + n.by + ", " + n.day + ")";
    }).join("\n");
  }

  function addNotice(r, name, text) {
    if (!can(r, name, "notice")) return deny();
    if (!text) return "사용법: !공지등록 내용";
    r.notices.push({ text: text.slice(0, 300), by: name, day: dayKey(now()) });
    if (r.notices.length > 20) r.notices.shift();
    return "📢 공지를 등록했어요. (" + r.notices.length + "번)";
  }

  function removeNotice(r, name, numText) {
    if (!can(r, name, "notice")) return deny();
    var i = parseInt(numText, 10) - 1;
    if (!(i >= 0 && i < r.notices.length)) return "사용법: !공지삭제 번호  (번호는 !공지 에서 확인)";
    r.notices.splice(i, 1);
    return "🗑️ " + (i + 1) + "번 공지를 삭제했어요.";
  }

  /* --- 관직 --- */
  function roleList(r) {
    var lines = [];
    for (var role in CONFIG.roles) {
      var def = CONFIG.roles[role];
      var h = role === CONFIG.defaultRole ? [] : holders(r, role);
      lines.push("· " + role + " (월급 " + money(def.salary) + (def.max ? ", 정원 " + def.max + "명" : "") + ")" + (h.length ? " — " + h.join(", ") : ""));
    }
    return "🎖️ 관직 목록\n" + lines.join("\n");
  }

  function appoint(r, name, target, role) {
    if (!can(r, name, "appoint")) return deny();
    if (!target || !role) return "사용법: !관직임명 닉네임 관직명";
    var def = CONFIG.roles[role];
    if (!def) return "'" + role + "' 관직은 없어요. !관직목록 을 확인해 주세요.";
    var c = citizen(r, target);
    if (!c) return target + "님은 국민이 아니에요.";
    if (def.max && holders(r, role).length >= def.max && c.role !== role) return role + " 정원(" + def.max + "명)이 가득 찼어요. 먼저 해임해 주세요.";
    c.role = role;
    return "🎖️ " + target + "님을 " + role + "(으)로 임명했어요.";
  }

  function dismiss(r, name, target) {
    if (!can(r, name, "appoint")) return deny();
    var c = citizen(r, target);
    if (!c) return "사용법: !관직해임 닉네임";
    var old = c.role;
    c.role = CONFIG.defaultRole;
    return "📄 " + target + "님을 " + old + "에서 해임했어요.";
  }

  /* --- 투표 --- */
  function pollCreate(r, name, body) {
    if (!can(r, name, "vote")) return deny();
    if (r.poll && r.poll.open) return "이미 진행 중인 투표가 있어요. !투표종료 후 새로 만들어 주세요.";
    var parts = String(body || "").split("|").map(function (s) { return s.trim(); }).filter(function (s) { return s; });
    if (parts.length < 3) return "사용법: !투표생성 제목 | 항목1 | 항목2 | ...";
    r.poll = { open: true, title: parts[0], options: parts.slice(1, 11), votes: {}, by: name, day: dayKey(now()) };
    return "🗳️ 투표 시작: " + r.poll.title + "\n" + r.poll.options.map(function (o, i) { return (i + 1) + ". " + o; }).join("\n") + "\n\n!투표 번호 로 참여하세요. (국민 1인 1표)";
  }

  function pollTally(p) {
    var counts = p.options.map(function () { return 0; });
    for (var v in p.votes) counts[p.votes[v]] += 1;
    return counts;
  }

  function pollStatus(r) {
    var p = r.poll;
    if (!p) return "진행 중인 투표가 없어요.";
    var counts = pollTally(p);
    var total = Object.keys(p.votes).length;
    return "🗳️ " + p.title + (p.open ? " (진행 중)" : " (종료)") + "\n" + p.options.map(function (o, i) {
      return (i + 1) + ". " + o + " — " + counts[i] + "표";
    }).join("\n") + "\n총 " + total + "명 참여";
  }

  function pollVote(r, name, numText) {
    var err = needCitizen(r, name); if (err) return err;
    var p = r.poll;
    if (!p || !p.open) return "진행 중인 투표가 없어요.";
    var i = parseInt(numText, 10) - 1;
    if (!(i >= 0 && i < p.options.length)) return "1~" + p.options.length + " 중에서 번호를 골라 주세요.";
    if (p.votes[name] !== undefined) return name + "님은 이미 투표했어요.";
    p.votes[name] = i;
    return "✔️ " + name + "님 투표 완료 (" + Object.keys(p.votes).length + "명 참여)";
  }

  function pollClose(r, name) {
    if (!can(r, name, "vote")) return deny();
    if (!r.poll || !r.poll.open) return "진행 중인 투표가 없어요.";
    r.poll.open = false;
    var counts = pollTally(r.poll);
    var best = Math.max.apply(null, counts);
    var winners = r.poll.options.filter(function (o, i) { return counts[i] === best; });
    return pollStatus(r) + "\n\n" + (best === 0 ? "투표한 사람이 없어요." : winners.length > 1 ? "동률: " + winners.join(", ") : "결과: " + winners[0]);
  }

  /* --- 선거 --- */
  function electionStart(r, name, role) {
    if (!can(r, name, "election")) return deny();
    if (r.election && r.election.open) return "이미 " + r.election.role + " 선거가 진행 중이에요.";
    if (!CONFIG.roles[role] || role === CONFIG.defaultRole) return "사용법: !선거시작 관직명  (예: !선거시작 대통령)";
    r.election = { open: true, role: role, candidates: [], votes: {}, day: dayKey(now()) };
    return "🗳️ " + role + " 선거가 시작됐어요!\n· 출마: !출마\n· 투표: !선거투표 후보닉네임\n· 현황: !선거현황";
  }

  function runFor(r, name) {
    var err = needCitizen(r, name); if (err) return err;
    var e = r.election;
    if (!e || !e.open) return "진행 중인 선거가 없어요.";
    if (e.candidates.indexOf(name) >= 0) return "이미 출마했어요.";
    e.candidates.push(name);
    return "📣 " + name + "님이 " + e.role + " 선거에 출마했어요! (후보 " + e.candidates.length + "명)";
  }

  function electionTally(e) {
    var counts = {};
    e.candidates.forEach(function (c) { counts[c] = 0; });
    for (var v in e.votes) counts[e.votes[v]] += 1;
    return counts;
  }

  function electionStatus(r) {
    var e = r.election;
    if (!e) return "진행 중인 선거가 없어요.";
    var counts = electionTally(e);
    return "🗳️ " + e.role + " 선거" + (e.open ? " (진행 중)" : " (종료)") + "\n" +
      (e.candidates.length ? e.candidates.map(function (c) { return "· " + c + " — " + counts[c] + "표"; }).join("\n") : "아직 후보가 없어요. !출마 로 나서 보세요.") +
      "\n총 " + Object.keys(e.votes).length + "명 투표";
  }

  function electionVote(r, name, candidate) {
    var err = needCitizen(r, name); if (err) return err;
    var e = r.election;
    if (!e || !e.open) return "진행 중인 선거가 없어요.";
    if (e.candidates.indexOf(candidate) < 0) return "후보가 아니에요. 후보: " + (e.candidates.join(", ") || "없음");
    if (e.votes[name] !== undefined) return name + "님은 이미 투표했어요.";
    e.votes[name] = candidate;
    return "✔️ " + name + "님 투표 완료 (" + Object.keys(e.votes).length + "명 참여)";
  }

  function electionClose(r, name) {
    if (!can(r, name, "election")) return deny();
    var e = r.election;
    if (!e || !e.open) return "진행 중인 선거가 없어요.";
    e.open = false;
    var counts = electionTally(e);
    var best = -1, winners = [];
    e.candidates.forEach(function (c) {
      if (counts[c] > best) { best = counts[c]; winners = [c]; } else if (counts[c] === best) winners.push(c);
    });
    var head = electionStatus(r) + "\n\n";
    if (!e.candidates.length || best <= 0) return head + "득표한 후보가 없어 당선자가 없어요.";
    if (winners.length > 1) return head + "동률(" + winners.join(", ") + ")이라 당선자를 정하지 못했어요. 재선거를 진행해 주세요.";
    var def = CONFIG.roles[e.role];
    var replaced = [];
    if (def.max && holders(r, e.role).length >= def.max) {
      holders(r, e.role).forEach(function (h) { r.citizens[h].role = CONFIG.defaultRole; replaced.push(h); });
    }
    r.citizens[winners[0]].role = e.role;
    return head + "🎉 " + winners[0] + "님이 " + e.role + "에 당선됐어요! (" + best + "표)" +
      (replaced.length ? "\n이전 " + e.role + ": " + replaced.join(", ") + " → " + CONFIG.defaultRole : "");
  }

  /* --- 메시지 요약 --- */
  function remember(r, name, text) {
    r.seq += 1;
    r.log.push({ n: r.seq, t: now(), s: name, m: String(text).slice(0, 500) });
    if (r.log.length > CONFIG.summary.keepMessages) r.log.splice(0, r.log.length - CONFIG.summary.keepMessages);
  }

  function summarize(r, name, countText) {
    var cfg = CONFIG.summary;
    if (!cfg.enabled) return "요약 기능이 꺼져 있어요.";
    var count = parseInt(countText, 10);
    var since = r.lastSpoke[name] || 0;
    var rows = count > 0 ? r.log.slice(-Math.min(count, cfg.maxLines))
      : r.log.filter(function (x) { return x.n > since; }).slice(-cfg.maxLines);
    if (!(count > 0) && !since) rows = r.log.slice(-50);
    if (rows.length < 3) return "요약할 대화가 별로 없어요. (" + rows.length + "개)";
    if (!cfg.apiKey || !http) return "요약 기능이 아직 설정되지 않았어요. 운영자에게 API 키 설정을 요청해 주세요.";
    var transcript = rows.map(function (x) { return "[" + timeText(x.t) + "] " + x.s + ": " + x.m; }).join("\n").slice(-8000);
    var body = JSON.stringify({
      model: cfg.model,
      instructions: "너는 카카오톡 단체방 대화를 요약하는 비서야. 아래 대화를 한국어로 5줄 이내의 글머리표로 요약해. 누가 무엇을 말했고 무엇이 결정됐는지 중심으로 쓰고, 대화에 없는 내용은 지어내지 마. 마크다운 굵은 글씨는 쓰지 마.",
      input: transcript,
      max_output_tokens: 400,
      store: false
    });
    try {
      var raw = http.post("https://api.openai.com/v1/responses", { "Authorization": "Bearer " + cfg.apiKey, "Content-Type": "application/json" }, body);
      var data = JSON.parse(raw);
      var text = "";
      (data.output || []).forEach(function (item) {
        (item.content || []).forEach(function (part) { if (part.type === "output_text") text += part.text || ""; });
      });
      text = text.trim();
      if (!text) return "요약을 만들지 못했어요. 잠시 후 다시 시도해 주세요.";
      return "📝 " + name + "님이 안 보는 동안 (" + rows.length + "개 대화, " + timeText(rows[0].t) + "~" + timeText(rows[rows.length - 1].t) + ")\n" + text;
    } catch (e) {
      return "요약 중 오류가 났어요. 잠시 후 다시 시도해 주세요.";
    }
  }

  /* --- 도움말 --- */
  function help(r, name) {
    // 휴대폰에서 줄 중간이 끊기지 않도록 한 줄을 짧게 유지한다.
    var lines = [
      "🏛️ " + CONFIG.nation.name + " 명령어",
      "",
      "[국민]",
      "!국민등록 · !신분증",
      "!국민목록",
      "",
      "[돈]",
      "!잔고 · !월급 · !재산순위",
      "!송금 닉네임 금액",
      "",
      "[출석] !출석 · !출석현황",
      "",
      "[나라]",
      "!국가정보 · !헌법",
      "!공지 · !관직목록",
      "",
      "[투표] !투표현황 · !투표 번호",
      "",
      "[선거]",
      "!선거현황 · !출마",
      "!선거투표 후보",
      "",
      "[요약]",
      "!요약 → 내가 마지막으로 말한 뒤",
      "!요약 100 → 최근 100개"
    ];
    var admin = [];
    if (can(r, name, "notice")) admin.push("!공지등록 내용", "!공지삭제 번호");
    if (can(r, name, "money")) admin.push("!지급 닉네임 금액", "!회수 닉네임 금액");
    if (can(r, name, "appoint")) admin.push("!관직임명 닉네임 관직", "!관직해임 닉네임");
    if (can(r, name, "vote")) admin.push("!투표생성 제목|항목|항목", "!투표종료");
    if (can(r, name, "election")) admin.push("!선거시작 관직", "!선거종료");
    if (admin.length) lines.push("", "[관리 · 내 권한]", admin.join("\n"));
    return lines.join("\n");
  }

  /* --- 라우팅 --- */
  function route(r, name, msg) {
    var parts = msg.split(/\s+/);
    var rest = msg.slice(parts[0].length).trim();
    // "닉네임(공백 가능) 마지막값" 형태: 닉네임에 띄어쓰기가 있어도 마지막 단어만 따로 뗀다.
    var cut = rest.lastIndexOf(" ");
    var head = cut > 0 ? rest.slice(0, cut).trim() : "";
    var last = cut > 0 ? rest.slice(cut + 1) : rest;
    switch (parts[0]) {
      case "!도움말": case "!명령어": return help(r, name);
      case "!국민등록": return register(r, name);
      case "!신분증": case "!국민증": return idCard(r, name, rest);
      case "!국민목록": return citizenList(r);
      case "!잔고": case "!지갑": return balance(r, name, rest);
      case "!송금": return transfer(r, name, head, last);
      case "!월급": return salary(r, name);
      case "!재산순위": return richList(r);
      case "!지급": return grant(r, name, head, last, 1);
      case "!회수": return grant(r, name, head, last, -1);
      case "!출석": return attend(r, name);
      case "!출석현황": return attendanceToday(r);
      case "!국가정보": return nationInfo(r);
      case "!헌법": return constitution();
      case "!공지": return notices(r);
      case "!공지등록": return addNotice(r, name, rest);
      case "!공지삭제": return removeNotice(r, name, parts[1]);
      case "!관직목록": return roleList(r);
      case "!관직임명": return appoint(r, name, head, last);
      case "!관직해임": return dismiss(r, name, rest);
      case "!투표생성": return pollCreate(r, name, rest);
      case "!투표": return pollVote(r, name, parts[1]);
      case "!투표현황": return pollStatus(r);
      case "!투표종료": return pollClose(r, name);
      case "!선거시작": return electionStart(r, name, parts[1]);
      case "!출마": return runFor(r, name);
      case "!선거투표": return electionVote(r, name, rest);
      case "!선거현황": return electionStatus(r);
      case "!선거종료": return electionClose(r, name);
      case "!요약": return summarize(r, name, parts[1]);
    }
    return null;
  }

  function handle(roomName, text, sender) {
    var msg = String(text || "").trim();
    var name = String(sender || "").trim();
    if (!name || !msg) return null;
    var r = store.room(roomName);
    var reply = null;
    try {
      if (msg.charAt(0) === "!") {
        reply = route(r, name, msg);
      } else {
        remember(r, name, msg);
      }
    } finally {
      if (msg.charAt(0) !== "!") r.lastSpoke[name] = r.seq;
      store.save();
    }
    return reply;
  }

  return { handle: handle };
}

/* ===== 메신저봇R 연결 ===== */
var BOT = null;

function jsoupPost(url, headers, body) {
  var conn = org.jsoup.Jsoup.connect(url)
    .ignoreContentType(true)
    .ignoreHttpErrors(true)
    .timeout(20000)
    .method(org.jsoup.Connection.Method.POST)
    .requestBody(body);
  for (var k in headers) conn = conn.header(k, headers[k]);
  return String(conn.execute().body());
}

function response(room, msg, sender, isGroupChat, replier, imageDB, packageName) {
  if (!isGroupChat) return;
  if (CONFIG.rooms.length && CONFIG.rooms.indexOf(room) < 0) return;
  if (!BOT) {
    BOT = createBot({
      read: function (path) { return FileStream.read(path); },
      write: function (path, text) { FileStream.write(path, text); }
    }, null, { post: jsoupPost });
  }
  var reply = BOT.handle(room, msg, sender);
  if (reply) replier.reply(reply);
}

/* Node 테스트용 (메신저봇R에서는 무시됨) */
if (typeof module !== "undefined" && module.exports) {
  module.exports = { createBot: createBot, CONFIG: CONFIG };
}
