from codewatch.templates import grimoire_en, template_en


class Localization:
    templates = {
        "en": template_en,
    }

    grimoires = {
        "en": grimoire_en,
    }

    def __init__(self, language="en"):
        # Default all languages to 'en' to avoid breaking callers or tests
        self._language = "en"

    @property
    def language(self):
        return self._language

    @property
    def template(self):
        return self.templates[self.language]

    @property
    def grimoire(self):
        return self.grimoires[self.language]
