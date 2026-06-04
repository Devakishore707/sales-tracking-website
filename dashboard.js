document.addEventListener('DOMContentLoaded', () => {
  // Initialize Lucide icons
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }

  // 1. Session & Role Verification
  // Must be logged in as 'staff' (or admin visiting) to view this page
  const isLoggedIn = sessionStorage.getItem('nakshathra_session') === 'active';
  const role = sessionStorage.getItem('nakshathra_role');
  if (!isLoggedIn || (role !== 'staff' && role !== 'admin')) {
    sessionStorage.clear();
    window.location.href = 'index.html';
    return;
  }

  // 2. DOM Elements Selection
  const logoutBtn = document.getElementById('logoutBtn');
  const clockTime = document.getElementById('clockTime');
  const clockDate = document.getElementById('clockDate');
  const closureTimestamp = document.getElementById('closureTimestamp');
  
  // Navigation Tabs & Views
  const tabSales = document.getElementById('tabSales');
  const tabClose = document.getElementById('tabClose');
  const viewSales = document.getElementById('viewSales');
  const viewClose = document.getElementById('viewClose');

  // Stats Card Indicators (Removed Card)
  const statTotal = document.getElementById('statTotal');
  const statCash = document.getElementById('statCash');
  const statUpi = document.getElementById('statUpi');

  // Form Fields & Controls (Added saleItemName)
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

  // Close Day summary details (Removed closePayCard)
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

  // 3. Application State Data (Stored in LocalStorage)
  let todaySales = JSON.parse(localStorage.getItem('nakshathra_today_sales')) || [];
  let historyClosures = JSON.parse(localStorage.getItem('nakshathra_history_closures')) || [];
  
  // Selected state buffers
  let selectedCategory = 'Silver';
  let selectedPayment = 'Cash';

  // 4. System Clock Sync (Corner display & autofill reference)
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

  // 5. Logout Execution
  logoutBtn.addEventListener('click', () => {
    sessionStorage.clear();
    window.location.href = 'index.html';
  });

  // 6. Navigation Tabs Toggle Functions
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

  // 7. Form Selection Click Handlers
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

  // 8. Calculation and UI Render Helpers
  function formatRupees(value) {
    return '₹' + Number(value).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  // Update Live Top Dashboard Totals
  function updateStatsDashboard() {
    let grandTotal = 0;
    let cashTotal = 0;
    let upiTotal = 0;

    todaySales.forEach(sale => {
      grandTotal += sale.total;
      if (sale.payMode === 'Cash') cashTotal += sale.total;
      else if (sale.payMode === 'UPI') upiTotal += sale.total;
    });

    statTotal.textContent = formatRupees(grandTotal);
    statCash.textContent = formatRupees(cashTotal);
    statUpi.textContent = formatRupees(upiTotal);
  }

  // Render Logged Sales Table for Today (Added Item Name column injection)
  function renderTodaySalesTable() {
    salesTableBody.innerHTML = '';
    
    if (todaySales.length === 0) {
      salesEmptyState.style.display = 'flex';
      salesCount.textContent = '0 entries';
      return;
    }

    salesEmptyState.style.display = 'none';
    salesCount.textContent = `${todaySales.length} ${todaySales.length === 1 ? 'entry' : 'entries'}`;

    // Sort showing newest sales first
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

    // Show newest closure dates first
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
    
    // Toggle theme configurations
    toastBox.className = `toast show ${type}`;
    toastIcon.textContent = type === 'success' ? '✓' : '⚠';

    // Hide after duration
    setTimeout(() => {
      toastBox.classList.remove('show');
    }, 2800);
  }

  // Save changes wrapper
  function saveToLocalStorage() {
    localStorage.setItem('nakshathra_today_sales', JSON.stringify(todaySales));
    localStorage.setItem('nakshathra_history_closures', JSON.stringify(historyClosures));
  }

  // 8.5 Sync to Google Sheets Form in Background
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
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData.toString()
    })
    .then(() => {
      console.log('Successfully submitted transaction to Google Form');
    })
    .catch((err) => {
      console.error('Error submitting to Google Form:', err);
    });
  }

  // 9. Interactive Operations: Add and Delete Transaction
  saleForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const price = parseFloat(saleAmount.value);
    const qty = parseInt(saleQty.value);
    
    // If Item Name is blank, generate a placeholder based on category
    const enteredItemName = saleItemName.value.trim() || ('Generic ' + selectedCategory);

    if (isNaN(price) || price <= 0 || isNaN(qty) || qty <= 0) {
      showToast('Please enter valid sale details', 'error');
      return;
    }

    // Capture system date & time dynamically for this sale
    const saleDateObj = new Date();
    
    // Time string format: 08:35 PM
    const localTimeStr = saleDateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    // Create item packet (includes itemName)
    const newSale = {
      id: 'sale_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      timestamp: localTimeStr,
      datetime: saleDateObj.toISOString(),
      itemName: enteredItemName,
      category: selectedCategory,
      price: price,
      qty: qty,
      total: price * qty,
      payMode: selectedPayment
    };

    // Save and Sync
    todaySales.push(newSale);
    saveToLocalStorage();
    
    // Submit background request to user's Google Form
    submitToGoogleForm(newSale);
    
    // Refresh GUI representation
    updateStatsDashboard();
    renderTodaySalesTable();
    
    // Reset Form Input boxes, maintaining category selectors
    saleItemName.value = '';
    saleAmount.value = '';
    saleQty.value = 1;
    
    showToast('Sale logged successfully!');
  });

  // 8.6 Sync Daily Closure Reports to Google Sheets Form
  function submitClosureToGoogleForm(category, qty, revenue) {
    const formUrl = 'https://docs.google.com/forms/u/0/d/e/1FAIpQLSfmhAtcHEk4TWmmxfSAgKul2DyXbjn_5D130diPEwGjTVHKBQ/formResponse';
    const formData = new URLSearchParams();
    formData.append('entry.464206022', category);
    formData.append('entry.480730844', qty.toString());
    formData.append('entry.1931948482', revenue.toString());

    fetch(formUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData.toString()
    })
    .then(() => {
      console.log(`Successfully submitted closure report for ${category} to Google Form`);
    })
    .catch((err) => {
      console.error(`Error submitting closure report for ${category}:`, err);
    });
  }

  // Deletion logic
  function deleteSale(id) {
    todaySales = todaySales.filter(s => s.id !== id);
    saveToLocalStorage();

    updateStatsDashboard();
    renderTodaySalesTable();
    showToast('Transaction removed.', 'error');
  }

  // 10. Close a Day Action (Embeds line items in closed log for Admin reports)
  closeDayBtn.addEventListener('click', () => {
    if (todaySales.length === 0) {
      showToast('No sales records to close today.', 'error');
      return;
    }

    const confirmClose = confirm('Are you sure you want to close today\'s sales log? This action registers the totals in your history book and clears today\'s board.');
    
    if (!confirmClose) return;

    // Collect variables
    let silverSum = 0, silverQty = 0;
    let goldSum = 0, goldQty = 0;
    let cosmeticSum = 0, cosmeticQty = 0;
    let italianSum = 0, italianQty = 0;
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

    // Submit closures to Google Forms (Daily Closure Form Sync)
    if (silverQty > 0) submitClosureToGoogleForm('Silver', silverQty, silverSum);
    if (goldQty > 0) submitClosureToGoogleForm('Gold Covering', goldQty, goldSum);
    if (cosmeticQty > 0) submitClosureToGoogleForm('Cosmetics', cosmeticQty, cosmeticSum);
    if (italianQty > 0) submitClosureToGoogleForm('Italian Silver', italianQty, italianSum);

    // Capture precise closure timestamp from system date and time
    const closeDateObj = new Date();
    const closureDateString = closeDateObj.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    // Create history record (embedding the list of today's items)
    const closureEntry = {
      id: 'close_' + Date.now(),
      datetime: closureDateString,
      dateStringISO: closeDateObj.toISOString().split('T')[0], // e.g. "2026-06-04" for easy admin daily filtering
      year: closeDateObj.getFullYear(),
      month: closeDateObj.getMonth() + 1, // 1-indexed (1-12)
      cashTotal: cashSum,
      upiTotal: upiSum,
      grandTotal: grandSum,
      silverTotal: silverSum,
      goldTotal: goldSum,
      cosmeticsTotal: cosmeticSum,
      italianTotal: italianSum,
      itemCount: itemCount,
      items: todaySales // Embed the individual line sales for admin grouping & reports
    };

    // Save and shift
    historyClosures.push(closureEntry);
    todaySales = []; // clear today's entries
    saveToLocalStorage();

    // Rerender all displays
    updateStatsDashboard();
    renderTodaySalesTable();
    calculateCloseSummary();
    renderHistoryTable();

    // Return view to Mark Sales so they are ready for the next shift
    switchTab(tabSales, tabClose, viewSales, viewClose);
    
    showToast('Day closed and totals archived!');
  });

  // 11. Initial Run Configuration
  updateStatsDashboard();
  renderTodaySalesTable();
  renderHistoryTable();
});
