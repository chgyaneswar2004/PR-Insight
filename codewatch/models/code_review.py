from pydantic import BaseModel

from codewatch.models.change_file import ChangeFile


class CodeReview(BaseModel):
    file: ChangeFile
    review: str
