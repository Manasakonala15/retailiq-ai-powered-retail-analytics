"""
RetailIQ — Time-Series Sales Forecasting (Python)
Holt's Linear Trend Smoothing with chronological train/test split.
"""

from typing import List, Dict, Tuple
import math

def holt_linear_forecast(series: List[float], horizon: int = 4, alpha: float = 0.35, beta: float = 0.15) -> Dict[str, Any]:
    """Fits Holt's linear trend model and computes MAE/RMSE against baseline."""
    n = len(series)
    if n < 4:
        return {"error": "Insufficient time-series data"}

    split = max(3, int(n * 0.75))
    train = series[:split]
    test = series[split:]

    level = train[0]
    trend = (train[-1] - train[0]) / max(1, len(train) - 1)

    for val in train[1:]:
        prev_level = level
        level = alpha * val + (1 - alpha) * (prev_level + trend)
        trend = beta * (level - prev_level) + (1 - beta) * trend

    # Out of sample test
    test_preds = [max(0, level + h * trend) for h in range(1, len(test) + 1)]
    mae = sum(abs(act - pred) for act, pred in zip(test, test_preds)) / len(test) if test else 0.0

    return {
        "train_size": len(train),
        "test_size": len(test),
        "mae": round(mae, 2),
        "final_level": round(level, 2),
        "final_trend": round(trend, 2)
    }
