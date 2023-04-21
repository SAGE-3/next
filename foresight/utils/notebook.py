import ast
import json


class Notebook:
    def __init__(self, notebook: dict, notebook_path: str = None) -> None:
        if notebook_path is not None:
            self.notebook = self.open_notebook_from_file(notebook_path)
        else:
            self.notebook = notebook
        self.dependencies = None
        self.total_dependencies = None

    def open_notebook_from_file(self, notebook_path):
        with open(notebook_path, "r") as f:
            notebook = json.load(f)
        return notebook

    def get_cell_dependencies(self, cell_code):
        """
        Given a string of code for a Jupyter notebook cell,
        return a list of all the dependencies (i.e. variable names
        and function names) that the cell uses.
        """
        # Parse the code into an AST
        cell_ast = ast.parse(cell_code)

        # Traverse the AST to find all the dependencies
        dependencies = set()
        for node in ast.walk(cell_ast):
            if isinstance(node, ast.Name) and isinstance(node.ctx, ast.Load):
                # Add the name of the variable or function to the list of dependencies
                dependencies.add(node.id)

        # Return the list of dependencies
        return list(dependencies), len(dependencies)

    def get_notebook_dependencies(self):
        """
        Given a Jupyter notebook as a dictionary,
        return a dictionary mapping each cell to a list of its dependencies.
        """
        dependencies = {}
        total_dependencies = 0
        for cell in self.notebook["cells"]:
            if cell["cell_type"] == "code":
                cell_dependencies, num_dependencies = self.get_cell_dependencies(
                    "".join(cell["source"])
                )
                print(num_dependencies)
                dependencies["".join(cell["source"])] = cell_dependencies
                total_dependencies += num_dependencies
        return dependencies, total_dependencies
