/**
 * Shared merge logic for approved_content rows into era person lists.
 * Loaded in browser before submissions.js; same file is vm-executed in Node tests.
 */
(function (g) {
  "use strict";

  function mergeApprovedIntoEras(eras, approvedItems) {
    approvedItems.forEach(function (item) {
      var era = eras.find(function (e) { return e.id == item.era_id; });
      if (!era) return;

      if (item.content_type === "new_person") {
        var exists = era.persons.some(function (p) { return p.id === item.data.id; });
        if (!exists) {
          era.persons.push(item.data);
        }
      } else if (item.content_type === "edit_person") {
        var person = era.persons.find(function (p) { return p.id === item.person_id; });
        if (person) {
          Object.keys(item.data).forEach(function (key) {
            if (item.data[key] !== undefined && item.data[key] !== null && item.data[key] !== "") {
              person[key] = item.data[key];
            }
          });
        }
      } else if (item.content_type === "add_source") {
        var personSrc = era.persons.find(function (p) { return p.id === item.person_id; });
        if (personSrc) {
          var existing = personSrc.sources || "";
          var addition = item.data.sources || "";
          personSrc.sources = existing ? existing + "\n" + addition : addition;
        }
      } else if (item.content_type === "add_note") {
        var personNote = era.persons.find(function (p) { return p.id === item.person_id; });
        if (personNote) {
          if (!personNote.notes) personNote.notes = [];
          personNote.notes.push({
            text: item.data.note,
            author: item.data.authorName || "",
            date: item.created_at
          });
        }
      }
    });
  }

  g.JewsMapMergeApproved = {
    mergeApprovedIntoEras: mergeApprovedIntoEras
  };
})(typeof window !== "undefined" ? window : globalThis);
