# Server log repairs (2026-10-11)

Target: Minecraft 1.20.1, Forge 47.4.20, KubeJS 6. The existing
`server_scripts/hvcz_server.js` gameplay changes are preserved.

## Current logs: `latest(5).log` and `debug(3).log`

The server reaches `Done` at 13:38:48.695. Both logs end at 13:57:08 with
the surface radius render still in progress (4,500 tiles). The flat radius
render completes at 13:45:15 with 4,096 tiles; the surface render is not yet
confirmed complete.

| Check | Previous run | Current run |
| --- | ---: | ---: |
| KubeJS script errors | 0 | 0 |
| `Error parsing recipe` | 0 | 0 |
| Chest loot parsing errors | 0 | 0 |
| Unknown Thirst global loot serializer | 0 | 0 |
| Prepared chest loot overrides | 11 | 11 |
| Incendium recipe fallback | 1 | 1 |
| Dynmap invalid model patches | 41,110 | 0 |
| Dynmap obsolete model block names | 2 | 0 |
| Dynmap obsolete texture block names | 2 | 0 |

This confirms deployment of the Dynmap repair as well as the earlier KubeJS
repairs. The owner also committed the repaired uncompressed renderdata to the
PR branch. The supplied screenshot still shows Saro road texture/orientation
problems; those files were not changed by the face-validation repair. See
`dynmap/SARO_ROADS.md` for the installed 4.4.1 asset audit, newer-release
changelog comparison and the evidence needed to isolate an affected road state.
No additional road mapping or mod-config change is justified by this audit alone.

Remaining diagnostics include malformed Radar/TFMG tag resources, references
to absent Saro traffic-light items, client mixins on the dedicated server,
and the vehicle packs' truncated JSON/missing OBJ assets. During rendering,
Dynmap also reports missing Lootr Steve and Chipped `0.png` / `1.png` resources.
These three texture warnings are separate from the resolved obsolete block-name
warnings and do not identify a Saro road texture failure. Incendium's empty
smithing-template recipe still falls back to vanilla and needs an in-game check.

## Previous logs: `latest(4).log` and `debug(2).log`

The server reaches `Done` at 13:03:32. Both logs describe the same startup;
`latest` ends at 13:03:57 and `debug` at 13:04:28. This confirms the loot
reader repair, rather than long-running stability or every recipe in game.

| Check | Previous run | Current run |
| --- | ---: | ---: |
| KubeJS script errors | 0 | 0 |
| Recipe parsing errors | 0 | 0 |
| Chest loot parsing errors | 11 | 0 |
| Unknown Thirst global loot serializer | 0 | 0 |
| Prepared chest loot overrides | No marker | 11 |
| KubeJS recipe fallbacks | 2 | 1 |
| Dynmap invalid model patches | 41,110 | 41,110 |
| Dynmap obsolete block names | 2 | 2 |

The Lightman's Currency bank-table reference warning and Saro recipe fallback
are gone. Only Incendium's empty smithing-template fallback remains; its vanilla
recipe is preserved pending an in-game check. No additional KubeJS change is
needed for the issues already repaired.

The supplied `dynmap/renderdata` files are now included in the PR. Their repaired model/texture pairs are packaged in
`dynmap/hvcz-renderdata-fixes.zip`; installation instructions are in `dynmap/REPAIRS.md`. Dynmap 3.7
beta 6's actual Java face validator reproduces 42,700 rejected faces in the
complete supplied data (including 1,590 in modules that do not load in this
server run). The repaired data has zero rejected faces. Of these repairs,
38,294 preserve the texture mapping; 4,406 restore the face with a whole-tile
texture stretch. All 2,366,210 already accepted faces remain unchanged.
The two obsolete Create controller model entries and matching texture entries
are commented out. These are render-data repairs, not KubeJS or mod exclusions.
A new server run and rerender are required to confirm the deployed result.

The live map could not be visually inspected: the available browser upgraded
HTTP to HTTPS and returned a gateway error saying the server does not speak
TLS. This does not establish an outage for users opening the HTTP link.

## Previous logs: `latest(3).log` and `debug(1).log`

The server starts successfully. This run confirms zero KubeJS script errors,
zero `Error parsing recipe` messages, successful Thirst serializer registration,
and a reduction from eleven to two KubeJS recipe fallback warnings. The moose-rib
disable warning is gone. These startup logs do not prove every repaired crafting
recipe works in game.

