/**
 * ============================================================
 * FrameWork Forge — app.js
 * Main application logic:
 *  - Framework data loading
 *  - Framework card rendering
 *  - Multi-selection system
 *  - Comparison dashboard generation
 *  - Chart.js radar & bar charts
 *  - Smart recommendation engine (rule-based)
 *  - Detail modal system
 *  - Dark/Light mode toggle
 *  - Toast notifications
 * ============================================================
 */

/* ==========================================
   GLOBAL STATE
   ========================================== */
let ALL_FRAMEWORKS = [];         // All framework data (loaded from JSON)
let selectedIds = new Set();  // Set of currently selected framework IDs
let radarChartInst = null;       // Chart.js radar instance
let barChartInst = null;       // Chart.js bar instance

/* ==========================================
   METRIC DEFINITIONS (Score Keys → Labels)
   ========================================== */
const METRICS = [
    { key: 'performance', label: 'Performance', icon: 'fa-gauge-high' },
    { key: 'learningCurve', label: 'Ease of Learning', icon: 'fa-graduation-cap' },
    { key: 'communitySupport', label: 'Community Support', icon: 'fa-users' },
    { key: 'jobDemand', label: 'Job Demand', icon: 'fa-briefcase' },
    { key: 'scalability', label: 'Scalability', icon: 'fa-arrows-up-down-left-right' },
];

/* ==========================================
   CHART COLOR PALETTE
   Per-framework accent colors for charts
   ========================================== */
const CHART_COLORS = {
    react: { bg: 'rgba(97,218,251,0.25)', border: '#61DAFB' },
    angular: { bg: 'rgba(221,0,49,0.25)', border: '#DD0031' },
    vue: { bg: 'rgba(66,184,131,0.25)', border: '#42B883' },
    django: { bg: 'rgba(68,183,139,0.25)', border: '#44B78B' },
    laravel: { bg: 'rgba(255,45,32,0.25)', border: '#FF2D20' },
    express: { bg: 'rgba(104,160,99,0.25)', border: '#68A063' },
};

/* ==========================================
   BOOT — Load JSON data then initialise app
   ========================================== */
document.addEventListener('DOMContentLoaded', () => {
    loadFrameworks();
    initThemeToggle();
    initNavbarScroll();
    initModalClose();
    initRecommendationForm();
    initMobileNav();
    // Sync mobile theme icon with desktop
    document.getElementById('themeToggleMobile')?.addEventListener('click', () => {
        document.getElementById('themeToggle')?.click();
    });
});

/**
 * Fetch frameworks.json from disk (works from a local file or GitHub Pages).
 * Falls back to inline data if fetch is blocked (file:// protocol restriction).
 */
async function loadFrameworks() {
    try {
        const res = await fetch('frameworks.json');
        if (!res.ok) throw new Error('HTTP error');
        ALL_FRAMEWORKS = await res.json();
    } catch (e) {
        // Fallback: inline minimal data so site still works offline
        console.warn('Could not fetch frameworks.json, using inline data.', e);
        ALL_FRAMEWORKS = FALLBACK_DATA;
    }
    renderFrameworkCards();
}

/* ==========================================
   FRAMEWORK CARDS RENDERING
   ========================================== */
function renderFrameworkCards() {
    const grid = document.getElementById('frameworkGrid');
    grid.innerHTML = '';

    ALL_FRAMEWORKS.forEach(fw => {
        const color = fw.color;
        const avgScore = calcAvgScore(fw);

        const card = document.createElement('div');
        card.className = 'framework-card animate-fade-in-up';
        card.dataset.id = fw.id;
        card.style.setProperty('--card-color', color);

        card.innerHTML = `
      <!-- Selection checkmark -->
      <div class="card-check">
        <i class="fas fa-check text-xs"></i>
      </div>

      <!-- Icon -->
      <div class="card-icon-wrapper" style="background: ${color}22; color: ${color}">
        <i class="${fw.icon}"></i>
      </div>

      <!-- Type badge -->
      <div class="card-type-badge ${fw.type.toLowerCase()}">
        <i class="fas ${fw.type === 'Frontend' ? 'fa-palette' : 'fa-server'} text-xs"></i>
        ${fw.type}
      </div>

      <!-- Name & tagline -->
      <div class="card-name">${fw.name}</div>
      <div class="card-tagline">${fw.tagline}</div>

      <!-- Mini score bars -->
      <div class="card-scores">
        ${METRICS.slice(0, 4).map(m => `
          <div class="card-score-item">
            <span class="card-score-label">${m.label.split(' ')[0]}</span>
            <div class="card-score-bar">
              <div class="card-score-fill" style="width: ${fw.scores[m.key]}%; background: ${color}"></div>
            </div>
          </div>
        `).join('')}
      </div>

      <!-- Card footer -->
      <div class="card-footer">
        <span class="card-lang"><i class="fas fa-code mr-1"></i>${fw.language}</span>
        <span class="card-detail-btn">
          Details <i class="fas fa-arrow-right text-xs"></i>
        </span>
      </div>
    `;

        // Attach Details button click via addEventListener (reliable, no inline onclick)
        const detailBtn = card.querySelector('.card-detail-btn');
        detailBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // prevent card selection toggle from firing
            openModal(fw.id);
        });

        // Toggle selection on card click (except detail button)
        card.addEventListener('click', (e) => {
            if (e.target.closest('.card-detail-btn')) return;
            toggleSelection(fw.id);
        });

        grid.appendChild(card);
    });

    // Wire up compare button
    document.getElementById('compareBtn').addEventListener('click', showComparisonDashboard);
    document.getElementById('clearSelection').addEventListener('click', clearAllSelections);
    document.getElementById('backToSelect').addEventListener('click', showSelectionSection);
    document.getElementById('scrollToRecommend').addEventListener('click', () => {
        document.getElementById('recommend').scrollIntoView({ behavior: 'smooth' });
    });
}

