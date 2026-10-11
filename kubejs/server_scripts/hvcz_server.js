/* 
 * ServerEvents.recipes(callback) is a function that accepts another function,
 * called the "callback", as a parameter. The callback gets run when the 
 * server is working on recipes, and then we can make our own changes.
 * When the callback runs, it is also known as the event "firing". 
*/

//RECIPES
ServerEvents.recipes(event => {

//CREATE RADARS RADAR FUZE
  event.remove({ output: 'create_radar:guided_fuze' })
event.shaped(
  Item.of('create_radar:guided_fuze', 1),
  [
    ' A ',
    ' B ',
    ' C '
  ],
  {
    A: 'createbigcannons:impact_fuze',
    B: 'create:precision_mechanism',
    C: 'create:electron_tube'
  }
)

//TFMG CAST IRON FIX
event.remove({ id: 'createbigcannons:compacting/iron_to_cast_iron_ingot' })
event.remove({ output: 'createbigcannons:cast_iron_ingot' })
event.remove({ input: 'createbigcannons:cast_iron_ingot' })
event.remove({ output: 'createbigcannons:cast_iron_block' })
event.shapeless(
  Item.of('createbigcannons:cast_iron_block', 1),
  [
    '#forge:ingots/cast_iron','#forge:ingots/cast_iron','#forge:ingots/cast_iron','#forge:ingots/cast_iron','#forge:ingots/cast_iron','#forge:ingots/cast_iron','#forge:ingots/cast_iron','#forge:ingots/cast_iron','#forge:ingots/cast_iron'
  ]
)
event.shapeless(
  Item.of('tfmg:cast_iron_block', 1),
  [
    'createbigcannons:cast_iron_block'
  ]
)


//REFINED STORAGE REPLACE IRON BY CAST IRON
event.replaceInput(
  { mod: 'refinedstorage' },
  'minecraft:iron_ingot',
  'tfmg:cast_iron_ingot'
)

//MTS BLOW TORCH
event.remove({ output: 'mts:mtsofficialpack.blowtorch' })
event.shaped(
  Item.of('mts:mtsofficialpack.blowtorch', 1),
  [
    ' B ',
    'ACA',
    '   '
  ],
  {
    A: '#forge:plates/iron',
    B: 'minecraft:flint_and_steel',
    C: 'tfmg:thermite_powder'
  }
)

//MTS JUMPER CABLES
event.remove({ output: 'mts:mts.jumpercable' })
event.shaped(
  Item.of('mts:mts.jumpercable', 1),
  [
    'ABA',
    'ABA',
    '   '
  ],
  {
    A: '#forge:shears',
    B: 'tfmg:copper_wire'
  }
)

//MTS REPAIR KITS
event.shapeless(
  Item.of('mts:mtsofficialpack.repairkit', 1),
  [
    'mts:gvp.repair_kit'
  ]
)
event.shapeless(
  Item.of('mts:gvp.repair_kit', 1),
  [
    'mts:mtsofficialpack.repairkit'
  ]
)

//MTS 37MM SOLID
event.shaped(
  Item.of('mts:mtsofficialpack.bullet3700solid', 1),
  [
    ' C ',
    ' B ',
    ' A '
  ],
  {
    A: 'createbigcannons:empty_autocannon_cartridge',
    B: '#forge:gunpowder',
    C: 'createbigcannons:ap_autocannon_round'
  }
)

//MTS 37MM HE
event.shaped(
  Item.of('mts:mtsofficialpack.bullet3700he', 1),
  [
    ' CD',
    ' B ',
    ' A '
  ],
  {
    A: 'createbigcannons:empty_autocannon_cartridge',
    B: '#forge:gunpowder',
    C: 'createbigcannons:flak_autocannon_round',
    D: 'createbigcannons:impact_fuze'
  }
)

//MTS 37MM PROXY
event.shaped(
  Item.of('mts:mtsofficialpack.bullet3700proxy', 1),
  [
    ' CD',
    ' B ',
    ' A '
  ],
  {
    A: 'createbigcannons:empty_autocannon_cartridge',
    B: '#forge:gunpowder',
    C: 'createbigcannons:flak_autocannon_round',
    D: 'createbigcannons:proximity_fuze'
  }
)

//MTS ROCKET POD ROCKETS
event.shaped(
  Item.of('mts:mtsofficialpack.bulletrocket', 2),
  [
    'AEA',
    'BEB',
    'DCD'
  ],
  {
    A: 'createbigcannons:impact_fuze',
    B: '#forge:gunpowder',
    C: 'createbigcannons:packed_guncotton',
    D: 'create:shaft',
    E: '#forge:plates/iron'
  }
)

//MTS REMOVE
event.remove({ output: 'mts:mtsofficialpack.explosives' })
event.remove({ output: 'mts:mtsofficialpack.fuzeimpact' })
event.remove({ output: 'mts:mtsofficialpack.fuzeproxy' })
event.remove({ output: 'mts:mtsofficialpack.metaltube' })
event.remove({ output: 'mts:mtsofficialpack.plastic' })
event.remove({ output: 'mts:mtsofficialpack.plating' })
event.remove({ output: 'mts:mtsofficialpack.processor' })
event.remove({ output: 'mts:mtsofficialpack.screws' })
event.remove({ output: 'mts:mtsofficialpack.processor' })
event.remove({ output: 'mts:mtsofficialpack.smallarmscartridge' })
event.remove({ output: 'mts:mtsofficialpack.basecartridge' })

//MTS REPLACEMENTS
event.replaceInput(
  { input: 'mts:mtsofficialpack.circuit' },
  'mts:mtsofficialpack.circuit',
  'create:precision_mechanism'
)

event.replaceInput(
  { input: 'mts:mtsofficialpack.copperwire' },
  'mts:mtsofficialpack.copperwire',
  'tfmg:copper_wire'
)

event.replaceInput(
  { input: 'mts:mtsofficialpack.headlight' },
  'mts:mtsofficialpack.headlight',
  'tfmg:light_bulb'
)

event.replaceInput(
  { input: 'mts:mtsofficialpack.metaltube' },
  'mts:mtsofficialpack.metaltube',
  'tfmg:rebar'
)

event.replaceInput(
  { input: 'mts:mtsofficialpack.plastic' },
  'mts:mtsofficialpack.plastic',
  'tfmg:plastic_sheet'
)

event.replaceInput(
  { input: 'mts:mtsofficialpack.plating' },
  'mts:mtsofficialpack.plating',
  'create:iron_sheet'
)

event.replaceInput(
  { input: 'mts:mtsofficialpack.processor' },
  'mts:mtsofficialpack.processor',
  'tfmg:electric_casing'
)

event.replaceInput(
  { input: 'mts:mtsofficialpack.screws' },
  'mts:mtsofficialpack.screws',
  'tfmg:screw'
)

//CBC AP ROUND
event.remove({ output: 'createbigcannons:ap_autocannon_round' })
event.shaped(
  Item.of('createbigcannons:ap_autocannon_round', 2),
  [
    ' A ',
    ' B ',
    '   '
  ],
  {
    A: '#forge:ingots/iron',
    B: '#forge:plates/iron'
  }
)

//LC TANK BY CREATE TANK REPLACEMENT
event.replaceInput(
  { input: 'lctech:iron_tank' },
  'lctech:iron_tank',
  'create:fluid_tank'
)

/*TFMG MAGNETIC IRON FIX
event.remove({ output: 'tfmg:magnetic_ingot' })
event.remove({ output: 'tfmg:polarizer' })
event.shapeless(
  Item.of('tfmg:magnetic_ingot', 1),
  [
    'tfmg:steel_ingot','minecraft:redstone'
  ]
)
*/

//TFMG HEAVY PLATE
event.remove({ id: 'create_ironworks:materials/plates/steel_sheet' })

//TFMG CAST IRON SHEET
event.remove({ output: 'tfmg:cast_iron_sheet' })
event.recipes.create.pressing('tfmg:cast_iron_sheet', '#forge:ingots/cast_iron')

//TFMG STEEL FROM DUST
event.remove({ id: 'tfmg:industrial_blasting/steel_from_dust' })

//TFMG CASTING BASIN
event.remove({ output: 'tfmg:casting_basin' })
event.shaped(
  Item.of('tfmg:casting_basin', 1),
  [
    '  A',
    'A A',
    'AAA'
  ],
  {
    A: 'tfmg:fireproof_bricks',
  }
)

//TFMG EXHAUST
event.remove({ output: 'tfmg:exhaust' })
event.shaped(
  Item.of('tfmg:exhaust', 1),
  [
    ' C ',
    ' C ',
    'BAB'
  ],
  {
    A: 'tfmg:steel_pipe',
    B: '#forge:ingots/iron',
    C: 'minecraft:iron_bars'
  }
)



//PIPEZ RECIPES
event.remove({ output: 'pipez:item_pipe' })
event.remove({ output: 'pipez:fluid_pipe' })
event.remove({ output: 'pipez:universal_pipe' })
event.remove({ output: 'pipez:gas_pipe' })
event.remove({ output: 'pipez:energy_pipe' })
event.shaped(
  Item.of('pipez:energy_pipe', 4),
  [
    '   ',
    'BAB',
    '   '
  ],
  {
    A: 'tfmg:copper_cable_hub',
    B: 'create:fluid_pipe'
  }
)

//GUNPOWDER FIX
event.remove({ mod: 'create_ironworks', output: 'minecraft:gunpowder' })
event.remove({ mod: 'tacz', output: 'minecraft:gunpowder' })

//FARMERS DELIGHT DOUGH REMOVE
event.remove({ output: 'farmersdelight:wheat_dough' })

//CREATE BIG CANNONS
event.remove({ id: 'createbigcannons:mixing/alloy_steel' })
event.remove({ id: 'createbigcannons:steel_ingot_from_nuggets' })

//SAROS ASPHALT
'saros_road_blocks_mod:asphalt'
event.remove({ output: 'saros_road_blocks_mod:asphalt' })
event.smelting('saros_road_blocks_mod:asphalt', 'tfmg:asphalt_mixture').xp(0.1)

//TFMG COKE OVEN
event.remove({ output: 'tfmg:coke_oven' })
event.shaped(
  Item.of('tfmg:coke_oven', 3),
  [
    'ABA',
    'B B',
    'ABA'
  ],
  {
    A: 'tfmg:cast_iron_ingot',
    B: 'tfmg:fireproof_bricks'
  }
)

//LCTECH BATTERIES
event.remove({ output: 'lctech:battery' })
event.shaped(
  Item.of('lctech:battery', 1),
  [
    ' B ',
    ' A ',
    ' B '
  ],
  {
    A: 'tfmg:accumulator',
    B: 'tfmg:cable_connector'
  }
)
event.remove({ output: 'lctech:energy_capacity_upgrade_1' })
event.shapeless(
  Item.of('lctech:energy_capacity_upgrade_1', 1),
  [
    'lctech:battery','#forge:ingots/iron'
  ]
)
event.remove({ output: 'lctech:energy_capacity_upgrade_2' })
event.shapeless(
  Item.of('lctech:energy_capacity_upgrade_2', 1),
  [
    'lctech:energy_capacity_upgrade_1','lctech:energy_capacity_upgrade_1','#forge:ingots/gold'
  ]
)
event.remove({ output: 'lctech:energy_capacity_upgrade_3' })
event.shapeless(
  Item.of('lctech:energy_capacity_upgrade_3', 1),
  [
    'lctech:energy_capacity_upgrade_2','lctech:energy_capacity_upgrade_2','lctech:energy_capacity_upgrade_2','lctech:energy_capacity_upgrade_2','#forge:gems/diamond'
  ]
)
event.remove({ output: 'lctech:energy_capacity_upgrade_4' })
event.shapeless(
  Item.of('lctech:energy_capacity_upgrade_4', 1),
  [
    'lctech:energy_capacity_upgrade_3','lctech:energy_capacity_upgrade_3','#forge:ingots/netherite'
  ]
)
event.remove({ output: 'lctech:battery_large' })
event.shapeless(
  Item.of('lctech:battery_large', 1),
  [
    'lctech:battery','lctech:energy_capacity_upgrade_3'
  ]
)







})

