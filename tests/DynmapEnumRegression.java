import java.io.*;
import java.nio.file.*;
import java.net.*;
import java.lang.reflect.*;
import java.util.*;
import java.util.jar.*;
import java.util.zip.*;
import javax.script.*;
import org.objectweb.asm.*;
import org.objectweb.asm.tree.*;
import org.objectweb.asm.tree.analysis.*;
import org.objectweb.asm.util.*;
import org.dynmap.renderer.DynmapBlockState;
import net.minecraft.util.StringRepresentable;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.level.block.state.properties.Property;

/** Runs the shipped Nashorn transformer on the real beta 6 binary and real Saro enums.
 * Test stubs cover only the Minecraft Property/BlockState boundary and ASMAPI names.
 * This does not boot a Forge server or verify lighting/UV output.
 */
public class DynmapEnumRegression {
    static final String OWNER = "org/dynmap/forge_1_20/DynmapPlugin";
    static final String PROPERTY = "net/minecraft/world/level/block/state/properties/Property";
    static final String STATE = "net/minecraft/world/level/block/state/BlockState";
    static final String DESC = "(Ljava/lang/String;L"+PROPERTY+";L"+STATE+";)Ljava/lang/String;";
    static void check(boolean test, String message) { if (!test) throw new AssertionError(message); }
    static ClassNode read(byte[] bytes) {
        ClassNode node = new ClassNode(); new ClassReader(bytes).accept(node, 0); return node;
    }
    static String text(MethodNode method) {
        StringWriter out = new StringWriter(); Textifier p = new Textifier();
        method.accept(new TraceMethodVisitor(p)); p.print(new PrintWriter(out)); return out.toString();
    }
    static AbstractInsnNode prev(AbstractInsnNode insn) {
        do { insn = insn.getPrevious(); } while (insn != null && insn.getOpcode() < 0); return insn;
    }
    static AbstractInsnNode next(AbstractInsnNode insn) {
        do { insn = insn.getNext(); } while (insn != null && insn.getOpcode() < 0); return insn;
    }
    static MethodNode init(ClassNode clazz) {
        return clazz.methods.stream().filter(m -> m.name.equals("initializeBlockStates")).findFirst().orElseThrow();
    }
    static ClassNode transform(ScriptEngine engine, ClassNode clazz) throws Exception {
        engine.put("inputClass", clazz);
        return (ClassNode)engine.eval("initializeCoreMod().serialized_properties.transformer(inputClass)");
    }
    static Method snippet(MethodNode source, String name) throws Exception {
        // Extract the actual name-building bytecode; stub only the referenced MC methods.
        MethodInsnNode getPropertyName = null;
        for (AbstractInsnNode i : source.instructions) {
            if (i instanceof MethodInsnNode m && m.owner.equals(PROPERTY) && m.name.equals("m_61708_")) {
                getPropertyName = m; break;
            }
        }
        check(getPropertyName != null, "No property name call");
        AbstractInsnNode begin = prev(prev(getPropertyName)), end = getPropertyName;
        while (!(end instanceof VarInsnNode v && v.getOpcode() == Opcodes.ASTORE && v.var == 12)) end = next(end);
        ClassWriter writer = new ClassWriter(ClassWriter.COMPUTE_MAXS | ClassWriter.COMPUTE_FRAMES);
        writer.visit(Opcodes.V17, Opcodes.ACC_PUBLIC, name, null, "java/lang/Object", null);
        MethodVisitor mv = writer.visitMethod(Opcodes.ACC_PUBLIC | Opcodes.ACC_STATIC, "name", DESC, null, null);
        mv.visitCode();
        mv.visitVarInsn(Opcodes.ALOAD, 0); mv.visitVarInsn(Opcodes.ASTORE, 12);
        mv.visitVarInsn(Opcodes.ALOAD, 1); mv.visitVarInsn(Opcodes.ASTORE, 14);
        mv.visitVarInsn(Opcodes.ALOAD, 2); mv.visitVarInsn(Opcodes.ASTORE, 7);
        for (AbstractInsnNode i = begin; ; i = i.getNext()) {
            if (i.getOpcode() >= 0) i.accept(mv);
            if (i == end) break;
        }
        mv.visitVarInsn(Opcodes.ALOAD, 12); mv.visitInsn(Opcodes.ARETURN);
        mv.visitMaxs(0,0); mv.visitEnd(); writer.visitEnd();
        byte[] bytes = writer.toByteArray();
        class Loader extends ClassLoader {
            Class<?> define() { return defineClass(name, bytes, 0, bytes.length); }
        }
        return new Loader().define().getMethod("name", String.class, Property.class, BlockState.class);
    }
    enum Facing { NORTH, SOUTH, EAST, WEST }
    static String name(Method snippet, Comparable<?>... values) throws Exception {
        String result = ""; String[] keys = {"facing", "texture_variant", "variant"};
        for (int i=0;i<keys.length;i++) result = (String)snippet.invoke(null,
            result + (i==0 ? "" : ","), new Property(keys[i]), new BlockState(values[i]));
        return result;
    }
    static void states(Method raw, Method fixed, Path saro) throws Exception {
        try (URLClassLoader loader = new URLClassLoader(new URL[]{saro.toUri().toURL()}, DynmapEnumRegression.class.getClassLoader())) {
            Comparable<?>[] heights = (Comparable<?>[])loader.loadClass("de.sarocesch.sarosroadblocksmod.block.AsphaltBlock$Variant").getEnumConstants();
            Comparable<?>[] textures = (Comparable<?>[])loader.loadClass("de.sarocesch.sarosroadblocksmod.block.AsphaltBlock$TextureVariant").getEnumConstants();
            String block = "hvcz_test:"+saro.getFileName().toString().replace('.', '_').replace('-', '_');
            DynmapBlockState oldBase = null, fixedBase = null;
            List<Comparable<?>[]> values = new ArrayList<>();
            for (Facing f : Facing.values()) for (Comparable<?> t : textures) for (Comparable<?> h : heights) values.add(new Comparable<?>[]{f,t,h});
            for (int i=0;i<values.size();i++) {
                Comparable<?>[] v = values.get(i);
                DynmapBlockState old = new DynmapBlockState.Builder().setBaseState(oldBase).setStateIndex(i)
                    .setBlockName(block+"_old").setStateName(name(raw,v)).build();
                DynmapBlockState correct = new DynmapBlockState.Builder().setBaseState(fixedBase).setStateIndex(i)
                    .setBlockName(block+"_fixed").setStateName(name(fixed,v)).build();
                if (oldBase==null) oldBase=old;
                if (fixedBase==null) fixedBase=correct;
            }
            int oldAir=0;
            for (int i=0;i<values.size();i++) {
                Comparable<?>[] v=values.get(i);
                String canonical="facing="+v[0].toString().toLowerCase()+",texture_variant="+
                    ((StringRepresentable)v[1]).m_7912_()+",variant="+((StringRepresentable)v[2]).m_7912_();
                check(name(fixed,v).equals(canonical), "Transformer serialization mismatch");
                if (DynmapBlockState.getStateByNameAndState(block+"_old", canonical).isAir()) oldAir++;
                DynmapBlockState found=DynmapBlockState.getStateByNameAndState(block+"_fixed", canonical);
                check(found.isNotAir() && found.stateIndex==i, "Incorrect decoded state: "+canonical);
                check(DynmapBlockState.getStateByNameAndState(block+"_fixed", canonical)==found, "Cached lookup changed");
            }
            check(oldAir==values.size()*15/16, "Unexpected old failure count: "+oldAir);
            System.out.printf("PASS %s: %,d numeric-height states rendered as air before; all %,d states resolve after%n",saro.getFileName(),oldAir,values.size());
        }
    }
    public static void main(String[] args) throws Exception {
        byte[] raw;
        try (JarFile jar=new JarFile(args[1])) { raw=jar.getInputStream(jar.getJarEntry(OWNER+".class")).readAllBytes(); }
        ScriptEngine engine = new ScriptEngineManager().getEngineByName("nashorn");
        check(engine!=null,"Nashorn not on classpath");
        engine.eval(Files.readString(Path.of(args[0])));
        ClassNode before=read(raw), after=transform(engine,read(raw));
        new Analyzer<BasicValue>(new BasicVerifier()).analyze(OWNER,init(after));
        check(before.methods.size()==after.methods.size(),"Methods added/removed");
        int changed=0;
        for(int i=0;i<before.methods.size();i++) {
            if(!text(before.methods.get(i)).equals(text(after.methods.get(i)))) {
                changed++; check(after.methods.get(i).name.equals("initializeBlockStates"),"Unrelated method changed");
            }
        }
        check(changed==1,"Expected exactly one changed method");
        String once=text(init(after)); transform(engine,after);
        check(once.equals(text(init(after))),"Second application changed bytecode");
        ClassNode unsupported=read(raw); init(unsupported).name="unexpectedVersion";
        String unsupportedText=text(unsupported.methods.stream().filter(m->m.name.equals("unexpectedVersion")).findFirst().orElseThrow());
        transform(engine,unsupported);
        check(unsupportedText.equals(text(unsupported.methods.stream().filter(m->m.name.equals("unexpectedVersion")).findFirst().orElseThrow())),"Unsupported class changed");
        Method old=snippet(init(before),"OldNameBuilder"), fixed=snippet(init(after),"FixedNameBuilder");
        for(int i=2;i<args.length;i++) states(old,fixed,Path.of(args[i]));
        System.out.println("PASS real Dynmap bytecode: stack verified; one method changed; idempotent; unsupported target unchanged");
    }
}
