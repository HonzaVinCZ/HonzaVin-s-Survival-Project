# Saro road rendering investigation (2026-10-11)

The current logs load Saro Road Blocks **4.4.1** on Minecraft 1.20.1 Forge.
The screenshot shows missing/black road areas, brown bands and road markings
with unexpected orientation. These symptoms predate this PR. The earlier
Dynmap face-validation repair did not modify either
`saros_road_blocks_mod-models.txt` or `saros_road_blocks_mod-texture.txt`;
Saro road-sign repairs belong to the separate `saros_road_signs_mod` module.

## What the available data establishes

The exact author's 4.4.1 Forge JAR was downloaded for a read-only asset audit.
Its SHA-1 matches the release metadata:
`7c8f9168fc71cacfd6f1e2c40efd60ec92effedd`.

- `assets/saros_road_blocks_mod/blockstates/asphalt.json` declares 1,856 states:
  29 texture variants, 16 heights and four facings. All have corresponding
  texture records in the supplied Dynmap data; no extra states are mapped.
- There are 1,827 explicit asphalt model records. The 29 unrotated full cubes
  intentionally use Dynmap's normal cube handling; their texture records exist.
- Every declared blockstate Y rotation matches the supplied model rotation
  (north 0, east 90, south 180, west 270). This checks the declared rotations;
  it does not prove that Dynmap samples the same pixels as the Minecraft client.
- All 30 PNG paths referenced by the asphalt texture records exist in that JAR.
  The logs contain no missing-resource warning for a Saro road texture.
- The real Dynmap beta 6 face validator accepts the supplied Saro road models.
  A successful validation is not a visual rendering test.

Thus there is no demonstrated missing static state, missing road PNG or
incorrect declared facing to repair yet. The screenshot alone cannot identify
the affected block IDs, heights or texture variants. An issue in Dynmap's
sampling/shading, stale tiles, a different road block/state, or custom content
requires further evidence. KubeJS recipes and tags cannot correct Dynmap's UV
sampling; a confirmed mapping defect would be repaired in renderdata. Custom
textures drawn by a client block-entity renderer require separate Dynmap support.

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

An upgrade is reasonable to test the author's client fixes, but is not a
confirmed fix for this server map. Test in a copied world with matching server
and client mod versions. If upgrading, regenerate/review Dynmap data for that
version, including the new 64 states, and reapply/retest the beta 6 workaround
if generated models need it. A new JAR does not refresh custom renderdata or
existing map tiles automatically. This PR does not change the mod version.

## Smallest useful next check

1. Let the current `surface` render finish, then refresh the map. The supplied
   log ends before that render completes, so tiles in the screenshot may include
   previous output. This is not established as the cause of the older issue.
2. In Minecraft, look at one correctly rendered road block and one incorrectly
   rendered block. Record their coordinates, full block IDs and the targeted
   block properties shown by F3, especially `texture_variant`, `variant` and
   `facing`. Include the in-game appearance of those same blocks.
3. If a custom road-line pack is used, identify the pack and texture name too.
   These are not represented by the audit of the built-in static assets.
4. Compare the same coordinates on `flat` and `surface` after rerendering.
   A mismatch confined to one perspective suggests sampling/shading rather than
   a missing state. Avoid rotating all road mappings from one map screenshot:
   many other states already display correctly.

That sample permits a targeted UV/texture fix or a reproducible Dynmap/Saro
bug report. No world blocks need to be replaced to gather it.

## Primary sources

- [Author's version feed](https://api.modrinth.com/v2/project/NnMIY8We/version)
- [Installed 4.4.1 metadata and artifact hashes](https://api.modrinth.com/v2/version/bYkUbL7Y)
- [June 1 Forge map-visibility release](https://api.modrinth.com/v2/version/4y78LKKI)
- [5.14 release notes](https://api.modrinth.com/v2/version/b1lobgM0)
- [5.15 metadata and artifact hashes](https://api.modrinth.com/v2/version/LmC1hV2D)
- [Dynmap beta 6 cube and patch texture sampling](https://github.com/webbukkit/dynmap/blob/36dc1adb1535081e1ee61e480e2664187e83b215/DynmapCore/src/main/java/org/dynmap/hdmap/TexturePack.java)
- [Dynmap beta 6 explicit model face conversion](https://github.com/webbukkit/dynmap/blob/36dc1adb1535081e1ee61e480e2664187e83b215/DynmapCore/src/main/java/org/dynmap/utils/PatchDefinition.java)
