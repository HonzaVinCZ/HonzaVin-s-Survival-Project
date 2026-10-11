#!/usr/bin/env python3
"""Repair custom modellist faces rejected by Dynmap 3.7 beta 6.

Default: preserve geometry and texture mapping by reparameterizing the face.
--allow-texture-stretch: also restore remaining rejected faces using the whole
texture tile. These faces were previously omitted; their crop is approximated.
Run with the server stopped, and keep a backup outside renderdata.
"""
import argparse
from collections import Counter
from functools import lru_cache
from pathlib import Path


@lru_cache(maxsize=500_000)
def patch_parameters(start, end, face):
    """Dynmap v3.7-beta-6 updateModelFace, before element/model rotations."""
    fields = face.split('/')
    side = fields[0][0]
    rotation = int(fields[0][1:] or 0) // 90
    x, y, z = (v / 16 for v in start)
    X, Y, Z = (v / 16 for v in end)
    corners = {
        'd': ((x, y, z), (X, y, z), (x, y, Z), (X, y, Z)),
        'u': ((x, Y, Z), (X, Y, Z), (x, Y, z), (X, Y, z)),
        'n': ((X, y, z), (x, y, z), (X, Y, z), (x, Y, z)),
        's': ((x, y, Z), (X, y, Z), (x, Y, Z), (X, Y, Z)),
        'w': ((x, y, z), (x, y, Z), (x, Y, z), (x, Y, Z)),
        'e': ((X, y, Z), (X, y, z), (X, Y, Z), (X, Y, z)),
    }
    defaults = {'d': (x, z, X, Z), 'u': (x, 1-Z, X, 1-z),
                'n': (1-X, y, 1-x, Y), 's': (x, y, X, Y),
                'w': (z, y, Z, Y), 'e': (1-Z, y, 1-z, Y)}
    flip_u = flip_v = False
    if len(fields) == 6:
        u0, v0, u1, v1 = map(float, fields[2:])
        a, c, b, d = u0/16, 1-v1/16, u1/16, 1-v0/16
        if a > b:
            flip_u, a, b = True, 1-a, 1-b
        if c > d:
            flip_v, c, d = True, 1-c, 1-d
    else:
        a, c, b, d = defaults[side]
    if a < 0:
        b, a = b-a, 0
    if c < 0:
        d, c = d-c, 0
    if b > 1:
        a, b = a-(b-1), 1
    if d > 1:
        c, d = c-(d-1), 1
    ll, lr, ul, ur = corners[side]
    ll, lr, ul = ((ll, lr, ul), (ul, ll, ur),
                  (ur, ul, lr), (lr, ur, ll))[rotation]
    if a == b or c == d:
        return ((0., 0., 0.),)*3 + ((a, c, b, d), (flip_u, flip_v))
    # The Java implementation divides zero-length vectors by their lengths.
    # NaN passes its range checks; keep these existing degenerate faces intact.
    if ll == lr or ll == ul:
        return ((float('nan'),)*3,)*3 + ((a, c, b, d), (flip_u, flip_v))
    u = tuple((r-l)/(b-a) for l, r in zip(ll, lr))
    v = tuple((r-l)/(d-c) for l, r in zip(ll, ul))
    origin = tuple(l-U*a-V*c for l, U, V in zip(ll, u, v))
    return origin, u, v, (a, c, b, d), (flip_u, flip_v)


def accepted(start, end, face):
    origin, u, v, (a, c, b, d), _ = patch_parameters(start, end, face)
    # Deliberately match Dynmap's erroneous U coefficients at corners 1 and 3.
    return all(not (o+U*s+V*t < -1 or o+U*s+V*t > 2)
               for s, t in ((a, c), (c, d), (b, c), (d, d))
               for o, U, V in zip(origin, u, v))


def texture_sample(parameters, s, t):
    """Effective texture coordinates at a point on the original face."""
    origin, u, v, (a, c, b, d), flips = parameters
    point = tuple(o+U*(a+(b-a)*s)+V*(c+(d-c)*t)
                  for o, U, V in zip(origin, u, v))
    return point, (1-(a+(b-a)*s) if flips[0] else a+(b-a)*s,
                   c+(d-c)*t if flips[1] else 1-(c+(d-c)*t))


def same_mapping(start, end, original, candidate, quarter_turn):
    old = patch_parameters(start, end, original)
    new = patch_parameters(start, end, candidate)
    # Solve the new U/V parameters at several physical points and apply the
    # compensating texture modifier used by TexturePack.readColor.
    origin, u, v, _, flips = new
    uu, vv = sum(x*x for x in u), sum(x*x for x in v)
    if uu == 0 or vv == 0:
        return False
    for s, t in ((.1, .2), (.25, .75), (.8, .3), (.9, .9)):
        point, texture = texture_sample(old, s, t)
        delta = tuple(p-o for p, o in zip(point, origin))
        a = sum(p*x for p, x in zip(delta, u))/uu
        c = sum(p*x for p, x in zip(delta, v))/vv
        raw = (1-a if flips[0] else a, c if flips[1] else 1-c)
        effective = (1-raw[1], raw[0]) if quarter_turn == 1 else (raw[1], 1-raw[0])
        if any(abs(x-y) > 2e-6 for x, y in zip(texture, effective)):
            return False
        reconstructed = tuple(o+U*a+V*c for o, U, V in zip(origin, u, v))
        if any(abs(x-y) > 2e-6 for x, y in zip(point, reconstructed)):
            return False
    return True


