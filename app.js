/* ═══════════════════════════════════════════════
   ACCESS BANK — BRANCH EXPENSE DASHBOARD
   app.js  |  Pure ES6, no external libraries
   ═══════════════════════════════════════════════ */

'use strict';

/* ────────────────────────────────────────────────
   1. MOCK DATA
   ──────────────────────────────────────────────── */

const CATEGORIES = [
  { id: 'office',    name: 'Office Supplies',      color: '#E8580A', budget: 180000 },
  { id: 'repairs',   name: 'Repairs & Maintenance', color: '#58A6FF', budget: 350000 },
  { id: 'transport', name: 'Transport & Logistics', color: '#3FB950', budget: 220000 },
  { id: 'other',     name: 'Other',                 color: '#D29922', budget: 120000 },
];

const VENDORS = {
  office:    ['Balogun Stationery Ltd', 'Office Mart Sango', 'PaperHouse NG', 'Printville Ota'],
  repairs:   ['FixIt Pro Services', 'Moshood Electricals', 'Comet Engineering', 'QuickFix Ota'],
  transport: ['Kingsley Courier', 'SwiftRide Logistics', 'Tunde Transport Co.', 'Lagos Dispatch'],
  other:     ['Petty Cash', 'Direct Payment', 'Vendor Direct', 'External Services'],
};

const APPROVERS = ['Sanmi Israel', 'Bukola Adeola', 'Chukwuemeka Obi', 'Tola Adeyemi'];
const STATUSES  = ['Approved', 'Approved', 'Approved', 'Approved', 'Pending', 'Flagged'];

// Month-by-month totals for the past 6 months (Jan–Jun 2026)
const TREND_DATA = {
  labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
  office:    [142000, 156000, 133000, 167000, 144000, 0],
  repairs:   [275000, 301000, 289000, 312000, 264000, 0],
  transport: [188000, 177000, 203000, 195000, 210000, 0],
  other:     [ 95000,  88000,  91000,  99000,  87000, 0],
};

