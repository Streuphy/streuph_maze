/* =========================================================================
 * sm-entities.js — generic entity capabilities, destination policy, and commit.
 * Tile policy is injected by the rules layer; this module owns only reusable
 * entity identity/capability mechanics and movement bookkeeping.
 * ========================================================================= */
(function (global) {
  'use strict';
  var SM = global.SM || (global.SM = {});

  function isTarget(object) {
    var tile = object && (object.inst || object);
    return !!(tile && tile.entityRole === 'target');
  }

  function capabilities(object) {
    return object && (object.capabilities ||
      (object.inst && object.inst.capabilities)) || {};
  }

  /**
   * Pure destination preflight shared by direct and forced object movement.
   * `policy` supplies board/tile queries so this helper never dispatches on
   * tile IDs, families, names, or gate types.
   */
  function canOccupy(state, object, x, y, policy, allowCurrentPlayerCell) {
    if (!policy.inBounds(x, y) || policy.isSolid(x, y) || policy.crateAt(x, y)) return false;
    if (!isTarget(object) && !allowCurrentPlayerCell && policy.playerAt(x, y)) return false;
    var feature = policy.targetAt(x, y);
    if (feature && feature !== object && isTarget(object)) return false;
    var passability = policy.passability(x, y);
    if (passability && passability.required && passability.carrier !== passability.required) return false;
    return true;
  }

  /**
   * Commit exactly one already-validated entity relocation and append its
   * stable display event. Callers own destination validation and turn order.
   */
  function move(state, object, fromX, fromY, toX, toY, steps, eventType) {
    if (isTarget(object)) {
      object.x = toX;
      object.y = toY;
      steps.push({
        type: eventType === 'teleport' ? 'object-teleport' : 'target-move',
        objectType: 'target', entityId: object.entityId, id: object.inst.id,
        from: { x: fromX, y: fromY }, to: { x: toX, y: toY }
      });
      return;
    }

    state.crates[fromY][fromX] = null;
    state.crates[toY][toX] = object;
    steps.push(eventType === 'teleport'
      ? { type: 'object-teleport', objectType: 'crate', entityId: object.entityId,
          id: object.id, from: { x: fromX, y: fromY }, to: { x: toX, y: toY } }
      : { type: 'push', crate: { x: fromX, y: fromY }, to: { x: toX, y: toY } });
  }

  SM.ENTITIES = Object.freeze({
    isTarget: isTarget,
    capabilities: capabilities,
    canOccupy: canOccupy,
    move: move
  });
})(typeof window !== 'undefined' ? window : globalThis);
