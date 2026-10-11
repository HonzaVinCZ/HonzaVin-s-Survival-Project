// Minecraft 1.20.1 / KubeJS 6. Keep steel production and materials in TFMG.
// Separate from hvcz_server.js: its disabled production routes remain disabled.
var hvczSteelForms = [
  { target: 'tfmg:steel_ingot', names: ['steel_ingot'], tags: ['forge:ingots/steel', 'c:ingots/steel', 'c:steel_ingots'] },
  { target: 'tfmg:steel_nugget', names: ['steel_nugget', 'steel_scrap'], tags: ['forge:nuggets/steel', 'c:nuggets/steel', 'c:steel_nuggets'] },
  { target: 'tfmg:steel_block', names: ['steel_block'], tags: ['forge:storage_blocks/steel', 'c:storage_blocks/steel', 'c:steel_blocks', 'c:steel_storage_blocks'] },
  { target: 'tfmg:heavy_plate', names: ['steel_sheet', 'steel_plate'], tags: ['forge:plates/steel', 'c:plates/steel', 'c:steel_plates'] }
]
var hvczSteelItems = {}

function hvczFindSteelItems() {
  var replacements = {}
  Item.getTypeList().forEach(value => {
    var id = String(value)
    if (id.indexOf('tfmg:') === 0) return
    hvczSteelForms.forEach(form => {
      if (Item.exists(form.target) && form.names.indexOf(id.split(':')[1]) !== -1) replacements[id] = form.target
    })
  })
  return replacements
}

function hvczFindSteelFluids() {
  var replacements = {}
  Fluid.getTypes().forEach(value => {
    var id = String(value)
    var name = id.split(':')[1]
    if (id.indexOf('tfmg:') === 0) return
    var target = name === 'molten_steel' ? 'tfmg:molten_steel' :
      name === 'flowing_molten_steel' ? 'tfmg:flowing_molten_steel' : null
    if (target !== null && Fluid.exists(target)) replacements[id] = target
  })
  return replacements
}

ServerEvents.tags('item', event => {
  hvczSteelItems = hvczFindSteelItems()
  // Capture all members before normalizing, including nonstandard item names.
  hvczSteelForms.forEach(form => {
    if (!Item.exists(form.target)) return
    form.tags.forEach(tag => event.get(tag).getObjectIds().forEach(value => {
      var id = String(value)
      if (id.indexOf('tfmg:') !== 0) hvczSteelItems[id] = form.target
    }))
  })
  Object.keys(hvczSteelItems).forEach(id => event.removeAllTagsFrom(id))
  hvczSteelForms.forEach(form => {
    if (!Item.exists(form.target)) return
    form.tags.forEach(tag => {
      event.removeAll(tag)
      event.add(tag, form.target)
    })
  })
  if (Item.exists('tfmg:molten_steel_bucket')) {
    event.add('forge:buckets/molten_steel', 'tfmg:molten_steel_bucket')
    event.add('c:buckets/molten_steel', 'tfmg:molten_steel_bucket')
  }
})

ServerEvents.tags('block', event => {
  if (!Item.exists('tfmg:steel_block')) return
  hvczSteelForms[2].tags.forEach(tag => {
    event.removeAll(tag)
    event.add(tag, 'tfmg:steel_block')
  })
})

ServerEvents.tags('fluid', event => {
  if (!Fluid.exists('tfmg:molten_steel')) return
  Object.keys(hvczFindSteelFluids()).forEach(id => event.removeAllTagsFrom(id))
  var preferred = ['tfmg:molten_steel', 'tfmg:flowing_molten_steel'].filter(id => Fluid.exists(id))
  ;['forge:molten_steel', 'c:molten_steel'].forEach(tag => {
    event.removeAll(tag)
    event.add(tag, preferred)
  })
  // Preserve the other metals in this tag; add both still and flowing steel.
  event.add('createbigcannons:molten_metal', preferred)
})

