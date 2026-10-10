#!/usr/bin/env python3
"""Relecture des créoles : liste les textes à traduire et réimporte le classeur relu.

  python3 scripts/relecture-creoles.py a-traduire > a-traduire.csv
  python3 scripts/relecture-creoles.py importer relecture-traductions-creoles.xlsx            # simulation
  python3 scripts/relecture-creoles.py importer relecture-traductions-creoles.xlsx --appliquer

Règles d'import, par phrase du classeur (une feuille par langue) :
  - « Votre correction » renseignée   -> elle remplace la traduction dans i18n/<langue>.json
  - sinon « Validé ? » = Oui          -> la traduction proposée est conservée (rien à écrire)
  - sinon                             -> phrase non traitée, ignorée
La phrase est retrouvée par son texte français (colonne C), toutes les clés qui le portent sont mises à jour.
Bibliothèque standard uniquement.
"""
import csv, json, re, sys, zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

I18N = Path(__file__).resolve().parent.parent / 'apps/web/src/i18n'
SHEETS = {'Guadeloupe': 'gp', 'Martinique': 'mq', 'Guyane': 'gf', 'La Réunion': 're', 'Haïti': 'ht'}
M = '{http://schemas.openxmlformats.org/spreadsheetml/2006/main}'
R = '{http://schemas.openxmlformats.org/officeDocument/2006/relationships}'


def norm(s):
    """Compare sans tenir compte des espaces et de la forme de l'apostrophe."""
    return re.sub(r'\s+', ' ', (s or '').replace('’', "'")).strip()


def read_workbook(path, only=None):
    z = zipfile.ZipFile(path)
    strings = [''.join(t.text or '' for t in si.iter(M + 't')) for si in ET.fromstring(z.read('xl/sharedStrings.xml')).findall(M + 'si')]
    rels = {r.get('Id'): r.get('Target') for r in ET.fromstring(z.read('xl/_rels/workbook.xml.rels'))}
    out = {}
    for sheet in ET.fromstring(z.read('xl/workbook.xml')).find(M + 'sheets'):
        name = sheet.get('name')
        if name not in SHEETS:
            continue
        target = rels[sheet.get(R + 'id')].lstrip('/')
        rows = []
        for row in ET.fromstring(z.read(target if target.startswith('xl/') else 'xl/' + target)).iter(M + 'row'):
            cells = {}
            for c in row.findall(M + 'c'):
                col = re.match(r'[A-Z]+', c.get('r')).group()
                if c.get('t') == 'inlineStr':
                    cells[col] = ''.join(t.text or '' for t in c.iter(M + 't'))
                else:
                    v = c.find(M + 'v')
                    if v is not None:
                        cells[col] = strings[int(v.text)] if c.get('t') == 's' else v.text
            rows.append(cells)
        out[name] = rows
    return out


def a_traduire(dossier):
    fr = json.loads((dossier / 'fr.json').read_text('utf-8'))
    ref = json.loads((dossier / 'gp.json').read_text('utf-8'))
    w = csv.writer(sys.stdout, delimiter=';')
    sys.stdout.write('﻿')
    w.writerow(['clé', 'texte français', 'gp', 'mq', 'gf', 're', 'ht'])
    n = 0
    for k, v in fr.items():
        if k not in ref:
            w.writerow([k, v, '', '', '', '', ''])
            n += 1
    print(f'{n} texte(s) sans traduction créole', file=sys.stderr)


def importer(xlsx, dossier, appliquer):
    fr = json.loads((dossier / 'fr.json').read_text('utf-8'))
    by_text = {}
    for k, v in fr.items():
        by_text.setdefault(norm(v), []).append(k)
    for name, rows in read_workbook(xlsx).items():
        lang = SHEETS[name]
        path = dossier / f'{lang}.json'
        data = json.loads(path.read_text('utf-8'))
        corrected = validated = untouched = unknown = 0
        for cells in rows[2:]:  # 2 lignes d'en-tête
            text = norm(cells.get('C'))
            if not text:
                continue
            fix = (cells.get('E') or '').strip()
            ok = (cells.get('G') or '').strip().lower() in ('oui', 'o', 'yes')
            if not fix and not ok:
                untouched += 1
                continue
            keys = by_text.get(text)
            if not keys:
                unknown += 1
                print(f'  [{lang}] texte français introuvable : {text[:60]}', file=sys.stderr)
                continue
            if fix:
                corrected += 1
                for k in keys:
                    data[k] = fix
            else:
                validated += 1
        print(f'{name:12} corrigées {corrected:3} · validées {validated:3} · non traitées {untouched:3} · introuvables {unknown}')
        if appliquer and corrected:
            path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', 'utf-8')
    print('Fichiers i18n mis à jour.' if appliquer else 'Simulation : rien écrit. Ajouter --appliquer pour écrire.')


if __name__ == '__main__':
    args = sys.argv[1:]
    dossier = Path(args[args.index('--dossier') + 1]) if '--dossier' in args else I18N
    if args[:1] == ['a-traduire']:
        a_traduire(dossier)
    elif args[:1] == ['importer'] and len(args) >= 2:
        importer(args[1], dossier, '--appliquer' in args)
    else:
        print(__doc__)
