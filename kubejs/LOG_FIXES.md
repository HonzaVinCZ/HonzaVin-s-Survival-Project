# Server log repairs (2026-10-11)

Target: Minecraft 1.20.1, Forge 47.4.20, KubeJS 6. The existing
`server_scripts/hvcz_server.js` gameplay changes are preserved. Additional
TFMG steel/fluid unification lives in separate scripts; see
[STEEL_UNIFICATION.md](STEEL_UNIFICATION.md).

## Current logs: `latest(7).log` and `debug(5).log`

Both files cover the same startup and short rendering interval, from 19:05:46
through 19:07:22. The server reaches `Done` at 19:06:16.836; Dynmap completes
its delayed initialization at 19:06:39.202. No crash appears in this excerpt.

| Check | Previous run | Current run |
| --- | ---: | ---: |
| KubeJS startup/server script errors | 0 | 0 |
| Chest loot parsing errors | 0 | 0 |
| Prepared chest loot overrides | 11 | 11 |
| Invalid Radar/TFMG tag resources | 3 | 0 |
| HVCZ addon metadata/data-pack warnings | 2 | 0 |
| Almost Unified disabled-recipe output warnings | 25 | 0 |
| Steel recipes removed / redirected | 11 / 25 | 11 / 25 |
| Dynmap enum transformer applied | Yes | Yes |
| Dynmap invalid model patches / obsolete block names | 0 / 0 | 0 / 0 |
| Incendium recipe fallback | 1 | 1 |
| Paladin's Furniture context warnings | 2,772 | 2,772 |

Both new tag ZIPs load automatically. This confirms successful deployment of
PR #2's fixes. Forge also warns that the saved HVCZ addon version changed from
1.0.0 to 1.0.1. That version notice is expected for the metadata-only upgrade;
the transformer/dependencies were unchanged and the success marker is present.
The supplied interval does not prove long-running stability or crafting/casting
behavior in game.

### Additional Dynmap texture repairs

The render thread reports missing Lootr Steve and Chipped `0.png` / `1.png`
textures. These appeared in an older rendering log too; they are separate from
the repaired Saro road issue. Inspection of the exact Chipped 3.0.7 JAR identifies
two literal numeric face aliases and their intended declared textures. The
follow-up corrects 24 Chipped lantern-state mappings and uses Dynmap's bundled
classic Steve skin for Lootr's trophy. Geometry, UVs and the working road patch
remain unchanged. Installation and validation:
[TEXTURE_FIXES.md](../dynmap/TEXTURE_FIXES.md).

### Remaining issues

CTM and Camera Overhaul are still installed on the dedicated server and produce
the same client-class errors. The four truncated PWIC vehicle definitions,
missing vehicle OBJ files, official vehicle model issues, Saro's four obsolete
traffic-light entries and Incendium's empty smithing template also persist.
The actions/limitations listed in the previous audit below still apply.
Display Delight missing-food compatibility warnings and TFMG ignored duration/
heat fields are unchanged. No additional steel or KubeJS recipe changes are
indicated by these logs, and the superheated exception is retained.

## Previous logs: `latest(6).log` and `debug(4).log`
## Chest-opening crash: 2026-10-17

The new shipwreck crash is a `StackOverflowError` in Thirst's recursive global
loot modifier. The previous serializer registration workaround enabled that
runtime bug. It is retired and replaced with 15 early JSON overrides using
Farmer's Delight's non-recursive handler, preserving the original definitions
apart from their type. See [THIRST_LOOT_CRASH.md](THIRST_LOOT_CRASH.md) for the
required two-script replacement, restart, FD config dependency and stronger
runtime-binary regression. The older startup-only confirmations below did not
establish chest-opening safety.

## Current logs: `latest(6).log` and `debug(4).log`

Both files cover the same startup, 17:59:33–18:00:25. The server reaches
`Done` at 18:00:01.287, with Dynmap's delayed initialization completing at
18:00:23.139. These logs confirm successful loading of the previous repairs,
not long-running stability or every recipe's in-game behavior.

| Check | Current run |
| --- | ---: |
| KubeJS startup/server script errors and warnings | 0 |
| `Error parsing recipe` messages | 0 |
| Chest loot parsing errors | 0 |
| Prepared chest loot overrides | 11 |
| Steel recipes removed / redirected | 11 / 25 |
| Dynmap enum patch applied | Yes |
| Dynmap invalid patches / obsolete block names | 0 / 0 |
| Incendium smithing-template fallback | 1 |
| Invalid Radar/TFMG tag resources | 3 |
| Almost Unified disabled-recipe output warnings | 25 |
| Paladin's Furniture context warnings | 2,772 |

