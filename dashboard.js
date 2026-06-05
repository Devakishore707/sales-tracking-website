document.addEventListener('DOMContentLoaded', () => {
  // Initialize Lucide icons
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }

  // 1. Session & Role Verification
  const isLoggedIn = sessionStorage.getItem('nakshathra_session') === 'active';
  const role = sessionStorage.getItem('nakshathra_role');
  if (!isLoggedIn || (role !== 'staff' && role !== 'admin')) {
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
  const closureTimestamp = document.getElementById('closureTimestamp');
  const dbStatusBadge = document.getElementById('dbStatusBadge');
  
  // Navigation Tabs & Views
  const tabSales = document.getElementById('tabSales');
  const tabClose = document.getElementById('tabClose');
  const viewSales = document.getElementById('viewSales');
  const viewClose = document.getElementById('viewClose');

  // Stats Card Indicators
  const statTotal = document.getElementById('statTotal');
  const statMonth = document.getElementById('statMonth');
  const statYear = document.getElementById('statYear');

  // Form Fields & Controls
  const saleForm = document.getElementById('saleForm');
  const saleItemName = document.getElementById('saleItemName');
  const saleAmount = document.getElementById('saleAmount');
  const saleQty = document.getElementById('saleQty');
  const categorySelectors = document.querySelectorAll('.category-selector');
  const paymentSelectors = document.querySelectorAll('.payment-selector');

  // Table Log Elements
  const salesTableBody = document.getElementById('salesTableBody');
  const salesEmptyState = document.getElementById('salesEmptyState');
  const salesCount = document.getElementById('salesCount');

  // Close Day summary details
  const closeCatSilver = document.getElementById('closeCatSilver');
  const closeCatGold = document.getElementById('closeCatGold');
  const closeCatCosmetics = document.getElementById('closeCatCosmetics');
  const closeCatItalian = document.getElementById('closeCatItalian');
  const closePayCash = document.getElementById('closePayCash');
  const closePayUpi = document.getElementById('closePayUpi');
  const closeTotalAmount = document.getElementById('closeTotalAmount');
  const closeDayBtn = document.getElementById('closeDayBtn');

  // Historical Closures Logs
  const historyTableBody = document.getElementById('historyTableBody');
  const historyEmptyState = document.getElementById('historyEmptyState');

  // Toast UI Popup
  const toastBox = document.getElementById('toastBox');
  const toastIcon = document.getElementById('toastIcon');
  const toastMsg = document.getElementById('toastMsg');

  // 4. Application State Data (Cached in LocalStorage)
  let todaySales = JSON.parse(localStorage.getItem('nakshathra_today_sales')) || [];
  let historyClosures = JSON.parse(localStorage.getItem('nakshathra_history_closures')) || [];
  
  // Selected state buffers
  let selectedCategory = 'Silver';
  let selectedPayment = 'Cash';

  // 5. Database Sync Status Badge Manager
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

  // Check Supabase Connectivity
  async function checkDbConnection() {
    if (!supabase) {
      updateDbStatusBadge('offline');
      return;
    }

    try {
      // Test querying 1 row from sales table
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

  // 6. System Clock Sync (Corner display & autofill reference)
  function updateClock() {
    const now = new Date();
    
    // Format Time: 08:30:15 PM
    const timeOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true };
    const timeString = now.toLocaleTimeString('en-US', timeOptions);
    
    // Format Date: THURSDAY, JUNE 4, 2026
    const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dateString = now.toLocaleDateString('en-US', dateOptions).toUpperCase();

    // Render live in corner
    if (clockTime) clockTime.textContent = timeString;
    if (clockDate) clockDate.textContent = dateString;

    // Autofill / Display in closing window
    if (closureTimestamp) {
      const closingOption = { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true };
      closureTimestamp.textContent = now.toLocaleString('en-US', closingOption);
    }
  }
  
  // Start clock ticking
  updateClock();
  setInterval(updateClock, 1000);

  // 7. Switch User & Logout Execution
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

  // 8. Navigation Tabs Toggle Functions
  function switchTab(activeTab, inactiveTab, activeView, inactiveView) {
    inactiveTab.classList.remove('active');
    activeTab.classList.add('active');
    inactiveView.classList.remove('active');
    activeView.classList.add('active');
    
    // If opening Close Day View, refresh totals calculation
    if (activeTab === tabClose) {
      calculateCloseSummary();
    }
  }

  tabSales.addEventListener('click', () => {
    switchTab(tabSales, tabClose, viewSales, viewClose);
  });

  tabClose.addEventListener('click', () => {
    switchTab(tabClose, tabSales, viewClose, viewSales);
  });

  // 9. Form Selection Click Handlers
  categorySelectors.forEach(btn => {
    btn.addEventListener('click', () => {
      categorySelectors.forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedCategory = btn.getAttribute('data-value');
    });
  });

  paymentSelectors.forEach(btn => {
    btn.addEventListener('click', () => {
      paymentSelectors.forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedPayment = btn.getAttribute('data-value');
    });
  });

  // 10. Calculation and UI Render Helpers
  function formatRupees(value) {
    return '₹' + Number(value).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  // Update Live Top Dashboard Totals (Today, Month, Year Sales)
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

  function updateStatsDashboard() {
    loadTopStats();
  }

  // Render Logged Sales Table for Today
  function renderTodaySalesTable() {
    salesTableBody.innerHTML = '';
    
    if (todaySales.length === 0) {
      salesEmptyState.style.display = 'flex';
      salesCount.textContent = '0 entries';
      return;
    }

    salesEmptyState.style.display = 'none';
    salesCount.textContent = `${todaySales.length} ${todaySales.length === 1 ? 'entry' : 'entries'}`;

    // Sort showing newest sales first (we use the index reverse here)
    const sortedSales = [...todaySales].reverse();

    sortedSales.forEach(sale => {
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
        <td style="text-align: center;">
          <button class="table-action-btn delete-sale-btn" data-id="${sale.id}">
            <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
          </button>
        </td>
      `;
      salesTableBody.appendChild(row);
    });

    // Reinitialize delete button event listeners
    document.querySelectorAll('.delete-sale-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        deleteSale(id);
      });
    });

    // Refresh icon render
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  }

  // Calculate and Populate Closing Summaries
  function calculateCloseSummary() {
    let silverSum = 0;
    let goldSum = 0;
    let cosmeticSum = 0;
    let italianSum = 0;

    let cashSum = 0;
    let upiSum = 0;
    let grandSum = 0;

    todaySales.forEach(sale => {
      grandSum += sale.total;
      
      // Categorical division
      if (sale.category === 'Silver') silverSum += sale.total;
      else if (sale.category === 'Gold Covering') goldSum += sale.total;
      else if (sale.category === 'Cosmetics') cosmeticSum += sale.total;
      else if (sale.category === 'Italian Silver') italianSum += sale.total;

      // Payment division
      if (sale.payMode === 'Cash') cashSum += sale.total;
      else if (sale.payMode === 'UPI') upiSum += sale.total;
    });

    closeCatSilver.textContent = formatRupees(silverSum);
    closeCatGold.textContent = formatRupees(goldSum);
    closeCatCosmetics.textContent = formatRupees(cosmeticSum);
    closeCatItalian.textContent = formatRupees(italianSum);

    closePayCash.textContent = formatRupees(cashSum);
    closePayUpi.textContent = formatRupees(upiSum);
    closeTotalAmount.textContent = formatRupees(grandSum);
  }

  // Render Historic Day Closures Table
  function renderHistoryTable() {
    historyTableBody.innerHTML = '';
    
    if (historyClosures.length === 0) {
      historyEmptyState.style.display = 'flex';
      return;
    }

    historyEmptyState.style.display = 'none';

    const sortedHistory = [...historyClosures].reverse();

    sortedHistory.forEach(day => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td style="font-weight: 500; font-family: monospace;">${day.datetime}</td>
        <td style="text-align: right; font-family: monospace; color: var(--text-secondary);">${formatRupees(day.cashTotal)}</td>
        <td style="text-align: right; font-family: monospace; color: var(--text-secondary);">${formatRupees(day.upiTotal)}</td>
        <td style="text-align: right; font-family: monospace; font-weight: 600; color: var(--gold-light);">${formatRupees(day.grandTotal)}</td>
      `;
      historyTableBody.appendChild(row);
    });
  }

  // Display feedback notification popups
  function showToast(message, type = 'success') {
    toastMsg.textContent = message;
    toastBox.className = `toast show ${type}`;
    toastIcon.textContent = type === 'success' ? '✓' : '⚠';

    setTimeout(() => {
      toastBox.classList.remove('show');
    }, 2800);
  }

  // Save local storage cache
  function saveToLocalStorage() {
    localStorage.setItem('nakshathra_today_sales', JSON.stringify(todaySales));
    localStorage.setItem('nakshathra_history_closures', JSON.stringify(historyClosures));
  }

  // 11. Supabase Fetching today's sales
  async function loadTodaySales() {
    if (isDbOnline && supabase) {
      try {
        // Calculate start and end range of local day
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        const end = new Date();
        end.setHours(23, 59, 59, 999);

        // Fetch sales within today's range
        const { data, error } = await supabase
          .from('sales')
          .select('*')
          .gte('created_at', start.toISOString())
          .lte('created_at', end.toISOString());

        if (error) {
          console.error('Supabase query error, falling back to cache:', error);
        } else if (data) {
          todaySales = data.map(row => {
            const dateObj = new Date(row.created_at);
            const timeStr = dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
            return {
              id: row.no, // Database auto-incrementing ID
              timestamp: timeStr,
              datetime: row.created_at,
              itemName: row.product_name,
              category: row.category,
              price: parseFloat(row.price),
              qty: parseInt(row.quantity),
              total: parseFloat(row.total),
              payMode: 'Cash' // For local display dashboard. Paymode is not stored in DB.
            };
          });
          saveToLocalStorage();
        }
      } catch (err) {
        console.error('Network error fetching from Supabase:', err);
      }
    } else {
      // Offline fallback: load from local storage
      todaySales = JSON.parse(localStorage.getItem('nakshathra_today_sales')) || [];
    }

    updateStatsDashboard();
    renderTodaySalesTable();
  }

  // 12. Google Sheets sync backup functions
  function submitToGoogleForm(sale) {
    const formUrl = 'https://docs.google.com/forms/u/0/d/e/1FAIpQLScYuvQxdCGbylhwfnajD0pIJaL3emikSS8PP8qpeh27EpEoow/formResponse';
    const formData = new URLSearchParams();
    formData.append('entry.294064521', sale.itemName);
    formData.append('entry.293538181', sale.category);
    formData.append('entry.1386632674', sale.price.toString());
    formData.append('entry.2114978149', sale.qty.toString());
    formData.append('entry.1754549284', sale.total.toString());

    fetch(formUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString()
    }).catch(err => console.error('Google Form sync error:', err));
  }

  function submitClosureToGoogleForm(itemType, qty, revenue) {
    const formUrl = 'https://docs.google.com/forms/u/0/d/e/1FAIpQLSfmhAtcHEk4TWmmxfSAgKul2DyXbjn_5D130diPEwGjTVHKBQ/formResponse';
    const formData = new URLSearchParams();
    formData.append('entry.464206022', itemType);
    formData.append('entry.480730844', qty.toString());
    formData.append('entry.1931948482', revenue.toString());

    fetch(formUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString()
    }).catch(err => console.error('Google Closure Form sync error:', err));
  }

  // 13. Interactive Operations: Add and Delete Transaction
  saleForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const price = parseFloat(saleAmount.value);
    const qty = parseInt(saleQty.value);
    const enteredItemName = saleItemName.value.trim() || ('Generic ' + selectedCategory);

    if (isNaN(price) || price <= 0 || isNaN(qty) || qty <= 0) {
      showToast('Please enter valid sale details', 'error');
      return;
    }

    const saleDateObj = new Date();
    const localTimeStr = saleDateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    let finalId = 'sale_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    let isSynced = false;

    // A. Sync to Supabase in real-time
    if (isDbOnline && supabase) {
      try {
        const { data, error } = await supabase
          .from('sales')
          .insert([
            {
              product_name: enteredItemName,
              category: selectedCategory,
              price: price,
              quantity: qty,
              total: price * qty
            }
          ])
          .select();

        if (error) {
          console.error('Supabase write error, using local fallback:', error);
        } else if (data && data.length > 0) {
          finalId = data[0].no; // Grab PostgreSQL serial number key
          isSynced = true;
        }
      } catch (err) {
        console.error('Supabase network error, using local fallback:', err);
      }
    }

    // B. Build Sale packet and log locally
    const newSale = {
      id: finalId,
      timestamp: localTimeStr,
      datetime: saleDateObj.toISOString(),
      itemName: enteredItemName,
      category: selectedCategory,
      price: price,
      qty: qty,
      total: price * qty,
      payMode: selectedPayment
    };

    todaySales.push(newSale);
    saveToLocalStorage();
    
    // C. Submit background request to Google Form
    submitToGoogleForm(newSale);
    
    // Refresh GUI representation
    updateStatsDashboard();
    renderTodaySalesTable();
    
    // Reset Form Input boxes, maintaining category selectors
    saleItemName.value = '';
    saleAmount.value = '';
    saleQty.value = 1;
    
    if (isSynced) {
      showToast('Sale logged and synced to Supabase!');
    } else {
      showToast('Sale logged locally (Offline mode).');
    }
  });

  // Deletion logic
  async function deleteSale(id) {
    let isSyncedDelete = false;

    // If ID is numeric, it is a Supabase table primary serial key 'no'
    if (isDbOnline && supabase && !isNaN(id)) {
      try {
        const { error } = await supabase
          .from('sales')
          .delete()
          .eq('no', id);

        if (!error) {
          isSyncedDelete = true;
        } else {
          console.error('Supabase deletion error:', error);
        }
      } catch (err) {
        console.error('Supabase delete network error:', err);
      }
    }

    // Always delete locally
    todaySales = todaySales.filter(s => s.id !== id);
    saveToLocalStorage();

    updateStatsDashboard();
    renderTodaySalesTable();
    
    if (isSyncedDelete) {
      showToast('Transaction removed from Supabase.', 'error');
    } else {
      showToast('Transaction removed locally.', 'error');
    }
  }

  // 14. Close a Day Action (Locally archives summary logs)
  closeDayBtn.addEventListener('click', () => {
    if (todaySales.length === 0) {
      showToast('No sales records to close today.', 'error');
      return;
    }

    const confirmClose = confirm('Are you sure you want to close today\'s sales log? This action registers the totals in your local history logs and resets today\'s board.');
    
    if (!confirmClose) return;

    // Collect variables
    let silverSum = 0;
    let goldSum = 0;
    let cosmeticSum = 0;
    let italianSum = 0;
    
    let silverQty = 0;
    let goldQty = 0;
    let cosmeticQty = 0;
    let italianQty = 0;

    let cashSum = 0;
    let upiSum = 0;
    let grandSum = 0;
    let itemCount = 0;

    todaySales.forEach(sale => {
      grandSum += sale.total;
      itemCount += sale.qty;

      if (sale.category === 'Silver') {
        silverSum += sale.total;
        silverQty += sale.qty;
      } else if (sale.category === 'Gold Covering') {
        goldSum += sale.total;
        goldQty += sale.qty;
      } else if (sale.category === 'Cosmetics') {
        cosmeticSum += sale.total;
        cosmeticQty += sale.qty;
      } else if (sale.category === 'Italian Silver') {
        italianSum += sale.total;
        italianQty += sale.qty;
      }

      if (sale.payMode === 'Cash') cashSum += sale.total;
      else if (sale.payMode === 'UPI') upiSum += sale.total;
    });

    const closeDateObj = new Date();
    const closureDateString = closeDateObj.toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true
    });

    const closureEntry = {
      id: 'close_' + Date.now(),
      datetime: closureDateString,
      dateStringISO: closeDateObj.toISOString().split('T')[0],
      year: closeDateObj.getFullYear(),
      month: closeDateObj.getMonth() + 1,
      cashTotal: cashSum,
      upiTotal: upiSum,
      grandTotal: grandSum,
      silverTotal: silverSum,
      goldTotal: goldSum,
      cosmeticsTotal: cosmeticSum,
      italianTotal: italianSum,
      itemCount: itemCount,
      items: todaySales
    };

    // Save locally
    historyClosures.push(closureEntry);
    
    // Submit category aggregates to the daily collections Google Form
    if (silverQty > 0) submitClosureToGoogleForm('Silver', silverQty, silverSum);
    if (goldQty > 0) submitClosureToGoogleForm('Gold Covering', goldQty, goldSum);
    if (cosmeticQty > 0) submitClosureToGoogleForm('Cosmetics', cosmeticQty, cosmeticSum);
    if (italianQty > 0) submitClosureToGoogleForm('Italian Silver', italianQty, italianSum);

    todaySales = []; // clear local today entries
    saveToLocalStorage();

    // Rerender all displays
    updateStatsDashboard();
    renderTodaySalesTable();
    calculateCloseSummary();
    renderHistoryTable();

    // Return view to Mark Sales
    switchTab(tabSales, tabClose, viewSales, viewClose);
    
    showToast('Day closed and totals archived locally!');
  });

  // 15. Initial Load Routing
  async function init() {
    await checkDbConnection();
    await loadTodaySales();
    renderHistoryTable();
  }
  
  init();
});
