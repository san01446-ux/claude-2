import json,re,html
SHA="771d899c0f918e5ef4a0049783382ff0b7b60638"
IMG=f"https://raw.githubusercontent.com/san01446-ux/claude-2/{SHA}/images/wolyeong_cover.jpg"
L=[]
L=json.load(open('/home/user/claude-2/data/월영시_괴담100.json'))
L.sort(key=lambda x:x['n'])
def stars(c):
    m=re.search(r'위험도 (★+☆*)',c); return m.group(1) if m else '★★★'
def cat(c):
    m=re.search(r'\[[^·\]]+·\s*([^·\]]+?)\s*·',c); return m.group(1).strip() if m else ''
F="font-family:'Nanum Myeongjo','Noto Serif KR','Batang',serif;"
rows=[]
for x in L:
    n=x['n']
    if n>=99: rows.append(f'{n:03d}　■■■■■■　열람 제한')
    else: rows.append(f'{n:03d}　{html.escape(x["name"])}　{stars(x["c"])}')
import os
URL=json.load(open(os.environ.get('WY_URLS','/dev/null'))) if os.environ.get('WY_URLS') else {}
PEOPLE=[('seorin','한서린','27','괴담 전문 유튜버 · 밤의 서린','카메라부터 들이민다. 그녀가 찍은 괴담은 다음 날 더 선명해진다.'),
('daon','강다온','29','월하당 무당','부적값은 선불. 신당 안쪽 방에는 들어가지 말 것.'),
('yuna','차유나','31','특수괴이대응팀 경위','팀에 혼자 남았다. 그림자가 가끔 반 박자 늦게 돈다.'),
('sowol','백소월','24','달빛마트 야간 알바','"아~ 그거요." 어떤 괴담도 이 편의점 문턱은 넘지 못한다.'),
('haeri','윤해리','26','시립도서관 사서 · 괴이록 관리자','괴담의 규칙을 가장 많이 안다. 요즘 잠이 부족하다.')]
def card(key,name,age,job,line):
    u=URL.get(key)
    ph=(f'<img src="{u}" alt="" style="width:84px;height:112px;object-fit:cover;display:block;filter:grayscale(35%) contrast(1.05);">' if u else f'<div style="width:84px;height:112px;background:#1b1a1d;display:flex;align-items:center;justify-content:center;font-size:30px;color:#4d4640;">{name[0]}</div>')
    return f'<div style="display:flex;gap:14px;margin-top:14px;background:#121114;border:1px solid #2a2622;padding:12px;position:relative;"><div style="flex:none;border:1px solid #3a3530;padding:3px;background:#0b0b0e;">{ph}</div><div style="flex:1;min-width:0;"><div style="font-size:17px;color:#e8dfd0;">{name} <span style="font-size:13px;color:#8f877b;">({age})</span></div><div style="font-size:12px;color:#a3212b;letter-spacing:0.1em;margin:2px 0 6px;">{job}</div><div style="font-size:13px;color:#a8a095;line-height:1.7;">{line}</div></div><div style="position:absolute;right:10px;top:8px;border:1px solid #a3212b;color:#a3212b;font-size:10px;padding:0 5px;transform:rotate(6deg);opacity:0.8;">협조자</div></div>'
