"""
RetailIQ — Dataset Generator
Generates reproducible retail transactions CSV for the Python EDA notebook and user downloads.
"""

import csv
import os
import random
from datetime import datetime, timedelta

PRODUCTS = [
    {"id": "PROD-101", "name": 'UltraHD 4K Monitor 27"', "category": "Electronics", "unit_price": 389.99, "unit_cost": 260.00},
    {"id": "PROD-102", "name": "Wireless Mechanical Keyboard", "category": "Electronics", "unit_price": 129.50, "unit_cost": 72.00},
    {"id": "PROD-103", "name": "Noise-Cancelling Headphones", "category": "Electronics", "unit_price": 249.00, "unit_cost": 155.00},
    {"id": "PROD-104", "name": "USB-C Dual Display Dock", "category": "Electronics", "unit_price": 169.00, "unit_cost": 110.00},
    {"id": "PROD-105", "name": "Smart LED Desk Lamp", "category": "Electronics", "unit_price": 59.99, "unit_cost": 32.00},
    {"id": "PROD-106", "name": "Ergonomic Mesh Task Chair", "category": "Office Supplies", "unit_price": 320.00, "unit_cost": 210.00},
    {"id": "PROD-107", "name": 'Electric Standing Desk 55"', "category": "Office Supplies", "unit_price": 480.00, "unit_cost": 350.00},
    {"id": "PROD-108", "name": "Recycled Heavy Copier Paper (5-Ream)", "category": "Office Supplies", "unit_price": 38.50, "unit_cost": 24.00},
    {"id": "PROD-109", "name": "Executive Gel Pen Pack (12ct)", "category": "Office Supplies", "unit_price": 18.00, "unit_cost": 7.50},
    {"id": "PROD-110", "name": "Acoustic Desk Privacy Panel", "category": "Office Supplies", "unit_price": 85.00, "unit_cost": 65.00},
    {"id": "PROD-111", "name": "Merino Wool Quarter-Zip Pullover", "category": "Apparel", "unit_price": 110.00, "unit_cost": 45.00},
    {"id": "PROD-112", "name": "Water-Resistant All-Weather Parka", "category": "Apparel", "unit_price": 220.00, "unit_cost": 115.00},
    {"id": "PROD-113", "name": "Performance Chino Trousers", "category": "Apparel", "unit_price": 78.00, "unit_cost": 30.00},
    {"id": "PROD-114", "name": "Breathable Running Athletic Shoes", "category": "Apparel", "unit_price": 135.00, "unit_cost": 55.00},
    {"id": "PROD-115", "name": "Organic Cotton Crewneck Tee 3-Pack", "category": "Apparel", "unit_price": 45.00, "unit_cost": 18.00},
    {"id": "PROD-116", "name": "Precision Burr Coffee Grinder", "category": "Home & Kitchen", "unit_price": 149.00, "unit_cost": 95.00},
    {"id": "PROD-117", "name": "Cast Iron Dutch Oven 6-Quart", "category": "Home & Kitchen", "unit_price": 89.99, "unit_cost": 52.00},
    {"id": "PROD-118", "name": "Smart Air Purifier HEPA 400", "category": "Home & Kitchen", "unit_price": 199.00, "unit_cost": 130.00},
    {"id": "PROD-119", "name": 'Stainless Steel Chef Knife 8"', "category": "Home & Kitchen", "unit_price": 65.00, "unit_cost": 28.00},
    {"id": "PROD-120", "name": "Ceramic Pour-Over Dripper Set", "category": "Home & Kitchen", "unit_price": 34.00, "unit_cost": 14.00},
    {"id": "PROD-121", "name": "Sonic Electric Toothbrush Elite", "category": "Health & Beauty", "unit_price": 95.00, "unit_cost": 42.00},
    {"id": "PROD-122", "name": "Deep Tissue Percussion Massager", "category": "Health & Beauty", "unit_price": 119.00, "unit_cost": 68.00},
    {"id": "PROD-123", "name": "Organic Cold-Pressed Skincare Serum", "category": "Health & Beauty", "unit_price": 48.00, "unit_cost": 15.00},
    {"id": "PROD-124", "name": "Clearance Discount USB Cable", "category": "Electronics", "unit_price": 8.99, "unit_cost": 12.50},
    {"id": "PROD-125", "name": "Promotional Branded Tote Bag", "category": "Apparel", "unit_price": 4.50, "unit_cost": 6.20},
]

