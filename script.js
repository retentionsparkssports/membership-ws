// ==========================================
// 1. SUPABASE CONFIGURATION
// ==========================================
const SUPABASE_URL = "https://cfdjsilmcomflleqhqii.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_bUL-eM8mbA8fgFYoUpXVFg_DTWaUKdf";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const LOGO_URL      = "logo.png";
const SUPPORT_WA    = "https://wa.me/6281390006606";
const SUPPORT_LABEL = "Tim Customer Support Sparks Sports";

const app = document.getElementById("app");

let ALL_STUDENTS   = [];
let ALL_ATTENDANCE = [];
let DATA_ERROR     = "";
let ATTENDANCE_ERROR = false;

function sleep(ms) { return new Promise(res => setTimeout(res, ms)); }

// Retries an async RPC-calling function a few times before giving up,
// so a single flaky/slow network hiccup doesn't silently render as "no data".
async function withRetry(fn, attempts = 3, delayMs = 600) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      if (i < attempts - 1) await sleep(delayMs * (i + 1));
    }
  }
  throw lastErr;
}

// ============================================================
// ICONS
// ============================================================

const ICON_PHONE  = `<svg viewBox="0 0 24 24" fill="none" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v2.2a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 3.4 2 2 0 0 1 4.11 1.2h2.2a2 2 0 0 1 2 1.72c.13.96.35 1.9.66 2.8a2 2 0 0 1-.45 2.1L7.6 8.75a16 16 0 0 0 7.65 7.65l.93-.93a2 2 0 0 1 2.1-.45c.9.31 1.84.53 2.8.66A2 2 0 0 1 22 16.92Z"/></svg>`;
const ICON_SEARCH = `<svg viewBox="0 0 24 24" fill="none" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-3.5-3.5"></path></svg>`;
const ICON_WA     = `<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>`;

// ============================================================
// INIT
// ============================================================

document.addEventListener("DOMContentLoaded", async () => {
  const params    = new URLSearchParams(window.location.search);
  const phone     = params.get("phone");
  const studentId = params.get("sid");

  // LP3: student detail
  if (studentId) {
    renderLoadingPage("Memuat detail attendance", "Mohon tunggu sebentar.");
    await loadStudentById(studentId);
    if (DATA_ERROR) { renderErrorPage(DATA_ERROR); return; }
    
    if (!ALL_STUDENTS.length) { renderNotFoundPage(phone || studentId); return; }

    const student = ALL_STUDENTS[0];
    await fetchAttendanceForStudent(studentId);

    if (ATTENDANCE_ERROR) {
      renderAttendanceErrorPage(studentId, phone);
      return;
    }

    renderDetailPage(student, ALL_ATTENDANCE, student.waLink, student.sarName, phone);
    return;
  }

  // LP2: dashboard
  if (phone) {
    renderLoadingPage("Mencari data membership", "Mohon tunggu sebentar. Kami sedang mencocokkan nomor WhatsApp yang kamu masukkan.");
    await loadStudentsByPhone(phone);
    if (DATA_ERROR) { renderErrorPage(DATA_ERROR); return; }
    
    if (!ALL_STUDENTS.length) { renderNotFoundPage(phone); return; }
    renderDashboardPage(ALL_STUDENTS);
    return;
  }

  // LP1: landing
  renderLandingPage();
});

// ============================================================
// DATABASE LOADERS (SECURE SUPABASE RPC CALLS)
// ============================================================

async function loadStudentsByPhone(phone) {
  try {
    const data = await withRetry(async () => {
      const { data, error } = await supabaseClient
        .rpc('get_students_by_phone', { search_phone: phone });
      if (error) throw error;
      return data;
    });

    ALL_STUDENTS = (data || []).map(row => ({
      center:        row.center,
      studentId:     row.student_id,
      studentName:   row.student_name,
      phone:         row.phone_number,
      parentsName:   row.parents_name,
      retentionX:    row.retention_x,
      expiryDateRaw: row.expiry_date_raw,
      expiryDate:    formatDisplayDate(row.expiry_date_raw),
      sarName:       row.sar_name,
      waLink:        row.wa_link
    }));
  } catch (e) {
    DATA_ERROR = "Data membership belum bisa dimuat. Silakan coba beberapa saat lagi atau hubungi " + SUPPORT_LABEL + " untuk bantuan.";
    console.error(e);
  }
}

