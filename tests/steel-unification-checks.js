// Real Rhino/Gson harness. Registry/event behavior is mocked.
var callbacks={},hiddenItems=[],hiddenFluids=[],messages=[]
var ServerEvents={tags:(kind,fn)=>{callbacks[kind]=fn},recipes:fn=>{callbacks.recipes=fn}}
var JEIEvents={hideItems:fn=>{callbacks.hideItems=fn},hideFluids:fn=>{callbacks.hideFluids=fn}}
var console={info:value=>messages.push(String(value))}
var Item={exists:id=>itemIds.indexOf(String(id))!==-1,getTypeList:()=>bindings.list(JSON.stringify(itemIds))}
var Fluid={exists:id=>fluidIds.indexOf(String(id))!==-1,getTypes:()=>bindings.list(JSON.stringify(fluidIds)),of:id=>String(id)}
function check(value,message){if(!value)throw Error(message)}
function clone(value){return JSON.parse(JSON.stringify(value))}
function contains(value,id){return JSON.stringify(value).indexOf('"'+id+'"')!==-1}
function runSteelChecks(){
  check(Item.exists('tfmg:steel_ingot')&&Item.exists('create_ironworks:steel_sheet'),'Artifact item discovery failed')
  itemIds.push('test:refined_metal')
  fixtureTags['items|forge:ingots/steel'].push('test:refined_metal')
  fixtures['test:irregular']={type:'minecraft:crafting_shapeless',ingredients:[{item:'test:refined_metal'}],result:{item:'minecraft:iron_ingot'}}
  fixtures['test:earlier_handler']={type:'create:mixing',ingredients:[{item:'createbigcannons:steel_ingot'}],results:[{item:'createbigcannons:steel_screw_lock',count:2,chance:0.25}],processingTime:777,heatRequirement:'heated'}
  function deploy(){
    var tags=clone(fixtureTags),originals={},outputs={}
    function expand(key,visited){
      if(visited.indexOf(key)!==-1)return []
      var next=visited.concat([key]),ids=[]
      ;(tags[key]||[]).forEach(id=>{if(id.charAt(0)==='#')ids=ids.concat(expand(key.split('|')[0]+'|'+id.substring(1),next));else ids.push(id)})
      return ids
    }
    ;['item','block','fluid'].forEach(kind=>{
      var prefix=kind==='item'?'items|':kind==='block'?'blocks|':'fluids|'
      callbacks[kind]({
        get:tag=>({getObjectIds:()=>bindings.list(JSON.stringify(expand(prefix+tag,[])))}),
        removeAllTagsFrom:id=>Object.keys(tags).forEach(key=>{if(key.indexOf(prefix)===0)tags[key]=tags[key].filter(value=>value!==id)}),
        removeAll:tag=>{tags[prefix+tag]=[]},add:(tag,ids)=>{tags[prefix+tag]=(tags[prefix+tag]||[]).concat(Array.isArray(ids)?ids:[ids])}
      })
    })
    Object.keys(fixtures).forEach(id=>{originals[id]=bindings.recipe(id,JSON.stringify(fixtures[id]))})
    ;['createbigcannons:mixing/alloy_steel','createbigcannons:steel_ingot_from_nuggets','create_ironworks:materials/plates/steel_sheet','tfmg:industrial_blasting/steel_from_dust'].forEach(id=>{if(originals[id])originals[id].remove()})
    function add(json){var builder={consumeIngredient:id=>{json['kubejs:actions']=[{type:'consume',filter_ingredient:{item:id}}];return builder},id:id=>{check(outputs[id]===undefined,'Duplicate added ID: '+id);outputs[id]=clone(json)}};return builder}
    callbacks.recipes({
      forEachRecipe:(filter,fn)=>Object.keys(originals).forEach(id=>{if(!originals[id].removed)fn(originals[id])}),
      custom:json=>add(json),shapeless:(output,ingredients)=>add({type:'minecraft:crafting_shapeless',ingredients:ingredients.map(item=>({item:item})),result:{item:output}})
    })
    Object.keys(originals).forEach(id=>{if(!originals[id].removed)outputs[id]=JSON.parse(String(originals[id].json.toString()))})
    return {tags:tags,recipes:outputs}
  }
  var first=deploy(),second=deploy()
  check(JSON.stringify(first)===JSON.stringify(second),'Reload changed output')
  var r=first.recipes,t=first.tags
  ;['createbigcannons:mixing/alloy_steel','createbigcannons:steel_ingot_from_nuggets','create_ironworks:materials/plates/steel_sheet','tfmg:industrial_blasting/steel_from_dust'].forEach(id=>check(r[id]===undefined,'Disabled route restored: '+id))
  Object.keys(fixtures).filter(id=>id.indexOf('create_ironworks:materials/alloys/')===0&&contains(fixtures[id],'create_ironworks:steel_ingot')).forEach(id=>check(r[id]===undefined,'Alternative steel production: '+id))
  ;[['block',1296,'tfmg:steel_block'],['ingot',144,'tfmg:steel_ingot'],['nugget',16,'tfmg:steel_nugget']].forEach(row=>{
    var melt=r['createbigcannons:melting/melt_steel_'+row[0]],solid=r['createbigcannons:compacting/forge_steel_'+row[0]]
    check(melt.results[0].fluid==='tfmg:molten_steel'&&melt.results[0].amount===row[1],'Incorrect melting: '+row[0])
    check(solid.ingredients[0].amount===row[1]&&solid.results[0].item===row[2],'Unbalanced solidification: '+row[0])
    check(melt.processingTime===fixtures['createbigcannons:melting/melt_steel_'+row[0]].processingTime&&melt.heatRequirement==='heated','Heat/time changed')
  })
  check(r['tfmg:casting/steel'].ingredients[0].amount===r['createbigcannons:melting/melt_steel_ingot'].results[0].amount,'TFMG casting cycle mismatch')
  ;['forge:molten_steel','c:molten_steel','createbigcannons:molten_metal'].forEach(tag=>{
    check(t['fluids|'+tag].indexOf('tfmg:molten_steel')>=0&&t['fluids|'+tag].indexOf('tfmg:flowing_molten_steel')>=0,'Missing fluid tag: '+tag)
    check(t['fluids|'+tag].indexOf('createbigcannons:molten_steel')<0,'Retired steel tagged: '+tag)
  })
  var steelCasts=0
  Object.keys(castingFixtures).forEach(id=>{
    var cast=castingFixtures[id]
    if(cast.type==='createbigcannons:cannon_casting'&&cast.fluid.fluidTag==='forge:molten_steel'){
      steelCasts++
      check(t['fluids|'+cast.fluid.fluidTag].indexOf('tfmg:molten_steel')>=0,'Cannon cast cannot accept TFMG: '+id)
      check(cast.fluid.amount===1,'Casting lookup changed')
    }
  })
  check(steelCasts>0&&castingFixtures['forge:fluid_casting_time/tags/molten_steel'].casting_time===3600,'Missing casting/time data')
  check(t['fluids|createbigcannons:molten_metal'].indexOf('createbigcannons:molten_nethersteel')>=0,'Other metal lost')
  check(t['items|forge:ingots/steel'].length===1&&t['items|forge:ingots/steel'][0]==='tfmg:steel_ingot','Duplicate ingot tag')
  check(t['items|forge:plates/steel'][0]==='tfmg:heavy_plate','Wrong preferred plate')
  check(r['create_ironworks:materials/steel/sequenced_crafting_precision_mechanism'].sequence[2].ingredients[1].item==='tfmg:steel_nugget','Nested recipe not unified')
  check(r['test:irregular'].ingredients[0].item==='tfmg:steel_ingot','Nonstandard tagged item not redirected')
  check(r['test:earlier_handler'].earlier_handler==='preserved'&&r['test:earlier_handler'].results[0].chance===0.25&&r['test:earlier_handler'].processingTime===777,'Earlier modification/metadata lost')
  Object.keys(r).filter(id=>id.indexOf('kubejs:hvcz_steel/recover_')!==0).forEach(id=>{
    ;['createbigcannons:molten_steel','createbigcannons:steel_ingot','createbigcannons:steel_scrap','createbigcannons:steel_block','create_ironworks:steel_ingot','create_ironworks:steel_sheet'].forEach(old=>check(!contains(r[id],old),'Obsolete material: '+id+' -> '+old))
  })
  check(r['kubejs:hvcz_steel/recover_cbc_molten_steel'].ingredients[0].amount===r['kubejs:hvcz_steel/recover_cbc_molten_steel'].results[0].amount,'Recovery creates fluid')
  check(r['kubejs:hvcz_steel/recover_createbigcannons/molten_steel_bucket']['kubejs:actions'][0].type==='consume','Bucket recovery duplicates empty buckets')
  check(r['kubejs:hvcz_steel/recover_createbigcannons/steel_scrap'].result.item==='tfmg:steel_nugget','Wrong scrap recovery')
  Object.keys(fixtures).filter(id=>id.indexOf('createbigcannons:')===0&&contains(fixtures[id],'createbigcannons:nethersteel_ingot')).forEach(id=>check(JSON.stringify(r[id])===JSON.stringify(fixtures[id]),'Nethersteel changed: '+id))
  callbacks.hideItems({hide:id=>hiddenItems.push(String(id))});callbacks.hideFluids({hide:id=>hiddenFluids.push(String(id))})
  check(hiddenItems.indexOf('createbigcannons:steel_ingot')>=0&&hiddenFluids.indexOf('createbigcannons:molten_steel')>=0,'JEI duplicates remain')
  check(hiddenItems.indexOf('createbigcannons:steel_cannon_barrel')<0&&hiddenItems.indexOf('tfmg:steel_ingot')<0&&hiddenFluids.indexOf('createbigcannons:molten_nethersteel')<0,'Useful material hidden')
  var oldItems=itemIds,oldFluids=fluidIds;itemIds=[];fluidIds=[]
  callbacks.recipes({forEachRecipe:()=>{throw Error('Recipes changed without TFMG')}})
  ;['block','fluid'].forEach(kind=>callbacks[kind]({removeAll:()=>{throw Error('Tags changed without TFMG')},add:()=>{throw Error('Tags changed without TFMG')}}))
  callbacks.item({removeAllTagsFrom:()=>{throw Error('Items changed without TFMG')}})
  itemIds=oldItems;fluidIds=oldFluids
}
