import json,html
E=json.load(open('/home/user/claude-2/campus/에피소드.json'))
def build(i,e):
    ps=''
    for b in e['body']:
        t=html.escape(b).replace('\n','<br>')
        if b.startswith('['):
            ps+=f'<p style="margin:0 0 16px;background:#24203a;color:#e9e4ff;padding:10px 12px;border-radius:12px;font-size:13px;line-height:1.75;">{t}</p>'
        else:
            ps+=f'<p style="margin:0 0 16px;">{t}</p>'
    return f'''<div style="max-width:720px;margin:0 auto;background:#fffaf7;color:#2a2633;font-family:'Pretendard','Noto Sans KR',sans-serif;line-height:1.9;font-size:15px;border:1px solid #f0dfe6;border-radius:18px;padding:24px 24px 26px;">
<div style="border-bottom:1px dashed #f0c9d6;padding-bottom:12px;margin-bottom:18px;">
<div style="font-size:11px;letter-spacing:0.35em;color:#ff5d8f;font-weight:700;">SEOHA UNIV · EPISODE {i:02d}</div>
<div style="font-size:22px;font-weight:800;color:#2a2633;margin-top:4px;">{html.escape(e['title'])}</div>
<div style="font-size:12px;color:#8a8399;margin-top:4px;">📍 {html.escape(e['tag'])}　<span style="background:#ffe4ec;color:#e0457a;border-radius:8px;padding:1px 7px;">{html.escape(e['warn'])}</span></div>
</div>
{ps}
<div style="text-align:center;font-size:11px;letter-spacing:0.3em;color:#c3a6ff;">— 한 학기 · 서하대학교 —</div>
</div>'''
for i,e in enumerate(E,1):
    h=build(i,e);open(f'/home/user/claude-2/campus/에피소드{i}_HTML.txt','w').write(h);print(i,len(h),len(e['secret']))
