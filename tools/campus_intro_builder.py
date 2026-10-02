import json,os,html
U=json.load(open(os.environ['CP_URLS'])) if os.environ.get('CP_URLS') else {}
F="font-family:'Pretendard','Noto Sans KR',sans-serif;"
P="background:#fffaf7;color:#2a2633;border:1px solid #f0dfe6;border-radius:18px;padding:22px;margin-top:14px;"
H=lambda t,s:f'<p style="font-size:11px;letter-spacing:0.35em;color:#ff5d8f;font-weight:700;margin:0 0 4px;">{s}</p><p style="font-size:21px;margin:0 0 14px;font-weight:800;">{t}</p>'
ppl=[('harin','백하린','경영 3 · 총학 부회장','"…이건 비밀이야. 나 오늘 세 시간 잤어."','#7c5cff'),('yuri','도유리','미컴 1 · 과대 · 동기','"너 내 옆자리 앉아! 출석 메이트임."','#ff9f1c'),('jian','서지안','시디 4 · 사진동아리','"움직이지 마. 빛 좋다, 지금."','#3d3d4e'),('arin','민아린','연영 2 · 인플루언서','"쌩얼인데 사진 찍으면 죽어요."','#ff5d8f'),('sena','강세나','체교 3 · 수영부','"너 몇 바퀴 돌 수 있어? 내기하자."','#1fa2ff'),('sohee','윤소희','국문 대학원 · 조교','"각주 틀렸어요. 이 문장은 좋았고요."','#6b8f71'),('doa','이도아','실음 1 · 옆집','"혹시 소리 시끄러웠어요…?"','#c17bd6')]
def ph(k,n,c):
    u=U.get(k)
    return f'<img src="{u}" style="width:100%;aspect-ratio:3/4;object-fit:cover;object-position:center top;display:block;border-radius:12px;">' if u else f'<div style="width:100%;aspect-ratio:3/4;background:{c};border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:30px;color:#fff;font-weight:800;">{n[1:]}</div>'
