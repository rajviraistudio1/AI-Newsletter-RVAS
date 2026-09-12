/**
 * Raj Vir AI Studio — Admin Dashboard Script
 * Handles authentication, subscriber management, stats, chart, and CSV export.
 * 
 * Security: All data access is gated behind Supabase Auth.
 * RLS policies ensure only authenticated users can SELECT / DELETE subscribers.
 */

document.addEventListener('DOMContentLoaded', () => {
  initAdminTheme();
  initAuth();
});

/* ==========================================================================
   0. Theme Toggle (mirrors main site behavior)
   ========================================================================== */
function initAdminTheme() {
  const toggle = document.getElementById('admin-theme-toggle');
  let theme = 'dark';

  try {
    const saved = localStorage.getItem('rvas_theme');
    if (saved) {
      theme = saved;
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      theme = 'light';
    }
  } catch (e) {}

  applyAdminTheme(theme);

  if (toggle) {
    toggle.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') || 'dark';
      applyAdminTheme(current === 'dark' ? 'light' : 'dark');
    });
  }
}

function applyAdminTheme(theme) {
  if (theme === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
  try { localStorage.setItem('rvas_theme', theme); } catch (e) {}
}

/* ==========================================================================
   1. Supabase Client
   ========================================================================== */
let sbClient = null;

function getSB() {
  if (sbClient) return sbClient;

  if (typeof window.supabase === 'undefined' || !window.supabase.createClient) return null;

  const cfg = window.SUPABASE_CONFIG;
  if (!cfg || !cfg.url || !cfg.anonKey) return null;
  if (cfg.url.includes('YOUR_PROJECT_ID') || cfg.anonKey.includes('YOUR_SUPABASE_ANON_KEY')) return null;

  try {
    sbClient = window.supabase.createClient(cfg.url, cfg.anonKey);
    return sbClient;
  } catch (err) {
    console.error('[Admin] Supabase init error:', err);
    return null;
  }
}

/* ==========================================================================
   2. Authentication Flow
   ========================================================================== */
function initAuth() {
  const loginForm = document.getElementById('login-form');
  const loginBtn = document.getElementById('login-submit-btn');
  const logoutBtn = document.getElementById('logout-btn');

  // Check existing session
  checkSession();

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('admin-email').value.trim();
    const password = document.getElementById('admin-password').value;
    
    if (!email || !password) return;

    loginBtn.disabled = true;
    loginBtn.querySelector('.btn-text').textContent = 'Signing in...';
    hideLoginError();

    const client = getSB();
    if (!client) {
      showLoginError('Supabase not configured. Check js/config.js');
      loginBtn.disabled = false;
      loginBtn.querySelector('.btn-text').textContent = 'Sign In';
      return;
    }

    try {
      const { data, error } = await client.auth.signInWithPassword({ email, password });

      if (error) {
        showLoginError(error.message || 'Invalid email or password');
        loginBtn.disabled = false;
        loginBtn.querySelector('.btn-text').textContent = 'Sign In';
        return;
      }

      // Authenticated — show dashboard
      showDashboard();
    } catch (err) {
      showLoginError('Network error. Please try again.');
      loginBtn.disabled = false;
      loginBtn.querySelector('.btn-text').textContent = 'Sign In';
    }
  });

  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      const client = getSB();
      if (client) {
        await client.auth.signOut();
      }
      showLogin();
    });
  }
}

async function checkSession() {
  const client = getSB();
  if (!client) return;

  try {
    const { data: { session } } = await client.auth.getSession();
    if (session) {
      showDashboard();
    }
  } catch (e) {
    // No valid session — stay on login
  }
}

function showDashboard() {
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('dashboard-screen').classList.add('active');
  loadDashboardData();
}

function showLogin() {
  document.getElementById('login-screen').classList.remove('hidden');
  document.getElementById('dashboard-screen').classList.remove('active');
  document.getElementById('login-form').reset();
  document.getElementById('login-submit-btn').disabled = false;
  document.getElementById('login-submit-btn').querySelector('.btn-text').textContent = 'Sign In';
}

function showLoginError(msg) {
  const el = document.getElementById('login-error');
  document.getElementById('login-error-text').textContent = msg;
  el.classList.add('visible');
}

function hideLoginError() {
  document.getElementById('login-error').classList.remove('visible');
}

/* ==========================================================================
   3. Dashboard Data Loading
   ========================================================================== */
let allSubscribers = [];
const PER_PAGE = 15;
let currentPage = 1;
let searchQuery = '';

