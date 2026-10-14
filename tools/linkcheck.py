# Lists internal links and assets that point at files which do not exist.
import re, glob, os, collections
os.chdir('C:/Users/HP/Desktop/Galvan ai projects/wine website')
SKIP = ('vendor/', 'cg-', 'codegrid', 'CGM', 'tools/')
pages = [f.replace(os.sep, '/') for f in glob.glob('**/*.html', recursive=True)]
pages = [f for f in pages if not f.startswith(SKIP)]
bad = collections.Counter(); where = {}
for f in pages:
    s = open(f, encoding='utf8').read()
    base = os.path.dirname(f)
    for u in re.findall(r'(?:href|src)="([^"#?:]*)', s):
        if not u or u.startswith(('mailto', 'tel', 'http', 'data')): continue
        p = u.lstrip('/') if u.startswith('/') else os.path.normpath(os.path.join(base, u)).replace(os.sep, '/')
        t = (p.rstrip('/') + '/index.html').lstrip('/') if (p in ('', '.') or u.endswith('/')) else p
        if t in ('./index.html', '/index.html'): t = 'index.html'
        if not os.path.exists(t):
            bad[u] += 1; where.setdefault(u, f)
print(len(pages), 'pages')
for u, n in bad.most_common(40): print(n, u, '<-', where[u])
