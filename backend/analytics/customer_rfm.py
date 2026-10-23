"""
RetailIQ — Customer RFM Segmentation Engine (Python)
Calculates Recency, Frequency, and Monetary scores and assigns transparent customer segments.
"""

from datetime import datetime
from typing import Dict, List, Any

def classify_rfm(r_score: int, f_score: int, m_score: int) -> str:
    """Assigns transparent marketing segment based on R, F, M quintiles."""
    if r_score >= 4 and f_score >= 4 and m_score >= 4:
        return "High-Value Customers"
    if f_score >= 4 and r_score >= 3:
        return "Loyal Customers"
    if r_score >= 4 and (f_score >= 2 or m_score >= 3):
        return "Potential Loyalists"
    if r_score >= 4 and f_score <= 2:
        return "Recent Customers"
    if r_score == 3 and f_score >= 2:
        return "Needing Attention"
    return "Inactive / At-Risk"

def compute_quintile(val: float, boundaries: List[float], inverse: bool = False) -> int:
    score = 1
    for i, b in enumerate(boundaries, 1):
        if val > b:
            score = i + 1
    score = min(5, max(1, score))
    return 6 - score if inverse else score