def header(line):
    return line.split(',box=')[0].split(',patch')[0].replace('block:', 'modellist:')


def repair(directory, apply=False, allow_stretch=False):
    totals = Counter()
    for model_file in sorted(directory.glob('*-models.txt')):
        lines = model_file.read_text().splitlines(keepends=True)
        texture_file = model_file.with_name(model_file.name.replace('-models', '-texture'))
        if not texture_file.exists():
            continue
        texture_lines = texture_file.read_text().splitlines(keepends=True)
        records = {header(line): i for i, line in enumerate(texture_lines) if line.startswith('block:')}
        stats = Counter()
        for index, line in enumerate(lines):
            if not line.startswith('modellist:'):
                continue
            pieces = line.rstrip('\n').split(',box=')
            if len(pieces) == 1:
                continue
            key = pieces[0]
            if key not in records:
                raise ValueError(f'Missing texture mapping for {model_file}:{index+1}')
            tx_index = records[key]
            texture_fields = texture_lines[tx_index].rstrip('\n').split(',')
            mapping = {int(f[5:].split('=')[0]): f.split('=', 1)[1]
                       for f in texture_fields if f.startswith('patch')}
            replacements = {}
            changed = False
            for box_index in range(1, len(pieces)):
                parts = pieces[box_index].split(':')
                start = tuple(map(float, parts[0].split('/')[:3]))
                end = tuple(map(float, parts[1].split('/')[:3]))
                for face_index in range(2, len(parts)):
                    face = parts[face_index]
                    if face.startswith('R/') or accepted(start, end, face):
                        continue
                    stats['rejected'] += 1
                    fields = face.split('/')
                    if len(fields) != 6:
                        raise ValueError(f'Unsupported implicit UV: {model_file}:{index+1}')
                    old_id = int(fields[1])
                    old_texture = mapping[old_id]
                    tile, name = old_texture.split(':', 1)
                    modifier, tile = divmod(int(tile), 1000)
                    uv = list(map(float, fields[2:]))
                    rot = int(fields[0][1:] or 0)
                    turn = 1 if modifier == 0 else 3
                    candidate_uv = ([uv[1], 16-uv[2], uv[3], 16-uv[0]] if turn == 1
                                    else [16-uv[3], uv[0], 16-uv[1], uv[2]])
                    candidate_rot = (rot + 90*turn) % 360
                    candidate = '/'.join([fields[0][0]+(str(candidate_rot) if candidate_rot else ''),
                                          fields[1]] + [f'{v:.6f}' for v in candidate_uv])
                    if (modifier in (0, 1, 2) and accepted(start, end, candidate)
                            and same_mapping(start, end, face, candidate, turn)):
                        new_modifier = {0: 4, 1: 17, 2: 18}[modifier]
                        texture = f'{new_modifier*1000+tile}:{name}'
                        if texture not in replacements:
                            new_id = max(mapping) + 1
                            mapping[new_id] = texture
                            replacements[texture] = new_id
                            texture_fields.append(f'patch{new_id}={texture}')
                        fields = candidate.split('/')
                        fields[1] = str(replacements[texture])
                        parts[face_index] = '/'.join(fields)
                        stats['preserved'] += 1
                    elif allow_stretch:
                        full_uv = [16 if uv[0] > uv[2] else 0, 16 if uv[1] > uv[3] else 0,
                                   0 if uv[0] > uv[2] else 16, 0 if uv[1] > uv[3] else 16]
                        candidate = '/'.join(fields[:2] + [f'{v:.6f}' for v in full_uv])
                        if not accepted(start, end, candidate):
                            raise ValueError(f'Geometry outside range: {model_file}:{index+1}')
                        parts[face_index] = candidate
                        stats['stretched'] += 1
                    else:
                        stats['remaining'] += 1
                        continue
                    changed = True
                pieces[box_index] = ':'.join(parts)
            if changed:
                lines[index] = ',box='.join(pieces) + '\n'
                texture_lines[tx_index] = ','.join(texture_fields) + '\n'
        if stats:
            print(model_file.name, dict(stats))
        totals.update(stats)
        if apply and (stats['preserved'] or stats['stretched']):
            model_file.write_text(''.join(lines))
            texture_file.write_text(''.join(texture_lines))
    print('TOTAL', dict(totals))
    return totals


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('renderdata', type=Path)
    parser.add_argument('--apply', action='store_true', help='Write repaired files (default: dry run)')
    parser.add_argument('--allow-texture-stretch', action='store_true')
    args = parser.parse_args()
    repair(args.renderdata, args.apply, args.allow_texture_stretch)
