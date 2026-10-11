// Install on clients to hide retired materials; server script handles recipes.
// Do not hide cannon parts, machines, Nethersteel or Create's Shadow Steel.
JEIEvents.hideItems(event => {
  if (!Item.exists('tfmg:steel_ingot')) return
  Item.getTypeList().forEach(value => {
    var id = String(value)
    if (id.indexOf('tfmg:') !== 0 && /^(steel_ingot|steel_nugget|steel_scrap|steel_block|steel_sheet|steel_plate|molten_steel_bucket)$/.test(id.split(':')[1])) event.hide(id)
  })
})
JEIEvents.hideFluids(event => {
  if (!Fluid.exists('tfmg:molten_steel')) return
  Fluid.getTypes().forEach(value => {
    var id = String(value)
    if (id.indexOf('tfmg:') !== 0 && /^(molten_steel|flowing_molten_steel)$/.test(id.split(':')[1])) event.hide(Fluid.of(id))
  })
})
