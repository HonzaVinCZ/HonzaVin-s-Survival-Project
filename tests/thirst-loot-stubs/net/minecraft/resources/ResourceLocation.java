package net.minecraft.resources;
import com.mojang.serialization.Codec;
public record ResourceLocation(String id) {
 public static final Codec<ResourceLocation> f_135803_ = Codec.STRING.xmap(ResourceLocation::new, ResourceLocation::toString);
 public String toString() { return id; }
}
