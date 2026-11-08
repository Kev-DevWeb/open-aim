// The player's weapon, chosen in the lobby (player-weapon-ui.js). When a drill's scene is
// served (main.js), its rules.weapon is replaced with this choice, so any drill can be
// played with any of the engine's guns. "" keeps each drill's own weapon.

// Same ids and order as the engine's weapon table (Mr in next/js/BiMsX6Xn.js) and Studio
// (studio/drill.js WEAPONS).
const WEAPONS = [
  ["classic", "Classic"], ["shorty", "Shorty"], ["frenzy", "Frenzy"], ["ghost", "Ghost"], ["sheriff", "Sheriff"],
  ["stinger", "Stinger"], ["spectre", "Spectre"], ["bucky", "Bucky"], ["judge", "Judge"],
  ["bulldog", "Bulldog"], ["guardian", "Guardian"], ["phantom", "Phantom"], ["vandal", "Vandal"],
  ["marshal", "Marshal"], ["outlaw", "Outlaw"], ["operator", "Operator"], ["ares", "Ares"], ["odin", "Odin"],
];
const IDS = new Set(WEAPONS.map(([id]) => id));

function isWeapon(id) {
  return IDS.has(id);
}

// Returns a copy of the scene with the player's weapon set, or the scene itself when there
// is nothing to change. scene.doc is the drill as a JSON string; docBytes follows its length.
// Drills built around one gun set scene.weaponLocked and always keep their own weapon.
function applyWeapon(scene, weapon) {
  if (!isWeapon(weapon) || !scene || scene.weaponLocked === true || typeof scene.doc !== "string") return scene;
  let doc;
  try {
    doc = JSON.parse(scene.doc);
  } catch {
    return scene;
  }
  if (!doc || typeof doc.rules !== "object" || doc.rules === null || doc.rules.weapon === weapon) return scene;
  doc.rules.weapon = weapon;
  const text = JSON.stringify(doc);
  return { ...scene, doc: text, docBytes: Buffer.byteLength(text) };
}

module.exports = { WEAPONS, isWeapon, applyWeapon };
