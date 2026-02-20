const data = `Date,SKU,Unit Price,Quantity,Total Price
2019-01-01,Death by Chocolate,180,5,900
2019-01-01,Cake Fudge,150,1,150
2019-01-01,Cake Fudge,150,1,150
2019-01-01,Cake Fudge,150,3,450
2019-01-01,Death by Chocolate,180,1,180
2019-01-01,Vanilla Double Scoop,80,3,240
2019-01-01,Butterscotch Single Scoop,60,5,300
2019-01-01,Vanilla Single Scoop,50,5,250
2019-01-01,Cake Fudge,150,5,750
2019-01-01,Hot Chocolate Fudge,120,3,360
2019-01-01,Butterscotch Single Scoop,60,5,300
2019-01-01,Chocolate Europa Double Scoop,100,1,100
2019-01-01,Hot Chocolate Fudge,120,2,240
2019-01-01,Caramel Crunch Single Scoop,70,4,280
2019-01-01,Hot Chocolate Fudge,120,2,240
2019-01-01,Hot Chocolate Fudge,120,4,480
2019-01-01,Hot Chocolate Fudge,120,2,240
2019-01-01,Cafe Caramel,160,5,800
2019-01-01,Vanilla Double Scoop,80,4,320
2019-01-01,Butterscotch Single Scoop,60,3,180
2019-02-01,Butterscotch Single Scoop,60,3,180
2019-02-01,Vanilla Single Scoop,50,2,100
2019-02-01,Butterscotch Single Scoop,60,3,180
2019-02-01,Vanilla Double Scoop,80,1,80

2019-02-01,Death by Chocolate,180,2,360
2019-02-01,Cafe Caramel,160,2,320
2019-02-01,Pista Single Scoop,60,3,180
2019-02-01,Hot Chocolate Fudge,120,2,240
2019-02-01,Vanilla Single Scoop,50,3,150
2019-02-01,Vanilla Single Scoop,50,5,250
2019-02-01,Cake Fudge,150,1,150
2019-02-01,Vanilla Single Scoop,50,4,200
2019-02-01,Vanilla Double Scoop,80,3,240
2019-02-01,Cake Fudge,150,1,150
2019-02-01,Vanilla Double Scoop,80,5,400
2019-02-01,Hot Chocolate Fudge,120,5,600
2019-02-01,Vanilla Double Scoop,80,2,160
2019-02-01,Vanilla Double Scoop,80,3,240
2019-02-01,Hot Chocolate Fudge,120,5,600
2019-02-01,Cake Fudge,150,5,750
2019-03-01,Vanilla Single Scoop,50,5,250
2019-03-01,Cake Fudge,150,5,750
2019-03-01,Pista Single Scoop,60,1,60
2019-03-01,Butterscotch Single Scoop,60,2,120
2019-03-01,Vanilla Double Scoop,80,1,80
2019-03-01,Cafe Caramel,160,1,160
2019-03-01,Cake Fudge,150,5,750
2019-03-01,Trilogy,160,5,800
2019-03-01,Butterscotch Single Scoop,60,3,180
2019-03-01,Death by Chocolate,180,2,360
2019-03-01,Butterscotch Single Scoop,60,1,60

2019-03-01,Hot Chocolate Fudge,120,3,360
2019-03-01,Cake Fudge,150,2,300
2019-03-01,Cake Fudge,150,2,300
2019-03-01,Vanilla Single Scoop,50,4,100
2019-03-01,Cafe Caramel,160,0,160
2019-03-01,Cake Fudge,150,5,750
2019-03-01,Cafe Caramel,160,5,800
2019-03-01,Almond Fudge,150,1,150
2019-03-01,Cake Fudge,150,1,150`;

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

function parseData(csvString) {
  const lines = csvString.split('\n');
  const rows = [];
  let headerSkipped = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === '') continue;

    if (!headerSkipped) {
      headerSkipped = true;
      continue;
    }

    const parts = line.split(',').map(field => field.trim());
    rows.push({
      rowNumber: i + 1,
      date: parts[0] || '',
      sku: parts[1] || '',
      unitPrice: Number(parts[2]),
      quantity: Number(parts[3]),
      totalPrice: Number(parts[4]),
      raw: line
    });
  }

  return rows;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function isValidDate(dateStr) {
  if (typeof dateStr !== 'string') return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const parts = dateStr.split('-');
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);
  const d = new Date(year, month - 1, day);
  return d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day;
}

