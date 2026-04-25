(function () {
  "use strict";

  const ERAS = window.ERAS_DATA;
  const auth = window.JewsMapAuth;
  const subs = window.JewsMapSubmissions;

  let currentDetailEra = null;
  let currentDetailPerson = null;

  // ── Helpers ──────────────────────────────────────────────

  function hebrewToCE(y) {
    if (y == null) return "?";
    const ce = y - 3760;
    return ce <= 0 ? Math.abs(ce) + " BCE" : ce + " CE";
  }

  function hebrewToCEShort(y) {
    if (y == null) return "?";
    const ce = y - 3760;
    return ce <= 0 ? Math.abs(ce) + " לפנה\"ס" : ce + " לספירה";
  }

  function getBadgeClass(title) {
    if (!title) return "";
    const t = title.toLowerCase();
    if (t.includes("צדיק") || t.includes("tzadik")) return "badge-tzadik";
    if (t.includes("נביא") || t.includes("prophet") || t.includes("נביאה")) return "badge-prophet";
    if (t.includes("מלך") || t.includes("king") || t.includes("queen") || t.includes("מלכה")) return "badge-king";
    if (t.includes("שופט") || t.includes("judge")) return "badge-judge";
    if (t.includes("כהן") || t.includes("kohen") || t.includes("priest")) return "badge-kohen";
    if (t.includes("נשיא") || t.includes("nasi")) return "badge-prophet";
    if (title.trim()) return "badge-default";
    return "";
  }

  function personAvatarSVG() {
    return `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="24" r="12" fill="#A89882" opacity="0.6"/>
      <ellipse cx="32" cy="52" rx="18" ry="14" fill="#A89882" opacity="0.4"/>
    </svg>`;
  }

  // ── Auth UI ─────────────────────────────────────────────

  const authBtn = document.getElementById("auth-btn");
  const authLabel = document.getElementById("auth-label");
  const authMenu = document.getElementById("auth-menu");
  const authUserInfo = document.getElementById("auth-user-info");
  const adminLink = document.getElementById("admin-link");
  const signoutBtn = document.getElementById("signout-btn");
  const contributeSection = document.getElementById("contribute-section");

  let authMenuOpen = false;

  function updateAuthUI(user, profile) {
    if (user && profile) {
      const avatar = profile.avatar_url;
      if (avatar) {
        authBtn.innerHTML = `<img src="${avatar}" class="auth-avatar-img" alt="" referrerpolicy="no-referrer"><span id="auth-label" class="auth-name">${profile.display_name || 'משתמש'}</span>`;
      } else {
        authLabel.textContent = profile.display_name || profile.email;
      }
      authBtn.classList.add("logged-in");
      adminLink.style.display = auth.isAdmin() ? '' : 'none';
    } else {
      authBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg><span id="auth-label">התחבר</span>`;
      authBtn.classList.remove("logged-in");
      adminLink.style.display = 'none';
    }
    closeAuthMenu();
    updateContributeVisibility();
  }

  function toggleAuthMenu() {
    authMenuOpen = !authMenuOpen;
    authMenu.classList.toggle("open", authMenuOpen);
  }

  function closeAuthMenu() {
    authMenuOpen = false;
    authMenu.classList.remove("open");
  }

  authBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (auth.isLoggedIn()) {
      toggleAuthMenu();
    } else {
      auth.signInWithGoogle();
    }
  });

  signoutBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    auth.signOut();
    closeAuthMenu();
  });

  document.addEventListener("click", () => closeAuthMenu());

  function updateContributeVisibility() {
    if (contributeSection) {
      contributeSection.style.display = auth.isLoggedIn() ? '' : 'none';
    }
  }

  // ── Render Era Sections ────────────────────────────────

  const erasContainer = document.getElementById("eras-container");
  const eraElements = [];

  function renderEras() {
    erasContainer.innerHTML = '';
    eraElements.length = 0;

    ERAS.forEach((era, eraIdx) => {
      const section = document.createElement("section");
      section.className = "era-section";
      section.id = "era-" + eraIdx;
      section.dataset.startYear = era.startYear;
      section.dataset.endYear = era.endYear;

      const header = document.createElement("div");
      header.className = "era-header";
      header.innerHTML = `
        <div class="era-ornament"></div>
        <h2 class="era-title-he">${era.nameHe}</h2>
        <p class="era-title-en">${era.nameEn}</p>
      `;
      section.appendChild(header);

      const personsWrap = document.createElement("div");
      personsWrap.className = "era-persons";

      era.persons.forEach((person, pIdx) => {
        const card = document.createElement("div");
        card.className = "person-card " + (pIdx % 2 === 0 ? "side-right" : "side-left");
        card.setAttribute("role", "button");
        card.setAttribute("tabindex", "0");
        card.dataset.personId = person.id;
        card.dataset.eraIdx = eraIdx;
        card.dataset.personIdx = pIdx;

        const birthStr = person.birthYear != null ? person.birthYear : "?";
        const deathStr = person.deathYear != null ? person.deathYear : "?";
        const ceStr = hebrewToCE(person.birthYear) + " – " + hebrewToCE(person.deathYear);

        let badgeHTML = "";
        if (person.title) {
          const bc = getBadgeClass(person.title);
          badgeHTML = `<span class="card-badge ${bc}">${person.title}</span>`;
        }

        card.innerHTML = `
          <div class="card-avatar">${personAvatarSVG()}</div>
          <div class="card-name">${person.nameHe}</div>
          <div class="card-years">${birthStr} – ${deathStr}</div>
          <div class="card-years-ce">${ceStr}</div>
          ${badgeHTML}
        `;

        card.addEventListener("click", () => openDetail(era, person));
        card.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openDetail(era, person); }
        });
        personsWrap.appendChild(card);
      });

      section.appendChild(personsWrap);

      if (era.events && era.events.length > 0) {
        const eventsWrap = document.createElement("div");
        eventsWrap.className = "era-events";
        era.events.forEach((evt) => {
          const marker = document.createElement("div");
          marker.className = "event-marker";
          marker.innerHTML = `
            <span class="event-year">${evt.year}</span>
            <span>${evt.descHe}</span>
          `;
          eventsWrap.appendChild(marker);
        });
        section.appendChild(eventsWrap);
      }

      erasContainer.appendChild(section);
      eraElements.push(section);
    });

    buildEraNav();
    buildTimelineMarks();
    updateOnScroll();
    setTimeout(drawTree, 300);
  }

  // ── Era Navigation Dots ────────────────────────────────

  const eraNav = document.getElementById("era-nav");
  let eraDots = [];

  function buildEraNav() {
    eraNav.innerHTML = '';
    ERAS.forEach((era, idx) => {
      const dot = document.createElement("button");
      dot.className = "era-dot";
      dot.dataset.eraIdx = idx;
      dot.innerHTML = `<span class="era-dot-tooltip">${era.nameHe}</span>`;
      dot.addEventListener("click", () => {
        const el = document.getElementById("era-" + idx);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      });
      eraNav.appendChild(dot);
    });
    eraDots = eraNav.querySelectorAll(".era-dot");
  }

  // ── Timeline Sidebar ───────────────────────────────────

  const timelineTrack = document.getElementById("timeline-track");
  const timelineIndicator = document.getElementById("timeline-indicator");

  const allYears = [];
  ERAS.forEach((era) => {
    if (era.startYear != null) allYears.push(era.startYear);
    if (era.endYear != null) allYears.push(era.endYear);
  });
  const globalMinYear = Math.min(...allYears);
  const globalMaxYear = Math.max(...allYears);

  function buildTimelineMarks() {
    const trackH = timelineTrack.clientHeight;
    if (trackH < 50) return;

    timelineTrack.querySelectorAll(".tl-mark, .tl-mark-era").forEach((e) => e.remove());

    const step = Math.max(200, Math.ceil((globalMaxYear - globalMinYear) / 30 / 100) * 100);
    for (let y = Math.ceil(globalMinYear / step) * step; y <= globalMaxYear; y += step) {
      const pct = (y - globalMinYear) / (globalMaxYear - globalMinYear);
      const mark = document.createElement("div");
      mark.className = "tl-mark";
      mark.style.top = (pct * 100) + "%";
      mark.innerHTML = `<span class="tl-mark-he">${y}</span><span class="tl-mark-ce">${hebrewToCEShort(y)}</span>`;
      timelineTrack.appendChild(mark);
    }

    ERAS.forEach((era, idx) => {
      const pct = (era.startYear - globalMinYear) / (globalMaxYear - globalMinYear);
      const m = document.createElement("div");
      m.className = "tl-mark-era";
      m.style.top = (pct * 100) + "%";
      m.textContent = era.nameHe.substring(0, 20);
      timelineTrack.appendChild(m);
    });
  }

  window.addEventListener("resize", buildTimelineMarks);

  // ── Scroll-Driven Updates ──────────────────────────────

  const hudHe = document.getElementById("hud-he-year");
  const hudCE = document.getElementById("hud-ce-year");
  let currentDisplayYear = globalMinYear;

  function updateOnScroll() {
    const scrollTop = window.scrollY;
    const docH = document.documentElement.scrollHeight - window.innerHeight;
    const scrollPct = docH > 0 ? scrollTop / docH : 0;

    const currentYear = Math.round(globalMinYear + scrollPct * (globalMaxYear - globalMinYear));
    currentDisplayYear = currentYear;
    hudHe.textContent = "שנת " + currentYear;
    hudCE.textContent = hebrewToCEShort(currentYear);

    const trackH = timelineTrack.clientHeight;
    const indicatorH = 60;
    const top = scrollPct * (trackH - indicatorH);
    timelineIndicator.style.top = top + "px";

    let activeEraIdx = 0;
    const vpMid = scrollTop + window.innerHeight / 3;
    eraElements.forEach((el, idx) => {
      const rect = el.getBoundingClientRect();
      const elTop = rect.top + scrollTop;
      if (elTop < vpMid) activeEraIdx = idx;
    });

    eraDots.forEach((d, idx) => {
      d.classList.toggle("active", idx === activeEraIdx);
    });

    animateCards();
  }

  // ── Card Entrance Animation ────────────────────────────

  function animateCards() {
    const cards = document.querySelectorAll(".person-card:not(.visible)");
    const triggerLine = window.innerHeight * 0.85;

    cards.forEach((card) => {
      const rect = card.getBoundingClientRect();
      if (rect.top < triggerLine) {
        card.classList.add("visible");
        const isRight = card.classList.contains("side-right");
        card.style.transition = "opacity 0.6s ease, transform 0.6s ease";
        card.style.transform = `translateX(${isRight ? "40px" : "-40px"})`;
        card.style.opacity = "0";
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            card.style.transform = "translateX(0)";
            card.style.opacity = "1";
          });
        });
      }
    });
  }

  let ticking = false;
  window.addEventListener("scroll", () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        updateOnScroll();
        ticking = false;
      });
      ticking = true;
    }
  });

  // ── SVG Tree Trunk & Branches ──────────────────────────

  const treeSvg = document.getElementById("tree-svg");

  function drawTree() {
    const defs = treeSvg.querySelector("defs");
    while (treeSvg.lastChild && treeSvg.lastChild !== defs) {
      treeSvg.removeChild(treeSvg.lastChild);
    }

    const contentEl = document.querySelector(".tree-content");
    const contentRect = contentEl.getBoundingClientRect();
    const svgW = contentRect.width;
    const svgH = contentEl.scrollHeight;

    treeSvg.setAttribute("width", svgW);
    treeSvg.setAttribute("height", svgH);
    treeSvg.setAttribute("viewBox", `0 0 ${svgW} ${svgH}`);

    const centerX = svgW / 2;

    const trunk = document.createElementNS("http://www.w3.org/2000/svg", "line");
    trunk.setAttribute("x1", centerX);
    trunk.setAttribute("y1", 200);
    trunk.setAttribute("x2", centerX);
    trunk.setAttribute("y2", svgH - 100);
    trunk.setAttribute("stroke", "#C6A664");
    trunk.setAttribute("stroke-width", "2");
    trunk.setAttribute("opacity", "0.25");
    trunk.setAttribute("stroke-dasharray", "8 8");
    treeSvg.appendChild(trunk);

    function getOffsetTo(el, ancestor) {
      let top = 0, left = 0;
      while (el && el !== ancestor) {
        top += el.offsetTop;
        left += el.offsetLeft;
        el = el.offsetParent;
      }
      return { top, left };
    }

    const cards = document.querySelectorAll(".person-card");
    cards.forEach((card) => {
      const off = getOffsetTo(card, contentEl);
      const cardCenterY = off.top + card.offsetHeight / 2;
      const cardCenterX = off.left + card.offsetWidth / 2;

      const branchLine = document.createElementNS("http://www.w3.org/2000/svg", "path");
      const isRight = card.classList.contains("side-right");

      const cpOffset = 30 + Math.random() * 20;
      const startX = centerX;
      const endX = cardCenterX;
      const y = cardCenterY;

      const d = isRight
        ? `M ${startX} ${y} C ${startX - cpOffset} ${y - 10}, ${endX + cpOffset} ${y + 10}, ${endX} ${y}`
        : `M ${startX} ${y} C ${startX + cpOffset} ${y - 10}, ${endX - cpOffset} ${y + 10}, ${endX} ${y}`;

      branchLine.setAttribute("d", d);
      branchLine.setAttribute("stroke", "#C6A664");
      branchLine.setAttribute("stroke-width", "1.5");
      branchLine.setAttribute("fill", "none");
      branchLine.setAttribute("opacity", "0.2");
      treeSvg.appendChild(branchLine);
    });
  }

  window.addEventListener("resize", () => setTimeout(drawTree, 100));

  // ── Detail Panel ───────────────────────────────────────

  const detailPanel = document.getElementById("detail-panel");
  const detailBackdrop = document.getElementById("detail-backdrop");
  const detailClose = document.getElementById("detail-close");

  function openDetail(era, person) {
    currentDetailEra = era;
    currentDetailPerson = person;

    document.getElementById("detail-name-he").textContent = person.nameHe;
    document.getElementById("detail-name-en").textContent = person.nameEn;

    const bStr = person.birthYear != null ? person.birthYear : "?";
    const dStr = person.deathYear != null ? person.deathYear : "?";
    document.getElementById("detail-years-he").textContent = bStr + " – " + dStr;
    document.getElementById("detail-years-ce").textContent = hebrewToCE(person.birthYear) + " – " + hebrewToCE(person.deathYear);

    const badgeEl = document.getElementById("detail-badge");
    if (person.title) {
      const bc = getBadgeClass(person.title);
      badgeEl.innerHTML = `<span class="card-badge ${bc}">${person.title}</span>`;
    } else {
      badgeEl.innerHTML = "";
    }

    document.getElementById("detail-avatar").innerHTML = personAvatarSVG();

    const summaryPane = document.getElementById("tab-summary");
    summaryPane.innerHTML = person.summary
      ? `<p>${person.summary}</p>`
      : `<p class="tab-placeholder">תוכן הסיכום יתמלא בהמשך...</p>`;

    const midrashPane = document.getElementById("tab-midrash");
    midrashPane.innerHTML = person.midrash
      ? `<p>${person.midrash}</p>`
      : `<p class="tab-placeholder">תוכן המדרש יתמלא בהמשך...</p>`;

    const sourcesPane = document.getElementById("tab-sources");
    sourcesPane.innerHTML = person.sources
      ? `<p>${person.sources}</p>`
      : `<p class="tab-placeholder">מקורות יתמלאו בהמשך...</p>`;

    const notesList = document.getElementById("notes-list");
    const notesPlaceholder = document.getElementById("notes-placeholder");
    notesList.innerHTML = '';
    if (person.notes && person.notes.length > 0) {
      notesPlaceholder.style.display = 'none';
      person.notes.forEach(n => {
        const div = document.createElement("div");
        div.className = "note-item";
        div.innerHTML = `<p class="note-text">${n.text}</p>
          <span class="note-meta">${n.author || 'אנונימי'}</span>`;
        notesList.appendChild(div);
      });
    } else {
      notesPlaceholder.style.display = '';
    }

    document.querySelectorAll(".detail-tab").forEach((t) => t.classList.remove("active"));
    document.querySelectorAll(".tab-pane").forEach((p) => p.classList.remove("active"));
    document.querySelector('.detail-tab[data-tab="summary"]').classList.add("active");
    summaryPane.classList.add("active");

    prefillContributeForm(person);
    updateContributeVisibility();

    detailBackdrop.classList.add("open");
    detailPanel.classList.add("open");
    document.body.style.overflow = "hidden";
  }

  function closeDetail() {
    detailPanel.classList.remove("open");
    detailBackdrop.classList.remove("open");
    document.body.style.overflow = "";
    currentDetailEra = null;
    currentDetailPerson = null;
  }

  detailClose.addEventListener("click", closeDetail);
  detailBackdrop.addEventListener("click", closeDetail);

  document.querySelectorAll(".detail-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".detail-tab").forEach((t) => t.classList.remove("active"));
      document.querySelectorAll(".tab-pane").forEach((p) => p.classList.remove("active"));
      tab.classList.add("active");
      document.getElementById("tab-" + tab.dataset.tab).classList.add("active");
    });
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (searchOverlay.classList.contains("open")) closeSearch();
      else if (detailPanel.classList.contains("open")) closeDetail();
    }
  });

  // ── Contribute Form ────────────────────────────────────

  const contribTabs = document.querySelectorAll(".contrib-tab");
  const contribPanes = document.querySelectorAll(".contrib-pane");
  let activeContribType = "edit_person";

  contribTabs.forEach(tab => {
    tab.addEventListener("click", () => {
      contribTabs.forEach(t => t.classList.remove("active"));
      contribPanes.forEach(p => p.classList.remove("active"));
      tab.classList.add("active");
      activeContribType = tab.dataset.ctype;

      const paneMap = { edit_person: "contrib-edit", add_source: "contrib-source", add_note: "contrib-note" };
      document.getElementById(paneMap[activeContribType]).classList.add("active");
    });
  });

  function prefillContributeForm(person) {
    document.getElementById("contrib-summary").value = person.summary || '';
    document.getElementById("contrib-midrash").value = person.midrash || '';
    document.getElementById("contrib-title").value = person.title || '';
    document.getElementById("contrib-source-text").value = '';
    document.getElementById("contrib-note-text").value = '';
    document.getElementById("contrib-status").textContent = '';

    contribTabs.forEach(t => t.classList.remove("active"));
    contribPanes.forEach(p => p.classList.remove("active"));
    contribTabs[0].classList.add("active");
    document.getElementById("contrib-edit").classList.add("active");
    activeContribType = "edit_person";
  }

  document.getElementById("contrib-submit").addEventListener("click", async () => {
    if (!auth.isLoggedIn() || !currentDetailPerson || !currentDetailEra) return;

    const statusEl = document.getElementById("contrib-status");
    const btn = document.getElementById("contrib-submit");
    btn.disabled = true;
    statusEl.textContent = "שולח...";
    statusEl.className = "contrib-status";

    try {
      if (activeContribType === "edit_person") {
        const changes = {};
        const summaryVal = document.getElementById("contrib-summary").value.trim();
        const midrashVal = document.getElementById("contrib-midrash").value.trim();
        const titleVal = document.getElementById("contrib-title").value.trim();

        if (summaryVal !== (currentDetailPerson.summary || '')) changes.summary = summaryVal;
        if (midrashVal !== (currentDetailPerson.midrash || '')) changes.midrash = midrashVal;
        if (titleVal !== (currentDetailPerson.title || '')) changes.title = titleVal;

        if (Object.keys(changes).length === 0) {
          statusEl.textContent = "לא בוצעו שינויים";
          statusEl.className = "contrib-status warn";
          btn.disabled = false;
          return;
        }
        await subs.submitEditPerson(currentDetailEra.id, currentDetailPerson.id, changes);
      } else if (activeContribType === "add_source") {
        const src = document.getElementById("contrib-source-text").value.trim();
        if (!src) { statusEl.textContent = "יש למלא מקור"; statusEl.className = "contrib-status warn"; btn.disabled = false; return; }
        await subs.submitSource(currentDetailEra.id, currentDetailPerson.id, src);
      } else if (activeContribType === "add_note") {
        const note = document.getElementById("contrib-note-text").value.trim();
        if (!note) { statusEl.textContent = "יש למלא הערה"; statusEl.className = "contrib-status warn"; btn.disabled = false; return; }
        await subs.submitNote(currentDetailEra.id, currentDetailPerson.id, note);
      }

      statusEl.textContent = "נשלח בהצלחה! ממתין לאישור מנהל.";
      statusEl.className = "contrib-status success";
    } catch (err) {
      console.error("Submit error:", err);
      statusEl.textContent = "שגיאה בשליחה: " + (err.message || err);
      statusEl.className = "contrib-status error";
    } finally {
      btn.disabled = false;
    }
  });

  // ── Search ─────────────────────────────────────────────

  const searchToggle = document.getElementById("search-toggle");
  const searchOverlay = document.getElementById("search-overlay");
  const searchInput = document.getElementById("search-input");
  const searchResults = document.getElementById("search-results");
  const searchCloseBtn = document.getElementById("search-close");

  let allPersonsFlat = [];

  function rebuildSearchIndex() {
    allPersonsFlat = [];
    ERAS.forEach((era, eraIdx) => {
      era.persons.forEach((p, pIdx) => {
        allPersonsFlat.push({ ...p, eraIdx, pIdx, era });
      });
    });
  }

  function openSearch() {
    searchOverlay.classList.add("open");
    searchInput.value = "";
    searchResults.innerHTML = "";
    setTimeout(() => searchInput.focus(), 100);
    document.body.style.overflow = "hidden";
  }

  function closeSearch() {
    searchOverlay.classList.remove("open");
    document.body.style.overflow = "";
  }

  searchToggle.addEventListener("click", openSearch);
  searchCloseBtn.addEventListener("click", closeSearch);

  searchInput.addEventListener("input", () => {
    const q = searchInput.value.trim().toLowerCase();
    searchResults.innerHTML = "";
    if (q.length < 2) return;

    const matches = allPersonsFlat.filter(
      (p) => p.nameHe.includes(q) || p.nameEn.toLowerCase().includes(q)
    ).slice(0, 20);

    matches.forEach((p) => {
      const item = document.createElement("div");
      item.className = "search-result-item";
      const yStr = (p.birthYear || "?") + " – " + (p.deathYear || "?");
      item.innerHTML = `
        <span class="search-result-name">${p.nameHe}</span>
        <span class="search-result-years">${yStr}</span>
      `;
      item.addEventListener("click", () => {
        closeSearch();
        const cardEl = document.querySelector(`.person-card[data-era-idx="${p.eraIdx}"][data-person-idx="${p.pIdx}"]`);
        if (cardEl) {
          cardEl.scrollIntoView({ behavior: "smooth", block: "center" });
          cardEl.classList.add("visible");
          setTimeout(() => {
            cardEl.classList.add("highlight");
            setTimeout(() => cardEl.classList.remove("highlight"), 2200);
          }, 600);
        }
      });
      searchResults.appendChild(item);
    });
  });

  // ── Init: Auth + Merge Approved Content + Render ───────

  async function initApp() {
    try {
      await auth.init();
    } catch (e) {
      console.warn("Auth init skipped (Supabase may not be configured):", e.message);
    }

    try {
      const approved = await subs.fetchApprovedContent();
      if (approved.length > 0) {
        subs.mergeApprovedIntoEras(ERAS, approved);
      }
    } catch (e) {
      console.warn("Could not fetch approved content:", e.message);
    }

    auth.onChange(updateAuthUI);
    updateAuthUI(auth.currentUser, auth.currentProfile);

    renderEras();
    rebuildSearchIndex();
  }

  initApp();
})();
