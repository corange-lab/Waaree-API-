// SolarPulse 6-Month Analytics Dashboard Application Logic
// Powers real-time telemetry, Chart.js visualizations, historical data explorer, and data exports.

let dailyHistoryChart = null;
let intradayChart = null;
let monthlyChart = null;

let currentHistoryRange = '30d';
let allTableRecords = [];
let filteredTableRecords = [];
let currentPage = 1;
const recordsPerPage = 10;

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
  initClock();
  initEventListeners();
  initDatePickers();

  // Initial data loading
  fetchLiveTelemetry();
  fetchAnalytics();
  fetchHistory(currentHistoryRange);
  fetchIntraday();

  // Auto-refresh live data every 30 seconds
  setInterval(fetchLiveTelemetry, 30000);
});

// Update IST Clock in Header
function initClock() {
  function updateTime() {
    const now = new Date();
    // Indian Standard Time: UTC+5:30
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const ist = new Date(utc + (5.5 * 3600000));
    
    const timeStr = ist.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
    
    const clockEl = document.getElementById('current-ist-time');
    if (clockEl) clockEl.textContent = `${timeStr} IST`;
  }
  updateTime();
  setInterval(updateTime, 1000);
}

// Setup Event Listeners
function initEventListeners() {
  // Sync Button
  const syncBtn = document.getElementById('sync-btn');
  if (syncBtn) {
    syncBtn.addEventListener('click', async () => {
      const syncText = document.getElementById('sync-text');
      const syncIcon = syncBtn.querySelector('.sync-icon');
      if (syncText) syncText.textContent = 'Syncing...';
      if (syncIcon) syncIcon.style.animation = 'rotateSun 1s linear infinite';

      try {
        await fetch('/api/sync?force=true', { method: 'POST' });
        await Promise.all([
          fetchLiveTelemetry(),
          fetchAnalytics(),
          fetchHistory(currentHistoryRange),
          fetchIntraday(document.getElementById('intraday-date-picker').value)
        ]);
      } catch (err) {
        console.error('Sync failed:', err);
      } finally {
        if (syncText) syncText.textContent = 'Sync Now';
        if (syncIcon) syncIcon.style.animation = '';
      }
    });
  }

  // Export Menu Toggle
  const exportBtn = document.getElementById('export-menu-btn');
  const exportMenu = document.getElementById('export-dropdown-menu');
  if (exportBtn && exportMenu) {
    exportBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      exportMenu.classList.toggle('show');
    });

    document.addEventListener('click', () => {
      exportMenu.classList.remove('show');
    });
  }

  // Range Selector Buttons for History Chart
  const rangeBtns = document.querySelectorAll('#history-range-selector .range-btn');
  rangeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      rangeBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentHistoryRange = btn.dataset.range;
      fetchHistory(currentHistoryRange);
    });
  });

  // Table Search Input
  const searchInput = document.getElementById('table-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase().trim();
      if (!query) {
        filteredTableRecords = [...allTableRecords];
      } else {
        filteredTableRecords = allTableRecords.filter(r => r.date.toLowerCase().includes(query));
      }
      currentPage = 1;
      renderTable();
    });
  }
}