/* ==========================================
   SELECTION LOGIC
   ========================================== */
function toggleSelection(id) {
    if (selectedIds.has(id)) {
        selectedIds.delete(id);
        showToast(`Removed from comparison`, 'info');
    } else {
        if (selectedIds.size >= 4) {
            showToast('Max 4 frameworks can be compared at once.', 'warning');
            return;
        }
        selectedIds.add(id);
        showToast(`Added to comparison`, 'success');
    }
    updateSelectionUI();
}

function updateSelectionUI() {
    const count = selectedIds.size;

    // Update each card's visual state
    document.querySelectorAll('.framework-card').forEach(card => {
        const id = card.dataset.id;
        card.classList.toggle('selected', selectedIds.has(id));
    });

    // Update counter
    document.getElementById('selectedCount').textContent = count;

    // Show/hide clear button
    document.getElementById('clearSelection').classList.toggle('hidden', count === 0);

    // Enable/disable compare button
    const btn = document.getElementById('compareBtn');
    btn.disabled = count < 2;
    document.getElementById('compareCount').textContent = count;
}

function clearAllSelections() {
    selectedIds.clear();
    updateSelectionUI();
    showToast('Selection cleared', 'info');
}

/* ==========================================
   SHOW / HIDE SECTIONS
   ========================================== */