function validateRows(rows) {
  const validRows = [];
  const invalidRows = [];

  for (const row of rows) {
    const reasons = [];

    if (!isValidDate(row.date)) {
      reasons.push('Date is malformed');
    }

    if (isNaN(row.quantity) || row.quantity < 1) {
      reasons.push('Quantity < 1');
    }

    if (isNaN(row.unitPrice) || row.unitPrice < 0) {
      reasons.push('Unit Price < 0');
    }

    if (isNaN(row.totalPrice) || row.totalPrice < 0) {
      reasons.push('Total Price < 0');
    }

    if (!isNaN(row.unitPrice) && !isNaN(row.quantity) && !isNaN(row.totalPrice)) {
      if (row.unitPrice * row.quantity !== row.totalPrice) {
        reasons.push('Unit Price * Quantity !== Total Price');
      }
    }

    if (reasons.length > 0) {
      invalidRows.push({ rowNumber: row.rowNumber, raw: row.raw, reasons });
    } else {
      validRows.push(row);
    }
  }

  return { validRows, invalidRows };
}

// ---------------------------------------------------------------------------
// Aggregation helpers
// ---------------------------------------------------------------------------

function getMonthKey(dateStr) {
  return dateStr.substring(0, 7);
}

function buildMonthItemData(validRows) {
  const monthData = {};

  for (const row of validRows) {
    const month = getMonthKey(row.date);

    if (!monthData[month]) monthData[month] = {};
    if (!monthData[month][row.sku]) {
      monthData[month][row.sku] = { totalQuantity: 0, totalRevenue: 0, orders: [] };
    }

    const entry = monthData[month][row.sku];
    entry.totalQuantity += row.quantity;
    entry.totalRevenue += row.totalPrice;
    entry.orders.push(row.quantity);
  }

  return monthData;
}

function getSortedMonths(monthData) {
  return Object.keys(monthData).sort();
}

function getSortedItems(monthData) {
  const itemSet = {};
  for (const month of Object.keys(monthData)) {
    for (const sku of Object.keys(monthData[month])) {
      itemSet[sku] = true;
    }
  }
  return Object.keys(itemSet).sort();
}

// ---------------------------------------------------------------------------
// Report calculations
// ---------------------------------------------------------------------------

function calcTotalSales(validRows) {
  let total = 0;
  for (const row of validRows) {
    total += row.totalPrice;
  }
  return total;
}

function calcMonthWiseTotals(validRows) {
  const totals = {};
  for (const row of validRows) {
    const month = getMonthKey(row.date);
    totals[month] = (totals[month] || 0) + row.totalPrice;
  }
  return totals;
}

function calcMostPopularPerMonth(monthData) {
  const result = {};

  for (const month of getSortedMonths(monthData)) {
    const items = monthData[month];
    let bestItem = null;
    let bestQty = -1;

    for (const sku of Object.keys(items)) {
      if (items[sku].totalQuantity > bestQty) {
        bestQty = items[sku].totalQuantity;
        bestItem = sku;
      }
    }

    const orders = items[bestItem].orders;
    let min = orders[0];
    let max = orders[0];
    let sum = 0;

    for (const qty of orders) {
      if (qty < min) min = qty;
      if (qty > max) max = qty;
      sum += qty;
    }

    result[month] = {
      item: bestItem,
      totalQuantity: bestQty,
      minOrders: min,
      maxOrders: max,
      avgOrders: sum / orders.length
    };
  }

  return result;
}

function calcTopRevenuePerMonth(monthData) {
  const result = {};

  for (const month of getSortedMonths(monthData)) {
    const items = monthData[month];
    let bestItem = null;
    let bestRevenue = -1;

    for (const sku of Object.keys(items)) {
      if (items[sku].totalRevenue > bestRevenue) {
        bestRevenue = items[sku].totalRevenue;
        bestItem = sku;
      }
    }

    result[month] = { item: bestItem, revenue: bestRevenue };
  }

  return result;
}