ServerEvents.recipes(event => {
  if (!Item.exists('tfmg:steel_ingot') || !Fluid.exists('tfmg:molten_steel')) return
  var items = hvczFindSteelItems()
  Object.keys(hvczSteelItems).forEach(id => { items[id] = hvczSteelItems[id] })
  var fluids = hvczFindSteelFluids()
  var buckets = {}
  Object.keys(fluids).forEach(id => {
    var bucket = id + '_bucket'
    if (id.split(':')[1] === 'molten_steel' && Item.exists(bucket) && Item.exists('tfmg:molten_steel_bucket')) buckets[bucket] = 'tfmg:molten_steel_bucket'
  })
  var removed = 0
  var changed = 0

  function duplicateOutput(value) {
    if (typeof value === 'string') return items[value] !== undefined
    if (value === null || typeof value !== 'object') return false
    if (Array.isArray(value)) return value.some(duplicateOutput)
    return (typeof value.item === 'string' && items[value.item] !== undefined) ||
      duplicateOutput(value.result) || duplicateOutput(value.results)
  }

  // Work from the recipe JSON rather than replaceInput/replaceOutput: unknown
  // schemas (including CBC melting) deliberately ignore those bulk helpers.
  function rewrite(value, key) {
    if (typeof value === 'string') {
      if (key === 'fluid' && fluids[value] !== undefined) return fluids[value]
      if ((key === 'item' || key === 'result' || key === 'ingredient') && items[value] !== undefined) return items[value]
      if ((key === 'item' || key === 'result' || key === 'ingredient') && buckets[value] !== undefined) return buckets[value]
      return value
    }
    if (value === null || typeof value !== 'object') return value
    if (Array.isArray(value)) return value.map(child => rewrite(child, key))
    Object.keys(value).forEach(childKey => { value[childKey] = rewrite(value[childKey], childKey) })
    return value
  }

  event.forEachRecipe({}, recipe => {
    var id = String(recipe.getId())
    recipe.serialize() // Retain changes made by earlier recipe handlers.
    var original = String(recipe.json.toString())
    var json = JSON.parse(original)
    var cbcCompacting = /^createbigcannons:compacting\/forge_steel_(block|ingot|nugget)$/.test(id)
    if (!cbcCompacting && (duplicateOutput(json.result) || duplicateOutput(json.results))) {
      recipe.remove()
      removed++
      return
    }
    rewrite(json, '')
    // TFMG casts 144 mB/ingot, 16 mB/nugget, 1296 mB/block. Normalize both
    // CBC directions; keeping its old 90/10/810 costs would duplicate material.
    var cbcMelting = /^createbigcannons:melting\/melt_steel_(block|ingot|nugget)$/.test(id)
    if (cbcMelting || cbcCompacting) {
      var form = id.substring(id.lastIndexOf('_') + 1)
      var amount = form === 'block' ? 1296 : form === 'ingot' ? 144 : 16
      if (cbcMelting) json.results.forEach(result => {
        if (result.fluid === 'tfmg:molten_steel') result.amount = amount
      })
      else json.ingredients.forEach(input => {
        if (input.fluidTag === 'forge:molten_steel' || input.fluid === 'tfmg:molten_steel') input.amount = amount
      })
    }
    if (JSON.stringify(json) !== JSON.stringify(JSON.parse(original))) {
      recipe.remove()
      event.custom(json).id(id)
      changed++
    }
  })

  // One-way recovery of existing duplicate stocks; no new steel-making route.
  Object.keys(items).forEach(id => {
    event.shapeless(items[id], [id]).id('kubejs:hvcz_steel/recover_' + id.replace(':', '/'))
  })
  Object.keys(buckets).forEach(id => {
    // Consume the filled bucket too, avoiding an extra empty crafting remainder.
    event.shapeless(buckets[id], [id]).consumeIngredient(id)
      .id('kubejs:hvcz_steel/recover_' + id.replace(':', '/'))
  })
  // Existing CBC fluid in tanks is not rewritten. A basin can convert it 1:1.
  if (Fluid.exists('createbigcannons:molten_steel')) {
    event.custom({
      type: 'create:mixing',
      ingredients: [{ fluid: 'createbigcannons:molten_steel', amount: 1000 }],
      results: [{ fluid: 'tfmg:molten_steel', amount: 1000 }]
    }).id('kubejs:hvcz_steel/recover_cbc_molten_steel')
  }
  console.info('[HVCZ steel] Removed ' + removed + ' duplicate-material recipes; redirected ' + changed + ' recipes to TFMG')
})