The same eleven chest loot tables still fail. The reader's Java/path exceptions
are gone, but it silently fails to find resources because ModernFix 5.26.2's
resource cache expects separate path components. The old call supplied
`['data', 'thirst', 'loot_tables/chests/shipwreck_supply_bc.json']`; the cache
looks for a single child with that final slash-containing name, which does not
exist. The debug log confirms ModernFix's resource-pack mixin is active. This
behavior was checked against the exact `5.26.2+1.20.1` source tag, not inferred
from the absence of exceptions alone.

The revised reader supplies every component separately, e.g.
`['data', 'thirst', 'loot_tables', 'chests', 'shipwreck_supply_bc.json']`. This
retains the cache and reads the original mod JSON with its loot weights intact.
The same correction also applies to Saro's recipe-resource lookup; an explicit
air result is treated as empty even though `minecraft:air` is registered.

On the next startup/reload, expect:

```text
[HVCZ fixes] Prepared 11 chest loot table overrides
```

That message was added so skipped resources cannot be mistaken for a successful
repair. Confirm the eleven `Couldn't parse element loot_tables` messages and
the Lightman's Currency archaeology reference warning disappear. Retest an
unopened/new chest; previously opened chest contents are not regenerated.

The two current fallback warnings are Saro's control-box recipe and Incendium's
empty smithing template. Saro's guard now uses the corrected resource lookup;
Incendium remains preserved for an in-game behavior check. Dynmap still emits
41,112 FATAL model messages (41,110 invalid-patch messages and two stale block-name
messages), and the vehicle assets, lower-pack tags and furniture warnings remain.
DH's generator-detection warning also remains, as anticipated; the log does not
print its active generation setting, so it does not confirm that the config was
applied. The latest log ends about 31 seconds after `Done`, and debug logging
continues to about 55 seconds afterward.

## Previous logs: `latest(2).log` and `debug.log`

These are two views of the same server run. The server reaches `Done` at
12:25:31; the latest log ends at 12:26:56, so this is a startup check rather
than a long-running stability test.

| Check | Previous follow-up | Current run |
| --- | ---: | ---: |
| `Error parsing recipe` | 14 | 0 |
| Loot-table `Couldn't parse element` | 14 | 11 |
| Unknown Thirst global loot serializer | 15 | 0 |
| Repair script `Cannot read` messages | 0 (callback aborted) | 11 |
| Dynmap FATAL model messages | 41,112 | 41,112 |

The successful Thirst registration is logged explicitly. The remaining eleven
loot failures come from another boundary the earlier mock did not model:
KubeJS's `Path` conversion verifies paths against the Minecraft game directory.
Paths **inside** Forge's union/jar filesystem fail that check; `JsonIO` receives
null and throws. The current revision reads the installed mod's resource through
Forge 1.20.1's `ResourcePackLoader.getPackFor(...).get().getRootResource(...)`
instead. It consumes the returned stream as UTF-8 and closes it, avoiding both
forbidden class imports and script-side `Path` conversion.

The moose-rib replacement now prefers `alexsdelight:cooked_loose_moose_rib`, the
registered name in Alex's Delight's source, with a guarded legacy fallback. The
previous guessed `singular_cooked_moose_rib` name did not restore this recipe.
Additional guards cover the reported six Create DD empty-output recipes, two
Radar block recipes, Radar's missing intermediate controller, and the Saro
control-box recipe when its original JSON references an absent output.

`incendium:upgrade_elytra` falls back to vanilla because KubeJS rejects its empty
smithing template. That message alone does not establish broken gameplay; the
recipe is preserved pending an in-game check. Almost Unified can still warn
that it cannot determine the output of the deliberately disabled, false-condition
recipes. Those diagnostics do not mean the disabled recipes are craftable.

## Config change

In `config/DistantHorizons.toml`, change
`common.worldGenerator.distantGeneratorMode` from `SURFACE` to
`PRE_EXISTING_ONLY`, as recommended by DH's unsupported Twilight Forest
generator warning. This keeps LOD building from existing chunks and avoids
asking that unsupported generator to create new distant chunks. It applies to
all dimensions: distant terrain expands as chunks are explored or pregenerated.
LOD synchronization and ordinary Minecraft chunk generation remain enabled.
The generator-detection warning may still be printed; this is a compatibility
mitigation, not a claim that DH now supports Twilight Forest generation.

