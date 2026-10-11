# Dynmap serialized-property fix for Saro road heights

The included `hvcz-dynmap-enum-fix-1.0.0.jar` is a small **server-only Forge
addon**, targeting Minecraft 1.20.1, Forge 47 and the installed Dynmap
`3.7-SNAPSHOT-948` (`Dynmap-3.7-beta-6-forge-1.20.jar`). It needs no client addon.
It does not contain or replace the Dynmap/Saro JARs.

## Install and verify

1. Stop the server. Keep the existing Dynmap and Saro JARs and repaired
   renderdata. Copy **`dynmap/hvcz-dynmap-enum-fix-1.0.0.jar` into the server's
   `mods` folder**. This addon is separate from `hvcz-renderdata-fixes.zip`.
2. Start the server. Look for this successful-patch message:

   ```text
   [HVCZ Dynmap enum fix] Applied serialized property names to Forge 1.20.1.
   ```

   `Unsupported registration bytecode` means the patch was not applied; retain
   that message and the startup log. A KubeJS reload cannot apply this addon.
3. Stand near the affected roads and run `/dynmap radiusrender 100`. Wait until
   the surface and flat renders finish, then refresh the map. Old tiles retain
   their previous appearance until rerendered.
4. Compare the three sample coordinates in [SARO_ROADS.md](SARO_ROADS.md),
   especially the lowered `variant=6` road at **174, 67, 265**. The numeric
   heights should now reach their existing models/textures. The owner has
   confirmed that heights, line orientation and road appearance are correct after deploying this addon on 2026-10-11.

Remove the addon and restart to undo the code patch; rerender tiles to refresh
output. Remove/review it before changing Dynmap versions: its dependency is
pinned to the tested release. No world-save conversion or block replacement
is involved.

SHA-256 of the included JAR:
`375422b8c14147d010ba2dac6e556639ea1d1a3913ad1c6d61087cefbb88fb78`.

## Scope

Dynmap registers Java enum constant names instead of Minecraft's serialized
property names. Saro's `SIX` becomes `six` in Dynmap, but `6` in the chunk
palette. A lookup miss returns and caches air silently. Every numeric road
height is affected; the full-height `DEFAULT` / `default` value already matches.

The addon uses Forge's supported JavaScript coremod loader. It changes only the
property-value string-building call inside
`org.dynmap.forge_1_20.DynmapPlugin.initializeBlockStates()`: use
`Property#getName(value)` instead of `Comparable#toString()`. It runs before
state registration/model loading/chunk caching. Boolean, integer and correctly
named enum properties retain their canonical names. Other enum properties with
the same naming mismatch also benefit. It does not rotate models, rewrite
Minecraft registries or change block IDs, textures, geometry or world data.

The transformer requires exactly one matching bytecode pattern. Already fixed
or unsupported input is left unchanged and logged. The source implements the
same correction proposed in [upstream Dynmap PR #4273](https://github.com/webbukkit/dynmap/pull/4273),
which was open on 2026-10-11. Normal KubeJS recipe/data scripts cannot repair
this early Java registration call safely.

## Build and reproduce

All addon sources are in `dynmap/enum-fix`. Build with Python 3:

```sh
python tools/build_dynmap_enum_fix.py
```

This deterministic build uses only the standard library and bundles the
checked-in TOML, coremod manifest, JavaScript and license. No downloaded code
or Minecraft classes are packaged in the addon.

`tests/DynmapEnumRegression.java` executes the shipped transformer in Nashorn
15.3 against the **actual installed Dynmap binary**. It checks the transformed
method with ASM's stack verifier, asserts only the intended method changes,
and verifies idempotence and unsupported-input handling. It executes the
actual before/after string-building bytecode against the actual Saro enums,
then checks canonical chunk-palette strings through Dynmap's real
`DynmapBlockState` implementation, including cached lookups.

| Saro Forge 1.20.1 artifact | Numeric-height states resolving as air before | Correct state lookups after |
| --- | ---: | ---: |
| 4.4.1 | 1,740 | All 1,856 |
| 5.15 | 1,800 | All 1,920 |

Minecraft's Property/BlockState boundary and Forge ASMAPI naming/logging are
stubbed for this isolated test; actual Forge mappings were checked against the
1.20.1 MCP configuration. Forge 47.4.20's source also confirms discovery of
`META-INF/coremods.json` from a mod JAR. **A full Forge server startup, client
join and visual map render have not been run in this workspace.** The owner
has subsequently deployed the addon and confirmed correct road rendering.
The successful regression demonstrates the state lookup correction, not every road's shading/UV output.

To reproduce with Java 17, supply the official beta 6 source and hash-verified
Dynmap/Saro artifacts, Nashorn 15.3 and ASM 9.5 JARs. For example, use these
shell variables for their local paths:

```sh
# DY_SOURCE: official Dynmap v3.7-beta-6 checkout
# DY_JAR: Dynmap-3.7-beta-6-forge-1.20.jar
# SARO_OLD / SARO_NEW: Saro 4.4.1 / 5.15 Forge 1.20.1 JARs
# ENUM_CP: Nashorn 15.3 plus ASM 9.5 core/tree/commons/analysis/util JARs
mkdir -p /tmp/hvcz-dynmap-enum-test
javac -cp "$ENUM_CP" -d /tmp/hvcz-dynmap-enum-test \
  -sourcepath "tests/dynmap-enum-stubs:$DY_SOURCE/DynmapCoreAPI/src/main/java" \
  tests/DynmapEnumRegression.java \
  tests/dynmap-enum-stubs/net/minecraftforge/coremod/api/ASMAPI.java
java -cp "/tmp/hvcz-dynmap-enum-test:$ENUM_CP" DynmapEnumRegression \
  dynmap/enum-fix/coremods/serialized_properties.js "$DY_JAR" "$SARO_OLD" "$SARO_NEW"
```

Dynmap artifact SHA-1: `a3718c3a850f30377aca18a333d8941fbb0ba91e`.
Saro artifact hashes and release notes are linked in [SARO_ROADS.md](SARO_ROADS.md).
