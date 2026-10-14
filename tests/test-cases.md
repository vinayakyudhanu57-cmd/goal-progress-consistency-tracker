# Test Cases: Goal Progress & Consistency Tracker

This document specifies the validation suites, algorithmic invariants, and operational test cases for the **Goal Progress & Consistency Tracker**. All core R rules can be verified using the automated test suite (`Rscript R/main.R --test`) or interactively through the web interface.

---

## 1. Test Summary Matrix

| ID | Test Case Name | Objective / Invariant | Input Scenario | Expected Outcome | Verification Status |
|---|---|---|---|---|---|
| **TC-01** | Goal Creation & Validation | Validate mandatory fields and date boundaries | Valid name, start date `2026-10-01`, target `2026-10-31`, target value `50.0` | Clean goal record created with unique ID and formatted dates | **PASS** |
| **TC-02** | Completed Status Classification | Verify target reached classification | Target: `10 chapters`. Progress: `12 chapters` logged (exceeded target) | Status = `Completed`, Completion = `120.0%`, Milestone achieved | **PASS** |
| **TC-03** | Overdue Status Classification | Verify overdue detection when deadline passes | Target date: `2026-10-10`. Ref date: `2026-10-14`. Value: `30/50 hours` | Status = `Overdue`, `days_remaining` = `-4`, descriptive explanation | **PASS** |
| **TC-04** | Stalled Status Classification | Enforce 7-day inactivity threshold | Target: `20 tasks`. Last progress logged 9 days ago (`2026-10-05`) | Status = `Stalled`, `days_since_last_progress` = `9` ($\ge 7$ days) | **PASS** |
| **TC-05** | Progressing Status Classification | Verify active goal on schedule | Target: `40 hours`. Last progress logged 2 days ago (`2026-10-12`) | Status = `Progressing`, `days_since_last_progress` = `2` (< 7 days) | **PASS** |
| **TC-06** | Insufficient History Handling | Suppress misleading consistency scores | Goal started 1 day ago (`2026-10-13`, < 3 days elapsed) | Consistency Level = `Insufficient History`, score = `NA` | **PASS** |
| **TC-07** | Consistency & Streak Calculation | Verify rolling window active days and streak | 8 consecutive days logged in past 13 days | Consistency Level = `High Consistency`, Streak = `8 days` | **PASS** |
| **TC-08** | Milestone Tracking Evaluation | Track achieved vs pending milestone thresholds | Milestones at `10`, `20`, `30`. Current progress = `15` | Stage 1 achieved (`15 >= 10`), Stage 2 pending (`5` remaining) | **PASS** |
| **TC-09** | Duplicate Goal Name Validation | Enforce unique names (case-insensitive) | Existing: "Reading Goal". Attempt to add: "reading goal" | Error: `A goal named 'reading goal' already exists.` | **PASS** |
| **TC-10** | Inverted Date Boundary Validation | Reject target date earlier than start date | Start date: `2026-10-20`. Target date: `2026-10-10` | Error: `Target date cannot be earlier than start date.` | **PASS** |
| **TC-11** | Negative/Zero Progress Validation | Prevent invalid progress quantities | Progress value = `-5.0` or `0.0` | Error: `Progress value must be a positive number greater than 0.` | **PASS** |
| **TC-12** | Weekly Progress Aggregation | Validate rolling 7-day summary metrics | 15 progress entries logged within `[ref_date - 6, ref_date]` | Weekly entries count = `15`, daily activity chart populated | **PASS** |
| **TC-13** | Goal Deletion & Cascading History | Verify safe removal of goals and progress records | Delete `goal_3` with 3 progress logs | Goal and associated logs removed from active state without residual errors | **PASS** |
| **TC-14** | Category & Status Filtering | Verify live filtering across statuses | Filter by `Category: Reading` or `Status: Stalled` | Display updates instantly with matching records only | **PASS** |

---

## 2. Invariant Specifications

### Status Classification Rules Hierarchy
The analytical engine evaluates status in strict priority order:

1. **Rule 1: Completed**
   $$\text{CurrentValue} \ge \text{TargetValue} \implies \text{Status} = \text{Completed}$$
   *Note*: Holds true even if target date is in the future or past.
2. **Rule 2: Overdue**
   $$\text{ReferenceDate} > \text{TargetDate} \quad \text{AND} \quad \text{CurrentValue} < \text{TargetValue} \implies \text{Status} = \text{Overdue}$$
3. **Rule 3: Stalled**
   $$\text{DaysSinceLastProgress} \ge 7 \quad \text{AND} \quad \text{ReferenceDate} \le \text{TargetDate} \implies \text{Status} = \text{Stalled}$$
4. **Rule 4: Progressing**
   $$\text{DaysSinceLastProgress} < 7 \quad \text{AND} \quad \text{ReferenceDate} \le \text{TargetDate} \implies \text{Status} = \text{Progressing}$$

### Consistency & Streak Formula
- **Minimum History Invariant**: If $\text{DaysElapsed} < 3$, Consistency is reported as `"Insufficient History"` with `score = NA`.
- **Evaluation Window**: $W = \min(14, \max(3, \text{DaysElapsed}))$.
- **Active Logging Ratio**: $R_{\text{active}} = \frac{N_{\text{active days in window}}}{W}$.
- **Consistency Score**:
  $$\text{Score} = \min\left(100, \; \text{round}\left(\frac{R_{\text{active}}}{0.60} \times 100, 1\right)\right)$$
  - High Consistency: $\text{Score} \ge 70$
  - Moderate Consistency: $40 \le \text{Score} < 70$
  - Low Consistency: $\text{Score} < 40$

---

## 3. How to Execute Automated Verification

Run the test suite directly from Windows Command Prompt or PowerShell:

```cmd
cd /d C:\Users\DELL\Desktop\r_projects\goal-progress-consistency-tracker
"C:\Program Files\R\R-4.6.1\bin\Rscript.exe" R/main.R --test
```

Expected output:
```text
================================================================
       RUNNING UNIT, BOUNDARY & CLASSIFICATION VERIFICATIONS    
================================================================

[Test 1/10] Verifying Completed goal classification...
            [PASS] Successfully classified as Completed with > 100% completion.
[Test 2/10] Verifying Overdue goal classification...
            [PASS] Successfully classified as Overdue when deadline has passed.
[Test 3/10] Verifying Stalled goal classification (7-day inactivity rule)...
            [PASS] Successfully classified as Stalled after 9 days of inactivity.
[Test 4/10] Verifying Progressing goal classification...
            [PASS] Successfully classified as Progressing with recent activity.
[Test 5/10] Verifying Insufficient History handling for consistency...
            [PASS] Properly flags Insufficient History when < 3 days elapsed.
[Test 6/10] Verifying Consistency and Streak calculation with sufficient history...
            [PASS] Correctly computed 8-day active streak and High Consistency.
[Test 7/10] Verifying Milestone tracking...
            [PASS] Accurately tracked achieved and pending milestones.
[Test 8/10] Verifying duplicate goal name rejection...
            [PASS] Duplicate goal name properly rejected (case-insensitive).
[Test 9/10] Verifying invalid target date rejection...
            [PASS] Inverted start/target dates properly rejected.
[Test 10/10] Verifying negative progress rejection...
            [PASS] Negative progress values properly rejected.

================================================================
 ALL 10 INVARIANT & BOUNDARY TESTS PASSED WITH 100% SUCCESS!
================================================================
```