// Format current IST Date as YYYY-MM-DD
function getTodayIST() {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const ist = new Date(utc + (5.5 * 3600000));
  const y = ist.getFullYear();
  const m = String(ist.getMonth() + 1).padStart(2, '0');
  const d = String(ist.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Setup Intraday Date Picker
function initDatePickers() {
  const picker = document.getElementById('intraday-date-picker');
  if (picker) {
    picker.value = getTodayIST();
    picker.max = getTodayIST();
    picker.addEventListener('change', (e) => {
      fetchIntraday(e.target.value);
    });
  }
}

// 1. Fetch Real-time Telemetry
async function fetchLiveTelemetry() {
  try {
    const res = await fetch('/api/latest');
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();

    if (data.success) {
      // Total output
      const totalPower = data.total.powerValue || 0;
      const totalYield = data.total.yieldValue || 0;
      const totalPowerEl = document.getElementById('total-power-disp');
      const totalYieldEl = document.getElementById('total-yield-disp');
      if (totalPowerEl) totalPowerEl.innerHTML = `${totalPower.toLocaleString()} <span class="unit">Watt</span>`;
      if (totalYieldEl) totalYieldEl.innerHTML = `${totalYield.toFixed(1)} <span class="unit">kWh</span>`;

      // Waaree
      const wPower = data.waaree.powerValue || 0;
      const wYield = data.waaree.yieldValue || 0;
      const wPowerEl = document.getElementById('waaree-power-disp');
      const wYieldEl = document.getElementById('waaree-yield-disp');
      if (wPowerEl) wPowerEl.innerHTML = `${wPower.toLocaleString()} <span class="unit">Watt</span>`;
      if (wYieldEl) wYieldEl.innerHTML = `${wYield.toFixed(1)} <span class="unit">kWh</span>`;

      // Solax
      const sPower = data.solax.powerValue || 0;
      const sYield = data.solax.yieldValue || 0;
      const sPowerEl = document.getElementById('solax-power-disp');
      const sYieldEl = document.getElementById('solax-yield-disp');
      if (sPowerEl) sPowerEl.innerHTML = `${sPower.toLocaleString()} <span class="unit">Watt</span>`;
      if (sYieldEl) sYieldEl.innerHTML = `${sYield.toFixed(1)} <span class="unit">kWh</span>`;

      // System Bars (assuming 4000W combined, 2500W each peak)
      const totalBar = document.getElementById('total-power-bar');
      const wBar = document.getElementById('waaree-bar');
      const sBar = document.getElementById('solax-bar');

      if (totalBar) totalBar.style.width = `${Math.min(100, Math.round((totalPower / 4000) * 100))}%`;
      if (wBar) wBar.style.width = `${Math.min(100, Math.round((wPower / 2500) * 100))}%`;
      if (sBar) sBar.style.width = `${Math.min(100, Math.round((sPower / 2500) * 100))}%`;

      // System Split
      const splitEl = document.getElementById('system-split-disp');
      if (splitEl) {
        if (totalPower > 0) {
          const wPct = Math.round((wPower / totalPower) * 100);
          const sPct = 100 - wPct;
          splitEl.textContent = `Waaree ${wPct}% / Solax ${sPct}%`;
        } else {
          splitEl.textContent = 'Standby (No Sun)';
        }
      }

      // Status Pill
      const statusText = document.getElementById('system-status-text');
      if (statusText) {
        statusText.textContent = totalPower > 0 ? 'SYSTEM GENERATING' : 'SYSTEM STANDBY';
      }
    }
  } catch (err) {
    console.error('Failed to fetch live telemetry:', err);
  }
}

// 2. Fetch 6-Month Analytics & KPIs
async function fetchAnalytics() {
  try {
    const res = await fetch('/api/analytics');
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();

    if (data.success && data.analytics) {
      const a = data.analytics;

      document.getElementById('kpi-total-yield').innerHTML = `${a.totalYield.total.toLocaleString()} <span class="unit">kWh</span>`;
      document.getElementById('kpi-days-tracked').textContent = `${a.totalDays} days in database`;

      document.getElementById('kpi-daily-avg').innerHTML = `${a.dailyAverageYield.total.toFixed(1)} <span class="unit">kWh/day</span>`;

      if (a.bestDay) {
        document.getElementById('kpi-best-yield').innerHTML = `${a.bestDay.totalYield.toFixed(1)} <span class="unit">kWh</span>`;
        document.getElementById('kpi-best-date').textContent = a.bestDay.date;
      }

      if (a.peakPowerEver) {
        document.getElementById('kpi-peak-power').innerHTML = `${a.peakPowerEver.power.toLocaleString()} <span class="unit">Watt</span>`;
        document.getElementById('kpi-peak-date').textContent = a.peakPowerEver.date || '--';
        document.getElementById('today-peak-power-disp').innerHTML = `${(a.bestDay?.peakPower || 0).toLocaleString()} <span class="unit">Watt</span>`;
      }

      document.getElementById('kpi-savings').textContent = `₹${a.estimatedSavingsINR.toLocaleString()}`;
      document.getElementById('kpi-co2').innerHTML = `${a.estimatedCo2SavedKg.toLocaleString()} <span class="unit">kg</span>`;

      // Render Monthly Chart
      renderMonthlyChart(a.monthlyBreakdown);
    }
  } catch (err) {
    console.error('Failed to fetch analytics:', err);
  }
}

// 3. Fetch Historical Data (Range)
async function fetchHistory(range = '30d') {
  try {
    const res = await fetch(`/api/history?range=${range}`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();

    if (data.success && Array.isArray(data.data)) {
      renderDailyHistoryChart(data.data);

      // Save for table view (most recent first)
      allTableRecords = [...data.data].reverse();
      filteredTableRecords = [...allTableRecords];
      currentPage = 1;
      renderTable();
    }
  } catch (err) {
    console.error('Failed to fetch history:', err);
  }
}

// 4. Fetch Intraday 15-Minute Readings
async function fetchIntraday(date = '') {
  try {
    const target = date || getTodayIST();
    const res = await fetch(`/api/intraday?date=${target}`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();

    if (data.success && Array.isArray(data.data)) {
      renderIntradayChart(data.data, target);
    }
  } catch (err) {
    console.error('Failed to fetch intraday:', err);
  }
}

// Render Daily History Chart (Chart.js)
function renderDailyHistoryChart(summaries) {
  const ctx = document.getElementById('daily-history-chart');
  if (!ctx) return;

  const labels = summaries.map(s => {
    const parts = s.date.split('-');
    return `${parts[2]}/${parts[1]}`; // DD/MM
  });

  const waareeYields = summaries.map(s => s.waaree?.finalYield || 0);
  const solaxYields = summaries.map(s => s.solax?.finalYield || 0);
  const totalYields = summaries.map(s => s.total?.finalYield || 0);

  if (dailyHistoryChart) {
    dailyHistoryChart.destroy();
  }

  dailyHistoryChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Total Combined (kWh)',
          data: totalYields,
          type: 'line',
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          borderWidth: 2.5,
          tension: 0.35,
          pointRadius: summaries.length > 40 ? 0 : 3,
          pointHoverRadius: 6,
          pointBackgroundColor: '#10b981',
          yAxisID: 'y'
        },
        {
          label: 'Waaree Solar (kWh)',
          data: waareeYields,
          backgroundColor: 'rgba(245, 158, 11, 0.85)',
          borderRadius: 4,
          stack: 'inverters'
        },
        {
          label: 'Solax Solar (kWh)',
          data: solaxYields,
          backgroundColor: 'rgba(6, 182, 212, 0.85)',
          borderRadius: 4,
          stack: 'inverters'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: {
          position: 'top',
          labels: {
            color: '#94a3b8',
            font: { family: "'Plus Jakarta Sans', sans-serif", size: 12 },
            boxWidth: 14,
            usePointStyle: true
          }
        },
        tooltip: {
          backgroundColor: 'rgba(18, 24, 38, 0.95)',
          titleColor: '#f8fafc',
          bodyColor: '#cbd5e1',
          borderColor: 'rgba(255, 255, 255, 0.15)',
          borderWidth: 1,
          padding: 12,
          boxPadding: 6,
          callbacks: {
            title: (items) => {
              const idx = items[0].dataIndex;
              return `Date: ${summaries[idx].date}`;
            },
            label: (item) => `${item.dataset.label}: ${item.raw.toFixed(1)} kWh`
          }
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(255, 255, 255, 0.04)' },
          ticks: {
            color: '#64748b',
            font: { size: 11 },
            maxRotation: 0,
            autoSkip: true,
            maxTicksLimit: 14
          }
        },
        y: {
          grid: { color: 'rgba(255, 255, 255, 0.06)' },
          ticks: {
            color: '#64748b',
            font: { size: 11 },
            callback: (v) => `${v} kWh`
          }
        }
      }
    }
  });
}

