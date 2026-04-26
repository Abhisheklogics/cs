// ============================================================
//  router.js  —  Screen & Tab Navigation
//
//  Manages:
//    - Home screen → subject screens
//    - Back button
//    - Tab switching within a screen
//    - Lazy tab building (only builds HTML when first opened)
// ============================================================

// Track which tabs have already been built (so we don't rebuild)
const builtTabs = new Set();

// ── Navigate to a screen by ID ────────────────────────────
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id + '-screen').classList.add('active');
}

// ── Switch to a tab within a screen ──────────────────────
// Also calls the builder function the first time a tab opens
function showTab(tabId) {
  // Find parent screen
  const tabEl = document.getElementById('tab-' + tabId);
  if (!tabEl) return;

  // Update tab nav buttons in same screen
  const navTabs = tabEl.closest('.screen').querySelectorAll('.nav-tab');
  navTabs.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabId);
  });

  // Hide all tab panels in same screen, show this one
  tabEl.closest('.screen').querySelectorAll('.tab-panel').forEach(p => {
    p.classList.remove('active');
  });
  tabEl.classList.add('active');

  // Build the tab's HTML the first time it's opened (lazy loading)
if (!builtTabs.has(tabId)) {
  builtTabs.add(tabId);

  if      (tabId === 'perceptron') buildPerceptronTab();
  else if (tabId === 'mlp')        buildMlpTab();
  else if (tabId === 'ga')         buildGaTab();
  else if (tabId === 'dip')        buildDipTab();   // ✅ ADD THIS
}
}

// ── Wire up all navigation on page load ───────────────────
document.addEventListener('DOMContentLoaded', () => {

  // Subject cards on home screen → open subject screen + first tab
document.querySelectorAll('.subject-card').forEach(card => {
  card.addEventListener('click', () => {
    const subject = card.dataset.subject;

    if (subject === 'nn') {
      showScreen('nn');
      showTab('perceptron');
    } 
    else if (subject === 'ec') {
      showScreen('ec');
      showTab('ga');
    } 
    else if (subject === 'dip') {
      showScreen('dip');
      showTab('dip');
    }
  });

  card.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') card.click();
  });
});

  // Back buttons (inside subject screens)
  document.querySelectorAll('.back-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      showScreen(btn.dataset.goto);
    });
  });

  // Tab nav buttons inside each screen
  document.querySelectorAll('.nav-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      showTab(btn.dataset.tab);
    });
  });

});