# config.py

from langchain_core.output_parsers import StrOutputParser
# from langchain_core.prompts import ChatPromptTemplate

from src.prompts.prompt_loader import PromptLoader

PROMPTS_DIR = "src/prompts/"


# Define the prompt template
# prompt = ChatPromptTemplate.from_template("tell me a short joke about {topic}")

# Define the output parser
output_parser = StrOutputParser()


class ChainFactory:
    def __init__(self, default_model=None):
        self.chains = {}
        if default_model is not None:
            self.default_model = default_model

    def create_chain(self, name, prompt, model=None, output_parser=None):

        prompt_type, prompt_name = prompt.split("/")
        prompt_runnable = PromptLoader.create_prompt(PROMPTS_DIR, prompt_type, prompt_name)
        if model is None:
            model = self.default_model
        if output_parser is None:
            chain = prompt_runnable | model
        else:
            chain = prompt_runnable | model | output_parser()
        self.chains[name] = chain
        return chain

    def get_chain(self, name):
        return self.chains.get(name)

    def set_model(self, name, new_model):
        if name in self.chains:
            self.chains[name].middle = new_model