async function loadStudentById(studentId) {
  try {
    const data = await withRetry(async () => {
      const { data, error } = await supabaseClient
        .rpc('get_student_by_id', { search_id: studentId });
      if (error) throw error;
      return data;
    });

    ALL_STUDENTS = (data || []).map(row => ({
      center:        row.center,
      studentId:     row.student_id,
      studentName:   row.student_name,
      phone:         row.phone_number,
      parentsName:   row.parents_name,
      retentionX:    row.retention_x,
      expiryDateRaw: row.expiry_date_raw,
      expiryDate:    formatDisplayDate(row.expiry_date_raw),
      sarName:       row.sar_name,
      waLink:        row.wa_link
    }));
  } catch (e) {
    DATA_ERROR = "Data membership belum bisa dimuat. Silakan coba beberapa saat lagi atau hubungi " + SUPPORT_LABEL + " untuk bantuan.";
    console.error(e);
  }
}

async function fetchAttendanceForStudent(studentId) {
  ATTENDANCE_ERROR = false;
  try {
    const rows = await withRetry(async () => {
      const { data, error } = await supabaseClient
        .rpc('get_attendance_by_student_id', { search_id: studentId });
      if (error) throw error;
      return data;
    });

    ALL_ATTENDANCE = (rows || []).map(row => ({
      studentId:     row.student_id,
      studentName:   row.student_name,
      center:        row.center,
      rawDate:       row.raw_date,
      dateStr:       row.date_str || formatDisplayDate(row.raw_date),
      class_:        row.class_,
      attendance:    cleanCell(row.attendance),
      makeupReason:  row.makeup_reason,
      statusClass:   cleanCell(row.status_class),
      previousClass: row.previous_class,
      previousDateStr: row.previous_date_str,
      term:          cleanCell(row.term),
      quarter:       cleanCell(row.quarter)
    }));
  } catch (e) {
    console.error("Failed to fetch attendance for student", studentId, e);
    ALL_ATTENDANCE = [];
    ATTENDANCE_ERROR = true;
  }
}

// ============================================================
// BRAND LOGO
// ============================================================

function renderBrandLogo(size) {
  const imgClass = size === "small" ? "logo-img small" : "logo-img";
  return `<div class="logo-wrap">
    <img src="${LOGO_URL}" class="${imgClass}" alt="Sparks Sports Academy"
      onerror="this.style.display='none';this.nextElementSibling.style.display='block';"/>
    <div class="logo-fallback ${size === "small" ? "white" : ""}" style="display:none;">
      Sparks <span class="star">★</span>
    </div>
  </div>`;
}

// ============================================================
// LP1: LANDING PAGE
// ============================================================

function renderLandingPage() {
  document.body.className = "center-page";
  app.innerHTML = `
    <div class="card">
      ${renderBrandLogo()}
      <div class="divider"></div>
      <p class="headline">Cek Status Membership Anak</p>
      <p class="sub">Masukkan nomor WhatsApp orang tua yang terdaftar untuk melihat status membership Sparks.</p>
      <label for="phone">Nomor WhatsApp</label>
      <div class="input-row has-icon">
        <div class="field-icon">${ICON_PHONE}</div>
        <div class="prefix">+62</div>
        <input type="tel" id="phone" placeholder="8111000549" inputmode="numeric" autocomplete="tel" maxlength="16"/>
      </div>
      <p class="hint">Tanpa angka 0 di depan. Contoh: 8111000549</p>
      <button id="btn" onclick="goToDashboard()">Cek Status Membership →</button>
      <p class="small-note">Butuh bantuan? Hubungi <a href="${SUPPORT_WA}" target="_blank" style="color:var(--green);font-weight:700;">${SUPPORT_LABEL}</a> untuk pengecekan data membership.</p>
    </div>
  `;
  const inp = document.getElementById("phone");
  inp.addEventListener("input", function () { this.value = this.value.replace(/[^0-9]/g, ""); });
  inp.addEventListener("keydown", function (e) { if (e.key === "Enter") goToDashboard(); });
}

// ============================================================
// LOADING / ERROR / NOT FOUND
// ============================================================

function renderLoadingPage(title, subtitle) {
  document.body.className = "center-page";
  app.innerHTML = `
    <div class="card">
      <div class="search-visual">${ICON_SEARCH}</div>
      ${renderBrandLogo()}
      <div class="divider"></div>
      <p class="headline loading-dots">${escapeHtml(title)}</p>
      <p class="sub">${escapeHtml(subtitle)}</p>
    </div>
  `;
}

