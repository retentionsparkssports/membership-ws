// ============================================================
// SPARKS MEMBERSHIP CARD - SUPABASE VERSION
// ============================================================

// 1. SUPABASE CONFIGURATION
const SUPABASE_URL = "https://YOUR_SUPABASE_PROJECT_ID.supabase.co";
const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const LOGO_URL      = "logo.png";
const SUPPORT_WA    = "https://wa.me/6281390006606";
const SUPPORT_LABEL = "Tim Customer Support Sparks Sports";

const app = document.getElementById("app");

// ============================================================
// ICONS
// ============================================================

const ICON_PHONE  = `<svg viewBox="0 0 24 24" fill="none" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v2.2a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 3.4 2 2 0 0 1 4.11 1.2h2.2a2 2 0 0 1 2 1.72c.13.96.35 1.9.66 2.8a2 2 0 0 1-.45 2.1L7.6 8.75a16 16 0 0 0 7.65 7.65l.93-.93a2 2 0 0 1 2.1-.45c.9.31 1.84.53 2.8.66A2 2 0 0 1 22 16.92Z"/></svg>`;
const ICON_SEARCH = `<svg viewBox="0 0 24 24" fill="none" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-3.5-3.5"></path></svg>`;
const ICON_WA     = `<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>`;

// ============================================================
// INIT & ROUTING
// ============================================================

document.addEventListener("DOMContentLoaded", async () => {
  const params    = new URLSearchParams(window.location.search);
  const phone     = params.get("phone");
  const studentId = params.get("sid");

  // LP3: Student Detail & Attendance View
  if (studentId) {
    renderLoadingPage("Memuat detail attendance", "Mohon tunggu sebentar.");
    try {
      const student = await fetchStudentById(studentId);
      if (!student) { renderNotFoundPage(phone || studentId); return; }
      
      const attendance = await fetchAttendanceByStudentId(studentId);
      renderDetailPage(student, attendance, phone);
    } catch (err) {
      console.error(err);
      renderErrorPage("Gagal memuat detail kehadiran.");
    }
    return;
  }

  // LP2: Dashboard View
  if (phone) {
    renderLoadingPage("Mencari data membership", "Mohon tunggu sebentar. Kami sedang mencocokkan nomor WhatsApp.");
    try {
      const students = await fetchStudentsByPhone(phone);
      if (!students || !students.length) { renderNotFoundPage(phone); return; }
      renderDashboardPage(students);
    } catch (err) {
      console.error(err);
      renderErrorPage("Terjadi kesalahan saat memuat data membership.");
    }
    return;
  }

  // LP1: Landing Page
  renderLandingPage();
});

// ============================================================
// SUPABASE DATA FETCHING
// ============================================================

async function fetchStudentsByPhone(rawPhone) {
  const normalized = normalizePhone(rawPhone);
  
  const { data, error } = await supabase
    .from("students")
    .select("*")
    .eq("phone", normalized)
    .order("retention_x", { ascending: false })
    .order("expiry_date", { ascending: false });

  if (error) throw error;
  
  // Deduplicate by student_id (keep highest retention_x / latest expiry)
  const uniqueMap = new Map();
  data.forEach(student => {
    if (!uniqueMap.has(student.student_id)) {
      uniqueMap.set(student.student_id, student);
    }
  });

  return Array.from(uniqueMap.values());
}

async function fetchStudentById(studentId) {
  const { data, error } = await supabase
    .from("students")
    .select("*")
    .eq("student_id", studentId)
    .single();

  if (error) throw error;
  return data;
}

