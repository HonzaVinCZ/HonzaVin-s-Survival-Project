package net.minecraftforge.common.loot;
import com.mojang.datafixers.Products;
import com.mojang.serialization.Codec;
import com.mojang.serialization.codecs.RecordCodecBuilder;
import it.unimi.dsi.fastutil.objects.ObjectArrayList;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.level.storage.loot.LootContext;
import net.minecraft.world.level.storage.loot.predicates.LootItemCondition;
public abstract class LootModifier implements IGlobalLootModifier {
 protected final LootItemCondition[] conditions;
 protected LootModifier(LootItemCondition[] conditions) { this.conditions = conditions; }
 public record TableCondition(String kind, ResourceLocation target) implements LootItemCondition {
  public boolean test(LootContext context) {
   if (!kind.equals("forge:loot_table_id")) throw new AssertionError("Unsupported fixture condition: " + kind);
   return target.equals(context.queried);
  }
 }
 private static final Codec<TableCondition> CONDITION = RecordCodecBuilder.create(inst -> inst.group(
  Codec.STRING.fieldOf("condition").forGetter(TableCondition::kind),
  ResourceLocation.f_135803_.fieldOf("loot_table_id").forGetter(TableCondition::target)
 ).apply(inst, TableCondition::new));
 private static final Codec<LootItemCondition[]> CONDITIONS = CONDITION.listOf().xmap(
  list -> list.toArray(new LootItemCondition[0]),
  array -> java.util.Arrays.stream(array).map(c -> (TableCondition)c).toList());
 protected static <T extends LootModifier> Products.P1<RecordCodecBuilder.Mu<T>, LootItemCondition[]> codecStart(RecordCodecBuilder.Instance<T> inst) {
  return inst.group(CONDITIONS.fieldOf("conditions").forGetter(m -> m.conditions));
 }
 public ObjectArrayList<ItemStack> apply(ObjectArrayList<ItemStack> loot, LootContext context) {
  for (LootItemCondition condition : conditions) if (!condition.test(context)) return loot;
  return doApply(loot, context);
 }
 protected abstract ObjectArrayList<ItemStack> doApply(ObjectArrayList<ItemStack> loot, LootContext context);
}
