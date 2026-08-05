// ==========================================
// 1. SUPABASE CONFIGURATION
// ==========================================
const SUPABASE_URL = "https://cfdjsilmcomflleqhqii.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_bUL-eM8mbA8fgFYoUpXVFg_DTWaUKdf";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// State Management
let currentStudent = null;
let currentAttendance = [];

// Helper: Escape HTML string to prevent XSS
function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Helper: Format Class Label "CENTER | DAY | CLASS | TIME" -> "CLASS"
function getClassLabel(raw) {
  if (!raw) return "";
  const parts = raw.split("|").map(s => s.trim());
  return parts.length >= 3 ? parts[2] : raw;
}

// ==========================================
// 2. PAGE INITIALIZATION (URL PARAMS)
// ==========================================
// document.addEventListener("DOMContentLoaded", async () => {
//   const urlParams = new URLSearchParams(window.location.search);
//   const phoneParam = urlParams.get("phone");
//   const sidParam   = urlParams.get("sid");

//   if (!phoneParam && !sidParam) {
//     showError("Data tidak ditemukan. Silakan masuk melalui link WhatsApp resmi.");
//     return;
//   }

//   await loadStudentData(phoneParam, sidParam);
// });

document.addEventListener("DOMContentLoaded", async () => {
  const app = document.getElementById("app");

  // 1. Inject base HTML layout into <main id="app">
  if (app) {
    app.innerHTML = `
      <div class="container" style="max-width: 800px; margin: 0 auto; padding: 16px;">
        <!-- Header Card -->
        <div class="card header-card" style="margin-bottom: 16px;">
          <h2 id="student-name">Loading...</h2>
          <p id="student-id" class="text-muted"></p>
          <p id="center-name" class="text-muted"></p>
          <a id="sar-wa-btn" class="btn-wa" style="display:none;" target="_blank">Hubungi Admin</a>
        </div>

        <!-- Class Filter Tabs -->
        <div id="class-tabs" class="tabs-container" style="margin-bottom: 16px;"></div>

        <!-- Metrics Chips -->
        <div id="lp3-metrics" style="margin-bottom: 16px;"></div>

        <!-- Attendance Section -->
        <div class="card table-card">
          <h3 id="lp3-att-title" style="margin-bottom: 12px;">Riwayat Kehadiran</h3>
          
          <div id="loading-state" style="padding: 16px; text-align: center;">Memuat data...</div>
          <div id="error-state" class="error-msg" style="display:none; color: red; padding: 16px; text-align: center;"></div>

          <table class="att-table" style="width: 100%;">
            <thead>
              <tr>
                <th style="text-align: left;">Tanggal</th>
                <th style="text-align: left;">Kelas</th>
                <th style="text-align: left;">Status</th>
              </tr>
            </thead>
            <tbody id="lp3-tbody"></tbody>
          </table>
        </div>
      </div>
    `;
  }

  // 2. Read URL Parameters
  const urlParams = new URLSearchParams(window.location.search);
  const phoneParam = urlParams.get("phone");
  const sidParam   = urlParams.get("sid");

  if (!phoneParam && !sidParam) {
    showError("Data tidak ditemukan. Silakan masuk melalui link WhatsApp resmi.");
    return;
  }

  await loadStudentData(phoneParam, sidParam);
});



