# Saro road rendering investigation (2026-10-11)

The current logs load Saro Road Blocks **4.4.1** on Minecraft 1.20.1 Forge.
The screenshot shows missing/black road areas, brown bands and road markings
with unexpected orientation. These symptoms predate this PR. The earlier
Dynmap face-validation repair did not modify either
`saros_road_blocks_mod-models.txt` or `saros_road_blocks_mod-texture.txt`;
Saro road-sign repairs belong to the separate `saros_road_signs_mod` module.

## Confirmed cause: numeric road heights become air

The new F3 screenshots identify these built-in `saros_road_blocks_mod:asphalt`
states. All three have `texture_variant=straight` and look correct in Minecraft:

| Targeted block coordinates | Facing | Height (`variant`) | Dynmap state lookup before this fix |
| --- | --- | --- | --- |
| 186, 66, 270 | south | default | Matches |
| 180, 66, 265 | west | default | Matches |
| 174, 67, 265 | west | 6 | Fails; returns air |

Dynmap beta 6's Forge adapter builds its registry of states using
`bs.getValue(p).toString()`. Saro's height enum has Java names `ONE` through
`FIFTEEN`, but Minecraft saves the property as `1` through `15`. For example,
Dynmap registers `variant=SIX`, while the chunk palette contains `variant=6`.
Lowercasing does not resolve that difference. `DynmapBlockState` returns and
caches **AIR** for the miss, so models and textures are never consulted.
This failure produces no missing-texture warning. The full-height enum
`DEFAULT` serializes as `default`, so those states do match.

The shipped regression reproduces the failure with the **actual Dynmap beta 6
class bytecode**, actual Saro enums and Dynmap's real state lookup. In 4.4.1,
1,740 of 1,856 asphalt states fail before the fix: every numeric height,
across all facings and textures. After using `Property#getName(value)`, all
1,856 resolve to the correct state and keep resolving through the cache.
The same test reproduces the bug in Saro 5.15 (1,800 of 1,920 states) and
resolves all 1,920 after the fix. An upgrade to Saro alone does not fix it.

