from abc import ABC, abstractmethod

from codewatch.actors.base import Actor


class Reporter(Actor, ABC):
    @abstractmethod
    def report(self) -> str:
        """Generate report content text."""