// Render Intraday Power Bell Curve (Chart.js)
function renderIntradayChart(readings, dateStr) {
  const ctx = document.getElementById('intraday-chart');
  if (!ctx) return;

  const labels = readings.map(r => r.istTime || r.timestamp.substr(11, 5));
  const waareeWatts = readings.map(r => r.waareePower || 0);
  const solaxWatts = readings.map(r => r.solaxPower || 0);
  const totalWatts = readings.map(r => r.totalPower || (r.waareePower + r.solaxPower) || 0);

  if (intradayChart) {
    intradayChart.destroy();
  }

  intradayChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Total Power (W)',
          data: totalWatts,
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.15)',
          borderWidth: 2.5,
          fill: true,
          tension: 0.35,
          pointRadius: readings.length > 30 ? 0 : 3
        },
        {
          label: 'Waaree (W)',
          data: waareeWatts,
          borderColor: '#f59e0b',
          backgroundColor: 'rgba(245, 158, 11, 0.05)',
          borderWidth: 2,
          fill: false,
          tension: 0.35,
          pointRadius: 0
        },
        {
          label: 'Solax (W)',
          data: solaxWatts,
          borderColor: '#06b6d4',
          backgroundColor: 'rgba(6, 182, 212, 0.05)',
          borderWidth: 2,
          fill: false,
          tension: 0.35,
          pointRadius: 0
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: {
          position: 'top',
          labels: {
            color: '#94a3b8',
            font: { size: 11 },
            usePointStyle: true
          }
        },
        tooltip: {
          backgroundColor: 'rgba(18, 24, 38, 0.95)',
          borderColor: 'rgba(255, 255, 255, 0.15)',
          borderWidth: 1,
          padding: 10,
          callbacks: {
            label: (item) => `${item.dataset.label}: ${item.raw.toLocaleString()} Watt`
          }
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(255, 255, 255, 0.04)' },
          ticks: { color: '#64748b', font: { size: 10 }, maxTicksLimit: 10 }
        },
        y: {
          grid: { color: 'rgba(255, 255, 255, 0.06)' },
          ticks: {
            color: '#64748b',
            font: { size: 10 },
            callback: (v) => `${v} W`
          }
        }
      }
    }
  });
}

