import dev.latvian.mods.rhino.Context;
import dev.latvian.mods.rhino.NativeJavaClass;
import dev.latvian.mods.rhino.Scriptable;
import java.nio.file.Files;
import java.nio.file.Path;
import java.io.InputStream;
import java.io.FilterInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Optional;
import java.util.function.Consumer;
import java.util.function.Supplier;
import java.util.zip.ZipEntry;
import java.util.zip.ZipFile;
import java.util.zip.ZipOutputStream;

/** Smoke test using Rhino 2001's interpreter; Minecraft/Forge bindings are fakes.
 * Compile/run with Rhino 2001 and Gson on the classpath, from the repository root.
 */
public class KubeJSRhinoSmoke {
    public static class TrackedStream extends FilterInputStream {
        public TrackedStream(InputStream stream) { super(stream); }
        public void close() throws IOException { super.close(); ResourcePacks.closedStreams++; }
    }
    public static class ResourcePacks {
        static ZipFile jar;
        static int closedStreams;
        public static Optional<ModPack> getPackFor(String mod) { return Optional.of(new ModPack()); }
    }
    public interface StreamSupplier {
        InputStream get() throws IOException;
    }
    public static class ModPack {
        public StreamSupplier getRootResource(String... paths) {
            // ModernFix's hasResource indexes by individual path components.
            // This deliberately catches the old reader's combined third arg.
            for (String path : paths) if (path.contains("/")) return null;
            ZipEntry entry = ResourcePacks.jar.getEntry(String.join("/", paths));
            return entry == null ? null : () -> new TrackedStream(ResourcePacks.jar.getInputStream(entry));
        }
    }
    public static class ResourceLocation {
        private final String id;
        public ResourceLocation(String namespace, String path) { id = namespace + ":" + path; }
        public String toString() { return id; }
    }
    public static class Modifier {
        public static final Supplier<String> CODEC = () -> "thirst-codec";
    }
    public static class Key {
        public String location() { return "forge:global_loot_modifier_serializers"; }
    }
    public static class Registry {
        public boolean registered;
        public boolean containsKey(ResourceLocation id) { return registered; }
    }
    public static class Event {
        public final Registry registry = new Registry();
        public int registrations;
        public Key getRegistryKey() { return new Key(); }
        public Registry getForgeRegistry() { return registry; }
        public void register(Key key, ResourceLocation id, Supplier<Object> codec) {
            if (!"thirst:add_loot_table".equals(id.toString()) || !"thirst-codec".equals(codec.get())) {
                throw new AssertionError("Incorrect registration");
            }
            registry.registered = true;
            registrations++;
        }
    }
    public static class Events {
        public Consumer<Event> callback;
        public void onEvent(String name, Consumer<Event> consumer) { callback = consumer; }
    }
    public static class Loader {
        private final Context context;
        private final Scriptable scope;
        public Loader(Context context, Scriptable scope) { this.context = context; this.scope = scope; }
        public Object loadClass(String name) {
            Class<?> type = switch (name) {
                case "net.minecraft.resources.ResourceLocation" -> ResourceLocation.class;
                case "dev.ghen.thirst.foundation.common.loot.AddLootTableModifier" -> Modifier.class;
                case "net.minecraftforge.resource.ResourcePackLoader" -> ResourcePacks.class;
                case "java.lang.String" -> String.class;
                default -> throw new IllegalArgumentException("Unexpected class " + name);
            };
            return new NativeJavaClass(context, scope, type);
        }
    }
    private static void eval(Context context, Scriptable scope, String source, String name) {
        context.evaluateString(scope, source, name, 1, null);
    }
    public static void main(String[] args) throws Exception {
        if (args.length < 3) throw new IllegalArgumentException("Supply startup script, server script and Thirst 1.4.0 JAR; optional fourth arg exports repaired modifiers");
        Path jarPath = Files.createTempFile("hvcz-loot-fixture-", ".jar");
        String fixture = """
            {"type":"minecraft:chest","pools":[{"rolls":1,"entries":[
              {"type":"minecraft:item","name":"minecraft:gold_ingot","weight":2},
              {"type":"minecraft:item","name":"absent:drink","weight":7}
            ]}],"fixture_note":"UTF-8: příliš žluťoučký"}
            """;
        try (ZipOutputStream zip = new ZipOutputStream(Files.newOutputStream(jarPath))) {
            for (String chest : new String[]{"shipwreck_supply", "simple_dungeon", "bastion_other", "abandoned_mineshaft", "nether_bridge"}) {
                for (String compat : new String[]{"bc", "fr"}) {
                    zip.putNextEntry(new ZipEntry("data/thirst/loot_tables/chests/" + chest + "_" + compat + ".json"));
                    zip.write(fixture.getBytes(StandardCharsets.UTF_8));
                    zip.closeEntry();
                }
            }
            try (ZipFile thirst = new ZipFile(args[2])) {
                for (String chest : new String[]{"shipwreck_supply", "simple_dungeon", "bastion_other", "abandoned_mineshaft", "nether_bridge"}) {
                    for (String suffix : new String[]{"", "_bc", "_fr"}) {
                        String name = "data/thirst/loot_modifiers/add_loot_" + chest + suffix + ".json";
                        zip.putNextEntry(new ZipEntry(name));
                        try (InputStream input = thirst.getInputStream(thirst.getEntry(name))) {
                            zip.write(input.readAllBytes());
                        }
                        zip.closeEntry();
                    }
                }
            }
            zip.putNextEntry(new ZipEntry("data/lightmanscurrency/loot_tables/chest/village/idas_taiga_large_bank.json"));
            zip.write(fixture.getBytes(StandardCharsets.UTF_8));
            zip.closeEntry();
        }
        try (ZipFile jar = new ZipFile(jarPath.toFile())) {
            ResourcePacks.jar = jar;
            Context context = Context.enter();
            Scriptable scope = context.initStandardObjects();
            Events events = new Events();
            context.addToScope(scope, "ForgeModEvents", events);
            context.addToScope(scope, "Java", new Loader(context, scope));
            eval(context, scope, """
                var warnings = [], infos = [];
                var console = { warn: x => warnings.push(String(x)), info: x => infos.push(String(x)) };
                var Platform = { isForge: () => true, isLoaded: () => true };
                """, "startup-fixtures");
            Path startup = Path.of(args.length == 0 ? "kubejs/startup_scripts/hvcz_thirst_loot_fix.js" : args[0]);
            eval(context, scope, Files.readString(startup), "startup-script");
            Event event = new Event();
            if (events.callback != null) throw new AssertionError("Unsafe startup registration was restored");
            eval(context, scope, "if (warnings.length) throw Error(warnings.join('; '));", "startup-check");
            if (event.registrations != 0) throw new AssertionError("Retired script registered a codec");

            // Forge resource objects are fakes, but reading bytes, decoding UTF-8,
            // closing streams and Java overload conversion use real ZIP/JDK objects.
            eval(context, scope, """
                var dataCallback, tagCallback, generated = {}, tagActions = [];
                var ServerEvents = {
                  highPriorityData: fn => { dataCallback = fn }, tags: (kind, fn) => { tagCallback = fn }
                };
                var Item = { exists: id => id.indexOf('absent:') !== 0 &&
                  (id.indexOf('tfmg:') === 0 || id.indexOf('minecraft:') === 0 ||
                   id.indexOf('farmersdelight:') === 0 || id.indexOf('alexsdelight:') === 0) };
                Platform.isLoaded = id => ['thirst', 'farmersdelight', 'lightmanscurrency', 'create_radar', 'alexsdelight'].indexOf(id) >= 0;
                """, "server-fixtures");
            Path serverScript = Path.of(args.length < 2 ? "kubejs/server_scripts/hvcz_log_fixes.js" : args[1]);
            eval(context, scope, Files.readString(serverScript), "server-script");
            eval(context, scope, """
                var dataEvent = { addJson: (id, json) => { generated[id] = json } };
                dataCallback(dataEvent);
                tagCallback({remove: (tag,id) => tagActions.push(id), add: (tag,id) => tagActions.push(id)});
                var loot = generated['thirst:loot_tables/chests/shipwreck_supply_bc'];
                if (loot.pools[0].entries[1].type !== 'minecraft:empty' || loot.pools[0].entries[1].weight !== 7) throw Error('Loot repair failed');
                if (loot.fixture_note !== 'UTF-8: příliš žluťoučký') throw Error('UTF-8 decoding failed');
                if (generated['tconstruct:recipes/common/materials/steel_nugget_from_ingot'].result.count !== 9) throw Error('Steel repair failed');
                if (Object.keys(generated).length !== 58 || tagActions.length !== 5) throw Error('Missing repairs: '+Object.keys(generated).length);
                Object.keys(generated).filter(id => id.indexOf(':loot_modifiers/') >= 0).forEach(id => {
                  if (generated[id].type !== 'farmersdelight:add_loot_table') throw Error('Unsafe modifier: ' + id);
                });
                dataCallback(dataEvent);
                if (warnings.length) throw Error(warnings.join('; '));
                if (infos.filter(x => x === '[HVCZ fixes] Prepared 11 chest loot table overrides').length !== 2) throw Error('Loot overrides were silently skipped');
                """, "server-check");
            if (args.length > 3) {
                String output = context.toString(context.evaluateString(scope,
                    "var modifierOutput = {}; Object.keys(generated).filter(id => id.indexOf(':loot_modifiers/') >= 0).forEach(id => { modifierOutput[id] = generated[id] }); JSON.stringify(modifierOutput)",
                    "modifier-output", 1, null));
                Files.writeString(Path.of(args[3]), output);
            }
            if (ResourcePacks.closedStreams != 52) throw new AssertionError("Unclosed resource streams: " + ResourcePacks.closedStreams);
            System.out.println("PASS: Rhino 2001 Java callbacks, actual ZIP loot streams, UTF-8, closure, tags and reload");
        } finally {
            Files.deleteIfExists(jarPath);
        }
    }
}