Apply this config on the server and restart. Copy the revised repair server
script too; keep the already-working startup script installed.

DynmapBlockScan's supported config offers module/block exclusions, not repairs
for invalid geometry. Excluding all 22 affected modules would discard valid map
models too, so no broad exclusion list is added. The generated model files supplied in the latest follow-up now have targeted
repairs; see `dynmap/REPAIRS.md`. CTM/Camera Overhaul mixins load
before their gameplay/render settings; disabling their config features does not
fix client-class loading on the dedicated server. Remove those client-only jars
from the server while retaining them on clients.

## Follow-up log: `latest(1).log`

The server reaches `Done`, but the first version of these repairs fails in two
callbacks. KubeJS's class filter rejects the direct `java.nio.file.Files` import,
aborting the data overrides. Rhino also rejects the `const Modifier` binding
inside the startup callback with `redeclaration of var Modifier`. Consequently,
14 recipe parsing errors, 14 loot-table parsing errors and 15 unknown Thirst
serializer messages remain in this run; it does not demonstrate repaired loot.

The first revision replaced `Files` with `JsonIO.readString(Path)` and used `var`
callback bindings. The startup correction is now confirmed by `latest(2).log`;
the data reader required the further revision described above. The original
startup failure was also reproduced in Rhino 2001.

## Install and verify

Copy `server_scripts/hvcz_log_fixes.js` and
`startup_scripts/hvcz_thirst_loot_fix.js` into the corresponding KubeJS folders.
Apply the Distant Horizons config change above on the server.
Install the startup script on **both server and clients**, then fully restart
both. `/reload` is insufficient for the serializer registration.

On startup, expect no KubeJS script errors and, if Thirst still lacks its
serializer, `[HVCZ fixes] Registered missing thirst:add_loot_table serializer`.
Verify that steel ingots/nuggets/blocks convert at 9:1 in both directions, and
that the moose-rib barbecue recipe works when its corrected ingredient exists.
Check newly generated/unopened chest loot; previously opened chests do not
regenerate their contents. Confirm `/reload` does not duplicate loot entries.

## Repairs

| Log problem | Repair |
| --- | --- |
| Two malformed Create DD tin unpacking recipes and four malformed Create/IE wire recipes | Early Forge `false` conditions disable these compatibility recipes when the target mod is absent. If you install Create DD or Immersive Engineering, repair/update the original malformed resources instead. |
| Six additional Create DD recipes with empty results | Disable when Create DD is absent; preserve them when the mod is installed. |
| Six Ironworks/Molten Metals recipes, two Ironworks/Create DD recipes, one Create Casing creative recipe reference missing inputs | Disable only the listed recipe when its input item is absent; keep it if the input exists. |
| Four TConstruct-namespace steel conversions reference missing items or empty shaped keys | Rebuild the same IDs using TFMG steel, preserving the 9:1 ratios. Almost Unified may deduplicate equivalent recipes. |
| Alex's Delight barbecue recipe references `amfd:singular_cooked_moose_rib` | Prefer registered `alexsdelight:cooked_loose_moose_rib`, with a legacy-name fallback if registered; otherwise disable only this already-broken alternative and log why. |
| Ten Thirst compatibility loot tables reference absent Brewin' and Chewin'/Farmer's Respite items | Read the installed mod's original tables and replace nonexistent item entries with weighted empty entries. Keep valid loot, rolls, conditions and relative probabilities. |
| Lightman's Currency IDAS bank loot references absent `quark:abacus` | Apply the same targeted entry repair. The current source table contains only an abacus; its repaired version yields no item when Quark's abacus is unavailable. Vault/other bank loot is untouched. |
| Three Radar loot tables reference unregistered optional blocks | Empty these tables only when their associated block item is absent. |
| Radar crafting outputs or network-filter intermediate item is absent | Disable only the reported recipes whose associated item is missing. |
| Saro control-box recipe has an empty output | Read that recipe's original JSON and disable it only if its result item is absent. |
| Fifteen Thirst global loot modifiers cannot decode `thirst:add_loot_table` | During Forge registry registration, register the existing Thirst codec only if its ID is missing. Do not replace the global modifier list or discard other mods' modifiers. |
| Four obsolete Saro's traffic-light tag entries | A guarded late tag cleanup is included, but `latest(1).log` shows LMFT has already removed/reported the missing entries before this callback. This does **not** eliminate the tag-loading message; correct the source tag in Saro's mod to remove it. |
| TFMG's null sulfuric-acid bucket tag | Add `tfmg:sulfuric_acid_bucket` to the tag if that item exists. The malformed lower-pack resource can still produce a parse message. |

