document.addEventListener('DOMContentLoaded', () => {
  // Initialize Lucide icons
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }

  // 1. Session & Role Verification
  const isLoggedIn = sessionStorage.getItem('nakshathra_session') === 'active';
  const role = sessionStorage.getItem('nakshathra_role');
  if (!isLoggedIn || role !== 'admin') {
    sessionStorage.clear();
    window.location.href = 'index.html';
    return;
  }

  // 2. Supabase Configurations
  const SUPABASE_URL = 'https://kmcsyjueebznvvgpjhtl.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttY3N5anVlZWJ6bnZ2Z3BqaHRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2NjQ3MjYsImV4cCI6MjA5NjI0MDcyNn0.QSWHxwKN2lwVXmjrqskxC0UahD1zPOff-alz6NPYQcM';
  let supabase = null;
  let isDbOnline = false;

  // Initialize Supabase Client
  if (window.supabase) {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }

  // 3. DOM Elements Selection
  const switchUserBtn = document.getElementById('switchUserBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const clockTime = document.getElementById('clockTime');
  const clockDate = document.getElementById('clockDate');
  const dbStatusBadge = document.getElementById('dbStatusBadge');

  // Compact SQL Copy helper
  const copySqlBtn = document.getElementById('copySqlBtn');

  // Top Stats Overview Cards
  const statTotal = document.getElementById('statTotal');
  const statMonth = document.getElementById('statMonth');
  const statYear = document.getElementById('statYear');

  // PDF report buttons
  const report7dBtn = document.getElementById('report7dBtn');
  const report14dBtn = document.getElementById('report14dBtn');
  const report60dBtn = document.getElementById('report60dBtn');
  const report90dBtn = document.getElementById('report90dBtn');

  // Main Tabs & Views
  const tabReports = document.getElementById('tabReports');
  const tabItems = document.getElementById('tabItems');
  const viewReports = document.getElementById('viewReports');
  const viewItems = document.getElementById('viewItems');

  // Sub-Tabs for Reports
  const subTabDaily = document.getElementById('subTabDaily');
  const subTabMonthly = document.getElementById('subTabMonthly');
  const subTabYearly = document.getElementById('subTabYearly');

  // Filter Bar Group Wrappers
  const filterDateGroup = document.getElementById('filterDateGroup');
  const filterMonthGroup = document.getElementById('filterMonthGroup');
  const filterYearGroup = document.getElementById('filterYearGroup');

  // Filter Input Controls
  const filterDate = document.getElementById('filterDate');
  const filterMonth = document.getElementById('filterMonth');
  const filterYear = document.getElementById('filterYear');

  // Report Display Values (Removed reportCashTotal and reportUpiTotal)
  const reportTotalAmount = document.getElementById('reportTotalAmount');
  const reportItemsTotal = document.getElementById('reportItemsTotal');
  const reportSilver = document.getElementById('reportSilver');
  const reportGold = document.getElementById('reportGold');
  const reportCosmetics = document.getElementById('reportCosmetics');
  const reportItalian = document.getElementById('reportItalian');

  // Reports Sales Table
  const reportSalesTableBody = document.getElementById('reportSalesTableBody');
  const reportSalesEmptyState = document.getElementById('reportSalesEmptyState');

  // Items Sold Elements
  const categorySubTabs = document.querySelectorAll('#categorySubTabs .sub-tab-category');
  const itemsViewTitle = document.getElementById('itemsViewTitle');
  const adminItemsTableBody = document.getElementById('adminItemsTableBody');
  const adminItemsEmptyState = document.getElementById('adminItemsEmptyState');

  // 4. Application State Data (Stored in LocalStorage)
  let historyClosures = JSON.parse(localStorage.getItem('nakshathra_history_closures')) || [];
  let currentReportMode = 'Daily'; // Daily, Monthly, Yearly
  let selectedItemCategory = 'Silver';

  // 5. Database Connection Check
  function updateDbStatusBadge(status) {
    if (!dbStatusBadge) return;
    
    dbStatusBadge.className = `db-status-badge ${status}`;
    const icon = dbStatusBadge.querySelector('i');
    const text = dbStatusBadge.querySelector('span');

    if (status === 'connected') {
      if (icon) icon.setAttribute('data-lucide', 'cloud-lightning');
      if (text) text.textContent = 'Database Connected';
      isDbOnline = true;
    } else if (status === 'setup') {
      if (icon) icon.setAttribute('data-lucide', 'alert-triangle');
      if (text) text.textContent = 'Table Setup Needed';
      isDbOnline = false;
    } else {
      if (icon) icon.setAttribute('data-lucide', 'cloud-off');
      if (text) text.textContent = 'Offline Mode';
      isDbOnline = false;
    }
    
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  }

  async function checkDbConnection() {
    if (!supabase) {
      updateDbStatusBadge('offline');
      return;
    }

    try {
      const { error } = await supabase.from('sales').select('no').limit(1);
      if (error) {
        if (error.code === 'PGRST116' || (error.message && error.message.includes('does not exist'))) {
          updateDbStatusBadge('setup');
        } else {
          updateDbStatusBadge('offline');
        }
      } else {
        updateDbStatusBadge('connected');
      }
    } catch (err) {
      updateDbStatusBadge('offline');
    }
  }

  // 6. SQL Copy Actions
  if (copySqlBtn) {
    copySqlBtn.addEventListener('click', () => {
      const codeText = document.getElementById('sqlCode').innerText;
      navigator.clipboard.writeText(codeText).then(() => {
        copySqlBtn.textContent = 'Copied!';
        copySqlBtn.style.color = 'var(--success)';
        setTimeout(() => {
          copySqlBtn.textContent = 'Copy Script';
          copySqlBtn.style.color = '';
        }, 2000);
      });
    });
  }

  // 7. System Clock Sync (Corner display)
  function updateClock() {
    const now = new Date();
    const timeOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true };
    const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    
    if (clockTime) clockTime.textContent = now.toLocaleTimeString('en-US', timeOptions);
    if (clockDate) clockDate.textContent = now.toLocaleDateString('en-US', dateOptions).toUpperCase();
  }
  updateClock();
  setInterval(updateClock, 1000);

  // 8. Switch User & Logout Functionality
  if (switchUserBtn) {
    switchUserBtn.addEventListener('click', () => {
      sessionStorage.clear();
      window.location.href = 'index.html';
    });
  }

  logoutBtn.addEventListener('click', () => {
    sessionStorage.clear();
    window.location.href = 'index.html';
  });

  // 9. Navigation Tabs Switcher (Reports vs Items Sold)
  tabReports.addEventListener('click', () => {
    tabItems.classList.remove('active');
    tabReports.classList.add('active');
    viewItems.classList.remove('active');
    viewReports.classList.add('active');
    renderReports();
  });

  tabItems.addEventListener('click', () => {
    tabReports.classList.remove('active');
    tabItems.classList.add('active');
    viewReports.classList.remove('active');
    viewItems.classList.add('active');
    renderItemsSoldView();
  });

  // 10. Sub-Tabs Filter Toggle (Daily, Monthly, Yearly)
  function switchReportMode(mode, activeBtn, inactiveBtn1, inactiveBtn2) {
    currentReportMode = mode;
    
    inactiveBtn1.classList.remove('active');
    inactiveBtn2.classList.remove('active');
    activeBtn.classList.add('active');

    if (mode === 'Daily') {
      filterDateGroup.style.display = 'flex';
      filterMonthGroup.style.display = 'none';
      filterYearGroup.style.display = 'none';
    } else if (mode === 'Monthly') {
      filterDateGroup.style.display = 'none';
      filterMonthGroup.style.display = 'flex';
      filterYearGroup.style.display = 'flex';
    } else if (mode === 'Yearly') {
      filterDateGroup.style.display = 'none';
      filterMonthGroup.style.display = 'none';
      filterYearGroup.style.display = 'flex';
    }

    renderReports();
  }

  subTabDaily.addEventListener('click', () => {
    switchReportMode('Daily', subTabDaily, subTabMonthly, subTabYearly);
  });

  subTabMonthly.addEventListener('click', () => {
    switchReportMode('Monthly', subTabMonthly, subTabDaily, subTabYearly);
  });

  subTabYearly.addEventListener('click', () => {
    switchReportMode('Yearly', subTabYearly, subTabDaily, subTabMonthly);
  });

  filterDate.addEventListener('change', renderReports);
  filterMonth.addEventListener('change', renderReports);
  filterYear.addEventListener('change', renderReports);

  // 10.5 PDF Report Generation Engine
  async function generatePDFReport(days) {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);
    start.setHours(0, 0, 0, 0);

    let salesList = [];
    let isDataLoaded = false;

    if (isDbOnline && supabase) {
      try {
        const { data, error } = await supabase
          .from('sales')
          .select('*')
          .gte('created_at', start.toISOString())
          .lte('created_at', end.toISOString())
          .order('created_at', { ascending: false });

        if (!error && data) {
          salesList = data.map(row => {
            const dateObj = new Date(row.created_at);
            const timeStr = dateObj.toLocaleString('en-US', {
              month: 'short', day: 'numeric', year: 'numeric',
              hour: '2-digit', minute: '2-digit', hour12: true
            });
            return {
              timestamp: timeStr,
              itemName: row.product_name,
              category: row.category,
              price: parseFloat(row.price),
              qty: parseInt(row.quantity),
              total: parseFloat(row.total)
            };
          });
          isDataLoaded = true;
        }
      } catch (err) {
        console.error('Error fetching PDF report data from Supabase:', err);
      }
    }

    if (!isDataLoaded) {
      // Fallback to local storage closure logs
      const startStr = start.toISOString().split('T')[0];
      const endStr = end.toISOString().split('T')[0];
      
      historyClosures.forEach(day => {
        if (day.dateStringISO >= startStr && day.dateStringISO <= endStr) {
          if (day.items && Array.isArray(day.items)) {
            day.items.forEach(item => {
              salesList.push({
                timestamp: `${day.datetime.split(',')[0]} ${item.timestamp}`,
                itemName: item.itemName,
                category: item.category,
                price: item.price,
                qty: item.qty,
                total: item.total
              });
            });
          }
        }
      });
      // Sort sales descending
      salesList.reverse(); 
    }

    let totalRevenue = 0;
    let totalItemsSold = 0;
    let silverSum = 0;
    let goldSum = 0;
    let cosmeticsSum = 0;
    let italianSum = 0;

    salesList.forEach(item => {
      totalRevenue += item.total;
      totalItemsSold += item.qty;
      if (item.category === 'Silver') silverSum += item.total;
      else if (item.category === 'Gold Covering') goldSum += item.total;
      else if (item.category === 'Cosmetics') cosmeticsSum += item.total;
      else if (item.category === 'Italian Silver') italianSum += item.total;
    });

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Pop-up blocked! Please allow pop-ups for this website to generate PDF reports.');
      return;
    }

    printWindow.document.write(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Sales Report - Past \${days} Days</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #1a1a1a;
      margin: 30px;
      padding: 0;
      line-height: 1.4;
    }
    .report-header {
      text-align: center;
      border-bottom: 3px double #d4af37;
      padding-bottom: 15px;
      margin-bottom: 25px;
    }
    .report-header h1 {
      margin: 0;
      font-size: 24px;
      color: #111;
      letter-spacing: 1px;
      text-transform: uppercase;
    }
    .report-header p {
      margin: 5px 0 0 0;
      font-size: 14px;
      color: #666;
    }
    .report-info {
      display: flex;
      justify-content: space-between;
      margin-bottom: 25px;
      font-size: 13px;
      color: #555;
      border-bottom: 1px solid #eee;
      padding-bottom: 10px;
    }
    .summary-cards {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;
      margin-bottom: 25px;
    }
    .summary-card {
      border: 1px solid #e0e0e0;
      border-radius: 6px;
      padding: 15px 20px;
      background-color: #fafafa;
    }
    .summary-card-title {
      font-size: 12px;
      text-transform: uppercase;
      color: #888;
      margin-bottom: 5px;
      font-weight: 600;
      letter-spacing: 0.5px;
    }
    .summary-card-value {
      font-size: 24px;
      font-weight: bold;
      color: #111;
    }
    .breakdown-section {
      margin-bottom: 25px;
    }
    .breakdown-section h2 {
      font-size: 16px;
      border-left: 3px solid #d4af37;
      padding-left: 8px;
      margin-bottom: 15px;
      color: #111;
    }
    .breakdown-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
    }
    .breakdown-box {
      border: 1px solid #eee;
      padding: 12px;
      border-radius: 6px;
      background-color: #fff;
      text-align: center;
    }
    .breakdown-label {
      font-size: 11px;
      color: #777;
      margin-bottom: 5px;
      font-weight: 500;
    }
    .breakdown-value {
      font-size: 15px;
      font-weight: bold;
      color: #222;
    }
    .table-section h2 {
      font-size: 16px;
      border-left: 3px solid #666;
      padding-left: 8px;
      margin-bottom: 15px;
      color: #111;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
      font-size: 12px;
    }
    th {
      background-color: #f5f5f5;
      border-bottom: 2px solid #ddd;
      padding: 10px;
      text-align: left;
      font-weight: 600;
    }
    td {
      border-bottom: 1px solid #eee;
      padding: 10px;
    }
    .price-col {
      text-align: right;
      font-family: monospace;
    }
    .qty-col {
      text-align: center;
    }
    .total-col {
      text-align: right;
      font-family: monospace;
      font-weight: 600;
    }
    .footer {
      text-align: center;
      margin-top: 40px;
      font-size: 11px;
      color: #999;
      border-top: 1px solid #eee;
      padding-top: 15px;
    }
    @media print {
      body { margin: 20px; }
      .summary-card { background-color: #fff; }
      .breakdown-box { background-color: #fff; }
      th { background-color: #f5f5f5 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="report-header">
    <h1>NAKSHATHRA SILVER & GOLD COVERING</h1>
    <p>Sales Performance Summary Report</p>
  </div>
  
  <div class="report-info">
    <div><strong>Reporting Period:</strong> \${start.toLocaleDateString('en-IN', {day: 'numeric', month: 'short', year: 'numeric'})} to \${end.toLocaleDateString('en-IN', {day: 'numeric', month: 'short', year: 'numeric'})} (\${days} Days)</div>
    <div><strong>Generated On:</strong> \${new Date().toLocaleString()}</div>
  </div>
  
  <div class="summary-cards">
    <div class="summary-card">
      <div class="summary-card-title">Total Sales Revenue</div>
      <div class="summary-card-value">\${formatRupees(totalRevenue)}</div>
    </div>
    <div class="summary-card">
      <div class="summary-card-title">Total Items Sold</div>
      <div class="summary-card-value">\${totalItemsSold}</div>
    </div>
  </div>

  <div class="breakdown-section">
    <h2>Category Breakdown</h2>
    <div class="breakdown-grid">
      <div class="breakdown-box">
        <div class="breakdown-label">Silver</div>
        <div class="breakdown-value">\${formatRupees(silverSum)}</div>
      </div>
      <div class="breakdown-box">
        <div class="breakdown-label">Gold Covering</div>
        <div class="breakdown-value">\${formatRupees(goldSum)}</div>
      </div>
      <div class="breakdown-box">
        <div class="breakdown-label">Cosmetics</div>
        <div class="breakdown-value">\${formatRupees(cosmeticsSum)}</div>
      </div>
      <div class="breakdown-box">
        <div class="breakdown-label">Italian Silver</div>
        <div class="breakdown-value">\${formatRupees(italianSum)}</div>
      </div>
    </div>
  </div>

  <div class="table-section">
    <h2>Transaction Records (\${salesList.length} Entries)</h2>
    <table>
      <thead>
        <tr>
          <th>Date & Time</th>
          <th>Item Name</th>
          <th>Category</th>
          <th style="text-align: right;">Price</th>
          <th style="text-align: center;">Qty</th>
          <th style="text-align: right;">Total</th>
        </tr>
      </thead>
      <tbody>
        \${salesList.map(sale => `
          <tr>
            <td>\${sale.timestamp}</td>
            <td style="font-weight: 600;">\${sale.itemName}</td>
            <td>\${sale.category}</td>
            <td class="price-col">\${formatRupees(sale.price)}</td>
            <td class="qty-col">\${sale.qty}</td>
            <td class="total-col">\${formatRupees(sale.total)}</td>
          </tr>
        `).join('')}
        \${salesList.length === 0 ? '<tr><td colspan="6" style="text-align: center; color: #888; padding: 20px;">No sales transactions logged during this period.</td></tr>' : ''}
      </tbody>
    </table>
  </div>

  <div class="footer">
    Nakshathra Silver & Gold Covering | Report Confirmed by Admin | Generated Automatically
  </div>
  
  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 500);
    };
  </script>
</body>
</html>
    `);
    printWindow.document.close();
  }

  // Register PDF Download click handlers
  if (report7dBtn) report7dBtn.addEventListener('click', () => generatePDFReport(7));
  if (report14dBtn) report14dBtn.addEventListener('click', () => generatePDFReport(14));
  if (report60dBtn) report60dBtn.addEventListener('click', () => generatePDFReport(60));
  if (report90dBtn) report90dBtn.addEventListener('click', () => generatePDFReport(90));

  // 11. Dynamic Populator for Year Filters
  function populateYearFilter() {
    filterYear.innerHTML = '';
    const currentYear = new Date().getFullYear();
    let years = [currentYear];

    historyClosures.forEach(day => {
      if (day.year && !years.includes(day.year)) {
        years.push(day.year);
      }
    });

    years.sort((a, b) => b - a);

    years.forEach(yr => {
      const opt = document.createElement('option');
      opt.value = yr;
      opt.textContent = yr;
      filterYear.appendChild(opt);
    });
  }

  // Helper calculation formats
  function formatRupees(value) {
    return '₹' + Number(value).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  // 12. Reports Aggregation & Rendering Engine (Supabase-linked)
  async function renderReports() {
    let salesRecords = [];
    let isDataLoaded = false;

    // A. Attempt to Query Supabase
    if (isDbOnline && supabase) {
      try {
        let queryStart = null;
        let queryEnd = null;

        if (currentReportMode === 'Daily') {
          const target = filterDate.value; // "YYYY-MM-DD"
          if (target) {
            queryStart = new Date(target + 'T00:00:00');
            queryEnd = new Date(target + 'T23:59:59.999');
          }
        } else if (currentReportMode === 'Monthly') {
          const m = parseInt(filterMonth.value);
          const y = parseInt(filterYear.value);
          queryStart = new Date(y, m - 1, 1, 0, 0, 0, 0);
          queryEnd = new Date(y, m, 0, 23, 59, 59, 999);
        } else if (currentReportMode === 'Yearly') {
          const y = parseInt(filterYear.value);
          queryStart = new Date(y, 0, 1, 0, 0, 0, 0);
          queryEnd = new Date(y, 11, 31, 23, 59, 59, 999);
        }

        if (queryStart && queryEnd) {
          const { data, error } = await supabase
            .from('sales')
            .select('*')
            .gte('created_at', queryStart.toISOString())
            .lte('created_at', queryEnd.toISOString());

          if (!error && data) {
            salesRecords = data.map(row => {
              const dateObj = new Date(row.created_at);
              const timeStr = dateObj.toLocaleString('en-US', {
                month: 'short', day: 'numeric', year: 'numeric',
                hour: '2-digit', minute: '2-digit', hour12: true
              });
              return {
                timestamp: timeStr,
                itemName: row.product_name,
                category: row.category,
                price: parseFloat(row.price),
                qty: parseInt(row.quantity),
                total: parseFloat(row.total),
                payMode: '-' // payMode is omitted in PostgreSQL
              };
            });
            isDataLoaded = true;
          }
        }
      } catch (err) {
        console.error('Failed to query Supabase reports:', err);
      }
    }

    // B. Local Storage Fallback if DB query failed
    if (!isDataLoaded) {
      let matchedDays = [];
      if (currentReportMode === 'Daily') {
        const targetDate = filterDate.value;
        matchedDays = historyClosures.filter(day => day.dateStringISO === targetDate);
      } else if (currentReportMode === 'Monthly') {
        const targetMonth = parseInt(filterMonth.value);
        const targetYear = parseInt(filterYear.value);
        matchedDays = historyClosures.filter(day => day.month === targetMonth && day.year === targetYear);
      } else if (currentReportMode === 'Yearly') {
        const targetYear = parseInt(filterYear.value);
        matchedDays = historyClosures.filter(day => day.year === targetYear);
      }

      matchedDays.forEach(day => {
        if (day.items && Array.isArray(day.items)) {
          day.items.forEach(item => {
            salesRecords.push({
              ...item,
              timestamp: `${day.datetime.split(',')[0]} ${item.timestamp}`
            });
          });
        }
      });
    }

    // C. Aggregate Figures
    let grandSum = 0;
    let totalItems = 0;
    let silverSum = 0;
    let goldSum = 0;
    let cosmeticSum = 0;
    let italianSum = 0;

    salesRecords.forEach(sale => {
      grandSum += sale.total;
      totalItems += sale.qty;

      if (sale.category === 'Silver') silverSum += sale.total;
      else if (sale.category === 'Gold Covering') goldSum += sale.total;
      else if (sale.category === 'Cosmetics') cosmeticSum += sale.total;
      else if (sale.category === 'Italian Silver') italianSum += sale.total;
    });

    // Populate Overview metrics
    reportTotalAmount.textContent = formatRupees(grandSum);
    reportItemsTotal.textContent = totalItems.toString();

    // Populate breakdowns
    reportSilver.textContent = formatRupees(silverSum);
    reportGold.textContent = formatRupees(goldSum);
    reportCosmetics.textContent = formatRupees(cosmeticSum);
    reportItalian.textContent = formatRupees(italianSum);

    // Populate Sales listing grid
    reportSalesTableBody.innerHTML = '';
    
    if (salesRecords.length === 0) {
      reportSalesEmptyState.style.display = 'flex';
      return;
    }

    reportSalesEmptyState.style.display = 'none';

    // Show newest first
    const sortedRecords = [...salesRecords].reverse();

    sortedRecords.forEach(sale => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td style="font-family: monospace; color: var(--text-secondary);">${sale.timestamp}</td>
        <td style="font-weight: 600; color: var(--text-primary);">${sale.itemName}</td>
        <td>${sale.category}</td>
        <td style="text-align: right; font-family: monospace;">${formatRupees(sale.price)}</td>
        <td style="text-align: center; font-family: monospace;">${sale.qty}</td>
        <td style="text-align: right; font-family: monospace; font-weight: 600; color: var(--gold-light);">${formatRupees(sale.total)}</td>
        <td>
          <span style="font-size: 0.75rem; padding: 0.15rem 0.4rem; border-radius: 4px; background-color: var(--border-color); font-weight: 500;">
            ${sale.payMode}
          </span>
        </td>
      `;
      reportSalesTableBody.appendChild(row);
    });
  }

  // 13. Items Sold View - Sub-category triggers
  categorySubTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      categorySubTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      selectedItemCategory = tab.getAttribute('data-category');
      
      itemsViewTitle.textContent = `${selectedItemCategory} Items Sold`;
      renderItemsSoldView();
    });
  });

  // Calculate and populate itemized breakdowns grouped by Item Name
  async function renderItemsSoldView() {
    adminItemsTableBody.innerHTML = '';
    let salesList = [];
    let isDataLoaded = false;

    // A. Query Supabase
    if (isDbOnline && supabase) {
      try {
        const { data, error } = await supabase
          .from('sales')
          .select('*')
          .eq('category', selectedItemCategory);

        if (!error && data) {
          salesList = data.map(row => ({
            itemName: row.product_name,
            qty: parseInt(row.quantity),
            total: parseFloat(row.total)
          }));
          isDataLoaded = true;
        }
      } catch (err) {
        console.error('Failed to load items sold from Supabase:', err);
      }
    }

    // B. Local fallback
    if (!isDataLoaded) {
      historyClosures.forEach(day => {
        if (day.items && Array.isArray(day.items)) {
          day.items.forEach(sale => {
            if (sale.category === selectedItemCategory) {
              salesList.push(sale);
            }
          });
        }
      });
    }

    // C. Group elements
    const itemGroups = {};
    salesList.forEach(sale => {
      const cleanKey = sale.itemName.trim().toLowerCase();
      const displayName = sale.itemName.trim();

      if (!itemGroups[cleanKey]) {
        itemGroups[cleanKey] = {
          name: displayName,
          qty: 0,
          revenue: 0
        };
      }
      
      itemGroups[cleanKey].qty += sale.qty;
      itemGroups[cleanKey].revenue += sale.total;
    });

    const itemsList = Object.values(itemGroups);

    if (itemsList.length === 0) {
      adminItemsEmptyState.style.display = 'flex';
      return;
    }

    adminItemsEmptyState.style.display = 'none';

    // Sort items by revenue generated descending
    itemsList.sort((a, b) => b.revenue - a.revenue);

    itemsList.forEach(item => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td style="font-weight: 600; color: var(--text-primary);">${item.name}</td>
        <td style="text-align: center; font-family: monospace; font-weight: 500;">${item.qty}</td>
        <td style="text-align: right; font-family: monospace; font-weight: 600; color: var(--gold-light);">${formatRupees(item.revenue)}</td>
      `;
      adminItemsTableBody.appendChild(row);
    });
  }

  // 14. Initial Run Configurations
  const todayISO = new Date().toISOString().split('T')[0];
  filterDate.value = todayISO;
  
  const currentMonthIdx = new Date().getMonth() + 1;
  filterMonth.value = currentMonthIdx;

  populateYearFilter();

  // 13.5 Load Top Live Stats (Today, Month, Year Sales)
  async function loadTopStats() {
    let todayTotal = 0;
    let monthTotal = 0;
    let yearTotal = 0;

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    if (isDbOnline && supabase) {
      try {
        const startOfYear = new Date(currentYear, 0, 1, 0, 0, 0, 0);
        const { data, error } = await supabase
          .from('sales')
          .select('total, created_at')
          .gte('created_at', startOfYear.toISOString());

        if (!error && data) {
          const todayStart = new Date();
          todayStart.setHours(0, 0, 0, 0);
          const monthStart = new Date(currentYear, now.getMonth(), 1, 0, 0, 0, 0);

          data.forEach(sale => {
            const saleDate = new Date(sale.created_at);
            const amt = parseFloat(sale.total) || 0;
            if (saleDate >= todayStart) {
              todayTotal += amt;
            }
            if (saleDate >= monthStart) {
              monthTotal += amt;
            }
            yearTotal += amt;
          });

          statTotal.textContent = formatRupees(todayTotal);
          statMonth.textContent = formatRupees(monthTotal);
          statYear.textContent = formatRupees(yearTotal);
          return;
        }
      } catch (err) {
        console.error('Error querying Supabase for top stats:', err);
      }
    }

    // Local Storage Offline Fallback
    let todaySales = JSON.parse(localStorage.getItem('nakshathra_today_sales')) || [];
    todaySales.forEach(sale => {
      todayTotal += sale.total;
    });

    let histMonthTotal = 0;
    let histYearTotal = 0;
    historyClosures.forEach(day => {
      if (day.year === currentYear) {
        histYearTotal += day.grandTotal;
        if (day.month === currentMonth) {
          histMonthTotal += day.grandTotal;
        }
      }
    });

    monthTotal = todayTotal + histMonthTotal;
    yearTotal = todayTotal + histYearTotal;

    statTotal.textContent = formatRupees(todayTotal);
    statMonth.textContent = formatRupees(monthTotal);
    statYear.textContent = formatRupees(yearTotal);
  }

  async function init() {
    await checkDbConnection();
    await loadTopStats();
    await renderReports();
  }
  init();
});
