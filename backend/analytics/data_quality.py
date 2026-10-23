"""
RetailIQ — Data Quality & Audit Module (Python)
Audits row health, missing rates, duplicate records, and computes IQR outlier fences.
"""

from typing import List, Dict, Any

def calculate_iqr_fences(values: List[float]) -> Dict[str, float]:
    """Calculates Tukey's 1.5x IQR fences for outlier identification."""
    if not values:
        return {"q1": 0.0, "q3": 0.0, "iqr": 0.0, "lower": 0.0, "upper": 0.0}
    sorted_vals = sorted(values)
    n = len(sorted_vals)
    q1 = sorted_vals[int(n * 0.25)]
    q3 = sorted_vals[int(n * 0.75)]
    iqr = q3 - q1
    return {
        "q1": q1,
        "q3": q3,
        "iqr": iqr,
        "lower": q1 - 1.5 * iqr,
        "upper": q3 + 1.5 * iqr
    }