function calcMonthToMonthGrowth(monthData) {
  const months = getSortedMonths(monthData);
  const allItems = getSortedItems(monthData);
  const result = {};

  for (const item of allItems) {
    result[item] = [];

    for (let i = 1; i < months.length; i++) {
      const prevMonth = months[i - 1];
      const currMonth = months[i];
      const prevEntry = monthData[prevMonth] && monthData[prevMonth][item];
      const currEntry = monthData[currMonth] && monthData[currMonth][item];
      const prevRevenue = prevEntry ? prevEntry.totalRevenue : 0;
      const currRevenue = currEntry ? currEntry.totalRevenue : 0;

      let growth;
      if (prevRevenue === 0) {
        growth = 'N/A';
      } else {
        growth = ((currRevenue - prevRevenue) / prevRevenue) * 100;
      }

      result[item].push({ from: prevMonth, to: currMonth, growth });
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Output formatting
// ---------------------------------------------------------------------------

function printValidationIssues(invalidRows) {
  console.log('===== DATA VALIDATION ISSUES =====');
  if (invalidRows.length === 0) {
    console.log('No issues found.');
  } else {
    for (const entry of invalidRows) {
      console.log(`Row ${entry.rowNumber}: ${entry.raw}`);
      for (const reason of entry.reasons) {
        console.log(`  - ${reason}`);
      }
    }
  }
  console.log();
}

function printTotalSales(validRows) {
  console.log('===== TOTAL SALES =====');
  console.log(`Total Sales: ${calcTotalSales(validRows)}`);
  console.log();
}

function printMonthWiseTotals(validRows) {
  console.log('===== MONTH-WISE TOTALS =====');
  const totals = calcMonthWiseTotals(validRows);
  const months = Object.keys(totals).sort();
  for (const month of months) {
    console.log(`${month}: ${totals[month]}`);
  }
  console.log();
}

function printMostPopularPerMonth(monthData) {
  console.log('===== MOST POPULAR ITEM PER MONTH =====');
  const popular = calcMostPopularPerMonth(monthData);
  for (const month of Object.keys(popular).sort()) {
    const p = popular[month];
    console.log(`${month}: ${p.item} (Qty: ${p.totalQuantity})`);
    console.log(`  Min Orders: ${p.minOrders} | Max Orders: ${p.maxOrders} | Avg Orders: ${p.avgOrders.toFixed(2)}`);
  }
  console.log();
}

function printTopRevenuePerMonth(monthData) {
  console.log('===== TOP REVENUE ITEM PER MONTH =====');
  const topRev = calcTopRevenuePerMonth(monthData);
  for (const month of Object.keys(topRev).sort()) {
    console.log(`${month}: ${topRev[month].item} (Revenue: ${topRev[month].revenue})`);
  }
  console.log();
}

function printMonthToMonthGrowth(monthData) {
  console.log('===== MONTH-TO-MONTH GROWTH PER ITEM =====');
  const growth = calcMonthToMonthGrowth(monthData);
  const items = Object.keys(growth).sort();

  for (const item of items) {
    console.log(`Item: ${item}`);
    for (const g of growth[item]) {
      const val = g.growth === 'N/A' ? 'N/A' : `${g.growth.toFixed(2)}%`;
      console.log(`  ${g.from} -> ${g.to}: ${val}`);
    }
  }
  console.log();
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const rows = parseData(data);
  const { validRows, invalidRows } = validateRows(rows);
  const monthData = buildMonthItemData(validRows);

  printValidationIssues(invalidRows);
  printTotalSales(validRows);
  printMonthWiseTotals(validRows);
  printMostPopularPerMonth(monthData);
  printTopRevenuePerMonth(monthData);
  printMonthToMonthGrowth(monthData);
}

main();

/*
============================= WRITTEN ANSWERS ================================

1) What was the most complex part of the assignment for you personally and why?

   The most complex part was the month-to-month growth calculation. It requires
   correlating data across two dimensions — months and items — and carefully
   handling edge cases where an item appears in one month but not the adjacent
   one. Dividing by zero when an item has no revenue in the previous month was
   the trickiest decision: I chose to display "N/A" because manufacturing an
   infinite or arbitrary percentage would be misleading. Building the shared
   month-item aggregation structure up front simplified this, but reasoning
   about every combination of presence/absence across months still demanded
   careful thought.

2) Describe a bug you expect to hit while implementing this and how you would
   debug it.

   A likely bug is the floating-point price mismatch check. If unit prices or
   quantities were decimals (e.g. 10.1 * 3 = 30.299999... instead of 30.3),
   a strict !== comparison would incorrectly flag valid rows as inconsistent.
   In this dataset all values are integers so it does not surface, but I would
   debug it by logging both sides of the comparison for every flagged row,
   noticing the tiny epsilon difference, and switching to a tolerance-based
   comparison like Math.abs(a - b) < 0.001. Another bug I anticipated was
   off-by-one row numbering caused by blank lines in the CSV — I verified the
   row numbers by cross-referencing the raw CSV string with the output.

3) Does your solution handle larger data sets without any performance
   implications?

   The solution is O(n) overall: every step (parsing, validation, aggregation,
   each report) iterates through the rows a constant number of times. Memory
   usage is also O(n) for storing parsed rows plus O(m * k) for the month-item
   aggregation map (m = months, k = unique items), which in practice is much
   smaller than n. For very large datasets (millions of rows) this will still
   run in linear time. The only concern at extreme scale would be memory — the
   entire CSV string lives in a variable — but that is a constraint of the
   assignment. In production I would stream the file line-by-line using
   Node.js readline/streams to keep memory constant regardless of file size.

==============================================================================
*/
