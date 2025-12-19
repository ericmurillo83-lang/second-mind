"""
Second Mind – Core Agent

This module defines how the agent thinks before it acts.
No tools, no automation yet. Just reasoning.
"""

class SecondMind:
    def __init__(self):
        self.name = "Second Mind"
        self.state = {}

    def think(self, goal: str) -> str:
        """
        Given a goal, decide what the next step should be.
        """
        return f"I am thinking about: {goal}"
