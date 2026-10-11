// Forge / Minecraft 1.20.1 only. Install on server AND clients; full restart.
// Thirst's AddLootTableModifier exists, but its serializer is not registered in
// the build shown in latest.log. Reuse its own codec rather than discard ALL
// global loot modifiers (which would also disable other mods' chest loot).
if (Platform.isForge() && Platform.isLoaded('thirst')) {
  ForgeModEvents.onEvent('net.minecraftforge.registries.RegisterEvent', event => {
    const key = event.getRegistryKey()
    if (String(key.location()) !== 'forge:global_loot_modifier_serializers') return

    const ResourceLocation = Java.loadClass('net.minecraft.resources.ResourceLocation')
    const id = new ResourceLocation('thirst', 'add_loot_table')
    const registry = event.getForgeRegistry()
    if (registry === null || registry.containsKey(id)) return

    try {
      const Modifier = Java.loadClass('dev.ghen.thirst.foundation.common.loot.AddLootTableModifier')
      const codec = Modifier.CODEC.get()
      event.register(key, id, () => codec)
      console.info('[HVCZ fixes] Registered missing thirst:add_loot_table serializer')
    } catch (error) {
      // A different Thirst build may move/remove this class. Leave its registries
      // alone and report it instead of preventing the entire pack from starting.
      console.warn('[HVCZ fixes] Thirst loot serializer could not be restored: ' + error)
    }
  })
}
