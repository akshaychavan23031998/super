# Ice Cream Parlor Sales Report Generator

A Node.js program that reads an in-memory CSV dataset of ice cream parlor transactions and generates six analytical reports, including data validation.

## How to Run

```bash
node solution.js
```

**Requirements:** Node.js (any version 12+). No external dependencies or `npm install` needed.

---

## Problem Statement

Given a CSV string containing sales transactions (Date, SKU, Unit Price, Quantity, Total Price), the program must:

1. Validate the data and flag inconsistencies
2. Compute total store sales
3. Compute month-wise sales totals
4. Identify the most popular item per month with order statistics
5. Identify the top revenue-generating item per month
6. Calculate month-to-month revenue growth per item

**Constraints:** No SQL/NoSQL, no third-party libraries — only vanilla Node.js with arrays, objects, and sets.

---

## Architecture

The solution follows a clean **Parse → Validate → Aggregate → Report** pipeline:

```
CSV String
    │
    ▼
parseData()          →  Array of row objects
    │
    ▼
validateRows()       →  { validRows[], invalidRows[] }
    │
    ▼
buildMonthItemData() →  Nested month-item aggregation map
    │
    ▼
Report functions     →  Console output
```

Each stage is a pure function that takes input and returns output, making the code testable and easy to reason about.

---

## Module Breakdown

### Parsing — `parseData(csvString)`

- Splits the CSV string on newline characters
- Trims each line and skips empty lines (the dataset contains blank lines between months)
- Skips the first non-empty line (header row)
- Splits each data line on commas, converts numeric fields using `Number()`
- Preserves the **original row number** (1-based, counting all lines including blanks) so validation error messages reference the exact line in the raw CSV

**Why `Number()` over `parseInt()`?** — `Number("12abc")` returns `NaN` (catches bad data), while `parseInt("12abc")` silently returns `12`. Strictness matters for a validation stage.

### Validation — `validateRows(rows)`

Every row is checked against **all five rules** (not short-circuited), so a single row can accumulate multiple reasons:

| Rule | Check | Handles |
|---|---|---|
| Date malformed | Regex `YYYY-MM-DD` + `new Date()` round-trip | Catches "2019-02-30", non-date strings |
| Quantity < 1 | `isNaN(qty) \|\| qty < 1` | Zero, negative, non-numeric |
| Unit Price < 0 | `isNaN(price) \|\| price < 0` | Negative, non-numeric |
| Total Price < 0 | `isNaN(total) \|\| total < 0` | Negative, non-numeric |
| Price mismatch | `unitPrice * quantity !== totalPrice` | Arithmetic inconsistency |

The price mismatch check is **only performed when all three numeric fields are valid numbers**, avoiding false positives on already-flagged NaN values.

**Output:** Two arrays — `validRows` feeds into reports, `invalidRows` feeds into the validation report with row numbers and reason lists.

### Aggregation — `buildMonthItemData(validRows)`

A single O(n) pass builds a nested structure that three reports reuse:

```
{
  "2019-01": {
    "Cake Fudge": {
      totalQuantity: 10,
      totalRevenue: 1500,
      orders: [1, 1, 3, 5]     // individual transaction quantities
    },
    ...
  },
  ...
}
```

This **single-pass aggregation** is the core design decision — it avoids iterating through the data multiple times for different reports. The `orders` array preserves individual transaction quantities for computing min/max/average.

### Report Functions

| Function | What It Does | Complexity |
|---|---|---|
| `calcTotalSales` | Sums `totalPrice` across all valid rows | O(n) |
| `calcMonthWiseTotals` | Groups and sums revenue by `YYYY-MM` key | O(n) |
| `calcMostPopularPerMonth` | Finds the SKU with highest total quantity per month, then computes min/max/avg from its orders array | O(m × k) |
| `calcTopRevenuePerMonth` | Finds the SKU with highest total revenue per month | O(m × k) |
| `calcMonthToMonthGrowth` | Compares each item's revenue between consecutive months | O(m × k) |

Where `n` = total rows, `m` = unique months, `k` = unique items. Since m × k ≤ n, overall complexity is **O(n)**.

