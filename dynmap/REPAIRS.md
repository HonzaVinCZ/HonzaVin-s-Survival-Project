# Render-data repair for Dynmap 3.7 beta 6

The supplied server logs use `Dynmap-3.7-beta-6-forge-1.20.jar`, runtime version
`3.7-SNAPSHOT-948`. The folder's `version.txt` says 949; validation uses the
runtime release from the log. No web files are needed to fix these model errors.

## Cause and result

Dynmap's `PatchDefinition.validate()` uses V bounds in two U-coordinate terms
when checking the visible corners. Narrow texture crops can therefore produce
out-of-range *validation* points even when the actual face is within range.
Dynmap rejects the face and emits `Invalid modellist patch`.

The supplied model files contain 2,408,910 faces. The release's actual Java
implementation rejects 42,700, matching the 41,110 logged faces plus 1,590 in
`bellsandwhistles` and `create_no_touching`, which are not enabled in this run.

| Repair | Faces |
| --- | ---: |
| Reparameterize U/V, compensate with texture rotation; preserve geometry, crop, texture and biome tint | 38,294 |
| Use the full texture tile on the existing face | 4,406 |
| Already valid, unchanged | 2,366,210 |
| Rejected after repair | 0 |

The full-tile fallback restores previously missing surfaces but **stretches
their texture instead of retaining the original crop**. This affects 12 Alex's
Mobs, 216 Bells & Whistles, 696 Chipped, 300 Create, 408 Create No Touching,
248 Radar, 128 Create Big Cannons, 8 Display Delight, 1,316 Lightman's Currency,
184 PFM and 890 TFMG faces. All Saro road-sign repairs preserve their texture
mapping. Geometry, element/model rotations, shading and block-state mappings
are retained. No modules or blocks are broadly excluded.

The two model entries and two texture entries for the absent
`create:crushing_wheel_controller` are commented out. This also addresses the
two `Invalid texture block name` warnings.

## Apply

1. Stop the server and back up its current `dynmap/renderdata` folder somewhere
   **outside** `renderdata`. Dynmap may load backup model files left there.
2. Extract `dynmap/hvcz-renderdata-fixes.zip` from this PR. Copy its `renderdata`
   contents into the server's `dynmap/renderdata` directory. The archive contains 24 repaired
   model/texture pairs; copy both. Keep the existing web folder.
3. Restart. Verify that the invalid modellist-patch messages and obsolete
   controller model/texture warnings disappear.
4. Existing tiles retain the old rendering until rerendered. From in game,
   stand near affected mod blocks and use `/dynmap radiusrender 100` for a
   limited visual check. Check signs, furniture, machines and the documented
   stretched faces. For existing overworld coverage, `/dynmap fullrender world`
   rerenders the world; schedule this heavier operation at a suitable time.

These files are custom data directly under `renderdata`. Dynmap's Mod Support
API regenerates the separate `renderdata/modsupport` directory. If you later
regenerate/copy these custom files with BlockScan, apply the repair again and
retest. A Dynmap update also needs retesting; this workaround targets beta 6.

## Reproduce

`tools/repair_dynmap_models.py` defaults to a dry run and preserves texture
mapping wherever possible. Pass `--apply` to write and explicitly add
`--allow-texture-stretch` to include the documented fallback. Back up first.
The already repaired files produce `TOTAL {}` on another run.

```sh
python tools/repair_dynmap_models.py dynmap/renderdata
python tools/repair_dynmap_models.py dynmap/renderdata --apply --allow-texture-stretch
```

The uncompressed renderdata committed by the user is retained as the original
snapshot. Use the ZIP to install the repair, or run the helper on that snapshot.

`tests/DynmapModelRegression.java` compares original and repaired data using
the actual release's `PatchDefinition`: every repaired face passes; every
previously accepted face is byte-identical; texture-preserving repairs retain
sampled physical positions, visible bounds, normals, tile, crop, shading and
biome tone. The known fallback count is asserted separately.

To run this check with Java 17, obtain the official Dynmap source at
`v3.7-beta-6` (`36dc1adb1535081e1ee61e480e2664187e83b215`). Compile
`PatchDefinition.java` and the regression class with source paths pointing to
`DynmapCore/src/main/java` and `DynmapCoreAPI/src/main/java`, with
`tests/dynmap-stubs` first on the source path. The bundled test-only logger
avoids loading the server's logging/bootstrap dependencies. For example,
with the official sources at `<dynmap-source>`, the original snapshot in
`<original-renderdata>` and extracted ZIP contents in `<repaired-renderdata>`:

```sh
mkdir -p <compiled-classes>
javac -d <compiled-classes> -sourcepath tests/dynmap-stubs:<dynmap-source>/DynmapCore/src/main/java:<dynmap-source>/DynmapCoreAPI/src/main/java <dynmap-source>/DynmapCore/src/main/java/org/dynmap/utils/PatchDefinition.java tests/DynmapModelRegression.java
java -Xmx1g -cp <compiled-classes> org.dynmap.utils.DynmapModelRegression <original-renderdata> <repaired-renderdata>
```

Primary source: [visible-corner validator and model-face conversion](https://github.com/webbukkit/dynmap/blob/36dc1adb1535081e1ee61e480e2664187e83b215/DynmapCore/src/main/java/org/dynmap/utils/PatchDefinition.java),
[texture rotation/tint sampling](https://github.com/webbukkit/dynmap/blob/36dc1adb1535081e1ee61e480e2664187e83b215/DynmapCore/src/main/java/org/dynmap/hdmap/TexturePack.java),
and [generated mod-support directory](https://github.com/webbukkit/dynmap/blob/36dc1adb1535081e1ee61e480e2664187e83b215/DynmapCore/src/main/java/org/dynmap/modsupport/ModSupportImpl.java).
