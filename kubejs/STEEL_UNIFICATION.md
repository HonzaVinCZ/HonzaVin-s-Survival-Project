# TFMG steel unification (Minecraft 1.20.1)

New behavior lives in `server_scripts/hvcz_steel_unification.js` and
`client_scripts/hvcz_steel_unification.js`. The existing `hvcz_server.js`
remains unchanged. This was checked against the installed CBC 5.11.4, TFMG
1.0.2f, Create Ironworks 3.5.0 and KubeJS 2001 APIs/resources.

## Materials and recipes

| Retired raw material | Preferred material |
| --- | --- |
| Other mods' steel ingots | `tfmg:steel_ingot` |
| Other mods' steel nuggets / CBC steel scrap | `tfmg:steel_nugget` |
| Other mods' steel storage blocks | `tfmg:steel_block` |
| Other mods' steel sheets / plates | `tfmg:heavy_plate` |
| CBC molten steel / its flowing variant | TFMG molten steel / its flowing variant |
| CBC molten-steel bucket | TFMG molten-steel bucket |

The script discovers registered raw materials by their standard names and
captures members of the shared Forge/C steel material tags before normalizing
those tags. Recipes producing duplicate raw materials are removed, except
**superheated Create mixing recipes**: those remain available with TFMG steel
outputs. This preserves all six installed Ironworks routes (four ingot routes
and two nugget routes), including their ingredients, heat, quantities and
probabilistic steel/iron/experience byproducts.
Remaining consumers use TFMG equivalents, including nested sequenced-assembly
steps. Other steel-making/plate-making routes are removed. The existing CBC alloying,
CBC nugget-compacting and TFMG dust-blasting removals remain effective.
TFMG's normal production and heavy-plate sequence remain available.

Steel cannon parts and machines remain available; they use the unified steel.
The owner's newer AP shell/AP shot recipes remain unchanged and automatically
use TFMG steel through `forge:ingots/steel`.
Nethersteel and Shadow Steel are distinct materials and remain available.
This is raw-material unification, not removal of every item whose name contains
"steel". No registered mod items/fluids are deleted from the save registry.

## Fluid compatibility and amounts

Add both `tfmg:molten_steel` and `tfmg:flowing_molten_steel` to:

- `forge:molten_steel`
- `c:molten_steel`
- `createbigcannons:molten_metal`

The first two tags contain only the preferred steel fluids. Retired molten
steel loses its fluid tags; other metals in CBC's generic molten-metal tag
are preserved. CBC's 10 steel cannon-casting recipes already use
`forge:molten_steel` under its separate `block_recipes` loader. They continue
accepting the TFMG fluid; no invented vanilla casting-recipe schema is used.
Their shapes/results/volumes remain unchanged. The installed tag-based casting
time is 3,600 ticks and still applies to TFMG steel.

CBC's three steel melting recipes now produce TFMG molten steel, and its three
steel compacting recipes now produce TFMG raw materials. Both directions use
TFMG's material volumes:

| Material | Molten steel |
| --- | ---: |
| Nugget / scrap | 16 mB |
| Ingot | 144 mB |
| Storage block | 1,296 mB |

CBC originally used 10 / 90 / 810 mB. Changing only the fluid/output IDs would
create a gain or loss when paired with TFMG's 144 mB casting recipe. The revised
amounts balance both directions; existing heat requirements and processing
times remain intact. This adjustment concerns raw-material melting/compacting,
not the cannon cast shapes' fixed capacities.

Unknown KubeJS recipe schemas do not support bulk input/output replacement.
The handler therefore serializes earlier component changes, reads the actual
recipe JSON, preserves metadata and replaces only changed recipes with the
same IDs. It leaves the separate CBC cannon-casting data untouched.

## Existing stocks and installation

Copy the server script to the server's `kubejs/server_scripts`. Copy the client
script to each client's `kubejs/client_scripts` to hide duplicate materials,
buckets and fluids from JEI. Keep the existing scripts. Restart the server and
clients so recipes/tags and JEI reload together. No new mod JAR is needed.

Expect a server message starting with:

```text
[HVCZ steel] Removed ... duplicate-material recipes; redirected ... recipes to TFMG
```

Registered duplicates can still exist in old inventories/tanks or via commands.
Their new production is disabled and they are hidden in JEI; this does not
rewrite existing saves or physically unregister another mod's content.
One-way shapeless recipes convert existing raw materials to their TFMG
counterparts. Filled-bucket recovery consumes the original bucket, suppressing
its empty-bucket crafting remainder so it cannot duplicate buckets.

For existing CBC molten steel in tanks, an unheated Create mixer/basin converts
**1,000 mB CBC steel to 1,000 mB TFMG steel**. This recovery recipe is the one
intentional remaining direct use of the old fluid. Existing cast controllers
holding the old fluid may need emptying/recovery before accepting TFMG steel.

Check a small steel cannon cast, CBC melting/compacting and a TFMG casting
basin in game. These are recipe/data changes with isolated tests, not a full
Forge server simulation. No live crafting or casting test has been run here.

## Reproduce the checks

`tests/KubeJSSteelSmoke.java` runs the actual Rhino 2001 interpreter with actual
Gson objects and Java lists, loading recipes/tags/models from hash-verified
installed mod JARs. Its event/registry bindings are mocked. Checks cover:

- CBC/TFMG melt-solidify balances, heat/time preservation and nested inputs;
- the actual cannon-casting fluid tag and casting-time data;
- the six superheated mixing exceptions, unchanged inputs/counts/chances/heat,
  duplicate production removal and preservation of existing restrictions;
- irregular tagged material IDs, reload consistency, recovery and bucket consumption;
- JEI hiding, distinct Nethersteel/cannon components and absent-TFMG guards.

The earlier eleven log-fix Node regressions still pass. With Rhino 2001 and
Gson dependencies on `RHINO_TEST_CLASSPATH`, from the repository root:

```sh
javac -cp "$RHINO_TEST_CLASSPATH" -d /tmp/hvcz-steel-check tests/KubeJSSteelSmoke.java
java -cp "/tmp/hvcz-steel-check:$RHINO_TEST_CLASSPATH" KubeJSSteelSmoke \
  <cbc-5.11.4.jar> <tfmg-1.0.2f.jar> <create_ironworks-3.5.0.jar>
node --test tests/kubejs-log-fixes.test.cjs
```

Artifact sources:
[CBC 5.11.4](https://api.modrinth.com/v2/version/ZRgu5o3x),
[TFMG 1.0.2f](https://api.modrinth.com/v2/version/ZNOx0jhg),
[Ironworks 3.5.0](https://api.modrinth.com/v2/version/zLpNbuh9).
KubeJS source:
[recipe JSON fallback](https://github.com/kube-mods/kubejs/blob/2001/common/src/main/java/dev/latvian/mods/kubejs/recipe/JsonRecipeJS.java),
[recipe operations](https://github.com/kube-mods/kubejs/blob/2001/common/src/main/java/dev/latvian/mods/kubejs/recipe/RecipeJS.java),
[tag events](https://github.com/kube-mods/kubejs/blob/2001/common/src/main/java/dev/latvian/mods/kubejs/server/tag/TagEventJS.java),
[JEI events](https://github.com/kube-mods/kubejs/blob/2001/forge/src/main/java/dev/latvian/mods/kubejs/integration/forge/jei/JEIEvents.java).