function showComparisonDashboard() {
    if (selectedIds.size < 2) {
        showToast('Please select at least 2 frameworks.', 'warning');
        return;
    }

    // Get selected framework objects
    const selected = ALL_FRAMEWORKS.filter(fw => selectedIds.has(fw.id));

    // Show dashboard, scroll to it
    const dashboard = document.getElementById('dashboard');
    dashboard.classList.remove('hidden');
    setTimeout(() => {
        dashboard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);

    // Render all comparison components
    renderScoreCards(selected);
    renderProgressBars(selected);
    renderCharts(selected);
    renderComparisonTable(selected);
}

function showSelectionSection() {
    document.getElementById('dashboard').classList.add('hidden');
    document.getElementById('compare').scrollIntoView({ behavior: 'smooth' });
}

/* ==========================================
   SCORE CARDS (top row in dashboard)
   ========================================== */
function renderScoreCards(frameworks) {
    const container = document.getElementById('scoreCardsRow');
    container.style.gridTemplateColumns = `repeat(${frameworks.length}, 1fr)`;
    container.innerHTML = '';

    frameworks.forEach(fw => {
        const avg = calcAvgScore(fw);
        const color = fw.color;
        const div = document.createElement('div');
        div.className = 'score-fw-card animate-fade-in-up';
        div.innerHTML = `
      <div class="score-fw-icon" style="background: ${color}22; color: ${color}">
        <i class="${fw.icon}"></i>
      </div>
      <div class="score-fw-name">${fw.name}</div>
      <div class="score-fw-avg">${avg}</div>
      <div class="score-fw-label">Average Score / 100</div>
    `;
        container.appendChild(div);
    });
}

/* ==========================================
   ANIMATED PROGRESS BARS — Redesigned
   Each metric shows one bar per framework
   with label, animated fill, and score.
   ========================================== */
function renderProgressBars(frameworks) {
    const container = document.getElementById('progressBarsContainer');
    container.innerHTML = '';

    /* ---- Colour Legend ---- */
    const legend = document.createElement('div');
    legend.className = 'metrics-legend';
    legend.innerHTML = frameworks.map(fw => `
        <div class="legend-item">
            <div class="legend-dot" style="background:${fw.color}; box-shadow: 0 0 6px ${fw.color}88"></div>
            <i class="${fw.icon}" style="color:${fw.color}; font-size:0.75rem"></i>
            <span>${fw.name}</span>
        </div>
    `).join('');
    container.appendChild(legend);

    /* ---- One section per metric ---- */
    METRICS.forEach(metric => {
        const section = document.createElement('div');
        section.className = 'metric-section';

        // Find best scorer for this metric (to highlight)
        const best = frameworks.reduce((a, b) =>
            b.scores[metric.key] > a.scores[metric.key] ? b : a
        );

        const barsHTML = frameworks.map(fw => {
            const score = fw.scores[metric.key];
            const isBest = fw.id === best.id;
            return `
            <div class="fw-bar-row">
                <div class="fw-bar-label" style="color:${fw.color}">
                    <i class="${fw.icon}"></i>
                    <span>${fw.name}</span>
                </div>
                <div class="fw-bar-track">
                    <div class="fw-bar-fill"
                         data-width="${score}"
                         style="background: linear-gradient(90deg, ${fw.color}bb, ${fw.color})">
                    </div>
                </div>
                <div class="fw-bar-score ${isBest ? 'fw-bar-score--best' : ''}"
                     style="${isBest ? `color:${fw.color}` : ''}">
                    ${score}
                    ${isBest ? '<i class="fas fa-crown" style="font-size:0.6rem; margin-left:2px"></i>' : ''}
                </div>
            </div>`;
        }).join('');

        section.innerHTML = `
            <div class="metric-section-header">
                <div class="metric-section-title-group">
                    <div class="metric-icon-wrap">
                        <i class="fas ${metric.icon}"></i>
                    </div>
                    <span class="metric-section-label">${metric.label}</span>
                </div>
            </div>
            <div class="metric-bars-group">${barsHTML}</div>
        `;
        container.appendChild(section);
    });

    /* Trigger CSS width animation after paint */
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            container.querySelectorAll('.fw-bar-fill').forEach(fill => {
                fill.style.width = fill.dataset.width + '%';
            });
        });
    });
}

/* ==========================================
   CHART.JS — RADAR + BAR CHARTS
   ========================================== */
function getChartThemeColors() {
    /* Reads CSS variables to stay theme-aware */
    const style = getComputedStyle(document.documentElement);
    const isDark = document.body.getAttribute('data-theme') === 'dark';
    return {
        grid: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
        text: isDark ? '#9090b0' : '#4a4a6a',
    };
}

function renderCharts(frameworks) {
    const labels = METRICS.map(m => m.label);
    const theme = getChartThemeColors();

    // Destroy existing chart instances before re-creating
    if (radarChartInst) { radarChartInst.destroy(); radarChartInst = null; }
    if (barChartInst) { barChartInst.destroy(); barChartInst = null; }

    /* ---- RADAR CHART ---- */
    const radarCtx = document.getElementById('radarChart').getContext('2d');
    const radarDatasets = frameworks.map(fw => ({
        label: fw.name,
        data: METRICS.map(m => fw.scores[m.key]),
        backgroundColor: CHART_COLORS[fw.id]?.bg || 'rgba(139,92,246,0.2)',
        borderColor: CHART_COLORS[fw.id]?.border || '#8b5cf6',
        borderWidth: 2,
        pointBackgroundColor: CHART_COLORS[fw.id]?.border || '#8b5cf6',
        pointRadius: 4,
    }));

    radarChartInst = new Chart(radarCtx, {
        type: 'radar',
        data: { labels, datasets: radarDatasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                r: {
                    min: 0, max: 100,
                    ticks: {
                        stepSize: 25,
                        color: theme.text,
                        backdropColor: 'transparent',
                        font: { size: 10 },
                    },
                    grid: { color: theme.grid },
                    angleLines: { color: theme.grid },
                    pointLabels: {
                        color: theme.text,
                        font: { size: 11, family: 'Inter' },
                    },
                },
            },
            plugins: {
                legend: {
                    labels: { color: theme.text, font: { family: 'Inter', size: 12 }, boxWidth: 12 },
                },
            },
        },
    });

    /* ---- BAR CHART ---- */
    const barCtx = document.getElementById('barChart').getContext('2d');
    const barDatasets = frameworks.map(fw => ({
        label: fw.name,
        data: METRICS.map(m => fw.scores[m.key]),
        backgroundColor: CHART_COLORS[fw.id]?.bg || 'rgba(139,92,246,0.3)',
        borderColor: CHART_COLORS[fw.id]?.border || '#8b5cf6',
        borderWidth: 2,
        borderRadius: 6,
    }));

    barChartInst = new Chart(barCtx, {
        type: 'bar',
        data: { labels: labels.map(l => l.split(' ')[0]), datasets: barDatasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    ticks: { color: theme.text, font: { family: 'Inter', size: 11 } },
                    grid: { color: theme.grid },
                },
                y: {
                    min: 0, max: 100,
                    ticks: { color: theme.text, font: { family: 'Inter', size: 11 } },
                    grid: { color: theme.grid },
                },
            },
            plugins: {
                legend: {
                    labels: { color: theme.text, font: { family: 'Inter', size: 12 }, boxWidth: 12 },
                },
            },
        },
    });
}