function renderNotFoundPage(phone) {
  document.body.className = "center-page";
  app.innerHTML = `
    <div class="card">
      <div class="search-visual">${ICON_SEARCH}</div>
      <h2 class="headline">Nomor Tidak Ditemukan</h2>
      <p class="error-text">Kami belum menemukan data membership untuk nomor:</p>
      <div class="phone-box">+${escapeHtml(phone)}</div>
      <p class="error-text">Coba cek kembali angka yang dimasukkan. Jika nomor sudah benar tetapi data tetap tidak muncul, silakan hubungi Student Advisor Retention center kamu untuk pengecekan data.</p>
      <br>
      <a class="wa-help-btn" href="${SUPPORT_WA}" target="_blank">${ICON_WA} Hubungi ${SUPPORT_LABEL}</a>
      <br><br>
      <a class="link-button" onclick="backToHome()">← Coba Nomor Lain</a>
    </div>
  `;
}

function renderErrorPage(message) {
  document.body.className = "center-page";
  app.innerHTML = `
    <div class="card">
      <div class="icon warning">⚠️</div>
      <h2 class="headline">Data Belum Bisa Dimuat</h2>
      <p class="error-text">${escapeHtml(message)}</p>
      <p class="error-text">Silakan muat ulang halaman ini. Jika masih belum bisa, hubungi tim Sparks untuk pengecekan database.</p>
      <br><br>
      <a class="link-button" onclick="backToHome()">← Kembali</a>
    </div>
  `;
}

function renderAttendanceErrorPage(studentId, phone) {
  document.body.className = "center-page";
  app.innerHTML = `
    <div class="card">
      <div class="icon warning">⚠️</div>
      <h2 class="headline">Data Attendance Belum Bisa Dimuat</h2>
      <p class="error-text">Kami sempat gagal memuat riwayat kehadiran. Ini biasanya karena koneksi yang lambat.</p>
      <br>
      <button id="retry-btn" onclick="retryAttendanceLoad('${escapeHtml(studentId)}')">Coba Lagi</button>
      <br><br>
      <a class="link-button" href="?phone=${encodeURIComponent(phone || "")}">← Kembali ke daftar anak</a>
    </div>
  `;
}

async function retryAttendanceLoad(studentId) {
  const btn = document.getElementById("retry-btn");
  if (btn) { btn.textContent = "Memuat ulang..."; btn.disabled = true; }

  const params = new URLSearchParams(window.location.search);
  const phone  = params.get("phone");

  await fetchAttendanceForStudent(studentId);
  if (ATTENDANCE_ERROR) {
    renderAttendanceErrorPage(studentId, phone);
    return;
  }
  const student = ALL_STUDENTS[0];
  renderDetailPage(student, ALL_ATTENDANCE, student.waLink, student.sarName, phone);
}

// ============================================================
// LP2: DASHBOARD
// ============================================================

function renderDashboardPage(students) {
  document.body.className = "dashboard-page";
  const phone        = new URLSearchParams(window.location.search).get("phone") || "";
  const parentsName  = formatGreetingParentName(students[0]?.parentsName || "");
  const greeting     = parentsName ? `Halo, ${escapeHtml(parentsName)}!` : "Halo!";
  const multiNote    = students.length > 1
    ? `<div class="multi-note">👤 ${students.length} anak terdaftar dengan nomor ini.</div>` : "";

  app.innerHTML = `
    <div class="topbar">
      <div class="topbar-logo">
        <div class="topbar-logo-inner">
          <img src="${LOGO_URL}" class="logo-img small" alt="Sparks Sports Academy"
            onerror="this.style.display='none';this.nextElementSibling.style.display='block';"/>
          <div class="logo-fallback white" style="display:none;">Sparks <span class="star">★</span> Sports Academy</div>
        </div>
      </div>
    </div>
    <div class="wrap">
      <div class="greeting-card">
        <div class="greeting-text">${greeting}</div>
        <div class="greeting-sub">Yuk cek status membership si kecil di Sparks.</div>
      </div>
      ${multiNote}
      ${students.map(s => studentCard(s, phone)).join("")}
      <a class="back-link" onclick="backToHome()">← Cek nomor lain</a>
    </div>
  `;
}

