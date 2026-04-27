import { test } from "node:test";
import assert from "node:assert";
import { loadErasData } from "../helpers/load-eras.mjs";

function collectAllPersonIds(eras) {
  const ids = new Set();
  for (const era of eras) {
    for (const p of era.persons) {
      ids.add(p.id);
    }
  }
  return ids;
}

test("ERAS_DATA loads and has eras", () => {
  const eras = loadErasData();
  assert.ok(Array.isArray(eras));
  assert.ok(eras.length > 0);
});

test("era ids are unique", () => {
  const eras = loadErasData();
  const seen = new Set();
  for (const era of eras) {
    const id = era.id;
    assert.ok(
      typeof id === "number" || typeof id === "string",
      "era.id must be number or string"
    );
    const key = String(id);
    assert.ok(!seen.has(key), `duplicate era id ${key}`);
    seen.add(key);
  }
});

test("within each era, person ids are unique", () => {
  const eras = loadErasData();
  for (const era of eras) {
    const seen = new Set();
    for (const p of era.persons) {
      assert.ok(p.id && typeof p.id === "string", "person.id must be non-empty string");
      assert.ok(!seen.has(p.id), `duplicate person id ${p.id} in era ${era.id}`);
      seen.add(p.id);
    }
  }
});

test("persons have required fields", () => {
  const eras = loadErasData();
  for (const era of eras) {
    for (const p of era.persons) {
      assert.ok(typeof p.nameHe === "string" && p.nameHe.length > 0, `nameHe required: ${p.id}`);
      assert.ok(typeof p.nameEn === "string", `nameEn must be string: ${p.id}`);
    }
  }
});

test("family references point to existing person ids", () => {
  const eras = loadErasData();
  const allIds = collectAllPersonIds(eras);
  for (const era of eras) {
    for (const p of era.persons) {
      if (p.fatherId) {
        assert.ok(allIds.has(p.fatherId), `fatherId ${p.fatherId} missing for ${p.id}`);
      }
      if (p.motherId) {
        assert.ok(allIds.has(p.motherId), `motherId ${p.motherId} missing for ${p.id}`);
      }
      if (Array.isArray(p.spouseIds)) {
        for (const sid of p.spouseIds) {
          assert.ok(allIds.has(sid), `spouseId ${sid} missing for ${p.id}`);
        }
      }
    }
  }
});
