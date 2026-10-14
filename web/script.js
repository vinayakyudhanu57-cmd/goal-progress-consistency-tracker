/**
 * ==============================================================================
 * web/script.js - Goal Progress & Consistency Tracker
 * Interactive Client Controller & R Backend Service Client
 * Pure Vanilla JavaScript • Zero External Libraries
 * ==============================================================================
 */

// Application State
const state = {
  goals: [],
  progress: [],
  evaluatedGoals: [],
  summary: null,
  referenceDate: '',
  selectedCategory: 'all',
  selectedStatus: 'all',
  searchQuery: '',
  currentView: 'goals',
  apiBaseUrl: '',
  backendConnected: false,
  isSubmitting: false
};

// DOM Elements
const dom = {
  // Header & Status
  backendStatusBadge: document.getElementById('backend-status-badge'),
  backendStatusText: document.getElementById('backend-status-text'),
  btnQuickLog: document.getElementById('btn-quick-log'),
  btnOpenCreateGoal: document.getElementById('btn-open-create-goal'),
  btnLoadSample: document.getElementById('btn-load-sample'),

  // KPIs
  kpiTotalGoals: document.getElementById('kpi-total-goals'),
  kpiActiveGoals: document.getElementById('kpi-active-goals'),
  kpiProgressingCount: document.getElementById('kpi-progressing-count'),
  kpiCompletedCount: document.getElementById('kpi-completed-count'),
  kpiStalledCount: document.getElementById('kpi-stalled-count'),
  kpiOverdueCount: document.getElementById('kpi-overdue-count'),
  kpiWeeklyEntries: document.getElementById('kpi-weekly-entries'),
  kpiWeeklyValue: document.getElementById('kpi-weekly-value'),

  // System Alert Banner
  systemAlertBanner: document.getElementById('system-alert-banner'),
  alertBannerTitle: document.getElementById('alert-banner-title'),
  alertBannerMessage: document.getElementById('alert-banner-message'),

  // Filters & Toolbar
  inputSearch: document.getElementById('input-search'),
  selectCategoryFilter: document.getElementById('select-category-filter'),
  statusFilterPills: document.querySelectorAll('.pill-btn'),
  countAll: document.getElementById('count-all'),
  countProgressing: document.getElementById('count-progressing'),
  countCompleted: document.getElementById('count-completed'),
  countStalled: document.getElementById('count-stalled'),
  countOverdue: document.getElementById('count-overdue'),
  tabViewGoals: document.getElementById('tab-view-goals'),
  tabViewWeekly: document.getElementById('tab-view-weekly'),

  // Main Sections
  sectionGoalsView: document.getElementById('section-goals-view'),
  sectionWeeklyView: document.getElementById('section-weekly-view'),
  emptyGoalsState: document.getElementById('empty-goals-state'),
  btnEmptyCreate: document.getElementById('btn-empty-create'),
  btnEmptySample: document.getElementById('btn-empty-sample'),
  goalsContainer: document.getElementById('goals-container'),

  // Weekly View Containers
  weeklyChartContainer: document.getElementById('weekly-chart-container'),
  upcomingDeadlinesContainer: document.getElementById('upcoming-deadlines-container'),
  categoryTableBody: document.getElementById('category-table-body'),

  // Modal: Goal Form
  modalGoal: document.getElementById('modal-goal'),
  formGoal: document.getElementById('form-goal'),
  modalGoalTitle: document.getElementById('modal-goal-title'),
  goalIdInput: document.getElementById('goal-id-input'),
  goalNameInput: document.getElementById('goal-name-input'),
  goalDescInput: document.getElementById('goal-desc-input'),
  goalCategoryInput: document.getElementById('goal-category-input'),
  goalUnitInput: document.getElementById('goal-unit-input'),
  goalStartInput: document.getElementById('goal-start-input'),
  goalTargetDateInput: document.getElementById('goal-target-date-input'),
  goalTargetValInput: document.getElementById('goal-target-val-input'),
  milestonesRowsContainer: document.getElementById('milestones-rows-container'),
  btnAddMilestoneRow: document.getElementById('btn-add-milestone-row'),
  goalFormAlert: document.getElementById('goal-form-alert'),
  goalFormAlertMsg: document.getElementById('goal-form-alert-msg'),
  btnCloseGoalModal: document.getElementById('btn-close-goal-modal'),
  btnCancelGoalModal: document.getElementById('btn-cancel-goal-modal'),

  // Modal: Progress Form
  modalProgress: document.getElementById('modal-progress'),
  formProgress: document.getElementById('form-progress'),
  progGoalSelect: document.getElementById('prog-goal-select'),
  progDateInput: document.getElementById('prog-date-input'),
  progValueInput: document.getElementById('prog-value-input'),
  progUnitLabel: document.getElementById('prog-unit-label'),
  progNotesInput: document.getElementById('prog-notes-input'),
  progressFormAlert: document.getElementById('progress-form-alert'),
  progressFormAlertMsg: document.getElementById('progress-form-alert-msg'),
  btnCloseProgressModal: document.getElementById('btn-close-progress-modal'),
  btnCancelProgressModal: document.getElementById('btn-cancel-progress-modal'),

  // Modal: History Drawer
  modalHistory: document.getElementById('modal-history'),
  historyModalGoalName: document.getElementById('history-modal-goal-name'),
  historyModalGoalMeta: document.getElementById('history-modal-goal-meta'),
  historyEntriesContainer: document.getElementById('history-entries-container'),
  btnCloseHistoryModal: document.getElementById('btn-close-history-modal'),
  btnCloseHistoryBtn: document.getElementById('btn-close-history-btn')
};