High-priority data overrides are necessary: removing recipes after the initial
scan cannot prevent malformed JSON or missing-item deserialization errors.
Loot repairs read resources directly from installed mods and run on each reload.
They intentionally override only the listed resource IDs. If you later supply
custom datapack versions of those same tables, remove/adapt these repairs so the
custom tables take precedence.

## Remaining issues outside these repairs

- **Dynmap:** the current log still has 41,110 invalid-patch messages and two
  obsolete block names. The supplied render data is repaired in this revision
  and passes the installed release's face validator. Apply it, restart and
  rerender before treating the server/map outcome as confirmed. Some restored
  faces use the documented texture-stretch fallback.
- **Immersive Vehicles/PWIC:** four truncated vehicle JSON definitions
  (`m1126`, `m1134`, `m1151`, `btr70`), missing OBJ files, and legacy model parsing
  errors. Repair/replace the affected content-pack assets. Recipe scripts run
  after their parsing and cannot restore those vehicle definitions.
- **Client-side mixins on the dedicated server:** Camera Overhaul and CTM try
  to load client classes. Review whether these client rendering mods belong in
  the server's mod folder. Other missing mixin targets need compatible addon
  versions or upstream optional-compat guards, not invented placeholder items.
- **Null Radar entity tags:** `radar_animal.json` and `radar_hostile.json` in
  Radar's generated resources are empty/null. Radar also classifies entities
  through its normal `Animal`/`Enemy` checks. A higher-priority tag does not stop
  Minecraft parsing the malformed lower tag resource: tag resources are layered.
  Correct those files in an updated mod build to eliminate the parse messages.
- **Paladin's Furniture:** 2,849 warnings about querying dynamic recipe outputs
  without context, mostly during KubeJS recipe processing. This needs an
  integration fix; deleting the furniture recipes would break crafting. The
  follow-up run has 2,618 such warnings; that reduction alone does not establish
  a fix.
- **Display Delight:** missing-food compatibility warnings, including foods
  from absent addons. Resolve in that mod's compatibility handling/version;
  registering dummy food items would conceal missing functionality.
- **TFMG:** processing-time/heat-condition fields rejected or ignored by several
  Create recipe types. These need matching Create/TFMG versions or inspection of
  their serializers. Fields are not stripped here because that can change
  machine behavior without fixing the underlying compatibility.
- **Distant Horizons:** Twilight Forest chunk-generator support warning;
  mitigated with `PRE_EXISTING_ONLY`, as described above.
- **Dynmap:** additional missing textures for Lootr/Chipped and a stale Create
  block name. **Discord/JDA:** one HTTP 429, with a 536-second retry delay.
  The follow-up log again has a 429, with a 494-second delay.
- Forge library `mods.toml` notices, missing refmaps, and other mod-level
  warnings are not evidence of an error in the existing KubeJS script.

## Validation and limits

The original supplied log covers startup and about 1 hour 45 minutes afterward;
`latest(1).log` ends about 25 seconds after `Done`, and `latest(2).log` ends about
85 seconds after `Done`. These short runs cannot establish long-running
stability. All three runs finish starting.

Validation of the revised scripts:

- JavaScript syntax checks and eleven passing Node tests in
  `tests/kubejs-log-fixes.test.cjs`, covering class-filter rejection,
  mod-present/absent guards, loot probabilities, registration and reload behavior.
