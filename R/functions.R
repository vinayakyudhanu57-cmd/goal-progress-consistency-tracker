# ==============================================================================
# R/functions.R
# Goal Progress & Consistency Tracker
# Analytical Engine: Data Validation, Status Classification,
# Consistency Metrics, and Weekly Progress Summaries
# ==============================================================================

# Constants
INACTIVITY_THRESHOLD_DAYS <- 7
MIN_HISTORY_DAYS_FOR_CONSISTENCY <- 3

#' Validate Goal Input Parameters
#'
#' Enforces integrity constraints:
#' - Non-empty, unique goal name (case-insensitive).
#' - Target date strictly greater than or equal to start date.
#' - Target value strictly positive (> 0).
#' - Valid unit and category.
#'
#' @param goal List containing goal fields.
#' @param existing_goals List or data.frame of existing goals.
#' @param is_edit Logical indicating if an existing goal is being updated.
#' @return List with success flag, cleaned goal object, or error message.
validate_goal <- function(goal, existing_goals = list(), is_edit = FALSE) {
  # 1. Name validation
  name <- trimws(as.character(goal$name %||% ""))
  if (nchar(name) == 0) {
    stop("Goal name cannot be empty. Please enter a descriptive goal name.")
  }

  # Unique name validation (case-insensitive)
  goal_id <- as.character(goal$id %||% "")
  if (length(existing_goals) > 0) {
    for (eg in existing_goals) {
      eg_id <- as.character(eg$id %||% "")
      eg_name <- trimws(as.character(eg$name %||% ""))
      if (tolower(eg_name) == tolower(name)) {
        if (!is_edit || (is_edit && eg_id != goal_id)) {
          stop(sprintf("A goal named '%s' already exists. Each goal must have a unique name.", name))
        }
      }
    }
  }

  # 2. Date validations
  start_dt <- tryCatch(as.Date(goal$start_date), error = function(e) NA)
  if (is.na(start_dt)) {
    stop("Invalid start date. Please provide a valid date in YYYY-MM-DD format.")
  }

  target_dt <- tryCatch(as.Date(goal$target_date), error = function(e) NA)
  if (is.na(target_dt)) {
    stop("Invalid target date. Please provide a valid date in YYYY-MM-DD format.")
  }

  if (target_dt < start_dt) {
    stop(sprintf("Target date (%s) cannot be earlier than start date (%s).",
                 format(target_dt), format(start_dt)))
  }

  # 3. Target value validation
  target_val <- suppressWarnings(as.numeric(goal$target_value))
  if (is.na(target_val) || target_val <= 0) {
    stop("Target value must be a positive number greater than 0.")
  }

  # 4. Clean category and unit
  category <- trimws(as.character(goal$category %||% "General"))
  if (nchar(category) == 0) category <- "General"

  unit <- trimws(as.character(goal$unit %||% "units"))
  if (nchar(unit) == 0) unit <- "units"

  desc <- trimws(as.character(goal$description %||% ""))

  # 5. Parse and validate milestones
  milestones <- parse_milestones(goal$milestones, target_val)

  list(
    id = if (nchar(goal_id) > 0) goal_id else sprintf("goal_%d", as.integer(Sys.time())),
    name = name,
    description = desc,
    category = category,
    start_date = format(start_dt, "%Y-%m-%d"),
    target_date = format(target_dt, "%Y-%m-%d"),
    target_value = round(target_val, 2),
    unit = unit,
    milestones = milestones
  )
}

#' Parse and Validate Milestones
#'
#' Supports list of objects or semicolon-delimited string (e.g. "10:Part 1;20:Part 2").
parse_milestones <- function(raw_milestones, target_val) {
  if (is.null(raw_milestones) || length(raw_milestones) == 0) {
    return(list())
  }

  parsed <- list()

  if (is.character(raw_milestones) && length(raw_milestones) == 1 && grepl(":", raw_milestones)) {
    tokens <- unlist(strsplit(raw_milestones, ";"))
    for (tok in tokens) {
      parts <- unlist(strsplit(trimws(tok), ":"))
      if (length(parts) == 2) {
        val <- suppressWarnings(as.numeric(trimws(parts[1])))
        title <- trimws(parts[2])
        if (!is.na(val) && val > 0 && nchar(title) > 0) {
          parsed[[length(parsed) + 1]] <- list(title = title, target_value = round(val, 2))
        }
      }
    }
  } else if (is.list(raw_milestones)) {
    for (m in raw_milestones) {
      title <- trimws(as.character(m$title %||% ""))
      val <- suppressWarnings(as.numeric(m$target_value %||% m$target %||% 0))
      if (nchar(title) > 0 && !is.na(val) && val > 0) {
        parsed[[length(parsed) + 1]] <- list(title = title, target_value = round(val, 2))
      }
    }
  }

  # Sort milestones by target_value ascending
  if (length(parsed) > 1) {
    vals <- vapply(parsed, function(x) x$target_value, numeric(1))
    parsed <- parsed[order(vals)]
  }

  parsed
}

