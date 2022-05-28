2D Jupyter
==============

This is a Jupyter Notebooks extension that allows the user to arrange cells into multiple columns. 

Installation
-----
Follow the instructions at the link below to install Jupyter extensions: <br>
https://jupyter-contrib-nbextensions.readthedocs.io/en/latest/install.html

or if you are using an Anaconda installation: <br> 
https://docs.anaconda.com/anaconda/user-guide/tasks/use-jupyter-notebook-extensions/#obtaining-the-extensions

Download the extension files and place them in a folder called ```2D-Jupyter``` inside jupyter/nbextensions. 

Enable the extension with the command 
```jupyter nbextension enable 2D-Jupyter/2D-Jupyter```
or go to the nbextension tab in the Jupyter file tree and enable it via the checkbox. 

Usage
-----
Use the grey box on the left side of each cell to drag it around the page. Dragging a cell over the toolbar of an empty column will attach it to that column. Dragging it over another cell inside a column will place it after that cell. Dragging a cell to the edge of the page will scroll the page. 

The numbers in the grey box indicate the run order of the cells when "run all cells" is used. Dragging a cell outside of the column area will take it out of the run order and it will not be automatically run. 

Use the plus and minus buttons on the notebook toolbar to add and delete columns. Deleting a column will delete all of the cells in that column.

Click on a column toolbar to select/unselect that column. If a column is selected, adding a new column will place it directly to the right. If the delete column button is clicked, the selected column will be deleted. If no column is selected, a new column is added to the right end of the notebook, or the rightmost colum will be deleted. 

Use the plus button on the column header toolbars to add cell to the bottom of that column. The right and left arrows will shift the column right and left respectively. 


