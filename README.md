# Goal Progress & Consistency Tracker

> A deterministic, R-powered goal and habit management application. Accurately evaluates goal completion percentages, tracks milestones, monitors daily logging streaks, and classifies goals into **Progressing, Stalled, Overdue, or Completed** with clear explanations.

---

## 1. Project Overview

**Goal Progress & Consistency Tracker** is a professional productivity application designed to provide honest, explainable tracking of personal and academic objectives. Many conventional habit trackers merely record raw numbers or rely on opaque algorithms; this application applies strict, rule-based mathematical criteria in R to identify whether an objective is actively progressing, stalled due to inactivity, overdue past its deadline, or successfully completed.

Users define goals across customizable categories (such as studying hours, books read, coding tasks, or fitness targets), establish target deadlines, define optional milestone markers, and log dated progress entries. An R analytical engine processes these data streams, calculates active streaks, and generates comprehensive weekly progress digests.

---

## 2. Key Features

- **Full Lifecycle Goal Management**: Create, edit, and delete goals with name, category, unit, start date, target deadline, target value, and optional milestones.
- **Dated Progress Journaling**: Record discrete session values and notes against specific goals without discarding historical logs.
- **Transparent Status Classification**: Deterministically categorizes every goal into one of four mutually exclusive states:
  - **Completed**: Target value reached or exceeded ($\ge 100\%$).
  - **Overdue**: Target deadline has passed and the goal remains incomplete.
  - **Stalled**: Incomplete, within deadline, but no progress has been recorded in the last **7 days** (inactivity threshold).
  - **Progressing**: Incomplete, within deadline, and actively logged within the last 7 days.
- **Plain-Language Status Justifications**: Every goal displays an understandable explanation of its classification (e.g. why it was marked stalled or how many days are overdue).
- **History-Aware Consistency & Streaks**: Evaluates logging cadence in a rolling 14-day window. Accurately flags "Insufficient History" when a goal has fewer than 3 days of tracking rather than presenting misleading scores.
- **Multi-Stage Milestone Tracking**: Visual progress indicators for intermediate checkpoints indicating achieved milestones and remaining units to next threshold.
- **Weekly Progress Dashboard**: Visualizes 7-day daily activity through a responsive bar chart, reports active versus stalled counts, and highlights deadlines due in the next 7 days.
- **Interactive Filtering & Search**: Instant filtering by status pills (Progressing, Completed, Stalled, Overdue), categories, and keyword search.
- **Real-Time Recalculation**: Live communication with the local R backend updates all metrics and weekly digests whenever goals or logs change.

---

## 3. R Concepts & Architecture

- **Data Frame Manipulation**: Storing, merging, and filtering goal inventories, dated progress logs, and milestones using base R data frames (`data.frame`, `subset`, `order`).
- **Temporal Processing & Date Handling**: Applying `as.Date`, `seq.Date`, and `weekdays` to compute elapsed calendar days, overdue spans, inactivity windows, and consecutive daily streaks.
- **Deterministic Classification Logic**: Clean hierarchical `if-else` rules guaranteeing mutually exclusive status states.
- **Vectorized Aggregation**: Summarizing weekly entries, cumulative progress sums, and category-level averages using `vapply`, `lapply`, and `sum`.
- **Defensive Data Validation**: Using `tryCatch` to validate dates, reject past/inverted deadlines, catch negative progress amounts, and prevent duplicate names.
- **RESTful API Service**: Exposing analytical capabilities through a lightweight `plumber` HTTP service (`/api/health`, `/api/sample`, `/api/calculate`, `/api/validate_goal`, `/api/validate_progress`).

---

## 4. Goal Status Classification Rules

Every goal is evaluated against the current reference date ($D_{\text{ref}}$) using a strict priority order:

```text
       ┌──────────────────────────────────────┐
       │   CurrentValue >= TargetValue?       │─── YES ───► [COMPLETED]
       └──────────────────────────────────────┘
                          │ NO
       ┌──────────────────────────────────────┐
       │     ReferenceDate > TargetDate?      │─── YES ───► [OVERDUE]
       └──────────────────────────────────────┘
                          │ NO
       ┌──────────────────────────────────────┐
       │   DaysSinceLastProgress >= 7 days?   │─── YES ───► [STALLED]
       └──────────────────────────────────────┘
                          │ NO
                          ▼
                    [PROGRESSING]
```

1. **Completed**: Target reached ($\text{CurrentValue} \ge \text{TargetValue}$). Holds true regardless of whether the target date is in the future or past.
2. **Overdue**: Incomplete and target date has passed ($D_{\text{ref}} > D_{\text{target}}$).
3. **Stalled**: Incomplete, within deadline ($D_{\text{ref}} \le D_{\text{target}}$), and no progress logged for $\ge 7$ consecutive days.
4. **Progressing**: Incomplete, within deadline, and progress logged within the last 7 days.

---

## 5. Consistency & Streak Calculation Methods

Rather than generating artificial consistency metrics, the system calculates consistency strictly from actual dated progress entries:

1. **Minimum History Requirement**:
   - If days elapsed since start date is $< 3$ days, consistency is reported as **"Insufficient History"** (`score = NA`) with a notice: *"Requires at least 3 days of tracking history."*
