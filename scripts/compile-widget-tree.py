"""Build-time only: translate authored finite widget HTML to native data, never a WebView."""
import json,sys,re
from html.parser import HTMLParser
class Parser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True); self.root={'tag':'root','attrs':{},'children':[]}; self.stack=[self.root]
    def handle_starttag(self,tag,attrs):
        n={'tag':tag,'attrs':dict(attrs),'children':[]};self.stack[-1]['children'].append(n)
        if tag not in ['br','hr','input','img','meta','link']:self.stack.append(n)
    def handle_endtag(self,tag):
        for i in range(len(self.stack)-1,0,-1):
            if self.stack[i]['tag']==tag:del self.stack[i:];break
    def handle_data(self,data):self.stack[-1]['children'].append(data)
def plain(n):
    if isinstance(n,str):return n
    separator=' · ' if any(c in n['attrs'].get('class','').split() for c in ['schema-field','lab-stat','truth-result','letter']) else ''
    return ('\n' if n['tag']=='br' else '')+separator.join(plain(x).strip() if separator else plain(x) for x in n['children'] if plain(x))
def descendants(n,tag):
    if isinstance(n,str):return []
    return ([n] if n['tag']==tag else [])+sum((descendants(x,tag) for x in n['children']),[])
def convert(n):
    if isinstance(n,str):return [{'kind':'text','text':n.strip()}] if n.strip() else []
    tag,a,cs=n['tag'],n['attrs'],n['children']
    if tag in ['svg','path']:return []
    if tag=='button':return [{'kind':'button','text':plain(n).strip(),'target':int(a['data-next']) if 'data-next' in a else None,'selected':a.get('aria-pressed')=='true','disabled':'disabled' in a}]
    if tag=='pre':return [{'kind':'code','text':plain(n)}]
    if tag=='table':
        rows=descendants(n,'tr');heads=[plain(x) for x in descendants(rows[0],'th')];rr=[];highlight=[[-1,i] for i,x in enumerate(descendants(rows[0],'th')) if 'cell-highlight' in x['attrs'].get('class','')]
        for row in rows:
            cells=[x for x in row['children'] if isinstance(x,dict) and x['tag'] in ['td','th']]
            if descendants(row,'td'):
                ri=len(rr);rr.append(sum(([plain(x)]+['']*(int(x['attrs'].get('colspan','1'))-1) for x in cells),[]));highlight.extend([[ri,i] for i,x in enumerate(cells) if 'cell-highlight' in x['attrs'].get('class','')])
        return [{'kind':'table','columns':heads,'rows':rr,'highlight':highlight}]
    if tag in ['p','h2','h3','h4','li','summary'] or (tag in ['div','span'] and all(isinstance(x,str) or x['tag'] in ['b','strong','small','span','code','br','em'] for x in cs)):
        t=plain(n).strip()
        return [{'kind':'text','text':t,'emphasis':tag.startswith('h') or 'status' in a.get('class',''),'highlighted':bool(set(a.get('class','').split()) & {'selected','active','cell-highlight'})}] if t else []
    children=sum((convert(x) for x in cs),[])
    return [{'kind':'group','controls':'widget-controls' in a.get('class',''),'framed':'schema-card' in a.get('class',''),'children':children}] if children else []
data=json.load(sys.stdin)
for widget in data.values():
    for state in widget['states']:
        p=Parser();p.feed(state.pop('html'));state['nodes']=convert(p.root)
json.dump(data,sys.stdout,ensure_ascii=False,separators=(',',':'))