function studentCard(student, phone) {
  const centerText = student.center;
  const sid        = encodeURIComponent(student.studentId);
  const ph         = encodeURIComponent(phone);
  return `
    <div class="student-card">
      <div class="card-top">
        <div class="avatar">${getInitials(student.studentName)}</div>
        <div class="card-info">
          <div class="student-name">${escapeHtml(student.studentName || "Nama belum tersedia")}</div>
          <div class="student-id">${escapeHtml(student.studentId)}</div>
          <div><span class="center-badge">${escapeHtml(centerText)}</span></div>
        </div>
      </div>
      ${createExpiryBanner(student.expiryDate)}
      <a class="detail-btn" href="?phone=${ph}&sid=${sid}">Lihat Detail Attendance →</a>
    </div>
  `;
}

// ============================================================
// LP3: STUDENT DETAIL
// ============================================================
function renderDetailPage(student, attendance, waLink, sarName, phone) {
  document.body.className = "dashboard-page";
  const centerText = student.center;
  const ph         = encodeURIComponent(phone || "");
  const waTarget   = getSafeWhatsAppLink(waLink);
  const waLabel    = waTarget !== SUPPORT_WA ? "Hubungi Student Advisor" : `Hubungi ${SUPPORT_LABEL}`;

  // Build mapping of Quarter -> Term Display Label
  const quarterMap = {};
  attendance.forEach(r => {
    if (r.quarter) {
      if (!quarterMap[r.quarter]) {
        quarterMap[r.quarter] = r.term || r.quarter;
      }
    }
  });

  // Sort Quarters descending (e.g., "2026-Q3", "2026-Q2", "2026-Q1")
  const sortedQuarters = Object.keys(quarterMap).sort((a, b) => b.localeCompare(a));
  const defaultQuarter = sortedQuarters.length > 0 ? sortedQuarters[0] : "";

  let optionsHtml = "";
  if (sortedQuarters.length > 0) {
    optionsHtml = sortedQuarters.map(q => 
      `<option value="${escapeHtml(q)}">${escapeHtml(quarterMap[q])}</option>`
    ).join("");
  } else {
    optionsHtml = `<option value="">Semua Term</option>`;
  }

  app.innerHTML = `
    <div class="topbar topbar-detail">
      <a class="topbar-back" href="?phone=${ph}">
        <svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><polyline points="15 18 9 12 15 6"/></svg>
      </a>
      <div class="topbar-logo"><div class="topbar-logo-inner">
        <img src="${LOGO_URL}" class="logo-img small" alt="Sparks Sports Academy"
          onerror="this.style.display='none';this.nextElementSibling.style.display='block';"/>
        <div class="logo-fallback white" style="display:none;">Sparks <span class="star">★</span></div>
      </div></div>
    </div>
    <div class="wrap">
      <div class="detail-hero">
        <div class="card-top">
          <div class="avatar">${getInitials(student.studentName)}</div>
          <div class="card-info">
            <div class="student-name">${escapeHtml(student.studentName)}</div>
            <div class="student-id">${escapeHtml(student.studentId)}</div>
            <div><span class="center-badge">${escapeHtml(centerText)}</span></div>
          </div>
        </div>
        ${createExpiryBanner(student.expiryDate)}
      </div>

      <!-- CENTERED DROPDOWN MATCHING OLD TERM-BADGE STYLE -->
      <div class="term-label">
        <div class="term-dropdown-container">
          <select id="term-select" class="term-dropdown">
            ${optionsHtml}
          </select>
          <span class="dropdown-arrow">▼</span>
        </div>
      </div>

      <div class="class-tabs-wrap" id="class-tabs-container"></div>
      <div class="metrics-row" id="lp3-metrics"></div>

      <div class="att-card">
        <div class="att-header">
          <div class="att-title" id="lp3-att-title">Riwayat Kehadiran</div>
        </div>
        <div class="att-legend">
          <span class="leg-item"><span class="att-dot-inline dot-present"></span>Present</span>
          <span class="leg-item"><span class="att-dot-inline dot-absent"></span>Absent</span>
          <span class="leg-item"><span class="att-dot-inline dot-leave"></span>Izin</span>
        </div>
        <div class="att-table-wrap">
          <table class="att-table">
            <thead id="lp3-table-head"><tr><th>Tanggal</th><th>Kelas</th><th>Kehadiran</th></tr></thead>
            <tbody id="lp3-tbody"></tbody>
          </table>
        </div>
      </div>

      <a class="wa-help-btn wa-help-btn--full" href="${waTarget}" target="_blank">${ICON_WA} ${waLabel}</a>
      <a class="back-link" href="?phone=${ph}">← Kembali ke daftar anak</a>
    </div>
  `;

  window._lp3AllAttendance = attendance;

  const termSelect = document.getElementById("term-select");
  if (termSelect) {
    termSelect.addEventListener("change", function() {
      switchTerm(this.value);
    });
  }

  switchTerm(defaultQuarter);
}

