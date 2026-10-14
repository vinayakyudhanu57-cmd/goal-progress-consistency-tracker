# ==============================================================================
# R/main.R
# Goal Progress & Consistency Tracker
# Application Entry Point, CLI Demo & Verification Suite, and Plumber API Service
# ==============================================================================

# 1. Locate Project Root Directory Reliably
find_project_root <- function() {
  candidates <- c(
    getwd(),
    file.path(getwd(), "goal-progress-consistency-tracker"),
    "C:/Users/DELL/Desktop/r_projects/goal-progress-consistency-tracker"
  )
  for (dir in candidates) {
    if (file.exists(file.path(dir, "R", "functions.R"))) {
      return(normalizePath(dir, winslash = "/"))
    }
  }
  normalizePath(getwd(), winslash = "/")
}

project_root <- find_project_root()
setwd(project_root)

# 2. Source Analytical Engine Functions
source(file.path(project_root, "R", "functions.R"))

# 3. CLI Demonstration Runner
run_cli_demo <- function() {
  cat("\n================================================================\n")
  cat("        GOAL PROGRESS & CONSISTENCY TRACKER (R 4.6.1)           \n")
  cat("              Automated Command-Line Demonstration              \n")
  cat("================================================================\n\n")

  goals_file <- file.path(project_root, "data", "sample_goals.csv")
  prog_file <- file.path(project_root, "data", "sample_progress.csv")
  ref_date <- Sys.Date()

  cat(sprintf("[1/3] Loading sample goals and progress logs (Reference Date: %s)...\n", format(ref_date)))
  sample_data <- load_sample_data(goals_file, prog_file, reference_date = ref_date)
  cat(sprintf("      Loaded %d sample goals and %d dated progress logs.\n\n",
              length(sample_data$goals), length(sample_data$progress)))

  cat("[2/3] Evaluating goal progress, deterministic status, and consistency...\n")
  evaluated_goals <- calculate_goal_metrics(sample_data$goals, sample_data$progress, reference_date = ref_date)
  summary_data <- generate_weekly_summary(evaluated_goals, sample_data$progress, reference_date = ref_date)

  cat("\n----------------------------------------------------------------\n")
  cat(" GOAL STATUS & CONSISTENCY BREAKDOWN\n")
  cat("----------------------------------------------------------------\n")
  for (g in evaluated_goals) {
    cat(sprintf("\n* [%s] %s (Category: %s)\n", toupper(g$status), g$name, g$category))
    cat(sprintf("  Progress    : %.1f / %.1f %s (%.1f%% completed)\n",
                g$current_value, g$target_value, g$unit, g$completion_pct))
    cat(sprintf("  Timeline    : %s to %s (%d days remaining)\n",
                g$start_date, g$target_date, g$days_remaining))
    cat(sprintf("  Status Note : %s\n", g$status_reason))
    cat(sprintf("  Consistency : %s (Streak: %d days) -> %s\n",
                g$consistency_level, g$current_streak, g$consistency_reason))

    if (length(g$milestones) > 0) {
      achieved_count <- sum(vapply(g$milestones, function(m) m$achieved, logical(1)))
      cat(sprintf("  Milestones  : %d of %d achieved\n", achieved_count, length(g$milestones)))
    }
  }

  cat("\n----------------------------------------------------------------\n")
  cat(" WEEKLY PROGRESS & SYSTEM SUMMARY\n")
  cat("----------------------------------------------------------------\n")
  cat(sprintf(" Total Goals Monitored  : %d\n", summary_data$total_goals))
  cat(sprintf(" Progressing Goals      : %d\n", summary_data$progressing_goals))
  cat(sprintf(" Completed Goals        : %d\n", summary_data$completed_goals))
  cat(sprintf(" Stalled Goals (>= 7d)  : %d\n", summary_data$stalled_goals))
  cat(sprintf(" Overdue Goals          : %d\n", summary_data$overdue_goals))
  cat(sprintf(" Weekly Progress Entries: %d entries logged in the last 7 days\n", summary_data$weekly_entries_count))
  cat(sprintf(" Upcoming Deadlines     : %d goals due in the next 7 days\n", length(summary_data$upcoming_deadlines)))

  cat("\n================================================================\n")
  cat(" [SUCCESS] Demonstration completed successfully!\n")
  cat("================================================================\n\n")
}