#' Validate Progress Log Entry
#'
#' @param entry List containing goal_id, date, value, and optional notes.
#' @param goals List or data.frame of goals.
#' @return Cleaned progress log record.
validate_progress <- function(entry, goals) {
  goal_id <- as.character(entry$goal_id %||% "")
  if (nchar(goal_id) == 0) {
    stop("Progress entry must specify a valid goal ID.")
  }

  # Check that goal exists
  goal_ids <- vapply(goals, function(g) as.character(g$id), character(1))
  if (!goal_id %in% goal_ids) {
    stop(sprintf("Goal with ID '%s' does not exist.", goal_id))
  }

  # Validate date
  prog_dt <- tryCatch(as.Date(entry$date), error = function(e) NA)
  if (is.na(prog_dt)) {
    stop("Invalid progress date. Please provide a valid date in YYYY-MM-DD format.")
  }

  # Validate value
  val <- suppressWarnings(as.numeric(entry$value))
  if (is.na(val) || val <= 0) {
    stop("Progress value must be a positive number greater than 0.")
  }

  notes <- trimws(as.character(entry$notes %||% ""))
  entry_id <- as.character(entry$id %||% sprintf("prog_%d_%d", as.integer(Sys.time()), sample(100:999, 1)))

  list(
    id = entry_id,
    goal_id = goal_id,
    date = format(prog_dt, "%Y-%m-%d"),
    value = round(val, 2),
    notes = notes
  )
}

