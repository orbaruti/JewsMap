import { test } from "node:test";
import assert from "node:assert";
import { loadMergeApprovedIntoEras } from "../helpers/load-merge.mjs";

const mergeApprovedIntoEras = loadMergeApprovedIntoEras();

function cloneEras(eras) {
  return JSON.parse(JSON.stringify(eras));
}

test("new_person appends when id is new", () => {
  const eras = cloneEras([
    { id: 1, persons: [{ id: "a", nameHe: "א", nameEn: "A", summary: "s" }] }
  ]);
  mergeApprovedIntoEras(eras, [
    {
      era_id: 1,
      content_type: "new_person",
      data: { id: "b", nameHe: "ב", nameEn: "B", summary: "n" }
    }
  ]);
  assert.strictEqual(eras[0].persons.length, 2);
  assert.strictEqual(eras[0].persons[1].id, "b");
});

test("new_person skipped when id already exists", () => {
  const eras = cloneEras([
    { id: 1, persons: [{ id: "a", nameHe: "א", nameEn: "A" }] }
  ]);
  mergeApprovedIntoEras(eras, [
    {
      era_id: 1,
      content_type: "new_person",
      data: { id: "a", nameHe: "אחר", nameEn: "Other" }
    }
  ]);
  assert.strictEqual(eras[0].persons.length, 1);
  assert.strictEqual(eras[0].persons[0].nameEn, "A");
});

test("edit_person patches non-empty fields only", () => {
  const eras = cloneEras([
    {
      id: 1,
      persons: [{ id: "a", nameHe: "א", nameEn: "A", summary: "old", title: "t" }]
    }
  ]);
  mergeApprovedIntoEras(eras, [
    {
      era_id: 1,
      content_type: "edit_person",
      person_id: "a",
      data: { summary: "new", title: "" }
    }
  ]);
  assert.strictEqual(eras[0].persons[0].summary, "new");
  assert.strictEqual(eras[0].persons[0].title, "t");
});

test("add_source appends with newline", () => {
  const eras = cloneEras([
    { id: 1, persons: [{ id: "a", nameHe: "א", nameEn: "A", sources: "ראשון" }] }
  ]);
  mergeApprovedIntoEras(eras, [
    {
      era_id: 1,
      content_type: "add_source",
      person_id: "a",
      data: { sources: "שני" }
    }
  ]);
  assert.strictEqual(eras[0].persons[0].sources, "ראשון\nשני");
});

test("add_note pushes note object", () => {
  const eras = cloneEras([
    { id: 1, persons: [{ id: "a", nameHe: "א", nameEn: "A" }] }
  ]);
  mergeApprovedIntoEras(eras, [
    {
      era_id: 1,
      content_type: "add_note",
      person_id: "a",
      created_at: "2026-01-01T00:00:00Z",
      data: { note: "hello", authorName: "Tester" }
    }
  ]);
  assert.strictEqual(eras[0].persons[0].notes.length, 1);
  assert.strictEqual(eras[0].persons[0].notes[0].text, "hello");
  assert.strictEqual(eras[0].persons[0].notes[0].author, "Tester");
  assert.strictEqual(eras[0].persons[0].notes[0].date, "2026-01-01T00:00:00Z");
});

test("unknown era_id is ignored", () => {
  const eras = cloneEras([{ id: 1, persons: [{ id: "a", nameHe: "א", nameEn: "A" }] }]);
  mergeApprovedIntoEras(eras, [
    {
      era_id: 999,
      content_type: "new_person",
      data: { id: "x", nameHe: "קס", nameEn: "X" }
    }
  ]);
  assert.strictEqual(eras[0].persons.length, 1);
});