async function loadDashboardData() {
  const client = getSB();
  if (!client) return;

  try {
    const { data, error } = await client
      .from('subscribers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Admin] Fetch error:', error);
      showToast('Failed to load subscribers: ' + error.message, 'error');
      return;
    }

    allSubscribers = data || [];
    updateStats();
    renderChart();
    renderTable();
    initSearchAndExport();
  } catch (err) {
    console.error('[Admin] Unexpected error:', err);
    showToast('Network error while loading data.', 'error');
  }
}

/* ==========================================================================
   4. Stats Computation
   ========================================================================== */
function updateStats() {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  // Start of this week (Monday)
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - mondayOffset);
  
  // Start of this month
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  let today = 0, week = 0, month = 0;

  allSubscribers.forEach(sub => {
    const d = new Date(sub.created_at);
    if (d >= todayStart) today++;
    if (d >= weekStart) week++;
    if (d >= monthStart) month++;
  });

  animateCounter('stat-total', allSubscribers.length);
  animateCounter('stat-today', today);
  animateCounter('stat-week', week);
  animateCounter('stat-month', month);
}

function animateCounter(id, target) {
  const el = document.getElementById(id);
  if (!el) return;

  if (target === 0) {
    el.textContent = '0';
    return;
  }

  const duration = 600;
  const start = performance.now();

  function step(timestamp) {
    const elapsed = timestamp - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
    el.textContent = Math.floor(eased * target).toLocaleString();
    if (progress < 1) {
      requestAnimationFrame(step);
    } else {
      el.textContent = target.toLocaleString();
    }
  }

  requestAnimationFrame(step);
}

/* ==========================================================================
   5. Growth Chart (Canvas)
   ========================================================================== */
function renderChart() {
  const canvas = document.getElementById('growth-chart');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const wrapper = canvas.parentElement;
  const dpr = window.devicePixelRatio || 1;
  
  canvas.width = wrapper.clientWidth * dpr;
  canvas.height = wrapper.clientHeight * dpr;
  ctx.scale(dpr, dpr);

  const W = wrapper.clientWidth;
  const H = wrapper.clientHeight;

  // Compute daily signups for last 30 days
  const days = 30;
  const now = new Date();
  const dailyCounts = new Array(days).fill(0);
  const labels = [];

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    labels.push(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
    
    allSubscribers.forEach(sub => {
      if (sub.created_at && sub.created_at.slice(0, 10) === key) {
        dailyCounts[days - 1 - i]++;
      }
    });
  }

  // Cumulative total up to each day
  let cumulativeBase = 0;
  allSubscribers.forEach(sub => {
    const d = new Date(sub.created_at);
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - days);
    if (d < cutoff) cumulativeBase++;
  });

  const cumulativeData = [];
  let running = cumulativeBase;
  for (let i = 0; i < days; i++) {
    running += dailyCounts[i];
    cumulativeData.push(running);
  }

  // Draw
  const isLight = document.documentElement.getAttribute('data-theme') === 'light';
  const padding = { top: 20, right: 20, bottom: 40, left: 55 };
  const chartW = W - padding.left - padding.right;
  const chartH = H - padding.top - padding.bottom;

  const maxVal = Math.max(...cumulativeData, 1);
  const minVal = Math.min(...cumulativeData);
  const range = maxVal - minVal || 1;

  // Grid lines
  ctx.strokeStyle = isLight ? 'rgba(15, 23, 42, 0.06)' : 'rgba(255, 255, 255, 0.06)';
  ctx.lineWidth = 1;
  const gridLines = 5;
  for (let i = 0; i <= gridLines; i++) {
    const y = padding.top + (chartH / gridLines) * i;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(W - padding.right, y);
    ctx.stroke();

    // Y-axis labels
    const val = Math.round(maxVal - (range / gridLines) * i);
    ctx.fillStyle = isLight ? '#94a3b8' : '#64748b';
    ctx.font = `500 11px 'Plus Jakarta Sans', sans-serif`;
    ctx.textAlign = 'right';
    ctx.fillText(val.toLocaleString(), padding.left - 10, y + 4);
  }

  // X-axis labels (show every ~5 days)
  ctx.textAlign = 'center';
  for (let i = 0; i < days; i++) {
    if (i % 5 === 0 || i === days - 1) {
      const x = padding.left + (chartW / (days - 1)) * i;
      ctx.fillStyle = isLight ? '#94a3b8' : '#64748b';
      ctx.font = `500 10px 'Plus Jakarta Sans', sans-serif`;
      ctx.fillText(labels[i], x, H - padding.bottom + 20);
    }
  }

  // Line path
  const points = cumulativeData.map((val, i) => ({
    x: padding.left + (chartW / (days - 1)) * i,
    y: padding.top + chartH - ((val - minVal) / range) * chartH
  }));

  // Gradient fill
  const gradient = ctx.createLinearGradient(0, padding.top, 0, H - padding.bottom);
  gradient.addColorStop(0, isLight ? 'rgba(99, 102, 241, 0.15)' : 'rgba(99, 102, 241, 0.2)');
  gradient.addColorStop(1, 'rgba(99, 102, 241, 0)');

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    const cpx = (points[i - 1].x + points[i].x) / 2;
    ctx.bezierCurveTo(cpx, points[i - 1].y, cpx, points[i].y, points[i].x, points[i].y);
  }
  // Close to fill
  ctx.lineTo(points[points.length - 1].x, H - padding.bottom);
  ctx.lineTo(points[0].x, H - padding.bottom);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();

  // Line stroke
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    const cpx = (points[i - 1].x + points[i].x) / 2;
    ctx.bezierCurveTo(cpx, points[i - 1].y, cpx, points[i].y, points[i].x, points[i].y);
  }
  ctx.strokeStyle = '#6366f1';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // End dot (glow effect)
  const lastPt = points[points.length - 1];
  ctx.beginPath();
  ctx.arc(lastPt.x, lastPt.y, 6, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(99, 102, 241, 0.3)';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(lastPt.x, lastPt.y, 3.5, 0, Math.PI * 2);
  ctx.fillStyle = '#6366f1';
  ctx.fill();
}

