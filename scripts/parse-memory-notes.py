"""Parse the pinned authored DOM at build time. Never execute page JavaScript."""
import gzip, json, sys
from html.parser import HTMLParser

class Parser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.root = {'tag': 'root', 'attrs': {}, 'children': []}
        self.stack = [self.root]
    def handle_starttag(self, tag, attrs):
        node = {'tag': tag, 'attrs': dict(attrs), 'children': []}
        self.stack[-1]['children'].append(node)
        if tag not in ('br', 'hr', 'input', 'img', 'meta', 'link'):
            self.stack.append(node)
    def handle_endtag(self, tag):
        for i in range(len(self.stack)-1, 0, -1):
            if self.stack[i]['tag'] == tag:
                del self.stack[i:]
                break
    def handle_data(self, data):
        self.stack[-1]['children'].append(data)

def all_nodes(node, predicate):
    if isinstance(node, str): return []
    return ([node] if predicate(node) else []) + [x for child in node['children'] for x in all_nodes(child, predicate)]
def cls(node, name): return name in node['attrs'].get('class', '').split()
def text(node):
    if isinstance(node, str): return node
    return ('\n' if node['tag'] == 'br' else '') + ''.join(text(c) for c in node['children'])
def first(node, predicate):
    matches = all_nodes(node, predicate)
    return text(matches[0]).strip() if matches else ''

def parse(html):
    parser = Parser(); parser.feed(html)
    categories, notes = [], []
    for section in all_nodes(parser.root, lambda n: n['tag'] == 'section' and 'data-chapter' in n['attrs']):
        category = {'id': section['attrs']['data-chapter'], 'title': first(section, lambda n: n['tag'] == 'h2'), 'noteIds': []}
        categories.append(category)
        for article in all_nodes(section, lambda n: n['tag'] == 'article' and cls(n, 'note')):
            attrs = article['attrs']; note = {'id': attrs['data-id'], 'categoryId': attrs['data-section'], 'priority': attrs['data-focus'] == 'true'}
            note['title'] = first(article, lambda n: n['tag'] == 'h3')
            note['core'] = first(article, lambda n: cls(n, 'core'))
            for field, class_name, tag in [('watch', 'watch', 'p'), ('explanation', 'explanation', 'p'), ('example', 'example', 'code')]:
                parent = all_nodes(article, lambda n: cls(n, class_name))
                note[field] = first(parent[0], lambda n: n['tag'] == tag) if parent else ''
            note['dialect'] = first(article, lambda n: cls(n, 'dialect'))
            notes.append(note); category['noteIds'].append(note['id'])
    quick = all_nodes(parser.root, lambda n: n['attrs'].get('id') == 'quick')[0]
    quick_lines = [{'id': 'quick-%02d' % (i+1), 'title': first(li, lambda n: cls(n, 'quick-key')), 'text': first(li, lambda n: cls(n, 'quick-desc'))} for i, li in enumerate(all_nodes(quick, lambda n: n['tag'] == 'li'))]
    return {'categories': categories, 'notes': notes, 'quickLines': quick_lines}

if __name__ == '__main__':
    source = gzip.open(sys.argv[1], 'rt', encoding='utf-8').read() if len(sys.argv) > 1 else sys.stdin.read()
    json.dump(parse(source), sys.stdout, ensure_ascii=False, separators=(',', ':'))
