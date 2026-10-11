#!/usr/bin/env python3
"""Run the tag-filter regression with a supplied official 1.20.1 server bundle.

Usage: python tools/check_tag_filters.py /path/to/server.jar
Requires a Java 17 JDK; does not start a server or download/package Minecraft.
"""
from pathlib import Path
import hashlib
import io
import os
import subprocess
import sys
import tempfile
import zipfile

root = Path(__file__).resolve().parents[1]
bundle = Path(sys.argv[1]).read_bytes()
if hashlib.sha1(bundle).hexdigest() != '84194a2f286ef7c14ed7ce0090dba59902951553':
    raise SystemExit('Expected the official Mojang Minecraft 1.20.1 server bundle')

with tempfile.TemporaryDirectory(prefix='hvcz-tag-filter-test-') as temporary:
    work = Path(temporary)
    jars = []
    with zipfile.ZipFile(io.BytesIO(bundle)) as archive:
        for name in archive.namelist():
            if not name.endswith('.jar'):
                continue
            target = work / ('library-' + str(len(jars)) + '.jar')
            data = archive.read(name)
            if name.startswith('META-INF/versions/'):
                # The test and Mojang's obfuscated classes share the default
                # package. Strip only certificate files from a temporary copy
                # to avoid a mixed-signers error. Class bytes stay unchanged.
                with zipfile.ZipFile(io.BytesIO(data)) as source, zipfile.ZipFile(target, 'w') as output:
                    for entry in source.infolist():
                        if not entry.filename.upper().endswith(('.SF', '.RSA', '.DSA', '.EC')):
                            output.writestr(entry, source.read(entry))
            else:
                target.write_bytes(data)
            jars.append(str(target))
    classes = work / 'classes'
    classes.mkdir()
    classpath = os.pathsep.join(jars)
    subprocess.run(['java', '-m', 'jdk.compiler/com.sun.tools.javac.Main', '-cp', classpath,
                    '-d', str(classes), str(root / 'tests/MinecraftTagFilterSmoke.java')], check=True)
    subprocess.run(['java', '-cp', str(classes) + os.pathsep + classpath,
                    'MinecraftTagFilterSmoke', str(root / 'datapacks')], check=True, cwd=work)
