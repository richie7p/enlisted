import assert from "node:assert/strict";
import { test } from "node:test";
import { defaultCareer, parseCareer, saveCareer, loadCareer, clearCareer, SAVE_KEY } from "./save";
import { createSim, stepSim, buildReport } from "./combat/sim";
import { canPromote, nextRank } from "./ranks";
import { astar, buildGrid } from "./pathfinding";
import { useGame } from "./store";
import type { GameActions } from "./input";
import type { MissionDef, MapDef } from "./types";
const idle: GameActions = { moveX: 0, moveY: 0, aimX: 0, aimY: 0, aimActive: false, fire: false, firePressed: false, reload: false, crouch: false, grenade: false, swap: false, cmd: 0, drone: false, support: false, pause: false, worldAimX: 0, worldAimY: 0, moveOrder: null, supportOrder: null };
const map: MapDef = { id: "range", nameZh: "測試", nameEn: "test", w: 800, h: 800, ground: "dirt", walls: [], cover: [], spawn: { x: 400, y: 400 } };
const mission: MissionDef = { id: "test", nameZh: "測試", nameEn: "test", type: "patrol", mapId: "range", minRank: "private", briefing: "", intel: [], enemies: [], objectives: [{ id: "point", type: "waypoint", x: 600, y: 400, r: 50, required: true, label: "check" }] };
function memory() { const data = new Map<string, string>(); Object.defineProperty(globalThis, "localStorage", { configurable: true, value: { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => data.set(k,v), removeItem: (k: string) => data.delete(k) }}); return data; }
test("legacy partial career migrates while future versions and malformed fields are rejected", () => {
  const c = parseCareer('{"name":"Veteran","xp":40}'); assert.equal(c.xp,40); assert.equal(c.settings.music,0.35);
  for (const text of ['null','[]','{"name":4}','{"name":"x","version":99}','{"name":"x","xp":-1}']) assert.throws(() => parseCareer(text));
});
test("career export roundtrip, backup recovery, and reset cannot resurrect the backup", () => {
  const data=memory(); const c=defaultCareer("Player"); saveCareer(c); saveCareer({...c,xp:100});
  assert.deepEqual(parseCareer(JSON.stringify(c)),c); data.set(SAVE_KEY,"broken"); assert.equal(loadCareer()?.xp,0);
  clearCareer(); assert.equal(loadCareer(),null); assert.equal(data.size,0);
});
test("waypoint completes only after reaching target and mission stops after win", () => {
  const sim=createSim(mission,map,defaultCareer()); stepSim(sim,1/60,idle); assert.equal(sim.ended,null);
  const p=sim.units.find(u=>u.id===sim.playerId)!; p.x=600; p.y=400; stepSim(sim,1/60,idle);
  assert.equal(sim.ended,"win"); assert.equal(buildReport(sim).success,true); const t=sim.time; stepSim(sim,1/60,idle); assert.equal(sim.time,t);
});
test("player death fails a mission and report penalties apply to civilian casualties", () => {
  const sim=createSim(mission,map,defaultCareer()); const p=sim.units.find(u=>u.id===sim.playerId)!; p.state="dead"; p.hp=0;
  stepSim(sim,1/60,idle); assert.equal(sim.ended,"fail"); const normal=buildReport(sim); sim.stats.civilianDeaths=1;
  const penalty=buildReport(sim); assert.equal(penalty.grade,"F"); assert.equal(penalty.disciplineDelta,normal.disciplineDelta-18);
});
test("capture progress accumulates only inside its radius", () => {
  const sim=createSim({...mission,objectives:[{...mission.objectives[0],type:"capture",holdNeed:1}]},map,defaultCareer());
  stepSim(sim,0.1,idle); assert.equal(sim.objs[0].hold,0);
  const p=sim.units.find(u=>u.id===sim.playerId)!; p.x=600; p.y=400; for(let i=0;i<90;i++) stepSim(sim,1/60,idle);
  assert.equal(sim.ended,"win");
});
test("promotion requires every threshold and store commits unlocks", () => {
  memory(); const rank=nextRank("private")!; assert.equal(canPromote("private",rank.needXp,rank.needMerit,rank.needDisc,rank.needMissions)?.id,rank.id);
  assert.equal(canPromote("private",rank.needXp-1,rank.needMerit,rank.needDisc,rank.needMissions),null);
  useGame.getState().startCareer("Tester","regular"); useGame.setState({pendingRank:rank.id}); useGame.getState().ackPromotion();
  assert.equal(useGame.getState().career?.rankId,rank.id); assert.ok(rank.weapons.every(w=>useGame.getState().career?.unlockedWeapons.includes(w)));
});
test("pathfinding routes around blocking walls without cutting diagonal corners", () => {
  const grid=buildGrid({...map,w:200,h:200,walls:[{x:80,y:0,w:40,h:120}]}); const path=astar(grid,20,20,180,20);
  assert.ok(path.length>0); assert.ok(path.some(p=>p.y>=140)); assert.ok(path.every(p=>!(p.x>80&&p.x<120&&p.y<120)));
});
