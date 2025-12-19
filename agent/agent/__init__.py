"""
Second Mind – Core Agent

Thinks about goals, stores thoughts in memory, and can recall context.
"""

from agent.memory import Memory


class SecondMind:
    def __init__(self):
        self.name = "Second Mind"
        self.memory = Memory()

    def think(self, goal: str) -> str:
        thought = f"Considering goal: {goal}"
        self.memory.remember(content=thought, kind="thought")
        return thought

    def recall_thoughts(self, limit: int = 5) -> list[str]:
        items = self.memory.recall_recent(kind="thought", limit=limit)
        return [i.content for i in items]
