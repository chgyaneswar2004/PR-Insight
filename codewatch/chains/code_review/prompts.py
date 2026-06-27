# TODO: Localization
from langchain_core.prompts import PromptTemplate

from codewatch.templates import grimoire_en

CODE_REVIEW_PROMPT = PromptTemplate(
    template=grimoire_en.CODE_SUGGESTION,
    input_variables=["name", "language", "content"],
)
