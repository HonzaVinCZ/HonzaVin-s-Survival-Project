# Server log repairs (2026-10-11)

Target: Minecraft 1.20.1, Forge 47.4.20, KubeJS 6. The existing
`server_scripts/hvcz_server.js` gameplay changes are preserved.

## Follow-up log: `latest(1).log`

The server reaches `Done`, but the first version of these repairs fails in two
callbacks. KubeJS's class filter rejects the direct `java.nio.file.Files` import,
aborting the data overrides. Rhino also rejects the `const Modifier` binding
inside the startup callback with `redeclaration of var Modifier`. Consequently,
14 recipe parsing errors, 14 loot-table parsing errors and 15 unknown Thirst
serializer messages remain in this run; it does not demonstrate repaired loot.

The revised scripts use the built-in `JsonIO.readString(Path)` binding and `var`
callback bindings. The original startup failure was reproduced in Rhino 2001;
the revised script passes that same interpreter check with mocked Forge APIs.
Install both revised scripts and perform another full restart to verify the
changes in the actual pack.

## Install and verify

Copy `server_scripts/hvcz_log_fixes.js` and
`startup_scripts/hvcz_thirst_loot_fix.js` into the corresponding KubeJS folders.
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
| Six Ironworks/Molten Metals recipes, two Ironworks/Create DD recipes, one Create Casing creative recipe reference missing inputs | Disable only the listed recipe when its input item is absent; keep it if the input exists. |
| Four TConstruct-namespace steel conversions reference missing items or empty shaped keys | Rebuild the same IDs using TFMG steel, preserving the 9:1 ratios. Almost Unified may deduplicate equivalent recipes. |
| Alex's Delight barbecue recipe references `amfd:singular_cooked_moose_rib` | Use `alexsdelight:singular_cooked_moose_rib` if registered; otherwise disable only this already-broken alternative and log why. |
| Ten Thirst compatibility loot tables reference absent Brewin' and Chewin'/Farmer's Respite items | Read the installed mod's original tables and replace nonexistent item entries with weighted empty entries. Keep valid loot, rolls, conditions and relative probabilities. |
| Lightman's Currency IDAS bank loot references absent `quark:abacus` | Apply the same targeted entry repair. The current source table contains only an abacus; its repaired version yields no item when Quark's abacus is unavailable. Vault/other bank loot is untouched. |
| Three Radar loot tables reference unregistered optional blocks | Empty these tables only when their associated block item is absent. |
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

- **Dynmap: 41,112 FATAL-level messages**, all invalid model patches across 22
  generated `dynmap/renderdata/*-models.txt` files. The server reaches `Done`
  afterward; these are map-model failures, not a server startup crash. Check the
  compatibility of Dynmap and DynmapBlockScan and regenerate the affected model
  files after fixing/updating that integration. The model files are not in this
  repository. KubeJS recipes/tags cannot repair them.
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
- **Distant Horizons:** Twilight Forest chunk-generator support warning.
- **Dynmap:** additional missing textures for Lootr/Chipped and a stale Create
  block name. **Discord/JDA:** one HTTP 429, with a 536-second retry delay.
  The follow-up log again has a 429, with a 494-second delay.
- Forge library `mods.toml` notices, missing refmaps, and other mod-level
  warnings are not evidence of an error in the existing KubeJS script.

## Validation and limits

The original supplied log covers startup and about 1 hour 45 minutes afterward;
the follow-up log ends about 25 seconds after `Done` and cannot establish
long-running stability. Both runs finish starting.

Validation of the revised scripts:

- JavaScript syntax checks and nine passing Node tests in
  `tests/kubejs-log-fixes.test.cjs`, covering class-filter rejection,
  mod-present/absent guards, loot probabilities, registration and reload behavior.
- `tests/KubeJSRhinoSmoke.java` runs both scripts in Rhino's actual `2001`
  interpreter, with mocked Minecraft/Forge bindings and real Java callback /
  supplier conversion. It reproduces the original `const Modifier` failure and
  passes with the revised startup script, then exercises data generation, tag
  callbacks and a repeated reload. This is not a full Forge integration test.
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
- [KubeJS Forge event bindings](https://github.com/kube-mods/kubejs/blob/2001/forge/src/main/java/dev/latvian/mods/kubejs/forge/BuiltinKubeJSForgePlugin.java)
- [Thirst loot codec](https://github.com/ghen-git/Thirst-Mod/blob/1.20.1/src/main/java/dev/ghen/thirst/foundation/common/loot/AddLootTableModifier.java)
- [Thirst initialization](https://github.com/ghen-git/Thirst-Mod/blob/1.20.1/src/main/java/dev/ghen/thirst/Thirst.java)
- [Radar entity classification](https://github.com/Arsenalists-of-Create/Create-Radar/blob/master/src/main/java/com/happysg/radar/block/radar/track/TrackCategory.java)
