import com.google.gson.*;
import com.mojang.serialization.*;
import it.unimi.dsi.fastutil.objects.ObjectArrayList;
import java.nio.file.*;
import java.security.MessageDigest;
import java.util.*;
import java.util.function.Supplier;
import java.util.zip.ZipFile;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.level.storage.loot.*;
import net.minecraft.world.level.storage.loot.predicates.LootItemCondition;
import net.minecraftforge.common.loot.*;

/** Actual mod codecs and doApply bytecode; isolated Minecraft/Forge boundary stubs. */
public class ThirstLootRecursionRegression {
    private static void check(boolean value, String message) {
        if (!value) throw new AssertionError(message);
    }

    @SuppressWarnings("unchecked")
    private static Codec<IGlobalLootModifier> codec(String className) throws Exception {
        return (Codec<IGlobalLootModifier>) ((Supplier<?>) Class.forName(className).getField("CODEC").get(null)).get();
    }

    private static void hash(Path path, String expected) throws Exception {
        check(HexFormat.of().formatHex(MessageDigest.getInstance("SHA-1").digest(Files.readAllBytes(path))).equals(expected),
                "Unexpected artifact: " + path);
    }

    public static void main(String[] args) throws Exception {
        hash(Path.of(args[0]), "de1c5adad2a77c7f6e168f2df6e7b82d9c3db719");
        hash(Path.of(args[1]), "76311d0d9f9064487fed060a793263744effacde");
        var oldCodec = codec("dev.ghen.thirst.foundation.common.loot.AddLootTableModifier");
        var fixedCodec = codec("vectorwing.farmersdelight.common.loot.modifier.AddLootTableModifier");
        JsonObject repaired = JsonParser.parseString(Files.readString(Path.of(args[2]))).getAsJsonObject();
        check(repaired.size() == 15, "Expected all 15 modifiers from the actual Rhino script run");
        List<IGlobalLootModifier> oldModifiers = new ArrayList<>(), fixedModifiers = new ArrayList<>();
        try (ZipFile thirst = new ZipFile(args[0])) {
            for (var entry : repaired.entrySet()) {
                String resource = "data/" + entry.getKey().replace(':', '/') + ".json";
                JsonObject original;
                try (var input = thirst.getInputStream(thirst.getEntry(resource))) {
                    original = JsonParser.parseString(new String(input.readAllBytes(), java.nio.charset.StandardCharsets.UTF_8)).getAsJsonObject();
                }
                oldModifiers.add(oldCodec.parse(JsonOps.INSTANCE, original).result().orElseThrow());
                JsonObject expected = original.deepCopy();
                expected.addProperty("type", "farmersdelight:add_loot_table");
                check(expected.equals(entry.getValue()), "Data changed beyond type: " + resource);
                fixedModifiers.add(fixedCodec.parse(JsonOps.INSTANCE, entry.getValue()).result().orElseThrow());
            }
        }
        LootContext broken = new LootContext(LootTable::new, oldModifiers);
        try {
            new LootTable(new ResourceLocation("minecraft:chests/shipwreck_supply")).m_79148_(broken, stack -> {});
            throw new AssertionError("Original Thirst bytecode did not reproduce recursion");
        } catch (IllegalStateException expected) {
            check(expected.getMessage().equals("Recursive global loot generation detected"), "Unexpected failure");
        }

        // Independent marker models another mod's top-level GLM; it must run once.
        fixedModifiers.add(new LootModifier(new LootItemCondition[0]) {
            public Codec<? extends IGlobalLootModifier> codec() { return null; }
            protected ObjectArrayList<ItemStack> doApply(ObjectArrayList<ItemStack> loot, LootContext context) {
                context.markerCalls++;
                loot.add(new ItemStack("other-mod:loot", 1));
                return loot;
            }
        });
        for (String root : List.of("shipwreck_supply", "simple_dungeon", "bastion_other", "abandoned_mineshaft", "nether_bridge")) {
            LootContext context = new LootContext(LootTable::new, fixedModifiers);
            List<ItemStack> output = new ArrayList<>();
            new LootTable(new ResourceLocation("minecraft:chests/" + root)).m_79148_(context, output::add);
            check(context.chainCalls == 1 && context.rawCalls == 4 && context.markerCalls == 1, "Nested GLM duplication: " + root);
            Map<String, Integer> counts = new HashMap<>();
            for (var item : output) {
                check(item.count() > 0 && item.count() <= 64, "Stack splitting failed");
                counts.merge(item.id(), item.count(), Integer::sum);
            }
            check(counts.size() == 5 && counts.get("minecraft:chests/" + root) == 70 && counts.get("other-mod:loot") == 1,
                    "Base or other-mod loot lost: " + root);
            for (String suffix : List.of("", "_bc", "_fr")) {
                check(counts.get("thirst:chests/" + root + suffix) == 70, "Thirst loot lost/duplicated: " + root + suffix);
            }
        }
        LootContext unrelated = new LootContext(LootTable::new, fixedModifiers);
        new LootTable(new ResourceLocation("minecraft:chests/desert_pyramid")).m_79148_(unrelated, stack -> {});
        check(unrelated.rawCalls == 1 && unrelated.markerCalls == 1, "Unrelated chest received Thirst loot");
        System.out.println("PASS: actual Thirst 1.4.0 recursion reproduced; actual FD 1.2.11 codecs/bytecode generate all 15 replacements without reentry or duplicate/lost loot");
    }
}
