document.addEventListener('DOMContentLoaded', () => {
  // 0. DOM Elements Selection (for Clock & Badge)
  const clockTime = document.getElementById('clockTime');
  const clockDate = document.getElementById('clockDate');
  const closureTimestamp = document.getElementById('closureTimestamp');
  const dbStatusBadge = document.getElementById('dbStatusBadge');

  // System Clock Sync (Corner display & autofill reference) - RUN FIRST & SAFELY
  function updateClock() {
    try {
      const now = new Date();
      const timeOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true };
      const timeString = now.toLocaleTimeString('en-US', timeOptions);
      const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
      const dateString = now.toLocaleDateString('en-US', dateOptions).toUpperCase();

      if (clockTime) clockTime.textContent = timeString;
      if (clockDate) clockDate.textContent = dateString;

      if (closureTimestamp) {
        const closingOption = { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true };
        closureTimestamp.textContent = now.toLocaleString('en-US', closingOption);
      }
    } catch (e) {
      console.error('Clock tick error:', e);
    }
  }

  try {
    updateClock();
    setInterval(updateClock, 1000);
  } catch (err) {
    console.error('Error starting clock:', err);
  }

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

  // 3. DOM Elements Selection (Rest of elements)
  const switchUserBtn = document.getElementById('switchUserBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const downloadTodayReportBtn = document.getElementById('downloadTodayReportBtn');
  
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
  let todaySales = [];
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
  async function checkDbConnection(silent = true) {
    if (!supabase) {
      updateDbStatusBadge('offline');
      return false;
    }

    try {
      const { error } = await supabase.from('sales').select('no').limit(1);
      if (error) {
        if (error.code === 'PGRST116' || (error.message && error.message.includes('does not exist'))) {
          updateDbStatusBadge('setup');
        } else {
          updateDbStatusBadge('offline');
        }
        return false;
      } else {
        const wasOnline = isDbOnline;
        updateDbStatusBadge('connected');
        if (!wasOnline && isDbOnline) {
          if (!silent) showToast('Database connection established!');
          await loadTodaySales();
        }
        return true;
      }
    } catch (err) {
      updateDbStatusBadge('offline');
      return false;
    }
  }

  // Periodic Reconnect / Connection Check every 15 seconds
  setInterval(() => checkDbConnection(true), 15000);

  // Manual Reconnect on Badge Click
  if (dbStatusBadge) {
    dbStatusBadge.addEventListener('click', async () => {
      showToast('Verifying connection to database...', 'success');
      const connected = await checkDbConnection(false);
      if (connected) {
        showToast('Database is online!');
      } else {
        showToast('Database is offline. Using local storage.', 'error');
      }
    });
  }

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
    const lastClosureTime = localStorage.getItem('nakshathra_last_closure_time') || null;
    const lastClosureDate = lastClosureTime ? new Date(lastClosureTime) : null;

    if (supabase) {
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
            
            // Only count in "Today's Sales" if it is after the last closure time!
            if (saleDate >= todayStart && (!lastClosureDate || saleDate > lastClosureDate)) {
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
          updateDbStatusBadge('connected');
          return;
        } else if (error) {
          console.error('Failed to query statistics from Supabase:', error);
        }
      } catch (err) {
        console.error('Error querying Supabase for top stats:', err);
      }
    }

    // Local Storage Offline Fallback
    const cachedTodaySales = JSON.parse(localStorage.getItem('nakshathra_today_sales')) || [];
    const filteredTodaySales = lastClosureDate 
      ? cachedTodaySales.filter(s => new Date(s.datetime) > lastClosureDate)
      : cachedTodaySales;

    filteredTodaySales.forEach(sale => {
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

    let cashSum = 0;
    let upiSum = 0;
    let grandSum = 0;

    todaySales.forEach(sale => {
      grandSum += sale.total;
      
      // Categorical division
      if (sale.category === 'Silver') silverSum += sale.total;
      else if (sale.category === 'Gold Covering') goldSum += sale.total;
      else if (sale.category === 'Cosmetics') cosmeticSum += sale.total;

      // Payment division
      if (sale.payMode === 'Cash') cashSum += sale.total;
      else if (sale.payMode === 'UPI') upiSum += sale.total;
    });

    closeCatSilver.textContent = formatRupees(silverSum);
    closeCatGold.textContent = formatRupees(goldSum);
    closeCatCosmetics.textContent = formatRupees(cosmeticSum);

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
    const lastClosureTime = localStorage.getItem('nakshathra_last_closure_time') || null;

    if (supabase) {
      try {
        // Calculate start and end range of local day
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        const end = new Date();
        end.setHours(23, 59, 59, 999);

        // Fetch sales within today's range
        let query = supabase
          .from('sales')
          .select('*')
          .gte('created_at', start.toISOString())
          .lte('created_at', end.toISOString());

        if (lastClosureTime) {
          query = query.gt('created_at', lastClosureTime);
        }

        const { data, error } = await query;

        if (error) {
          console.error('Supabase query error, falling back to cache:', error);
          loadLocalTodaySales(lastClosureTime);
        } else if (data) {
          todaySales = data.map(row => {
            const dateObj = new Date(row.created_at);
            const timeStr = isNaN(dateObj.getTime()) ? '--:--' : dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
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
          updateDbStatusBadge('connected');
        }
      } catch (err) {
        console.error('Network error fetching from Supabase:', err);
        loadLocalTodaySales(lastClosureTime);
      }
    } else {
      loadLocalTodaySales(lastClosureTime);
    }

    updateStatsDashboard();
    renderTodaySalesTable();
  }

  function loadLocalTodaySales(lastClosureTime) {
    const cachedSales = JSON.parse(localStorage.getItem('nakshathra_today_sales')) || [];
    if (lastClosureTime) {
      const lastClosureDate = new Date(lastClosureTime);
      todaySales = cachedSales.filter(sale => {
        const saleDate = new Date(sale.datetime);
        return isNaN(saleDate.getTime()) || saleDate > lastClosureDate;
      });
    } else {
      todaySales = cachedSales;
    }
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
    const enteredItemName = saleItemName.value.trim();

    if (!enteredItemName) {
      showToast('Please enter a valid product item name', 'error');
      return;
    }

    if (isNaN(price) || price <= 0 || isNaN(qty) || qty <= 0) {
      showToast('Please enter valid sale details', 'error');
      return;
    }

    const saleDateObj = new Date();
    const localTimeStr = saleDateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    let finalId = 'sale_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    let isSynced = false;

    // A. Sync to Supabase in real-time
    if (supabase) {
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
          updateDbStatusBadge('connected');
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
    if (supabase && !isNaN(id)) {
      try {
        const { error } = await supabase
          .from('sales')
          .delete()
          .eq('no', id);

        if (!error) {
          isSyncedDelete = true;
          updateDbStatusBadge('connected');
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
    
    let silverQty = 0;
    let goldQty = 0;
    let cosmeticQty = 0;

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
      itemCount: itemCount,
      items: todaySales
    };

    // Save locally
    historyClosures.push(closureEntry);
    localStorage.setItem('nakshathra_last_closure_time', new Date().toISOString());
    
    // Submit category aggregates to the daily collections Google Form
    if (silverQty > 0) submitClosureToGoogleForm('Silver', silverQty, silverSum);
    if (goldQty > 0) submitClosureToGoogleForm('Gold Covering', goldQty, goldSum);
    if (cosmeticQty > 0) submitClosureToGoogleForm('Cosmetics', cosmeticQty, cosmeticSum);

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

  // Today PDF report download logic with popup blocker bypass
  async function generateTodayPDFReport() {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Pop-up blocked! Please allow pop-ups for this website to generate PDF reports.');
      return;
    }
    
    printWindow.document.write('<html><head><title>Generating Report...</title><style>body { font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; color: #666; }</style></head><body><h2>Generating PDF report, please wait...</h2></body></html>');
    printWindow.document.close();

    const salesList = todaySales.map(item => {
      return {
        timestamp: item.timestamp,
        itemName: item.itemName,
        category: item.category,
        price: parseFloat(item.price),
        qty: parseInt(item.qty),
        total: parseFloat(item.total)
      };
    });

    let totalRevenue = 0;
    let totalItemsSold = 0;
    let silverSum = 0;
    let goldSum = 0;
    let cosmeticsSum = 0;

    salesList.forEach(item => {
      totalRevenue += item.total;
      totalItemsSold += item.qty;
      if (item.category === 'Silver') silverSum += item.total;
      else if (item.category === 'Gold Covering') goldSum += item.total;
      else if (item.category === 'Cosmetics') cosmeticsSum += item.total;
    });

    const reportHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Sales Report - Today</title>
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
      grid-template-columns: repeat(3, 1fr);
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
    <p>Today's Sales Report</p>
  </div>
  
  <div class="report-info">
    <div><strong>Reporting Period:</strong> ${new Date().toLocaleDateString('en-IN', {day: 'numeric', month: 'short', year: 'numeric'})} (Today)</div>
    <div><strong>Generated On:</strong> ${new Date().toLocaleString()}</div>
  </div>
  
  <div class="summary-cards">
    <div class="summary-card">
      <div class="summary-card-title">Total Sales Revenue</div>
      <div class="summary-card-value">${formatRupees(totalRevenue)}</div>
    </div>
    <div class="summary-card">
      <div class="summary-card-title">Total Items Sold</div>
      <div class="summary-card-value">${totalItemsSold}</div>
    </div>
  </div>

  <div class="breakdown-section">
    <h2>Category Breakdown</h2>
    <div class="breakdown-grid">
      <div class="breakdown-box">
        <div class="breakdown-label">Silver</div>
        <div class="breakdown-value">${formatRupees(silverSum)}</div>
      </div>
      <div class="breakdown-box">
        <div class="breakdown-label">Gold Covering</div>
        <div class="breakdown-value">${formatRupees(goldSum)}</div>
      </div>
      <div class="breakdown-box">
        <div class="breakdown-label">Cosmetics</div>
        <div class="breakdown-value">${formatRupees(cosmeticsSum)}</div>
      </div>
    </div>
  </div>

  <div class="table-section">
    <h2>Transaction Records (${salesList.length} Entries)</h2>
    <table>
      <thead>
        <tr>
          <th>Time</th>
          <th>Item Name</th>
          <th>Category</th>
          <th style="text-align: right;">Price</th>
          <th style="text-align: center;">Qty</th>
          <th style="text-align: right;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${salesList.map(sale => `
          <tr>
            <td>${sale.timestamp}</td>
            <td style="font-weight: 600;">${sale.itemName}</td>
            <td>${sale.category}</td>
            <td class="price-col">${formatRupees(sale.price)}</td>
            <td class="qty-col">${sale.qty}</td>
            <td class="total-col">${formatRupees(sale.total)}</td>
          </tr>
        `).join('')}
        ${salesList.length === 0 ? '<tr><td colspan="6" style="text-align: center; color: #888; padding: 20px;">No sales transactions logged today.</td></tr>' : ''}
      </tbody>
    </table>
  </div>

  <div class="footer">
    Nakshathra Silver & Gold Covering | Report Confirmed by Staff | Generated Automatically
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
    `;

    printWindow.document.open();
    printWindow.document.write(reportHtml);
    printWindow.document.close();
  }

  // 15. Initial Load Routing
  async function init() {
    await checkDbConnection();
    await loadTodaySales();
    renderHistoryTable();
  }
  
  init();
});
