# TODO: Validatate the keys read form the json files in the prompts are actually
# valid keys for FewShotPromptTemplate or FewShotPromptTemplate class

import os
import json
import importlib
from langchain.output_parsers import PydanticOutputParser
from langchain.prompts import PromptTemplate, FewShotPromptTemplate
from langchain_core.prompts import ChatPromptTemplate


class PromptLoader:
    def __init__(self, base_dir="prompts"):
        self.base_dir = base_dir

    def _load_prompt_data(self, prompt_type, prompt_name):
        prompt_def_file_path = os.path.join(self.base_dir, prompt_type, f"{prompt_name}.json")
        with open(prompt_def_file_path, 'r') as file:
            prompt_data = json.load(file)
        return prompt_data

    def _generate_few_shot_prompt(self, prompt_data):
        kwargs = {

            "prefix": prompt_data['prefix'],

            "input_variables": prompt_data['input_variables'],
            "partial_variables": prompt_data.get('partial_variables', {}),
            "examples": prompt_data.get('examples_info', {}).get("examples_data", []),
            "example_prompt": prompt_data.get('examples_info', {}).get("examples_template", ""),
            "prefix": prompt_data.get('prefix', ""),
            "suffix": prompt_data.get('suffix', ""),
            "example_separator": prompt_data.get('examples_info', {}).get('example_separator', "\n")
        }

        if "format_instructions" in kwargs["partial_variables"]:
            parser_module_name = prompt_data['parser']
            module = importlib.import_module(f"src.prompts.parsers.{parser_module_name}")
            parser_cls_name = "".join(" ".join(parser_module_name.split("_")).title().split())
            ParserCls = getattr(module, parser_cls_name)
            output_parser = PydanticOutputParser(pydantic_object=ParserCls)
            kwargs["partial_variables"]["format_instructions"] = output_parser.get_format_instructions()
        examples = prompt_data.get('examples_info', {}).get("examples_data", [])
        example_prompt = prompt_data.get('examples_info', {}).get("examples_template", "")
        examples_input_variables = prompt_data.get('examples_info', {}).get("examples_input_variables", [])
        if examples and example_prompt:
            examples_prompt = PromptTemplate(
                input_variables=examples_input_variables,
                template=example_prompt,
            )
            kwargs['examples'] = examples
            kwargs['example_prompt'] = examples_prompt

        return FewShotPromptTemplate(**kwargs)

    def _generate_zero_shot_prompt(self, prompt_data):
        # Assuming zero-shot prompts require fewer parameters, adjust accordingly
        if prompt_data.get('type') == "ChatPromptTemplate":
            return ChatPromptTemplate.from_messages(
                messages=[tuple(x) for x in prompt_data['messages']]
            )
        else:
            return PromptTemplate(
                input_variables=prompt_data['input_variables'],
                template=prompt_data.get('prefix', "") + "\n" + prompt_data.get('suffix', ""),
            )


    @staticmethod
    def create_prompt(base_dir, prompt_type, prompt_name):
        loader = PromptLoader(base_dir)
        data = loader._load_prompt_data(prompt_type, prompt_name)
        if prompt_type == "few_shot":
            return loader._generate_few_shot_prompt(data)
        elif prompt_type == "zero_shot":
            return loader._generate_zero_shot_prompt(data)
        else:
            raise ValueError(f"Invalid prompt type: {prompt_type}")


# Usage example
if __name__ == "__main__":
    example_prompt = PromptLoader.create_prompt("src/prompts/", "few_shot", "test")
    print(example_prompt.format(greeting="Hey, my name is Mike"))
    output_end = ': Yo, my name is Jason\n```json'
    example_prompt.format(greeting="Yo, my name is Jason")[-len(output_end):] == ": Yo, my name is Jason\n```json"
