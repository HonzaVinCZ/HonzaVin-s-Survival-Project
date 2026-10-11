import dev.latvian.mods.rhino.Context;
import dev.latvian.mods.rhino.NativeJavaClass;
import dev.latvian.mods.rhino.Scriptable;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.function.Consumer;
import java.util.function.Supplier;

/** Smoke test using Rhino 2001's interpreter; Minecraft/Forge bindings are fakes.
 * Compile/run with Rhino 2001 and Gson on the classpath, from the repository root.
 */
public class KubeJSRhinoSmoke {
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
                default -> throw new IllegalArgumentException("Unexpected class " + name);
            };
            return new NativeJavaClass(context, scope, type);
        }
    }
    private static void eval(Context context, Scriptable scope, String source, String name) {
        context.evaluateString(scope, source, name, 1, null);
    }
    public static void main(String[] args) throws Exception {
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
        events.callback.accept(event);
        events.callback.accept(event);
        eval(context, scope, "if (warnings.length) throw Error(warnings.join('; '));", "startup-check");
        if (event.registrations != 1) throw new AssertionError("Expected one registration, got " + event.registrations);

        // Exercise every server-script branch with mocked installed-mod resources.
        eval(context, scope, """
            var dataCallback, tagCallback, generated = {}, tagActions = [];
            var ServerEvents = {
              highPriorityData: fn => { dataCallback = fn }, tags: (kind, fn) => { tagCallback = fn }
            };
            var Item = { exists: id => id.indexOf('absent:') !== 0 &&
              (id.indexOf('tfmg:') === 0 || id.indexOf('minecraft:') === 0 ||
               id.indexOf('farmersdelight:') === 0 || id.indexOf('alexsdelight:') === 0) };
            Platform.isLoaded = id => ['thirst', 'lightmanscurrency', 'create_radar', 'alexsdelight'].indexOf(id) >= 0;
            Java = { loadClass: name => {
              if (name !== 'dev.architectury.platform.Platform') throw Error('Forbidden class: ' + name);
              return { getMod: mod => ({ findResource: () => ({ isPresent: () => true, get: () => 'fixture' }) }) };
            } };
            var JsonIO = { readString: path => JSON.stringify({type:'minecraft:chest', pools:[{rolls:1,entries:[
              {type:'minecraft:item',name:'minecraft:gold_ingot',weight:2},
              {type:'minecraft:item',name:'absent:drink',weight:7}
            ]}]}) };
            """, "server-fixtures");
        eval(context, scope, Files.readString(Path.of("kubejs/server_scripts/hvcz_log_fixes.js")), "server-script");
        eval(context, scope, """
            var dataEvent = { addJson: (id, json) => { generated[id] = json } };
            dataCallback(dataEvent);
            tagCallback({remove: (tag,id) => tagActions.push(id), add: (tag,id) => tagActions.push(id)});
            var loot = generated['thirst:loot_tables/chests/shipwreck_supply_bc'];
            if (loot.pools[0].entries[1].type !== 'minecraft:empty' || loot.pools[0].entries[1].weight !== 7) throw Error('Loot repair failed');
            if (generated['tconstruct:recipes/common/materials/steel_nugget_from_ingot'].result.count !== 9) throw Error('Steel repair failed');
            if (Object.keys(generated).length !== 34 || tagActions.length !== 5) throw Error('Missing repairs: '+Object.keys(generated).length);
            dataCallback(dataEvent);
            if (warnings.length) throw Error(warnings.join('; '));
            """, "server-check");
        System.out.println("PASS: Rhino 2001 startup Java callbacks, registration guard, server data, tags and reload");
    }
}
