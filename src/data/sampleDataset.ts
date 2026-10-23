/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Transaction } from '../types/retail';

export const SAMPLE_PRODUCTS = [
  { id: 'PROD-101', name: 'UltraHD 4K Monitor 27"', category: 'Electronics', unitPrice: 389.99, unitCost: 260.00 },
  { id: 'PROD-102', name: 'Wireless Mechanical Keyboard', category: 'Electronics', unitPrice: 129.50, unitCost: 72.00 },
  { id: 'PROD-103', name: 'Noise-Cancelling Headphones', category: 'Electronics', unitPrice: 249.00, unitCost: 155.00 },
  { id: 'PROD-104', name: 'USB-C Dual Display Dock', category: 'Electronics', unitPrice: 169.00, unitCost: 110.00 },
  { id: 'PROD-105', name: 'Smart LED Desk Lamp', category: 'Electronics', unitPrice: 59.99, unitCost: 32.00 },
  { id: 'PROD-106', name: 'Ergonomic Mesh Task Chair', category: 'Office Supplies', unitPrice: 320.00, unitCost: 210.00 },
  { id: 'PROD-107', name: 'Electric Standing Desk 55"', category: 'Office Supplies', unitPrice: 480.00, unitCost: 350.00 },
  { id: 'PROD-108', name: 'Recycled Heavy Copier Paper (5-Ream)', category: 'Office Supplies', unitPrice: 38.50, unitCost: 24.00 },
  { id: 'PROD-109', name: 'Executive Gel Pen Pack (12ct)', category: 'Office Supplies', unitPrice: 18.00, unitCost: 7.50 },
  { id: 'PROD-110', name: 'Acoustic Desk Privacy Panel', category: 'Office Supplies', unitPrice: 85.00, unitCost: 65.00 },
  { id: 'PROD-111', name: 'Merino Wool Quarter-Zip Pullover', category: 'Apparel', unitPrice: 110.00, unitCost: 45.00 },
  { id: 'PROD-112', name: 'Water-Resistant All-Weather Parka', category: 'Apparel', unitPrice: 220.00, unitCost: 115.00 },
  { id: 'PROD-113', name: 'Performance Chino Trousers', category: 'Apparel', unitPrice: 78.00, unitCost: 30.00 },
  { id: 'PROD-114', name: 'Breathable Running Athletic Shoes', category: 'Apparel', unitPrice: 135.00, unitCost: 55.00 },
  { id: 'PROD-115', name: 'Organic Cotton Crewneck Tee 3-Pack', category: 'Apparel', unitPrice: 45.00, unitCost: 18.00 },
  { id: 'PROD-116', name: 'Precision Burr Coffee Grinder', category: 'Home & Kitchen', unitPrice: 149.00, unitCost: 95.00 },
  { id: 'PROD-117', name: 'Cast Iron Dutch Oven 6-Quart', category: 'Home & Kitchen', unitPrice: 89.99, unitCost: 52.00 },
  { id: 'PROD-118', name: 'Smart Air Purifier HEPA 400', category: 'Home & Kitchen', unitPrice: 199.00, unitCost: 130.00 },
  { id: 'PROD-119', name: 'Stainless Steel Chef Knife 8"', category: 'Home & Kitchen', unitPrice: 65.00, unitCost: 28.00 },
  { id: 'PROD-120', name: 'Ceramic Pour-Over Dripper Set', category: 'Home & Kitchen', unitPrice: 34.00, unitCost: 14.00 },
  { id: 'PROD-121', name: 'Sonic Electric Toothbrush Elite', category: 'Health & Beauty', unitPrice: 95.00, unitCost: 42.00 },
  { id: 'PROD-122', name: 'Deep Tissue Percussion Massager', category: 'Health & Beauty', unitPrice: 119.00, unitCost: 68.00 },
  { id: 'PROD-123', name: 'Organic Cold-Pressed Skincare Serum', category: 'Health & Beauty', unitPrice: 48.00, unitCost: 15.00 },
  { id: 'PROD-124', name: 'Clearance Discount USB Cable', category: 'Electronics', unitPrice: 8.99, unitCost: 12.50 }, // Intentionally negative margin
  { id: 'PROD-125', name: 'Promotional Branded Tote Bag', category: 'Apparel', unitPrice: 4.50, unitCost: 6.20 }, // Intentionally negative margin
];

export const REGIONS_STATES: Record<string, string[]> = {
  East: ['New York', 'Massachusetts', 'Pennsylvania', 'New Jersey'],
  West: ['California', 'Washington', 'Oregon', 'Colorado'],
  Central: ['Illinois', 'Texas', 'Ohio', 'Michigan'],
  South: ['Florida', 'Georgia', 'North Carolina', 'Virginia'],
};

export const PAYMENT_METHODS = ['Credit Card', 'Debit Card', 'PayPal', 'Corporate Invoice', 'Apple Pay'];

/**
 * Seeded pseudo-random number generator for reproducible synthetic dataset
 */
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

