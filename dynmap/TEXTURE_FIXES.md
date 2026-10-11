# Missing Chipped and Lootr textures in Dynmap

`latest(7).log` and `debug(5).log` confirm successful deployment of the tag,
Almost Unified and addon-metadata repairs from PR #2. During rendering, Dynmap
still reports these three resource paths:

| Module | Missing path | Repair |
| --- | --- | --- |
| Chipped | `assets/minecraft/textures/1.png` | Use the declared `paper_lantern_bottom` texture for 12 standing paper-lantern states |
| Chipped | `assets/minecraft/textures/0.png` | Use each variant's declared texture for 12 hanging paper soul-lantern states |
| Lootr | `assets/minecraft/textures/entity/player/wide/steve.png` | Use Dynmap's bundled 64×64 classic Steve texture at `assets/minecraft/textures/entity/steve.png` for the trophy |

## Why these paths fail

The hash-verified [Chipped 3.0.7 Forge artifact](https://modrinth.com/mod/chipped/version/pi3f4er3)
contains literal face textures `1` in `paper_lantern` and `0` in
`paper_lantern_2_hanging`, rather than `#1` / `#0` references to the model's
texture slots. BlockScan recorded those literals as `minecraft:1` and
`minecraft:0`. The model declarations and child overrides identify the
intended assets: the standing variants share a bottom texture; hanging soul
variants each have their own texture. Both waterlogged states are repaired.
The twelve affected block variants are blue/dark-blue/green/purple/red/white
paper lanterns and blue/golden/gray/lime/orange/yellow paper soul lanterns.

This changes Dynmap render data only; it does not patch Chipped's client models.
Every replacement uses an existing texture definition and PNG in the installed
Chipped JAR. Texture modifiers, patch numbers, UV/geometry files, rotations and
state selection remain unchanged. The two unused numeric texture declarations
are removed.

Dynmap beta 6 already bundles a classic Steve texture at the older path. The
Lootr repair points its trophy definition there, without adding image assets
or altering chest/barrel definitions. A resource pack containing the modern
skin at the original path can instead retain that original trophy definition.

## Apply

1. Stop the server. Back up the two texture files **outside** `renderdata`.
2. Extract `hvcz-dynmap-texture-fixes.zip` and copy its two files into the
   server's `dynmap/renderdata/`, replacing `chipped-texture.txt` and
   `lootr-texture.txt`. The same repaired files are checked in there.
   If also installing the older `hvcz-renderdata-fixes.zip`, apply this smaller
   texture archive **after** it; the older archive is a face-repair snapshot.
3. Restart and trigger a render near lanterns/trophies, e.g.
   `/dynmap radiusrender 100`. The three missing-resource warnings should
   disappear when the texture pack loads. Previously rendered tiles need a
   rerender to show the corrected surfaces.

Keep the existing Dynmap/HVCZ addon JARs and the repaired model files. No client
installation, block replacement, registry change or world conversion is needed.
Reapply after regenerating these files with BlockScan.

## Validation and reproduction

```sh
python tools/repair_dynmap_textures.py \
  --chipped-jar /path/to/chipped-forge-1.20.1-3.0.7.jar \
  --dynmap-jar /path/to/Dynmap-3.7-beta-6-forge-1.20.jar
# Add --apply to write the files and rebuild the two-file archive.
```

The tool checks exact artifact hashes, resolves each affected blockstate's
model inheritance and declared texture slots, verifies the PNG exists, and
uses its existing Dynmap texture definition. It refuses an unexpected artifact
or ambiguous model/state instead of guessing. A rerun on repaired files is
idempotent and rebuilds the ZIP byte-for-byte.

Validation confirmed exactly 24 block-state records changed, with all other
fields/records retained; only two obsolete texture declarations were removed.
All referenced replacement PNGs decode, and the bundled Steve image is 64×64.
The archive matches the checked-in two texture files. This follow-up has not
been run on the modded server or visually checked in the live map yet.

Artifact SHA-1:

- Chipped: `25ee2a0846059d8f21d28b94b7e0229b60cb5499`
- Dynmap: `a3718c3a850f30377aca18a333d8941fbb0ba91e`

ZIP SHA-256: `491bac68ea78304897530567febc80eb1fd5806e54337abf8a3385f3a3e56dff`.
