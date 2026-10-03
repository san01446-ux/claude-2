import json,html
E=json.load(open('/home/user/claude-2/night/에피소드.json'))
for i,e in enumerate(E,1):
    ps=''
    for b in e['body']:
        t=html.escape(b).replace('\n','<br>')
        if b.startswith('['): ps+=f'<p style="margin:0 0 16px;background:#0d1a22;border-left:3px solid #00e5ff;color:#bff6ff;padding:10px 12px;border-radius:6px;font-size:13px;line-height:1.75;">{t}</p>'
        else: ps+=f'<p style="margin:0 0 16px;">{t}</p>'
    h=f'''<div style="max-width:720px;margin:0 auto;background:#0b0b12;color:#e6e3ee;font-family:'Noto Sans KR',sans-serif;line-height:1.9;font-size:15px;border:1px solid #ff2d75;border-radius:14px;padding:24px 24px 26px;box-shadow:0 0 18px #ff2d7533;">
<div style="border-bottom:1px solid #3a2140;padding-bottom:12px;margin-bottom:18px;">
<div style="font-size:11px;letter-spacing:0.4em;color:#ff4d8d;font-weight:700;">不 夜 城 · EPISODE {i:02d}</div>
<div style="font-size:22px;font-weight:800;color:#fff;margin-top:4px;text-shadow:0 0 10px #ff2d75;">{html.escape(e['title'])}</div>
<div style="font-size:12px;color:#9a90b0;margin-top:4px;">🌃 {html.escape(e['tag'])}　<span style="color:#7df9ff;">{html.escape(e['warn'])}</span></div></div>
{ps}
<div style="text-align:center;font-size:11px;letter-spacing:0.3em;color:#7a6a90;">— 不夜城 · 서울의 밤 —</div></div>'''
    open(f'/home/user/claude-2/night/에피소드{i}_HTML.txt','w').write(h);print(i,len(h),len(e['secret']))
