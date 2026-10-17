# Thirst chest-loot recursion crash (2026-10-17)

The supplied `crash-2026-10-17_19.27.24-server.txt` reports a
`StackOverflowError` when opening a Lootr chest in a generated shipwreck.
`dev.ghen.thirst.foundation.common.loot.AddLootTableModifier.doApply` appears
202 times in the captured stack. The water-bottle stack-size mixin at the top
is where the stack runs out; the repeating Thirst modifier identifies the loop.

## Cause and repair

Thirst 1.4.0's modifier calls `LootTable.getRandomItems()` while already inside
Forge's global loot modifier chain. Forge 47.4.20 retains the original queried
table ID in the reused context, so the original shipwreck condition still
matches in the nested roll. The modifier calls itself repeatedly. The same
path affects its other four supported chest types too.

Our earlier startup workaround registered Thirst's missing serializer and
therefore enabled this faulty implementation. Startup and JSON parsing checks
passed, but did not test opening a chest. That workaround is now retired.

`hvcz_log_fixes.js` reads Thirst's own 15 modifier JSON resources and changes
only their `type` to `farmersdelight:add_loot_table`. Farmer's Delight 1.2.11,
already installed in this pack, uses raw extra-table generation with a stack
splitter, avoiding a nested global-modifier pass. Conditions, target tables,
resource IDs and other fields remain intact. Existing missing-item/weight
repairs remain active. The global modifier list is not replaced, and unrelated
mods' loot modifiers remain enabled.

The five source chest types are `shipwreck_supply`, `simple_dungeon`,
`bastion_other`, `abandoned_mineshaft` and `nether_bridge`; each has base,
`_bc` and `_fr` additions. No chest block, structure or Lootr player-loot data
is deleted or reset. The repair applies when loot is generated; it does not
regenerate already saved chest contents.

## Install and verify

1. Stop the server.
2. Extract `hvcz-thirst-loot-crash-fix.zip` into the **server root**, alongside
   `mods/` and `config/`. It replaces exactly:
   - `kubejs/server_scripts/hvcz_log_fixes.js`
   - `kubejs/startup_scripts/hvcz_thirst_loot_fix.js`
3. Replace **both** files. The startup file is intentionally comments only so
   it overwrites the old registration workaround. Keep pack/client copies
   consistent if also using these scripts in singleplayer.
4. Keep `generateFDChestLoot = true` in `config/farmersdelight-common.toml`.
   The repository already has this setting. Reusing FD's handler means its
   chest-loot toggle also controls these Thirst additions.
5. Fully restart; a reload alone does not retire an already registered codec.
   Expect:

   ```text
   [HVCZ fixes] Prepared 11 chest loot table overrides
   [HVCZ fixes] Prepared 15 non-recursive Thirst loot modifiers
   ```

   The old `Registered missing thirst:add_loot_table serializer` message should
   no longer appear. Check for zero KubeJS script errors or unknown modifier
   serializers. The safe handler requires Farmer's Delight to remain installed.
6. As an operator in game, test the source table first:

   ```text
   /loot give @s loot minecraft:chests/shipwreck_supply
   ```

   Then retry opening the shipwreck's Lootr chest and check the new server log.

Install ZIP SHA-256: `327e5067ec39f9ef0cdeed2d4f48b0b0d91c7ff05edc92ef224bbe568d3c6481`.

## Validation

- All 12 Node tests pass, including preservation of all 15 modifier definitions,
  reload/idempotence and retirement of the unsafe registry hook.
- Real Rhino 2001 executes the shipped scripts, reads the actual Thirst JAR's
  modifier resources and emits the 15 repaired definitions. The existing loot
  repairs and ModernFix-style path lookup still work; all 52 resource streams
  across two reloads close.
- `ThirstLootRecursionRegression.java` loads the **unmodified mod classes and
  codecs from the hash-verified runtime JARs**. With original definitions,
  Thirst's actual bytecode reenters the modifier chain. With the Rhino-generated
  definitions, FD's actual codec and bytecode roll the three additions exactly
  once for each of the five source chest types. Vanilla loot and a separate
  marker modifier survive once; stacks split correctly; unrelated chest types
  receive no Thirst additions.

Minecraft/Forge boundary classes in that regression are explicitly stubs,
including Forge's assign-once queried ID and raw/non-raw generation behavior.
A depth limit detects the reproduced recursion safely rather than exhausting
the test JVM's stack. This is stronger than the previous startup-only checks,
but is **not a full modded-server/Lootr opening test**. Live confirmation still
requires the restart and chest test above.

Artifact SHA-1:

- [Thirst 1.4.0](https://modrinth.com/mod/thirst-was-taken/version/v0d2UK5F): `de1c5adad2a77c7f6e168f2df6e7b82d9c3db719`
- [Farmer's Delight 1.2.11](https://modrinth.com/mod/farmers-delight/version/bCtijHxU): `76311d0d9f9064487fed060a793263744effacde`

Reproduce from the repository root with Java 17, Rhino 2001/Gson on
`RHINO_TEST_CLASSPATH`, and the two verified mod JARs plus Minecraft 1.20.1's
bundled library JARs on `LOOT_TEST_CLASSPATH` (Guava, DFU, Gson and fastutil):

```sh
mkdir -p /tmp/hvcz-loot-test
javac -cp "$RHINO_TEST_CLASSPATH" -d /tmp/hvcz-loot-test tests/KubeJSRhinoSmoke.java
java -cp "/tmp/hvcz-loot-test:$RHINO_TEST_CLASSPATH" KubeJSRhinoSmoke \
  kubejs/startup_scripts/hvcz_thirst_loot_fix.js \
  kubejs/server_scripts/hvcz_log_fixes.js "$THIRST_JAR" /tmp/hvcz-loot-modifiers.json
javac -cp "$LOOT_TEST_CLASSPATH" -d /tmp/hvcz-loot-test \
  $(find tests/thirst-loot-stubs -name '*.java') tests/ThirstLootRecursionRegression.java
java -cp "/tmp/hvcz-loot-test:$LOOT_TEST_CLASSPATH" ThirstLootRecursionRegression \
  "$THIRST_JAR" "$FD_JAR" /tmp/hvcz-loot-modifiers.json
```

Keep the test classes first on the test classpath so only their documented
Minecraft/Forge boundary classes are substituted. No mod binaries or test stubs
are installed on the server. Recheck this repair before changing Thirst or FD
versions; unexpected/missing resources produce a preparation-count warning.