# 4. CLI Automated Test Runner
run_cli_tests <- function() {
  cat("\n================================================================\n")
  cat("       RUNNING UNIT, BOUNDARY & CLASSIFICATION VERIFICATIONS    \n")
  cat("================================================================\n\n")

  ref_dt <- as.Date("2026-10-14")

  # Test 1: Completed Goal Classification (Target Reached)
  cat("[Test 1/10] Verifying Completed goal classification...\n")
  g_comp <- list(
    id = "g_comp", name = "Reading Goal", category = "Reading",
    start_date = "2026-10-01", target_date = "2026-10-20", target_value = 10, unit = "chapters"
  )
  p_comp <- list(list(id = "p1", goal_id = "g_comp", date = "2026-10-10", value = 12)) # 12 > 10 (exceeded target)
  eval_comp <- calculate_goal_metrics(list(g_comp), p_comp, reference_date = ref_dt)[[1]]
  stopifnot(eval_comp$status == "Completed")
  stopifnot(eval_comp$completion_pct == 120.0)
  cat("            [PASS] Successfully classified as Completed with > 100% completion.\n")

  # Test 2: Overdue Goal Classification (Target Date Passed & Incomplete)
  cat("[Test 2/10] Verifying Overdue goal classification...\n")
  g_over <- list(
    id = "g_over", name = "Expired Goal", category = "Career",
    start_date = "2026-09-01", target_date = "2026-10-10", target_value = 50, unit = "hours"
  )
  p_over <- list(list(id = "p2", goal_id = "g_over", date = "2026-10-08", value = 30))
  eval_over <- calculate_goal_metrics(list(g_over), p_over, reference_date = ref_dt)[[1]]
  stopifnot(eval_over$status == "Overdue")
  stopifnot(eval_over$days_remaining < 0)
  cat("            [PASS] Successfully classified as Overdue when deadline has passed.\n")

  # Test 3: Stalled Goal Classification (>= 7 Days Inactivity)
  cat("[Test 3/10] Verifying Stalled goal classification (7-day inactivity rule)...\n")
  g_stall <- list(
    id = "g_stall", name = "Stalled Project", category = "Projects",
    start_date = "2026-09-15", target_date = "2026-10-30", target_value = 20, unit = "tasks"
  )
  # Last progress logged on 2026-10-05 (9 days before 2026-10-14 -> >= 7 days)
  p_stall <- list(list(id = "p3", goal_id = "g_stall", date = "2026-10-05", value = 8))
  eval_stall <- calculate_goal_metrics(list(g_stall), p_stall, reference_date = ref_dt)[[1]]
  stopifnot(eval_stall$status == "Stalled")
  stopifnot(eval_stall$days_since_last_progress == 9)
  cat("            [PASS] Successfully classified as Stalled after 9 days of inactivity.\n")

  # Test 4: Progressing Goal Classification (Recent Progress < 7 Days)
  cat("[Test 4/10] Verifying Progressing goal classification...\n")
  g_prog <- list(
    id = "g_prog", name = "Active Learning", category = "Learning",
    start_date = "2026-10-01", target_date = "2026-10-25", target_value = 40, unit = "hours"
  )
  # Last progress logged on 2026-10-12 (2 days before 2026-10-14)
  p_prog <- list(list(id = "p4", goal_id = "g_prog", date = "2026-10-12", value = 15))
  eval_prog <- calculate_goal_metrics(list(g_prog), p_prog, reference_date = ref_dt)[[1]]
  stopifnot(eval_prog$status == "Progressing")
  stopifnot(eval_prog$days_since_last_progress == 2)
  cat("            [PASS] Successfully classified as Progressing with recent activity.\n")

  # Test 5: Insufficient History for Consistency (< 3 Days Elapsed)
  cat("[Test 5/10] Verifying Insufficient History handling for consistency...\n")
  g_new <- list(
    id = "g_new", name = "Brand New Goal", category = "General",
    start_date = "2026-10-13", target_date = "2026-10-30", target_value = 20, unit = "units"
  )
  p_new <- list(list(id = "p5", goal_id = "g_new", date = "2026-10-13", value = 5))
  eval_new <- calculate_goal_metrics(list(g_new), p_new, reference_date = ref_dt)[[1]]
  stopifnot(eval_new$consistency_level == "Insufficient History")
  stopifnot(is.null(eval_new$consistency_score))
  cat("            [PASS] Properly flags Insufficient History when < 3 days elapsed.\n")

  # Test 6: Consistency Calculation with Active Streak
  cat("[Test 6/10] Verifying Consistency and Streak calculation with sufficient history...\n")
  g_habit <- list(
    id = "g_habit", name = "Daily Habit", category = "Health",
    start_date = "2026-10-01", target_date = "2026-10-31", target_value = 31, unit = "days"
  )
  # Progress logged every day from 2026-10-07 to 2026-10-14 (8 consecutive days)
  p_habit <- lapply(7:14, function(d) {
    list(id = sprintf("p_h%d", d), goal_id = "g_habit", date = sprintf("2026-10-%02d", d), value = 1)
  })
  eval_habit <- calculate_goal_metrics(list(g_habit), p_habit, reference_date = ref_dt)[[1]]
  stopifnot(eval_habit$current_streak == 8)
  stopifnot(eval_habit$consistency_level == "High Consistency")
  cat("            [PASS] Correctly computed 8-day active streak and High Consistency.\n")

  # Test 7: Milestone Evaluation
  cat("[Test 7/10] Verifying Milestone tracking...\n")
  g_mile <- list(
    id = "g_m", name = "Milestone Goal", category = "Learning",
    start_date = "2026-10-01", target_date = "2026-10-30", target_value = 30, unit = "chapters",
    milestones = list(
      list(title = "Stage 1", target_value = 10),
      list(title = "Stage 2", target_value = 20),
      list(title = "Stage 3", target_value = 30)
    )
  )
  p_mile <- list(list(id = "pm1", goal_id = "g_m", date = "2026-10-12", value = 15)) # Reached Stage 1
  eval_mile <- calculate_goal_metrics(list(g_mile), p_mile, reference_date = ref_dt)[[1]]
  stopifnot(eval_mile$milestones[[1]]$achieved == TRUE)
  stopifnot(eval_mile$milestones[[2]]$achieved == FALSE)
  stopifnot(eval_mile$milestones[[2]]$remaining_to_milestone == 5.0)
  cat("            [PASS] Accurately tracked achieved and pending milestones.\n")

  # Test 8: Validation - Duplicate Goal Names
  cat("[Test 8/10] Verifying duplicate goal name rejection...\n")
  dup_error <- tryCatch({
    validate_goal(list(name = "reading goal", start_date = "2026-10-01", target_date = "2026-10-20", target_value = 10),
                  existing_goals = list(g_comp))
    FALSE
  }, error = function(e) TRUE)
  stopifnot(dup_error)
  cat("            [PASS] Duplicate goal name properly rejected (case-insensitive).\n")

  # Test 9: Validation - Target Date Earlier than Start Date
  cat("[Test 9/10] Verifying invalid target date rejection...\n")
  date_error <- tryCatch({
    validate_goal(list(name = "Time Travel", start_date = "2026-10-20", target_date = "2026-10-10", target_value = 10))
    FALSE
  }, error = function(e) TRUE)
  stopifnot(date_error)
  cat("            [PASS] Inverted start/target dates properly rejected.\n")

  # Test 10: Validation - Negative Progress Value
  cat("[Test 10/10] Verifying negative progress rejection...\n")
  neg_error <- tryCatch({
    validate_progress(list(goal_id = "g_comp", date = "2026-10-12", value = -5), goals = list(g_comp))
    FALSE
  }, error = function(e) TRUE)
  stopifnot(neg_error)
  cat("            [PASS] Negative progress values properly rejected.\n")

  cat("\n================================================================\n")
  cat(" ALL 10 INVARIANT & BOUNDARY TESTS PASSED WITH 100% SUCCESS!\n")
  cat("================================================================\n\n")
}