### Follow-up changes

- **Dynmap addon 1.0.1:** adds the missing `pack.mcmeta`, fixing the
  `Missing metadata in pack mod:hvcz_dynmap_enum_fix` / `Missing data pack`
  diagnostics introduced by addon 1.0.0. The enum transformer is byte-for-byte
  unchanged. Replace only the old HVCZ addon; keep Dynmap itself. See
  [ENUM_FIX.md](../dynmap/ENUM_FIX.md).
- **Invalid tags:** two narrowly filtered server datapacks replace the three
  `null` files before tag deserialization. This addresses the limitation of
  ordinary KubeJS tag overrides documented below. Installation and test
  results: [TAG_FIXES.md](../datapacks/TAG_FIXES.md). No fabricated entities
  or items are registered.
- **Almost Unified:** `config/almostunified/unify.json` now excludes only the
  25 exact recipe IDs already disabled by the guarded repairs in
  `hvcz_log_fixes.js`. Version 0.11.0 tries to inspect those condition-false
  crafting JSON files before Forge skips them, hence the missing-output
  warnings. `includeRecipe` filters IDs before `RecipeLink` output detection;
  this was checked against the installed-version source tag
  [v1.20.1-0.11.0](https://github.com/AlmostReliable/almostunified/tree/v1.20.1-0.11.0).
  This is avoidance of an unnecessary unification pass, not restoration of
  missing recipes. No wildcard, steel material priority or superheated mixing
  recipe is changed. Review the exclusions if adding the optional mods/items
  that make these specific compatibility recipes valid.

Copy the revised Almost Unified config to the server and clients sharing the
pack config, replace the HVCZ addon in the server's `mods/`, install both tag
ZIPs as documented, and restart. A KubeJS-only reload cannot apply the addon
update. The new tag-filter test passes against the actual Minecraft 1.20.1
resource manager and tag codecs; JAR comparison confirms only metadata/version
changes. A full modded startup with this follow-up is still awaiting deployment.

### Remaining errors and actions

| Diagnostic | Action / limitation |
| --- | --- |
| CTM client `ModelBakerImpl` and Camera Overhaul `Camera`, `GameRenderer`, `LocalPlayer` loaded on `DEDICATED_SERVER` | Remove `CTM-1.20.1-1.1.10.jar` and `CameraOverhaul-v2.0.6-forge+mc[1.20.0-1.20.5].jar` from the server's `mods/`; retain them on clients. Feature config toggles do not prevent these early client mixins from loading. |
| PWIC `m1126`, `m1134`, `m1151`, `btr70` end unexpectedly while parsing JSON | Replace the affected NATO/OVD vehicle content packs with complete, compatible copies. Empty placeholder definitions would lose the vehicles. |
| Missing `nato.obj`, `ussr.obj`, `he_koksan.obj`, `pwic_parts.obj`; official pack `engineamci4` parses `roller2` as a number; a quad mesh has no faces | Content-pack assets/legacy model compatibility need repair or a compatible pack release; KubeJS cannot reconstruct the missing models. |
| Four missing Saro `forge:traffic_lights` entries | Still reported before late tag cleanup. A source tag fix is needed; filtering the entire shared traffic-light tag could lose other mods' valid entries. No guessed replacement IDs added. |
| Incendium `upgrade_elytra` empty template | Vanilla fallback remains. Check smithing in game before changing its ingredients or progression. |
| Paladin's Furniture output queried without context; Display Delight absent-food compatibility; TFMG ignored processing fields | Integration/mod-version issues remain. Recipes/items are not deleted to hide warnings, and heat/time fields are not stripped without verifying their intended behavior. |
| Distant Horizons Twilight Forest generator warning | Existing `PRE_EXISTING_ONLY` config remains the mitigation; this warning alone does not show generation failed. |
| Lightman's Currency empty ejection data and Carry On entity-data registration warning | Not evidence of lost traders or a server crash; no world-data deletion or placeholder state changes applied. |

There is no crash in the supplied excerpt. The MTS version banner is itself
logged at ERROR level, so total ERROR lines do not equal distinct failures.
The brief player disconnect during delayed startup also does not establish a
network fault. No further steel recipe changes are indicated by these logs;
the superheated exception remains intact.

## Previous logs: `latest(5).log` and `debug(3).log`

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
PR branch. The supplied screenshots still show Saro road texture/orientation
problems; those files were not changed by the face-validation repair. New F3
samples reveal a separate Dynmap enum-serialization bug: numeric asphalt
heights (`1` through `15`) resolve as air because Dynmap registers their Java
names (`ONE` through `FIFTEEN`). The actual beta 6 binary and Saro 4.4.1 / 5.15
enums reproduce it. This PR adds the server-only addon
`dynmap/hvcz-dynmap-enum-fix-1.0.1.jar`; see `dynmap/ENUM_FIX.md` for installation
and test limitations. All tested asphalt states resolve correctly after the
patch. The owner subsequently deployed the addon and confirmed correct heights,
line orientation and road appearance on 2026-10-11.
See `dynmap/SARO_ROADS.md` for the samples and changelog comparison.

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
The 2026-10-17 startup file intentionally retires the unsafe serializer hook;
replace the old file and fully restart the server. Keep client/pack copies
consistent if using them for singleplayer. `/reload` alone cannot remove an
already registered codec. Keep FD's `generateFDChestLoot = true` (already set).

On startup, expect zero KubeJS script errors and
`[HVCZ fixes] Prepared 15 non-recursive Thirst loot modifiers`. The old
`Registered missing thirst:add_loot_table serializer` message must disappear.
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
| Fifteen Thirst global loot modifiers cannot decode `thirst:add_loot_table` | Replace the 15 modifier JSON types with FD's compatible raw-table handler. The earlier registry workaround is retired after the chest-opening recursion crash; preserve the global list and other mods' modifiers. |
| Four obsolete Saro's traffic-light tag entries | A guarded late tag cleanup is included, but `latest(1).log` shows LMFT has already removed/reported the missing entries before this callback. This does **not** eliminate the tag-loading message; correct the source tag in Saro's mod to remove it. |
| TFMG's null sulfuric-acid bucket tag | Add `tfmg:sulfuric_acid_bucket` to the tag if that item exists. The guarded addition alone cannot prevent the lower-pack parse message; the new filtered datapack does. |

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
  The current follow-up now supplies filtered replacement datapacks; see
  [TAG_FIXES.md](../datapacks/TAG_FIXES.md). An ordinary higher-priority
  tag alone still cannot eliminate the parse messages.
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

- JavaScript syntax checks and twelve passing Node tests in
  `tests/kubejs-log-fixes.test.cjs`, covering class-filter rejection,
  mod-present/absent guards, loot probabilities, registration and reload behavior.
- `tests/KubeJSRhinoSmoke.java` runs both scripts in real Rhino 2001 with
  mocked Minecraft/Forge bindings, real ZIP streams/UTF-8 conversion, all 15
  actual Thirst modifier definitions, the eleven loot overrides and repeated
  reload. All 52 resource streams close. Forge pack lookup models ModernFix's
  separate-component lookup. It verifies that the retired startup script no
  longer registers a codec.
- `tests/ThirstLootRecursionRegression.java` executes the actual mod codecs and
  bytecode with isolated boundary stubs, reproduces the original recursion and
  verifies all five chest types with the repaired definitions. See the crash
  document for its scope and reproduction commands.
- APIs checked against KubeJS `2001`, Thirst `1.20.1`, and Forge sources.

Run the Node checks with `node --test tests/kubejs-log-fixes.test.cjs`. To run the
Rhino check with Rhino 2001 and its dependencies on your classpath:

```sh
javac -cp "$RHINO_TEST_CLASSPATH" -d /tmp/hvcz-rhino-test tests/KubeJSRhinoSmoke.java
java -cp "/tmp/hvcz-rhino-test:$RHINO_TEST_CLASSPATH" KubeJSRhinoSmoke \
  kubejs/startup_scripts/hvcz_thirst_loot_fix.js \
  kubejs/server_scripts/hvcz_log_fixes.js "$THIRST_JAR"
```

This repository does not include the mod jars or a runnable dedicated server.
An actual Forge startup/client join and in-game crafting/loot test are still
required. Review unexpected modifier-count warnings after mod updates; the
startup script no longer registers any serializer.

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