/* ==========================================
   COMPARISON TABLE — mobile card-ready
   data-label on each <td> allows CSS to show
   it as a card row label on small screens.
   ========================================== */
function renderComparisonTable(frameworks) {
    const table = document.getElementById('comparisonTable');

    // Helper: row factory (adds data-label to each fw cell)
    const makeRow = (labelHTML, cellsFn) =>
        `<tr>
  <td class="table-row-label">${labelHTML}</td>
  ${frameworks.map((fw, i) => `<td data-label="${fw.name}">${cellsFn(fw, i)}</td>`).join('')}
</tr>`;

    // Header row
    let html = `<thead><tr>
  <th></th>
  ${frameworks.map(fw => `<th class="table-fw-header" style="color:${fw.color}">
    <i class="${fw.icon} mr-1"></i>${fw.name}
  </th>`).join('')}
</tr></thead><tbody>`;

    html += makeRow('<strong>Type</strong>', fw => fw.type);
    html += makeRow('<strong>Language</strong>', fw => fw.language);
    html += makeRow('<strong>Creator</strong>', fw => fw.creator);
    html += makeRow('<strong>Year</strong>', fw => fw.year);

    // Score rows
    METRICS.forEach(metric => {
        html += makeRow(
            `<i class="fas ${metric.icon} mr-1 opacity-60"></i><strong>${metric.label}</strong>`,
            fw => {
                const score = fw.scores[metric.key];
                const cls = score >= 80 ? 'score-high' : score >= 60 ? 'score-mid' : 'score-low';
                return `<span class="score-pill ${cls}">${score}/100</span>`;
            }
        );
    });

    // Avg score row
    html += makeRow('<strong>⭐ Avg Score</strong>', fw => {
        const avg = calcAvgScore(fw);
        const cls = avg >= 80 ? 'score-high' : avg >= 60 ? 'score-mid' : 'score-low';
        return `<span class="score-pill ${cls}">${avg}/100</span>`;
    });

    html += '</tbody>';
    table.innerHTML = html;
}

/* ==========================================
   SMART RECOMMENDATION ENGINE
   Rule-based scoring system:
   Weights each framework based on user answers.
   ========================================== */
function initRecommendationForm() {
    const NAMES = ['experience', 'scale', 'priority', 'type'];

    function updateProgress() {
        const answered = NAMES.filter(n =>
            document.querySelector(`input[name="${n}"]:checked`)
        ).length;
        const countEl = document.getElementById('answeredCount');
        const fillEl = document.getElementById('answeredFill');
        if (countEl) countEl.textContent = answered;
        if (fillEl) fillEl.style.width = (answered / 4 * 100) + '%';
    }

    // Make radio pill selection work (since we're using hidden inputs)
    document.querySelectorAll('.radio-option').forEach(option => {
        option.addEventListener('click', () => {
            const input = option.querySelector('input[type="radio"]');
            if (!input) return;
            // Deselect siblings in the same group
            document.querySelectorAll(`input[name="${input.name}"]`)
                .forEach(i => i.closest('.radio-option').classList.remove('checked'));
            // Select this option
            option.classList.add('checked');
            input.checked = true;
            updateProgress();
        });
    });

    document.getElementById('generateRecommendation').addEventListener('click', generateRecommendation);
}

