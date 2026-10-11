package org.dynmap;

/** Test-only logger: no Minecraft/Dynmap server bootstrap is needed. */
public class Log {
    public static void verboseinfo(String message) {}
    public static void severe(String message) { throw new IllegalArgumentException(message); }
}
