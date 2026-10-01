import json,os,html
U=json.load(open(os.environ['CH_URLS'])) if os.environ.get('CH_URLS') else {}
F="font-family:'Nanum Myeongjo','Noto Serif KR','Batang',serif;"
P="background:#efe4cc;color:#3b2f22;border:1px solid #c9b48a;border-radius:6px;box-shadow:inset 0 0 40px rgba(110,80,30,0.22);padding:22px;margin-top:14px;"
H=lambda t,s:f'<p style="font-size:11px;letter-spacing:0.4em;color:#9b2c22;margin:0 0 4px;">{s}</p><p style="font-size:21px;margin:0 0 14px;color:#2a1f14;"><b>{t}</b></p>'
modes=[('壹','오리지널','이름 없는 수졸, 떠돌이 협객, 소금 상인, 무명의 책사. 당신이 만든 인물로 난세에 뛰어든다.'),('貳','실존 인물','한신이 되어 가랑이 밑을 기거나, 장량이 되어 천 리 밖을 내다보거나, 우희가 되어 패왕의 곁을 지킨다.'),('參','빙의 · 회귀','결말을 아는 현대인으로 깨어난다. 하지만 역사를 바꿀수록 당신의 지식은 맞지 않게 된다.')]
tl=[('BC 209','대택향의 비 — "왕후장상의 씨가 따로 있겠는가"'),('BC 207','거록 — 솥을 깨고 배를 가라앉히다'),('BC 206','홍문연 — 칼춤이 시작되다'),('BC 206','한신, 대장군의 단에 오르다'),('BC 205','팽성 — 3만이 56만을 무너뜨리다'),('BC 204','배수진 — 강을 등지고 싸우다'),('BC 203','홍구 — 천하를 반으로 나누다'),('BC 202','해하 — 사방에서 초나라 노래가')]
ppl=[('hangwu','항우','서초패왕','"하늘이 나를 버린 것이다."'),('liubang','유방','패공 · 한왕','"자네 말이 옳네. 그리하지."'),('hanxin','한신','대장군','"다다익선이라 하였소."'),('zhangliang','장량','책사 · 자방','"기다리면 저쪽이 먼저 움직입니다."'),('xiaohe','소하','승상','"한신 같은 이는 나라에 둘이 없습니다."'),('fanzeng','범증','아부','"어린놈과는 일을 도모할 수 없구나!"'),('yuji','우희','우미인','"장군이 가시는 곳이 곧 첩의 자리입니다."'),('lvzhi','여치','패공의 아내','"살아남은 자가 옳은 것입니다."')]
def ph(k,n):
    u=U.get(k)
    return f'<img src="{u}" style="width:100%;aspect-ratio:3/4;object-fit:cover;object-position:center top;display:block;">' if u else f'<div style="width:100%;aspect-ratio:3/4;background:#ddcba5;display:flex;align-items:center;justify-content:center;font-size:30px;color:#9b7f55;">{n[0]}</div>'
