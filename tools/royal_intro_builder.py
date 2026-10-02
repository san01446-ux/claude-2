import json,os,html
U=json.load(open(os.environ['RY_URLS'])) if os.environ.get('RY_URLS') else {}
F="font-family:'Noto Serif KR','Nanum Myeongjo',serif;"
P="background:#faf6ee;color:#2b2a33;border:1px solid #d9c9a3;border-radius:8px;padding:22px;margin-top:14px;"
H=lambda t,s:f'<p style="font-size:11px;letter-spacing:0.4em;color:#a8842f;margin:0 0 4px;">{s}</p><p style="font-size:21px;margin:0 0 14px;color:#1d2340;"><b>{t}</b></p>'
routes=[('A','평범한 시민','사진 한 장으로 하룻밤 사이 전국에서 가장 유명한 사람이 된다.'),('B','궁내청 신입','첫 출근날부터 황실의 스캔들을 막아야 한다.'),('C','황실경호대','왕관을 쓴 사람의 가장 가까운 그림자.'),('D','기자','특종과 양심, 그리고 7년 전 사고의 의문.'),('E','정략혼 후보','재벌가의 이름으로 궁에 들어간다. 사랑은 계약서에 없다.')]
ppl=[('geon','이건','황태자 · 28','"…그쪽은 내가 누군지 알고도 그렇게 말하는 겁니까."'),('hayun','이하윤','제1황녀 · 26','"궁 밖에서 떡볶이 사 줄 사람? 경호대 몰래."'),('seojin','윤서진','궁내청 홍보실 · 29','"보도자료 3분 안에 나갑니다."'),('taeo','강태오','경호팀장 · 33','"물러서십시오. 여기서부터는 제가 갑니다."'),('sera','한세라','한성그룹 장녀 · 27','"제가 원하는 건 제 이름으로 된 설계도예요."'),('minhyuk','차민혁','대한일보 기자 · 31','"오프 더 레코드로 하죠. 아마도."'),('jeong','이정','의친왕 · 52','"용감함은 대개 비싸게 치이지요."'),('empress','백연화','황후 · 55','"궁은 마음을 묻지 않습니다."')]
def ph(k,n):
    u=U.get(k)
    return f'<img src="{u}" style="width:100%;aspect-ratio:3/4;object-fit:cover;object-position:center top;display:block;border-radius:4px;">' if u else f'<div style="width:100%;aspect-ratio:3/4;background:#1d2340;border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:30px;color:#c9a24a;">{n[1]}</div>'
