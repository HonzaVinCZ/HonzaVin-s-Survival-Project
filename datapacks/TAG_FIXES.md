# Invalid tag repairs for Minecraft 1.20.1

The current logs report three tag resources containing JSON `null`. These
server datapacks replace them with valid tags and filter the lower copies
before Minecraft parses them. A plain higher-priority tag override cannot do
this: Minecraft normally reads every file in a tag's resource stack.

| Datapack | Lower resources filtered | Replacement |
| --- | --- | --- |
| `hvcz-radar-tag-fix.zip` | `create_radar:tags/entity_types/radar_animal.json`, `create_radar:tags/entity_types/radar_hostile.json` | Empty, merging tags; no invented mob classifications |
| `hvcz-tfmg-tag-fix.zip` | `forge:tags/items/buckets/sulfuric_acid.json` | Optional `tfmg:sulfuric_acid_bucket` entry |

Targeted installed versions: Create Radar `0.4.6+mc1.20.1` and TFMG `1.0.2f`.
Radar's normal `Animal`/`Enemy` classification remains available, as with the
original invalid tags. The sulfuric-acid bucket is also added by the existing
guarded KubeJS item-tag event; duplicate tag additions are harmless.

## Install

1. Stop the server. Copy **both ZIPs** to `world/datapacks/` (or the
   `datapacks/` directory inside the actual `level-name` world folder).
   Keep them zipped. The adjacent source directories are for rebuilding.
2. Start the server and check `/datapack list enabled`. If either is disabled,
   enable it after the mod packs:

   ```text
   /datapack enable "file/hvcz-radar-tag-fix.zip" last
   /datapack enable "file/hvcz-tfmg-tag-fix.zip" last
   ```

3. Check the new startup/reload log: the three `Not a JSON object: null` tag
   failures should disappear. The Saro `forge:traffic_lights` error is a
   separate issue and is not changed by these packs.

No client installation is required. To undo, disable/remove the two packs and
restart. Review/remove them when updating the targeted mods: a filter hides
**all lower files at the exact target path**, including any future corrected
mod file or lower-priority custom contribution. Higher-priority custom packs
can still add entries normally. No other paths or namespaces are filtered.

The packs are separate to keep each namespace/path filter independent in
Minecraft 1.20.1. They contain no recipes, world generation or functions.

## Build and validation

```sh
python tools/build_tag_fixes.py
python tools/check_tag_filters.py /path/to/official-1.20.1-server.jar
```

The builder uses checked-in sources only. The regression requires Java 17 and
the official Mojang server bundle (SHA-1
`84194a2f286ef7c14ed7ce0090dba59902951553`). It executes Minecraft's actual
`MultiPackResourceManager`, `PathPackResources` and `TagFile` codecs with the
bundled libraries, without starting a server. The test checks both individual
resource stacks and `listResourceStacks` used by tag loading: lower invalid
files disappear, replacements parse, unrelated namespace/path combinations
survive, and higher-priority entries continue to merge. A temporary copy drops
certificate files solely to allow the test's default-package class alongside
Mojang's obfuscated classes; Minecraft class bytes are unchanged.

This regression passed. A full modded-server startup with these new packs has
not been performed in the workspace; deployment needs the next server log.
Pack filtering is a [Mojang-supported feature](https://www.minecraft.net/en-us/article/minecraft-snapshot-22w11a).

ZIP SHA-256:

- Radar: `2bc0a491c1410a810f2e3f0ae9e3b81f71746ee4e480d316e5ec62d11bea7c8f`
- TFMG: `7cfc77095dccea8edba585bd8610999a02794e8dc16b18521c96e8775f7a23d0`