---

## Data Structures Used

| Structure | JS Construct | Purpose |
|---|---|---|
| **Array** | `[]` | Parsed rows, valid/invalid row lists, per-item orders |
| **Hash Map** | `{}` (plain object) | Month-wise totals, month-item aggregation, growth results |
| **Set** | `{}` with boolean values | Collecting unique item names across all months |

No classes, no external libraries — just arrays and objects as the assignment requires.

---

## Edge Cases Handled

| Edge Case | How It's Handled |
|---|---|
| **Empty lines in CSV** | Trimmed and skipped during parsing |
| **Duplicate rows** | Counted normally (no de-duplication, as specified) |
| **Non-numeric values** | `Number()` returns `NaN`, caught by validation |
| **Quantity = 0** | Flagged as "Quantity < 1" |
| **Price mismatch + other errors** | Row accumulates all applicable reasons |
| **Item missing in previous month** | Growth shows "N/A" (avoids divide-by-zero) |
| **Item disappears in current month** | Growth shows "-100.00%" (correct: full drop) |
| **Tied quantities for most popular** | First item encountered wins (deterministic via insertion order) |

### Why "N/A" for Growth When Previous Month Revenue is Zero

If an item had no sales in the prior month, computing `(current - 0) / 0` is mathematically undefined. Displaying "N/A" is more honest than fabricating a number. If the item existed previously but drops to zero, that's a clean `-100%` — meaningful and accurate.

---

## Validation Results (from this dataset)

Two rows are flagged:

| Row | Issue(s) |
|---|---|
| Row 58: `Vanilla Single Scoop, 50, 4, 100` | Price mismatch (50 × 4 = 200 ≠ 100) |
| Row 59: `Cafe Caramel, 160, 0, 160` | Quantity < 1; Price mismatch (160 × 0 = 0 ≠ 160) |

---

## Sample Output

```
===== DATA VALIDATION ISSUES =====
Row 58: 2019-03-01,Vanilla Single Scoop,50,4,100
  - Unit Price * Quantity !== Total Price
Row 59: 2019-03-01,Cafe Caramel,160,0,160
  - Quantity < 1
  - Unit Price * Quantity !== Total Price

===== TOTAL SALES =====
Total Sales: 18820

===== MONTH-WISE TOTALS =====
2019-01: 6910
2019-02: 5530
2019-03: 6380

===== MOST POPULAR ITEM PER MONTH =====
2019-01: Butterscotch Single Scoop (Qty: 13)
  Min Orders: 3 | Max Orders: 5 | Avg Orders: 4.33
2019-02: Vanilla Single Scoop (Qty: 14)
  Min Orders: 2 | Max Orders: 5 | Avg Orders: 3.50
2019-03: Cake Fudge (Qty: 20)
  Min Orders: 1 | Max Orders: 5 | Avg Orders: 3.33

===== TOP REVENUE ITEM PER MONTH =====
2019-01: Hot Chocolate Fudge (Revenue: 1560)
2019-02: Hot Chocolate Fudge (Revenue: 1440)
2019-03: Cake Fudge (Revenue: 3000)

===== MONTH-TO-MONTH GROWTH PER ITEM =====
Item: Almond Fudge
  2019-01 -> 2019-02: N/A
  2019-02 -> 2019-03: N/A
Item: Butterscotch Single Scoop
  2019-01 -> 2019-02: -53.85%
  2019-02 -> 2019-03: 0.00%
...
```

---

## Performance & Scalability

| Metric | Value |
|---|---|
| **Time complexity** | O(n) — every stage is a single pass |
| **Space complexity** | O(n) for rows + O(m × k) for aggregation |
| **Bottleneck at scale** | In-memory CSV string (assignment constraint) |
| **Production improvement** | Stream the file line-by-line using Node.js `readline` to keep memory usage constant regardless of file size |

---

## Tech Stack

- **Runtime:** Node.js (vanilla, no frameworks)
- **Dependencies:** None
- **Data structures:** Arrays, plain objects (hash maps), object-as-set pattern
# super