cards=''.join(f'<div style="flex:1 1 140px;max-width:165px;background:#fff;border:1px solid #f0dfe6;border-radius:14px;padding:6px;">{ph(k,n,c)}<p style="margin:6px 2px 0;font-size:15px;"><b>{n}</b></p><p style="margin:0 2px;font-size:11px;color:#8a8399;">{t}</p><p style="margin:4px 2px 2px;font-size:12px;color:{c};line-height:1.5;">{html.escape(q)}</p></div>' for k,n,t,q,c in ppl)
cal=[('3/2','개강'),('3/12','개강총회'),('3/27','과 MT'),('4월 초','벚꽃 봄길'),('4/20','중간고사'),('5/6','체육대회'),('5/19','대동제'),('6/10','기말고사'),('6/19','종강파티')]
cmds=[('/에타','익명 게시판 HOT 글'),('/인스타','@seoha.daily 제보'),('/톡','최근 개인톡'),('/단톡','과 단톡방'),('/시간표','이번 학기 수업'),('/지갑','잔고와 지출'),('/캘린더','이번 달 일정'),('/프로필 이름','호감·속마음 카드')]
eps=[('3/3 · 개강 2일차','EP.01 — 옆자리','빈자리는 둘. 총학 부회장의 옆, 혹은 손 흔드는 과대의 옆. 앉은 자리가 한 학기 팀플 조가 된다.'),('3/27 · 과 MT','EP.02 — MT의 밤','진실게임 병목이 당신 앞에서 멈췄다. "이 중에 마음에 드는 사람, 있다 없다?"'),('5/21 · 대동제 마지막 날','EP.03 — 축제 마지막 날','불꽃 10분 전, 톡이 세 개 왔다. 갈 수 있는 곳은 한 곳뿐.')]
hero=f'<img src="{U["hero"]}" style="width:100%;max-height:420px;object-fit:cover;display:block;margin:0 0 20px;border-radius:14px;">' if U.get('hero') else ''
h=f'''<div style="max-width:760px;margin:0 auto;background:linear-gradient(170deg,#1b1d2b,#2b2140);{F}padding:16px;border-radius:22px;">

<div style="{P}text-align:center;padding:30px 22px;">
{hero}<p style="font-size:11px;letter-spacing:0.5em;color:#ff5d8f;font-weight:700;margin:0;">SEOHA UNIVERSITY · 2026 SPRING</p>
<p style="font-size:44px;font-weight:900;letter-spacing:-1px;margin:8px 0 2px;">서하대학교</p>
<p style="font-size:14px;color:#8a8399;margin:0 0 16px;">캠퍼스 라이프 시뮬레이터</p>
<p style="font-size:15px;line-height:2;margin:0;">벚꽃 오르막, 24시 도서관, 과 단톡방, 에타 HOT게시판.<br>3월 2일 개강부터 6월 19일 종강까지 딱 16주.<br><b>누구 옆자리에 앉을지는, 당신이 정한다.</b></p>
<div style="display:inline-block;margin-top:16px;background:#ff5d8f;color:#fff;padding:6px 16px;border-radius:20px;font-size:13px;font-weight:700;">D-DAY 3월 2일 개강 🌸</div>
</div>

<div style="{P}">
{H('이번 학기, 그녀들','HEROINES')}
<div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center;">{cards}</div>
<p style="font-size:12px;color:#8a8399;margin:12px 0 0;">모두가 숨긴 이야기가 하나씩 있다. 호감도 0 → 아는 사이 → 친구 → 썸 → 연인. 여러 명과 썸을 타면 에타가 먼저 안다.</p>
</div>

<div style="{P}">
{H('한 학기 캘린더','SCHEDULE')}
<div style="display:flex;flex-wrap:wrap;gap:6px;">{''.join(f'<div style="flex:1 1 90px;background:#fff;border:1px solid #f0dfe6;border-radius:12px;padding:8px;text-align:center;"><div style="font-size:11px;color:#ff5d8f;font-weight:700;">{a}</div><div style="font-size:13px;">{b}</div></div>' for a,b in cal)}</div>
</div>

<div style="{P}">
{H('시작하는 세 장면','EPISODES')}
{''.join(f'<div style="background:#fff;border:1px solid #f0dfe6;border-left:4px solid #ff5d8f;border-radius:12px;padding:12px 14px;margin-bottom:8px;"><div style="font-size:11px;color:#ff5d8f;font-weight:700;">{a}</div><div style="font-size:16px;font-weight:800;margin:2px 0;">{b}</div><div style="font-size:13px;line-height:1.7;">{c}</div></div>' for a,b,c in eps)}
</div>

<div style="{P}background:#1e1f2b;color:#eef;border-color:#3a3550;">
{H('<span style="color:#fff;">폰을 열면</span>','COMMANDS')}
<div style="display:flex;flex-wrap:wrap;gap:8px;">{''.join(f'<div style="flex:1 1 150px;background:rgba(255,255,255,0.07);border-radius:12px;padding:9px 12px;"><b style="color:#ffd166;">{a}</b><div style="font-size:12px;color:#c9c3e8;">{b}</div></div>' for a,b in cmds)}</div>
<p style="font-size:12px;color:#a9a3c8;margin:12px 0 0;">명령어만 입력하면 앱 화면이 뜹니다. 그동안 시간은 멈춰 있어요.</p>
</div>

<div style="{P}text-align:center;">
<p style="font-size:15px;line-height:2;margin:0;">잔고 320,000원. 인싸력 10. 연애 상태 <b>솔로</b>.<br>그리고 아직 아무도 모르는 당신의 이름.</p>
<a href="https://caveduck.io/ko/world-scenario-info/0ac192b5-c5ae-4d4f-9d00-15ae974e7984" target="_blank" style="display:inline-block;margin-top:14px;background:#ff5d8f;color:#fff;text-decoration:none;padding:9px 20px;border-radius:22px;font-size:14px;font-weight:700;">🗺 서하대학교 세계관 보러 가기 →</a>
<p style="font-size:12px;color:#8a8399;margin:12px 0 0;">모든 등장인물은 성인입니다 · 실존 인물·학교와 무관한 가상 세계입니다</p>
</div>

</div>'''
open(os.environ.get('CP_OUT','/home/user/claude-2/campus/소개페이지.txt'),'w').write(h); print(len(h))
