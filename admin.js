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
  const logoutBtn = document.getElementById('logoutBtn');
  const clockTime = document.getElementById('clockTime');
  const clockDate = document.getElementById('clockDate');
  const dbStatusBadge = document.getElementById('dbStatusBadge');

  // SQL Collapsible Guide Controls
  const sqlSetupBox = document.getElementById('sqlSetupBox');
  const sqlTrigger = document.getElementById('sqlTrigger');
  const sqlContent = document.getElementById('sqlContent');
  const sqlChevron = document.getElementById('sqlChevron');
  const copySqlBtn = document.getElementById('copySqlBtn');

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
      sqlSetupBox.style.borderColor = 'var(--border-color)';
    } else if (status === 'setup') {
      if (icon) icon.setAttribute('data-lucide', 'alert-triangle');
      if (text) text.textContent = 'Table Setup Needed';
      isDbOnline = false;
      
      // Auto expand SQL instructions to help the Admin
      sqlContent.classList.add('expanded');
      sqlChevron.style.transform = 'rotate(180deg)';
      sqlSetupBox.style.borderColor = 'var(--error)';
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

  // 6. SQL Collapsible Box Actions
  if (sqlTrigger) {
    sqlTrigger.addEventListener('click', () => {
      sqlContent.classList.toggle('expanded');
      const isExpanded = sqlContent.classList.contains('expanded');
      sqlChevron.style.transform = isExpanded ? 'rotate(180deg)' : 'rotate(0deg)';
    });
  }

  if (copySqlBtn) {
    copySqlBtn.addEventListener('click', () => {
      const codeText = document.getElementById('sqlCode').innerText;
      navigator.clipboard.writeText(codeText).then(() => {
        copySqlBtn.textContent = 'Copied!';
        copySqlBtn.style.color = 'var(--success)';
        setTimeout(() => {
          copySqlBtn.textContent = 'Copy Code';
          copySqlBtn.style.color = 'var(--text-secondary)';
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

  // 8. Logout Functionality
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

  async function init() {
    await checkDbConnection();
    await renderReports();
  }
  init();
});
