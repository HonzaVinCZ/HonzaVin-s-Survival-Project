// MIT. Target: Dynmap 3.7-SNAPSHOT-948, Forge 47 / Minecraft 1.20.1.
// Fix the registration boundary, before models, chunk caches or render threads.
// Use Property#getName(value), as in upstream Dynmap PR #4273.
function initializeCoreMod() {
  var ASMAPI = Java.type('net.minecraftforge.coremod.api.ASMAPI');
  var Opcodes = Java.type('org.objectweb.asm.Opcodes');
  var VarInsnNode = Java.type('org.objectweb.asm.tree.VarInsnNode');
  var MethodInsnNode = Java.type('org.objectweb.asm.tree.MethodInsnNode');
  var property = 'net/minecraft/world/level/block/state/properties/Property';
  var blockState = 'net/minecraft/world/level/block/state/BlockState';
  var getValue = ASMAPI.mapMethod('m_61143_');
  var getName = ASMAPI.mapMethod('m_6940_');

  function previousCode(node) {
    node = node.getPrevious();
    while (node !== null && node.getOpcode() < 0) node = node.getPrevious();
    return node;
  }

  return {
    'serialized_properties': {
      'target': {'type': 'CLASS', 'name': 'org.dynmap.forge_1_20.DynmapPlugin'},
      'transformer': function(clazz) {
        var matches = [];
        var alreadyFixed = false;
        for (var m = 0; m < clazz.methods.size(); m++) {
          var method = clazz.methods.get(m);
          if (method.name !== 'initializeBlockStates' || method.desc !== '()V') continue;
          for (var insn = method.instructions.getFirst(); insn !== null; insn = insn.getNext()) {
            if (!(insn instanceof MethodInsnNode)) continue;
            if (insn.owner === property && insn.name === getName &&
                insn.desc === '(Ljava/lang/Comparable;)Ljava/lang/String;') alreadyFixed = true;
            if (insn.owner !== 'java/lang/Comparable' || insn.name !== 'toString' ||
                insn.desc !== '()Ljava/lang/String;' || insn.getOpcode() !== Opcodes.INVOKEINTERFACE) continue;
            var valueCall = previousCode(insn);
            if (!(valueCall instanceof MethodInsnNode) || valueCall.owner !== blockState ||
                valueCall.name !== getValue ||
                valueCall.desc !== '(L' + property + ';)Ljava/lang/Comparable;') continue;
            var propertyLoad = previousCode(valueCall);
            var stateLoad = previousCode(propertyLoad);
            if (!(propertyLoad instanceof VarInsnNode) || propertyLoad.getOpcode() !== Opcodes.ALOAD ||
                !(stateLoad instanceof VarInsnNode) || stateLoad.getOpcode() !== Opcodes.ALOAD) continue;
            matches.push({method: method, call: insn, propertyLoad: propertyLoad, stateLoad: stateLoad});
          }
        }
        if (matches.length !== 1 || alreadyFixed) {
          ASMAPI.log(alreadyFixed ? 'INFO' : 'WARN',
            '[HVCZ Dynmap enum fix] ' + (alreadyFixed ? 'Already patched; leaving bytecode unchanged.' :
            'Unsupported registration bytecode (' + matches.length + ' matches); no patch applied.'));
          return clazz;
        }
        var hit = matches[0];
        // Retain Property as the receiver below the existing getValue result.
        // Stack: ..., value -> ..., property, value -> ..., serializedName.
        hit.method.instructions.insertBefore(hit.stateLoad,
          new VarInsnNode(Opcodes.ALOAD, hit.propertyLoad.var));
        hit.method.instructions.set(hit.call,
          new MethodInsnNode(Opcodes.INVOKEVIRTUAL, property, getName,
            '(Ljava/lang/Comparable;)Ljava/lang/String;', false));
        hit.method.maxStack += 1;
        ASMAPI.log('INFO', '[HVCZ Dynmap enum fix] Applied serialized property names to Forge 1.20.1.');
        return clazz;
      }
    }
  };
}
