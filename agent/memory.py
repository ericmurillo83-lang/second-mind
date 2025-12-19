"""
Second Mind – Memory

A tiny, simple memory system:
- short_term: what happened recently
- long_term: important notes you choose to keep

No database yet. Just clean structure.
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import List, Dict, Any


@dataclass
class MemoryItem:
    ts: str
    kind: str
    content: str
    meta: Dict[str, Any] = field(default_factory=dict)


class Memory:
    def __init__(self, short_term_limit: int = 25):
        self.short_term_limit = short_term_limit
        self.short_term: List[MemoryItem] = []
        self.long_term: List[MemoryItem] = []

    def _now(self) -> str:
        return datetime.utcnow().isoformat() + "Z"

    def remember(self, content: str, kind: str = "note", important: bool = False, **meta):
        item = MemoryItem(
            ts=self._now(),
            kind=kind,
            content=content,
            meta=dict(meta),
        )

        self.short_term.append(item)
        if len(self.short_term) > self.short_term_limit:
            self.short_term = self.short_term[-self.short_term_limit :]

        if important:
            self.long_term.append(item)

    def recall_recent(self, kind: str | None = None, limit: int = 10):
        items = self.short_term
        if kind:
            items = [i for i in items if i.kind == kind]
        return items[-limit:]

    def recall_important(self, kind: str | None = None, limit: int = 20):
        items = self.long_term
        if kind:
            items = [i for i in items if i.kind == kind]
        return items[-limit:]