// Redraw chart on resize
let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (document.getElementById('dashboard-screen').classList.contains('active')) {
      renderChart();
    }
  }, 200);
});

/* ==========================================================================
   6. Subscriber Table
   ========================================================================== */
function renderTable() {
  const tbody = document.getElementById('subscribers-tbody');
  const loading = document.getElementById('table-loading');
  const wrapper = document.getElementById('table-wrapper');
  const emptyState = document.getElementById('empty-state');
  const pagination = document.getElementById('pagination');

  loading.style.display = 'none';
  wrapper.style.display = 'block';

  // Filter
  const filtered = searchQuery
    ? allSubscribers.filter(s => s.email.toLowerCase().includes(searchQuery.toLowerCase()))
    : allSubscribers;

  // Update count
  document.getElementById('table-count').textContent = filtered.length;

  if (filtered.length === 0) {
    tbody.innerHTML = '';
    emptyState.style.display = 'block';
    pagination.style.display = 'none';
    return;
  }

  emptyState.style.display = 'none';

  // Pagination
  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  if (currentPage > totalPages) currentPage = totalPages;

  const startIdx = (currentPage - 1) * PER_PAGE;
  const pageItems = filtered.slice(startIdx, startIdx + PER_PAGE);

  // Render rows
  tbody.innerHTML = pageItems.map(sub => {
    const date = new Date(sub.created_at);
    const formatted = date.toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
    const sourceLabel = (sub.source || 'unknown').replace(/_/g, ' ');

    return `
      <tr data-id="${sub.id}">
        <td>${escapeHtml(sub.email)}</td>
        <td><span class="source-badge">${escapeHtml(sourceLabel)}</span></td>
        <td>${formatted}</td>
        <td style="text-align: center;">
          <button class="delete-btn" title="Delete subscriber" data-id="${sub.id}" data-email="${escapeHtml(sub.email)}">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </td>
      </tr>
    `;
  }).join('');

  // Pagination controls
  renderPagination(filtered.length, totalPages);

  // Attach delete handlers
  tbody.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      openDeleteConfirm(btn.dataset.id, btn.dataset.email);
    });
  });
}

function renderPagination(total, totalPages) {
  const pagination = document.getElementById('pagination');
  const info = document.getElementById('pagination-info');
  const controls = document.getElementById('pagination-controls');

  if (totalPages <= 1) {
    pagination.style.display = 'none';
    return;
  }

  pagination.style.display = 'flex';

  const startIdx = (currentPage - 1) * PER_PAGE + 1;
  const endIdx = Math.min(currentPage * PER_PAGE, total);
  info.textContent = `Showing ${startIdx}–${endIdx} of ${total}`;

  let html = `<button class="page-btn" data-page="prev" ${currentPage === 1 ? 'disabled' : ''}>
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"></polyline></svg>
  </button>`;

  // Smart pagination: show first, last, current ± 1, with ellipsis
  const pagesToShow = getPageNumbers(currentPage, totalPages);
  pagesToShow.forEach(p => {
    if (p === '...') {
      html += `<span class="page-btn" style="cursor: default; border: none;">…</span>`;
    } else {
      html += `<button class="page-btn ${p === currentPage ? 'active' : ''}" data-page="${p}">${p}</button>`;
    }
  });

  html += `<button class="page-btn" data-page="next" ${currentPage === totalPages ? 'disabled' : ''}>
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
  </button>`;

  controls.innerHTML = html;

  controls.querySelectorAll('.page-btn[data-page]').forEach(btn => {
    btn.addEventListener('click', () => {
      const p = btn.dataset.page;
      if (p === 'prev' && currentPage > 1) currentPage--;
      else if (p === 'next' && currentPage < totalPages) currentPage++;
      else if (p !== 'prev' && p !== 'next') currentPage = parseInt(p);
      renderTable();
    });
  });
}

