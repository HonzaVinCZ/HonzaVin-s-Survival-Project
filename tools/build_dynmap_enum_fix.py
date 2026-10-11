#!/usr/bin/env python3
"""Build the server addon from checked-in sources; no downloads or Java compiler."""
from pathlib import Path
import hashlib
import zipfile

root = Path(__file__).resolve().parents[1]
source = root / 'dynmap' / 'enum-fix'
target = root / 'dynmap' / 'hvcz-dynmap-enum-fix-1.0.1.jar'
with zipfile.ZipFile(target, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
    for path in sorted(source.rglob('*')):
        if path.is_file():
            info = zipfile.ZipInfo(path.relative_to(source).as_posix(), (2026, 10, 11, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o100644 << 16
            archive.writestr(info, path.read_bytes())
print(f'{target.name}: SHA-256 {hashlib.sha256(target.read_bytes()).hexdigest()}')