// TAGS
ServerEvents.tags('item', event => {
  // Get the #forge:cobblestone tag collection and add Diamond Ore to it
  //event.add('forge:cobblestone', 'minecraft:diamond_ore')

  // Get the #forge:cobblestone tag collection and remove Mossy Cobblestone from it
  //event.remove('forge:cobblestone', 'minecraft:mossy_cobblestone')

  // Get #forge:ingots/copper tag and remove all entries from it
  //event.removeAll('forge:ingots/copper')

  // Required for FTB Quests to check item NBT
  //event.add('itemfilters:check_nbt', 'some_item:that_has_nbt_types')

  // You can create new tags the same way you add to existing, just give it a name
  //event.add('forge:completely_new_tag', 'minecraft:clay_ball')

  // It supports adding tags to tags as well. Just prefix the second tag with #
  //event.add('c:stones', '#forge:stone')

  // Removes all tags from this entry
  //event.removeAllTagsFrom('minecraft:stick')

  // Add all items from the forge:stone tag to the c:stone tag, unless the id contains diorite
  //const stones = event.get('forge:stone').getObjectIds()
  //const blacklist = Ingredient.of(/.*diorite.*/)
  //stones.forEach(stone => {
  //  if (!blacklist.test(stone)) event.add('c:stone', stone)
  //})
event.removeAllTagsFrom('farmersdelight:wheat_dough')
//event.removeAllTagsFrom('createbigcannons:cast_iron_ingot')
})

console.log('Hello! The recipe event has fired!')