function generateRecommendation() {
    /* Read user answers */
    const experience = document.querySelector('input[name="experience"]:checked')?.value;
    const scale = document.querySelector('input[name="scale"]:checked')?.value;
    const priority = document.querySelector('input[name="priority"]:checked')?.value;
    const type = document.querySelector('input[name="type"]:checked')?.value;

    if (!experience || !scale || !priority || !type) {
        showToast('Please answer all questions to get a recommendation.', 'warning');
        return;
    }

    /* Score each framework based on rules */
    const scored = ALL_FRAMEWORKS.map(fw => ({
        fw,
        score: computeRecommendationScore(fw, { experience, scale, priority, type }),
    })).sort((a, b) => b.score - a.score);

    const winner = scored[0].fw;
    const runners = scored.slice(1, 3).map(s => s.fw);
    const explanation = buildExplanation(winner, { experience, scale, priority, type });

    displayRecommendation(winner, runners, explanation, { experience, scale, priority, type });
}

/**
 * Rule-based scoring function.
 * Returns a numeric score for a framework given user preferences.
 */
function computeRecommendationScore(fw, { experience, scale, priority, type }) {
    let score = 0;
    const s = fw.scores;
    const tags = fw.tags || [];

    /* --- Experience Level Rules --- */
    if (experience === 'beginner') {
        score += s.learningCurve * 0.5;    // Prioritise ease of learning
        if (tags.includes('beginner-friendly')) score += 30;
    } else if (experience === 'intermediate') {
        score += s.learningCurve * 0.2;
        score += s.performance * 0.3;
        if (tags.includes('fast-development')) score += 15;
    } else { // advanced
        score += s.performance * 0.35;
        score += s.scalability * 0.25;
        if (tags.includes('enterprise') || tags.includes('large-scale')) score += 20;
    }

    /* --- Project Scale Rules --- */
    if (scale === 'small') {
        score += s.learningCurve * 0.2;
        if (tags.includes('lightweight') || tags.includes('fast-development')) score += 15;
    } else if (scale === 'medium') {
        score += s.performance * 0.2;
        score += s.communitySupport * 0.15;
    } else { // large
        score += s.scalability * 0.4;
        score += s.communitySupport * 0.2;
        if (tags.includes('enterprise') || tags.includes('scalable')) score += 25;
    }

    /* --- Priority Rules --- */
    if (priority === 'speed') {
        score += s.learningCurve * 0.3;
        if (tags.includes('fast-development')) score += 20;
    } else if (priority === 'performance') {
        score += s.performance * 0.4;
        if (tags.includes('high-performance')) score += 20;
    } else { // jobs
        score += s.jobDemand * 0.5;
        if (tags.includes('high-demand')) score += 20;
    }

    /* --- Project Type Rules --- */
    if (type === 'frontend') {
        if (fw.type === 'Frontend') score += 40;
        if (fw.type === 'Backend') score -= 20;
    } else if (type === 'backend') {
        if (fw.type === 'Backend') score += 40;
        if (fw.type === 'Frontend') score -= 20;
    } else { // fullstack
        // Prefer popular combos — both types get boost
        if (fw.id === 'react' || fw.id === 'express') score += 25;
        if (fw.id === 'vue' || fw.id === 'django') score += 20;
        if (fw.id === 'angular' || fw.id === 'laravel') score += 15;
    }

    /* Baseline community score */
    score += s.communitySupport * 0.05;

    return Math.round(score);
}

/**
 * Build a human-readable explanation string for the recommendation.
 */
function buildExplanation(fw, { experience, scale, priority, type }) {
    const levelMap = { beginner: 'a beginner', intermediate: 'an intermediate developer', advanced: 'an advanced developer' };
    const scaleMap = { small: 'a small personal project', medium: 'a medium-scale startup project', large: 'a large enterprise application' };
    const priorityMap = { speed: 'fast development speed', performance: 'high performance', jobs: 'strong job market opportunities' };
    const typeMap = { frontend: 'frontend UI', backend: 'backend API', fullstack: 'a fullstack' };

    return `As ${levelMap[experience]} building ${typeMap[type]} for ${scaleMap[scale]} 
  with a focus on <strong>${priorityMap[priority]}</strong>, 
  <strong>${fw.name}</strong> scores highest across all your preferences. 
  It offers an excellent balance of ${fw.scores.learningCurve >= 75 ? 'easy learning curve' : 'powerful capabilities'}, 
  ${fw.scores.jobDemand >= 85 ? 'strong industry demand' : 'solid community support'}, 
  and ${fw.scores.scalability >= 85 ? 'enterprise-grade scalability' : 'reliable performance'}.`;
}

/**
 * Render the recommendation result card.
 */
