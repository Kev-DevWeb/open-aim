// node --test scripts/test-player-weapon.cjs
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { WEAPONS, isWeapon, applyWeapon } = require("../app/player-weapon.js");

const scene = (rules) => {
  const doc = JSON.stringify({ meta: { name: "Ñandú drill" }, rules });
  return { shareCode: "abc", doc, docBytes: Buffer.byteLength(doc) };
};

test("lists the engine's 18 guns with unique ids", () => {
  assert.equal(WEAPONS.length, 18);
  assert.equal(new Set(WEAPONS.map(([id]) => id)).size, 18);
  assert.ok(isWeapon("phantom") && isWeapon("operator"));
  assert.ok(!isWeapon("") && !isWeapon("melee") && !isWeapon("__proto__") && !isWeapon(undefined));
});

test("matches Studio's weapon list", () => {
  const source = fs.readFileSync(path.join(__dirname, "../app/studio/drill.js"), "utf8");
  const ids = [...source.match(/export const WEAPONS = \[([\s\S]*?)\];/)[1].matchAll(/\["([a-z]+)"/g)].map((m) => m[1]);
  assert.deepEqual(ids, WEAPONS.map(([id]) => id));
});

test("sets the player's weapon and keeps docBytes in step", () => {
  const before = scene({ weapon: "vandal", fireMode: "single" });
  const after = applyWeapon(before, "operator");
  const doc = JSON.parse(after.doc);
  assert.equal(doc.rules.weapon, "operator");
  assert.equal(doc.rules.fireMode, "single");
  assert.equal(doc.meta.name, "Ñandú drill");
  assert.equal(after.docBytes, Buffer.byteLength(after.doc));
  assert.equal(after.shareCode, "abc");
  assert.equal(JSON.parse(before.doc).rules.weapon, "vandal", "input is not changed");
});

test("leaves the scene alone when there is nothing to do", () => {
  const s = scene({ weapon: "vandal" });
  assert.equal(applyWeapon(s, ""), s);
  assert.equal(applyWeapon(s, "bazooka"), s);
  assert.equal(applyWeapon(s, "vandal"), s);
  const broken = { doc: "{not json" };
  assert.equal(applyWeapon(broken, "phantom"), broken);
  const noRules = { doc: JSON.stringify({ meta: {} }) };
  assert.equal(applyWeapon(noRules, "phantom"), noRules);
  assert.equal(applyWeapon(null, "phantom"), null);
});

test("keeps the weapon of a drill built around one gun", () => {
  const locked = { ...scene({ weapon: "operator" }), weaponLocked: true };
  assert.equal(applyWeapon(locked, "vandal"), locked);
});

test("works on every drill shipped in scenarios/", () => {
  const dir = path.join(__dirname, "../scenarios");
  let locked = 0;
  for (const name of fs.readdirSync(dir).filter((f) => f.endsWith(".json"))) {
    const { scene: s } = JSON.parse(fs.readFileSync(path.join(dir, name), "utf8"));
    const own = JSON.parse(s.doc).rules.weapon;
    const pick = own === "judge" ? "bucky" : "judge";
    assert.ok(isWeapon(own), `${name}: rules.weapon "${own}" is not one of the engine's guns`);
    assert.equal(JSON.parse(applyWeapon(s, pick).doc).rules.weapon, s.weaponLocked ? own : pick, name);
    if (s.weaponLocked) locked++;
  }
  assert.equal(locked, 6, "the six weapon drills are locked");
});
