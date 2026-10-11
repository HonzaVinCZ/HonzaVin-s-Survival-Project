package net.minecraftforge.coremod.api;
public class ASMAPI {
    public static String mapMethod(String name) { return name; } // Production SRG namespace
    public static void log(String level, String text) { System.out.println(level + ": " + text); }
}
