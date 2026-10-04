import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";
import { readStored, writeStored, getSaveMessage } from "./storage";
const data = new Map<string, string>();
let failKey = "";
beforeEach(() => {
  data.clear(); failKey = "";
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => { if (key === failKey) throw new Error("QuotaExceededError"); data.set(key, value); },
    removeItem: (key: string) => data.delete(key),
  }});
});
const parse = (text: string) => { const value = JSON.parse(text); if (typeof value.score !== "number") throw new Error("Invalid"); return value as { score: number }; };
test("corrupt primary recovers independently validated backup", () => {
  data.set("save", "null"); data.set("backup", '{"score":4}');
  assert.equal(readStored("save", "backup", parse)?.score, 4);
});
test("backup quota failure does not prevent primary save", () => {
  data.set("save", '{"score":1}'); failKey = "backup";
  assert.equal(writeStored("save", "backup", { score: 2 }, parse), true);
  assert.equal(JSON.parse(data.get("save")!).score, 2);
});
test("primary quota failure preserves previous progress and reports unsaved state", () => {
  data.set("save", '{"score":1}'); failKey = "save";
  assert.equal(writeStored("save", "backup", { score: 2 }, parse), false);
  assert.equal(JSON.parse(data.get("save")!).score, 1);
  assert.ok(getSaveMessage().includes("無法儲存"));
});
test("corrupt primary never overwrites a good backup", () => {
  data.set("save", "broken"); data.set("backup", '{"score":3}');
  writeStored("save", "backup", { score: 4 }, parse);
  assert.equal(JSON.parse(data.get("backup")!).score, 3);
});
test("blocked storage degrades to no save without throwing", () => {
  Object.defineProperty(globalThis, "localStorage", { configurable: true, get: () => { throw new Error("SecurityError"); }});
  assert.equal(readStored("save", "backup", parse), null);
  assert.equal(writeStored("save", "backup", { score: 2 }, parse), false);
});

test("a newer client's save is never overwritten", () => {
 data.set("save", '{"version":99,"score":7}');
 assert.equal(writeStored("save", "backup", { version: 1, score: 8 }, (s) => JSON.parse(s)), false);
 assert.equal(JSON.parse(data.get("save")!).version, 99);
});
