(function () {
  "use strict";

  // Apply saved theme
  const savedTheme = localStorage.getItem("seder-hadorot-theme");
  if (savedTheme) document.documentElement.setAttribute("data-theme", savedTheme);

  const auth = window.JewsMapAuth;
  const subs = window.JewsMapSubmissions;
  const TYPE_LABELS = {
    new_person: "אדם חדש",
    edit_person: "עריכת אדם",
    add_source: "מקור",
    add_note: "הערה"
  };
  const STATUS_LABELS = { pending: "ממתין", approved: "אושר", rejected: "נדחה" };

  let allSubmissions = [];
  let selectedSubmission = null;

  const gate = document.getElementById("admin-gate");
  const gateText = document.getElementById("gate-text");
  const gateLoginBtn = document.getElementById("gate-login-btn");
  const adminApp = document.getElementById("admin-app");

  const filterStatus = document.getElementById("filter-status");
  const filterType = document.getElementById("filter-type");
  const statsList = document.getElementById("submissions-list");
  const statsEl = document.getElementById("admin-stats");

  const modalBackdrop = document.getElementById("modal-backdrop");
  const modal = document.getElementById("modal");
  const modalClose = document.getElementById("modal-close");
  const modalBody = document.getElementById("modal-body");
  const modalAdminNote = document.getElementById("modal-admin-note");
  const modalApprove = document.getElementById("modal-approve");
  const modalReject = document.getElementById("modal-reject");
  const modalStatus = document.getElementById("modal-status");

  // ── Gate Logic ──────────────────────────────────────────

  gateLoginBtn.addEventListener("click", () => auth.signInWithGoogle());

  async function checkAccess() {
    try {
      await auth.init();
    } catch (e) {
      gateText.textContent = "שגיאה בהתחברות. ודא שהגדרות Supabase תקינות.";
      return;
    }

    auth.onChange(handleAuthChange);
    handleAuthChange(auth.currentUser, auth.currentProfile);
  }

  function handleAuthChange(user, profile) {
    if (!user) {
      gate.style.display = '';
      adminApp.style.display = 'none';
      gateText.textContent = "יש להתחבר כדי לגשת לניהול.";
      gateLoginBtn.style.display = '';
      return;
    }

    if (!profile || profile.role !== 'admin') {
      gate.style.display = '';
      adminApp.style.display = 'none';
      gateText.textContent = "אין לך הרשאות מנהל. רק orbaruti@gmail.com יכול לגשת.";
      gateLoginBtn.style.display = 'none';
      return;
    }

    gate.style.display = 'none';
    adminApp.style.display = '';
    document.getElementById("admin-user-name").textContent = profile.display_name || profile.email;
    loadSubmissions();
  }

  document.getElementById("admin-signout").addEventListener("click", () => auth.signOut());

  // ── Load Submissions ───────────────────────────────────

  async function loadSubmissions() {
    statsList.innerHTML = '<p class="loading-text">טוען...</p>';

    const { data, error } = await auth.supabase
      .from('submissions')
      .select('*, profiles(display_name, email, avatar_url)')
      .order('created_at', { ascending: false });

    if (error) {
      statsList.innerHTML = `<p class="empty-text">שגיאה: ${error.message}</p>`;
      return;
    }

    allSubmissions = data || [];
    renderList();
  }

  filterStatus.addEventListener("change", renderList);
  filterType.addEventListener("change", renderList);

  function renderList() {
    const statusFilter = filterStatus.value;
    const typeFilter = filterType.value;

    let filtered = allSubmissions;
    if (statusFilter !== 'all') filtered = filtered.filter(s => s.status === statusFilter);
    if (typeFilter !== 'all') filtered = filtered.filter(s => s.type === typeFilter);

    const pending = allSubmissions.filter(s => s.status === 'pending').length;
    statsEl.textContent = `${allSubmissions.length} סה"כ | ${pending} ממתינים`;

    if (filtered.length === 0) {
      statsList.innerHTML = '<p class="empty-text">אין תוצאות</p>';
      return;
    }

    statsList.innerHTML = '';
    filtered.forEach(sub => {
      const card = document.createElement("div");
      card.className = "sub-card";
      card.addEventListener("click", () => openModal(sub));

      const profile = sub.profiles;
      const userName = profile?.display_name || profile?.email || 'לא ידוע';
      const personName = sub.type === 'new_person'
        ? (sub.data?.nameHe || sub.data?.id || 'חדש')
        : (sub.person_id || '—');
      const date = new Date(sub.created_at).toLocaleDateString('he-IL');

      card.innerHTML = `
        <div class="sub-card-main">
          <div class="sub-card-top">
            <span class="sub-type-badge ${sub.type}">${TYPE_LABELS[sub.type]}</span>
            <span class="sub-person-name">${personName}</span>
          </div>
          <div class="sub-era-name">תקופה: ${sub.era_id}</div>
          <div class="sub-user">שלח: ${userName} | ${date}</div>
        </div>
        <div class="sub-card-status">
          <span class="status-badge ${sub.status}">${STATUS_LABELS[sub.status]}</span>
        </div>
      `;
      statsList.appendChild(card);
    });
  }

  // ── Modal ──────────────────────────────────────────────

  function openModal(sub) {
    selectedSubmission = sub;
    modalAdminNote.value = sub.admin_note || '';
    modalStatus.textContent = '';

    const isPending = sub.status === 'pending';
    modalApprove.style.display = isPending ? '' : 'none';
    modalReject.style.display = isPending ? '' : 'none';
    modalAdminNote.style.display = isPending ? '' : 'none';

    const profile = sub.profiles;
    const userName = profile?.display_name || profile?.email || 'לא ידוע';

    let fieldsHTML = '';
    const d = sub.data || {};

    if (sub.type === 'new_person') {
      fieldsHTML = buildFieldHTML('שם עברי', d.nameHe) +
        buildFieldHTML('שם אנגלי', d.nameEn) +
        buildFieldHTML('מזהה', d.id) +
        buildFieldHTML('שנת לידה', d.birthYear) +
        buildFieldHTML('שנת פטירה', d.deathYear) +
        buildFieldHTML('תואר', d.title) +
        buildFieldHTML('סיכום', d.summary) +
        buildFieldHTML('מדרש', d.midrash) +
        buildFieldHTML('מקורות', d.sources);
    } else if (sub.type === 'edit_person') {
      Object.keys(d).forEach(key => {
        fieldsHTML += buildFieldHTML(key, d[key]);
      });
    } else if (sub.type === 'add_source') {
      fieldsHTML = buildFieldHTML('מקור', d.sources);
    } else if (sub.type === 'add_note') {
      fieldsHTML = buildFieldHTML('הערה', d.note) +
        buildFieldHTML('שם הכותב', d.authorName);
    }

    if (sub.admin_note && !isPending) {
      fieldsHTML += buildFieldHTML('הערת מנהל', sub.admin_note);
    }

    modalBody.innerHTML = `
      <h3>${TYPE_LABELS[sub.type]} — ${sub.person_id || 'חדש'}</h3>
      <div class="modal-submitter">שלח: ${userName} | תקופה: ${sub.era_id} | ${new Date(sub.created_at).toLocaleString('he-IL')}</div>
      ${fieldsHTML}
    `;

    modalBackdrop.classList.add("open");
    modal.classList.add("open");
  }

  function buildFieldHTML(label, value) {
    if (value === undefined || value === null || value === '') return '';
    return `<div class="modal-field">
      <div class="modal-field-label">${label}</div>
      <div class="modal-field-value">${value}</div>
    </div>`;
  }

  function closeModal() {
    modalBackdrop.classList.remove("open");
    modal.classList.remove("open");
    selectedSubmission = null;
  }

  modalClose.addEventListener("click", closeModal);
  modalBackdrop.addEventListener("click", closeModal);

  // ── Approve / Reject ───────────────────────────────────

  modalApprove.addEventListener("click", () => handleAction('approved'));
  modalReject.addEventListener("click", () => handleAction('rejected'));

  async function handleAction(newStatus) {
    if (!selectedSubmission) return;

    modalApprove.disabled = true;
    modalReject.disabled = true;
    modalStatus.textContent = "מעבד...";

    const adminNote = modalAdminNote.value.trim();

    try {
      if (newStatus === 'approved' && selectedSubmission.type === 'new_person' && subs && window.ERAS_DATA) {
        const rawEra = selectedSubmission.era_id;
        const eraIdParsed = rawEra == null || rawEra === ''
          ? null
          : (Number.isNaN(Number(rawEra)) ? rawEra : Number(rawEra));
        const eras = JSON.parse(JSON.stringify(window.ERAS_DATA));
        const approved = await subs.fetchApprovedContent();
        subs.mergeApprovedIntoEras(eras, approved);
        const conflict = subs.findNewPersonConflict(eras, eraIdParsed, selectedSubmission.data || {});
        if (conflict) {
          if (conflict.kind === 'no_era') {
            modalStatus.textContent = 'לא אושר: תקופה לא נמצאה בנתוני האתר.';
          } else {
            const label = conflict.kind === 'id' ? 'מזהה (ID)' : 'שם בעברית';
            modalStatus.textContent =
              `לא אושר: כבר קיים אדם עם אותו ${label} בתקופה הזו — ${conflict.existing.nameHe} (${conflict.existing.id}).`;
          }
          return;
        }
      }

      const { error: updateError } = await auth.supabase
        .from('submissions')
        .update({
          status: newStatus,
          admin_note: adminNote || null
        })
        .eq('id', selectedSubmission.id);

      if (updateError) throw updateError;

      if (newStatus === 'approved') {
        const { error: insertError } = await auth.supabase
          .from('approved_content')
          .insert({
            submission_id: selectedSubmission.id,
            era_id: selectedSubmission.era_id,
            person_id: selectedSubmission.person_id,
            content_type: selectedSubmission.type,
            data: selectedSubmission.data
          });
        if (insertError) throw insertError;
      }

      modalStatus.textContent = newStatus === 'approved' ? 'אושר בהצלחה!' : 'נדחה.';

      const sub = allSubmissions.find(s => s.id === selectedSubmission.id);
      if (sub) {
        sub.status = newStatus;
        sub.admin_note = adminNote || null;
      }

      setTimeout(() => {
        closeModal();
        renderList();
      }, 800);

    } catch (err) {
      console.error("Action error:", err);
      modalStatus.textContent = "שגיאה: " + (err.message || err);
    } finally {
      modalApprove.disabled = false;
      modalReject.disabled = false;
    }
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.classList.contains("open")) closeModal();
  });

  // ── Init ───────────────────────────────────────────────

  checkAccess();
})();
