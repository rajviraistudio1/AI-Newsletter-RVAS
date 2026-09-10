/**
 * Raj Vir AI Studio — Main Landing Page Script
 * Handles form validation, simulated subscriptions, confetti effects,
 * newsletter preview modal, FAQ accordion, and responsive navigation.
 */

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initNavbar();
  initForms();
  initFaqAccordion();
  initSampleModal();
});

/* ==========================================================================
   0. Theme Toggle (Light / Dark Mode)
   ========================================================================== */
function initTheme() {
  const themeToggleBtn = document.getElementById('theme-toggle');
  
  // Check persisted preference, else check system preference
  let currentTheme = 'dark';
  try {
    const saved = localStorage.getItem('rvas_theme');
    if (saved) {
      currentTheme = saved;
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      currentTheme = 'light';
    }
  } catch (e) {}

  applyTheme(currentTheme, false);

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      const active = document.documentElement.getAttribute('data-theme') || 'dark';
      const newTheme = active === 'dark' ? 'light' : 'dark';
      applyTheme(newTheme, true);
    });
  }
}

function applyTheme(theme, notify = false) {
  if (theme === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }

  try {
    localStorage.setItem('rvas_theme', theme);
  } catch (e) {}

  const themeToggleBtn = document.getElementById('theme-toggle');
  if (themeToggleBtn) {
    themeToggleBtn.setAttribute('title', theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode');
    themeToggleBtn.setAttribute('aria-label', theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode');
  }

  if (notify) {
    showToast(theme === 'light' ? '☀️ Switched to Light Mode' : '🌙 Switched to Dark Mode', 'info');
  }
}

/* ==========================================================================
   1. Navbar Scroll & Mobile Navigation
   ========================================================================== */
function initNavbar() {
  const navbar = document.getElementById('navbar');
  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  const navMenu = document.getElementById('nav-menu');

  // Sticky header background transition
  const handleScroll = () => {
    if (window.scrollY > 24) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  };

  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll();

  // Mobile menu toggle
  if (mobileMenuBtn && navMenu) {
    mobileMenuBtn.addEventListener('click', () => {
      navMenu.classList.toggle('open');
      const isOpen = navMenu.classList.contains('open');
      mobileMenuBtn.setAttribute('aria-expanded', isOpen);
    });

    // Close mobile menu on clicking any navigation link
    navMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        navMenu.classList.remove('open');
        mobileMenuBtn.setAttribute('aria-expanded', 'false');
      });
    });
  }
}

/* ==========================================================================
   2. Subscription Form Handling & Celebratory Confetti
   ========================================================================== */
function initForms() {
  const heroForm = document.getElementById('hero-newsletter-form');
  const ctaForm = document.getElementById('cta-newsletter-form');

  if (heroForm) setupForm(heroForm, 'hero');
  if (ctaForm) setupForm(ctaForm, 'cta');
}

function setupForm(form, prefix) {
  const emailInput = document.getElementById(`${prefix}-email-input`);
  const submitBtn = document.getElementById(`${prefix}-submit-btn`);
  const successCard = document.getElementById(`${prefix}-success-state`);

  // Check if previously subscribed in localStorage
  try {
    const savedEmail = localStorage.getItem('rvas_subscribed_email');
    if (savedEmail && emailInput) {
      emailInput.value = savedEmail;
    }
  } catch (e) {
    // localStorage might be unavailable in some iframe sandboxes
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = emailInput ? emailInput.value.trim() : '';

    if (!validateEmail(email)) {
      showToast('Please enter a valid email address.', 'error');
      if (emailInput) {
        emailInput.focus();
        emailInput.style.outline = '2px solid #ef4444';
        setTimeout(() => { emailInput.style.outline = ''; }, 2000);
      }
      return;
    }

    // Enter loading state
    submitBtn.classList.add('loading');
    submitBtn.disabled = true;

    // Simulate server response delay
    setTimeout(() => {
      submitBtn.classList.remove('loading');
      submitBtn.disabled = false;

      // Show success card and hide/reset form
      if (successCard) {
        successCard.classList.add('active');
      }

      // Persist in localStorage
      try {
        localStorage.setItem('rvas_subscribed_email', email);
      } catch (err) {}

      // Trigger celebratory confetti burst
      triggerConfetti();

      // Show toast notification
      showToast(`Welcome aboard! Confirmation sent to ${email}`, 'success');

      // Update button text to Subscribed!
      const btnText = submitBtn.querySelector('.btn-text');
      if (btnText) {
        btnText.textContent = 'Subscribed ✓';
      }
    }, 700);
  });
}

