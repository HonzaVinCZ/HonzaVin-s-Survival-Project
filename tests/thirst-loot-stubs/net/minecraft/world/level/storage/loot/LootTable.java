package net.minecraft.world.level.storage.loot;
import java.util.function.Consumer;
import it.unimi.dsi.fastutil.objects.ObjectArrayList;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.world.item.ItemStack;
public class LootTable {
 public final ResourceLocation id;
 public LootTable(ResourceLocation id) { this.id=id; }
 // The runtime mod binaries call these actual SRG method signatures.
 public void m_79131_(LootContext context, Consumer<ItemStack> output) {
  context.rawCalls++; output.accept(new ItemStack(id.toString(),70));
 }
 public static Consumer<ItemStack> m_246283_(ServerLevel level, Consumer<ItemStack> output) {
  return item -> { int remaining=item.count(); while(remaining>0) {int count=Math.min(64,remaining); output.accept(new ItemStack(item.id(),count)); remaining-=count;} };
 }
 public void m_79148_(LootContext context, Consumer<ItemStack> output) {
  if (++context.depth>32) throw new IllegalStateException("Recursive global loot generation detected");
  ObjectArrayList<ItemStack> generated=new ObjectArrayList<>();
  m_79131_(context,m_246283_(context.m_78952_(),generated::add));
  context.setQueried(id); context.chainCalls++;
  for (var modifier:context.modifiers) generated=modifier.apply(generated,context);
  generated.forEach(output); context.depth--;
 }
}
