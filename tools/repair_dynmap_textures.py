#!/usr/bin/env python3
"""Repair the three logged missing textures using the installed-version assets.

Dry run by default. Supply the official Chipped 3.0.7 Forge and Dynmap beta 6
JARs; --apply writes the two texture files and a small replacement archive.
"""
import argparse
from functools import lru_cache
import hashlib
import json
from pathlib import Path
import re
import zipfile


def repair(renderdata, chipped_jar, dynmap_jar, apply=False, archive=None):
    expected = {
        chipped_jar: '25ee2a0846059d8f21d28b94b7e0229b60cb5499',
        dynmap_jar: 'a3718c3a850f30377aca18a333d8941fbb0ba91e',
    }
    for path, sha1 in expected.items():
        if hashlib.sha1(path.read_bytes()).hexdigest() != sha1:
            raise ValueError('Unexpected mod artifact: ' + str(path))

    file = renderdata / 'chipped-texture.txt'
    original = file.read_text()
    definitions = {}
    for line in original.splitlines():
        match = re.match(r'texture:id=([^,]+),filename=([^,]+),', line)
        if match:
            definitions[match[2]] = match[1]
    alias = re.compile(r'(patch\d+=\d+:)minecraft:([01])(?=,|$)')
    changed = 0
    rows = []
    with zipfile.ZipFile(chipped_jar) as jar:
        @lru_cache(maxsize=None)
        def model(name):
            namespace, path = name.split(':', 1)
            own = json.loads(jar.read('assets/' + namespace + '/models/' + path + '.json'))
            merged = dict(model(own['parent'])) if 'parent' in own else {}
            textures = dict(merged.get('textures', {}))
            textures.update(own.get('textures', {}))
            merged.update(own)
            merged['textures'] = textures
            return merged

        for line in original.splitlines(keepends=True):
            if line.startswith('texture:id=minecraft:0,') or line.startswith('texture:id=minecraft:1,'):
                continue
            if not alias.search(line):
                rows.append(line)
                continue
            block = re.search(r'block:id=%([^,]+),state=([^,]+)', line)
            if not block:
                raise ValueError('Unexpected numeric texture record: ' + line)
            state = dict(part.split(':', 1) for part in block[2].split('/'))
            blockstate = json.loads(jar.read('assets/chipped/blockstates/' + block[1] + '.json'))
            variants = [value for key, value in blockstate['variants'].items()
                        if dict(part.split('=', 1) for part in key.split(',')) == state]
            if len(variants) != 1 or not isinstance(variants[0], dict):
                raise ValueError('Ambiguous blockstate: ' + block[1])
            resolved = model(variants[0]['model'])

            def replace(match):
                slot = match[2]
                # Confirm this is the literal face alias that generated the
                # reported path, and follow the model's declared texture slot.
                if not any(face.get('texture') == slot for element in resolved['elements']
                           for face in element.get('faces', {}).values()):
                    raise ValueError('Expected literal face alias ' + slot)
                texture = resolved['textures'][slot]
                visited = set()
                while texture.startswith('#'):
                    if texture in visited:
                        raise ValueError('Texture alias cycle')
                    visited.add(texture)
                    texture = resolved['textures'][texture[1:]]
                namespace, path = texture.split(':', 1)
                asset = 'assets/' + namespace + '/textures/' + path + '.png'
                jar.getinfo(asset)
                return match[1] + definitions[asset]

            rows.append(alias.sub(replace, line))
            changed += 1
    chipped = ''.join(rows)
    if 'minecraft:0' in chipped or 'minecraft:1,' in chipped:
        raise ValueError('Unresolved numeric texture reference')

    lootr_file = renderdata / 'lootr-texture.txt'
    lootr = lootr_file.read_text()
    modern = 'assets/minecraft/textures/entity/player/wide/steve.png'
    bundled = 'assets/minecraft/textures/entity/steve.png'
    with zipfile.ZipFile(dynmap_jar) as jar:
        jar.getinfo('texturepacks/standard/' + bundled)
    lootr_changed = modern in lootr
    lootr = lootr.replace(modern, bundled)
    if bundled not in lootr:
        raise ValueError('Expected Lootr trophy skin definition')
    repaired = {'chipped-texture.txt': chipped, 'lootr-texture.txt': lootr}
    if apply:
        for name, text in repaired.items():
            (renderdata / name).write_text(text)
        if archive:
            with zipfile.ZipFile(archive, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as output:
                for name, text in sorted(repaired.items()):
                    info = zipfile.ZipInfo('renderdata/' + name, (2026, 10, 11, 0, 0, 0))
                    info.compress_type = zipfile.ZIP_DEFLATED
                    info.external_attr = 0o100644 << 16
                    output.writestr(info, text.encode('utf-8'))
    return changed, lootr_changed


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--renderdata', type=Path, default=Path('dynmap/renderdata'))
    parser.add_argument('--chipped-jar', type=Path, required=True)
    parser.add_argument('--dynmap-jar', type=Path, required=True)
    parser.add_argument('--apply', action='store_true')
    parser.add_argument('--archive', type=Path, default=Path('dynmap/hvcz-dynmap-texture-fixes.zip'))
    args = parser.parse_args()
    states, skin = repair(args.renderdata, args.chipped_jar, args.dynmap_jar, args.apply, args.archive)
    print(f'Chipped block-state mappings repaired: {states}; Lootr skin path repaired: {skin}; applied: {args.apply}')