// Render Monthly Breakdown Chart
function renderMonthlyChart(months) {
  const ctx = document.getElementById('monthly-chart');
  if (!ctx || !months) return;

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const labels = months.map(m => {
    const [y, mm] = m.month.split('-');
    return `${monthNames[parseInt(mm, 10) - 1]} ${y.substr(2)}`;
  });

  const waareeYields = months.map(m => m.waareeYield);
  const solaxYields = months.map(m => m.solaxYield);

  if (monthlyChart) {
    monthlyChart.destroy();
  }

  monthlyChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Waaree (kWh)',
          data: waareeYields,
          backgroundColor: 'rgba(245, 158, 11, 0.85)',
          borderRadius: 6
        },
        {
          label: 'Solax (kWh)',
          data: solaxYields,
          backgroundColor: 'rgba(6, 182, 212, 0.85)',
          borderRadius: 6
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: { color: '#94a3b8', font: { size: 11 }, usePointStyle: true }
        },
        tooltip: {
          backgroundColor: 'rgba(18, 24, 38, 0.95)',
          borderColor: 'rgba(255, 255, 255, 0.15)',
          borderWidth: 1,
          padding: 10,
          callbacks: {
            footer: (items) => {
              const total = items.reduce((sum, item) => sum + item.raw, 0);
              return `Total Month: ${total.toFixed(1)} kWh`;
            }
          }
        }
      },
      scales: {
        x: {
          stacked: true,
          grid: { color: 'rgba(255, 255, 255, 0.04)' },
          ticks: { color: '#64748b', font: { size: 10 } }
        },
        y: {
          stacked: true,
          grid: { color: 'rgba(255, 255, 255, 0.06)' },
          ticks: {
            color: '#64748b',
            font: { size: 10 },
            callback: (v) => `${v} kWh`
          }
        }
      }
    }
  });
}

// 5. Render Historical Table with Pagination
function renderTable() {
  const tbody = document.getElementById('history-table-body');
  const countEl = document.getElementById('table-record-count');
  const paginationEl = document.getElementById('table-pagination');
  if (!tbody) return;

  const total = filteredTableRecords.length;
  if (countEl) countEl.textContent = `Showing ${total} records`;

  if (total === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="loading-cell">No records found matching filter.</td></tr>';
    if (paginationEl) paginationEl.innerHTML = '';
    return;
  }

  const totalPages = Math.ceil(total / recordsPerPage);
  if (currentPage > totalPages) currentPage = totalPages;
  if (currentPage < 1) currentPage = 1;

  const startIndex = (currentPage - 1) * recordsPerPage;
  const pageRecords = filteredTableRecords.slice(startIndex, startIndex + recordsPerPage);

  tbody.innerHTML = pageRecords.map(r => {
    const wYield = r.waaree?.finalYield ?? 0;
    const sYield = r.solax?.finalYield ?? 0;
    const tYield = r.total?.finalYield ?? 0;
    const tPeak = r.total?.peakPower ?? 0;

    let statusTag = '<span class="status-tag optimal">Optimal</span>';
    if (tYield < 8) statusTag = '<span class="status-tag low">Low Sun</span>';
    else if (tYield < 14) statusTag = '<span class="status-tag moderate">Normal</span>';

    return `
      <tr>
        <td class="cell-highlight">${r.date}</td>
        <td class="cell-amber">${wYield.toFixed(1)} kWh</td>
        <td class="cell-cyan">${sYield.toFixed(1)} kWh</td>
        <td class="cell-highlight" style="font-weight: 700;">${tYield.toFixed(1)} kWh</td>
        <td>${tPeak.toLocaleString()} W</td>
        <td>${r.readingsCount || 1}</td>
        <td>${statusTag}</td>
      </tr>
    `;
  }).join('');

  // Pagination Controls
  if (paginationEl) {
    let paginationHtml = '';
    paginationHtml += `<button class="page-btn" ${currentPage === 1 ? 'disabled' : ''} onclick="changePage(${currentPage - 1})">&laquo; Prev</button>`;
    
    for (let p = Math.max(1, currentPage - 2); p <= Math.min(totalPages, currentPage + 2); p++) {
      paginationHtml += `<button class="page-btn ${p === currentPage ? 'active' : ''}" onclick="changePage(${p})">${p}</button>`;
    }
    
    paginationHtml += `<button class="page-btn" ${currentPage === totalPages ? 'disabled' : ''} onclick="changePage(${currentPage + 1})">Next &raquo;</button>`;
    paginationEl.innerHTML = paginationHtml;
  }
}

// Global page change helper
window.changePage = function(p) {
  currentPage = p;
  renderTable();
};
