import json,re
CH='/home/user/claude-2/chohan/초한지_자동입력_'; R='/home/user/claude-2/campus/'
def swap(s,marker,val):
    i=s.index(marker)+len(marker); _,e=json.JSONDecoder().raw_decode(s,i)
    return s[:i]+json.dumps(val,ensure_ascii=False)+s[e:]
rd=lambda f:open(R+f).read()
TITLE='한 학기: 서하대학교 캠퍼스 라이프'
# 프로필
s=open(CH+'프로필.txt').read()
s=swap(s,'const D=',[["시뮬레이터 제목","input",TITLE],["등장인물 설명","textarea",rd('등장인물.txt').strip()],["세계관","textarea",rd('세계관.txt').strip()],["별도 설명 표시","textarea",rd('소개페이지.txt')]])
open(R+'캠퍼스_자동입력_프로필.txt','w').write(s)
# 에피소드
E=json.load(open(R+'에피소드.json'))
s=open(CH+'에피소드.txt').read()
s=swap(s,'const EP=',[[e['title'],rd(f'에피소드{i}_HTML.txt'),e['secret']] for i,e in enumerate(E,1)])
s=swap(s,'STYLE=',rd('문체가이드.txt').strip()); s=swap(s,'PERSONA=',rd('페르소나가이드.txt').strip())
open(R+'캠퍼스_자동입력_에피소드.txt','w').write(s)
# 위젯
s=open(CH+'위젯.txt').read()
s=swap(s,'const ROWS=',json.load(open(R+'위젯.json'))); s=swap(s,',HTML=',rd('위젯_콘텐츠.txt'))
open(R+'캠퍼스_자동입력_위젯.txt','w').write(s)
# 로어북
L=[]
for f in ('_lore_A.json','_lore_B.json'):
    try: L+=json.load(open(R+f))
    except FileNotFoundError: print('missing',f)
s=open(CH+'로어북.txt').read()
s=swap(s,'const NEW = ',[{"k":x['k'],"c":x['c']} for x in L])
s=s.replace('초한지','캠퍼스')
open(R+'캠퍼스_자동입력_로어북.txt','w').write(s)
# 예시
X=[dict(x,a=True) for x in json.load(open(R+'_ex_cmd.json'))]
for f in ('_ex_A.json','_ex_B.json'):
    try: X+=json.load(open(R+f))
    except FileNotFoundError: print('missing',f)
s=open(CH+'예시대화.txt').read()
s=swap(s,'const EX=',[[x['u'],x['c'],True] if x.get('a') else [x['u'],x['c']] for x in X])
s=re.sub(r'초한지 예시 \d+개','캠퍼스 예시 %d개'%len(X),s).replace('초한지','캠퍼스')
open(R+'캠퍼스_자동입력_예시대화.txt','w').write(s)
# md
open(R+'로어북.md','w').write('# 한 학기 로어북 (%d개)\n\n'%len(L)+'\n'.join(f"## {i}. {x['name']}\n- 키워드: {', '.join(x['k'])}\n\n{x['c']}\n" for i,x in enumerate(L,1)))
open(R+'예시대화.md','w').write('# 한 학기 예시 대화 (%d개)\n\n'%len(X)+'\n'.join(f"## {i}\n**사용자:** {x['u']}\n\n**캐릭터:**\n{x['c']}\n" for i,x in enumerate(X,1)))
print('lore',len(L),'ex',len(X))