This is a **Dynmap property-serialization bug**, rather than a missing Saro
PNG or a road facing that should be changed in the world. Upstream
[Dynmap PR #4273](https://github.com/webbukkit/dynmap/pull/4273) proposes the
same canonical-property-name correction and is still open at this check.

This PR includes a small server addon that patches that registration call
before Dynmap loads its models and chunk caches. See [ENUM_FIX.md](ENUM_FIX.md)
for installation, scope and tests. Ordinary KubeJS recipe/data scripts cannot
correct this early Java call safely; no speculative runtime registry rewrite
is added. Existing Saro renderdata is retained.

## Deployment confirmed by the owner

After installing the addon, restarting and rendering, the owner reported on
2026-10-11 that road heights, line orientation and the remaining road appearance
all work correctly. No additional Saro texture/rotation changes are needed
for the reported area. This is an in-game/server observation supplied by the
owner, in addition to the isolated lookup/bytecode regression below.

## Static asset checks

The exact author's 4.4.1 Forge JAR was hash-verified against release metadata:
`7c8f9168fc71cacfd6f1e2c40efd60ec92effedd`.
All 1,856 declared asphalt states have supplied texture records. The 1,827
explicit model records cover the rotated/lowered states; the 29 unrotated
full cubes use normal cube handling. Declared Y rotations match the supplied
models (north 0, east 90, south 180, west 270). All 30 referenced asphalt PNGs
exist. The real beta 6 face validator accepts the Saro road models.

These checks establish static coverage and declared rotations, not the
correctness of Dynmap's pixel sampling, shading or completed tiles. The enum
bug explains why valid static data alone did not restore the lowered roads.

## Newer Saro releases

The author's Modrinth version feed was checked for **Forge + Minecraft 1.20.1**,
including every release newer than 4.4.1. The newest matching published release
at this check is **5.15** (2026-09-02).

| Release | Relevant changes, paraphrased | What it establishes |
| --- | --- | --- |
| 4.4.1 | Immersive Vehicles snow collision hotfix | No Dynmap fix claimed |
| 5.0 | Custom road-line content packs and server/client pack synchronization | More rendering paths; pack textures need their own map support |
| 5.1, June 1 Forge build | Road texture UI fix; visibility on vanilla maps and Xaero's Minimap | Those maps are explicitly named; Dynmap is not |
| 5.1, June 14 build | Sidewalk snow texture and road block-entity crash fixes | Client/mod fixes, with no stated Dynmap support |
| 5.2–5.4 | Custom content-pack overlay crash/visibility fixes | Does not establish a fix for existing built-in Dynmap mappings |
| 5.8 | Road-line brightness correction | No Dynmap claim |
| 5.9–5.11 | Missing pack-texture logging/reloading and rendering-performance fixes | No Dynmap claim |
| 5.12–5.13 | White-corner selection/button fixes | Paint GUI fixes |
| 5.14 | Lines remain visible at shallow viewing angles and with shaders | A relevant in-game visual fix; its effect on Dynmap is unverified |
| 5.15 | Street-light pole recipe and Fabric painting sound fixes | No additional Dynmap rendering fix claimed |

The 5.15 Forge JAR was also hash-verified against its metadata
(`f74696dc29b550590007f32fe7791682d8495889`). All **961 model JSON files**
and **134 texture assets** from 4.4.1 remain byte-identical in 5.15. The asphalt
blockstate JSON retains every old state mapping and adds 64 states for a new
`road_block_linie_grad_eck` texture variant. Therefore replacing the JAR alone
does not replace those old model/texture assets. This does not rule out changes
elsewhere in the mod's code. No changelog entry explicitly mentions Dynmap.

An upgrade can test the author's client fixes, but the actual 5.15 height enums
still reproduce the Dynmap lookup bug. Test in a copied world with matching server
and client mod versions. If upgrading, regenerate/review Dynmap data for that
version, including the new 64 states, and reapply/retest the beta 6 workaround
if generated models need it. A new JAR does not refresh custom renderdata or
existing map tiles automatically. This PR does not change the mod version.

## Installation and checks for other areas

1. Install the enum addon following [ENUM_FIX.md](ENUM_FIX.md), restart and
   confirm its successful-patch log marker. A KubeJS reload is insufficient.
2. Stand near the sampled roads and run `/dynmap radiusrender 100`. Wait until
   both `surface` and `flat` finish, then refresh the map. The earlier supplied
   logs ended with the surface render still running.
3. Compare the three coordinates above on both perspectives. First confirm
   that the `variant=6` block appears. Then check the two full-height samples
   for correct line direction and surface color. If an issue remains, retain
   matching in-game and map screenshots of those coordinates for a targeted
   sampling/rotation investigation.

Do not rotate every road mapping or replace world blocks to work around the
lookup bug. Custom road-line packs, if present, need separate render support;
these samples and tests concern the built-in `straight` texture.

## Primary sources

- [Author's version feed](https://api.modrinth.com/v2/project/NnMIY8We/version)
- [Installed 4.4.1 metadata and artifact hashes](https://api.modrinth.com/v2/version/bYkUbL7Y)
- [June 1 Forge map-visibility release](https://api.modrinth.com/v2/version/4y78LKKI)
- [5.14 release notes](https://api.modrinth.com/v2/version/b1lobgM0)
- [5.15 metadata and artifact hashes](https://api.modrinth.com/v2/version/LmC1hV2D)
- [Dynmap beta 6 cube and patch texture sampling](https://github.com/webbukkit/dynmap/blob/36dc1adb1535081e1ee61e480e2664187e83b215/DynmapCore/src/main/java/org/dynmap/hdmap/TexturePack.java)
- [Dynmap beta 6 explicit model face conversion](https://github.com/webbukkit/dynmap/blob/36dc1adb1535081e1ee61e480e2664187e83b215/DynmapCore/src/main/java/org/dynmap/utils/PatchDefinition.java)
- [Dynmap serialized-property correction, upstream PR #4273](https://github.com/webbukkit/dynmap/pull/4273)