// ==========================================
// 3. FETCH DATA FROM SUPABASE
// ==========================================
async function loadStudentData(phone, studentId) {
  try {
    showLoading(true);

    // 1. Fetch Student from `compiled_retention`
    let query = supabaseClient.from("compiled_retention").select("*");
    
    if (studentId) {
      query = query.eq("student_id", studentId);
    } else if (phone) {
      const cleanPhone = phone.replace(/[^0-9]/g, "");
      query = query.eq("phone_number", cleanPhone);
    }

    // Tie-breaker: Order by retention_x descending to get highest retention score
    const { data: studentRows, error: studentErr } = await query
      .order("retention_x", { ascending: false })
      .limit(1);

    if (studentErr) throw studentErr;

    if (!studentRows || studentRows.length === 0) {
      showError("Siswa tidak ditemukan dalam sistem.");
      return;
    }

    currentStudent = studentRows[0];

    // 2. Fetch Attendance from `attendance_logs` using student_id
    const { data: attRows, error: attErr } = await supabase
      .from("attendance_logs")
      .select("*")
      .eq("student_id", currentStudent.student_id)
      .order("date", { ascending: false });

    if (attErr) throw attErr;

    currentAttendance = attRows || [];

    // 3. Render UI
    renderHeaderInfo(currentStudent);
    renderDetailPage(currentAttendance);

  } catch (err) {
    console.error("Supabase Error:", err);
    showError("Terjadi kesalahan saat memuat data. Silakan coba lagi.");
  } finally {
    showLoading(false);
  }
}

// ==========================================
// 4. UI RENDER FUNCTIONS
// ==========================================
function renderHeaderInfo(s) {
  document.getElementById("student-name").textContent = s.student_name || "N/A";
  document.getElementById("student-id").textContent   = `ID: ${s.student_id || "-"}`;
  document.getElementById("center-name").textContent = s.center || "-";
  
  // SAR WA Button Routing
  const waBtn = document.getElementById("sar-wa-btn");
  if (waBtn && s.wa_link_sar) {
    waBtn.href = s.wa_link_sar;
    waBtn.style.display = "inline-flex";
  }
}

function renderDetailPage(attendance) {
  const classMap = {};
  const classOldFlag = {};
  const makeupAll = [];

  // Group Attendance Records
  attendance.forEach(r => {
    const isMakeUp = r.type && r.type.toLowerCase() === "make up";
    if (isMakeUp) makeupAll.push(r);

    let tabLabel = isMakeUp
      ? (r.previous_class ? getClassLabel(r.previous_class) : null)
      : getClassLabel(r.class);

    if (tabLabel) {
      if (!classMap[tabLabel]) {
        classMap[tabLabel] = [];
        classOldFlag[tabLabel] = true; // Assume old class by default
      }
      classMap[tabLabel].push(r);

      // If at least 1 record is NOT old, whole tab is active
      if (!r.is_old_class) classOldFlag[tabLabel] = false;
    }
  });

  const classKeys = Object.keys(classMap);

  // Render Dynamic Tab Buttons
  const tabsContainer = document.getElementById("class-tabs");
  if (tabsContainer) {
    const tabsHtml = [
      `<button class="class-tab active" data-key="__all__">Semua</button>`,
      ...classKeys.map(k => {
        const isOld = classOldFlag[k];
        return `<button class="class-tab${isOld ? ' class-tab--old' : ''}" data-key="${escapeHtml(k)}" data-old="${isOld}">${escapeHtml(k)}${isOld ? ' <span class="old-badge">Kelas Lama</span>' : ''}</button>`;
      }),
      makeupAll.length ? `<button class="class-tab class-tab--makeup" data-key="__makeup__">Make Up</button>` : ""
    ].join("");

    tabsContainer.innerHTML = tabsHtml;

    // Attach Click Event Listener to Tabs
    tabsContainer.querySelectorAll(".class-tab").forEach(btn => {
      btn.addEventListener("click", () => {
        tabsContainer.querySelectorAll(".class-tab").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        lp3Render(btn.dataset.key);
      });
    });
  }

  // Store variables globally for lp3Render
  window._lp3All          = attendance;
  window._lp3MakeupAll    = makeupAll;
  window._lp3ClassMap     = classMap;
  window._lp3ClassOldFlag = classOldFlag;

  // Initial Render
  lp3Render("__all__");
}