2. **Evaluation Window**:
   - For goals with $\ge 3$ days elapsed, a rolling window of up to 14 days is evaluated: $W = \min(14, \max(3, \text{DaysElapsed}))$.
3. **Active Logging Ratio**:
   - Unique calendar dates with progress logged within the window are counted ($N_{\text{active}}$).
   - $\text{Active Ratio} = \frac{N_{\text{active}}}{W}$.
4. **Consistency Score & Tiers**:
   - Standardized against an active cadence (where logging on 60%+ of days earns 100%):
     $$\text{Consistency Score} = \min\left(100, \; \text{round}\left(\frac{\text{Active Ratio}}{0.60} \times 100, 1\right)\right)$$
   - **High Consistency**: Score $\ge 70\%$
   - **Moderate Consistency**: $40\% \le \text{Score} < 70\%$
   - **Low Consistency**: Score $< 40\%$
5. **Consecutive Streak**:
   - Counts uninterrupted consecutive calendar days with active progress logs leading up to today or yesterday.

---

## 6. Weekly Summary Logic

The weekly summary evaluates the rolling 7-day period $[D_{\text{ref}} - 6, D_{\text{ref}}]$:
- **Daily Activity Distribution**: Aggregates entry counts and total values for each calendar day across Monday through Sunday.
- **Active versus Stalled Balance**: Categorizes active goals into currently progressing versus those requiring urgent re-engagement ($\ge 7$ days stalled).
- **Upcoming Deadlines**: Identifies incomplete goals whose target deadlines fall within the next 7 calendar days.
- **Category Progress**: Computes average completion percentage and goal counts grouped by category.

---

## 7. Windows Setup and Run Instructions

### Prerequisites
- **R**: Version 4.0 or later (Tested on **R 4.6.1 ucrt**).
- **Web Browser**: Any modern browser (Chrome, Edge, Firefox).

### 1. Install Dependencies
Open Windows PowerShell or Command Prompt and run:
```cmd
"C:\Program Files\R\R-4.6.1\bin\Rscript.exe" -e "install.packages(c('plumber', 'jsonlite'), repos='https://cloud.r-project.org')"
```

### 2. Start the Application Backend
Navigate to the project folder and launch `R/main.R`:
```cmd
cd /d C:\Users\DELL\Desktop\r_projects\goal-progress-consistency-tracker
"C:\Program Files\R\R-4.6.1\bin\Rscript.exe" R/main.R
```

The terminal will confirm:
```text
================================================================
     GOAL PROGRESS & CONSISTENCY TRACKER - R BACKEND SERVICE    
================================================================
  Application URL : http://127.0.0.1:8000
  Health Check    : http://127.0.0.1:8000/api/health
  Sample Data API : http://127.0.0.1:8000/api/sample
  Calculation API : http://127.0.0.1:8000/api/calculate
  Static Directory: C:/Users/DELL/Desktop/r_projects/goal-progress-consistency-tracker/web
================================================================
  -> Open http://127.0.0.1:8000 in your browser to use the app.
  -> Press Ctrl+C in this terminal window to stop the service.
================================================================
```

### 3. Open in Browser
Open your web browser and navigate to:
```
http://127.0.0.1:8000
```
*(Alternatively, open `web/index.html` directly in your browser while the R backend is active).*

### 4. Stopping and Restarting
- **To Stop**: Press `Ctrl + C` in the running terminal.
- **To Restart**: Re-run `"C:\Program Files\R\R-4.6.1\bin\Rscript.exe" R/main.R`.

---

## 8. Testing Instructions

### Automated Verification Suite (CLI)
To run the automated invariant and boundary test suite:
```cmd
cd /d C:\Users\DELL\Desktop\r_projects\goal-progress-consistency-tracker
"C:\Program Files\R\R-4.6.1\bin\Rscript.exe" R/main.R --test
```
This validates:
- Completed status classification and target overachievement.
- Overdue status classification after target deadline passes.
- Stalled status classification on 7-day inactivity.
- Progressing status with recent activity.
- Insufficient history suppression for consistency (< 3 days).
- Streak counting and high consistency evaluation.
- Milestone tracking.
- Duplicate name rejection.
- Invalid inverted start/target dates.
- Negative progress entry rejection.

### Terminal Demonstration (CLI Demo Mode)
To view a text-based demonstration directly in the console:
```cmd
"C:\Program Files\R\R-4.6.1\bin\Rscript.exe" R/main.R --demo
```

---

## 9. Folder Structure

```text
goal-progress-consistency-tracker/
├── .gitignore               # Excludes R session artifacts, workspace caches, and OS files
├── README.md                # Project documentation, formulas, and execution guide
├── R/
│   ├── functions.R          # Core analytical engine, status rules, streak logic & validation
│   └── main.R               # Application entry point, CLI runners, and Plumber HTTP server
├── data/
│   ├── sample_goals.csv     # Sample curriculum and habit goals across all 4 statuses
│   └── sample_progress.csv  # Dated progress logs demonstrating active and stalled scenarios
├── screenshots/             # Storage for interface captures
├── tests/
│   └── test-cases.md        # Comprehensive test matrix and boundary specifications
└── web/
    ├── index.html           # Accessible, semantic light-lavender dashboard markup
    ├── style.css            # Custom CSS with light lavender canvas and periwinkle accents
    └── script.js            # Vanilla JavaScript state controller and R API client
```

---