u=URL.get('storyteller')
sph=(f'<img src="{u}" alt="" style="width:84px;height:112px;object-fit:cover;display:block;filter:grayscale(80%) blur(1px);">' if u else '<div style="width:84px;height:112px;background:#140c0e;display:flex;align-items:center;justify-content:center;font-size:30px;color:#7a2a2a;">?</div>')
COVER=(f'<img src="{URL["cover"]}" alt="" style="display:block;width:100%;opacity:0.85;-webkit-mask-image:linear-gradient(#000 55%,transparent);mask-image:linear-gradient(#000 55%,transparent);">' if URL.get('cover') else '<div style="height:260px;background:radial-gradient(ellipse at 70% 20%,#5a1a20 0%,#1a1014 30%,#0b0b0e 70%);"></div>')
CARDS=''.join(card(*p) for p in PEOPLE)+f'<div style="display:flex;gap:14px;margin-top:14px;background:#140c0e;border:1px solid #5b2330;padding:12px;position:relative;"><div style="flex:none;border:1px solid #5b2330;padding:3px;">{sph}</div><div style="flex:1;"><div style="font-size:17px;color:#c9606a;">이야기꾼 <span style="font-size:13px;">(?)</span></div><div style="font-size:12px;color:#7a2a2a;letter-spacing:0.1em;margin:2px 0 6px;">신원 확인 불가 · 얼굴 확인 불가</div><div style="font-size:13px;color:#a36a70;line-height:1.7;">목격자마다 얼굴이 다르다. 공통점은 하나, 목격자가 가장 믿는 사람의 얼굴이었다는 것.</div></div><div style="position:absolute;right:10px;top:8px;border:1px solid #a3212b;color:#fff;background:#a3212b;font-size:10px;padding:0 5px;transform:rotate(6deg);">수배</div></div>'
h=f'''<div style="max-width:720px;margin:0 auto;background:#0b0b0e;color:#b9b3a8;{F}line-height:1.9;padding:0 0 48px;border:1px solid #1f1d1b;border-radius:4px;overflow:hidden;">

<div style="position:relative;">
{COVER}
<div style="position:absolute;left:0;right:0;bottom:18px;text-align:center;">
<div style="font-size:40px;letter-spacing:0.5em;color:#e9e2d4;text-shadow:0 0 18px #000,2px 0 0 rgba(163,33,43,0.6);">月影市</div>
<div style="font-size:13px;letter-spacing:0.4em;color:#8f877b;">괴 담 　 생 존 　 시 뮬 레 이 터</div>
</div></div>

<div style="padding:0 28px;">
<div style="text-align:center;margin-top:30px;font-size:15px;color:#8f877b;">
<p style="margin:0 0 20px;">이 도시에서는, 이야기가 현실이 된다.</p>
<p style="margin:0 0 20px;">빨간 마스크가 골목을 걷고, 팔척귀신이 담장 너머로 고개를 내민다.</p>
<p style="margin:0 0 20px;">막차는 가끔 노선도에 없는 역에 선다.</p>
<p style="margin:0;">사람들은 그것을 날씨처럼 받아들이며 산다.</p>
</div>

<div style="margin:40px auto 0;max-width:340px;background:#16161b;border:1px solid #2c2c35;border-radius:22px;padding:16px 16px 20px;box-shadow:0 10px 40px rgba(0,0,0,0.7);font-family:'Noto Sans KR',sans-serif;">
<div style="text-align:center;font-size:11px;color:#6d6d7a;margin-bottom:10px;">오후 7:00</div>
<div style="background:#26262e;border-radius:14px;padding:12px 14px;">
<div style="font-size:11px;color:#e25b5b;font-weight:bold;margin-bottom:4px;">⚠ 긴급재난문자</div>
<div style="font-size:13px;color:#e4e4ea;line-height:1.6;">[월영시청] 오늘 23:00~04:00 구시가지 일대 '빨간 마스크' 출현 예보. 외출 자제, 사탕 소지 권고. 질문에는 신중히 답하십시오.</div>
</div>
<div style="background:#26262e;border-radius:14px;padding:12px 14px;margin-top:8px;opacity:0.55;">
<div style="font-size:11px;color:#e25b5b;font-weight:bold;margin-bottom:4px;">⚠ 긴급재난문자</div>
<div style="font-size:13px;color:#e4e4ea;line-height:1.6;">[월영시청] 금일 막차 이용 시 안내 방송에 유의하십시오. 노선도에 없는 역에서는 하차하지 마십시오.</div>
</div>
<div style="background:#2a1418;border:1px solid #5b2330;border-radius:14px;padding:12px 14px;margin-top:8px;">
<div style="font-size:11px;color:#e25b5b;font-weight:bold;margin-bottom:4px;">⚠ 긴급재난문자</div>
<div style="font-size:13px;color:#f0c4c8;line-height:1.6;">[월영시청] 새로 전입하신 분께 알립니다. 이 문자를 받으셨다면, 당신은 이미 월영시민입니다.</div>
</div>
</div>

<div style="margin-top:56px;font-size:13px;letter-spacing:0.35em;color:#6b6258;border-bottom:1px solid #2a2622;padding-bottom:8px;">월 영 시 　 생 활 　 수 칙 　 <span style="font-size:11px;letter-spacing:0.1em;">(시청 배포)</span></div>
<div style="margin-top:18px;font-size:15px;">
<div style="margin-bottom:12px;"><span style="color:#a3212b;">一</span>　저녁 7시, 재난문자를 확인하십시오. 오늘 밤 무엇이 걸어 다닐지 알려 드립니다.</div>
<div style="margin-bottom:12px;"><span style="color:#a3212b;">二</span>　모든 괴담에는 규칙이 있습니다. 규칙을 지키면 살고, 어기면 대가를 치릅니다.</div>
<div style="margin-bottom:12px;"><span style="color:#a3212b;">三</span>　규칙을 모르겠다면, 도서관의 사서나 산 아래 무당, 경찰서 지하 2층을 찾으십시오.</div>
<div style="margin-bottom:12px;"><span style="color:#a3212b;">四</span>　골목 끝 24시 편의점 '달빛마트'는 안전합니다. 이유는 묻지 마십시오.</div>
<div style="margin-bottom:12px;"><span style="color:#a3212b;">五</span>　괴담을 함부로 이야기하거나 퍼뜨리지 마십시오. 믿는 사람이 많을수록 그것들은 강해집니다.</div>
<div style="margin-bottom:12px;"><span style="color:#a3212b;">六</span>　가장 믿음직한 사람이 "재밌는 얘기 하나 해 줄까?"라고 하면, 듣지 마십시오.</div>
<div><span style="color:#a3212b;">七</span>　당신의 이름이 재난문자에 뜨지 않도록 하십시오.</div>
</div>

<div style="margin-top:36px;font-size:14px;color:#8f877b;border-left:2px solid #a3212b;padding:4px 0 4px 14px;">
정해진 선택지는 없습니다. 문을 열지, 대답할지, 도망칠지는 전부 당신이 적어 넣으십시오.<br>
화면 위의 상태창이 정신력과 체력, 괴담 도감, 그리고 도시의 <span style="color:#d8c27a;">월영 지수</span>를 알려 줍니다.<br>
월영 지수가 100에 닿는 밤이 오지 않기를 바랍니다.
</div>

<div style="margin-top:56px;font-size:13px;letter-spacing:0.35em;color:#6b6258;border-bottom:1px solid #2a2622;padding-bottom:8px;">월 영 괴 이 록 　 목 차 　 <span style="font-size:11px;letter-spacing:0.1em;">(시립도서관 지하 고문서실 소장)</span></div>
<div style="margin-top:16px;background:#14120f;border:1px solid #2e2922;box-shadow:inset 0 0 40px rgba(0,0,0,0.8);padding:16px 20px;max-height:340px;overflow-y:auto;font-size:14px;line-height:1.7;color:#a89f90;">
{'<br>'.join(rows)}
</div>
<div style="text-align:center;font-size:12px;color:#5f574d;margin-top:10px;">종이 안에서 아래로 넘겨 읽으십시오. 총 100편. 마지막 두 편은 열람이 제한되어 있습니다.</div>

<div style="margin-top:56px;font-size:13px;letter-spacing:0.35em;color:#6b6258;border-bottom:1px solid #2a2622;padding-bottom:8px;">협 조 자 　 신 원 　 조 회 　 <span style="font-size:11px;letter-spacing:0.1em;">(특수괴이대응팀)</span></div>
{CARDS}
<div style="margin-top:56px;text-align:center;font-size:14px;color:#6b6258;">
이 글을 끝까지 읽은 당신에게,<br>오늘 저녁 7시 재난문자가 도착합니다.
</div>
<div style="margin-top:30px;text-align:center;font-size:12px;color:#5f574d;">🔞 성인 전용 · 모든 등장인물은 성인입니다 · 괴담 100종 · 멀티엔딩</div>
</div></div>'''
open('/home/user/claude-2/월영시_별도설명_코드.txt','w').write(h)
print(len(L),len(h))