function switchTerm(selectedQuarter) {
  const allAttendance = window._lp3AllAttendance || [];
  const filteredAttendance = selectedQuarter 
    ? allAttendance.filter(r => r.quarter === selectedQuarter)
    : allAttendance;

  // Main-class tabs exist only for classes with a Regular Class record.
  // Once a tab exists, it includes that class's Regular, Trial, and Make Up records.
  const classMap = {};
  filteredAttendance.forEach(r => {
    if (isRegularClass(r.statusClass)) {
      const classLabel = getClassLabel(r.class_);
      if (classLabel && !classMap[classLabel]) {
        classMap[classLabel] = filteredAttendance.filter(row => getClassLabel(row.class_) === classLabel);
      }
    }
  });

  const classKeys = Object.keys(classMap);
  const trialAll  = filteredAttendance.filter(r => isTrialChangeClass(r.statusClass));
  const makeupAll = filteredAttendance.filter(r => isMakeUpClass(r.statusClass));
  
  const tabsContainer = document.getElementById("class-tabs-container");
  if (tabsContainer) {
    tabsContainer.innerHTML = [
      `<button class="class-tab active" data-key="__all__">Semua</button>`,
      ...classKeys.map(k => `<button class="class-tab" data-key="${escapeHtml(k)}">${escapeHtml(k)}</button>`),
      trialAll.length ? `<button class="class-tab class-tab--trial" data-key="__trial__">Trial</button>` : "",
      makeupAll.length ? `<button class="class-tab class-tab--makeup" data-key="__makeup__">Make Up</button>` : ""
    ].join("");

    tabsContainer.querySelectorAll(".class-tab").forEach(btn => {
      btn.addEventListener("click", function () {
        tabsContainer.querySelectorAll(".class-tab").forEach(t => t.classList.remove("active"));
        this.classList.add("active");
        lp3Render(this.getAttribute("data-key"));
      });
    });
  }

  window._lp3CurrentTermAll = filteredAttendance;
  window._lp3ClassMap       = classMap;
  window._lp3TrialAll       = trialAll;
  window._lp3MakeupAll      = makeupAll;

  lp3Render("__all__");
}