export function generateSyntheticTransactions(recordCount = 1250): Transaction[] {
  const rand = seededRandom(42819);
  const transactions: Transaction[] = [];

  const customerCount = 195;
  const customers = Array.from({ length: customerCount }, (_, i) => `CUST-${(1001 + i).toString()}`);
  const regions = Object.keys(REGIONS_STATES);

  // Generate 580 order groups across a 365-day period (2025 calendar year)
  const orderCount = Math.floor(recordCount / 2.1);
  const startDate = new Date('2025-01-01T00:00:00Z').getTime();
  const dayMs = 86400000;

  let currentId = 1;

  for (let o = 1; o <= orderCount && transactions.length < recordCount; o++) {
    const orderId = `ORD-2025-${(10000 + o).toString()}`;
    // Skew dates slightly toward Q4 (holiday seasonal retail lift)
    const dayProgress = Math.pow(rand(), 0.85) * 364;
    const orderTimestamp = startDate + Math.floor(dayProgress) * dayMs;
    const dateStr = new Date(orderTimestamp).toISOString().split('T')[0];

    // Pick customer (some repeat frequently, Pareto distribution)
    const custIdx = Math.floor(Math.pow(rand(), 1.7) * customers.length);
    const customerId = customers[custIdx];

    // Pick region & state
    const region = regions[Math.floor(rand() * regions.length)];
    const states = REGIONS_STATES[region];
    const state = states[Math.floor(rand() * states.length)];
    const paymentMethod = PAYMENT_METHODS[Math.floor(rand() * PAYMENT_METHODS.length)];

    // Number of line items in this order (1 to 4)
    const itemsInOrder = Math.min(recordCount - transactions.length, Math.floor(rand() * 3.5) + 1);

    for (let item = 0; item < itemsInOrder; item++) {
      const prod = SAMPLE_PRODUCTS[Math.floor(rand() * SAMPLE_PRODUCTS.length)];
      let quantity = Math.floor(rand() * 4) + 1;
      
      // Discount between 0% and 25%
      let discount = rand() > 0.65 ? Math.round(rand() * 20) / 100 : 0;
      
      let unitPrice = prod.unitPrice;
      let sales = Math.round(quantity * unitPrice * (1 - discount) * 100) / 100;
      let cost = Math.round(quantity * prod.unitCost * 100) / 100;
      let profit = Math.round((sales - cost) * 100) / 100;

      // Seed intentional realistic anomalies for validation testing (as required by section 4 & 18):
      let hasDataIssue = false;
      const issueTypes: string[] = [];

      // A small number of negative quantities (return/credit note)
      if (currentId === 48 || currentId === 312) {
        quantity = -quantity;
        sales = -Math.abs(sales);
        cost = -Math.abs(cost);
        profit = -Math.abs(profit);
        hasDataIssue = true;
        issueTypes.push('negative_quantity');
      }

      // Outlier quantity or sales (bulk B2B order)
      let isOutlier = false;
      if (currentId === 115 || currentId === 740) {
        quantity = 45; // statistical outlier in quantity
        sales = Math.round(quantity * unitPrice * 0.85 * 100) / 100;
        cost = Math.round(quantity * prod.unitCost * 100) / 100;
        profit = Math.round((sales - cost) * 100) / 100;
        isOutlier = true;
      }

      transactions.push({
        id: `TX-${currentId}`,
        orderId,
        orderDate: dateStr,
        customerId,
        productId: prod.id,
        productName: prod.name,
        category: prod.category,
        quantity,
        unitPrice,
        sales,
        cost,
        profit,
        region,
        state,
        paymentMethod,
        discount,
        isOutlier,
        hasDataIssue,
        issueTypes,
      });

      currentId++;
    }
  }

  // Inject 4 duplicate records to test duplicate detection
  if (transactions.length > 50) {
    const dup1 = { ...transactions[12], id: `TX-${currentId++}` };
    const dup2 = { ...transactions[28], id: `TX-${currentId++}` };
    const dup3 = { ...transactions[85], id: `TX-${currentId++}` };
    const dup4 = { ...transactions[140], id: `TX-${currentId++}` };
    transactions.splice(15, 0, dup1);
    transactions.splice(35, 0, dup2);
    transactions.splice(95, 0, dup3);
    transactions.splice(155, 0, dup4);
  }

  return transactions;
}

export function transactionsToCSV(transactions: Transaction[]): string {
  const headers = [
    'Order ID',
    'Order Date',
    'Customer ID',
    'Product ID',
    'Product Name',
    'Category',
    'Quantity',
    'Unit Price',
    'Sales',
    'Cost',
    'Profit',
    'Region',
    'State',
    'Payment Method',
    'Discount'
  ];

  const rows = transactions.map((t) => [
    t.orderId,
    t.orderDate,
    t.customerId,
    t.productId,
    `"${t.productName.replace(/"/g, '""')}"`,
    t.category,
    t.quantity,
    t.unitPrice.toFixed(2),
    t.sales.toFixed(2),
    t.cost.toFixed(2),
    t.profit.toFixed(2),
    t.region,
    t.state || '',
    t.paymentMethod || '',
    (t.discount || 0).toFixed(2),
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}