function lp3Render(key) {
  const all          = window._lp3All || [];
  const makeupAll    = window._lp3MakeupAll || [];
  const classMap     = window._lp3ClassMap || {};
  const classOldFlag = window._lp3ClassOldFlag || {};

  const isMakeUpTab = key === "__makeup__";
  const rows        = isMakeUpTab ? makeupAll : (key === "__all__" ? all : (classMap[key] || []));
  const isOldTab    = !isMakeUpTab && key !== "__all__" && classOldFlag[key];

  const metricsEl = document.getElementById("lp3-metrics");
  const titleEl   = document.getElementById("lp3-att-title");
  const tbody     = document.getElementById("lp3-tbody");
  if (!tbody) return;

  // Make Up Dedicated View
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
    renderTableRows(makeupAll, tbody);
    return;
  }

  // Standard Counter View
  const regularRows     = rows.filter(r => r.type === "Regular");
  const makeupRows      = rows.filter(r => r.type === "Make Up");
  const countHadir      = regularRows.filter(r => r.status && r.status.toLowerCase() === "present").length;
  const countTidakHadir = regularRows.filter(r => r.status && ["absent", "leave", "sakit", "izin"].includes(r.status.toLowerCase())).length;
  const countMakeUp     = makeupRows.length;

  const oldCls = isOldTab ? " metric-chip--old" : "";

  if (metricsEl) metricsEl.innerHTML = `
    <div class="metric-chips">
      <div class="metric-chip${oldCls}">
        <div class="mc-icon mc-green">✓</div>
        <div class="mc-num green">${countHadir}</div>
        <div class="mc-lbl">Hadir</div>
      </div>
      <div class="metric-chip${oldCls}">
        <div class="mc-icon mc-red">✕</div>
        <div class="mc-num red">${countTidakHadir}</div>
        <div class="mc-lbl">Tidak Hadir</div>
      </div>
      <div class="metric-chip${oldCls}">
        <div class="mc-icon mc-purple">↺</div>
        <div class="mc-num purple">${countMakeUp}</div>
        <div class="mc-lbl">Make Up</div>
      </div>
    </div>`;

  if (titleEl) titleEl.textContent = key === "__all__" ? "Semua Riwayat" : key;

  renderTableRows(rows, tbody);
}

function renderTableRows(rows, tbody) {
  if (rows.length === 0) {
    tbody.innerHTML = `<tr><td colspan="3" class="text-center p-4">Tidak ada data kehadiran.</td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map(r => {
    const status = (r.status || "").toLowerCase();
    let badgeClass = "badge-absent";
    let dotClass   = "dot-red";

    if (status === "present") {
      badgeClass = "badge-present";
      dotClass   = "dot-green";
    } else if (r.type && r.type.toLowerCase() === "make up") {
      badgeClass = "badge-makeup";
      dotClass   = "dot-purple";
    }

    const prevTag = r.previous_class ? `<span class="tag-prev">↩ ${escapeHtml(getClassLabel(r.previous_class))}</span>` : "";
    const reasonTag = (r.makeup_reason && r.makeup_reason !== "Regular Class") ? `<span class="tag-reason">${escapeHtml(r.makeup_reason)}</span>` : "";

    return `
      <tr>
        <td>${escapeHtml(r.date_str || r.date || "-")}</td>
        <td>
          <div class="class-title">${escapeHtml(getClassLabel(r.class))}</div>
          ${prevTag} ${reasonTag}
        </td>
        <td>
          <span class="status-badge ${badgeClass}">
            <span class="dot ${dotClass}"></span>${escapeHtml(r.status || "-")}
          </span>
        </td>
      </tr>
    `;
  }).join("");
}

function showLoading(isLoading) {
  const el = document.getElementById("loading-state");
  if (el) el.style.display = isLoading ? "block" : "none";
}

function showError(msg) {
  const el = document.getElementById("error-state");
  if (el) {
    el.textContent = msg;
    el.style.display = "block";
  }
}