- `tests/KubeJSRhinoSmoke.java` runs both scripts in Rhino's actual `2001`
  interpreter, with mocked Minecraft/Forge bindings and real Java callback /
  supplier conversion. It reproduces the original `const Modifier` failure and
  passes with the revised startup script, then exercises data generation, tag
  callbacks and a repeated reload. Its revised loot check uses real ZIP streams,
  real Java byte-array/string conversion and UTF-8 text; all 22 opened streams
  across two reloads are closed. Forge pack lookup is still mocked, so this is
  not a full Forge integration test. The resource-pack mock now models ModernFix's
  separate-component lookup. The preceding full server script fails this check
  by silently omitting loot; the corrected version prepares all eleven tables
  on both reloads. The engine also verifies passing a JavaScript array to the
  Java `String...` method.
- APIs checked against KubeJS `2001`, Thirst `1.20.1`, and Forge sources.

Run the Node checks with `node --test tests/kubejs-log-fixes.test.cjs`. To run the
Rhino check with Rhino 2001 and its dependencies on your classpath:

```sh
javac -cp "$RHINO_TEST_CLASSPATH" -d /tmp/hvcz-rhino-test tests/KubeJSRhinoSmoke.java
java -cp "/tmp/hvcz-rhino-test:$RHINO_TEST_CLASSPATH" KubeJSRhinoSmoke
```

This repository does not include the mod jars or a runnable dedicated server.
An actual Forge startup/client join and in-game crafting/loot test are still
required. If a different Thirst build moves its codec class, the startup script
logs a warning and leaves its registries alone.

Source references:
- [KubeJS data event](https://github.com/kube-mods/kubejs/blob/2001/common/src/main/java/dev/latvian/mods/kubejs/script/data/DataPackEventJS.java)
- [KubeJS JSON binding](https://github.com/kube-mods/kubejs/blob/2001/common/src/main/java/dev/latvian/mods/kubejs/util/JsonIO.java)
- [KubeJS class filter and bindings](https://github.com/kube-mods/kubejs/blob/2001/common/src/main/java/dev/latvian/mods/kubejs/BuiltinKubeJSPlugin.java)
- [KubeJS Forge class filter](https://github.com/kube-mods/kubejs/blob/2001/forge/src/main/java/dev/latvian/mods/kubejs/forge/BuiltinKubeJSForgePlugin.java)
- [KubeJS path conversion](https://github.com/kube-mods/kubejs/blob/2001/common/src/main/java/dev/latvian/mods/kubejs/util/UtilsJS.java)
- [Forge 1.20.1 mod resource packs](https://github.com/MinecraftForge/MinecraftForge/blob/1.20.1/src/main/java/net/minecraftforge/resource/ResourcePackLoader.java)
- [Forge 1.20.1 resource streams](https://github.com/MinecraftForge/MinecraftForge/blob/1.20.1/src/main/java/net/minecraftforge/resource/PathPackResources.java)
- [ModernFix 5.26.2 resource cache interception](https://github.com/embeddedt/ModernFix/blob/a70f76a34dae74d033e486775bf4a2fec13219c3/src/main/java/org/embeddedt/modernfix/common/mixin/perf/resourcepacks/ForgePathPackResourcesMixin.java)
- [ModernFix 5.26.2 component lookup](https://github.com/embeddedt/ModernFix/blob/a70f76a34dae74d033e486775bf4a2fec13219c3/src/main/java/org/embeddedt/modernfix/resources/PackResourcesCacheEngine.java)
- [Alex's Delight registered items](https://github.com/Baisylia/Alexs-Delight/blob/main/src/main/java/com/ncpbails/alexsmobs/item/ModItems.java)
- [DynmapBlockScan exclusion settings](https://github.com/webbukkit/DynmapBlockScan/blob/master/forge-1.19.3/src/main/java/org/dynmapblockscan/forge_1_19_3/DynmapBlockScanMod.java)
- [KubeJS Forge event bindings](https://github.com/kube-mods/kubejs/blob/2001/forge/src/main/java/dev/latvian/mods/kubejs/forge/BuiltinKubeJSForgePlugin.java)
- [Thirst loot codec](https://github.com/ghen-git/Thirst-Mod/blob/1.20.1/src/main/java/dev/ghen/thirst/foundation/common/loot/AddLootTableModifier.java)
- [Thirst initialization](https://github.com/ghen-git/Thirst-Mod/blob/1.20.1/src/main/java/dev/ghen/thirst/Thirst.java)
- [Radar entity classification](https://github.com/Arsenalists-of-Create/Create-Radar/blob/master/src/main/java/com/happysg/radar/block/radar/track/TrackCategory.java)
