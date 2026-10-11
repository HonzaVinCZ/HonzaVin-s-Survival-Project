#!/usr/bin/env python3
"""Package the two server datapacks reproducibly, using checked-in files only."""
from pathlib import Path
import hashlib
import zipfile

root = Path(__file__).resolve().parents[1] / 'datapacks'
for name in ('hvcz-radar-tag-fix', 'hvcz-tfmg-tag-fix'):
    source = root / name
    target = root / (name + '.zip')
    with zipfile.ZipFile(target, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for path in sorted(source.rglob('*')):
            if path.is_file():
                info = zipfile.ZipInfo(path.relative_to(source).as_posix(), (2026, 10, 11, 0, 0, 0))
                info.compress_type = zipfile.ZIP_DEFLATED
                info.external_attr = 0o100644 << 16
                archive.writestr(info, path.read_bytes())
    print(f'{target.name}: SHA-256 {hashlib.sha256(target.read_bytes()).hexdigest()}')
