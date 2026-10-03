import os
F="font-family:'Noto Sans KR',sans-serif;"
P="background:#0e0d16;border:1px solid #2e2440;border-radius:14px;padding:20px;margin-top:14px;color:#e6e3ee;"
H=lambda t,s,c='#ff4d8d':f'<p style="font-size:11px;letter-spacing:0.35em;color:{c};font-weight:700;margin:0 0 4px;">{s}</p><p style="font-size:20px;font-weight:800;margin:0 0 12px;color:#fff;">{t}</p>'
tiers=[('★1','서민의 밤','포차 · 호프 · 대포집 · 코인노래방 · 발마사지','1~3만','#7df9ff'),('★2','번화가','헌팅포차 · 감성주점 · 노래방 룸 · 골목 바','3~10만','#a5f3a5'),('★3','클럽·라운지','클럽 · 칵테일 바 · 재즈 · 루프톱 · 호텔 스파','10~50만','#ffd166'),('★4','하이엔드','회원제 라운지 · 룸 접대 · VIP 에스테틱 · 슈퍼클럽','50~500만','#ff8fb3'),('★5','최상류','카지노 하이롤러 · 요트 · 전용기 · 비공개 살롱','수천만~','#c084fc')]
tc=''.join(f'<div style="display:flex;align-items:center;gap:10px;background:#141222;border:1px solid #2e2440;border-left:3px solid {c};border-radius:10px;padding:8px 12px;margin-top:6px;"><b style="color:{c};font-size:15px;flex:none;width:30px;">{a}</b><div style="flex:1;"><b>{b}</b><div style="font-size:12px;color:#a59cb8;">{d}</div></div><span style="font-size:12px;color:{c};flex:none;">1인 {p}</span></div>' for a,b,d,p,c in tiers)
zones=[('청담','★4~5','라운지 · 루프톱 · VIP 카지노','#ffd166'),('강남·논현','★2~4','클럽 · 룸 · 해장국','#ff4d8d'),('을지로·종로','★1~2','포차 골목 · 노포 · 노래방','#7df9ff'),('이태원·한남','★2~3','재즈 · 바 · 언더 파티','#c084fc'),('홍대','★1~3','인디 클럽 · 헌팅포차','#a5f3a5'),('한강','★1~4','편의점 파라솔 · 부유선 바','#93c5fd')]
zc=''.join(f'<div style="flex:1 1 150px;background:#141222;border:1px solid #2e2440;border-radius:10px;padding:10px;"><b style="color:{c};">{a}</b> <small style="color:#888;">{b}</small><div style="font-size:12px;color:#c9c0d8;">{d}</div></div>' for a,b,d,c in zones)
routes=[('A','한량','돈은 있다. 사람은 없다.'),('B','밤일','바텐더·MD·대리. 밤의 뒷면부터 본다.'),('C','조직','소속이 생긴다. 시키는 일도.'),('D','사업가','가게 하나 차리는 게 이렇게 어렵다.'),('E','연예인','얼굴이 알려져 있다. 찌라시도.'),('F','일반인','친구 따라 나온 첫 밤.')]
rc=''.join(f'<div style="flex:1 1 130px;background:#141222;border:1px solid #2e2440;border-radius:10px;padding:10px;"><b style="color:#ff4d8d;font-size:16px;">{a}</b> <b>{b}</b><div style="font-size:12px;color:#a59cb8;">{d}</div></div>' for a,b,d in routes)
cities='도쿄 · 오사카 · 방콕 · 마카오 · 홍콩 · 상하이 · 싱가포르 · 두바이 · 라스베이거스 · 뉴욕 · 베를린 · 이비자 · 파리 · 런던 · 모나코 · 리우'
cmds=[('/폰','받은 메시지'),('/찌라시','실시간 소문'),('/지갑','현금과 지출'),('/인맥','알게 된 사람'),('/지도','오늘 밤 서울'),('/프로필 이름','만난 사람 카드')]
cm=''.join(f'<div style="flex:1 1 120px;background:#0d1a22;border:1px solid #1f4a5a;border-radius:10px;padding:8px 10px;"><b style="color:#7df9ff;">{a}</b><div style="font-size:12px;color:#9fc;">{b}</div></div>' for a,b in cmds)
eps=[('3/6 금 · 강남 ★3','EP.01 — 첫날 밤','클럽 에덴 앞 200m 줄. 가드는 리스트를 묻고, 처음 보는 MD가 웃는다.'),('3/13 금 · 을지로 ★1','EP.02 — 을지로의 밤','포차 골목에 검은 승용차 두 대. "이모, 이번 달 거."'),('3/21 토 · 청담 ★5','EP.03 — 로열 스위트','지하 버튼이 없는 엘리베이터. 보낸 사람 없는 초대장.')]
ec=''.join(f'<div style="background:#141222;border:1px solid #2e2440;border-left:3px solid #ff2d75;border-radius:10px;padding:10px 14px;margin-top:6px;"><div style="font-size:11px;color:#ff4d8d;">{a}</div><b style="font-size:15px;">{b}</b><div style="font-size:13px;color:#c9c0d8;">{c}</div></div>' for a,b,c in eps)
intro=f'''<div style="max-width:760px;margin:0 auto;background:#07070c;{F}padding:16px;border-radius:16px;">
<div style="{P}text-align:center;padding:32px 20px;border-color:#ff2d75;box-shadow:0 0 22px #ff2d7544;">
<p style="font-size:11px;letter-spacing:0.5em;color:#7df9ff;margin:0;">SEOUL · NIGHT CITY SIMULATOR</p>
<p style="font-size:50px;font-weight:900;letter-spacing:10px;margin:8px 0 0;color:#fff;text-shadow:0 0 14px #ff2d75,0 0 30px #ff2d75;">不夜城</p>
<p style="font-size:16px;letter-spacing:6px;color:#ff8fb3;margin:2px 0 16px;">불 야 성 · 서울의 밤</p>
<p style="font-size:15px;line-height:2;margin:0;">해가 지면 깨어나는 도시.<br>포장마차의 소주 한 잔부터 마카오 하이롤러 룸의 칩 한 장까지.<br><b style="color:#fff;">오늘 밤, 당신은 어디까지 갈 수 있을까.</b></p>
<div style="display:inline-block;margin-top:16px;border:1px solid #00e5ff;color:#7df9ff;padding:6px 16px;border-radius:20px;font-size:13px;box-shadow:0 0 10px #00e5ff55;">PM 9:00 — AM 5:00</div></div>
<div style="{P}">{H('밤의 등급','TIER ★1 — ★5')}{tc}<p style="font-size:12px;color:#8a80a0;margin:10px 0 0;">마사지·노래방·라운지·에스테틱까지, 모든 업종에 ★5 프라이빗 버전이 있다. 현실에 없는 가게도 숨어 있다.</p></div>
<div style="{P}">{H('서울의 밤거리','DISTRICTS','#7df9ff')}<div style="display:flex;flex-wrap:wrap;gap:8px;">{zc}</div>
<p style="font-size:13px;color:#c9c0d8;margin:12px 0 0;">✈ 그리고 세계의 밤: {cities}</p></div>
<div style="{P}">{H('누구로 살 것인가','ROUTES')}<div style="display:flex;flex-wrap:wrap;gap:8px;">{rc}</div>
<p style="font-size:12px;color:#8a80a0;margin:10px 0 0;">조직 가입은 강제가 아니다. 한량으로 놀아도, 가게 하나를 키워도, 밤의 황제가 되어도 된다.</p></div>
<div style="{P}">{H('가게가 사람을 만든다','PEOPLE','#ffd166')}<p style="font-size:14px;line-height:1.9;margin:0;">정해진 주인공은 없다. 가게에 들어서면 그곳의 사람들이 나타난다.<br>무뚝뚝한 포차 이모, 잔에 비밀을 묻는 바텐더, 실적에 쫓기는 MD, 손님인 척하는 형사, 테이블을 산 재벌 2세.<br>한 번 엮인 사람은 당신을 기억한다. 다음에 그 가게에 가면, 그 사람이 있다.</p></div>
<div style="{P}">{H('시작하는 세 밤','EPISODES')}{ec}</div>
<div style="{P}">{H('폰을 열면','COMMANDS','#7df9ff')}<div style="display:flex;flex-wrap:wrap;gap:8px;">{cm}</div>
<p style="font-size:12px;color:#8a80a0;margin:10px 0 0;">상태창: 현금 · 평판 · 인맥 · 소속 · 영향력 · 주량 · 컨디션 · 동행 · 찌라시</p></div>
<div style="{P}text-align:center;border-color:#ff2d75;">
<p style="font-size:16px;line-height:2;margin:0;">밤은 비싸다. 소문은 빠르다.<br>그래도 — <b style="color:#ff4d8d;">불은 꺼지지 않는다.</b></p>
<p style="font-size:11px;color:#6a6080;margin:14px 0 0;">🔞 모든 등장인물은 성인 · 실존 업소·인물·조직과 무관한 가상 세계입니다</p></div>
</div>'''
open('/home/user/claude-2/night/소개페이지.txt','w').write(intro);print('intro',len(intro))