REGIONS = {
    "East": ["New York", "Massachusetts", "Pennsylvania", "New Jersey"],
    "West": ["California", "Washington", "Oregon", "Colorado"],
    "Central": ["Illinois", "Texas", "Ohio", "Michigan"],
    "South": ["Florida", "Georgia", "North Carolina", "Virginia"],
}

PAYMENTS = ["Credit Card", "Debit Card", "PayPal", "Corporate Invoice", "Apple Pay"]

def generate_csv(output_paths, count=1250, seed=42819):
    random.seed(seed)
    customers = [f"CUST-{1001 + i}" for i in range(195)]
    start_date = datetime(2025, 1, 1)

    fieldnames = [
        "id", "order_id", "order_date", "customer_id", "product_id",
        "product_name", "category", "quantity", "unit_price", "sales",
        "cost", "profit", "region", "state", "payment_method", "discount"
    ]

    rows = []
    order_idx = 1
    current_id = 1

    while len(rows) < count:
        order_id = f"ORD-2025-{10000 + order_idx}"
        order_idx += 1
        
        # Holiday seasonality skew toward Q4
        progress = (random.random() ** 0.85) * 364
        order_date = (start_date + timedelta(days=int(progress))).strftime("%Y-%m-%d")

        # Customer Pareto distribution
        cust_idx = int((random.random() ** 1.7) * len(customers))
        customer_id = customers[min(cust_idx, len(customers) - 1)]

        region = random.choice(list(REGIONS.keys()))
        state = random.choice(REGIONS[region])
        payment_method = random.choice(PAYMENTS)

        items_in_order = min(count - len(rows), random.randint(1, 3))
        for _ in range(items_in_order):
            prod = random.choice(PRODUCTS)
            quantity = random.randint(1, 4)
            discount = round(random.uniform(0.05, 0.20), 2) if random.random() > 0.65 else 0.0

            sales = round(quantity * prod["unit_price"] * (1 - discount), 2)
            cost = round(quantity * prod["unit_cost"], 2)
            profit = round(sales - cost, 2)

            # Intentional returns
            if current_id in (48, 312):
                quantity = -quantity
                sales = -abs(sales)
                cost = -abs(cost)
                profit = -abs(profit)

            # Intentional bulk outlier
            if current_id in (115, 740):
                quantity = 45
                sales = round(quantity * prod["unit_price"] * 0.85, 2)
                cost = round(quantity * prod["unit_cost"], 2)
                profit = round(sales - cost, 2)

            rows.append({
                "id": f"TX-{current_id}",
                "order_id": order_id,
                "order_date": order_date,
                "customer_id": customer_id,
                "product_id": prod["id"],
                "product_name": prod["name"],
                "category": prod["category"],
                "quantity": quantity,
                "unit_price": prod["unit_price"],
                "sales": sales,
                "cost": cost,
                "profit": profit,
                "region": region,
                "state": state,
                "payment_method": payment_method,
                "discount": discount,
            })
            current_id += 1
            if len(rows) >= count:
                break

    for p in output_paths:
        os.makedirs(os.path.dirname(p), exist_ok=True)
        with open(p, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(rows)
        print(f"Generated {len(rows)} records at: {p}")

if __name__ == "__main__":
    generate_csv([
        "backend/data/sample_retail_transactions.csv",
        "public/sample_retail_transactions.csv"
    ])
