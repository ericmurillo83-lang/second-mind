"""Descriptive glucose statistics, matching mobile/src/domain/glucose.ts computeStats.

SAFETY: counts and averages relative to the user's own target range. No predictions, alerts or
recommendations.
"""

from collections.abc import Sequence
from math import floor


def round_percentages(parts: Sequence[int], total: int) -> list[int]:
    """Largest-remainder rounding so whole-number percentages always total 100."""
    if total <= 0:
        return [0 for _ in parts]
    raw = [p / total * 100 for p in parts]
    floored = [floor(v) for v in raw]
    remainder = 100 - sum(floored)
    order = sorted(range(len(raw)), key=lambda i: raw[i] - floor(raw[i]), reverse=True)
    for i in order:
        if remainder <= 0:
            break
        floored[i] += 1
        remainder -= 1
    return floored


def compute_stats(values: Sequence[float], low: float, high: float) -> dict[str, float | int | None]:
    count = len(values)
    below = sum(1 for v in values if v < low)
    above = sum(1 for v in values if v > high)
    in_range = count - below - above
    pct_below, pct_in, pct_above = round_percentages([below, in_range, above], count)
    return {
        "count": count,
        "average_mgdl": sum(values) / count if count else None,
        "min_mgdl": min(values) if count else None,
        "max_mgdl": max(values) if count else None,
        "below": below,
        "in_range": in_range,
        "above": above,
        "pct_below": pct_below,
        "pct_in": pct_in,
        "pct_above": pct_above,
    }
