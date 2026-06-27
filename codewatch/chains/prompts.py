from langchain_core.prompts import PromptTemplate

from codewatch.templates import grimoire_en

TRANSLATE_PROMPT = PromptTemplate(
    template=grimoire_en.TRANSLATE_PR_REVIEW,
    input_variables=["language", "description", "content"],
)
