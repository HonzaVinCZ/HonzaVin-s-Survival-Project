package net.minecraftforge.common.loot;
import com.mojang.serialization.Codec;
import it.unimi.dsi.fastutil.objects.ObjectArrayList;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.level.storage.loot.LootContext;
public interface IGlobalLootModifier {
 ObjectArrayList<ItemStack> apply(ObjectArrayList<ItemStack> loot, LootContext context);
 Codec<? extends IGlobalLootModifier> codec();
}