function getPageNumbers(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  
  const pages = [];
  pages.push(1);
  
  if (current > 3) pages.push('...');
  
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
    pages.push(i);
  }
  
  if (current < total - 2) pages.push('...');
  
  pages.push(total);
  return pages;
}

/* ==========================================================================
   7. Search & Export
   ========================================================================== */
function initSearchAndExport() {
  const searchInput = document.getElementById('search-input');
  const exportBtn = document.getElementById('export-csv-btn');

  let debounce;
  searchInput.addEventListener('input', () => {
    clearTimeout(debounce);
    debounce = setTimeout(() => {
      searchQuery = searchInput.value.trim();
      currentPage = 1;
      renderTable();
    }, 250);
  });

  exportBtn.addEventListener('click', exportCSV);
}

function exportCSV() {
  if (allSubscribers.length === 0) {
    showToast('No subscribers to export.', 'info');
    return;
  }

  const headers = ['Email', 'Source', 'Subscribed Date'];
  const rows = allSubscribers.map(sub => {
    const date = new Date(sub.created_at).toISOString().slice(0, 10);
    return [
      `"${sub.email.replace(/"/g, '""')}"`,
      `"${(sub.source || 'unknown').replace(/"/g, '""')}"`,
      date
    ].join(',');
  });

  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `rvas-subscribers-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();

  URL.revokeObjectURL(url);
  showToast(`Exported ${allSubscribers.length} subscribers to CSV`, 'success');
}

/* ==========================================================================
   8. Delete Subscriber
   ========================================================================== */
let pendingDeleteId = null;

function openDeleteConfirm(id, email) {
  pendingDeleteId = id;
  document.getElementById('confirm-email').textContent = email;
  document.getElementById('confirm-overlay').classList.add('open');

  // Wire up buttons (fresh listeners)
  const cancelBtn = document.getElementById('confirm-cancel-btn');
  const deleteBtn = document.getElementById('confirm-delete-btn');

  const closeModal = () => {
    document.getElementById('confirm-overlay').classList.remove('open');
    pendingDeleteId = null;
  };

  cancelBtn.onclick = closeModal;
  deleteBtn.onclick = async () => {
    if (!pendingDeleteId) return;

    deleteBtn.disabled = true;
    deleteBtn.textContent = 'Deleting...';

    const client = getSB();
    if (!client) return;

    try {
      const { error } = await client
        .from('subscribers')
        .delete()
        .eq('id', pendingDeleteId);

      if (error) {
        showToast('Delete failed: ' + error.message, 'error');
      } else {
        allSubscribers = allSubscribers.filter(s => s.id !== pendingDeleteId);
        updateStats();
        renderChart();
        renderTable();
        showToast('Subscriber removed successfully', 'success');
      }
    } catch (err) {
      showToast('Network error during deletion', 'error');
    }

    deleteBtn.disabled = false;
    deleteBtn.textContent = 'Delete';
    closeModal();
  };

  // Close on overlay click
  document.getElementById('confirm-overlay').onclick = (e) => {
    if (e.target === document.getElementById('confirm-overlay')) {
      closeModal();
    }
  };

  // Close on Escape
  const escHandler = (e) => {
    if (e.key === 'Escape') {
      closeModal();
      window.removeEventListener('keydown', escHandler);
    }
  };
  window.addEventListener('keydown', escHandler);
}

/* ==========================================================================
   9. Toast Notifications (same pattern as main site)
   ========================================================================== */
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast';

  let iconSvg;
  if (type === 'success') {
    iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
  } else if (type === 'error') {
    iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`;
  } else {
    iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;
  }

  toast.innerHTML = `${iconSvg}<span>${escapeHtml(message)}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(20px)';
    setTimeout(() => toast.remove(), 300);
  }, 4500);
}

/* ==========================================================================
   10. Utilities
   ========================================================================== */
function escapeHtml(str) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}
