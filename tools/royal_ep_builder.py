import json,html
E=json.load(open('/home/user/claude-2/royal/에피소드.json'))
def build(i,e):
    ps=''
    for b in e['body']:
        t=html.escape(b).replace('\n','<br>')
        if b.startswith('[') or b.startswith('▶'):
            ps+=f'<p style="margin:0 0 16px;background:#1d2340;color:#f3e6c4;padding:10px 12px;border-left:3px solid #c9a24a;font-family:\'Noto Sans KR\',sans-serif;font-size:13px;line-height:1.7;">{t}</p>'
        elif b.startswith('"'):
            ps+=f'<p style="margin:0 0 16px;padding-left:12px;border-left:2px solid #c9a24a;color:#1d2340;font-weight:bold;">{t}</p>'
        else:
            ps+=f'<p style="margin:0 0 16px;">{t}</p>'
    return f'''<div style="max-width:720px;margin:0 auto;background:#faf6ee;color:#2b2a33;font-family:'Noto Serif KR','Nanum Myeongjo',serif;line-height:1.95;font-size:15px;border:1px solid #d9c9a3;border-top:4px solid #1d2340;border-radius:4px;padding:26px 26px 28px;">
<div style="border-bottom:1px solid #d9c9a3;padding-bottom:12px;margin-bottom:20px;">
<div style="font-size:11px;letter-spacing:0.45em;color:#a8842f;">大 韓 帝 國 　 皇 室 　 第 {i} 話</div>
<div style="font-size:22px;color:#1d2340;letter-spacing:0.03em;margin-top:4px;">{html.escape(e['title'])}</div>
<div style="font-size:12px;color:#6d6a78;margin-top:4px;">{html.escape(e['tag'])}　·　<span style="color:#a3283a;">{html.escape(e['warn'])}</span></div>
</div>
{ps}
<div style="text-align:center;font-size:11px;letter-spacing:0.4em;color:#a8842f;margin-top:8px;">— 王 冠 의 　 무 게 —</div>
</div>'''
for i,e in enumerate(E,1):
    h=build(i,e);open(f'/home/user/claude-2/royal/에피소드{i}_HTML.txt','w').write(h);print(i,len(h))
