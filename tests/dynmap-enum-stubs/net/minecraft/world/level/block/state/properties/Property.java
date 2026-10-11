package net.minecraft.world.level.block.state.properties;
import net.minecraft.util.StringRepresentable;
public class Property {
    private final String name;
    public Property(String name) { this.name = name; }
    public String m_61708_() { return name; }
    public String m_6940_(Comparable<?> value) {
        return value instanceof StringRepresentable s ? s.m_7912_() : value.toString().toLowerCase();
    }
}