async function fetchAttendanceByStudentId(studentId) {
  const { data, error } = await supabase
    .from("attendances")
    .select("*")
    .eq("student_id", studentId)
    .order("attendance_date", { ascending: false });

  if (error) throw error;
  return data;
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
// LP2: DASHBOARD
// ============================================================

function renderDashboardPage(students) {
  document.body.className = "dashboard-page";
  const phone        = new URLSearchParams(window.location.search).get("phone") || "";
  const parentsName  = formatGreetingParentName(students[0]?.parents_name || "");
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
  const centerText = student.center_name || student.branch_code || "Center belum tersedia";
  const sid        = encodeURIComponent(student.student_id);
  const ph         = encodeURIComponent(phone);
  return `
    <div class="student-card">
      <div class="card-top">
        <div class="avatar">${getInitials(student.student_name)}</div>
        <div class="card-info">
          <div class="student-name">${escapeHtml(student.student_name || "Nama belum tersedia")}</div>
          <div class="student-id">${escapeHtml(student.student_id || "")}</div>
          <div><span class="center-badge">${escapeHtml(centerText)}</span></div>
        </div>
      </div>
      ${createExpiryBanner(student.expiry_date)}
      <a class="detail-btn" href="?phone=${ph}&sid=${sid}">Lihat Detail Attendance →</a>
    </div>
  `;
}

// ============================================================
// LP3: STUDENT DETAIL
// ============================================================

function renderDetailPage(student, attendance, phone) {
  document.body.className = "dashboard-page";
  const centerText = student.center_name || student.branch_code || "Center belum tersedia";
  const ph         = encodeURIComponent(phone || "");
  const waTarget   = student.wa_link || SUPPORT_WA;
  const waLabel    = student.wa_link ? "Hubungi Student Advisor" : `Hubungi ${SUPPORT_LABEL}`;

  const classMap = {};
  const classOldFlag = {};
  attendance.forEach(r => {
    const isMakeUp = r.type && r.type.toLowerCase() === "make up";
    let tabLabel = isMakeUp 
      ? (r.previous_class ? getClassLabel(r.previous_class) : null)
      : getClassLabel(r.class_name);

    if (tabLabel) {
      if (!classMap[tabLabel]) { classMap[tabLabel] = []; classOldFlag[tabLabel] = true; }
      classMap[tabLabel].push(r);
      if (!r.is_old_class) classOldFlag[tabLabel] = false;
    }
  });

  const classKeys = Object.keys(classMap);
  const makeupAll  = attendance.filter(r => r.type && r.type.toLowerCase() === "make up");
  const tabsHtml  = [
    `<button class="class-tab active" data-key="__all__">Semua</button>`,
    ...classKeys.map(k => {
      const isOld = classOldFlag[k];
      return `<button class="class-tab${isOld ? ' class-tab--old' : ''}" data-key="${escapeHtml(k)}">${escapeHtml(k)}${isOld ? ' <span class="old-badge">Kelas Lama</span>' : ''}</button>`;
    }),
    makeupAll.length ? `<button class="class-tab class-tab--makeup" data-key="__makeup__">Make Up</button>` : ""
  ].join("");

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
          <div class="avatar">${getInitials(student.student_name)}</div>
          <div class="card-info">
            <div class="student-name">${escapeHtml(student.student_name || "")}</div>
            <div class="student-id">${escapeHtml(student.student_id || "")}</div>
            <div><span class="center-badge">${escapeHtml(centerText)}</span></div>
          </div>
        </div>
        ${createExpiryBanner(student.expiry_date)}
      </div>

      <div class="term-label">
        <span class="term-badge">Summer Term 2026</span>
      </div>

      <div class="class-tabs-wrap">${tabsHtml}</div>
      <div class="metrics-row" id="lp3-metrics"></div>

      <div class="att-card">
        <div class="att-header">
          <div class="att-title" id="lp3-att-title">Riwayat Kehadiran</div>
        </div>
        <div class="att-legend">
          <span class="leg-item"><span class="att-dot-inline dot-present"></span>Hadir</span>
          <span class="leg-item"><span class="att-dot-inline dot-makeup"></span>Make up</span>
          <span class="leg-item"><span class="att-dot-inline dot-absent"></span>Absen</span>
          <span class="leg-item"><span class="att-dot-inline dot-leave"></span>Izin</span>
        </div>
        <div class="att-table-wrap">
          <table class="att-table">
            <thead><tr><th>Tanggal</th><th>Kelas</th><th>Status</th></tr></thead>
            <tbody id="lp3-tbody"></tbody>
          </table>
        </div>
      </div>

      <a class="wa-help-btn wa-help-btn--full" href="${waTarget}" target="_blank">${ICON_WA} ${waLabel}</a>
      <a class="back-link" href="?phone=${ph}">← Kembali ke daftar anak</a>
    </div>
  `;

  window._lp3All       = attendance;
  window._lp3MakeupAll = makeupAll;
  window._lp3ClassMap  = classMap;

  setTimeout(() => {
    document.querySelectorAll(".class-tab").forEach(btn => {
      btn.addEventListener("click", function () {
        document.querySelectorAll(".class-tab").forEach(t => t.classList.remove("active"));
        this.classList.add("active");
        lp3Render(this.getAttribute("data-key"));
      });
    });
    lp3Render("__all__");
  }, 0);
}

function lp3Render(key) {
  const all       = window._lp3All || [];
  const makeupAll = window._lp3MakeupAll || [];
  const classMap  = window._lp3ClassMap || {};

  const isMakeUpTab = key === "__makeup__";
  const rows        = isMakeUpTab ? makeupAll : (key === "__all__" ? all : (classMap[key] || []));

  const metricsEl = document.getElementById("lp3-metrics");
  const titleEl   = document.getElementById("lp3-att-title");
  const tbody     = document.getElementById("lp3-tbody");
  if (!tbody) return;

  if (isMakeUpTab) {
    if (metricsEl) metricsEl.innerHTML = `
      <div class="metric-chips">
        <div class="metric-chip metric-chip--makeup">
          <div class="mc-icon mc-purple">↺</div>
          <div class="mc-num purple">${makeupAll.length}</div>
          <div class="mc-lbl">Total Make Up</div>
        </div>
      </div>`;
    if (titleEl) titleEl.textContent = "Riwayat Make Up";

    if (!makeupAll.length) {
      tbody.innerHTML = `<tr><td colspan="3" class="att-empty">Belum ada data make up.</td></tr>`;
      return;
    }
    tbody.innerHTML = makeupAll.map(r => {
      const cls            = simplifyClassName(r.class_name);
      const { badge, dot } = getStatusBadge(r.status);
      const reasonTag      = r.makeup_reason ? `<span class="reason-tag">${escapeHtml(r.makeup_reason)}</span>` : "";
      const prevTag        = r.previous_class ? `<span class="prev-class-tag">↩ ${escapeHtml(simplifyClassName(r.previous_class))}</span>` : "";
      return `<tr>
        <td><span class="att-dot-inline ${dot}"></span>${escapeHtml(formatDisplayDate(r.attendance_date))}</td>
        <td>${escapeHtml(cls)}${reasonTag}${prevTag}</td>
        <td><span class="att-badge ${badge}">${escapeHtml(r.status)}</span></td>
      </tr>`;
    }).join("");
    return;
  }

  const regularRows     = rows.filter(r => r.type === "Regular");
  const makeupRows      = rows.filter(r => r.type === "Make Up");
  const countHadir      = regularRows.filter(r => r.status.toLowerCase() === "present").length;
  const countTidakHadir = regularRows.filter(r => ["absent", "leave", "sakit", "izin"].includes(r.status.toLowerCase())).length;
  const countMakeUp     = makeupRows.length;

  if (metricsEl) metricsEl.innerHTML = `
    <div class="metric-chips">
      <div class="metric-chip">
        <div class="mc-icon mc-green">✓</div>
        <div class="mc-num green">${countHadir}</div>
        <div class="mc-lbl">Hadir</div>
      </div>
      <div class="metric-chip">
        <div class="mc-icon mc-red">✕</div>
        <div class="mc-num red">${countTidakHadir}</div>
        <div class="mc-lbl">Tidak Hadir</div>
      </div>
      <div class="metric-chip">
        <div class="mc-icon mc-purple">↺</div>
        <div class="mc-num purple">${countMakeUp}</div>
        <div class="mc-lbl">Make Up</div>
      </div>
    </div>`;

  if (titleEl) titleEl.textContent = key === "__all__" ? "Riwayat Kehadiran" : "Riwayat Kehadiran · " + key;

  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="3" class="att-empty">Belum ada data attendance untuk periode ini.</td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map(r => {
    const cls            = simplifyClassName(r.class_name);
    const { badge, dot } = getStatusBadge(r.status);
    const reasonTag      = r.makeup_reason && !["Regular Class", ""].includes(r.makeup_reason)
      ? `<span class="reason-tag">${escapeHtml(r.makeup_reason)}</span>` : "";
    return `<tr>
      <td><span class="att-dot-inline ${dot}"></span>${escapeHtml(formatDisplayDate(r.attendance_date))}</td>
      <td>${escapeHtml(cls)}${reasonTag}</td>
      <td><span class="att-badge ${badge}">${escapeHtml(r.status)}</span></td>
    </tr>`;
  }).join("");
}

// ============================================================
// EXPIRY BANNER & HELPERS
// ============================================================

function createExpiryBanner(expiryIsoStr) {
  if (!expiryIsoStr) {
    return `<div class="expiry-box expiry-unknown">
      <div class="ex-label">Membership Berakhir</div>
      <div class="ex-date">Belum tersedia</div>
      <div class="ex-msg">Status membership belum tersedia. Yuk hubungi Student Advisor Retention untuk bantu cek ya.</div>
    </div>`;
  }

  const date = new Date(expiryIsoStr);
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
    <div class="ex-date">${escapeHtml(formatDisplayDate(expiryIsoStr))}</div>
    <div class="ex-days">${escapeHtml(daysText)}</div>
    <div class="ex-msg">${escapeHtml(msg)}</div>
  </div>`;
}

function normalizePhone(phone) {
  let p = String(phone || "").replace(/[\s\-\(\)\+\.]/g, "").trim();
  if (!p) return "";
  if (p.startsWith("0")) p = "62" + p.slice(1);
  else if (p.startsWith("8")) p = "62" + p;
  if (p.startsWith("620")) p = "62" + p.slice(3);
  return p;
}

function formatDisplayDate(isoStr) {
  if (!isoStr) return "";
  const date = new Date(isoStr);
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

function daysUntil(date) {
  const today = new Date(); today.setHours(0,0,0,0);
  const t     = new Date(date); t.setHours(0,0,0,0);
  return Math.round((t - today) / 86400000);
}

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

function getStatusBadge(status) {
  const s = String(status || "").toLowerCase();
  if (s === "present") return { badge: "badge-present", dot: "dot-present" };
  if (s === "make up") return { badge: "badge-makeup",  dot: "dot-makeup"  };
  if (["absent", "leave", "izin", "sakit"].includes(s)) return { badge: "badge-absent", dot: "dot-absent" };
  return { badge: "badge-present", dot: "dot-present" };
}

function formatGreetingParentName(name) {
  if (!name) return "";
  const lower = name.toLowerCase();
  if (["mom","dad","mama","papa","bunda","ayah","ibu","mr","mrs"].some(p => lower.startsWith(p))) return name;
  return `Mom/Dad ${name}`;
}

function getInitials(name) {
  const clean = String(name || "").replace(/\s*\(.*\)\s*$/, "").trim();
  if (!clean) return "?";
  const parts = clean.split(/\s+/).filter(Boolean);
  return parts.length === 1 ? parts[0][0].toUpperCase() : (parts[0][0] + parts[1][0]).toUpperCase();
}

function escapeHtml(v) {
  return String(v || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

function renderBrandLogo() {
  return `<div class="logo-wrap">
    <img src="${LOGO_URL}" class="logo-img" alt="Sparks Sports Academy"
      onerror="this.style.display='none';this.nextElementSibling.style.display='block';"/>
    <div class="logo-fallback" style="display:none;">Sparks <span class="star">★</span></div>
  </div>`;
}

function renderLoadingPage(title, subtitle) {
  document.body.className = "center-page";
  app.innerHTML = `<div class="card"><div class="search-visual">${ICON_SEARCH}</div>${renderBrandLogo()}<div class="divider"></div><p class="headline loading-dots">${escapeHtml(title)}</p><p class="sub">${escapeHtml(subtitle)}</p></div>`;
}

function renderNotFoundPage(phone) {
  document.body.className = "center-page";
  app.innerHTML = `<div class="card"><div class="search-visual">${ICON_SEARCH}</div><h2 class="headline">Nomor Tidak Ditemukan</h2><p class="error-text">Kami belum menemukan data membership untuk nomor:</p><div class="phone-box">+${escapeHtml(normalizePhone(phone))}</div><p class="error-text">Coba cek kembali angka yang dimasukkan. Jika nomor sudah benar tetapi data tetap tidak muncul, silakan hubungi Student Advisor Retention center kamu untuk pengecekan data.</p><br><a class="wa-help-btn" href="${SUPPORT_WA}" target="_blank">${ICON_WA} Hubungi ${SUPPORT_LABEL}</a><br><br><a class="link-button" onclick="backToHome()">← Coba Nomor Lain</a></div>`;
}

function renderErrorPage(message) {
  document.body.className = "center-page";
  app.innerHTML = `<div class="card"><div class="icon warning">⚠️</div><h2 class="headline">Data Belum Bisa Dimuat</h2><p class="error-text">${escapeHtml(message)}</p><br><a class="link-button" onclick="backToHome()">← Kembali</a></div>`;
}

function goToDashboard() {
  const input = document.getElementById("phone");
  let raw = input.value.trim().replace(/[^0-9]/g, "");
  if (!raw) { alert("Masukkan nomor WhatsApp terlebih dahulu."); return; }
  window.location.href = `${window.location.pathname}?phone=${encodeURIComponent(normalizePhone(raw))}`;
}

function backToHome() { window.location.href = window.location.pathname; }