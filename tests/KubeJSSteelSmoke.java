import dev.latvian.mods.rhino.Context;
import dev.latvian.mods.rhino.Scriptable;
import com.google.gson.*;
import java.nio.file.*;
import java.util.*;
import java.util.zip.*;
import java.security.MessageDigest;

/** Real Rhino 2001/Gson/installed assets, mocked Minecraft events. */
public class KubeJSSteelSmoke {
    public static class Recipe {
        public final JsonObject json;
        public boolean removed;
        private final String id;
        public Recipe(String id, String json) { this.id=id; this.json=JsonParser.parseString(json).getAsJsonObject(); }
        public String getId() { return id; }
        public void remove() { removed=true; }
        public void serialize() {
            if(id.equals("test:earlier_handler"))json.addProperty("earlier_handler","preserved");
        }
    }
    public static class Bindings {
        public Recipe recipe(String id,String json){return new Recipe(id,json);}
        public List<String> list(String json){
            List<String> list=new ArrayList<>();
            for(JsonElement e:JsonParser.parseString(json).getAsJsonArray())list.add(e.getAsString());
            return list;
        }
    }
    static void load(Path path,String expected,JsonObject recipes,JsonObject tags,JsonObject casting,Set<String> items,Set<String> fluids)throws Exception{
        String hash=HexFormat.of().formatHex(MessageDigest.getInstance("SHA-1").digest(Files.readAllBytes(path)));
        if(!hash.equals(expected))throw new AssertionError("Wrong artifact: "+path);
        try(ZipFile zip=new ZipFile(path.toFile())){
            for(ZipEntry entry:Collections.list(zip.entries())){
                String name=entry.getName();
                if(name.startsWith("assets/")&&name.contains("/models/item/")&&name.endsWith(".json")){
                    String[] parts=name.split("/",4);
                    items.add(parts[1]+":"+name.substring(name.indexOf("/models/item/")+13,name.length()-5));
                }
                if(!name.startsWith("data/")||!name.endsWith(".json"))continue;
                String[] parts=name.split("/",3);
                String content=new String(zip.getInputStream(entry).readAllBytes(),java.nio.charset.StandardCharsets.UTF_8);
                JsonObject json;
                try{json=JsonParser.parseString(content).getAsJsonObject();}catch(Exception invalid){continue;}
                if(parts[2].startsWith("recipes/"))recipes.add(parts[1]+":"+parts[2].substring(8,parts[2].length()-5),json);
                else if(parts[2].startsWith("block_recipes/") || parts[2].startsWith("fluid_casting_time/")) casting.add(parts[1]+":"+parts[2].substring(0,parts[2].length()-5),json);
                else if(parts[2].startsWith("tags/")){
                    String key=parts[2].substring(5);int slash=key.indexOf('/');
                    key=key.substring(0,slash)+"|"+parts[1]+":"+key.substring(slash+1,key.length()-5);
                    JsonArray values=tags.has(key)?tags.getAsJsonArray(key):new JsonArray();
                    if(json.has("values"))for(JsonElement value:json.getAsJsonArray("values"))if(value.isJsonPrimitive()){
                        String id=value.getAsString();values.add(id);
                        if(key.startsWith("fluids|")&&!id.startsWith("#"))fluids.add(id);
                    }
                    tags.add(key,values);
                }
            }
        }
    }
    public static void main(String[] args)throws Exception{
        JsonObject recipes=new JsonObject(),tags=new JsonObject(),casting=new JsonObject();Set<String> items=new TreeSet<>(),fluids=new TreeSet<>();
        load(Path.of(args[0]),"d9be0ace572fe54be904da1bb0b0cc8711db3b70",recipes,tags,casting,items,fluids);
        load(Path.of(args[1]),"48e6b058f0d515cbb0e673d823e6e4042f9b1d37",recipes,tags,casting,items,fluids);
        load(Path.of(args[2]),"f12873c2543a379ec087d5b52f2c974dc97f4093",recipes,tags,casting,items,fluids);
        Context context=Context.enter();
        {
            Scriptable scope=context.initStandardObjects();context.addToScope(scope,"bindings",new Bindings());
            context.evaluateString(scope,"var fixtures="+recipes+", castingFixtures="+casting+", fixtureTags="+tags+", itemIds="+new Gson().toJson(items)+", fluidIds="+new Gson().toJson(fluids)+";","artifacts",1,null);
            context.evaluateString(scope,Files.readString(Path.of("tests/steel-unification-checks.js")),"checks",1,null);
            context.evaluateString(scope,Files.readString(Path.of("kubejs/server_scripts/hvcz_steel_unification.js")),"server-steel",1,null);
            context.evaluateString(scope,Files.readString(Path.of("kubejs/client_scripts/hvcz_steel_unification.js")),"client-steel",1,null);
            context.evaluateString(scope,"runSteelChecks();","run-checks",1,null);
            System.out.println("PASS Rhino 2001: real recipes/tags, balanced cycles, restrictions, recovery, JEI, absent mods, reload");
        }
    }
}