function lp3Render(key) {
  const all       = window._lp3CurrentTermAll || [];
  const classMap  = window._lp3ClassMap || {};
  const trialAll  = window._lp3TrialAll || [];
  const makeupAll = window._lp3MakeupAll || [];
  const isMakeUpTab = key === "__makeup__";
  const isTrialTab  = key === "__trial__";
  const rows = (isMakeUpTab ? makeupAll : isTrialTab ? trialAll : (key === "__all__" ? all : (classMap[key] || []))).slice().sort((a, b) => {
    const dateA = a.rawDate || a.dateStr || "";
    const dateB = b.rawDate || b.dateStr || "";
    if (!dateA && !dateB) return 0;
    if (!dateA) return 1;
    if (!dateB) return -1;
    return dateB.localeCompare(dateA);
  });

  const metricsEl = document.getElementById("lp3-metrics");
  const titleEl   = document.getElementById("lp3-att-title");
  const tableHead = document.getElementById("lp3-table-head");
  const tbody     = document.getElementById("lp3-tbody");
  if (!tbody) return;

  const countPresent = rows.filter(r => cleanCell(r.attendance) === "Present").length;
  const countIzin    = rows.filter(r => isLeaveAttendance(r.attendance)).length;
  const countAbsent  = rows.length - countPresent - countIzin;
  const countTrial   = rows.filter(r => isTrialChangeClass(r.statusClass)).length;
  const countMakeUp  = rows.filter(r => isMakeUpClass(r.statusClass)).length;

  if (metricsEl) metricsEl.innerHTML = `
    <div class="metric-chips">
      <div class="metric-chip">
        <div class="mc-icon mc-green">✓</div>
        <div class="mc-num green">${countPresent}</div>
        <div class="mc-lbl">Present</div>
      </div>
      <div class="metric-chip">
        <div class="mc-icon mc-red">✕</div>
        <div class="mc-num red">${countAbsent}</div>
        <div class="mc-lbl">Absent</div>
      </div>
      <div class="metric-chip">
        <div class="mc-icon mc-yellow">!</div>
        <div class="mc-num yellow">${countIzin}</div>
        <div class="mc-lbl">Izin</div>
      </div>
      <div class="metric-chip">
        <div class="mc-icon mc-blue">↗</div>
        <div class="mc-num blue">${countTrial}</div>
        <div class="mc-lbl">Trial</div>
      </div>
      <div class="metric-chip">
        <div class="mc-icon mc-purple">↺</div>
        <div class="mc-num purple">${countMakeUp}</div>
        <div class="mc-lbl">Make Up</div>
      </div>
    </div>`;

  if (titleEl) titleEl.textContent = isMakeUpTab ? "Riwayat Make Up" : isTrialTab ? "Riwayat Trial" : (key === "__all__" ? "Riwayat Kehadiran" : "Riwayat Kehadiran · " + key);
  if (tableHead) tableHead.innerHTML = isMakeUpTab
    ? `<tr><th>Tanggal</th><th>Kelas</th><th>Alasan</th></tr>`
    : `<tr><th>Tanggal</th><th>Kelas</th><th>Kehadiran</th></tr>`;

  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="3" class="att-empty">Belum ada data attendance untuk pilihan ini.</td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map(r => {
    const cls = simplifyClassName(r.class_);
    const attendanceLabel = isLeaveAttendance(r.attendance) ? "Izin" : cleanCell(r.attendance);
    const { badge, dot } = getStatusBadge(attendanceLabel);
    const typeTag = isMakeUpClass(r.statusClass)
      ? `<span class="reason-tag">Make Up</span>`
      : isTrialChangeClass(r.statusClass) ? `<span class="reason-tag">Trial Change</span>` : "";
    const previousInfo = (isMakeUpClass(r.statusClass) || isTrialChangeClass(r.statusClass))
      ? renderPreviousClassInfo(r.previousDateStr, r.previousClass) : "";
    const finalCell = isMakeUpTab
      ? escapeHtml(r.makeupReason || "-")
      : `<span class="att-badge ${badge}">${escapeHtml(attendanceLabel)}</span>`;
    return `<tr>
      <td><span class="att-dot-inline ${dot}"></span>${escapeHtml(r.dateStr || "-")}</td>
      <td>${escapeHtml(cls)}${typeTag}${previousInfo}</td>
      <td>${finalCell}</td>
    </tr>`;
  }).join("");
}

// ============================================================
// EXPIRY BANNER
// ============================================================

function createExpiryBanner(expiryStr) {
  const date = parseExpiryDate(expiryStr);
  if (!date || date.getFullYear() < 2020) {
    return `<div class="expiry-box expiry-unknown">
      <div class="ex-label">Membership Berakhir</div>
      <div class="ex-date">Belum tersedia</div>
      <div class="ex-msg">Status membership belum tersedia. Yuk hubungi Student Advisor Retention untuk bantu cek ya.</div>
    </div>`;
  }
  const days = daysUntil(date);
  let cls, daysText, msg;
  if (days < 0) {
    cls = "expiry-expired"; daysText = `${Math.abs(days)} hari yang lalu`;
    msg = "Yah, membership si kecil sudah habis. Yuk perpanjang sekarang supaya tetap bisa lanjut seru-seruan di Sparks!";
  } else if (days === 0) {
    cls = "expiry-urgent"; daysText = "Berakhir hari ini";
    msg = "Duh, membership si kecil berakhir hari ini nih. Yuk segera perpanjang supaya tetap aktif!";
  } else if (days <= 14) {
    cls = "expiry-urgent"; daysText = `${days} hari lagi`;
    msg = "Duh, membership si kecil sudah mendekati masa berakhir nih. Yuk segera perpanjang ya!";
  } else if (days <= 30) {
    cls = "expiry-soon"; daysText = `${days} hari lagi`;
    msg = "Duh, membership si kecil sudah mendekati waktu expired. Yuk mulai perpanjang dari sekarang ya.";
  } else {
    cls = "expiry-active"; daysText = `${days} hari lagi`;
    msg = "Yeay, membership si kecil masih aktif! Tinggal lanjut latihan dan have fun bareng Sparks!";
  }
  return `<div class="expiry-box ${cls}">
    <div class="ex-label">Membership Berakhir</div>
    <div class="ex-date">${escapeHtml(formatDisplayDate(expiryStr))}</div>
    <div class="ex-days">${escapeHtml(daysText)}</div>
    <div class="ex-msg">${escapeHtml(msg)}</div>
  </div>`;
}

