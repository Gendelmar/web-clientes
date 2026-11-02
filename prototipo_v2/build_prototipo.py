#!/usr/bin/env python3
"""Genera Prototipo_completo_v2.html incrustando las cuatro apps (src/*.html) en la carcasa.
Uso: python3 build_prototipo.py   (desde cualquier carpeta)"""
import json, os
D = os.path.dirname(os.path.abspath(__file__))
S = os.path.join(D, 'src')
rd = lambda n: open(os.path.join(S, n), encoding='utf-8').read()
lit = lambda s: json.dumps(s, ensure_ascii=False).replace('</', '<\\/').replace('\u2028', '\\u2028').replace('\u2029', '\\u2029')
src = '{' + ','.join('%s:%s' % (k, lit(rd(k + '.html'))) for k in ('cfg', 'adm', 'lite', 'cli')) + '}'
host = rd('host.html').replace('/*BRIDGE*/', rd('bridge.js')).replace('/*SRC*/', '@@SRC@@').replace('@@SRC@@', src)
out = os.path.join(os.path.dirname(D), 'Prototipo_completo_v2.html')
open(out, 'w', encoding='utf-8').write(host)
print('OK', out, len(host.encode('utf-8')), 'bytes')
