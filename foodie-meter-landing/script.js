(() => {
    // FoodieMeter backend API.
  //
  // When opened using localhost, this becomes:
  // http://localhost:4477/api
  //
  // When opened from another device using the laptop IP,
  // it automatically uses that same laptop IP.
  const API_BASE_URL =
    `http://${window.location.hostname || 'localhost'}:4477/api`;


  const setText = (
    id,
    value
  ) => {
    const element =
      document.getElementById(id);

    if (
      element &&
      typeof value === 'string'
    ) {
      element.textContent = value;
    }
  };
  const loadWebsiteInfo =
  async () => {
    try {
      const response =await fetch(`${API_BASE_URL}/site-info`);
        if (!response.ok) {
          throw new Error(`Website information request failed (${response.status})`);
        }
        const body = await response.json();
        const info = body.data;
        if (!info) {
          throw new Error('Website information was empty');
        }
        setText('site-name-header',info.siteName);
        setText('site-name-footer',info.siteName);
        setText('hero-heading-primary',info.heroHeadingPrimary);
        setText('hero-heading-accent',info.heroHeadingAccent);
        setText('hero-description',info.heroDescription);
        setText('features-heading', info.featuresHeading);
        setText('features-description',info.featuresDescription);
        setText('free-plan-description',info.freePlanDescription);
        setText('premium-plan-description',info.premiumPlanDescription);
        setText('about-heading',info.aboutHeading);
        setText('about-description',info.aboutDescription);
        setText('medical-disclaimer',info.medicalDisclaimer);
        setText('cta-heading',info.ctaHeading);
        setText('cta-description',info.ctaDescription);
        setText('footer-tagline',info.footerTagline);
        setText('footer-copyright',info.footerCopyright);
        if (info.siteName) {
          document.title = `${info.siteName} — ${info.heroHeadingPrimary} ${info.heroHeadingAccent}`;}} catch (error) {
        // Keep the original hard-coded page content
        // if the backend cannot be reached.
        console.warn('[FoodieMeter] Could not load website information:',error);}
    };


  void loadWebsiteInfo();


  // Mobile navigation
  // Mobile navigation
  const menuButton = document.querySelector('.menu-button');
  const mobileMenu = document.querySelector('.mobile-menu');
  if (menuButton && mobileMenu) {
    menuButton.addEventListener('click', () => {
      const expanded = menuButton.getAttribute('aria-expanded') === 'true';
      menuButton.setAttribute('aria-expanded', String(!expanded));
      mobileMenu.hidden = expanded;
      document.body.classList.toggle('menu-open', !expanded);
    });
    mobileMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        menuButton.setAttribute('aria-expanded', 'false');
        mobileMenu.hidden = true;
        document.body.classList.remove('menu-open');
      });
    });
  }

  // Gentle entrance animations
  const revealItems = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -30px' });
    revealItems.forEach(item => observer.observe(item));
  } else {
    revealItems.forEach(item => item.classList.add('visible'));
  }

  // Password visibility controls
  document.querySelectorAll('[data-toggle-password]').forEach(button => {
    button.addEventListener('click', () => {
      const input = document.getElementById(button.dataset.togglePassword);
      if (!input) return;
      const showing = input.type === 'text';
      input.type = showing ? 'password' : 'text';
      button.textContent = showing ? 'Show' : 'Hide';
    });
  });

  // Prototype registration flow.
  // Backend integration point later:
  // 1) POST registration data to your Node.js/Express REST API.
  // 2) Receive an unverified user result.
  // 3) Trigger six-digit email verification.
  // 4) POST verification code and redirect to login when verified.
  const registerForm = document.getElementById('register-form');
  const verificationStep = document.getElementById('verification-step');
  const registrationStep = document.getElementById('registration-step');
  const successStep = document.getElementById('success-step');
  const verifyForm = document.getElementById('verify-form');
  const verifyEmail = document.getElementById('verify-email');
  const backButton = document.getElementById('back-to-register');

  const setError = (id, message) => {
    const input = document.getElementById(id);
    const error = document.querySelector(`[data-error-for="${id}"]`);
    if (input) input.classList.toggle('invalid', Boolean(message));
    if (error) error.textContent = message || '';
  };

  const clearRegistrationErrors = () => {
    ['full-name', 'email', 'country', 'password', 'confirm-password', 'terms'].forEach(id => setError(id, ''));
  };

  if (registerForm) {
    registerForm.addEventListener('submit', (event) => {
      event.preventDefault();
      clearRegistrationErrors();

      const name = document.getElementById('full-name').value.trim();
      const email = document.getElementById('email').value.trim();
      const country = document.getElementById('country').value;
      const password = document.getElementById('password').value;
      const confirmPassword = document.getElementById('confirm-password').value;
      const terms = document.getElementById('terms').checked;
      let valid = true;

      if (name.length < 2) { setError('full-name', 'Please enter your name.'); valid = false; }
      if (!/^\S+@\S+\.\S+$/.test(email)) { setError('email', 'Please enter a valid email address.'); valid = false; }
      if (!country) { setError('country', 'Please select a country / region.'); valid = false; }
      if (password.length < 8) { setError('password', 'Password must be at least 8 characters.'); valid = false; }
      if (password !== confirmPassword) { setError('confirm-password', 'Passwords do not match.'); valid = false; }
      if (!terms) { setError('terms', 'Please accept the prototype terms to continue.'); valid = false; }

      if (!valid) return;

      // No personal data or password is persisted in this prototype.
      if (verifyEmail) verifyEmail.textContent = email;
      registrationStep.hidden = true;
      verificationStep.hidden = false;
      verificationStep.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  if (verifyForm) {
    verifyForm.addEventListener('submit', (event) => {
      event.preventDefault();
      setError('verification-code', '');
      const code = document.getElementById('verification-code').value.trim();
      if (code !== '123456') {
        setError('verification-code', 'For this prototype, use demo code 123456.');
        return;
      }
      verificationStep.hidden = true;
      successStep.hidden = false;
      successStep.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  if (backButton) {
    backButton.addEventListener('click', () => {
      verificationStep.hidden = true;
      registrationStep.hidden = false;
    });
  }
})();
