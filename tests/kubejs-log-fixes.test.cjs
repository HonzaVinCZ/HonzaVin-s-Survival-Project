// Run: node --test tests/kubejs-log-fixes.test.cjs
// Exercises generated data and registration decisions, not Minecraft internals.
const assert = require('node:assert/strict')
const { test } = require('node:test')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')

const root = path.join(__dirname, '..')
const serverSource = fs.readFileSync(path.join(root, 'kubejs/server_scripts/hvcz_log_fixes.js'), 'utf8')
const startupSource = fs.readFileSync(path.join(root, 'kubejs/startup_scripts/hvcz_thirst_loot_fix.js'), 'utf8')
const clone = value => JSON.parse(JSON.stringify(value))
const packItems = [
  'tfmg:steel_ingot', 'tfmg:steel_nugget', 'tfmg:steel_block',
  'tfmg:sulfuric_acid_bucket', 'alexsdelight:cooked_loose_moose_rib',
  'farmersdelight:tomato', 'farmersdelight:onion', 'farmersdelight:barbecue_stick',
  'minecraft:stick', 'minecraft:cooked_chicken', 'minecraft:gold_ingot'
]
const tableFixture = {
  type: 'minecraft:chest', random_sequence: 'thirst:chests/test',
  pools: [{ rolls: { type: 'minecraft:uniform', min: 1, max: 3 }, entries: [
    { type: 'minecraft:item', name: 'minecraft:gold_ingot', weight: 2 },
    { type: 'minecraft:item', name: 'absent:drink', weight: 7, quality: 1,
      conditions: [{ condition: 'minecraft:random_chance', chance: 0.5 }],
      functions: [{ function: 'minecraft:set_count', count: 2 }] },
    { type: 'minecraft:alternatives', children: [
      { type: 'minecraft:item', name: 'absent:another_drink' },
      { type: 'minecraft:empty' }
    ] }
  ] }]
}

function serverHarness({ mods = ['thirst', 'lightmanscurrency', 'create_radar', 'alexsdelight'],
  items = packItems, tables = {}, source = serverSource, cachedResources = true } = {}) {
  const callbacks = {}
  const warnings = []
  const infos = []
  const closedStreams = []
  const context = {
    ServerEvents: {
      highPriorityData: fn => { callbacks.data = fn },
      tags: (type, fn) => { callbacks.tags = fn }
    },
    Platform: { isLoaded: id => mods.includes(id) },
    Item: { exists: id => items.includes(id) },
    console: { warn: message => warnings.push(message), info: message => infos.push(message) },
    Java: { loadClass: name => {
      if (name === 'java.lang.String') return function JavaString(bytes, encoding) {
        assert.equal(encoding, 'UTF-8')
        return new String(Buffer.from(bytes).toString('utf8'))
      }
      if (name === 'net.minecraftforge.resource.ResourcePackLoader') return {
        getPackFor: mod => ({ isPresent: () => true, get: () => ({
          getRootResource: (...args) => {
            const parts = Array.isArray(args[0]) ? args[0] : args
            // ModernFix hasResource walks children using each supplied string;
            // it does not split slash-containing components like Forge does.
            if (cachedResources && parts.some(part => part.includes('/'))) return null
            const key = mod + '/' + parts.join('/')
            if (!(key in tables)) return null
            return { get: () => ({
              readAllBytes: () => Buffer.from(typeof tables[key] === 'string'
                ? tables[key] : JSON.stringify(tables[key]), 'utf8'),
              close: () => closedStreams.push(key)
            }) }
          }
        }) })
      }
      // KubeJS denies java.nio/java.io imports. The original mock allowed Files
      // and missed the real server's class-filter failure.
      if (name.startsWith('java.nio.') || name.startsWith('java.io.') || name.startsWith('net.minecraftforge.fml.')) {
        throw Error('Class is not allowed by class filter: ' + name)
      }
      throw Error('Unexpected Java class: ' + name)
    } }
  }
  vm.runInNewContext(source, context)
  return {
    warnings, infos, closedStreams,
    reload: () => {
      const generated = {}
      const tagActions = []
      callbacks.data({ addJson: (id, json) => { generated[id] = clone(json) } })
      callbacks.tags({
        remove: (tag, id) => tagActions.push(['remove', tag, id]),
        add: (tag, id) => tagActions.push(['add', tag, id])
      })
      return { generated, tagActions }
    }
  }
}