function displayRecommendation(winner, runners, explanation, prefs) {
    const resultEl = document.getElementById('recommendResult');
    const color = winner.color;

    /* Build reason chips from matching tags */
    const reasonChips = buildReasonChips(winner, prefs);

    resultEl.innerHTML = `
    <div class="result-card">
      <!-- Winner badge -->
      <div class="winner-badge">
        <i class="fas fa-trophy"></i> Best Match For You
      </div>

      <!-- Winner name + icon -->
      <div class="flex items-center gap-4 mb-4">
        <div class="score-fw-icon w-16 h-16 rounded-2xl" style="background:${color}22; color:${color}; width:64px; height:64px; display:flex; align-items:center; justify-content:center; font-size:1.75rem; border-radius:16px;">
          <i class="${winner.icon}"></i>
        </div>
        <div>
          <div class="result-framework-name">${winner.name}</div>
          <div style="color: var(--text-muted); font-size:0.85rem;">${winner.tagline}</div>
        </div>
      </div>

      <!-- Explanation -->
      <p class="result-explanation">${explanation}</p>

      <!-- Reason Chips -->
      <div class="reason-chips mb-6">${reasonChips}</div>

      <!-- Score grid -->
      <div class="modal-score-grid">
        ${METRICS.map(m => `
          <div class="modal-score-box">
            <div class="modal-score-val">${winner.scores[m.key]}</div>
            <div class="modal-score-key">${m.label}</div>
          </div>
        `).join('')}
      </div>

      <!-- Runner-ups -->
      <div class="mt-6">
        <div class="modal-section-title">Also consider</div>
        <div class="runner-up-grid">
          ${runners.map(fw => `
            <div class="runner-card">
              <strong>${fw.name}</strong><br/>
              <span>${fw.type} · ${fw.language}</span>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- View detail button -->
      <div class="mt-6 flex gap-3">
        <button onclick="openModal('${winner.id}')" class="btn-primary flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-200">
          <i class="fas fa-info-circle"></i> Learn More About ${winner.name}
        </button>
        <button onclick="preselectAndCompare('${winner.id}')" class="btn-secondary flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-200">
          <i class="fas fa-balance-scale"></i> Compare ${winner.name}
        </button>
      </div>
    </div>
  `;

    resultEl.classList.remove('hidden');
    resultEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function buildReasonChips(fw, { experience, scale, priority, type }) {
    const chips = [];
    if (experience === 'beginner' && fw.scores.learningCurve >= 75) chips.push('Beginner Friendly');
    if (experience === 'advanced' && fw.scores.scalability >= 85) chips.push('Enterprise Grade');
    if (scale === 'large' && fw.scores.scalability >= 85) chips.push('Highly Scalable');
    if (priority === 'performance' && fw.scores.performance >= 85) chips.push('High Performance');
    if (priority === 'jobs' && fw.scores.jobDemand >= 85) chips.push('Strong Job Market');
    if (fw.scores.communitySupport >= 85) chips.push('Great Community');
    if (type === 'frontend' && fw.type === 'Frontend') chips.push('Frontend Native');
    if (type === 'backend' && fw.type === 'Backend') chips.push('Backend Native');
    return chips.map(c => `<span class="reason-chip">${c}</span>`).join('');
}

/**
 * Pre-select a framework and scroll to comparison section.
 */
function preselectAndCompare(id) {
    if (!selectedIds.has(id)) {
        selectedIds.add(id);
        updateSelectionUI();
    }
    document.getElementById('compare').scrollIntoView({ behavior: 'smooth' });
    showToast(`${id} pre-selected. Pick more frameworks to compare!`, 'info');
}

/* ==========================================
   FRAMEWORK DETAIL MODAL
   ========================================== */
function openModal(id, event) {
    if (event) event.stopPropagation();
    const fw = ALL_FRAMEWORKS.find(f => f.id === id);
    if (!fw) return;

    const color = fw.color;
    const modal = document.getElementById('detailModal');
    const body = document.getElementById('modalBody');

    body.innerHTML = `
    <!-- Header -->
    <div class="modal-header-icon" style="background:${color}22; color:${color}">
      <i class="${fw.icon}"></i>
    </div>
    <div class="modal-fw-name">${fw.name}</div>
    <p style="color:var(--text-muted); font-size:0.85rem; margin: 4px 0 4px 0">${fw.tagline}</p>
    <div style="display:flex; gap:0.5rem; margin-bottom:1rem; flex-wrap:wrap;">
      <span class="card-type-badge ${fw.type.toLowerCase()}" style="margin-bottom:0">${fw.type}</span>
      <span style="font-size:0.75rem; color:var(--text-muted); display:flex; align-items:center; gap:4px">
        <i class="fas fa-code"></i> ${fw.language}
      </span>
      <span style="font-size:0.75rem; color:var(--text-muted); display:flex; align-items:center; gap:4px">
        <i class="fas fa-calendar"></i> Since ${fw.year}
      </span>
      <span style="font-size:0.75rem; color:var(--text-muted); display:flex; align-items:center; gap:4px">
        <i class="fas fa-user"></i> ${fw.creator}
      </span>
    </div>

    <!-- Scores -->
    <div class="modal-section-title">📊 Scores</div>
    <div class="modal-score-grid">
      ${METRICS.map(m => `
        <div class="modal-score-box">
          <div class="modal-score-val">${fw.scores[m.key]}</div>
          <div class="modal-score-key">${m.label}</div>
        </div>
      `).join('')}
    </div>

    <!-- Best Use Cases -->
    <div class="modal-section-title">🎯 Best Use Cases</div>
    <div style="display:flex; flex-wrap:wrap; gap:8px; margin-top:0.5rem">
      ${fw.bestUseCases.map(u => `<span class="use-case-chip"><i class="fas fa-check-circle text-xs"></i>${u}</span>`).join('')}
    </div>

    <!-- Pros -->
    <div class="modal-section-title">✅ Pros</div>
    ${fw.pros.map(p => `
      <div class="pro-item">
        <i class="fas fa-circle-check pro-icon"></i>
        <span>${p}</span>
      </div>
    `).join('')}

    <!-- Cons -->
    <div class="modal-section-title">❌ Cons</div>
    ${fw.cons.map(c => `
      <div class="con-item">
        <i class="fas fa-circle-xmark con-icon"></i>
        <span>${c}</span>
      </div>
    `).join('')}

    <!-- Action footer -->
    <div style="margin-top:1.5rem; display:flex; gap:0.75rem; flex-wrap:wrap;">
      <button onclick="toggleSelection('${fw.id}'); closeModal();" class="btn-primary flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200" style="display:flex">
        <i class="fas fa-plus"></i> Add to Comparison
      </button>
    </div>
  `;

    // Use style.display directly — avoids ALL Tailwind class conflicts
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    const modal = document.getElementById('detailModal');
    modal.style.display = 'none';
    document.body.style.overflow = '';
}

function initModalClose() {
    document.getElementById('closeModal').addEventListener('click', closeModal);
    document.getElementById('modalBackdrop').addEventListener('click', closeModal);
    // ESC key closes modal
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') closeModal();
    });
}

/* ==========================================
   DARK / LIGHT MODE TOGGLE
   ========================================== */
function initThemeToggle() {
    const savedTheme = localStorage.getItem('ffTheme') || 'dark';
    applyTheme(savedTheme);

    document.getElementById('themeToggle').addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        applyTheme(next);
        localStorage.setItem('ffTheme', next);
    });
}

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    document.body.setAttribute('data-theme', theme);
    const icon = document.getElementById('themeIcon');
    icon.className = theme === 'dark' ? 'fas fa-sun text-lg' : 'fas fa-moon text-lg';

    // Re-draw charts if they exist (to pick up new theme colors)
    if (radarChartInst || barChartInst) {
        const selected = ALL_FRAMEWORKS.filter(fw => selectedIds.has(fw.id));
        if (selected.length >= 2) renderCharts(selected);
    }
}

/* ==========================================
   NAVBAR SCROLL EFFECT
   ========================================== */
function initNavbarScroll() {
    window.addEventListener('scroll', () => {
        const navbar = document.getElementById('navbar');
        navbar.classList.toggle('scrolled', window.scrollY > 50);
    });
}

/* ==========================================
   MOBILE HAMBURGER NAV
   ========================================== */
function initMobileNav() {
    const hamburger = document.getElementById('hamburger');
    const mobileNav = document.getElementById('mobileNav');
    const backdrop = document.getElementById('mobileNavBackdrop');
    const closeBtn = document.getElementById('mobileNavClose');
    const navLinks = document.querySelectorAll('.mobile-nav-link');

    if (!hamburger || !mobileNav) return;

    function openNav() {
        mobileNav.classList.remove('translate-x-full');
        backdrop.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        hamburger.setAttribute('aria-expanded', 'true');
    }

    function closeNav() {
        mobileNav.classList.add('translate-x-full');
        backdrop.classList.add('hidden');
        document.body.style.overflow = '';
        hamburger.setAttribute('aria-expanded', 'false');
    }

    hamburger.addEventListener('click', openNav);
    closeBtn.addEventListener('click', closeNav);
    backdrop.addEventListener('click', closeNav);
    // Close when any nav link is clicked
    navLinks.forEach(link => link.addEventListener('click', closeNav));
}

/* ==========================================
   TOAST NOTIFICATION SYSTEM
   ========================================== */
let toastTimer = null;

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    const msgEl = document.getElementById('toastMessage');
    const iconEl = document.getElementById('toastIcon');

    const configs = {
        success: { icon: 'fa-circle-check', color: '#10b981' },
        warning: { icon: 'fa-triangle-exclamation', color: '#f59e0b' },
        info: { icon: 'fa-info-circle', color: '#06b6d4' },
        error: { icon: 'fa-circle-xmark', color: '#ef4444' },
    };

    const cfg = configs[type] || configs.info;
    msgEl.textContent = message;
    iconEl.className = `fas ${cfg.icon}`;
    iconEl.style.color = cfg.color;

    toast.classList.remove('hidden');

    // Auto-hide after 3 seconds
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}

/* ==========================================
   HELPER: Calculate average score for a framework
   ========================================== */
function calcAvgScore(fw) {
    const vals = Object.values(fw.scores);
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}

/* ==========================================
   FALLBACK DATA (if frameworks.json can't load)
   Very minimal inline copy for file:// fallback
   ========================================== */
const FALLBACK_DATA = [
    {
        id: 'react', name: 'React', type: 'Frontend', icon: 'fab fa-react', color: '#61DAFB', tagline: 'UI library by Meta', creator: 'Meta', year: 2013, language: 'JavaScript',
        scores: { performance: 90, learningCurve: 70, communitySupport: 95, jobDemand: 95, scalability: 88 },
        bestUseCases: ['SPAs', 'Dashboards', 'Mobile apps'], pros: ['Fast rendering', 'Huge ecosystem'], cons: ['Extra libraries needed'], tags: ['beginner-friendly', 'high-demand', 'fast-development', 'spa']
    },
    {
        id: 'angular', name: 'Angular', type: 'Frontend', icon: 'fab fa-angular', color: '#DD0031', tagline: 'Full platform by Google', creator: 'Google', year: 2016, language: 'TypeScript',
        scores: { performance: 85, learningCurve: 45, communitySupport: 85, jobDemand: 80, scalability: 95 },
        bestUseCases: ['Enterprise apps', 'PWAs'], pros: ['Full framework', 'TypeScript'], cons: ['Steep curve'], tags: ['enterprise', 'large-scale', 'scalable']
    },
    {
        id: 'vue', name: 'Vue.js', type: 'Frontend', icon: 'fab fa-vuejs', color: '#42B883', tagline: 'Progressive JS framework', creator: 'Evan You', year: 2014, language: 'JavaScript',
        scores: { performance: 88, learningCurve: 88, communitySupport: 80, jobDemand: 75, scalability: 82 },
        bestUseCases: ['SPAs', 'Prototyping'], pros: ['Easy learning', 'Good docs'], cons: ['Smaller job market'], tags: ['beginner-friendly', 'fast-development', 'lightweight']
    },
    {
        id: 'django', name: 'Django', type: 'Backend', icon: 'fas fa-server', color: '#092E20', colorLight: '#44B78B', tagline: 'Python web framework', creator: 'Adrian Holovaty', year: 2005, language: 'Python',
        scores: { performance: 78, learningCurve: 72, communitySupport: 85, jobDemand: 82, scalability: 88 },
        bestUseCases: ['REST APIs', 'CMS'], pros: ['Batteries included', 'Admin panel'], cons: ['Monolithic'], tags: ['beginner-friendly', 'fast-development', 'backend']
    },
    {
        id: 'laravel', name: 'Laravel', type: 'Backend', icon: 'fab fa-laravel', color: '#FF2D20', tagline: 'PHP framework for artisans', creator: 'Taylor Otwell', year: 2011, language: 'PHP',
        scores: { performance: 75, learningCurve: 75, communitySupport: 82, jobDemand: 78, scalability: 80 },
        bestUseCases: ['Full-stack apps', 'E-commerce'], pros: ['Eloquent ORM', 'Elegant syntax'], cons: ['PHP declining'], tags: ['beginner-friendly', 'fast-development', 'backend']
    },
    {
        id: 'express', name: 'Express.js', type: 'Backend', icon: 'fab fa-node-js', color: '#68A063', tagline: 'Minimalist Node.js framework', creator: 'TJ Holowaychuk', year: 2010, language: 'JavaScript',
        scores: { performance: 92, learningCurve: 80, communitySupport: 90, jobDemand: 88, scalability: 85 },
        bestUseCases: ['REST APIs', 'Real-time apps'], pros: ['Very fast', 'Same JS as frontend'], cons: ['Unopinionated'], tags: ['fast-development', 'high-performance', 'backend', 'real-time']
    },
];
