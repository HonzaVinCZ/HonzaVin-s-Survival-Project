package net.minecraft.world.level.storage.loot;
import java.util.List;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.server.level.ServerLevel;
import net.minecraftforge.common.loot.IGlobalLootModifier;
public class LootContext {
 public ResourceLocation queried;
 public final LootDataResolver resolver;
 public final List<IGlobalLootModifier> modifiers;
 public int depth, rawCalls, chainCalls, markerCalls;
 public LootContext(LootDataResolver resolver, List<IGlobalLootModifier> modifiers) { this.resolver=resolver; this.modifiers=modifiers; }
 public LootDataResolver m_278643_() { return resolver; }
 public ServerLevel m_78952_() { return new ServerLevel(); }
 // Mirrors Forge 47.4.20: queried table is assigned once, not overwritten by nested generation.
 public void setQueried(ResourceLocation id) { if (queried==null) queried=id; }
}
