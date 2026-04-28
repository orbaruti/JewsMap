(function () {
  "use strict";

  const ERAS = window.ERAS_DATA;
  const auth = window.JewsMapAuth;
  const subs = window.JewsMapSubmissions;

  let currentDetailEra = null;
  let currentDetailPerson = null;

  // ── Theme ──────────────────────────────────────────────

  function initTheme() {
    const saved = localStorage.getItem("seder-hadorot-theme");
    if (saved) {
      document.documentElement.setAttribute("data-theme", saved);
    } else if (window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches) {
      document.documentElement.setAttribute("data-theme", "light");
    }
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute("data-theme") || "dark";
    const next = current === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("seder-hadorot-theme", next);
    setTimeout(drawTree, 100);
  }

  initTheme();

  const themeToggleBtn = document.getElementById("theme-toggle");
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener("click", toggleTheme);
  }

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

  // ── Family Helpers ─────────────────────────────────────

  let personIndex = null;

  function buildPersonIndex() {
    personIndex = {};
    ERAS.forEach(era => {
      era.persons.forEach(person => {
        if (!personIndex[person.id]) {
          personIndex[person.id] = { person, era };
        }
      });
    });
  }

  function findPersonById(id) {
    if (!id) return null;
    if (!personIndex) buildPersonIndex();
    return personIndex[id] || null;
  }

  function getChildren(personId) {
    if (!personIndex) buildPersonIndex();
    const results = [];
    const seen = new Set();
    ERAS.forEach(era => {
      era.persons.forEach(p => {
        if ((p.fatherId === personId || p.motherId === personId) && !seen.has(p.id)) {
          seen.add(p.id);
          results.push({ person: p, era });
        }
      });
    });
    return results;
  }

  function getSpouses(personId) {
    const entry = findPersonById(personId);
    if (!entry || !entry.person.spouseIds) return [];
    return entry.person.spouseIds.map(sid => findPersonById(sid)).filter(Boolean);
  }

  function getSiblings(personId) {
    const entry = findPersonById(personId);
    if (!entry || !entry.person.fatherId) return [];
    const results = [];
    ERAS.forEach(era => {
      era.persons.forEach(p => {
        if (p.fatherId === entry.person.fatherId && p.id !== personId) {
          results.push({ person: p, era });
        }
      });
    });
    return results;
  }

  // ── Auth UI ─────────────────────────────────────────────

  const authBtn = document.getElementById("auth-btn");
  const authLabel = document.getElementById("auth-label");
  const authMenu = document.getElementById("auth-menu");
  const authUserInfo = document.getElementById("auth-user-info");
  const adminLink = document.getElementById("admin-link");
  const signoutBtn = document.getElementById("signout-btn");
  const contributeSection = document.getElementById("contribute-section");
  const detailView = document.getElementById("detail-view");
  const editToggleBtn = document.getElementById("edit-toggle-btn");
  const editCancelBtn = document.getElementById("edit-cancel-btn");
  const addPersonToggle = document.getElementById("add-person-toggle");

  let authMenuOpen = false;
  let editMode = false;

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
    updateEditToggleVisibility();
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

  function updateEditToggleVisibility() {
    editToggleBtn.style.display = auth.isLoggedIn() ? '' : 'none';
    addPersonToggle.style.display = auth.isLoggedIn() ? '' : 'none';
  }

  function enterEditMode() {
    editMode = true;
    detailView.style.display = 'none';
    contributeSection.style.display = '';
    editToggleBtn.style.display = 'none';
    if (currentDetailPerson) prefillContributeForm(currentDetailPerson);
  }

  function exitEditMode() {
    editMode = false;
    detailView.style.display = '';
    contributeSection.style.display = 'none';
    updateEditToggleVisibility();
    document.getElementById("contrib-status").textContent = '';
  }

  editToggleBtn.addEventListener("click", enterEditMode);
  editCancelBtn.addEventListener("click", exitEditMode);

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
        card.setAttribute("data-testid", "person-card");
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

        let lineageHTML = "";
        if (person.fatherId) {
          const father = findPersonById(person.fatherId);
          if (father) {
            lineageHTML = `<div class="card-lineage">בן ${father.person.nameHe}</div>`;
          }
        }

        card.innerHTML = `
          <div class="card-avatar">${personAvatarSVG()}</div>
          <div class="card-name">${person.nameHe}</div>
          ${lineageHTML}
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
      dot.setAttribute("data-testid", "era-dot");
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

    updateMobileNav(activeEraIdx);
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
    const style = getComputedStyle(document.documentElement);
    const goldColor = style.getPropertyValue("--gold").trim() || "#D4B896";

    const trunk = document.createElementNS("http://www.w3.org/2000/svg", "line");
    trunk.setAttribute("x1", centerX);
    trunk.setAttribute("y1", 200);
    trunk.setAttribute("x2", centerX);
    trunk.setAttribute("y2", svgH - 100);
    trunk.setAttribute("stroke", goldColor);
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
      branchLine.setAttribute("stroke", goldColor);
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

    renderFamilyConnections(person);

    const summaryPane = document.getElementById("tab-summary");
    summaryPane.innerHTML = person.summary
      ? `<p data-testid="detail-summary">${person.summary}</p>`
      : emptyStateHTML("summary", person);

    renderMidrashTab(person);

    const sourcesPane = document.getElementById("tab-sources");
    sourcesPane.innerHTML = person.sources
      ? `<p>${person.sources}</p>`
      : emptyStateHTML("sources", person);

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

    document.getElementById("family-tree-container").innerHTML = '';

    renderLifetimeJourney(person);

    document.querySelectorAll(".detail-tab").forEach((t) => t.classList.remove("active"));
    document.querySelectorAll(".tab-pane").forEach((p) => p.classList.remove("active"));
    document.querySelector('.detail-tab[data-tab="summary"]').classList.add("active");
    summaryPane.classList.add("active");

    exitEditMode();
    renderRelatedFigures(person, era);
    updateBookmarkUI();
    showBreadcrumb(person.nameHe);
    wireJourneyLinks(document.getElementById("tab-summary"));

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
    exitEditMode();
    hideBreadcrumb();
  }

  detailClose.addEventListener("click", closeDetail);
  detailBackdrop.addEventListener("click", closeDetail);

  document.querySelectorAll(".detail-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      if (tab.dataset.tab === "family" && currentDetailPerson) {
        const person = currentDetailPerson;
        closeDetail();
        ftreeHistory = [];
        openFamilyTreeWindow(person, false);
        return;
      }

      document.querySelectorAll(".detail-tab").forEach((t) => t.classList.remove("active"));
      document.querySelectorAll(".tab-pane").forEach((p) => p.classList.remove("active"));
      tab.classList.add("active");
      document.getElementById("tab-" + tab.dataset.tab).classList.add("active");
    });
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (ftreeWindow.classList.contains("open")) closeFamilyTreeWindow();
      else if (apModal.classList.contains("open")) closeAddPersonModal();
      else if (searchOverlay.classList.contains("open")) closeSearch();
      else if (detailPanel.classList.contains("open")) closeDetail();
    }
  });

  // ── Lifetime journey (מסע חיים) — optional curated beats per person ──

  function getLifetimeJourneyForPerson(person) {
    if (!person) return null;
    const direct = person.lifetimeJourney;
    if (direct && direct.length) return direct;
    const entry = findPersonById(person.id);
    if (entry && entry.person.lifetimeJourney && entry.person.lifetimeJourney.length) {
      return entry.person.lifetimeJourney;
    }
    return null;
  }

  function journeySourceBadgeClass(layer) {
    if (layer === "midrash") return "journey-source-midrash";
    if (layer === "tanach") return "journey-source-tanach";
    if (layer === "chazal") return "journey-source-chazal";
    return "journey-source-default";
  }

  function journeySourceLabel(layer) {
    if (layer === "midrash") return "מדרש";
    if (layer === "tanach") return "תנ״ך";
    if (layer === "chazal") return "חז״ל";
    return layer || "";
  }

  function buildJourneyBeatHTML(beat) {
    const year = beat.year != null ? `<span class="journey-year">שנת ${beat.year}</span>` : "";
    const badge = beat.sourceLayer
      ? `<span class="journey-source-badge ${journeySourceBadgeClass(beat.sourceLayer)}">${journeySourceLabel(beat.sourceLayer)}</span>`
      : "";
    const chips = (beat.relatedPersonIds || [])
      .map((id) => {
        const e = findPersonById(id);
        if (!e) return "";
        return `<button type="button" class="journey-chip journey-link" data-person-id="${id}">${e.person.nameHe}</button>`;
      })
      .filter(Boolean)
      .join("");
    const chipsBlock = chips ? `<div class="journey-chips">${chips}</div>` : "";
    const workBlock = beat.workHe
      ? `<p class="journey-beat-work">${beat.workHe}</p>`
      : "";
    const sourceBlock = beat.source
      ? `<p class="journey-beat-source"><span class="journey-source-label">מקור:</span> ${beat.source}</p>`
      : "";
    return `
      <li class="journey-beat">
        <div class="journey-beat-top">
          <h4 class="journey-beat-title">${beat.titleHe}</h4>
          ${year} ${badge}
        </div>
        <p class="journey-beat-text">${beat.summaryHe}</p>
        ${workBlock}
        ${sourceBlock}
        ${chipsBlock}
      </li>`;
  }

  function wireJourneyLinks(containerEl) {
    if (!containerEl) return;
    containerEl.querySelectorAll(".journey-link").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        const id = btn.dataset.personId;
        const ent = findPersonById(id);
        if (ent) openDetail(ent.era, ent.person);
      });
    });
  }

  function renderLifetimeJourney(person) {
    const journeyEl = document.getElementById("tab-journey");
    const beats = getLifetimeJourneyForPerson(person);
    if (!beats || !beats.length) {
      journeyEl.innerHTML = emptyStateHTML("journey", person);
      return;
    }

    const title = `<header class="journey-heading"><h3 class="journey-title">מסע חיים</h3><p class="journey-sub">נקודות בולטות בחייו של ${person.nameHe} — מקורות: תנ״ך / מסורת.</p></header>`;
    const items = beats.map((b) => buildJourneyBeatHTML(b)).join("");
    journeyEl.innerHTML = `${title}<ol class="journey-timeline">${items}</ol>`;
    wireJourneyLinks(journeyEl);
  }

  function getMidrashJourneyForPerson(person) {
    if (!person) return null;
    if (person.midrashJourney && person.midrashJourney.length) return person.midrashJourney;
    const entry = findPersonById(person.id);
    if (entry && entry.person.midrashJourney && entry.person.midrashJourney.length) {
      return entry.person.midrashJourney;
    }
    return null;
  }

  function renderMidrashTab(person) {
    const midrashEl = document.getElementById("tab-midrash");
    const beats = getMidrashJourneyForPerson(person);
    if (beats && beats.length) {
      const title = `<header class="journey-heading"><h3 class="journey-title">מדרש — כרטיסים</h3><p class="journey-sub">מדרש ואגדה הקשורים ל${person.nameHe} — לפי חיבורים ומקורות במסורת.</p></header>`;
      const items = beats.map((b) => buildJourneyBeatHTML(b)).join("");
      midrashEl.innerHTML = `${title}<ol class="journey-timeline journey-timeline--midrash">${items}</ol>`;
      wireJourneyLinks(midrashEl);
      return;
    }
    const entry = findPersonById(person.id);
    const legacy = ((person.midrash || entry?.person?.midrash || "").trim());
    if (legacy) {
      const syn = {
        titleHe: "מדרש",
        summaryHe: legacy,
        sourceLayer: "chazal",
        source: "",
        relatedPersonIds: [],
      };
      const title = `<header class="journey-heading"><h3 class="journey-title">מדרש</h3><p class="journey-sub">טקסט מדרשי שמור בפרופיל (לפני מעבר לכרטיסים מסודרים).</p></header>`;
      midrashEl.innerHTML = `${title}<ol class="journey-timeline journey-timeline--midrash">${buildJourneyBeatHTML(syn)}</ol>`;
      wireJourneyLinks(midrashEl);
      return;
    }
    midrashEl.innerHTML = emptyStateHTML("midrash", person);
  }

  // ── Family Connections Section ─────────────────────────

  function renderFamilyConnections(person) {
    const container = document.getElementById("family-connections");
    container.innerHTML = '';
    container.classList.remove("has-family");

    const rows = [];

    if (person.fatherId) {
      const f = findPersonById(person.fatherId);
      if (f) rows.push({ label: "אב", entries: [f] });
    }
    if (person.motherId) {
      const m = findPersonById(person.motherId);
      if (m) rows.push({ label: "אם", entries: [m] });
    }
    if (person.spouseIds && person.spouseIds.length > 0) {
      const spouses = person.spouseIds.map(sid => findPersonById(sid)).filter(Boolean);
      if (spouses.length > 0) rows.push({ label: "בן/בת זוג", entries: spouses });
    }

    const children = getChildren(person.id);
    if (children.length > 0) {
      rows.push({ label: "ילדים", entries: children });
    }

    if (rows.length === 0) return;

    container.classList.add("has-family");

    rows.forEach(row => {
      const div = document.createElement("div");
      div.className = "family-conn-row";
      let html = `<span class="family-conn-label">${row.label}:</span>`;
      row.entries.forEach((entry, i) => {
        if (i > 0) html += `<span class="family-conn-sep">،</span>`;
        html += `<span class="family-conn-link" data-person-id="${entry.person.id}">${entry.person.nameHe}</span>`;
      });
      div.innerHTML = html;
      container.appendChild(div);
    });

    container.querySelectorAll(".family-conn-link").forEach(link => {
      link.addEventListener("click", () => {
        const pid = link.dataset.personId;
        const entry = findPersonById(pid);
        if (entry) openDetail(entry.era, entry.person);
      });
    });
  }

  // ── Family Tree Renderer (D3) ──────────────────────────

  function renderFamilyTree(person, opts) {
    const container = (opts && opts.container) || document.getElementById("family-tree-container");
    const onNodeClick = (opts && opts.onNodeClick) || null;
    container.innerHTML = '';

    const treeData = buildFamilyTreeData(person);
    const hasAnyRelation =
      !!(person.fatherId || person.motherId || (person.spouseIds && person.spouseIds.length) || getChildren(person.id).length);
    if (!treeData || !hasAnyRelation) {
      container.innerHTML = '<div class="ftree-no-data">אין נתוני משפחה זמינים</div>';
      return;
    }

    const nodeW = 120, nodeH = 44, marginX = 20, marginY = 60;

    const root = d3.hierarchy(treeData);
    const treeLayout = d3.tree().nodeSize([nodeW + marginX, nodeH + marginY]);
    treeLayout(root);

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    root.each(d => {
      if (d.x < minX) minX = d.x;
      if (d.x > maxX) maxX = d.x;
      if (d.y < minY) minY = d.y;
      if (d.y > maxY) maxY = d.y;
    });

    const padX = 30, padY = 30;
    const width = (maxX - minX) + nodeW + padX * 2;
    const height = (maxY - minY) + nodeH + padY * 2;
    const offsetX = -minX + nodeW / 2 + padX;
    const offsetY = -minY + padY;

    const svg = d3.select(container).append("svg")
      .attr("width", Math.max(width, 300))
      .attr("height", Math.max(height, 200))
      .attr("viewBox", `0 0 ${Math.max(width, 300)} ${Math.max(height, 200)}`);

    const g = svg.append("g")
      .attr("transform", `translate(${offsetX}, ${offsetY})`);

    g.selectAll(".ftree-link")
      .data(root.links().filter((l) => {
        const t = l.target.data;
        return t._personId != null || t._isDummyRoot === true;
      }))
      .join("path")
      .attr("class", (d) => {
        // Only true spouse nodes use dashed “marriage” strokes. Links from a marriage
        // dummy to the blood-line parent (e.g. union→אברהם, זוג→יצחק) stay solid so
        // דורות לא נראים כמו בן/בת זוג של אותו הורה.
        if (d.target.data._isSpouse) return "ftree-link ftree-link-spouse";
        return "ftree-link";
      })
      .attr("d", d => {
        const sx = d.source.x, sy = d.source.y + nodeH / 2;
        const tx = d.target.x, ty = d.target.y - nodeH / 2;
        const midY = (sy + ty) / 2;
        return `M${sx},${sy} C${sx},${midY} ${tx},${midY} ${tx},${ty}`;
      });

    const nodes = g.selectAll(".ftree-node")
      .data(root.descendants().filter((d) => d.data._personId != null))
      .join("g")
      .attr("class", d =>
        "ftree-node" +
        (d.data._isCurrent ? " ftree-current" : "") +
        (d.data._isSpouse ? " ftree-spouse" : "")
      )
      .attr("transform", d => `translate(${d.x - nodeW / 2}, ${d.y - nodeH / 2})`)
      .style("cursor", "pointer")
      .on("click", (event, d) => {
        if (!d.data._personId) return;
        const entry = findPersonById(d.data._personId);
        if (!entry) return;
        if (onNodeClick) {
          onNodeClick(entry);
        } else {
          openDetail(entry.era, entry.person);
        }
      });

    nodes.append("rect")
      .attr("width", nodeW)
      .attr("height", nodeH)
      .attr("rx", 8)
      .attr("ry", 8);

    nodes.append("text")
      .attr("x", nodeW / 2)
      .attr("y", nodeH / 2 - 4)
      .text(d => d.data.name || "");

    nodes.append("text")
      .attr("class", "ftree-years")
      .attr("x", nodeW / 2)
      .attr("y", nodeH / 2 + 10)
      .text(d => d.data._years || "");
  }

  // Recursively attach up to N generations of children (N=3: children, grandchildren, great-grandchildren).
  function addDescendantGenerations(pNode, p, maxGenerations) {
    if (maxGenerations <= 0) return;
    const kids = getChildren(p.id);
    if (kids.length === 0) return;
    pNode.children = kids.map((k) => {
      const n = personToNode(k.person, false);
      addDescendantGenerations(n, k.person, maxGenerations - 1);
      return n;
    });
  }

  function buildSpouseNodesForTree(person) {
    const out = [];
    (person.spouseIds || []).forEach((sid) => {
      if (!sid) return;
      if (person.motherId && sid === person.motherId) return;
      const e = findPersonById(sid);
      if (!e) return;
      const n = personToNode(e.person, false);
      n._isSpouse = true;
      out.push(n);
    });
    return out;
  }

  function marriageDummyRoot(children) {
    return {
      name: "",
      _personId: null,
      _years: "",
      _isDummyRoot: true,
      children: children
    };
  }

  /** All persons sharing the same parent links as `person` (for one tree generation under a couple). */
  function getFullSiblingEntries(person) {
    const fid = person.fatherId;
    const mid = person.motherId;
    const seen = new Set();
    const out = [];
    ERAS.forEach((era) => {
      era.persons.forEach((p) => {
        let match = false;
        if (fid && mid) match = p.fatherId === fid && p.motherId === mid;
        else if (fid) match = p.fatherId === fid;
        else if (mid) match = p.motherId === mid;
        if (!match) return;
        if (seen.has(p.id)) return;
        seen.add(p.id);
        out.push({ person: p, era });
      });
    });
    out.sort((a, b) => (a.person.birthYear || 0) - (b.person.birthYear || 0));
    return out;
  }

  /** Wrap a person node with their own spouses (marriage bar), not as extra “children” of the parents. */
  function branchWithOwnSpouses(focusPerson, p, node, isFocus, focusSpouseNodes) {
    const spouses = isFocus ? focusSpouseNodes : buildSpouseNodesForTree(p);
    if (!spouses.length) return node;
    return marriageDummyRoot([node, ...spouses]);
  }

  function buildFamilyTreeData(person) {
    // One generation above (parents), three below (children through great-grandchildren).
    const currentNode = personToNode(person, true);
    addDescendantGenerations(currentNode, person, 3);

    const spouseNodes = buildSpouseNodesForTree(person);

    let motherNode = null;
    if (person.motherId) {
      const motherEntry = findPersonById(person.motherId);
      if (motherEntry) {
        motherNode = personToNode(motherEntry.person, false);
        motherNode._isSpouse = true;
      }
    }

    let bottomNode = currentNode;

    if (person.fatherId) {
      const fatherEntry = findPersonById(person.fatherId);
      if (fatherEntry) {
        const fatherNode = personToNode(fatherEntry.person, false);

        if (motherNode) {
          // Parents are a couple (dummy root); children hang from father only so the graph stays a tree.
          const parentUnion = marriageDummyRoot([fatherNode, motherNode]);
          const siblingEntries = getFullSiblingEntries(person);
          fatherNode.children = siblingEntries.map(({ person: sp }) => {
            const isFocus = sp.id === person.id;
            const sn = isFocus
              ? currentNode
              : (() => {
                  const n = personToNode(sp, false);
                  addDescendantGenerations(n, sp, 3);
                  return n;
                })();
            return branchWithOwnSpouses(person, sp, sn, isFocus, spouseNodes);
          });
          bottomNode = parentUnion;
        } else {
          const siblingEntries = getFullSiblingEntries(person);
          if (siblingEntries.length > 1) {
            fatherNode.children = siblingEntries.map(({ person: sp }) => {
              const isFocus = sp.id === person.id;
              const sn = isFocus
                ? currentNode
                : (() => {
                    const n = personToNode(sp, false);
                    addDescendantGenerations(n, sp, 3);
                    return n;
                  })();
              return branchWithOwnSpouses(person, sp, sn, isFocus, spouseNodes);
            });
          } else {
            fatherNode.children = [branchWithOwnSpouses(person, person, currentNode, true, spouseNodes)];
          }
          bottomNode = fatherNode;
        }
      } else {
        if (motherNode) {
          motherNode.children = [branchWithOwnSpouses(person, person, currentNode, true, spouseNodes)];
          bottomNode = motherNode;
        } else if (spouseNodes.length) {
          bottomNode = marriageDummyRoot([currentNode, ...spouseNodes]);
        }
      }
    } else if (motherNode) {
      motherNode.children = [branchWithOwnSpouses(person, person, currentNode, true, spouseNodes)];
      bottomNode = motherNode;
    } else if (spouseNodes.length) {
      bottomNode = marriageDummyRoot([currentNode, ...spouseNodes]);
    }

    return bottomNode;
  }

  function personToNode(person, isCurrent) {
    const bStr = person.birthYear != null ? person.birthYear : "?";
    const dStr = person.deathYear != null ? person.deathYear : "?";
    return {
      name: person.nameHe,
      _personId: person.id,
      _years: bStr + "–" + dStr,
      _isCurrent: !!isCurrent
    };
  }

  // ── Floating Family Tree Window ────────────────────────

  const ftreeWindow = document.getElementById("ftree-window");
  const ftreeWindowBody = document.getElementById("ftree-window-body");
  const ftreeWindowTitle = document.getElementById("ftree-window-title");
  const ftreeWindowClose = document.getElementById("ftree-window-close");
  const ftreeWindowBack = document.getElementById("ftree-window-back");
  const ftreeWindowHeader = document.getElementById("ftree-window-header");

  let ftreeHistory = [];

  function openFamilyTreeWindow(person, pushHistory) {
    if (pushHistory !== false && ftreeWindow.classList.contains("open")) {
      const prevId = ftreeWindowBody.dataset.currentPersonId;
      if (prevId) ftreeHistory.push(prevId);
    }

    ftreeWindowTitle.textContent = "עץ משפחה — " + person.nameHe;
    ftreeWindowBody.dataset.currentPersonId = person.id;
    ftreeWindowBack.disabled = ftreeHistory.length === 0;

    renderFamilyTree(person, {
      container: ftreeWindowBody,
      onNodeClick: function (entry) {
        openFamilyTreeWindow(entry.person, true);
      }
    });

    if (!ftreeWindow.classList.contains("open")) {
      ftreeWindow.classList.add("open");
    }
  }

  function closeFamilyTreeWindow() {
    ftreeWindow.classList.remove("open");
    ftreeWindowBody.innerHTML = '';
    ftreeWindowBody.dataset.currentPersonId = '';
    ftreeHistory = [];
    ftreeWindowBack.disabled = true;
  }

  ftreeWindowClose.addEventListener("click", closeFamilyTreeWindow);

  ftreeWindowBack.addEventListener("click", function () {
    if (ftreeHistory.length === 0) return;
    const prevId = ftreeHistory.pop();
    const entry = findPersonById(prevId);
    if (entry) {
      openFamilyTreeWindow(entry.person, false);
    }
  });

  // Drag support for the floating window
  (function initFtreeDrag() {
    let dragging = false, startX = 0, startY = 0, origLeft = 0, origTop = 0;

    ftreeWindowHeader.addEventListener("mousedown", onDragStart);
    ftreeWindowHeader.addEventListener("touchstart", onDragStart, { passive: false });

    function onDragStart(e) {
      if (e.target.closest("button")) return;
      dragging = true;

      const rect = ftreeWindow.getBoundingClientRect();
      ftreeWindow.style.left = rect.left + "px";
      ftreeWindow.style.top = rect.top + "px";
      ftreeWindow.style.transform = "none";

      origLeft = rect.left;
      origTop = rect.top;

      if (e.type === "touchstart") {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
      } else {
        startX = e.clientX;
        startY = e.clientY;
      }

      document.addEventListener("mousemove", onDragMove);
      document.addEventListener("mouseup", onDragEnd);
      document.addEventListener("touchmove", onDragMove, { passive: false });
      document.addEventListener("touchend", onDragEnd);
    }

    function onDragMove(e) {
      if (!dragging) return;
      e.preventDefault();
      let cx, cy;
      if (e.type === "touchmove") {
        cx = e.touches[0].clientX;
        cy = e.touches[0].clientY;
      } else {
        cx = e.clientX;
        cy = e.clientY;
      }
      ftreeWindow.style.left = (origLeft + cx - startX) + "px";
      ftreeWindow.style.top = (origTop + cy - startY) + "px";
    }

    function onDragEnd() {
      dragging = false;
      document.removeEventListener("mousemove", onDragMove);
      document.removeEventListener("mouseup", onDragEnd);
      document.removeEventListener("touchmove", onDragMove);
      document.removeEventListener("touchend", onDragEnd);
    }
  })();

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
      setTimeout(() => exitEditMode(), 1500);
    } catch (err) {
      console.error("Submit error:", err);
      statusEl.textContent = "שגיאה בשליחה: " + (err.message || err);
      statusEl.className = "contrib-status error";
    } finally {
      btn.disabled = false;
    }
  });

  // ── Add Person Modal ───────────────────────────────────

  const apModal = document.getElementById("add-person-modal");
  const apBackdrop = document.getElementById("add-person-backdrop");
  const apCloseBtn = document.getElementById("add-person-close");
  const apSubmitBtn = document.getElementById("ap-submit");
  const apStatusEl = document.getElementById("ap-status");
  const apEraSelect = document.getElementById("ap-era");
  const apNameHe = document.getElementById("ap-name-he");
  const apNameEn = document.getElementById("ap-name-en");

  function populateEraDropdown() {
    apEraSelect.innerHTML = '<option value="">בחר תקופה...</option>';
    ERAS.forEach(era => {
      const opt = document.createElement("option");
      opt.value = era.id;
      opt.textContent = era.nameHe;
      apEraSelect.appendChild(opt);
    });
  }

  function openAddPersonModal() {
    populateEraDropdown();
    resetAddPersonForm();
    apBackdrop.classList.add("open");
    apModal.classList.add("open");
    document.body.style.overflow = "hidden";
    setTimeout(() => apNameHe.focus(), 150);
  }

  function closeAddPersonModal() {
    apModal.classList.remove("open");
    apBackdrop.classList.remove("open");
    document.body.style.overflow = "";
  }

  function resetAddPersonForm() {
    apNameHe.value = "";
    apNameEn.value = "";
    apEraSelect.value = "";
    document.getElementById("ap-birth-year").value = "";
    document.getElementById("ap-death-year").value = "";
    document.getElementById("ap-title").value = "";
    document.getElementById("ap-father-id").value = "";
    document.getElementById("ap-mother-id").value = "";
    document.getElementById("ap-spouse-ids").value = "";
    document.getElementById("ap-summary").value = "";
    document.getElementById("ap-midrash").value = "";
    document.getElementById("ap-sources").value = "";
    apStatusEl.textContent = "";
    apStatusEl.className = "add-person-status";
    apSubmitBtn.disabled = true;
    apModal.querySelectorAll(".add-person-input.invalid").forEach(el => el.classList.remove("invalid"));
  }

  function validateAddPersonForm() {
    const nameHe = apNameHe.value.trim();
    const nameEn = apNameEn.value.trim();
    const eraId = apEraSelect.value;
    apSubmitBtn.disabled = !(nameHe && nameEn && eraId);
  }

  addPersonToggle.addEventListener("click", openAddPersonModal);
  apCloseBtn.addEventListener("click", closeAddPersonModal);
  apBackdrop.addEventListener("click", closeAddPersonModal);

  apNameHe.addEventListener("input", validateAddPersonForm);
  apNameEn.addEventListener("input", validateAddPersonForm);
  apEraSelect.addEventListener("change", validateAddPersonForm);

  apSubmitBtn.addEventListener("click", async () => {
    if (!auth.isLoggedIn()) return;

    const nameHe = apNameHe.value.trim();
    const nameEn = apNameEn.value.trim();
    const eraId = apEraSelect.value;

    if (!nameHe || !nameEn || !eraId) return;

    let hasError = false;
    [apNameHe, apNameEn, apEraSelect].forEach(el => {
      if (!el.value.trim()) { el.classList.add("invalid"); hasError = true; }
      else el.classList.remove("invalid");
    });
    if (hasError) return;

    const personId = nameEn.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9\-]/g, "");

    const birthVal = document.getElementById("ap-birth-year").value.trim();
    const deathVal = document.getElementById("ap-death-year").value.trim();
    const fatherVal = document.getElementById("ap-father-id").value.trim();
    const motherVal = document.getElementById("ap-mother-id").value.trim();
    const spousesVal = document.getElementById("ap-spouse-ids").value.trim();

    const personData = {
      id: personId,
      nameHe,
      nameEn,
      birthYear: birthVal ? parseInt(birthVal, 10) : null,
      deathYear: deathVal ? parseInt(deathVal, 10) : null,
      title: document.getElementById("ap-title").value.trim(),
      summary: document.getElementById("ap-summary").value.trim(),
      midrash: document.getElementById("ap-midrash").value.trim(),
      sources: document.getElementById("ap-sources").value.trim(),
      image: null
    };

    if (fatherVal) personData.fatherId = fatherVal;
    if (motherVal) personData.motherId = motherVal;
    if (spousesVal) {
      personData.spouseIds = spousesVal.split(",").map(s => s.trim()).filter(Boolean);
    }

    const eraIdParsed = isNaN(Number(eraId)) ? eraId : Number(eraId);

    const conflict = subs.findNewPersonConflict(ERAS, eraIdParsed, personData);
    if (conflict) {
      if (conflict.kind === 'no_era') {
        apStatusEl.textContent = "תקופה לא נמצאה.";
        apStatusEl.className = "add-person-status error";
        return;
      }
      const label = conflict.kind === 'id' ? 'מזהה (ID)' : 'שם בעברית';
      apStatusEl.textContent =
        `כבר קיים רשומה עם אותו ${label} בתקופה הזו: ${conflict.existing.nameHe} (${conflict.existing.id}).`;
      apStatusEl.className = "add-person-status error";
      return;
    }

    apSubmitBtn.disabled = true;
    apStatusEl.textContent = "שולח...";
    apStatusEl.className = "add-person-status";

    try {
      await subs.submitNewPerson(eraIdParsed, personData);
      apStatusEl.textContent = "נשלח בהצלחה! ממתין לאישור מנהל.";
      apStatusEl.className = "add-person-status success";
      setTimeout(() => closeAddPersonModal(), 1800);
    } catch (err) {
      console.error("Add person error:", err);
      apStatusEl.textContent = "שגיאה בשליחה: " + (err.message || err);
      apStatusEl.className = "add-person-status error";
      apSubmitBtn.disabled = false;
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
    activeSearchFilter = "all";
    buildSearchFilters();
    setTimeout(() => searchInput.focus(), 100);
    document.body.style.overflow = "hidden";
  }

  function closeSearch() {
    searchOverlay.classList.remove("open");
    document.body.style.overflow = "";
  }

  searchToggle.addEventListener("click", openSearch);
  searchCloseBtn.addEventListener("click", closeSearch);

  let activeSearchFilter = "all";
  const ROLE_FILTERS = [
    { key: "all", label: "הכל" },
    { key: "צדיק", label: "צדיק" },
    { key: "נביא", label: "נביא" },
    { key: "מלך", label: "מלך" },
    { key: "שופט", label: "שופט" },
    { key: "כהן", label: "כהן" }
  ];

  function buildSearchFilters() {
    let filtersDiv = document.querySelector(".search-filters");
    if (!filtersDiv) {
      filtersDiv = document.createElement("div");
      filtersDiv.className = "search-filters";
      searchInput.parentNode.insertBefore(filtersDiv, searchResults);
    }
    filtersDiv.innerHTML = "";
    ROLE_FILTERS.forEach(f => {
      const btn = document.createElement("button");
      btn.className = "search-filter-btn" + (f.key === activeSearchFilter ? " active" : "");
      btn.textContent = f.label;
      btn.addEventListener("click", () => {
        activeSearchFilter = f.key;
        filtersDiv.querySelectorAll(".search-filter-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        runSearch();
      });
      filtersDiv.appendChild(btn);
    });
  }

  function runSearch() {
    const q = searchInput.value.trim().toLowerCase();
    searchResults.innerHTML = "";
    if (q.length < 2) return;

    let matches = allPersonsFlat.filter(
      (p) => p.nameHe.includes(q) || p.nameEn.toLowerCase().includes(q)
    );

    if (activeSearchFilter !== "all") {
      matches = matches.filter(p => p.title && p.title.includes(activeSearchFilter));
    }

    const exact = matches.slice(0, 10);
    const relatedIds = new Set();
    exact.forEach(p => {
      if (p.fatherId) relatedIds.add(p.fatherId);
      if (p.motherId) relatedIds.add(p.motherId);
      (p.spouseIds || []).forEach(s => relatedIds.add(s));
      getChildren(p.id).forEach(c => relatedIds.add(c.person.id));
    });
    exact.forEach(p => relatedIds.delete(p.id));

    const related = allPersonsFlat.filter(p => relatedIds.has(p.id)).slice(0, 8);

    if (exact.length > 0) {
      const title = document.createElement("div");
      title.className = "search-result-group-title";
      title.textContent = `התאמות (${exact.length})`;
      searchResults.appendChild(title);
    }

    exact.forEach(p => searchResults.appendChild(buildSearchResultItem(p)));

    if (related.length > 0) {
      const title = document.createElement("div");
      title.className = "search-result-group-title";
      title.textContent = `דמויות קשורות (${related.length})`;
      searchResults.appendChild(title);
      related.forEach(p => searchResults.appendChild(buildSearchResultItem(p)));
    }
  }

  function buildSearchResultItem(p) {
    const item = document.createElement("div");
    item.className = "search-result-item";
    item.setAttribute("data-testid", "search-result-item");
    const yStr = (p.birthYear || "?") + " – " + (p.deathYear || "?");
    const titleStr = p.title ? ` | ${p.title}` : "";
    const summarySnippet = p.summary ? p.summary.substring(0, 60) + "..." : "";
    item.innerHTML = `
      <div class="search-result-info">
        <span class="search-result-name">${p.nameHe}</span>
        <div class="search-result-meta">${yStr}${titleStr}</div>
        ${summarySnippet ? `<div class="search-result-meta">${summarySnippet}</div>` : ""}
      </div>
      <span class="search-result-era">${p.era.nameHe.substring(0, 15)}</span>
    `;
    item.addEventListener("click", () => {
      closeSearch();
      openDetail(p.era, p);
    });
    return item;
  }

  searchInput.addEventListener("input", runSearch);

  // ── Hero Landing ───────────────────────────────────────

  function initHero() {
    const startBtn = document.getElementById("hero-start-btn");
    const searchBtn = document.getElementById("hero-search-btn");
    if (startBtn) {
      startBtn.addEventListener("click", () => {
        const el = document.getElementById("era-0") || document.querySelector(".era-section");
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
    if (searchBtn) {
      searchBtn.addEventListener("click", openSearch);
    }

    const statsEras = document.getElementById("hero-stat-eras");
    const statsPersons = document.getElementById("hero-stat-persons");
    if (statsEras) statsEras.textContent = ERAS.length;
    if (statsPersons) {
      let total = 0;
      ERAS.forEach(e => { total += e.persons.length; });
      statsPersons.textContent = total + "+";
    }

    const now = new Date();
    const ceYear = now.getFullYear();
    const heYear = ceYear + 3760;
    const yearHeEl = document.getElementById("hero-stat-year-he");
    const yearCeEl = document.getElementById("hero-stat-year-ce");
    if (yearHeEl) yearHeEl.textContent = heYear.toLocaleString("he-IL");
    if (yearCeEl) yearCeEl.textContent = ceYear + " לספירה";
  }

  // ── Era Carousel ──────────────────────────────────────

  function buildEraCarousel() {
    const track = document.getElementById("era-carousel-track");
    if (!track) return;
    track.innerHTML = "";

    ERAS.forEach((era, idx) => {
      const card = document.createElement("div");
      card.className = "era-carousel-card";
      card.setAttribute("tabindex", "0");
      card.setAttribute("role", "button");
      const numStr = String(idx + 1).padStart(2, "0");
      card.innerHTML = `
        <div class="era-carousel-num">${numStr}</div>
        <div class="era-carousel-name">${era.nameHe}</div>
        <div class="era-carousel-years">${era.startYear} – ${era.endYear} שנה עברית</div>
        <div class="era-carousel-count">${era.persons.length} דמויות</div>
      `;
      card.addEventListener("click", () => {
        const el = document.getElementById("era-" + idx);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      });
      card.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          card.click();
        }
      });
      track.appendChild(card);
    });
  }

  // ── Grid View ─────────────────────────────────────────

  let currentView = "timeline";
  const gridContainer = document.getElementById("grid-view-container");
  const timelineView = document.getElementById("timeline-view");
  const viewTimelineBtn = document.getElementById("view-timeline-btn");
  const viewGridBtn = document.getElementById("view-grid-btn");

  function switchView(view) {
    currentView = view;
    if (view === "grid") {
      timelineView.style.display = "none";
      gridContainer.classList.add("active");
      viewGridBtn.classList.add("active");
      viewTimelineBtn.classList.remove("active");
      document.getElementById("era-nav").style.display = "none";
      buildGridView();
    } else {
      timelineView.style.display = "";
      gridContainer.classList.remove("active");
      viewTimelineBtn.classList.add("active");
      viewGridBtn.classList.remove("active");
      document.getElementById("era-nav").style.display = "";
      setTimeout(drawTree, 100);
    }
  }

  if (viewTimelineBtn) viewTimelineBtn.addEventListener("click", () => switchView("timeline"));
  if (viewGridBtn) viewGridBtn.addEventListener("click", () => switchView("grid"));

  function buildGridView() {
    if (!gridContainer) return;
    gridContainer.innerHTML = "";

    ERAS.forEach((era, eraIdx) => {
      const section = document.createElement("div");
      section.className = "grid-era-section";

      const rangeStr = `${era.startYear} – ${era.endYear} (${hebrewToCEShort(era.startYear)} – ${hebrewToCEShort(era.endYear)})`;
      section.innerHTML = `
        <div class="grid-era-header">
          <h3 class="grid-era-title">${era.nameHe}</h3>
          <div class="grid-era-subtitle">${era.nameEn}</div>
          <span class="grid-era-range">${rangeStr}</span>
        </div>
      `;

      const grid = document.createElement("div");
      grid.className = "grid-persons";

      era.persons.forEach((person, pIdx) => {
        const card = document.createElement("div");
        card.className = "grid-person-card";
        card.setAttribute("tabindex", "0");
        card.setAttribute("role", "button");

        const initial = person.nameHe.charAt(0);
        const yStr = (person.birthYear || "?") + " – " + (person.deathYear || "?");
        let badgeHTML = "";
        if (person.title) {
          const bc = getBadgeClass(person.title);
          badgeHTML = `<span class="card-badge ${bc}" style="font-size:10px;margin-top:4px;">${person.title}</span>`;
        }

        card.innerHTML = `
          <div class="grid-person-avatar">${initial}</div>
          <div class="grid-person-name">${person.nameHe}</div>
          <div class="grid-person-years">${yStr}</div>
          ${badgeHTML}
        `;

        card.addEventListener("click", () => openDetail(era, person));
        card.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openDetail(era, person); }
        });
        grid.appendChild(card);
      });

      section.appendChild(grid);
      gridContainer.appendChild(section);
    });
  }

  // ── Breadcrumb ────────────────────────────────────────

  const breadcrumbBar = document.getElementById("breadcrumb-bar");
  const breadcrumbHome = document.getElementById("breadcrumb-home");
  const breadcrumbCurrent = document.getElementById("breadcrumb-current");

  function showBreadcrumb(text) {
    if (!breadcrumbBar) return;
    breadcrumbCurrent.textContent = text;
    breadcrumbBar.classList.add("visible");
  }

  function hideBreadcrumb() {
    if (!breadcrumbBar) return;
    breadcrumbBar.classList.remove("visible");
  }

  if (breadcrumbHome) {
    breadcrumbHome.addEventListener("click", () => {
      hideBreadcrumb();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  // ── Bookmarks ─────────────────────────────────────────

  const BOOKMARK_KEY = "seder-hadorot-bookmarks";
  const bookmarksToggle = document.getElementById("bookmarks-toggle");
  const bookmarksPanel = document.getElementById("bookmarks-panel");
  const bookmarksList = document.getElementById("bookmarks-list");
  const bookmarksPanelClose = document.getElementById("bookmarks-panel-close");
  const detailBookmarkBtn = document.getElementById("detail-bookmark-btn");
  const detailBookmarkLabel = document.getElementById("detail-bookmark-label");

  function getBookmarks() {
    try { return JSON.parse(localStorage.getItem(BOOKMARK_KEY)) || []; }
    catch { return []; }
  }

  function saveBookmarks(arr) {
    localStorage.setItem(BOOKMARK_KEY, JSON.stringify(arr));
  }

  function isBookmarked(personId) {
    return getBookmarks().some(b => b.id === personId);
  }

  function toggleBookmark(person, era) {
    let bk = getBookmarks();
    const idx = bk.findIndex(b => b.id === person.id);
    if (idx >= 0) {
      bk.splice(idx, 1);
    } else {
      bk.push({
        id: person.id,
        nameHe: person.nameHe,
        eraName: era.nameHe,
        birthYear: person.birthYear,
        deathYear: person.deathYear
      });
    }
    saveBookmarks(bk);
    updateBookmarkUI();
  }

  function updateBookmarkUI() {
    if (!currentDetailPerson) return;
    const bk = isBookmarked(currentDetailPerson.id);
    if (detailBookmarkLabel) {
      detailBookmarkLabel.textContent = bk ? "הסר ממועדפים" : "הוסף למועדפים";
    }
    if (detailBookmarkBtn) {
      detailBookmarkBtn.classList.toggle("bookmarked", bk);
    }
  }

  function renderBookmarksList() {
    if (!bookmarksList) return;
    const bk = getBookmarks();
    if (bk.length === 0) {
      bookmarksList.innerHTML = '<div class="bookmarks-empty">אין מועדפים עדיין.<br>לחצו על ❤ בפרטי דמות כדי לשמור.</div>';
      return;
    }
    bookmarksList.innerHTML = "";
    bk.forEach(b => {
      const item = document.createElement("div");
      item.className = "bookmark-item";
      const yStr = (b.birthYear || "?") + " – " + (b.deathYear || "?");
      item.innerHTML = `
        <div>
          <div class="bookmark-item-name">${b.nameHe}</div>
          <div class="bookmark-item-meta">${yStr} | ${b.eraName}</div>
        </div>
      `;
      item.addEventListener("click", () => {
        const entry = findPersonById(b.id);
        if (entry) {
          closeBookmarksPanel();
          openDetail(entry.era, entry.person);
        }
      });
      bookmarksList.appendChild(item);
    });
  }

  function openBookmarksPanel() {
    renderBookmarksList();
    bookmarksPanel.classList.add("open");
  }

  function closeBookmarksPanel() {
    bookmarksPanel.classList.remove("open");
  }

  if (bookmarksToggle) bookmarksToggle.addEventListener("click", (e) => {
    e.stopPropagation();
    if (bookmarksPanel.classList.contains("open")) closeBookmarksPanel();
    else openBookmarksPanel();
  });
  if (bookmarksPanelClose) bookmarksPanelClose.addEventListener("click", closeBookmarksPanel);

  if (detailBookmarkBtn) {
    detailBookmarkBtn.addEventListener("click", () => {
      if (currentDetailPerson && currentDetailEra) {
        toggleBookmark(currentDetailPerson, currentDetailEra);
      }
    });
  }

  // ── Share ─────────────────────────────────────────────

  const shareBtn = document.getElementById("share-btn");
  const shareToast = document.getElementById("share-toast");

  function shareCurrentPerson() {
    if (!currentDetailPerson) return;
    const url = new URL(window.location.href);
    url.searchParams.set("person", currentDetailPerson.id);
    url.hash = "";

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url.toString()).then(() => showShareToast());
    } else {
      const ta = document.createElement("textarea");
      ta.value = url.toString();
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      showShareToast();
    }
  }

  function showShareToast() {
    if (!shareToast) return;
    shareToast.classList.add("visible");
    setTimeout(() => shareToast.classList.remove("visible"), 2000);
  }

  if (shareBtn) shareBtn.addEventListener("click", shareCurrentPerson);

  function checkUrlForPerson() {
    const params = new URLSearchParams(window.location.search);
    const personId = params.get("person");
    if (personId) {
      const entry = findPersonById(personId);
      if (entry) {
        setTimeout(() => openDetail(entry.era, entry.person), 500);
      }
    }
  }

  // ── Mobile Bottom Nav ─────────────────────────────────

  function buildMobileNav() {
    const track = document.getElementById("mobile-nav-track");
    if (!track) return;
    track.innerHTML = "";

    ERAS.forEach((era, idx) => {
      const btn = document.createElement("button");
      btn.className = "mobile-nav-item";
      btn.textContent = era.nameHe.length > 12 ? era.nameHe.substring(0, 12) + "…" : era.nameHe;
      btn.dataset.eraIdx = idx;
      btn.addEventListener("click", () => {
        const el = document.getElementById("era-" + idx);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      });
      track.appendChild(btn);
    });
  }

  function updateMobileNav(activeIdx) {
    const items = document.querySelectorAll(".mobile-nav-item");
    items.forEach((item, idx) => {
      item.classList.toggle("active", idx === activeIdx);
    });
    const activeItem = items[activeIdx];
    if (activeItem) {
      activeItem.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  }

  // ── Related Figures ───────────────────────────────────

  function renderRelatedFigures(person, era) {
    const existing = document.getElementById("related-figures");
    if (existing) existing.remove();

    const sameEra = era.persons.filter(p => p.id !== person.id).slice(0, 6);
    if (sameEra.length === 0) return;

    const container = document.createElement("div");
    container.className = "related-figures";
    container.id = "related-figures";
    let html = `<div class="related-figures-title">דמויות נוספות בתקופה זו</div><div class="related-figures-chips">`;
    sameEra.forEach(p => {
      html += `<button class="related-chip" data-person-id="${p.id}">${p.nameHe}</button>`;
    });
    html += `</div>`;
    container.innerHTML = html;

    const detailViewEl = document.getElementById("detail-view");
    if (detailViewEl) {
      detailViewEl.appendChild(container);
    }

    container.querySelectorAll(".related-chip").forEach(chip => {
      chip.addEventListener("click", () => {
        const entry = findPersonById(chip.dataset.personId);
        if (entry) openDetail(entry.era, entry.person);
      });
    });
  }

  // ── Improved Empty States ─────────────────────────────

  function emptyStateHTML(type, person) {
    const familyLinks = [];
    if (person.fatherId) {
      const f = findPersonById(person.fatherId);
      if (f) familyLinks.push(`<button class="related-chip journey-link" data-person-id="${person.fatherId}">${f.person.nameHe}</button>`);
    }
    (person.spouseIds || []).forEach(sid => {
      const e = findPersonById(sid);
      if (e) familyLinks.push(`<button class="related-chip journey-link" data-person-id="${sid}">${e.person.nameHe}</button>`);
    });
    const familyChipsHTML = familyLinks.length > 0
      ? `<div style="margin-top:10px;display:flex;gap:6px;justify-content:center;flex-wrap:wrap;">${familyLinks.join("")}</div>`
      : "";

    const messages = {
      summary: {
        text: `עדיין אין סיכום עבור ${person.nameHe}.`,
        cta: "הוסף סיכום"
      },
      journey: {
        text: `מסע חיים — אין אירועים מסודרים עדיין עבור ${person.nameHe}.`,
        cta: "תרום מידע"
      },
      midrash: {
        text: `אין כרטיסי מדרש זמינים עבור ${person.nameHe}.`,
        cta: "הוסף מדרש"
      },
      sources: {
        text: `אין מקורות זמינים עבור ${person.nameHe}.`,
        cta: "הוסף מקור"
      }
    };

    const m = messages[type] || { text: "תוכן יתמלא בהמשך.", cta: "תרום" };

    return `
      <div class="empty-state">
        <div class="empty-state-text">${m.text}</div>
        ${auth.isLoggedIn() ? `<button class="empty-state-cta" onclick="document.getElementById('edit-toggle-btn').click()">${m.cta}</button>` : ""}
        ${familyChipsHTML}
      </div>
    `;
  }

  // ── Keyboard Shortcuts ────────────────────────────────

  const kbdHint = document.getElementById("kbd-hint");
  let kbdHintTimeout;

  function showKbdHint() {
    if (!kbdHint) return;
    kbdHint.classList.add("visible");
    clearTimeout(kbdHintTimeout);
    kbdHintTimeout = setTimeout(() => kbdHint.classList.remove("visible"), 4000);
  }

  document.addEventListener("keydown", (e) => {
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.tagName === "SELECT") return;

    if (e.key === "/") {
      e.preventDefault();
      openSearch();
      return;
    }

    if (e.key === "g" || e.key === "G") {
      e.preventDefault();
      switchView(currentView === "grid" ? "timeline" : "grid");
      return;
    }

    if (e.key === "?") {
      showKbdHint();
      return;
    }

    if (e.key === "b" || e.key === "B") {
      if (bookmarksPanel.classList.contains("open")) closeBookmarksPanel();
      else openBookmarksPanel();
      return;
    }
  });

  // ── Init: Auth + Merge Approved Content + Render ───────

  async function initApp() {
    buildPersonIndex();

    try {
      await auth.init();
    } catch (e) {
      console.warn("Auth init skipped (Supabase may not be configured):", e.message);
    }

    try {
      const approved = await subs.fetchApprovedContent();
      if (approved.length > 0) {
        subs.mergeApprovedIntoEras(ERAS, approved);
        buildPersonIndex();
      }
    } catch (e) {
      console.warn("Could not fetch approved content:", e.message);
    }

    auth.onChange(updateAuthUI);
    updateAuthUI(auth.currentUser, auth.currentProfile);

    renderEras();
    rebuildSearchIndex();

    initHero();
    buildEraCarousel();
    buildMobileNav();
    buildSearchFilters();
    checkUrlForPerson();
  }

  initApp();
})();
