// Repairs for latest.log from 2026-10-11, Minecraft 1.20.1 / KubeJS 6 / Forge.
// Data overrides run BEFORE JSON/recipe deserialization. event.remove() is too late
// for malformed JSON and missing-item errors during the initial recipe scan.
ServerEvents.highPriorityData(event => {
  const ModPlatform = Java.loadClass('dev.architectury.platform.Platform')
  const Files = Java.loadClass('java.nio.file.Files')

  // Read the installed mod's own table so its rolls, weights and valid entries
  // survive. This intentionally touches only the resources named in the log.
  function readModJson(mod, resource) {
    if (!Platform.isLoaded(mod)) return null
    const parts = resource.split(':')
    const path = ModPlatform.getMod(mod).findResource('data', parts[0], parts[1] + '.json')
    if (!path.isPresent()) return null
    try {
      return JSON.parse(String(Files.readString(path.get())))
    } catch (error) {
      console.warn('[HVCZ fixes] Cannot read ' + resource + ': ' + error)
      return null
    }
  }

  // Forge evaluates the false condition before trying to deserialize the recipe.
  function disableRecipe(id) {
    event.addJson(id.replace(':', ':recipes/'), {
      type: 'minecraft:crafting_shapeless',
      conditions: [{ type: 'forge:false' }]
    })
  }

  // These malformed cross-mod resources have no usable ingredients in this pack.
  // Do not override them if the corresponding optional mod is added later.
  if (!Platform.isLoaded('create_dd')) {
    disableRecipe('create_dd:crafting/tin_ingot_from_decompacting')
    disableRecipe('create_dd:crafting/tin_nugget_from_decompacting')
  }
  if (!Platform.isLoaded('immersiveengineering')) {
    ;['aluminum', 'copper', 'lead', 'steel'].forEach(metal => {
      disableRecipe('create:cutting/compat/immersiveengineering/wire_' + metal)
    })
  }

  // Stale compatibility recipes: leave them intact when their input exists.
  ;['steel', 'bronze', 'tin'].forEach(metal => {
    ;['ceramic', 'metal'].forEach(mold => {
      const input = 'molten_metals:molten_' + metal +
        (mold === 'ceramic' ? '_ceramic_ingot_mold' : '_ingot_mold')
      if (!Item.exists(input)) {
        disableRecipe('create_ironworks:compat/molten_metals/splashing/' +
          metal + '_ingot_from_' + mold + '_mold')
      }
    })
  })
  ;[
    ['create_ironworks:compat/dreams_and_desires/crushing_coal_piece', 'create_dd:coal_piece'],
    ['create_ironworks:compat/dreams_and_desires/raw_tin_exchange', 'create_dd:raw_tin'],
    ['createcasing:crafting/chain_drive/creative_from_zinc', 'create:creative_casing']
  ].forEach(fix => {
    if (!Item.exists(fix[1])) disableRecipe(fix[0])
  })

  // The shipped TConstruct-namespace overrides use absent steel items/empty keys.
  // Retain the intended 9:1 conversions using this pack's preferred TFMG steel.
  if (Item.exists('tfmg:steel_ingot') && Item.exists('tfmg:steel_nugget') &&
      Item.exists('tfmg:steel_block')) {
    event.addJson('tconstruct:recipes/common/materials/steel_nugget_from_ingot', {
      type: 'minecraft:crafting_shapeless',
      ingredients: [{ item: 'tfmg:steel_ingot' }],
      result: { item: 'tfmg:steel_nugget', count: 9 }
    })
    event.addJson('tconstruct:recipes/common/materials/steel_ingot_from_nuggets', {
      type: 'minecraft:crafting_shaped',
      pattern: ['NNN', 'NNN', 'NNN'],
      key: { N: { item: 'tfmg:steel_nugget' } },
      result: { item: 'tfmg:steel_ingot' }
    })
    event.addJson('tconstruct:recipes/common/materials/steel_ingot_from_block', {
      type: 'minecraft:crafting_shapeless',
      ingredients: [{ item: 'tfmg:steel_block' }],
      result: { item: 'tfmg:steel_ingot', count: 9 }
    })
    event.addJson('tconstruct:recipes/common/materials/steel_block_from_ingots', {
      type: 'minecraft:crafting_shaped',
      pattern: ['III', 'III', 'III'],
      key: { I: { item: 'tfmg:steel_ingot' } },
      result: { item: 'tfmg:steel_block' }
    })
  }

  // Alex's Delight retained an old AMFD namespace for its cooked moose rib.
  const rib = 'alexsdelight:singular_cooked_moose_rib'
  if (Platform.isLoaded('alexsdelight') && !Item.exists('amfd:singular_cooked_moose_rib')) {
    if ([rib, 'farmersdelight:tomato', 'farmersdelight:onion',
         'farmersdelight:barbecue_stick'].every(id => Item.exists(id))) {
      event.addJson('alexsdelight:recipes/barbecue_on_a_stick', {
        type: 'minecraft:crafting_shapeless',
        group: 'barbecue_stick',
        ingredients: [
          { item: 'farmersdelight:tomato' }, { item: 'farmersdelight:onion' },
          { item: rib }, { item: 'minecraft:cooked_chicken' },
          { item: 'minecraft:stick' }, { item: 'minecraft:stick' }
        ],
        result: { item: 'farmersdelight:barbecue_stick', count: 2 }
      })
    } else {
      disableRecipe('alexsdelight:barbecue_on_a_stick')
      console.warn('[HVCZ fixes] Moose rib recipe disabled: replacement ingredients are missing')
    }
  }

  // Convert ONLY nonexistent item entries to empty entries. Keeping their weight
  // preserves the odds of the remaining loot instead of making it more common.
  function repairLootEntries(node) {
    if (Array.isArray(node)) return node.map(repairLootEntries)
    if (!node || typeof node !== 'object') return node
    if (node.type === 'minecraft:item' && !Item.exists(node.name)) {
      const empty = { type: 'minecraft:empty' }
      ;['weight', 'quality', 'conditions'].forEach(key => {
        if (node[key] !== undefined) empty[key] = node[key]
      })
      return empty
    }
    Object.keys(node).forEach(key => { node[key] = repairLootEntries(node[key]) })
    return node
  }

  if (Platform.isLoaded('thirst')) {
    ;['shipwreck_supply', 'simple_dungeon', 'bastion_other',
      'abandoned_mineshaft', 'nether_bridge'].forEach(chest => {
      ;['bc', 'fr'].forEach(compat => {
        const resource = 'thirst:loot_tables/chests/' + chest + '_' + compat
        const table = readModJson('thirst', resource)
        if (table) event.addJson(resource, repairLootEntries(table))
      })
    })
  }
  const bank = 'lightmanscurrency:loot_tables/chest/village/idas_taiga_large_bank'
  const bankTable = readModJson('lightmanscurrency', bank)
  if (bankTable) event.addJson(bank, repairLootEntries(bankTable))

  // Radar ships loot for blocks that are registered only with optional addons.
  if (Platform.isLoaded('create_radar')) {
    ;['plane_radar', 'identification_transponder', 'radar_guidance_block'].forEach(block => {
      if (!Item.exists('create_radar:' + block)) {
        event.addJson('create_radar:loot_tables/blocks/' + block, {
          type: 'minecraft:block', pools: []
        })
      }
    })
  }
})

ServerEvents.tags('item', event => {
  // Remove the four obsolete entries only; keep traffic lights from other mods.
  ;[1, 2, 3, 5].forEach(number => {
    const id = 'saros_road_signs_mod:trafficlight_' + number
    if (!Item.exists(id)) event.remove('forge:traffic_lights', id)
  })
  if (Item.exists('tfmg:sulfuric_acid_bucket')) {
    event.add('forge:buckets/sulfuric_acid', 'tfmg:sulfuric_acid_bucket')
  }
})