#' Calculate Goal Metrics, Status Classifications, and Consistency Scores
#'
#' Executes deterministic evaluation for every goal:
#' - Current total value & completion percentage.
#' - Days remaining and elapsed.
#' - Status classification: Completed, Overdue, Stalled, Progressing.
#' - Plain-language classification justifications.
#' - Consistency calculation based on actual dated entries.
#' - Milestone achievement status.
#'
#' @param goals List of goal records.
#' @param progress List of progress records.
#' @param reference_date Base date for evaluation (defaults to Sys.Date()).
#' @return List of enriched goal objects.
calculate_goal_metrics <- function(goals, progress = list(), reference_date = Sys.Date()) {
  ref_dt <- as.Date(reference_date)

  # Standardize goals to a list of goal objects
  if (is.data.frame(goals)) {
    goals_rows <- vector("list", nrow(goals))
    for (r in seq_len(nrow(goals))) {
      row_item <- as.list(goals[r, , drop = FALSE])
      if ("milestones" %in% names(row_item) && is.data.frame(row_item$milestones[[1]])) {
        row_item$milestones <- row_item$milestones[[1]]
      }
      goals_rows[[r]] <- row_item
    }
    goals <- goals_rows
  }

  if (length(goals) == 0) {
    return(list())
  }

  # Standardize progress to data.frame
  if (is.data.frame(progress)) {
    prog_df <- progress
    prog_df$date <- as.Date(as.character(prog_df$date))
    prog_df$value <- as.numeric(prog_df$value)
    prog_df$goal_id <- as.character(prog_df$goal_id)
  } else if (is.list(progress) && length(progress) > 0) {
    prog_df <- data.frame(
      id = vapply(progress, function(p) as.character(p$id %||% ""), character(1)),
      goal_id = vapply(progress, function(p) as.character(p$goal_id %||% ""), character(1)),
      date = as.Date(vapply(progress, function(p) as.character(p$date %||% "1970-01-01"), character(1))),
      value = vapply(progress, function(p) as.numeric(p$value %||% 0), numeric(1)),
      notes = vapply(progress, function(p) as.character(p$notes %||% ""), character(1)),
      stringsAsFactors = FALSE
    )
  } else {
    prog_df <- data.frame(
      id = character(0),
      goal_id = character(0),
      date = as.Date(character(0)),
      value = numeric(0),
      notes = character(0),
      stringsAsFactors = FALSE
    )
  }

  evaluated_goals <- vector("list", length(goals))

  for (i in seq_along(goals)) {
    g <- goals[[i]]
    g_id <- as.character(g$id)
    start_dt <- as.Date(g$start_date)
    target_dt <- as.Date(g$target_date)
    target_val <- as.numeric(g$target_value)

    # Filter progress records for this goal
    sub_prog <- prog_df[prog_df$goal_id == g_id, , drop = FALSE]

    # 1. Total Current Value & Completion Percentage
    current_val <- if (nrow(sub_prog) > 0) sum(sub_prog$value, na.rm = TRUE) else 0.0
    current_val <- round(current_val, 2)
    completion_pct <- round((current_val / target_val) * 100, 1)

    # 2. Temporal Metrics
    days_remaining <- as.numeric(target_dt - ref_dt)
    days_elapsed <- max(0, as.numeric(ref_dt - start_dt))

    # Last recorded progress date
    if (nrow(sub_prog) > 0) {
      last_prog_dt <- max(sub_prog$date)
      days_since_last_progress <- as.numeric(ref_dt - last_prog_dt)
    } else {
      last_prog_dt <- as.Date(NA)
      days_since_last_progress <- days_elapsed
    }

    # 3. Status Classification (Deterministic Rules)
    # Rule 1: Completed (Target has been reached)
    if (current_val >= target_val) {
      status <- "Completed"
      status_badge <- "completed"
      status_reason <- sprintf(
        "Target reached! Completed %.1f of %.1f %s (%.1f%% achieved).",
        current_val, target_val, g$unit, completion_pct
      )
    # Rule 2: Overdue (Target date passed and incomplete)
    } else if (ref_dt > target_dt) {
      status <- "Overdue"
      status_badge <- "overdue"
      overdue_days <- as.numeric(ref_dt - target_dt)
      remaining_qty <- round(target_val - current_val, 2)
      status_reason <- sprintf(
        "Target deadline passed on %s (%d days overdue). Incomplete with %.1f of %.1f %s remaining (%.1f%% done).",
        format(target_dt), overdue_days, remaining_qty, target_val, g$unit, completion_pct
      )
    # Rule 3: Stalled (Incomplete, within deadline, no progress within inactivity threshold)
    } else if (days_since_last_progress >= INACTIVITY_THRESHOLD_DAYS) {
      status <- "Stalled"
      status_badge <- "stalled"
      remaining_qty <- round(target_val - current_val, 2)
      status_reason <- sprintf(
        "No progress logged in the last %d days (inactivity threshold: %d days). Target deadline is in %d days with %.1f %s remaining.",
        days_since_last_progress, INACTIVITY_THRESHOLD_DAYS, days_remaining, remaining_qty, g$unit
      )
    # Rule 4: Progressing (Incomplete, within deadline, recent progress)
    } else {
      status <- "Progressing"
      status_badge <- "progressing"
      last_active_str <- if (is.na(last_prog_dt)) "recently started" else if (days_since_last_progress == 0) "today" else if (days_since_last_progress == 1) "yesterday" else sprintf("%d days ago", days_since_last_progress)
      remaining_qty <- round(target_val - current_val, 2)
      status_reason <- sprintf(
        "Active progress logged %s. On track with %d days remaining until %s (%.1f %s to go).",
        last_active_str, days_remaining, format(target_dt), remaining_qty, g$unit
      )
    }

    # 4. Consistency Calculation based on actual dated entries
    if (days_elapsed < MIN_HISTORY_DAYS_FOR_CONSISTENCY) {
      consistency_level <- "Insufficient History"
      consistency_score <- NA
      active_logging_days <- if (nrow(sub_prog) > 0) length(unique(sub_prog$date)) else 0
      current_streak <- 0
      consistency_reason <- sprintf(
        "Goal started %d days ago. Requires at least %d days of tracking history to calculate consistency.",
        days_elapsed, MIN_HISTORY_DAYS_FOR_CONSISTENCY
      )
    } else {
      # Evaluate rolling tracking window (up to 14 days)
      eval_window_days <- min(14, max(MIN_HISTORY_DAYS_FOR_CONSISTENCY, days_elapsed))
      window_start_dt <- ref_dt - eval_window_days + 1

      # Active days in window
      window_entries <- sub_prog[sub_prog$date >= window_start_dt & sub_prog$date <= ref_dt, , drop = FALSE]
      unique_active_dates <- unique(window_entries$date)
      active_logging_days <- length(unique_active_dates)

      # Consistency score (100% when active on 60%+ of days in window)
      active_ratio <- (active_logging_days / eval_window_days)
      c_score <- round(min(100, (active_ratio / 0.60) * 100), 1)
      consistency_score <- c_score

      # Streak calculation (consecutive days backward from today or yesterday)
      current_streak <- calculate_streak(unique_active_dates, ref_dt)

      # Qualitative consistency level
      if (c_score >= 70) {
        consistency_level <- "High Consistency"
      } else if (c_score >= 40) {
        consistency_level <- "Moderate Consistency"
      } else {
        consistency_level <- "Low Consistency"
      }

      consistency_reason <- sprintf(
        "%d active logging days in the past %d-day window (%.0f%% active rate, %d-day current streak).",
        active_logging_days, eval_window_days, round(active_ratio * 100), current_streak
      )
    }

    # 5. Milestone Evaluations
    evaluated_milestones <- list()
    if (!is.null(g$milestones) && length(g$milestones) > 0) {
      for (m in g$milestones) {
        m_target <- as.numeric(m$target_value)
        m_achieved <- current_val >= m_target
        evaluated_milestones[[length(evaluated_milestones) + 1]] <- list(
          title = m$title,
          target_value = m_target,
          achieved = m_achieved,
          remaining_to_milestone = max(0, round(m_target - current_val, 2))
        )
      }
    }

    # Enriched Goal Record
    evaluated_goals[[i]] <- list(
      id = g_id,
      name = g$name,
      description = g$description,
      category = g$category,
      start_date = g$start_date,
      target_date = g$target_date,
      target_value = target_val,
      unit = g$unit,
      current_value = current_val,
      completion_pct = completion_pct,
      days_remaining = days_remaining,
      days_elapsed = days_elapsed,
      last_progress_date = if (is.na(last_prog_dt)) NULL else format(last_prog_dt, "%Y-%m-%d"),
      days_since_last_progress = days_since_last_progress,
      status = status,
      status_badge = status_badge,
      status_reason = status_reason,
      consistency_level = consistency_level,
      consistency_score = if (is.na(consistency_score)) NULL else consistency_score,
      active_logging_days = active_logging_days,
      current_streak = current_streak,
      consistency_reason = consistency_reason,
      milestones = evaluated_milestones,
      progress_count = nrow(sub_prog)
    )
  }

  evaluated_goals
}