/**
 * Determine API Base URL dynamically
 */
function resolveApiBaseUrl() {
  const origin = window.location.origin;
  if (origin && origin.startsWith('http') && !origin.includes('file:')) {
    return origin;
  }
  return 'http://127.0.0.1:8000';
}

/**
 * Date Helpers
 */
function formatDate(d) {
  const dateObj = new Date(d);
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return formatDate(d);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Check R Backend Health
 */
async function checkBackendHealth() {
  try {
    dom.backendStatusBadge.className = 'status-badge status-checking';
    dom.backendStatusText.textContent = 'Connecting to R...';

    const res = await fetch(`${state.apiBaseUrl}/api/health`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    if (res.ok) {
      const data = await res.json();
      state.backendConnected = true;
      dom.backendStatusBadge.className = 'status-badge status-connected';
      dom.backendStatusText.textContent = 'Connected to R backend';
      dom.backendStatusBadge.title = `R Analytical Service Active (${data.r_version || 'R 4.6.1'})`;
      return true;
    } else {
      throw new Error(`HTTP ${res.status}`);
    }
  } catch (err) {
    state.backendConnected = false;
    dom.backendStatusBadge.className = 'status-badge status-error';
    dom.backendStatusText.textContent = 'R backend offline';
    dom.backendStatusBadge.title = `Could not reach R API at ${state.apiBaseUrl}. Ensure Rscript R/main.R is running.`;
    return false;
  }
}

/**
 * Load Sample Data from Backend
 */
async function loadSampleData() {
  try {
    const res = await fetch(`${state.apiBaseUrl}/api/sample`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    if (res.ok) {
      const data = await res.json();
      state.goals = data.goals || [];
      state.progress = data.progress || [];
      state.referenceDate = data.reference_date || formatDate(new Date());
      await recalculateAll();
      return;
    }
  } catch (err) {
    console.warn('API sample load failed:', err);
  }

  // Client-side fallback if backend API is not yet active
  const today = state.referenceDate || formatDate(new Date());
  state.goals = [
    {
      id: 'goal_1',
      name: 'Data Structures & Algorithms',
      description: 'Comprehensive coding problem sets and data structures practice',
      category: 'Learning',
      start_date: addDays(today, -21),
      target_date: addDays(today, 14),
      target_value: 60,
      unit: 'hours',
      milestones: [
        { title: 'Arrays & Trees', target_value: 20 },
        { title: 'Graphs & Dynamic Prog', target_value: 40 },
        { title: 'Advanced Mock Tests', target_value: 60 }
      ]
    },
    {
      id: 'goal_2',
      name: 'System Architecture Manual',
      description: 'Read and annotate foundational distributed system patterns',
      category: 'Reading',
      start_date: addDays(today, -30),
      target_date: addDays(today, 7),
      target_value: 15,
      unit: 'chapters',
      milestones: [
        { title: 'Part 1 Foundations', target_value: 5 },
        { title: 'Part 2 Distributed Patterns', target_value: 10 },
        { title: 'Part 3 Case Studies', target_value: 15 }
      ]
    },
    {
      id: 'goal_3',
      name: 'Portfolio Web Application',
      description: 'Build a production-ready personal project with automated tests',
      category: 'Projects',
      start_date: addDays(today, -25),
      target_date: addDays(today, 10),
      target_value: 20,
      unit: 'features',
      milestones: [
        { title: 'UI Layout & Shell', target_value: 5 },
        { title: 'Backend API & State', target_value: 12 },
        { title: 'Testing & Polish', target_value: 20 }
      ]
    },
    {
      id: 'goal_4',
      name: 'Cloud Practitioner Certification',
      description: 'Prepare domain topics and complete practice exam sets',
      category: 'Career',
      start_date: addDays(today, -40),
      target_date: addDays(today, -3),
      target_value: 40,
      unit: 'hours',
      milestones: [
        { title: 'Core Cloud Concepts', target_value: 15 },
        { title: 'Security & Architecture', target_value: 30 },
        { title: 'Full Practice Exams', target_value: 40 }
      ]
    },
    {
      id: 'goal_5',
      name: '30-Day Morning Fitness Challenge',
      description: 'Consistent morning aerobic sessions and distance tracking',
      category: 'Health',
      start_date: addDays(today, -12),
      target_date: addDays(today, 18),
      target_value: 50,
      unit: 'kilometers',
      milestones: [
        { title: 'Week 1 Habit Base', target_value: 15 },
        { title: 'Mid-Point Mileage', target_value: 30 },
        { title: 'Challenge Completion', target_value: 50 }
      ]
    }
  ];

  state.progress = [
    { id: 'p1', goal_id: 'goal_1', date: addDays(today, -20), value: 6.0, notes: 'Arrays fundamental problems' },
    { id: 'p2', goal_id: 'goal_1', date: addDays(today, -17), value: 8.0, notes: 'Linked list cycle detection' },
    { id: 'p3', goal_id: 'goal_1', date: addDays(today, -14), value: 6.0, notes: 'Stack and queue problems' },
    { id: 'p4', goal_id: 'goal_1', date: addDays(today, -10), value: 8.0, notes: 'Binary tree depth and BST' },
    { id: 'p5', goal_id: 'goal_1', date: addDays(today, -6), value: 7.0, notes: 'Heap operations and priority queue' },
    { id: 'p6', goal_id: 'goal_1', date: addDays(today, -2), value: 7.0, notes: 'Graph BFS and DFS problem sets' },

    { id: 'p7', goal_id: 'goal_2', date: addDays(today, -28), value: 3.0, notes: 'Chapters 1-3 overview' },
    { id: 'p8', goal_id: 'goal_2', date: addDays(today, -22), value: 3.0, notes: 'Chapters 4-6 replication' },
    { id: 'p9', goal_id: 'goal_2', date: addDays(today, -16), value: 3.0, notes: 'Chapters 7-9 partitioning' },
    { id: 'p10', goal_id: 'goal_2', date: addDays(today, -9), value: 3.0, notes: 'Chapters 10-12 stream pipelines' },
    { id: 'p11', goal_id: 'goal_2', date: addDays(today, -1), value: 3.0, notes: 'Chapters 13-15 case studies' },

    { id: 'p12', goal_id: 'goal_3', date: addDays(today, -24), value: 3.0, notes: 'Wireframes and layout' },
    { id: 'p13', goal_id: 'goal_3', date: addDays(today, -20), value: 2.0, notes: 'Core container components' },
    { id: 'p14', goal_id: 'goal_3', date: addDays(today, -11), value: 3.0, notes: 'State management store' },

    { id: 'p15', goal_id: 'goal_4', date: addDays(today, -38), value: 8.0, notes: 'Compute primitives and serverless' },
    { id: 'p16', goal_id: 'goal_4', date: addDays(today, -30), value: 7.0, notes: 'Storage & databases' },
    { id: 'p17', goal_id: 'goal_4', date: addDays(today, -21), value: 7.0, notes: 'VPC and networking' },
    { id: 'p18', goal_id: 'goal_4', date: addDays(today, -5), value: 6.0, notes: 'Security & IAM review' },

    { id: 'p19', goal_id: 'goal_5', date: addDays(today, -11), value: 3.5, notes: 'Outdoor morning jog' },
    { id: 'p20', goal_id: 'goal_5', date: addDays(today, -10), value: 3.0, notes: 'Tempo run' },
    { id: 'p21', goal_id: 'goal_5', date: addDays(today, -8), value: 4.0, notes: 'Endurance lap' },
    { id: 'p22', goal_id: 'goal_5', date: addDays(today, -7), value: 3.5, notes: 'Recovery session' },
    { id: 'p23', goal_id: 'goal_5', date: addDays(today, -5), value: 3.0, notes: 'Pace workout' },
    { id: 'p24', goal_id: 'goal_5', date: addDays(today, -3), value: 4.0, notes: 'Mid-week extended run' },
    { id: 'p25', goal_id: 'goal_5', date: addDays(today, -2), value: 2.5, notes: 'Cadence focus' },
    { id: 'p26', goal_id: 'goal_5', date: addDays(today, -1), value: 2.5, notes: 'Morning 2.5k' }
  ];

  await recalculateAll();
}

/**
 * Recalculate Metrics via R Backend API
 */
async function recalculateAll() {
  const payload = {
    goals: state.goals,
    progress: state.progress,
    reference_date: state.referenceDate || formatDate(new Date())
  };

  try {
    const res = await fetch(`${state.apiBaseUrl}/api/calculate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      throw new Error(`R backend returned HTTP ${res.status}`);
    }

    const data = await res.json();
    if (!data.success) {
      throw new Error(data.error || 'R calculation failed.');
    }

    state.evaluatedGoals = data.goals || [];
    state.summary = data.summary || null;
    state.backendConnected = true;
    dom.backendStatusBadge.className = 'status-badge status-connected';
    dom.backendStatusText.textContent = 'Connected to R backend';

    renderDashboard();
  } catch (err) {
    console.error('Calculation error:', err);
    state.backendConnected = false;
    dom.backendStatusBadge.className = 'status-badge status-error';
    dom.backendStatusText.textContent = 'R backend offline';

    // Client-side fallback display if server went offline
    renderFallbackEvaluation();
  }
}

/**
 * Render Main Application Views
 */
function renderDashboard() {
  updateCategoryDropdown();
  updateKPIs();
  updateAlertBanner();
  renderGoalsGrid();
  renderWeeklyView();
}

/**
 * Update Top KPI Stat Cards
 */
function updateKPIs() {
  const summary = state.summary;
  const goals = state.evaluatedGoals;

  if (!summary || goals.length === 0) {
    dom.kpiTotalGoals.textContent = '0';
    dom.kpiActiveGoals.textContent = '0 Active Goals';
    dom.kpiProgressingCount.textContent = '0';
    dom.kpiCompletedCount.textContent = '0';
    dom.kpiStalledCount.textContent = '0';
    dom.kpiOverdueCount.textContent = '0';
    dom.kpiWeeklyEntries.textContent = '0';
    dom.kpiWeeklyValue.textContent = '0 units in last 7 days';
    return;
  }

  dom.kpiTotalGoals.textContent = summary.total_goals;
  dom.kpiActiveGoals.textContent = `${summary.active_goals} Active Goals`;
  dom.kpiProgressingCount.textContent = summary.progressing_goals;
  dom.kpiCompletedCount.textContent = summary.completed_goals;
  dom.kpiStalledCount.textContent = summary.stalled_goals;
  dom.kpiOverdueCount.textContent = summary.overdue_goals;
  dom.kpiWeeklyEntries.textContent = summary.weekly_entries_count;
  dom.kpiWeeklyValue.textContent = `${summary.weekly_total_value} units in last 7 days`;

  // Update Status Pill Counts
  dom.countAll.textContent = summary.total_goals;
  dom.countProgressing.textContent = summary.progressing_goals;
  dom.countCompleted.textContent = summary.completed_goals;
  dom.countStalled.textContent = summary.stalled_goals;
  dom.countOverdue.textContent = summary.overdue_goals;
}

/**
 * Update Alert Banner
 */
function updateAlertBanner() {
  const summary = state.summary;
  if (!summary) {
    dom.systemAlertBanner.style.display = 'none';
    return;
  }

  const issues = [];
  if (summary.overdue_goals > 0) {
    issues.push(`${summary.overdue_goals} goal${summary.overdue_goals > 1 ? 's are' : ' is'} Overdue`);
  }
  if (summary.stalled_goals > 0) {
    issues.push(`${summary.stalled_goals} goal${summary.stalled_goals > 1 ? 's are' : ' is'} Stalled (&ge; 7 days without progress)`);
  }

  if (issues.length > 0) {
    dom.alertBannerTitle.textContent = 'Attention Needed';
    dom.alertBannerMessage.textContent = `${issues.join(' and ')}. Log progress to get back on track or review deadlines.`;
    dom.systemAlertBanner.style.display = 'flex';
  } else {
    dom.systemAlertBanner.style.display = 'none';
  }
}

/**
 * Update Category Dropdown
 */
function updateCategoryDropdown() {
  const cats = new Set(state.evaluatedGoals.map(g => g.category).filter(Boolean));
  const currentVal = dom.selectCategoryFilter.value;

  dom.selectCategoryFilter.innerHTML = '<option value="all">All Categories</option>';
  cats.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c;
    opt.textContent = c;
    dom.selectCategoryFilter.appendChild(opt);
  });

  if (cats.has(currentVal)) {
    dom.selectCategoryFilter.value = currentVal;
  } else {
    dom.selectCategoryFilter.value = 'all';
    state.selectedCategory = 'all';
  }
}

/**
 * Filter Goals
 */
function getFilteredGoals() {
  return state.evaluatedGoals.filter(g => {
    // Status filter
    if (state.selectedStatus !== 'all' && g.status !== state.selectedStatus) {
      return false;
    }

    // Category filter
    if (state.selectedCategory !== 'all' && g.category !== state.selectedCategory) {
      return false;
    }

    // Search query
    if (state.searchQuery.trim().length > 0) {
      const q = state.searchQuery.toLowerCase();
      const nameMatch = g.name.toLowerCase().includes(q);
      const descMatch = (g.description || '').toLowerCase().includes(q);
      if (!nameMatch && !descMatch) return false;
    }

    return true;
  });
}

/**
 * Render Goals Grid
 */
function renderGoalsGrid() {
  const filtered = getFilteredGoals();
  dom.goalsContainer.innerHTML = '';

  if (state.evaluatedGoals.length === 0) {
    dom.emptyGoalsState.style.display = 'block';
    dom.goalsContainer.style.display = 'none';
    return;
  }

  dom.emptyGoalsState.style.display = 'none';
  dom.goalsContainer.style.display = 'grid';

  if (filtered.length === 0) {
    dom.goalsContainer.innerHTML = `
      <div class="empty-state-card" style="grid-column: 1 / -1; padding: 40px 20px;">
        <h3>No Matching Goals Found</h3>
        <p>No goals match your current filter or search criteria. Try selecting another filter or clearing search.</p>
      </div>
    `;
    return;
  }

  filtered.forEach(g => {
    const card = document.createElement('div');
    card.className = `goal-card goal-card-${g.status.toLowerCase()}`;

    // Timeline label
    let timelineText = '';
    if (g.status === 'Completed') {
      timelineText = `Target reached (${g.target_date})`;
    } else if (g.status === 'Overdue') {
      timelineText = `<span style="color: #a13524; font-weight: 700;">${Math.abs(g.days_remaining)}d overdue (Due: ${g.target_date})</span>`;
    } else {
      timelineText = `${g.days_remaining}d remaining (Due: ${g.target_date})`;
    }

    // Consistency pill
    let consistencyPill = '';
    if (g.consistency_level === 'Insufficient History') {
      consistencyPill = `<span class="field-hint" title="${escapeHtml(g.consistency_reason)}">Insufficient History (&lt; 3d)</span>`;
    } else {
      consistencyPill = `
        <span class="streak-pill" title="${escapeHtml(g.consistency_reason)}">
          ⚡ ${g.current_streak}-day streak
        </span>
        <span class="sub-caption">${g.consistency_level} (${g.active_logging_days} active days)</span>
      `;
    }

    // Milestones Checklist
    let milestonesHtml = '';
    if (g.milestones && g.milestones.length > 0) {
      const achievedCount = g.milestones.filter(m => m.achieved).length;
      milestonesHtml = `
        <div class="milestones-card-section">
          <div class="milestones-title">Milestones (${achievedCount}/${g.milestones.length})</div>
          <div class="milestones-list">
            ${g.milestones.map(m => `
              <div class="milestone-item ${m.achieved ? 'achieved' : ''}">
                <span><span class="milestone-check">${m.achieved ? '✓' : '○'}</span> ${escapeHtml(m.title)}</span>
                <span>${m.target_value} ${g.unit}</span>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    card.innerHTML = `
      <div class="goal-card-header">
        <div class="goal-title-wrap">
          <span class="goal-category-tag">${escapeHtml(g.category)}</span>
          <h3 class="goal-title">${escapeHtml(g.name)}</h3>
          ${g.description ? `<p class="goal-desc">${escapeHtml(g.description)}</p>` : ''}
        </div>
        <span class="badge badge-${g.status_badge}">${g.status}</span>
      </div>

      <!-- Plain Language Status Reason Note -->
      <div class="status-reason-box">
        ${escapeHtml(g.status_reason)}
      </div>

      <!-- Progress Meter -->
      <div class="progress-meter">
        <div class="progress-labels">
          <span>${g.current_value.toFixed(1)} / ${g.target_value.toFixed(1)} ${escapeHtml(g.unit)}</span>
          <span>${g.completion_pct.toFixed(1)}%</span>
        </div>
        <div class="progress-track-lg">
          <div class="progress-fill-lg progress-fill-${g.status_badge}" style="width: ${Math.min(100, g.completion_pct)}%;"></div>
        </div>
      </div>

      <!-- Consistency & Streak Metadata -->
      <div class="consistency-row">
        ${consistencyPill}
        <span class="sub-caption">${timelineText}</span>
      </div>

      <!-- Milestones -->
      ${milestonesHtml}

      <!-- Footer Actions -->
      <div class="goal-card-footer">
        <div class="card-actions-left">
          <button class="btn btn-primary btn-xs" data-action="log" data-goal-id="${g.id}">+ Log Progress</button>
          <button class="btn btn-outline btn-xs" data-action="history" data-goal-id="${g.id}">History (${g.progress_count})</button>
        </div>
        <div class="card-actions-right">
          <button class="btn btn-outline btn-xs" data-action="edit" data-goal-id="${g.id}">Edit</button>
          <button class="btn btn-outline btn-xs" style="color: #a13524;" data-action="delete" data-goal-id="${g.id}">Delete</button>
        </div>
      </div>
    `;

    dom.goalsContainer.appendChild(card);
  });
}

/**
 * Render Weekly Analytics View
 */
function renderWeeklyView() {
  const summary = state.summary;
  if (!summary) return;

  // 1. Render Bar Chart
  dom.weeklyChartContainer.innerHTML = '';
  const chartDays = summary.activity_chart || [];
  const maxEntries = Math.max(1, ...chartDays.map(d => d.entries_count));

  chartDays.forEach(d => {
    const col = document.createElement('div');
    col.className = 'bar-column';
    const heightPct = (d.entries_count / maxEntries) * 80;

    col.innerHTML = `
      <span class="bar-count-label">${d.entries_count > 0 ? d.entries_count : ''}</span>
      <div class="bar-pill" style="height: ${Math.max(4, heightPct)}%; opacity: ${d.entries_count > 0 ? 1 : 0.25};" title="${d.entries_count} entries (${d.total_value} units) on ${d.date}"></div>
      <span class="bar-day-label">${d.day_name}<br><small>${d.date.substring(5)}</small></span>
    `;
    dom.weeklyChartContainer.appendChild(col);
  });

  // 2. Render Upcoming Deadlines
  dom.upcomingDeadlinesContainer.innerHTML = '';
  const deadlines = summary.upcoming_deadlines || [];

  if (deadlines.length === 0) {
    dom.upcomingDeadlinesContainer.innerHTML = `
      <div class="sub-caption" style="padding: 14px 0;">No pending goal deadlines occurring in the next 7 days.</div>
    `;
  } else {
    const list = document.createElement('div');
    list.className = 'deadlines-list';
    deadlines.forEach(dl => {
      const item = document.createElement('div');
      item.className = 'deadline-item';
      item.innerHTML = `
        <div>
          <strong>${escapeHtml(dl.name)}</strong>
          <div class="sub-caption">Remaining: ${dl.remaining_qty} ${dl.unit} (${dl.completion_pct}% complete)</div>
        </div>
        <span class="deadline-days-badge">${dl.days_remaining === 0 ? 'Today' : `${dl.days_remaining}d left`}</span>
      `;
      list.appendChild(item);
    });
    dom.upcomingDeadlinesContainer.appendChild(list);
  }

  // 3. Render Category Table
  dom.categoryTableBody.innerHTML = '';
  const catDist = summary.category_distribution || [];

  catDist.forEach(cat => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${escapeHtml(cat.category)}</strong></td>
      <td>${cat.total_goals}</td>
      <td>${cat.completed_goals}</td>
      <td>
        <div style="display: flex; align-items: center; gap: 8px;">
          <span>${cat.average_completion_pct}%</span>
          <div style="flex: 1; max-width: 100px; height: 6px; background-color: var(--border-light); border-radius: 999px; overflow: hidden;">
            <div style="width: ${cat.average_completion_pct}%; height: 100%; background-color: var(--violet-primary);"></div>
          </div>
        </div>
      </td>
    `;
    dom.categoryTableBody.appendChild(tr);
  });
}

/**
 * Handle Goal Modal (Open, Close, Save)
 */
function openGoalModal(goalToEdit = null) {
  dom.formGoal.reset();
  dom.milestonesRowsContainer.innerHTML = '';
  dom.goalFormAlert.style.display = 'none';

  const today = state.referenceDate || formatDate(new Date());

  if (goalToEdit) {
    dom.modalGoalTitle.textContent = 'Edit Goal';
    dom.goalIdInput.value = goalToEdit.id;
    dom.goalNameInput.value = goalToEdit.name;
    dom.goalDescInput.value = goalToEdit.description || '';
    dom.goalCategoryInput.value = goalToEdit.category || 'General';
    dom.goalUnitInput.value = goalToEdit.unit || 'hours';
    dom.goalStartInput.value = goalToEdit.start_date;
    dom.goalTargetDateInput.value = goalToEdit.target_date;
    dom.goalTargetValInput.value = goalToEdit.target_value;

    if (goalToEdit.milestones && goalToEdit.milestones.length > 0) {
      goalToEdit.milestones.forEach(m => addMilestoneRow(m.title, m.target_value));
    }
  } else {
    dom.modalGoalTitle.textContent = 'Create New Goal';
    dom.goalIdInput.value = '';
    dom.goalStartInput.value = today;
    dom.goalTargetDateInput.value = addDays(today, 30);
    dom.goalCategoryInput.value = 'Learning';
    dom.goalUnitInput.value = 'hours';
  }

  dom.modalGoal.style.display = 'flex';
  dom.goalNameInput.focus();
}

function closeGoalModal() {
  dom.modalGoal.style.display = 'none';
}

function addMilestoneRow(title = '', target = '') {
  const row = document.createElement('div');
  row.className = 'milestone-row';
  row.innerHTML = `
    <input type="text" class="form-control form-control-sm milestone-title" placeholder="Milestone title (e.g. Stage 1)" value="${escapeHtml(title)}" style="flex: 2;">
    <input type="number" class="form-control form-control-sm milestone-target" min="0.1" step="any" placeholder="Target" value="${target}" style="flex: 1;">
    <button type="button" class="btn btn-outline btn-xs btn-remove-milestone" style="color: #a13524;">✕</button>
  `;
  row.querySelector('.btn-remove-milestone').addEventListener('click', () => row.remove());
  dom.milestonesRowsContainer.appendChild(row);
}

dom.btnAddMilestoneRow.addEventListener('click', () => addMilestoneRow());
dom.btnOpenCreateGoal.addEventListener('click', () => openGoalModal());
dom.btnEmptyCreate.addEventListener('click', () => openGoalModal());
dom.btnCloseGoalModal.addEventListener('click', closeGoalModal);
dom.btnCancelGoalModal.addEventListener('click', closeGoalModal);

// Goal Form Submit
dom.formGoal.addEventListener('submit', async (e) => {
  e.preventDefault();
  dom.goalFormAlert.style.display = 'none';

  const name = dom.goalNameInput.value.trim();
  const desc = dom.goalDescInput.value.trim();
  const category = dom.goalCategoryInput.value.trim() || 'General';
  const unit = dom.goalUnitInput.value.trim() || 'units';
  const startDate = dom.goalStartInput.value;
  const targetDate = dom.goalTargetDateInput.value;
  const targetValue = parseFloat(dom.goalTargetValInput.value);
  const goalId = dom.goalIdInput.value.trim();
  const isEdit = goalId.length > 0;

  // Client Validation
  if (!name) {
    showGoalAlert('Please enter a descriptive goal name.');
    return;
  }
  if (!startDate || !targetDate) {
    showGoalAlert('Please select valid start and target dates.');
    return;
  }
  if (targetDate < startDate) {
    showGoalAlert(`Target deadline (${targetDate}) cannot be earlier than start date (${startDate}).`);
    return;
  }
  if (isNaN(targetValue) || targetValue <= 0) {
    showGoalAlert('Target value must be a positive number greater than 0.');
    return;
  }

  // Milestones
  const milestoneRows = dom.milestonesRowsContainer.querySelectorAll('.milestone-row');
  const milestones = [];
  for (const r of milestoneRows) {
    const mTitle = r.querySelector('.milestone-title').value.trim();
    const mTarget = parseFloat(r.querySelector('.milestone-target').value);
    if (mTitle && !isNaN(mTarget) && mTarget > 0) {
      milestones.push({ title: mTitle, target_value: mTarget });
    }
  }

  const goalRecord = {
    id: isEdit ? goalId : `goal_${Date.now()}`,
    name: name,
    description: desc,
    category: category,
    start_date: startDate,
    target_date: targetDate,
    target_value: targetValue,
    unit: unit,
    milestones: milestones
  };

  // Try Server-side validation
  try {
    const valRes = await fetch(`${state.apiBaseUrl}/api/validate_goal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        goal: goalRecord,
        existing_goals: state.goals,
        is_edit: isEdit
      })
    });
    if (valRes.ok) {
      const valData = await valRes.json();
      if (!valData.success) {
        showGoalAlert(valData.error);
        return;
      }
    }
  } catch (err) {
    console.warn('Backend validation bypassed, using local validation:', err);
  }

  if (isEdit) {
    const idx = state.goals.findIndex(g => g.id === goalId);
    if (idx >= 0) state.goals[idx] = goalRecord;
  } else {
    state.goals.push(goalRecord);
  }

  closeGoalModal();
  await recalculateAll();
});

function showGoalAlert(msg) {
  dom.goalFormAlertMsg.textContent = msg;
  dom.goalFormAlert.style.display = 'flex';
}

/**
 * Handle Progress Log Modal
 */
function openProgressModal(preselectedGoalId = null) {
  if (state.goals.length === 0) {
    alert('Please create a goal before logging progress.');
    return;
  }

  dom.formProgress.reset();
  dom.progressFormAlert.style.display = 'none';

  dom.progGoalSelect.innerHTML = '';
  state.goals.forEach(g => {
    const opt = document.createElement('option');
    opt.value = g.id;
    opt.textContent = `${g.name} (${g.unit})`;
    dom.progGoalSelect.appendChild(opt);
  });

  if (preselectedGoalId) {
    dom.progGoalSelect.value = preselectedGoalId;
  }

  updateProgressUnitLabel();
  dom.progDateInput.value = state.referenceDate || formatDate(new Date());

  dom.modalProgress.style.display = 'flex';
  dom.progValueInput.focus();
}

function closeProgressModal() {
  dom.modalProgress.style.display = 'none';
}

function updateProgressUnitLabel() {
  const selectedId = dom.progGoalSelect.value;
  const g = state.goals.find(x => x.id === selectedId);
  dom.progUnitLabel.textContent = g ? g.unit : 'units';
}

dom.progGoalSelect.addEventListener('change', updateProgressUnitLabel);
dom.btnQuickLog.addEventListener('click', () => openProgressModal());
dom.btnCloseProgressModal.addEventListener('click', closeProgressModal);
dom.btnCancelProgressModal.addEventListener('click', closeProgressModal);

// Progress Form Submit
dom.formProgress.addEventListener('submit', async (e) => {
  e.preventDefault();
  dom.progressFormAlert.style.display = 'none';

  const goalId = dom.progGoalSelect.value;
  const date = dom.progDateInput.value;
  const val = parseFloat(dom.progValueInput.value);
  const notes = dom.progNotesInput.value.trim();

  if (!goalId) {
    showProgressAlert('Please select a valid goal.');
    return;
  }
  if (!date) {
    showProgressAlert('Please choose a valid logging date.');
    return;
  }
  if (isNaN(val) || val <= 0) {
    showProgressAlert('Progress amount must be a positive number greater than 0.');
    return;
  }

  const progEntry = {
    id: `prog_${Date.now()}_${Math.floor(Math.random() * 900 + 100)}`,
    goal_id: goalId,
    date: date,
    value: val,
    notes: notes
  };

  // Try server-side validation
  try {
    const valRes = await fetch(`${state.apiBaseUrl}/api/validate_progress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entry: progEntry, goals: state.goals })
    });
    if (valRes.ok) {
      const valData = await valRes.json();
      if (!valData.success) {
        showProgressAlert(valData.error);
        return;
      }
    }
  } catch (err) {
    console.warn('Backend validation bypassed:', err);
  }

  state.progress.push(progEntry);
  closeProgressModal();
  await recalculateAll();
});

function showProgressAlert(msg) {
  dom.progressFormAlertMsg.textContent = msg;
  dom.progressFormAlert.style.display = 'flex';
}

/**
 * Handle Goal Card Actions (Delegate Click)
 */
dom.goalsContainer.addEventListener('click', async (e) => {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;

  const action = btn.dataset.action;
  const goalId = btn.dataset.goalId;
  const goal = state.goals.find(g => g.id === goalId);
  if (!goal) return;

  if (action === 'log') {
    openProgressModal(goalId);
  } else if (action === 'edit') {
    openGoalModal(goal);
  } else if (action === 'delete') {
    if (confirm(`Are you sure you want to delete "${goal.name}" and all its progress records?`)) {
      state.goals = state.goals.filter(g => g.id !== goalId);
      state.progress = state.progress.filter(p => p.goal_id !== goalId);
      await recalculateAll();
    }
  } else if (action === 'history') {
    openHistoryModal(goal);
  }
});

/**
 * Progress History Modal
 */
function openHistoryModal(goal) {
  dom.historyModalGoalName.textContent = goal.name;
  dom.historyModalGoalMeta.textContent = `All recorded sessions (${goal.unit})`;
  dom.historyEntriesContainer.innerHTML = '';

  const entries = state.progress
    .filter(p => p.goal_id === goal.id)
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  if (entries.length === 0) {
    dom.historyEntriesContainer.innerHTML = `
      <div class="sub-caption" style="padding: 20px 0; text-align: center;">No progress recorded yet for this goal.</div>
    `;
  } else {
    entries.forEach(p => {
      const item = document.createElement('div');
      item.className = 'history-item';
      item.innerHTML = `
        <div class="history-item-left">
          <span class="history-val">+${p.value} ${escapeHtml(goal.unit)}</span>
          <span class="history-date">📅 ${p.date}</span>
          ${p.notes ? `<span class="history-notes">"${escapeHtml(p.notes)}"</span>` : ''}
        </div>
        <button class="btn btn-outline btn-xs" style="color: #a13524;" data-delete-prog="${p.id}" title="Remove entry">✕</button>
      `;

      item.querySelector('button[data-delete-prog]').addEventListener('click', async () => {
        if (confirm('Delete this progress log entry?')) {
          state.progress = state.progress.filter(x => x.id !== p.id);
          openHistoryModal(goal);
          await recalculateAll();
        }
      });

      dom.historyEntriesContainer.appendChild(item);
    });
  }

  dom.modalHistory.style.display = 'flex';
}

function closeHistoryModal() {
  dom.modalHistory.style.display = 'none';
}

dom.btnCloseHistoryModal.addEventListener('click', closeHistoryModal);
dom.btnCloseHistoryBtn.addEventListener('click', closeHistoryModal);

/**
 * View Switcher & Filter Handlers
 */
dom.tabViewGoals.addEventListener('click', () => {
  dom.tabViewGoals.classList.add('active-view');
  dom.tabViewWeekly.classList.remove('active-view');
  dom.sectionGoalsView.style.display = 'block';
  dom.sectionWeeklyView.style.display = 'none';
  state.currentView = 'goals';
});

dom.tabViewWeekly.addEventListener('click', () => {
  dom.tabViewWeekly.classList.add('active-view');
  dom.tabViewGoals.classList.remove('active-view');
  dom.sectionGoalsView.style.display = 'none';
  dom.sectionWeeklyView.style.display = 'block';
  state.currentView = 'weekly';
  renderWeeklyView();
});

// Category Filter Change
dom.selectCategoryFilter.addEventListener('change', () => {
  state.selectedCategory = dom.selectCategoryFilter.value;
  renderGoalsGrid();
});

// Status Pills Filter Click
dom.statusFilterPills.forEach(pill => {
  pill.addEventListener('click', () => {
    dom.statusFilterPills.forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    state.selectedStatus = pill.dataset.status;
    renderGoalsGrid();
  });
});

// Search Filter Input
dom.inputSearch.addEventListener('input', () => {
  state.searchQuery = dom.inputSearch.value;
  renderGoalsGrid();
});

// Load Sample Button
dom.btnLoadSample.addEventListener('click', loadSampleData);
dom.btnEmptySample.addEventListener('click', loadSampleData);

/**
 * Fallback Evaluation if R Backend is temporarily unreachable
 */
function renderFallbackEvaluation() {
  const refDt = new Date(state.referenceDate || formatDate(new Date()));

  state.evaluatedGoals = state.goals.map(g => {
    const subProg = state.progress.filter(p => p.goal_id === g.id);
    const curVal = subProg.reduce((sum, p) => sum + (parseFloat(p.value) || 0), 0);
    const compPct = Math.round((curVal / g.target_value) * 1000) / 10;
    const targetDt = new Date(g.target_date);
    const startDt = new Date(g.start_date);
    const daysRem = Math.ceil((targetDt - refDt) / (1000 * 60 * 60 * 24));
    const daysElapsed = Math.max(0, Math.ceil((refDt - startDt) / (1000 * 60 * 60 * 24)));

    let lastProgDt = null;
    let daysSinceLast = daysElapsed;
    if (subProg.length > 0) {
      const dates = subProg.map(p => new Date(p.date));
      lastProgDt = new Date(Math.max(...dates));
      daysSinceLast = Math.ceil((refDt - lastProgDt) / (1000 * 60 * 60 * 24));
    }

    let status = 'Progressing';
    let statusBadge = 'progressing';
    let statusReason = '';

    if (curVal >= g.target_value) {
      status = 'Completed';
      statusBadge = 'completed';
      statusReason = `Target reached! Completed ${curVal.toFixed(1)} of ${g.target_value.toFixed(1)} ${g.unit}.`;
    } else if (refDt > targetDt) {
      status = 'Overdue';
      statusBadge = 'overdue';
      statusReason = `Target deadline passed on ${g.target_date} (${Math.abs(daysRem)} days overdue).`;
    } else if (daysSinceLast >= 7) {
      status = 'Stalled';
      statusBadge = 'stalled';
      statusReason = `No progress recorded in the last ${daysSinceLast} days (7-day inactivity rule).`;
    } else {
      status = 'Progressing';
      statusBadge = 'progressing';
      statusReason = `Active progress logged recently. ${daysRem} days remaining until ${g.target_date}.`;
    }

    return {
      id: g.id,
      name: g.name,
      description: g.description,
      category: g.category,
      start_date: g.start_date,
      target_date: g.target_date,
      target_value: g.target_value,
      unit: g.unit,
      current_value: curVal,
      completion_pct: compPct,
      days_remaining: daysRem,
      days_elapsed: daysElapsed,
      days_since_last_progress: daysSinceLast,
      status: status,
      status_badge: statusBadge,
      status_reason: statusReason,
      consistency_level: daysElapsed < 3 ? 'Insufficient History' : 'Evaluated via R',
      current_streak: 0,
      active_logging_days: subProg.length,
      consistency_reason: 'Connect to R backend for full streak analytics.',
      milestones: (g.milestones || []).map(m => ({
        title: m.title,
        target_value: m.target_value,
        achieved: curVal >= m.target_value
      })),
      progress_count: subProg.length
    };
  });

  renderDashboard();
}

/**
 * Application Bootstrap
 */
window.addEventListener('DOMContentLoaded', async () => {
  state.apiBaseUrl = resolveApiBaseUrl();
  state.referenceDate = formatDate(new Date());

  await checkBackendHealth();
  await loadSampleData();
});