test('default KubeJS class filter rejects Files; loot reads use mod streams, not jar Paths', () => {
  const oldImport = 'ServerEvents.highPriorityData(event => { Java.loadClass("java.nio.file.Files") })'
  assert.throws(() => serverHarness({ source: oldImport }).reload(), /not allowed by class filter/)
  assert.doesNotThrow(() => serverHarness().reload())
  assert.doesNotMatch(serverSource, /Java\.loadClass\(['"]java\.(?:nio|io)\./)
  assert.doesNotMatch(serverSource, /JsonIO\.read|findResource|architectury\.platform|net\.minecraftforge\.fml\./)
})

test('ModernFix cache rejects the original combined component but the revised reader finds loot', () => {
  const resource = 'thirst/data/thirst/loot_tables/chests/shipwreck_supply_bc.json'
  const oldReader = `
    ServerEvents.highPriorityData(event => {
      var pack = Java.loadClass('net.minecraftforge.resource.ResourcePackLoader').getPackFor('thirst').get()
      var resource = pack.getRootResource('data', 'thirst', 'loot_tables/chests/shipwreck_supply_bc.json')
      if (resource !== null) event.addJson('test:old_reader_found_resource', {})
    })
    ServerEvents.tags('item', event => {})
  `
  const options = { tables: { [resource]: tableFixture } }
  assert.equal(serverHarness({ ...options, source: oldReader }).reload()
    .generated['test:old_reader_found_resource'], undefined)
  assert.ok(serverHarness({ ...options, source: oldReader, cachedResources: false }).reload()
    .generated['test:old_reader_found_resource'])
  for (const cachedResources of [true, false]) {
    const current = serverHarness({ ...options, cachedResources })
    const generated = current.reload().generated
    assert.equal(generated['thirst:loot_tables/chests/shipwreck_supply_bc'].pools[0].entries[1].type,
      'minecraft:empty')
    assert.deepEqual(current.infos, ['[HVCZ fixes] Prepared 1 chest loot table overrides'])
  }
})

test('all six malformed optional recipes are skipped before deserialization', () => {
  const { generated } = serverHarness().reload()
  const ids = [
    'create_dd:recipes/crafting/tin_ingot_from_decompacting',
    'create_dd:recipes/crafting/tin_nugget_from_decompacting',
    ...['aluminum', 'copper', 'lead', 'steel'].map(metal =>
      'create:recipes/cutting/compat/immersiveengineering/wire_' + metal)
  ]
  for (const id of ids) assert.deepEqual(generated[id].conditions, [{ type: 'forge:false' }])
  const withMods = serverHarness({ mods: ['create_dd', 'immersiveengineering'] }).reload()
  for (const id of ids) assert.equal(withMods.generated[id], undefined)
})

test('nine stale recipes are skipped only when their exact input is missing', () => {
  const available = ['create:creative_casing', 'create_dd:coal_piece', 'create_dd:raw_tin']
  for (const metal of ['steel', 'bronze', 'tin']) {
    available.push('molten_metals:molten_' + metal + '_ceramic_ingot_mold')
    available.push('molten_metals:molten_' + metal + '_ingot_mold')
  }
  const missing = serverHarness().reload().generated
  const present = serverHarness({ items: [...packItems, ...available] }).reload().generated
  const ids = Object.keys(missing).filter(id =>
    id.startsWith('create_ironworks:recipes/') || id.startsWith('createcasing:recipes/'))
  assert.equal(ids.length, 9)
  for (const id of ids) {
    assert.deepEqual(missing[id].conditions, [{ type: 'forge:false' }])
    assert.equal(present[id], undefined)
  }
})

test('steel recipes conserve material with 9:1 conversions and nonempty shaped keys', () => {
  const { generated } = serverHarness().reload()
  const get = suffix => generated['tconstruct:recipes/common/materials/steel_' + suffix]
  assert.deepEqual(get('nugget_from_ingot').ingredients, [{ item: 'tfmg:steel_ingot' }])
  assert.equal(get('nugget_from_ingot').result.count, 9)
  assert.equal(get('ingot_from_block').result.count, 9)
  assert.deepEqual(get('ingot_from_nuggets').key, { N: { item: 'tfmg:steel_nugget' } })
  assert.deepEqual(get('block_from_ingots').key, { I: { item: 'tfmg:steel_ingot' } })
  for (const recipe of [get('ingot_from_nuggets'), get('block_from_ingots')]) {
    assert.equal(recipe.pattern.join('').length, 9)
    for (const symbol of recipe.pattern.join('')) assert.ok(recipe.key[symbol])
  }
  const absent = serverHarness({ items: [] }).reload().generated
  assert.equal(Object.keys(absent).filter(id => id.startsWith('tconstruct:')).length, 0)
})

test('moose rib repair uses the corrected item; preserves counts; guards future fixes', () => {
  const id = 'alexsdelight:recipes/barbecue_on_a_stick'
  const recipe = serverHarness().reload().generated[id]
  assert.equal(recipe.ingredients[2].item, 'alexsdelight:cooked_loose_moose_rib')
  assert.equal(recipe.ingredients.filter(input => input.item === 'minecraft:stick').length, 2)
  assert.equal(recipe.result.count, 2)
  const legacy = serverHarness({ items: packItems.filter(item => item !==
    'alexsdelight:cooked_loose_moose_rib').concat('alexsdelight:singular_cooked_moose_rib') })
  assert.equal(legacy.reload().generated[id].ingredients[2].item, 'alexsdelight:singular_cooked_moose_rib')
  const missing = serverHarness({ items: [] })
  assert.deepEqual(missing.reload().generated[id].conditions, [{ type: 'forge:false' }])
  assert.equal(missing.warnings.length, 1)
  assert.equal(serverHarness({ items: [...packItems, 'amfd:singular_cooked_moose_rib'] })
    .reload().generated[id], undefined)
})

test('follow-up empty outputs are disabled only when their mod or item is absent', () => {
  const ids = ['steel_block_from_compacting', 'steel_ingot_from_compacting',
    'steel_nugget_from_decompacting', 'steel_ingot_from_decompacting',
    'tin_ingot_from_compacting', 'tin_block_from_compacting'].map(name => 'create_dd:recipes/crafting/' + name)
  const radarIds = ['crafting/plane_radar', 'crafting/identification_transponder',
    'sequenced_assembly/network_filterer'].map(name => 'create_radar:recipes/' + name)
  const defaults = serverHarness().reload().generated
  for (const id of [...ids, ...radarIds]) assert.deepEqual(defaults[id].conditions, [{ type: 'forge:false' }])
  const restored = serverHarness({ mods: ['create_dd', 'create_radar'], items: [...packItems,
    'create_radar:plane_radar', 'create_radar:identification_transponder',
    'create_radar:incomplete_network_controller'] }).reload().generated
  for (const id of [...ids, ...radarIds]) assert.equal(restored[id], undefined)

  const source = 'saros_road_signs_mod/data/saros_road_signs_mod/recipes/traffic_light_control_boxrez.json'
  const recipe = { result: { item: 'saros_road_signs_mod:traffic_light_control_box' } }
  const options = { mods: ['saros_road_signs_mod'], tables: { [source]: recipe } }
  const id = 'saros_road_signs_mod:recipes/traffic_light_control_boxrez'
  assert.deepEqual(serverHarness(options).reload().generated[id].conditions, [{ type: 'forge:false' }])
  assert.equal(serverHarness({ ...options, items: [...packItems, recipe.result.item] }).reload().generated[id], undefined)
  assert.deepEqual(serverHarness({ ...options, items: [...packItems, 'minecraft:air'],
    tables: { [source]: { result: { item: 'minecraft:air' } } } }).reload().generated[id].conditions,
    [{ type: 'forge:false' }])
  // Falling back to vanilla alone does not prove Incendium's empty template
  // is broken. Keep this recipe until its intended behavior can be verified.
  assert.equal(defaults['incendium:recipes/upgrade_elytra'], undefined)
})

test('loot repairs retain valid entries, weights, conditions and rolls across reloads', () => {
  const tables = {}
  for (const chest of ['shipwreck_supply', 'simple_dungeon', 'bastion_other',
    'abandoned_mineshaft', 'nether_bridge']) {
    for (const compat of ['bc', 'fr']) {
      tables['thirst/data/thirst/loot_tables/chests/' + chest + '_' + compat + '.json'] = tableFixture
    }
  }
  tables['lightmanscurrency/data/lightmanscurrency/loot_tables/chest/village/idas_taiga_large_bank.json'] = tableFixture
  const harness = serverHarness({ tables })
  const first = harness.reload()
  assert.deepEqual(first, harness.reload())
  const loot = Object.entries(first.generated).filter(([id]) => id.includes(':loot_tables/chest'))
  assert.equal(loot.length, 11)
  for (const [, table] of loot) {
    assert.deepEqual(table.pools[0].rolls, tableFixture.pools[0].rolls)
    assert.deepEqual(table.pools[0].entries[0], tableFixture.pools[0].entries[0])
    assert.deepEqual(table.pools[0].entries[1], {
      type: 'minecraft:empty', weight: 7, quality: 1,
      conditions: tableFixture.pools[0].entries[1].conditions
    })
    assert.equal(table.pools[0].entries[2].children[0].type, 'minecraft:empty')
    assert.equal(table.random_sequence, tableFixture.random_sequence)
  }
  assert.equal(tableFixture.pools[0].entries[1].type, 'minecraft:item')
  assert.equal(harness.warnings.length, 0)
  assert.equal(harness.closedStreams.length, Object.keys(tables).length * 2)
  assert.deepEqual(harness.infos, Array(2).fill('[HVCZ fixes] Prepared 11 chest loot table overrides'))
})

test('optional Radar blocks and tag entries remain intact when registered', () => {
  const defaults = serverHarness().reload()
  assert.deepEqual(defaults.generated['create_radar:loot_tables/blocks/plane_radar'].pools, [])
  assert.equal(defaults.tagActions.filter(action => action[0] === 'remove').length, 4)
  const present = serverHarness({ items: [...packItems, 'create_radar:plane_radar',
    'saros_road_signs_mod:trafficlight_1'] }).reload()
  assert.equal(present.generated['create_radar:loot_tables/blocks/plane_radar'], undefined)
  assert.equal(present.tagActions.some(action => action[0] === 'remove' &&
    action[2] === 'saros_road_signs_mod:trafficlight_1'), false)
  assert.ok(present.tagActions.some(action => action[0] === 'add' &&
    action[1] === 'forge:buckets/sulfuric_acid'))
})

test('malformed source loot is reported and left alone', () => {
  const harness = serverHarness({ tables: {
    'thirst/data/thirst/loot_tables/chests/shipwreck_supply_bc.json': '{broken'
  } })
  assert.equal(harness.reload().generated['thirst:loot_tables/chests/shipwreck_supply_bc'], undefined)
  assert.equal(harness.warnings.length, 1)
  assert.equal(harness.closedStreams.length, 1)
})

test('retired startup workaround cannot register the recursive Thirst codec', () => {
  vm.runInNewContext(startupSource, {})
  assert.doesNotMatch(startupSource, /Java\.loadClass|ForgeModEvents\.onEvent/)
})

test('all 15 Thirst modifiers retain conditions and table IDs with a non-recursive type', () => {
  const tables = {}, originals = {}
  for (const chest of ['shipwreck_supply', 'simple_dungeon', 'bastion_other', 'abandoned_mineshaft', 'nether_bridge']) {
    for (const suffix of ['', '_bc', '_fr']) {
      const name = 'add_loot_' + chest + suffix
      const modifier = {type: 'thirst:add_loot_table', conditions: [
        {condition: 'forge:loot_table_id', loot_table_id: 'minecraft:chests/' + chest}
      ], lootTable: 'thirst:chests/' + chest + suffix, custom_field: 'preserve me'}
      tables['thirst/data/thirst/loot_modifiers/' + name + '.json'] = modifier
      originals['thirst:loot_modifiers/' + name] = modifier
    }
  }
  const harness = serverHarness({mods: ['thirst', 'farmersdelight'], tables})
  const first = harness.reload().generated
  const second = harness.reload().generated
  for (const [id, original] of Object.entries(originals)) {
    assert.deepEqual(first[id], {...original, type: 'farmersdelight:add_loot_table'})
    assert.deepEqual(second[id], first[id])
  }
  assert.equal(harness.warnings.length, 0)
  assert.equal(harness.closedStreams.length, 30)
  assert.equal(harness.infos.filter(x => x.includes('Prepared 15 non-recursive')).length, 2)
  const skipped = serverHarness({mods: ['thirst'], tables}).reload().generated
  assert.equal(Object.keys(skipped).filter(id => id.includes(':loot_modifiers/')).length, 0)
  const missing = serverHarness({mods: ['thirst', 'farmersdelight']})
  missing.reload()
  assert.equal(missing.warnings.length, 1)
})