#' Calculate Active Day Streak Backwards from Reference Date
calculate_streak <- function(active_dates, ref_dt) {
  if (length(active_dates) == 0) return(0)

  # Check if streak begins today or yesterday
  has_today <- ref_dt %in% active_dates
  has_yesterday <- (ref_dt - 1) %in% active_dates

  if (!has_today && !has_yesterday) return(0)

  cur_check <- if (has_today) ref_dt else (ref_dt - 1)
  streak <- 0

  while (cur_check %in% active_dates) {
    streak <- streak + 1
    cur_check <- cur_check - 1
  }

  streak
}

#' Generate Weekly Summary & Category Aggregations
#'
#' @param evaluated_goals Output from calculate_goal_metrics.
#' @param progress List of raw progress records.
#' @param reference_date Date for weekly window anchoring.
#' @return Comprehensive summary list.
generate_weekly_summary <- function(evaluated_goals, progress = list(), reference_date = Sys.Date()) {
  ref_dt <- as.Date(reference_date)
  total_goals <- length(evaluated_goals)

  if (total_goals == 0) {
    return(list(
      total_goals = 0,
      active_goals = 0,
      completed_goals = 0,
      stalled_goals = 0,
      overdue_goals = 0,
      weekly_entries_count = 0,
      weekly_total_value = 0,
      upcoming_deadlines = list(),
      activity_chart = list(),
      category_distribution = list()
    ))
  }

  # Status counts
  statuses <- vapply(evaluated_goals, function(g) g$status, character(1))
  completed_count <- sum(statuses == "Completed")
  overdue_count <- sum(statuses == "Overdue")
  stalled_count <- sum(statuses == "Stalled")
  progressing_count <- sum(statuses == "Progressing")
  active_goals <- progressing_count + stalled_count

  # Rolling 7-day progress window [ref_dt - 6, ref_dt]
  week_start_dt <- ref_dt - 6
  week_dates <- seq.Date(from = week_start_dt, to = ref_dt, by = "day")

  # Standardize progress records to data.frame
  if (is.data.frame(progress)) {
    prog_df <- progress
    prog_df$date <- as.character(prog_df$date)
    prog_df$value <- as.numeric(prog_df$value)
  } else if (is.list(progress) && length(progress) > 0) {
    prog_df <- data.frame(
      date = vapply(progress, function(p) as.character(p$date %||% ""), character(1)),
      value = vapply(progress, function(p) as.numeric(p$value %||% 0), numeric(1)),
      stringsAsFactors = FALSE
    )
  } else {
    prog_df <- data.frame(date = character(0), value = numeric(0), stringsAsFactors = FALSE)
  }

  # Activity chart aggregation
  activity_chart <- vector("list", length(week_dates))
  weekly_entries_count <- 0
  weekly_total_val <- 0

  # Progress records filtering
  for (d_idx in seq_along(week_dates)) {
    d <- week_dates[d_idx]
    d_str <- format(d, "%Y-%m-%d")
    day_mask <- prog_df$date == d_str
    day_count <- sum(day_mask)
    day_val <- sum(prog_df$value[day_mask], na.rm = TRUE)

    weekly_entries_count <- weekly_entries_count + day_count
    weekly_total_val <- weekly_total_val + day_val

    activity_chart[[d_idx]] <- list(
      date = d_str,
      day_name = weekdays(d, abbreviate = TRUE),
      entries_count = day_count,
      total_value = round(day_val, 2)
    )
  }

  # Upcoming deadlines within next 7 days
  upcoming_deadlines <- list()
  for (g in evaluated_goals) {
    if (g$status != "Completed" && g$days_remaining >= 0 && g$days_remaining <= 7) {
      upcoming_deadlines[[length(upcoming_deadlines) + 1]] <- list(
        id = g$id,
        name = g$name,
        target_date = g$target_date,
        days_remaining = g$days_remaining,
        completion_pct = g$completion_pct,
        unit = g$unit,
        remaining_qty = round(g$target_value - g$current_value, 2)
      )
    }
  }

  # Category distribution
  categories <- vapply(evaluated_goals, function(g) g$category, character(1))
  unique_cats <- unique(categories)
  category_dist <- lapply(unique_cats, function(cat_name) {
    cat_goals <- evaluated_goals[categories == cat_name]
    cat_completed <- sum(vapply(cat_goals, function(g) g$status == "Completed", logical(1)))
    cat_avg_pct <- mean(vapply(cat_goals, function(g) min(100, g$completion_pct), numeric(1)))
    list(
      category = cat_name,
      total_goals = length(cat_goals),
      completed_goals = cat_completed,
      average_completion_pct = round(cat_avg_pct, 1)
    )
  })

  list(
    total_goals = total_goals,
    active_goals = active_goals,
    progressing_goals = progressing_count,
    completed_goals = completed_count,
    stalled_goals = stalled_count,
    overdue_goals = overdue_count,
    weekly_entries_count = weekly_entries_count,
    weekly_total_value = round(weekly_total_val, 2),
    upcoming_deadlines = upcoming_deadlines,
    activity_chart = activity_chart,
    category_distribution = category_dist
  )
}

