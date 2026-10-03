import json
CH='/home/user/claude-2/chohan/초한지_자동입력_'; R='/home/user/claude-2/night/'
def swap(s,m,v):
    i=s.index(m)+len(m); _,e=json.JSONDecoder().raw_decode(s,i); return s[:i]+json.dumps(v,ensure_ascii=False)+s[e:]
rd=lambda f:open(R+f).read().strip()
W='불야성_자동입력_'
s=open(CH+'프로필.txt').read()
s=swap(s,'const D=',[["시뮬레이터 제목","input","불야성: 서울의 밤 — 밤거리 시뮬레이터"],["등장인물 설명","textarea",rd('등장인물.txt')],["별도 설명 표시","textarea",rd('소개페이지.txt')]])
open(R+W+'프로필.txt','w').write(s)
E=json.load(open(R+'에피소드.json'))
s=open(CH+'에피소드.txt').read()
s=swap(s,'const EP=',[[e['title'],rd(f'에피소드{i}_HTML.txt'),e['secret']] for i,e in enumerate(E,1)])
s=swap(s,'STYLE=',rd('문체가이드.txt')); s=swap(s,'PERSONA=',rd('페르소나가이드.txt'))
open(R+W+'에피소드.txt','w').write(s)
s=open(CH+'위젯.txt').read()
s=swap(s,'const ROWS=',json.load(open(R+'위젯.json'))); s=swap(s,',HTML=',rd('위젯_콘텐츠.txt'))
open(R+W+'위젯.txt','w').write(s)
L=json.load(open(R+'_lore_final150.json'))
s=open(CH+'로어북.txt').read(); s=swap(s,'const UPD = ',[]); s=swap(s,'const NEW = ',[{"k":x['k'],"c":x['c']} for x in L]).replace('초한지','불야성')
open(R+W+'로어북.txt','w').write(s)
X=[[x['u'],x['c'],True] for x in json.load(open(R+'_ex_cmd.json'))]+[[x['u'],x['c']] for x in json.load(open(R+'_ex_story.json'))]
s=open(CH+'예시대화.txt').read()
s=s.replace("const base=cs().filter(x=>x.value.trim()!=='').length;","const base=0;")
s=swap(s,'const EX=',X)
import re
s=re.sub(r"console\.log\('이미 채워진 예시 '\+base\+'개 다음부터 '\+EX\.length\+'개를 넣어요\. \(초한지 예시 \d+개\)'\);","console.log('1번 칸부터 '+EX.length+'개를 넣어요. (불야성 예시 50개)');",s).replace('초한지','불야성')
open(R+W+'예시대화.txt','w').write(s)
src=open('/home/user/claude-2/campus/캠퍼스_자동입력_세계관페이지.txt').read()
i=src.index('const D=')+8;D,e=json.JSONDecoder().raw_decode(src,i)
m={'제목':'세계관페이지/제목.txt','내용':'세계관페이지/내용.txt','사용자에게 보여줄 세계관':'세계관페이지/사용자용_HTML.txt','소개글':'세계관페이지/소개글.txt'}
for d in D: d[1]=rd(m[d[2]])
open(R+W+'세계관페이지.txt','w').write(src[:i]+json.dumps(D,ensure_ascii=False)+src[e:])
open(R+'로어북.md','w').write('# 불야성 로어북 150\n\n'+'\n'.join(f"## {i}. {x['name']}\n- 키워드: {', '.join(x['k'])}\n\n{x['c']}\n" for i,x in enumerate(L,1)))
open(R+'예시대화.md','w').write('# 불야성 예시 대화 50\n\n'+'\n'.join(f"## {i}\n**사용자:** {x[0]}\n\n**캐릭터:**\n{x[1]}\n" for i,x in enumerate(X,1)))
print('lore',len(L),'ex',len(X),[len(d[1]) for d in D])
