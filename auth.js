document.addEventListener('DOMContentLoaded', () => {
  // Initialize Lucide icons
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }

  // 1. Session check on page load: route to correct dashboard if already logged in
  const role = sessionStorage.getItem('nakshathra_role');
  if (sessionStorage.getItem('nakshathra_session') === 'active') {
    if (role === 'admin') {
      window.location.href = 'admin.html';
      return;
    } else if (role === 'staff') {
      window.location.href = 'dashboard.html';
      return;
    }
  }

  const loginForm = document.getElementById('loginForm');
  const usernameInput = document.getElementById('username');
  const passwordInput = document.getElementById('password');
  const loginCard = document.getElementById('loginCard');
  const errorBanner = document.getElementById('errorBanner');
  const errorMessage = document.getElementById('errorMessage');
  const passwordToggleBtn = document.getElementById('passwordToggleBtn');

  // 2. Password Visibility Toggle
  if (passwordToggleBtn) {
    passwordToggleBtn.addEventListener('click', () => {
      const currentType = passwordInput.getAttribute('type');
      const targetType = currentType === 'password' ? 'text' : 'password';
      passwordInput.setAttribute('type', targetType);

      // Swap Lucide Icon (eye <-> eye-off)
      const iconEl = passwordToggleBtn.querySelector('i');
      if (iconEl) {
        const nextIcon = targetType === 'password' ? 'eye' : 'eye-off';
        iconEl.setAttribute('data-lucide', nextIcon);
        if (typeof lucide !== 'undefined') {
          lucide.createIcons();
        }
      }
    });
  }

  // 3. Login Validation Logic
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    // Direct routing based on matching roles
    if (username === 'nakshathra') {
      if (password === 'satheesh@123') {
        // ADMIN ROLE
        errorBanner.style.display = 'none';
        sessionStorage.setItem('nakshathra_session', 'active');
        sessionStorage.setItem('nakshathra_role', 'admin');
        window.location.href = 'admin.html';
      } else if (password === 'nakshathra@123') {
        // STAFF ROLE
        errorBanner.style.display = 'none';
        sessionStorage.setItem('nakshathra_session', 'active');
        sessionStorage.setItem('nakshathra_role', 'staff');
        window.location.href = 'dashboard.html';
      } else {
        showLoginError('Invalid password.');
      }
    } else {
      showLoginError('Invalid username.');
    }
  });

  function showLoginError(msg) {
    errorMessage.textContent = msg;
    errorBanner.style.display = 'flex';
    passwordInput.value = ''; // clear password field for security
    
    // Add shake effect for modern visual warning
    loginCard.classList.remove('shake');
    void loginCard.offsetWidth; // Trigger reflow to reset animation
    loginCard.classList.add('shake');
  }
});