function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

/* ==========================================================================
   3. Confetti Animation (Lightweight Canvas Particle Burst)
   ========================================================================== */
function triggerConfetti() {
  const canvas = document.createElement('canvas');
  canvas.style.position = 'fixed';
  canvas.style.inset = '0';
  canvas.style.width = '100vw';
  canvas.style.height = '100vh';
  canvas.style.zIndex = '999';
  canvas.style.pointerEvents = 'none';
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const particles = [];
  const colors = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ec4899'];

  for (let i = 0; i < 90; i++) {
    particles.push({
      x: window.innerWidth / 2,
      y: window.innerHeight * 0.45,
      vx: (Math.random() - 0.5) * 16,
      vy: (Math.random() - 0.7) * 16,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: Math.random() * 8 + 4,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 12,
      alpha: 1,
      decay: Math.random() * 0.015 + 0.015
    });
  }

  let animationFrame;
  function update() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let alive = false;

    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.35; // gravity
      p.rotation += p.rotationSpeed;
      p.alpha -= p.decay;

      if (p.alpha > 0) {
        alive = true;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      }
    });

    if (alive) {
      animationFrame = requestAnimationFrame(update);
    } else {
      cancelAnimationFrame(animationFrame);
      canvas.remove();
    }
  }

  update();
}

/* ==========================================================================
   4. Interactive FAQ Accordion
   ========================================================================== */
function initFaqAccordion() {
  const faqItems = document.querySelectorAll('.faq-item');

  faqItems.forEach(item => {
    const questionBtn = item.querySelector('.faq-question');
    if (!questionBtn) return;

    questionBtn.addEventListener('click', () => {
      const isCurrentlyActive = item.classList.contains('active');

      // Close all items
      faqItems.forEach(otherItem => {
        otherItem.classList.remove('active');
        const btn = otherItem.querySelector('.faq-question');
        if (btn) btn.setAttribute('aria-expanded', 'false');
      });

      // Toggle clicked item
      if (!isCurrentlyActive) {
        item.classList.add('active');
        questionBtn.setAttribute('aria-expanded', 'true');
      }
    });
  });
}

/* ==========================================================================
   5. Sample Newsletter Preview Modal
   ========================================================================== */
function initSampleModal() {
  const modal = document.getElementById('sample-modal');
  const closeBtn = document.getElementById('modal-close-btn');
  const heroBtn = document.getElementById('hero-read-sample-btn');
  const navBtn = document.getElementById('nav-preview-trigger');
  const modalSubscribeBtn = document.getElementById('modal-subscribe-shortcut');

  if (!modal) return;

  const openModal = () => {
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  };

  const closeModal = () => {
    modal.classList.remove('open');
    document.body.style.overflow = '';
  };

  if (heroBtn) heroBtn.addEventListener('click', openModal);
  if (navBtn) navBtn.addEventListener('click', openModal);
  if (closeBtn) closeBtn.addEventListener('click', closeModal);

  // Close on overlay backdrop click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeModal();
    }
  });

  // Close on Escape key
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('open')) {
      closeModal();
    }
  });

  // Modal subscribe shortcut
  if (modalSubscribeBtn) {
    modalSubscribeBtn.addEventListener('click', () => {
      closeModal();
      const heroSubscribe = document.getElementById('hero-subscribe');
      const emailInput = document.getElementById('hero-email-input');
      if (heroSubscribe) {
        heroSubscribe.scrollIntoView({ behavior: 'smooth' });
        setTimeout(() => {
          if (emailInput) emailInput.focus();
        }, 500);
      }
    });
  }
}

/* ==========================================================================
   6. Custom Toast System
   ========================================================================== */
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast';

  const iconSvg = type === 'success'
    ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>`
    : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;

  toast.innerHTML = `${iconSvg}<span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(20px)';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}