cards=''.join(f'<div style="flex:1 1 150px;max-width:170px;background:#f6edda;border:1px solid #d3bf95;padding:6px;">{ph(k,n)}<p style="margin:6px 0 0;font-size:15px;"><b>{n}</b> <span style="font-size:11px;color:#8a7352;">{t}</span></p><p style="margin:3px 0 2px;font-size:12px;color:#9b2c22;line-height:1.5;">{html.escape(q)}</p></div>' for k,n,t,q in ppl)
h=f'''<div style="max-width:760px;margin:0 auto;background:#1c1712;{F}padding:16px;border-radius:8px;">

<div style="{P}text-align:center;padding:34px 22px;">
{('<img src="'+U['hero']+'" style="width:100%;max-height:420px;object-fit:cover;display:block;margin:0 0 22px;border-radius:4px;">') if U.get('hero') else ''}
<p style="font-size:12px;letter-spacing:0.6em;color:#9b2c22;margin:0;">天 下 爭 霸</p>
<p style="font-size:44px;letter-spacing:0.25em;margin:8px 0 4px;color:#2a1f14;">楚 漢 志</p>
<p style="font-size:15px;letter-spacing:0.3em;color:#6b5638;margin:0 0 18px;">초 한 지 　 천 하 쟁 패 　 시 뮬 레 이 터</p>
<p style="font-size:15px;line-height:2;margin:0;">진시황이 죽었다. 천하가 들끓는다.<br>패현의 건달이, 회계의 명문가 청년이, 그리고 이름 없는 수많은 사람이 칼을 든다.<br><b>이번 천하는, 누구의 것이 될 것인가.</b></p>
<div style="display:inline-block;margin-top:18px;border:2px solid #9b2c22;color:#9b2c22;padding:5px 10px;font-size:13px;transform:rotate(-3deg);">BC 210 ~ BC 202</div>
</div>

<div style="{P}">
{H('세 가지 길','三 道')}
<div style="display:flex;flex-wrap:wrap;gap:10px;">{''.join(f'<div style="flex:1 1 200px;background:#f6edda;border:1px solid #d3bf95;padding:14px;"><span style="color:#9b2c22;font-size:18px;">{a}</span> <b style="font-size:16px;">{b}</b><p style="margin:8px 0 0;font-size:13px;line-height:1.75;">{c}</p></div>' for a,b,c in modes)}</div>
</div>

<div style="{P}">
{H('난세의 연표','年 表')}
<div style="border-left:2px solid #9b2c22;margin-left:6px;padding-left:16px;">{''.join(f'<p style="margin:0 0 10px;font-size:14px;line-height:1.6;"><span style="display:inline-block;width:62px;color:#9b2c22;font-size:12px;">{y}</span>{html.escape(e)}</p>' for y,e in tl)}</div>
<p style="margin:10px 0 0;font-size:12px;color:#7a6548;">역사는 당신이 손대지 않으면 이대로 흐른다. 손을 대는 순간, 아무도 결말을 모른다.</p>
</div>

<div style="{P}">
{H('난세의 영웅들','英 雄')}
<div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center;">{cards}</div>
<p style="margin:12px 0 0;font-size:12px;color:#7a6548;">그 밖에 진평·번쾌·영포·팽월·종리매·장한·괴통… 50명이 넘는 실존 인물과 이름 없는 백성들이 저마다의 사정으로 살아간다.</p>
</div>

<div style="{P}">
{H('시작하는 세 장면','序 章')}
{''.join(f'<div style="background:#f6edda;border:1px solid #d3bf95;padding:13px 15px;margin-bottom:8px;"><span style="font-size:11px;color:#9b2c22;letter-spacing:0.15em;">{a}</span><br><b style="font-size:16px;">{b}</b><br><span style="font-size:13px;line-height:1.75;">{c}</span></div>' for a,b,c in [('BC 209 · 가을','EP.01 — 대택향의 비','기한에 늦으면 모두 참수. 진승이 일어서고, 칼이 진흙 위에 떨어진다.'),('BC 206 · 겨울','EP.02 — 홍문연','범증이 옥결을 세 번 들어 올린다. 항장의 칼춤이 패공에게 다가간다.'),('BC 202 · 겨울','EP.03 — 사면초가','포위된 해하의 밤, 사방에서 고향의 노래가 들려온다.')])}
</div>

<div style="{P}">
{H('천하를 다투는 법','兵 法')}
<div style="display:flex;flex-wrap:wrap;gap:8px;font-size:13px;line-height:1.7;">
<div style="flex:1 1 200px;"><b>⚔ 병력과 군량</b><br>군량이 떨어지면 병사는 떠난다. 행군은 날수로 계산된다.</div>
<div style="flex:1 1 200px;"><b>📜 명성</b><br>덕망·무용·지략. 이름이 높아지면 인재가 찾아온다.</div>
<div style="flex:1 1 200px;"><b>🤝 인연</b><br>은혜와 원한은 쌓인다. 항우도 유방도 당신을 기억한다.</div>
<div style="flex:1 1 200px;"><b>🔥 역사 변동도</b><br>정사를 얼마나 바꿨는가. 높아질수록 아무도 모르는 천하가 된다.</div>
</div>
<p style="margin:12px 0 0;font-size:12px;color:#7a6548;">선택지는 예시일 뿐, 원하는 행동을 직접 적으면 된다. 상태창에 연도·위치·병력·군량·명성·천하의 정세가 표시된다.</p>
</div>

<div style="background:#7d231b;color:#f3e6cf;border-radius:6px;padding:30px 20px;margin-top:14px;text-align:center;">
<p style="font-size:24px;line-height:1.6;margin:0;"><b>힘은 산을 뽑고, 기개는 세상을 덮었으나<br>— 이번에는, 다르게 끝날 수도 있다.</b></p>
<p style="font-size:12px;letter-spacing:0.3em;margin:14px 0 0;opacity:.8;">모든 등장인물은 성인입니다</p>
</div>

</div>'''
open(os.environ.get('CH_OUT','/home/user/claude-2/chohan/소개페이지.txt'),'w').write(h); print(len(h))