// ============================================================
// HELPERS
// ============================================================

function getClassLabel(raw) {
  if (!raw) return "Kelas";
  const parts = raw.split("|").map(p => p.trim());
  return parts.length >= 3 ? parts[2] : raw;
}

function simplifyClassName(raw) {
  if (!raw) return "";
  const parts = raw.split("|").map(p => p.trim());
  if (parts.length >= 5) return `${parts[2]} · ${parts[3]} ${parts[4]}`;
  return raw;
}

function isRegularClass(statusClass) {
  return normalizeStatusClass(statusClass).startsWith("regular class");
}

function isTrialChangeClass(statusClass) {
  return normalizeStatusClass(statusClass).startsWith("trial change class");
}

function isMakeUpClass(statusClass) {
  return normalizeStatusClass(statusClass).startsWith("make up class");
}

function normalizeStatusClass(statusClass) {
  return cleanCell(statusClass)
    .toLowerCase()
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function isLeaveAttendance(attendance) {
  return cleanCell(attendance).includes("Leave");
}

function renderPreviousClassInfo(previousDateStr, previousClass) {
  const previousDetails = simplifyClassName(previousClass);
  if (!previousDateStr && !previousDetails) return "";
  return `<span class="prev-class-tag">↩ ${escapeHtml([previousDateStr, previousDetails].filter(Boolean).join(" · "))}</span>`;
}

function getStatusBadge(attendanceLabel) {
  if (attendanceLabel === "Present") return { badge: "badge-present", dot: "dot-present" };
  if (attendanceLabel === "Izin") return { badge: "badge-leave", dot: "dot-leave" };
  return { badge: "badge-absent", dot: "dot-absent" };
}

function formatGreetingParentName(name) {
  if (!name) return "";
  const lower = name.toLowerCase();
  if (["mom","dad","mama","papa","bunda","ayah","ibu","mr","mrs"].some(p => lower.startsWith(p))) return name;
  return `Mom/Dad ${name}`;
}

function cleanCell(v) { return (v === null || v === undefined) ? "" : String(v).trim(); }

function getSafeWhatsAppLink(link) {
  try {
    const url = new URL(link);
    return url.protocol === "https:" && url.hostname === "wa.me" ? url.href : SUPPORT_WA;
  } catch {
    return SUPPORT_WA;
  }
}

function parseExpiryDate(value) {
  if (!value || value === "-" || value.toLowerCase() === "not yet renewal" || value.toLowerCase() === "xxxxx" || value.startsWith("#")) return null;
  const fb = new Date(value);
  return isNaN(fb.getTime()) ? null : fb;
}

function formatDisplayDate(value) {
  const date = parseExpiryDate(value);
  if (!date) return value || "";
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

function daysUntil(date) {
  const today = new Date(); today.setHours(0,0,0,0);
  const t     = new Date(date); t.setHours(0,0,0,0);
  return Math.round((t - today) / 86400000);
}

function getInitials(name) {
  if (!name) return "?";
  const clean = name.replace(/\s*\(.*\)\s*$/, "").trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  return parts.length === 1 ? parts[0][0].toUpperCase() : (parts[0][0] + parts[1][0]).toUpperCase();
}

function escapeHtml(value) {
  return String(value || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

// ============================================================
// ACTIONS
// ============================================================

function goToDashboard() {
  const input = document.getElementById("phone");
  const btn   = document.getElementById("btn");
  let phone = input.value.trim().replace(/[^0-9]/g, "");
  if (!phone)           { alert("Masukkan nomor WhatsApp terlebih dahulu."); return; }
  if (phone.length < 8) { alert("Nomor terlalu pendek"); return; }
  
  if (phone.startsWith("0")) phone = "62" + phone.slice(1);
  else if (phone.startsWith("8")) phone = "62" + phone;

  btn.textContent = "Mencari...";
  btn.disabled = true;
  window.location.href = `${window.location.pathname}?phone=${encodeURIComponent(phone)}`;
}

function backToHome() { window.location.href = window.location.pathname; }
