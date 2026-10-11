import com.google.gson.JsonParser;
import com.mojang.serialization.JsonOps;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;

/** Runs against Mojang's unmodified 1.20.1 server and bundled libraries.
 * Official names: ajn=PathPackResources, akq=MultiPackResourceManager,
 * ajm=PackType, acq=ResourceLocation, akv=Resource, ank=TagFile.
 * The obfuscated names are pinned by the official 1.20.1 server mappings.
 */
public class MinecraftTagFilterSmoke {
    private static final String[] TARGETS = {
        "create_radar:tags/entity_types/radar_animal.json",
        "create_radar:tags/entity_types/radar_hostile.json",
        "forge:tags/items/buckets/sulfuric_acid.json"
    };

    private static void write(Path root, String id, String json) throws Exception {
        Path file = root.resolve("data/" + id.replace(':', '/'));
        Files.createDirectories(file.getParent());
        Files.writeString(file, json);
    }

    private static void check(boolean condition, String message) {
        if (!condition) throw new AssertionError(message);
    }

    public static void main(String[] args) throws Exception {
        Path root = Path.of(args[0]);
        Path lower = Files.createTempDirectory(Path.of("").toAbsolutePath(), "hvcz-lower-pack-");
        Path higher = Files.createTempDirectory(Path.of("").toAbsolutePath(), "hvcz-higher-pack-");
        for (String id : TARGETS) write(lower, id, "null");
        String[] controls = {
            "othermod:tags/entity_types/radar_animal.json",
            "forge:tags/entity_types/radar_animal.json",
            "create_radar:tags/items/buckets/sulfuric_acid.json",
            "forge:tags/items/buckets/water.json"
        };
        for (String id : controls) write(lower, id, "{\"values\":[]}");
        write(higher, TARGETS[0], "{\"values\":[\"minecraft:cow\"]}");

        // No filter: layered tag lookup still exposes the invalid lower file.
        try (akq resources = new akq(ajm.b, List.of(new ajn("lower", lower, false),
                new ajn("higher", higher, false)))) {
            check(resources.a(new acq(TARGETS[0])).size() == 2, "Layered baseline changed");
        }
        try (akq resources = new akq(ajm.b, List.of(new ajn("lower", lower, false),
                new ajn("radar-fix", root.resolve("hvcz-radar-tag-fix"), false),
                new ajn("tfmg-fix", root.resolve("hvcz-tfmg-tag-fix"), false),
                new ajn("higher", higher, false)))) {
            for (String id : TARGETS) {
                List<akv> stack = resources.a(new acq(id));
                check(stack.size() == (id.equals(TARGETS[0]) ? 2 : 1), "Wrong stack: " + id);
                for (akv resource : stack) {
                    check(!resource.b().equals("lower"), "Invalid lower file remains visible");
                    try (var reader = resource.e()) {
                        var parsed = ank.a.parse(JsonOps.INSTANCE, JsonParser.parseReader(reader));
                        check(parsed.error().isEmpty(), "Invalid replacement tag: " + parsed);
                        check(!parsed.result().orElseThrow().b(), "Tag must preserve merging");
                    }
                }
            }
            for (String id : controls) {
                var stack = resources.a(new acq(id));
                check(stack.size() == 1 && stack.get(0).b().equals("lower"), "Overbroad filter: " + id);
            }
            for (String directory : List.of("tags/entity_types", "tags/items")) {
                Map<acq, List<akv>> stacks = resources.c(directory, id -> true);
                for (String id : TARGETS) {
                    if (!id.contains(directory + "/")) continue;
                    check(stacks.containsKey(new acq(id)), "Missing listed replacement: " + id);
                    check(stacks.get(new acq(id)).stream().noneMatch(r -> r.b().equals("lower")),
                            "TagLoader's listResourceStacks still exposes invalid file");
                }
            }
        }
        System.out.println("PASS: actual Minecraft 1.20.1 filtering, TagFile codecs, tag stacks and unrelated/higher-pack preservation");
    }
}