#' Load and Calibrate Sample Data
#'
#' Reads sample CSV files and offsets dates relative to reference_date
#' so the dataset is immediately testable and demonstrates all statuses.
load_sample_data <- function(goals_path = "data/sample_goals.csv",
                             progress_path = "data/sample_progress.csv",
                             reference_date = Sys.Date()) {
  ref_dt <- as.Date(reference_date)

  if (!file.exists(goals_path) || !file.exists(progress_path)) {
    stop("Sample CSV data files not found.")
  }

  goals_raw <- read.csv(goals_path, stringsAsFactors = FALSE, strip.white = TRUE)
  prog_raw <- read.csv(progress_path, stringsAsFactors = FALSE, strip.white = TRUE)

  # Process Goals with dynamic date offsets
  goals_list <- lapply(seq_len(nrow(goals_raw)), function(i) {
    row <- goals_raw[i, ]
    start_dt <- ref_dt + as.integer(row$start_offset_days)
    target_dt <- ref_dt + as.integer(row$target_offset_days)
    milestones <- parse_milestones(as.character(row$milestones), as.numeric(row$target_value))

    list(
      id = as.character(row$id),
      name = as.character(row$name),
      description = as.character(row$description),
      category = as.character(row$category),
      start_date = format(start_dt, "%Y-%m-%d"),
      target_date = format(target_dt, "%Y-%m-%d"),
      target_value = as.numeric(row$target_value),
      unit = as.character(row$unit),
      milestones = milestones
    )
  })

  # Process Progress Entries with dynamic date offsets
  progress_list <- lapply(seq_len(nrow(prog_raw)), function(i) {
    row <- prog_raw[i, ]
    prog_dt <- ref_dt + as.integer(row$date_offset_days)
    list(
      id = as.character(row$id),
      goal_id = as.character(row$goal_id),
      date = format(prog_dt, "%Y-%m-%d"),
      value = as.numeric(row$value),
      notes = as.character(row$notes)
    )
  })

  list(
    goals = goals_list,
    progress = progress_list
  )
}

#' Helper Null Coalescing Operator
`%||%` <- function(a, b) {
  if (is.null(a) || length(a) == 0 || is.na(a)) b else a
}
