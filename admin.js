document.addEventListener('DOMContentLoaded', () => {
  // Initialize Lucide icons
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }

  // 1. Session & Role Verification
  // Must be logged in as 'admin' to access this page
  const isLoggedIn = sessionStorage.getItem('nakshathra_session') === 'active';
  const role = sessionStorage.getItem('nakshathra_role');
  if (!isLoggedIn || role !== 'admin') {
    sessionStorage.clear();
    window.location.href = 'index.html';
    return;
  }

  // 2. DOM Elements Selection
  const logoutBtn = document.getElementById('logoutBtn');
  const clockTime = document.getElementById('clockTime');
  const clockDate = document.getElementById('clockDate');

  // Main Tabs & Views
  const tabReports = document.getElementById('tabReports');
  const tabItems = document.getElementById('tabItems');
  const viewReports = document.getElementById('viewReports');
  const viewItems = document.getElementById('viewItems');

  // Sub-Tabs for Reports (Daily, Monthly, Yearly)
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

  // Report Display Values
  const reportTotalAmount = document.getElementById('reportTotalAmount');
  const reportCashTotal = document.getElementById('reportCashTotal');
  const reportUpiTotal = document.getElementById('reportUpiTotal');
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

  // 3. Application State Data (Stored in LocalStorage)
  let historyClosures = JSON.parse(localStorage.getItem('nakshathra_history_closures')) || [];
  let currentReportMode = 'Daily'; // Daily, Monthly, Yearly
  let selectedItemCategory = 'Silver';

  // 4. System Clock Sync (Corner display)
  function updateClock() {
    const now = new Date();
    const timeOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true };
    const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    
    if (clockTime) clockTime.textContent = now.toLocaleTimeString('en-US', timeOptions);
    if (clockDate) clockDate.textContent = now.toLocaleDateString('en-US', dateOptions).toUpperCase();
  }
  updateClock();
  setInterval(updateClock, 1000);

  // 5. Logout Functionality
  logoutBtn.addEventListener('click', () => {
    sessionStorage.clear();
    window.location.href = 'index.html';
  });

  // 6. Navigation Tabs Switcher (Reports vs Items Sold)
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

  // 7. Sub-Tabs Filter Toggle (Daily, Monthly, Yearly)
  function switchReportMode(mode, activeBtn, inactiveBtn1, inactiveBtn2) {
    currentReportMode = mode;
    
    // Toggle active tab style
    inactiveBtn1.classList.remove('active');
    inactiveBtn2.classList.remove('active');
    activeBtn.classList.add('active');

    // Toggle filter input fields visibility
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

  // Trigger reports update when filters are adjusted
  filterDate.addEventListener('change', renderReports);
  filterMonth.addEventListener('change', renderReports);
  filterYear.addEventListener('change', renderReports);

  // 8. Dynamic Populator for Year Filters
  function populateYearFilter() {
    filterYear.innerHTML = '';
    const currentYear = new Date().getFullYear();
    let years = [currentYear];

    historyClosures.forEach(day => {
      if (day.year && !years.includes(day.year)) {
        years.push(day.year);
      }
    });

    // Sort descending (newest years first)
    years.sort((a, b) => b - a);

    years.forEach(yr => {
      const opt = document.createElement('option');
      opt.value = yr;
      opt.textContent = yr;
      filterYear.appendChild(opt);
    });
  }

  // 9. Calculation & Rendering Engines (Reports)
  function formatRupees(value) {
    return '₹' + Number(value).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  function renderReports() {
    let matchedDays = [];

    // Filter closures based on chosen interval parameters
    if (currentReportMode === 'Daily') {
      const targetDate = filterDate.value; // format: "YYYY-MM-DD"
      matchedDays = historyClosures.filter(day => day.dateStringISO === targetDate);
    } else if (currentReportMode === 'Monthly') {
      const targetMonth = parseInt(filterMonth.value);
      const targetYear = parseInt(filterYear.value);
      matchedDays = historyClosures.filter(day => day.month === targetMonth && day.year === targetYear);
    } else if (currentReportMode === 'Yearly') {
      const targetYear = parseInt(filterYear.value);
      matchedDays = historyClosures.filter(day => day.year === targetYear);
    }

    // Accumulate sums
    let grandSum = 0;
    let cashSum = 0;
    let upiSum = 0;
    let silverSum = 0;
    let goldSum = 0;
    let cosmeticSum = 0;
    let italianSum = 0;
    let allItemsLogged = [];

    matchedDays.forEach(day => {
      grandSum += day.grandTotal;
      cashSum += day.cashTotal;
      upiSum += day.upiTotal;
      silverSum += day.silverTotal;
      goldSum += day.goldTotal;
      cosmeticSum += day.cosmeticsTotal;
      italianSum += day.italianTotal;

      // Extract individual transactions if embedded
      if (day.items && Array.isArray(day.items)) {
        day.items.forEach(item => {
          // If transaction does not have date, assign parent closure timestamp
          allItemsLogged.push({
            ...item,
            closureDate: day.datetime.split(',')[0] // extract closure date text
          });
        });
      }
    });

    // Populate Overview Stats
    reportTotalAmount.textContent = formatRupees(grandSum);
    reportCashTotal.textContent = formatRupees(cashSum);
    reportUpiTotal.textContent = formatRupees(upiSum);

    // Populate Product Breakdowns
    reportSilver.textContent = formatRupees(silverSum);
    reportGold.textContent = formatRupees(goldSum);
    reportCosmetics.textContent = formatRupees(cosmeticSum);
    reportItalian.textContent = formatRupees(italianSum);

    // Populate Table Listing
    reportSalesTableBody.innerHTML = '';
    
    if (allItemsLogged.length === 0) {
      reportSalesEmptyState.style.display = 'flex';
      return;
    }

    reportSalesEmptyState.style.display = 'none';

    // Show newest items first
    allItemsLogged.reverse();

    allItemsLogged.forEach(sale => {
      const row = document.createElement('tr');
      // Use closure date prefix if transaction timestamp does not fully describe date
      const displayTime = sale.closureDate ? `${sale.closureDate} ${sale.timestamp}` : sale.timestamp;
      
      row.innerHTML = `
        <td style="font-family: monospace; color: var(--text-secondary);">${displayTime}</td>
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

  // 10. Items Sold View - Sub-category triggers
  categorySubTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      categorySubTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      selectedItemCategory = tab.getAttribute('data-category');
      
      // Update header
      itemsViewTitle.textContent = `${selectedItemCategory} Items Sold`;
      renderItemsSoldView();
    });
  });

  // Calculate and populate itemized breakdowns grouped by Item Name
  function renderItemsSoldView() {
    adminItemsTableBody.innerHTML = '';
    
    // Group records by Item Name (case-insensitive)
    const itemGroups = {};

    historyClosures.forEach(day => {
      if (day.items && Array.isArray(day.items)) {
        day.items.forEach(sale => {
          // Process matches in selected Category
          if (sale.category === selectedItemCategory) {
            // Standardize key names to Title Case for visual alignment
            const cleanKey = sale.itemName.trim().toLowerCase();
            const displayName = sale.itemName.trim();

            if (!itemGroups[cleanKey]) {
              itemGroups[cleanKey] = {
                name: displayName,
                qty: 0,
                revenue: 0
              };
            }
            
            // Increment aggregates
            itemGroups[cleanKey].qty += sale.qty;
            itemGroups[cleanKey].revenue += sale.total;
          }
        });
      }
    });

    const itemsList = Object.values(itemGroups);

    if (itemsList.length === 0) {
      adminItemsEmptyState.style.display = 'flex';
      return;
    }

    adminItemsEmptyState.style.display = 'none';

    // Sort items by revenue generated (Highest revenue first)
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

  // 11. Initial Run Configurations
  // Set date picker defaults to today's date string ISO format
  const todayISO = new Date().toISOString().split('T')[0];
  filterDate.value = todayISO;
  
  // Select current month by default (months are 0-11, selectors 1-12)
  const currentMonthIdx = new Date().getMonth() + 1;
  filterMonth.value = currentMonthIdx;

  populateYearFilter();
  renderReports();
});
