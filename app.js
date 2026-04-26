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

    document.getElementById("family-tree-container").innerHTML = '';

    document.querySelectorAll(".detail-tab").forEach((t) => t.classList.remove("active"));
    document.querySelectorAll(".tab-pane").forEach((p) => p.classList.remove("active"));
    document.querySelector('.detail-tab[data-tab="summary"]').classList.add("active");
    summaryPane.classList.add("active");

    exitEditMode();

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
  }

  detailClose.addEventListener("click", closeDetail);
  detailBackdrop.addEventListener("click", closeDetail);

  document.querySelectorAll(".detail-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".detail-tab").forEach((t) => t.classList.remove("active"));
      document.querySelectorAll(".tab-pane").forEach((p) => p.classList.remove("active"));
      tab.classList.add("active");
      document.getElementById("tab-" + tab.dataset.tab).classList.add("active");

      if (tab.dataset.tab === "family" && currentDetailPerson) {
        renderFamilyTree(currentDetailPerson);
      }
    });
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (apModal.classList.contains("open")) closeAddPersonModal();
      else if (searchOverlay.classList.contains("open")) closeSearch();
      else if (detailPanel.classList.contains("open")) closeDetail();
    }
  });

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

  function renderFamilyTree(person) {
    const container = document.getElementById("family-tree-container");
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
      .data(root.links().filter((l) => l.target.data._personId != null))
      .join("path")
      .attr("class", (d) => {
        const fromDummy = d.source.data._isDummyRoot;
        const toSpouse = d.target.data._isSpouse;
        if (fromDummy || toSpouse) return "ftree-link ftree-link-spouse";
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
        if (d.data._personId) {
          const entry = findPersonById(d.data._personId);
          if (entry) openDetail(entry.era, entry.person);
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

  function buildFamilyTreeData(person) {
    // One generation above (parents), three below (children through great-grandchildren).
    const currentNode = personToNode(person, true);
    addDescendantGenerations(currentNode, person, 3);

    const spouseNodes = buildSpouseNodesForTree(person);

    // Build mother branch as sibling of currentNode under father
    let motherNode = null;
    if (person.motherId) {
      const motherEntry = findPersonById(person.motherId);
      if (motherEntry) {
        motherNode = personToNode(motherEntry.person, false);
        motherNode._isSpouse = true;
      }
    }

    // Walk up one generation to parent(s) only (no grandparents).
    let bottomNode = currentNode;

    if (person.fatherId) {
      const fatherEntry = findPersonById(person.fatherId);
      if (fatherEntry) {
        const fatherNode = personToNode(fatherEntry.person, false);
        // Father's children: current person, wives/husbands in parallel, then co-parent
        const kids = [currentNode, ...spouseNodes];
        if (motherNode) kids.push(motherNode);
        fatherNode.children = kids;
        bottomNode = fatherNode;
      } else {
        if (motherNode) {
          motherNode.children = [currentNode, ...spouseNodes];
          bottomNode = motherNode;
        } else if (spouseNodes.length) {
          bottomNode = marriageDummyRoot([currentNode, ...spouseNodes]);
        }
      }
    } else if (motherNode) {
      // No father but has mother: mother is the root
      motherNode.children = [currentNode, ...spouseNodes];
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
  }

  initApp();
})();