// Seeded deterministic pseudo-random for reproducible mock data
function mulberry32(a) {
  return function () {
    let t = (a += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260601); // seed = date

function randInt(min, max) { return Math.floor(rand() * (max - min + 1)) + min; }
function randFrom(arr)     { return arr[Math.floor(rand() * arr.length)]; }

// Generate transactions for current month (June 2026)
function generateTransactions(month = 6, count = 48) {
  const txns = [];
  for (let i = 0; i < count; i++) {
    const cat  = randFrom(CATEGORIES);
    const day  = randInt(1, 3); // days elapsed in June
    const date = `2026-0${month}-0${day < 10 ? day : day}`;
    const amt  = randInt(8000, Math.round(cat.budget / 4));
    txns.push({
      id:       `TXN-${String(i + 1).padStart(4, '0')}`,
      date:     `2026-06-${String(randInt(1, 3)).padStart(2, '0')}`,
      desc:     generateDesc(cat.id),
      category: cat.name,
      catId:    cat.id,
      vendor:   randFrom(VENDORS[cat.id]),
      amount:   amt,
      approver: randFrom(APPROVERS),
      status:   randFrom(STATUSES),
    });
  }
  // Sort newest first
  return txns.sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
}

function generateDesc(catId) {
  const descs = {
    office:    ['Printer cartridge restock','A4 paper reams (10 cartons)','Binding materials','Pen & marker set','Letterhead printing','Filing cabinets — stationery'],
    repairs:   ['Generator maintenance (quarterly)','AC unit servicing — banking hall','CCTV system repair','ATM enclosure repair','Electrical rewiring — vault room','Plumbing — staff restrooms'],
    transport: ['Courier — interbank document dispatch','Staff welfare — shuttle fuel','CBN report delivery — Abuja','Cash-in-transit support','Branch AGM logistics','ATM cash replenishment run'],
    other:     ['Sundry petty cash','Staff training materials','Miscellaneous operational','Regulatory notice printing','Client entertainment — branch','External consulting fee'],
  };
  return randFrom(descs[catId]);
}

// ── Compute current-month category totals from transactions
function computeCategoryTotals(txns) {
  const totals = {};
  CATEGORIES.forEach(c => { totals[c.id] = 0; });
  txns.forEach(t => { totals[t.catId] = (totals[t.catId] || 0) + t.amount; });
  return totals;
}

// ── Populate trend June column from transactions
function populateTrend(totals) {
  TREND_DATA.office[5]    = totals.office    || 0;
  TREND_DATA.repairs[5]   = totals.repairs   || 0;
  TREND_DATA.transport[5] = totals.transport || 0;
  TREND_DATA.other[5]     = totals.other     || 0;
}

// Generate heatmap data: 4 categories × 30 days
function generateHeatmap() {
  const data = {};
  CATEGORIES.forEach(cat => {
    data[cat.id] = Array.from({ length: 30 }, (_, i) => {
      // Spending occurs on business days roughly
      const day = i + 1;
      const dayOfWeek = new Date(2026, 5, day).getDay(); // 0=Sun
      if (dayOfWeek === 0 || dayOfWeek === 6) return 0;
      return rand() < 0.55 ? randInt(5000, Math.round(cat.budget / 8)) : 0;
    });
  });
  return data;
}

/* ────────────────────────────────────────────────
   2. STATE
   ──────────────────────────────────────────────── */

const state = {
  transactions: [],
  filtered:     [],
  catTotals:    {},
  heatmapData:  {},
  page:         1,
  pageSize:     10,
  searchQuery:  '',
  filterCat:    'all',
  filterStatus: 'all',
};

/* ────────────────────────────────────────────────
   3. INIT
   ──────────────────────────────────────────────── */

function init() {
  state.transactions = generateTransactions();
  state.catTotals    = computeCategoryTotals(state.transactions);
  state.heatmapData  = generateHeatmap();
  state.filtered     = [...state.transactions];

  populateTrend(state.catTotals);

  renderKPIs();
  renderTrendChart();
  renderDonutChart();
  renderBudgetBarChart();
  renderHeatmap();
  renderCategoryCards();
  renderTable();
  renderBudgetSection();
  renderVarianceChart();
  renderAlerts();
  bindEvents();
}

/* ────────────────────────────────────────────────
   4. KPI CARDS
   ──────────────────────────────────────────────── */

function fmt(n) {
  return '₦' + n.toLocaleString('en-NG', { maximumFractionDigits: 0 });
}

function renderKPIs() {
  const total  = Object.values(state.catTotals).reduce((a, b) => a + b, 0);
  const budget = CATEGORIES.reduce((a, c) => a + c.budget, 0);
  const pct    = Math.round((total / budget) * 100);
  const txnCnt = state.transactions.length;

  document.getElementById('kpiTotal').textContent    = fmt(total);
  document.getElementById('kpiBudget').textContent   = fmt(budget);
  document.getElementById('kpiRemaining').textContent= fmt(budget - total);
  document.getElementById('kpiTxns').textContent     = txnCnt;

  document.getElementById('kpiTotalDelta').textContent     = '+9.4% vs May 2026';
  document.getElementById('kpiBudgetDelta').textContent    = `${pct}% utilised`;
  document.getElementById('kpiRemainingDelta').textContent = '27 days left in June';
  document.getElementById('kpiTxnsDelta').textContent      = `${txnCnt} logged this month`;

  // colour delta
  if (pct > 80) {
    document.getElementById('kpiBudgetDelta').classList.add('negative');
  } else if (pct < 60) {
    document.getElementById('kpiBudgetDelta').classList.add('positive');
  }
}

/* ────────────────────────────────────────────────
   5. CANVAS HELPERS
   ──────────────────────────────────────────────── */

const DARK   = '#161B22';
const MUTED  = '#8B949E';
const BORDER = 'rgba(255,255,255,0.07)';

function dpr(canvas) {
  const ratio = window.devicePixelRatio || 1;
  const w = canvas.offsetWidth;
  const h = canvas.offsetHeight || parseInt(canvas.getAttribute('height'));
  canvas.width  = w * ratio;
  canvas.height = h * ratio;
  const ctx = canvas.getContext('2d');
  ctx.scale(ratio, ratio);
  return { ctx, w, h };
}

function drawYGrid(ctx, w, h, max, steps, padL = 56, padT = 20, padB = 36) {
  const plotH = h - padT - padB;
  for (let i = 0; i <= steps; i++) {
    const y = padT + plotH * (1 - i / steps);
    ctx.beginPath();
    ctx.strokeStyle = BORDER;
    ctx.lineWidth = 1;
    ctx.moveTo(padL, y); ctx.lineTo(w - 10, y);
    ctx.stroke();
    ctx.fillStyle = MUTED;
    ctx.font = '9px IBM Plex Mono, monospace';
    ctx.textAlign = 'right';
    const val = Math.round(max / steps * i);
    ctx.fillText(val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val, padL - 6, y + 3);
  }
}

/* ────────────────────────────────────────────────
   6. TREND CHART (line chart)
   ──────────────────────────────────────────────── */

function renderTrendChart() {
  const canvas = document.getElementById('trendChart');
  if (!canvas) return;
  const { ctx, w, h } = dpr(canvas);

  const padL = 58, padT = 20, padB = 38, padR = 16;
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;
  const labels = TREND_DATA.labels;
  const n = labels.length;

  // Compute monthly totals
  const totals = labels.map((_, i) =>
    TREND_DATA.office[i] + TREND_DATA.repairs[i] +
    TREND_DATA.transport[i] + TREND_DATA.other[i]
  );
  const max = Math.max(...totals) * 1.15;

  ctx.clearRect(0, 0, w, h);
  drawYGrid(ctx, w, h, max, 4, padL, padT, padB);

  // x-axis labels
  ctx.fillStyle = MUTED;
  ctx.font = '10px Sora, sans-serif';
  ctx.textAlign = 'center';
  labels.forEach((lbl, i) => {
    const x = padL + (i / (n - 1)) * plotW;
    ctx.fillText(lbl, x, h - padB + 16);
  });

  // Stacked area per category
  const catKeys = ['office', 'transport', 'other', 'repairs'];
  const catColors = { office: '#E8580A', repairs: '#58A6FF', transport: '#3FB950', other: '#D29922' };

  // Draw filled area for total
  const totalGrad = ctx.createLinearGradient(0, padT, 0, padT + plotH);
  totalGrad.addColorStop(0, 'rgba(232,88,10,0.18)');
  totalGrad.addColorStop(1, 'rgba(232,88,10,0)');

  ctx.beginPath();
  totals.forEach((val, i) => {
    const x = padL + (i / (n - 1)) * plotW;
    const y = padT + plotH * (1 - val / max);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.lineTo(padL + plotW, padT + plotH);
  ctx.lineTo(padL, padT + plotH);
  ctx.closePath();
  ctx.fillStyle = totalGrad;
  ctx.fill();

  // Draw total line
  ctx.beginPath();
  totals.forEach((val, i) => {
    const x = padL + (i / (n - 1)) * plotW;
    const y = padT + plotH * (1 - val / max);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.strokeStyle = '#E8580A';
  ctx.lineWidth = 2.5;
  ctx.lineJoin = 'round';
  ctx.stroke();

  // Data points
  totals.forEach((val, i) => {
    const x = padL + (i / (n - 1)) * plotW;
    const y = padT + plotH * (1 - val / max);
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fillStyle = i === n - 1 ? '#E8580A' : DARK;
    ctx.strokeStyle = '#E8580A';
    ctx.lineWidth = 2;
    ctx.fill();
    ctx.stroke();

    // Value label on last point
    if (i === n - 1) {
      ctx.fillStyle = '#E8580A';
      ctx.font = 'bold 10px IBM Plex Mono, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(fmt(val), x, y - 10);
    }
  });
}

/* ────────────────────────────────────────────────
   7. DONUT CHART
   ──────────────────────────────────────────────── */

function renderDonutChart() {
  const canvas = document.getElementById('donutChart');
  if (!canvas) return;
  const { ctx, w, h } = dpr(canvas);

  const total = Object.values(state.catTotals).reduce((a, b) => a + b, 0);
  const cx = w / 2, cy = h / 2 - 10;
  const r = Math.min(cx, cy) * 0.72;
  const innerR = r * 0.58;

  let startAngle = -Math.PI / 2;
  ctx.clearRect(0, 0, w, h);

  CATEGORIES.forEach(cat => {
    const val   = state.catTotals[cat.id] || 0;
    const sweep = (val / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, startAngle, startAngle + sweep);
    ctx.closePath();
    ctx.fillStyle = cat.color;
    ctx.fill();
    startAngle += sweep;
  });

  // Inner hole
  ctx.beginPath();
  ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
  ctx.fillStyle = DARK;
  ctx.fill();

  // Centre label
  ctx.fillStyle = '#E6EDF3';
  ctx.font = 'bold 14px IBM Plex Mono, monospace';
  ctx.textAlign = 'center';
  ctx.fillText(fmt(total), cx, cy + 4);
  ctx.fillStyle = MUTED;
  ctx.font = '9px Sora, sans-serif';
  ctx.fillText('Total Spent', cx, cy + 17);

  // Legend
  const legend = document.getElementById('donutLegend');
  legend.innerHTML = '';
  CATEGORIES.forEach(cat => {
    const val = state.catTotals[cat.id] || 0;
    const pct = total > 0 ? Math.round((val / total) * 100) : 0;
    legend.innerHTML += `
      <div class="legend-item">
        <span class="legend-dot" style="background:${cat.color}"></span>
        <span class="legend-name">${cat.name}</span>
        <span class="legend-val">${fmt(val)}</span>
        <span class="legend-pct">${pct}%</span>
      </div>`;
  });
}

/* ────────────────────────────────────────────────
   8. BUDGET VS ACTUAL BAR CHART
   ──────────────────────────────────────────────── */

function renderBudgetBarChart() {
  const canvas = document.getElementById('budgetChart');
  if (!canvas) return;
  const { ctx, w, h } = dpr(canvas);

  const padL = 160, padT = 16, padB = 30, padR = 20;
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;

  const maxVal = Math.max(...CATEGORIES.map(c => Math.max(c.budget, state.catTotals[c.id] || 0))) * 1.1;
  ctx.clearRect(0, 0, w, h);

  const barH = Math.floor((plotH / CATEGORIES.length) * 0.38);
  const groupH = plotH / CATEGORIES.length;

  // X axis gridlines & labels
  const steps = 4;
  for (let i = 0; i <= steps; i++) {
    const x = padL + (i / steps) * plotW;
    ctx.beginPath();
    ctx.strokeStyle = BORDER;
    ctx.lineWidth = 1;
    ctx.moveTo(x, padT); ctx.lineTo(x, padT + plotH);
    ctx.stroke();
    ctx.fillStyle = MUTED;
    ctx.font = '9px IBM Plex Mono, monospace';
    ctx.textAlign = 'center';
    const val = Math.round(maxVal / steps * i);
    ctx.fillText(val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val, x, padT + plotH + 16);
  }

  CATEGORIES.forEach((cat, i) => {
    const gy = padT + i * groupH;
    const budget = cat.budget;
    const actual = state.catTotals[cat.id] || 0;

    // Category label
    ctx.fillStyle = '#E6EDF3';
    ctx.font = '11px Sora, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(cat.name, padL - 10, gy + groupH / 2 - 2);

    // Budget bar (background, grey)
    const bw = (budget / maxVal) * plotW;
    ctx.fillStyle = 'rgba(255,255,255,0.07)';
    ctx.beginPath();
    roundRect(ctx, padL, gy + groupH / 2 - barH - 3, bw, barH, 3);
    ctx.fill();

    // Actual bar
    const aw = (actual / maxVal) * plotW;
    const over = actual > budget;
    ctx.fillStyle = over ? '#F85149' : cat.color;
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    roundRect(ctx, padL, gy + groupH / 2 + 1, aw, barH, 3);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Actual amount label
    ctx.fillStyle = over ? '#F85149' : '#E6EDF3';
    ctx.font = '10px IBM Plex Mono, monospace';
    ctx.textAlign = 'left';
    ctx.fillText(fmt(actual), padL + aw + 5, gy + groupH / 2 + barH / 2 + 4);
  });

  // Legend
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.fillRect(padL + plotW - 130, padT, 10, 8);
  ctx.fillStyle = MUTED;
  ctx.font = '9px Sora, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('Budget', padL + plotW - 116, padT + 7);
  ctx.fillStyle = '#E8580A';
  ctx.fillRect(padL + plotW - 60, padT, 10, 8);
  ctx.fillStyle = MUTED;
  ctx.fillText('Actual', padL + plotW - 46, padT + 7);
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/* ────────────────────────────────────────────────
   9. HEATMAP
   ──────────────────────────────────────────────── */

function renderHeatmap() {
  const container = document.getElementById('heatmapContainer');
  if (!container) return;

  // Day labels (1–30)
  const days = Array.from({ length: 30 }, (_, i) => i + 1);
  const maxVal = Math.max(...CATEGORIES.flatMap(c => state.heatmapData[c.id]));

  let html = '<table class="heatmap-table"><thead><tr><th></th>';
  days.forEach(d => {
    const dow = new Date(2026, 5, d).toLocaleDateString('en', { weekday: 'short' }).slice(0, 1);
    html += `<th>${d <= 3 ? d : (d % 5 === 0 ? d : '')}</th>`;
  });
  html += '</tr></thead><tbody>';

  CATEGORIES.forEach(cat => {
    html += `<tr><td class="row-label">${cat.name}</td>`;
    state.heatmapData[cat.id].forEach((val, di) => {
      const pct = maxVal > 0 ? val / maxVal : 0;
      const alpha = val === 0 ? 0 : 0.12 + pct * 0.88;
      const bg = val === 0
        ? 'rgba(255,255,255,0.04)'
        : `rgba(${hexToRgb(cat.color)}, ${alpha.toFixed(2)})`;
      const tip = val > 0 ? `Jun ${di + 1}: ${fmt(val)}` : `Jun ${di + 1}: No spend`;
      html += `<td class="heatmap-cell" style="background:${bg}" data-tip="${tip}"></td>`;
    });
    html += '</tr>';
  });
  html += '</tbody></table>';
  container.innerHTML = html;
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}

/* ────────────────────────────────────────────────
   10. CATEGORY CARDS
   ──────────────────────────────────────────────── */

function renderCategoryCards() {
  const container = document.getElementById('categoryCards');
  if (!container) return;
  const total = Object.values(state.catTotals).reduce((a, b) => a + b, 0);
  container.innerHTML = CATEGORIES.map(cat => {
    const val  = state.catTotals[cat.id] || 0;
    const pct  = Math.round((val / cat.budget) * 100);
    const share= total > 0 ? Math.round((val / total) * 100) : 0;
    const cls  = pct > 90 ? 'danger' : pct > 70 ? 'warning' : 'ok';
    return `
      <div class="cat-card">
        <div class="cat-card-name">${cat.name}</div>
        <div class="cat-card-amount">${fmt(val)}</div>
        <div class="cat-card-bar-wrap">
          <div class="cat-card-bar budget-bar-fill ${cls}" style="width:${Math.min(pct,100)}%; background:${cat.color}"></div>
        </div>
        <div class="cat-card-meta">${pct}% of ₦${(cat.budget/1000).toFixed(0)}k budget · ${share}% of total spend</div>
      </div>`;
  }).join('');
}

/* ────────────────────────────────────────────────
   11. TRANSACTIONS TABLE
   ──────────────────────────────────────────────── */

function applyFilters() {
  const q   = state.searchQuery.toLowerCase();
  const cat = state.filterCat;
  const sts = state.filterStatus;
  state.filtered = state.transactions.filter(t => {
    const matchQ   = !q || t.desc.toLowerCase().includes(q) || t.category.toLowerCase().includes(q) || t.vendor.toLowerCase().includes(q);
    const matchCat = cat === 'all' || t.category === cat;
    const matchSts = sts === 'all' || t.status === sts;
    return matchQ && matchCat && matchSts;
  });
  state.page = 1;
  renderTable();
}

function renderTable() {
  const tbody = document.getElementById('expenseTableBody');
  const count = document.getElementById('tableCount');
  const pg    = document.getElementById('pagination');
  if (!tbody) return;

  const total = state.filtered.length;
  const pages = Math.ceil(total / state.pageSize);
  const start = (state.page - 1) * state.pageSize;
  const slice = state.filtered.slice(start, start + state.pageSize);

  tbody.innerHTML = slice.map(t => `
    <tr>
      <td class="td-date">${t.date}</td>
      <td>${t.desc}</td>
      <td><span class="status-badge" style="background:${catColor(t.catId)}22; color:${catColor(t.catId)}">${t.category}</span></td>
      <td class="td-vendor">${t.vendor}</td>
      <td class="td-amount">${fmt(t.amount)}</td>
      <td class="td-vendor">${t.approver}</td>
      <td><span class="status-badge status-${t.status.toLowerCase()}">${t.status}</span></td>
    </tr>`).join('');

  count.textContent = `Showing ${start + 1}–${Math.min(start + state.pageSize, total)} of ${total} entries`;

  // Pagination
  pg.innerHTML = '';
  if (pages <= 1) return;
  for (let i = 1; i <= pages; i++) {
    const btn = document.createElement('button');
    btn.className = 'pg-btn' + (i === state.page ? ' active' : '');
    btn.textContent = i;
    btn.addEventListener('click', () => { state.page = i; renderTable(); });
    pg.appendChild(btn);
  }
}

function catColor(id) {
  return CATEGORIES.find(c => c.id === id)?.color || '#888';
}

/* ────────────────────────────────────────────────
   12. BUDGET SECTION
   ──────────────────────────────────────────────── */

function renderBudgetSection() {
  const container = document.getElementById('budgetBars');
  if (!container) return;
  container.innerHTML = CATEGORIES.map(cat => {
    const val = state.catTotals[cat.id] || 0;
    const pct = Math.min(Math.round((val / cat.budget) * 100), 100);
    const cls = pct > 90 ? 'danger' : pct > 70 ? 'warning' : 'ok';
    return `
      <div class="budget-bar-item">
        <div class="budget-bar-header">
          <span class="budget-bar-name">${cat.name}</span>
          <span class="budget-bar-meta">${fmt(val)} / ${fmt(cat.budget)}</span>
        </div>
        <div class="budget-bar-track">
          <div class="budget-bar-fill ${cls}" style="width:${pct}%"></div>
        </div>
        <div class="budget-bar-pct">${pct}% utilised — ${fmt(cat.budget - val)} remaining</div>
      </div>`;
  }).join('');
}

/* ────────────────────────────────────────────────
   13. VARIANCE CHART
   ──────────────────────────────────────────────── */

function renderVarianceChart() {
  const canvas = document.getElementById('varianceChart');
  if (!canvas) return;
  const { ctx, w, h } = dpr(canvas);

  const padL = 56, padT = 20, padB = 40, padR = 16;
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;
  const labels = TREND_DATA.labels;
  const n = labels.length;

  // Compute variance (actual - budget) per month (mock budget same each month)
  const monthBudget = CATEGORIES.reduce((a, c) => a + c.budget, 0);
  const variances = labels.map((_, i) => {
    const actual = TREND_DATA.office[i] + TREND_DATA.repairs[i] + TREND_DATA.transport[i] + TREND_DATA.other[i];
    return actual - monthBudget;
  });

  const maxAbs = Math.max(...variances.map(Math.abs)) * 1.2;
  ctx.clearRect(0, 0, w, h);

  // Zero line
  const zeroY = padT + plotH / 2;
  ctx.beginPath();
  ctx.strokeStyle = BORDER;
  ctx.lineWidth = 1;
  ctx.moveTo(padL, zeroY); ctx.lineTo(w - padR, zeroY);
  ctx.stroke();

  // Grid
  for (let s = 1; s <= 2; s++) {
    [-1, 1].forEach(dir => {
      const y = padT + plotH * (0.5 - dir * s / 4);
      ctx.beginPath(); ctx.strokeStyle = BORDER; ctx.lineWidth = 0.5;
      ctx.moveTo(padL, y); ctx.lineTo(w - padR, y); ctx.stroke();
      const val = Math.round(maxAbs * s / 2);
      ctx.fillStyle = MUTED; ctx.font = '9px IBM Plex Mono, monospace';
      ctx.textAlign = 'right';
      ctx.fillText((dir > 0 ? '+' : '-') + (val / 1000).toFixed(0) + 'k', padL - 5, y + 3);
    });
  }

  // Bars
  const bw = (plotW / n) * 0.5;
  variances.forEach((v, i) => {
    const x   = padL + (i / (n - 1)) * plotW;
    const barH = (Math.abs(v) / maxAbs) * (plotH / 2);
    const y   = v >= 0 ? zeroY - barH : zeroY;
    ctx.fillStyle = v >= 0 ? 'rgba(248,81,73,0.8)' : 'rgba(63,185,80,0.8)';
    ctx.fillRect(x - bw / 2, y, bw, barH);

    ctx.fillStyle = MUTED; ctx.font = '10px Sora, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(labels[i], x, h - padB + 16);
  });

  // Legend
  ctx.fillStyle = 'rgba(248,81,73,0.8)'; ctx.fillRect(padL, padT, 10, 8);
  ctx.fillStyle = MUTED; ctx.font = '9px Sora, sans-serif'; ctx.textAlign = 'left';
  ctx.fillText('Over budget', padL + 13, padT + 7);
  ctx.fillStyle = 'rgba(63,185,80,0.8)'; ctx.fillRect(padL + 90, padT, 10, 8);
  ctx.fillStyle = MUTED; ctx.fillText('Under budget', padL + 103, padT + 7);
}

/* ────────────────────────────────────────────────
   14. ALERTS
   ──────────────────────────────────────────────── */

function renderAlerts() {
  const list = document.getElementById('alertsList');
  if (!list) return;

  const alerts = [];
  CATEGORIES.forEach(cat => {
    const val = state.catTotals[cat.id] || 0;
    const pct = (val / cat.budget) * 100;
    if (pct > 90) {
      alerts.push({ type: 'danger', title: `${cat.name} — Critical`, body: `${pct.toFixed(0)}% of budget consumed. Only ${fmt(cat.budget - val)} remaining.` });
    } else if (pct > 70) {
      alerts.push({ type: 'warning', title: `${cat.name} — Watch`, body: `${pct.toFixed(0)}% utilised. Monitor closely for rest of month.` });
    }
  });

  alerts.push({ type: 'info', title: 'Flagged Transactions', body: `${state.transactions.filter(t => t.status === 'Flagged').length} transactions require review by Ops Head.` });

  list.innerHTML = alerts.map(a => `
    <div class="alert-item alert-${a.type}">
      <div class="alert-title">${a.title}</div>
      <div class="alert-body">${a.body}</div>
    </div>`).join('');
}

/* ────────────────────────────────────────────────
   15. NAVIGATION & EVENTS
   ──────────────────────────────────────────────── */

function bindEvents() {
  // Sidebar nav
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', e => {
      e.preventDefault();
      const sec = item.dataset.section;
      document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
      item.classList.add('active');
      document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
      document.getElementById(`section-${sec}`).classList.add('active');
      document.getElementById('pageTitle').textContent =
        sec.charAt(0).toUpperCase() + sec.slice(1).replace('-', ' ');

      // Re-render canvas charts when section becomes visible
      if (sec === 'overview')     { renderTrendChart(); renderDonutChart(); renderBudgetBarChart(); }
      if (sec === 'budget')       { renderVarianceChart(); }
    });
  });

  // Search & filters
  document.getElementById('txnSearch').addEventListener('input', e => {
    state.searchQuery = e.target.value;
    applyFilters();
  });
  document.getElementById('txnCategory').addEventListener('change', e => {
    state.filterCat = e.target.value;
    applyFilters();
  });
  document.getElementById('txnStatus').addEventListener('change', e => {
    state.filterStatus = e.target.value;
    applyFilters();
  });

  // Export CSV
  document.getElementById('exportBtn').addEventListener('click', exportCSV);

  // Redraw canvas on window resize
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      renderTrendChart();
      renderDonutChart();
      renderBudgetBarChart();
      renderVarianceChart();
    }, 200);
  });
}

/* ────────────────────────────────────────────────
   16. CSV EXPORT
   ──────────────────────────────────────────────── */

function exportCSV() {
  const headers = ['Date', 'Description', 'Category', 'Vendor', 'Amount (NGN)', 'Approved By', 'Status'];
  const rows = state.filtered.map(t =>
    [t.date, `"${t.desc}"`, `"${t.category}"`, `"${t.vendor}"`, t.amount, t.approver, t.status].join(',')
  );
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `AccessBank_SangoOta_Expenses_June2026.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ────────────────────────────────────────────────
   17. BOOT
   ──────────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', init);