# 5. Start Plumber HTTP Server
start_server <- function(port = 8000, host = "127.0.0.1") {
  if (!requireNamespace("plumber", quietly = TRUE)) {
    stop("The 'plumber' package is required. Install it using: install.packages('plumber')")
  }

  pr <- plumber::pr()

  # Cross-Origin Resource Sharing (CORS) Filter
  plumber::pr_filter(pr, "cors", function(req, res) {
    res$setHeader("Access-Control-Allow-Origin", "*")
    res$setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE")
    res$setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization")
    if (req$REQUEST_METHOD == "OPTIONS") {
      res$status <- 200
      return(list())
    }
    plumber::forward()
  })

  # Health Check Endpoint
  plumber::pr_get(pr, "/api/health", function() {
    list(
      status = "ok",
      service = "Goal Progress & Consistency Tracker API",
      r_version = R.version.string,
      timestamp = format(Sys.time(), "%Y-%m-%d %H:%M:%S UTC", tz = "UTC")
    )
  })

  # Sample Data Endpoint
  plumber::pr_get(pr, "/api/sample", function() {
    sample_data <- load_sample_data(
      goals_path = file.path(project_root, "data", "sample_goals.csv"),
      progress_path = file.path(project_root, "data", "sample_progress.csv"),
      reference_date = Sys.Date()
    )
    list(
      success = TRUE,
      goals = sample_data$goals,
      progress = sample_data$progress,
      reference_date = format(Sys.Date(), "%Y-%m-%d")
    )
  })

  # Core Analytical Calculation Endpoint
  plumber::pr_post(pr, "/api/calculate", function(req, res) {
    payload <- NULL
    if (!is.null(req$postBody) && nchar(req$postBody) > 0) {
      payload <- tryCatch(jsonlite::fromJSON(req$postBody, simplifyVector = FALSE), error = function(e) NULL)
    }
    if (is.null(payload) || length(payload) == 0) {
      payload <- req$body
    }

    tryCatch({
      ref_date <- payload$reference_date %||% format(Sys.Date(), "%Y-%m-%d")
      goals_raw <- payload$goals %||% list()
      progress_raw <- payload$progress %||% list()

      evaluated_goals <- calculate_goal_metrics(goals_raw, progress_raw, reference_date = ref_date)
      summary_data <- generate_weekly_summary(evaluated_goals, progress_raw, reference_date = ref_date)

      list(
        success = TRUE,
        reference_date = ref_date,
        goals = evaluated_goals,
        summary = summary_data
      )
    }, error = function(e) {
      list(
        success = FALSE,
        error = e$message
      )
    })
  })

  # Validate Goal Endpoint
  plumber::pr_post(pr, "/api/validate_goal", function(req, res) {
    payload <- NULL
    if (!is.null(req$postBody) && nchar(req$postBody) > 0) {
      payload <- tryCatch(jsonlite::fromJSON(req$postBody, simplifyVector = FALSE), error = function(e) NULL)
    }
    if (is.null(payload) || length(payload) == 0) {
      payload <- req$body
    }

    tryCatch({
      cleaned <- validate_goal(
        goal = payload$goal,
        existing_goals = payload$existing_goals %||% list(),
        is_edit = isTRUE(payload$is_edit)
      )
      list(success = TRUE, goal = cleaned)
    }, error = function(e) {
      list(success = FALSE, error = e$message)
    })
  })

  # Validate Progress Endpoint
  plumber::pr_post(pr, "/api/validate_progress", function(req, res) {
    payload <- NULL
    if (!is.null(req$postBody) && nchar(req$postBody) > 0) {
      payload <- tryCatch(jsonlite::fromJSON(req$postBody, simplifyVector = FALSE), error = function(e) NULL)
    }
    if (is.null(payload) || length(payload) == 0) {
      payload <- req$body
    }

    tryCatch({
      cleaned <- validate_progress(entry = payload$entry, goals = payload$goals %||% list())
      list(success = TRUE, progress = cleaned)
    }, error = function(e) {
      list(success = FALSE, error = e$message)
    })
  })

  # Mount static web directory
  web_dir <- file.path(project_root, "web")
  if (dir.exists(web_dir)) {
    plumber::pr_static(pr, "/", web_dir)
  }

  cat("\n================================================================\n")
  cat("     GOAL PROGRESS & CONSISTENCY TRACKER - R BACKEND SERVICE    \n")
  cat("================================================================\n")
  cat(sprintf("  Application URL : http://%s:%d\n", host, port))
  cat(sprintf("  Health Check    : http://%s:%d/api/health\n", host, port))
  cat(sprintf("  Sample Data API : http://%s:%d/api/sample\n", host, port))
  cat(sprintf("  Calculation API : http://%s:%d/api/calculate\n", host, port))
  cat(sprintf("  Static Directory: %s\n", web_dir))
  cat("================================================================\n")
  cat("  -> Open http://127.0.0.1:8000 in your browser to use the app.\n")
  cat("  -> Press Ctrl+C in this terminal window to stop the service.\n")
  cat("================================================================\n\n")

  plumber::pr_run(pr, port = port, host = host)
}

# 6. Main Argument Router
args <- commandArgs(trailingOnly = TRUE)

if ("--demo" %in% args) {
  run_cli_demo()
} else if ("--test" %in% args) {
  run_cli_tests()
} else {
  port <- 8000
  port_arg <- grep("^--port=", args, value = TRUE)
  if (length(port_arg) > 0) {
    port <- as.integer(sub("^--port=", "", port_arg[1]))
  }
  start_server(port = port, host = "127.0.0.1")
}
