// Retired 2026-10-17. Keep this file to overwrite the older unsafe workaround.
// Registering Thirst 1.4.0's own AddLootTableModifier enables recursive global
// loot generation and can crash the server when opening a chest.
// hvcz_log_fixes.js now overrides its 15 modifier JSON resources to use
// Farmer's Delight's non-recursive raw-table implementation instead.
// No serializer registration is needed. Replace BOTH scripts, then restart.