cards=''.join(f'<div style="flex:1 1 150px;max-width:170px;background:#fff;border:1px solid #e4d8bc;border-radius:6px;padding:6px;">{ph(k,n)}<p style="margin:6px 0 0;font-size:15px;color:#1d2340;"><b>{n}</b> <span style="font-size:11px;color:#8a8696;">{t}</span></p><p style="margin:3px 0 2px;font-size:12px;color:#a3283a;line-height:1.5;">{html.escape(q)}</p></div>' for k,n,t,q in ppl)
eps=[('2026.10.05 · D-30','EP.01 — 플래시','약혼 발표 기자회견장, 무너진 바리케이드. 황태자의 손이 당신을 붙잡은 순간이 찍혔다.'),('2026.10.17 · D-18','EP.02 — 석조전의 왈츠','국빈 무도회의 첫 왈츠. 그리고 쓰러진 황녀.'),('2026.11.03 · D-1','EP.03 — 투표 전야','빗속의 낙선재, 끊어진 피아노 소리. 내일 아침 6시 전에 결정해야 한다.')]
sys_=[('황실 지지율','41%에서 시작. 50을 넘기면 존속, 35 아래면 폐지가 유력하다.'),('스캔들 지수','당신을 향한 카메라의 수. 높을수록 궁 문은 좁아진다.'),('출입 등급','일반 → 임시출입 → 상시출입 → 측근. 신뢰로만 오른다.'),('비밀 수첩','7년 전 요트 사고. 단서는 다섯 개, 진실은 하나.')]
hero=f'<img src="{U["hero"]}" style="width:100%;max-height:420px;object-fit:cover;display:block;margin:0 0 22px;border-radius:6px;">' if U.get('hero') else ''
h=f'''<div style="max-width:760px;margin:0 auto;background:#121628;{F}padding:16px;border-radius:10px;">

<div style="{P}text-align:center;padding:34px 22px;border-top:4px solid #c9a24a;">
{hero}<p style="font-size:12px;letter-spacing:0.6em;color:#a8842f;margin:0;">大 韓 帝 國 　 2 0 2 6</p>
<p style="font-size:40px;letter-spacing:0.2em;margin:10px 0 4px;color:#1d2340;">왕관의 무게</p>
<p style="font-size:14px;letter-spacing:0.3em;color:#6d6a78;margin:0 0 18px;">대 한 제 국 　 황 실 　 시 뮬 레 이 터</p>
<p style="font-size:15px;line-height:2;margin:0;">1910년, 나라는 망하지 않았다.<br>2026년 서울, 기와지붕 너머로 빌딩 불빛이 반짝이는 도시에 아직 황실이 산다.<br>그리고 30일 뒤, 이 나라는 황실을 끝낼지 투표한다.<br><b>카메라 플래시 한 번에, 당신은 그 한가운데에 서게 된다.</b></p>
<div style="display:inline-block;margin-top:18px;background:#1d2340;color:#f3e6c4;padding:6px 14px;font-size:13px;border-radius:3px;letter-spacing:0.15em;">국민투표 D-30 · 지지율 41%</div>
</div>

<div style="{P}">
{H('다섯 개의 입구','五 門')}
<div style="display:flex;flex-wrap:wrap;gap:10px;">{''.join(f'<div style="flex:1 1 200px;background:#fff;border:1px solid #e4d8bc;border-radius:6px;padding:12px 14px;"><span style="color:#a8842f;font-size:17px;font-weight:bold;">{a}</span> <b style="font-size:15px;color:#1d2340;">{b}</b><p style="margin:6px 0 0;font-size:13px;line-height:1.7;">{c}</p></div>' for a,b,c in routes)}</div>
<p style="font-size:12px;color:#8a8696;margin:12px 0 0;">페르소나에 적거나 첫 마디로 말하면 그 자리에서 시작합니다. 연애 상대는 남녀 모두 가능합니다.</p>
</div>

<div style="{P}">
{H('궁 안의 사람들','人 物')}
<div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center;">{cards}</div>
<p style="font-size:12px;color:#6d6a78;margin:12px 0 0;">그 밖에 황제 이원, 의친왕의 비서실장, 황실 폐지 운동의 국회의원, 파파라치와 유튜버까지. 모두가 무언가를 숨기고 있다.</p>
</div>

<div style="{P}">
{H('시작하는 세 장면','序 章')}
{''.join(f'<div style="background:#fff;border:1px solid #e4d8bc;border-left:3px solid #1d2340;border-radius:4px;padding:12px 14px;margin-bottom:8px;"><div style="font-size:11px;color:#a8842f;letter-spacing:0.15em;">{a}</div><div style="font-size:16px;color:#1d2340;margin:2px 0;"><b>{b}</b></div><div style="font-size:13px;line-height:1.7;">{c}</div></div>' for a,b,c in eps)}
</div>

<div style="{P}">
{H('궁에서 살아남는 법','規 則')}
<div style="display:flex;flex-wrap:wrap;gap:10px;">{''.join(f'<div style="flex:1 1 200px;background:#1d2340;color:#f3e6c4;border-radius:6px;padding:12px 14px;"><b style="color:#c9a24a;">{a}</b><p style="margin:6px 0 0;font-size:13px;line-height:1.7;">{b}</p></div>' for a,b in sys_)}</div>
</div>

<div style="{P}text-align:center;background:#1d2340;color:#f3e6c4;border-color:#c9a24a;">
<p style="font-size:16px;line-height:2;margin:0;">왕관을 지킬 것인가, 벗겨 줄 것인가.<br>아니면 — 7년 전의 진실을 세상에 내놓을 것인가.</p>
<p style="font-size:12px;letter-spacing:0.3em;color:#c9a24a;margin:14px 0 0;">모든 등장인물은 성인입니다 · 실존 인물·단체와 무관한 가상 세계입니다</p>
</div>

</div>'''
open(os.environ.get('RY_OUT','/home/user/claude-2/royal/소개페이지.txt'),'w').write(h); print(len(h))
