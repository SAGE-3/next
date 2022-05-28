define([ 
    'require',
    'jquery',
    'base/js/namespace',
    'base/js/events',
    'base/js/utils',
    'notebook/js/codecell',
    'notebook/js/textcell',
    'notebook/js/notebook',
    'notebook/js/cell',
    'notebook/js/celltoolbar',
    'base/js/i18n',
    'notebook/js/outputarea',
    'notebook/js/completer',
], function( 
    requireJS,
    $,
    Jupyter,
    events,
    utils,
    codecell,
    textcell,
    notebook,
    cell,
    celltoolbar,
    i18n,
    outputarea,
    completer
) {
    "use strict";

    var Cell = cell.Cell;
    var CodeCell = codecell.CodeCell; 
    var TextCell = textcell.TextCell;
    var Notebook = notebook.Notebook;

    var nCols = 2; //default of 2 columns

    var colCellCounts = [];
    var colWidths = [];
    

    var cell_options = {
        events: Jupyter.notebook.events, 
        config: Jupyter.notebook.config, 
        keyboard_manager: Jupyter.notebook.keyboard_manager, 
        notebook: Jupyter.notebook,
        tooltip: Jupyter.notebook.tooltip
    };
    
    
    
    CodeCell._options = {
        cm_config : {
            extraKeys: {
                "Backspace" : "delSpaceToPrevTabStop",
            },
            mode: 'text',
            theme: 'ipython',
            matchBrackets: true,
            autoCloseBrackets: true
        },
        highlight_modes : {
            'magic_javascript'    :{'reg':['^%%javascript']},
            'magic_perl'          :{'reg':['^%%perl']},
            'magic_ruby'          :{'reg':['^%%ruby']},
            'magic_python'        :{'reg':['^%%python3?']},
            'magic_shell'         :{'reg':['^%%bash']},
            'magic_r'             :{'reg':['^%%R']},
            'magic_text/x-cython' :{'reg':['^%%cython']},
        },
    };

    TextCell.prototype.create_element = function () {
        Cell.prototype.create_element.apply(this, arguments);
        var that = this;

        var cell = $("<div>").addClass('cell text_cell');
        cell.attr('tabindex','2');

        var ncells = Jupyter.notebook.ncells();
        var initialIndex = ncells + 1;
        var repos = $('<div>' + initialIndex + '</div>').addClass("repos").width('2%').css('backgroundColor', "lightgrey").css('cursor', 'move');  // the widget for dragging a cell
        cell.css('backgroundColor', 'rgba(255, 255, 255, 0.8)');  	// transparency
        repos.dblclick( function(event) {   // double-click = put back into notebook
            that.element.css("position", '').css("zIndex", '').width('').height('').css("left",'').css("top",'');
            delete that.metadata.spatial;
    });
    repos.mousedown( function(event) {	// drag the cell
        if(event.originalEvent.button != 0) return;   // left-click only
        //if(event.originalEvent.shiftKey) 
        event.preventDefault();  // dont select text
        if(that.element.css("zIndex") != CodeCell.zIndexCount)
            that.element.css("zIndex", ++CodeCell.zIndexCount);  // Move to front
        if(that.metadata.spatial)
            that.metadata.spatial.zIndex = CodeCell.zIndexCount;
        var x = event.pageX - that.element.offset().left;    // x offset
        var y = event.pageY - that.element.offset().top;     // y offset

        var scrollVertical = function (step) {
            var site = document.getElementById("site");
            var scrollY = $(site).scrollTop();
            $(site).scrollTop(scrollY + step);
            if (!stop) {
                setTimeout(function () { scrollVertical(step) }, 20);
            }
        }

        var scrollHorizontal = function (step) {
            var site = document.getElementById("site");
            var scrollX = $(site).scrollLeft();
            $(site).scrollLeft(scrollX + step);
            if (!stop) {
                setTimeout(function () {scrollHorizontal(step)}, 10);
            }
        }
        
        function onMouseMove(event) {
            var stop = true;
            if(that.element.css("position") != "absolute")   // wait till movement occurs to pull out the cell
                that.element.css("position", 'absolute').width(800-45);  // pull out of notebook
            that.metadata.spatial = { 	
                    left: event.pageX - x,   		
                    top: event.pageY - y,			
                    zIndex: CodeCell.zIndexCount }; 
            that.element.offset(that.metadata.spatial);    // set absolute position

            if (event.clientY < 150) {
                stop = false;
                scrollVertical(-10)

            }
    
            if (event.clientY > ($(window).height() - 150)) {
                stop = false;
                scrollVertical(10)
            }

            if (event.clientX < 150) {
                stop = false;
                scrollHorizontal(-10)

            }
    
            if (event.clientX > ($(window).width() - 150)) {
                stop = false;
                scrollHorizontal(10)
            }
        }
        document.addEventListener('mousemove', onMouseMove);  // use document events to allow rapid dragging outside the repos div

        repos.mouseup( function(event) {  
            var thisSpatial = that.metadata.spatial;
            // var inColumn = false;
            
            //places cells at end of columns
            var columns = document.getElementsByClassName("column");
            var nbContainer = document.getElementById("notebook-container");
            for(var c = 0; c < columns.length; c++){
                var col = columns[c];
                var colRect = col.getBoundingClientRect();
                var nbContainerRect = nbContainer.getBoundingClientRect();

                //if collision with a column
                if(thisSpatial.left > colRect.left && 
                    thisSpatial.top > colRect.top &&
                    thisSpatial.left < (colRect.left + colRect.width) &&
                    thisSpatial.top < nbContainerRect.bottom
                    ){ 
                    //attach to column if column is empty
                    if((countCellsinColumns()[c]) == 0){ 
                        
                        //make cells into a single div object w/ nb container
                        var cell = that.element.detach();
                        $(col).append(cell);
                        that.metadata.column = c + 1;
                        delete that.metadata.spatial;
                        that.element.css("position", '').css("zIndex", '').width('').height('').css("left",'').css("top",'');
                        reindex();
                    }
                    else{ //otherwise insert after cell
                        var allCells = document.getElementsByClassName("cell");
                        for(var c = 0; c < allCells.length; c++){
                            var cell = allCells[c];
                            var cellRect = cell.getBoundingClientRect();
                            if(thisSpatial.left > cellRect.left && //if collision
                                thisSpatial.top > cellRect.top &&
                                thisSpatial.left < (cellRect.left + cellRect.width) &&
                                thisSpatial.top < cellRect.bottom)
                            {
                                var cellElements = Jupyter.notebook.get_cells();
                                var newCol = cellElements[c].metadata.column;
                                var currCell = that.element.detach();
                                $(cell).after(currCell);
                                delete that.metadata.spatial;
                                that.metadata.column = newCol;
                                that.element.css("position", '').css("zIndex", '').width('').height('').css("left",'').css("top",'');
                                reindex();
                            }
                        }

                    }
                }
                
            }

                if(that.metadata.spatial){
                    delete that.metadata.column;
                    var cell = that.element.detach();
                    $(nbContainer).append(cell)
                    reindex();
                    cell[0].getElementsByClassName("repos")[0].innerHTML = "";
                }
                document.removeEventListener('mousemove', onMouseMove);
                repos.off(event);
            });
        });

        cell.append(repos); 		

        var prompt = $('<div/>').addClass('prompt input_prompt');
        cell.append(prompt);
        var inner_cell = $('<div/>').addClass('inner_cell');
        this.celltoolbar = new celltoolbar.CellToolbar({
            cell: this, 
            notebook: this.notebook});
        inner_cell.append(this.celltoolbar.element);
        var input_area = $('<div/>').addClass('input_area');


        this.code_mirror = new CodeMirror(input_area.get(0), this._options.cm_config);
        // In case of bugs that put the keyboard manager into an inconsistent state,
        // ensure KM is enabled when CodeMirror is focused:
        this.code_mirror.on('focus', function () {
            if (that.keyboard_manager) {
                that.keyboard_manager.enable();
            }
            that.code_mirror.setOption('readOnly', !that.is_editable());
        });
        this.code_mirror.on('keydown', $.proxy(this.handle_keyevent,this))
        // The tabindex=-1 makes this div focusable.
        var render_area = $('<div/>').addClass('text_cell_render rendered_html')
            .attr('tabindex','-1');
        inner_cell.append(input_area).append(render_area);
        cell.append(inner_cell);
        this.element = cell;
        this.inner_cell = inner_cell;

        //ids column for metadata label
        var ncells = Jupyter.notebook.ncells();
        that.metadata.index = ncells + 1;
        var colCounts = countCellsinColumns();
        var numPrevCells = 0;
        var currCol = 0;
        while(numPrevCells < that.metadata.index){
            currCol++;
            numPrevCells+=colCounts[currCol];
        }
        that.metadata.column = currCol;
        
        //attaches first cell of nb to first column
        if(Jupyter.notebook.ncells() == 0){
            var column = document.getElementById("column1");
            $(column).append(that.element);
        }
    };

    Notebook.prototype.copy_cell = function () {
        var cells = this.get_selected_cells();
        if (cells.length === 0) {
            cells = [this.get_selected_cell()];
        }
        
        this.clipboard = [];
        var cell_json;
        for (var i=0; i < cells.length; i++) {
            cell_json = cells[i].toJSON();
            if (cell_json.metadata.deletable !== undefined) {
                delete cell_json.metadata.deletable;
            }
            if (cell_json.id !== undefined) {
                delete cell_json.id;
            }
            this.clipboard.push(cell_json);
        }
        reindex();
        this.enable_paste();
    };

    CodeCell.prototype.create_element = function () {
        Cell.prototype.create_element.apply(this, arguments);
        var that = this;

        var cell =  $('<div></div>').addClass('cell code_cell');
        cell.attr('tabindex','2');

        var input = $('<div></div>').addClass('input');
        this.input = input;

        var prompt_container = $('<div/>').addClass('prompt_container');

        var run_this_cell = $('<div></div>').addClass('run_this_cell');
        run_this_cell.prop('title', 'Run this cell');
        run_this_cell.append('<i class="fa-step-forward fa"></i>');
        run_this_cell.click(function (event) {
            event.stopImmediatePropagation();
            that.execute();
        });

        var prompt = $('<div/>').addClass('prompt input_prompt');
        
        var inner_cell = $('<div/>').addClass('inner_cell');
        this.celltoolbar = new celltoolbar.CellToolbar({
            cell: this, 
            notebook: this.notebook});
        inner_cell.append(this.celltoolbar.element);
        var input_area = $('<div/>').addClass('input_area').attr("aria-label", i18n.msg._("Edit code here"));
        input_area.attr("style", "margin:1px");
        
        this.code_mirror = new CodeMirror(input_area.get(0), this._options.cm_config);
        // In case of bugs that put the keyboard manager into an inconsistent state,
        // ensure KM is enabled when CodeMirror is focused:
        this.code_mirror.on('focus', function () {
            if (that.keyboard_manager) {
                that.keyboard_manager.enable();
            }

            that.code_mirror.setOption('readOnly', !that.is_editable());
        });
        this.code_mirror.on('keydown', $.proxy(this.handle_keyevent,this));
        $(this.code_mirror.getInputField()).attr("spellcheck", "false");

        prompt_container.attr("style", "width:15%;");
        prompt.attr("style", "text-align:left; margin-left:5px;")

        // comment out below line to remove input prompt
        inner_cell.append(input_area);
        prompt_container.append(prompt).append(run_this_cell);
        input.append(prompt_container).append(inner_cell);
        input.append(inner_cell);

        var output = $('<div></div>');
        //cell.append(input).append(output); //REPLACED WITH BELOW
        var ncells = Jupyter.notebook.ncells();
        var initialIndex = ncells + 1;
        var repos = $('<div>' + initialIndex + '</div>').addClass("repos").width('2%').css('backgroundColor', "lightgrey").css('cursor', 'move');  // the widget for dragging a cell
        // document.getElementById('notebook-container').style.width = '800px';  // set notebook and default cell width
        // document.getElementById('notebook-container').style.marginLeft = '20px';  // left justify notebook in browser
        cell.css('backgroundColor', 'rgba(255, 255, 255, 0.8)');  	// transparency
        //prompt.css('backgroundColor', "#fff0f0").css('cursor', 'move');  // red drag target
        if(!CodeCell.zIndexCount)  CodeCell.zIndexCount = 1000;		// initialize zIndex if needed

        repos.dblclick( function(event) {   // double-click = put back into notebook
                that.element.css("position", '').css("zIndex", '').width('').height('').css("left",'').css("top",'');
                delete that.metadata.spatial;
        });

    
        repos.mousedown( function(event) {	// drag the cell
            if(event.originalEvent.button != 0) return;   // left-click only
            //if(event.originalEvent.shiftKey) 
            event.preventDefault();  // dont select text
            if(that.element.css("zIndex") != CodeCell.zIndexCount)
                that.element.css("zIndex", ++CodeCell.zIndexCount);  // Move to front
            if(that.metadata.spatial)
                that.metadata.spatial.zIndex = CodeCell.zIndexCount;
            
            countCellsinColumns();
           
            var x = event.pageX - that.element.offset().left;    // x offset
            var y = event.pageY - that.element.offset().top;     // y offset
            
        
            var scrollVertical = function (step) {
                var site = document.getElementById("site");
                var scrollY = $(site).scrollTop();
                $(site).scrollTop(scrollY + step);
                if (!stop) {
                    setTimeout(function () { scrollVertical(step) }, 20);
                }
            }

            var scrollHorizontal = function (step) {
                var site = document.getElementById("site");
                var scrollX = $(site).scrollLeft();
                $(site).scrollLeft(scrollX + step);
                if (!stop) {
                    setTimeout(function () {scrollHorizontal(step)}, 10);
                }
            }

            function onMouseMove(event) {
                var stop = true;
                if(that.element.css("position") != "absolute")   // wait till movement occurs to pull out the cell
                    that.element.css("position", 'absolute').width(800-45);  // pull out of notebook
               
                    that.metadata.spatial = { 	
                    left: event.pageX - x,   		
                    top: event.pageY - y,			
                    zIndex: CodeCell.zIndexCount }; 

                if(that.metadata.column){
                    colCellCounts[that.metadata.column - 1]--;
                    delete that.metadata.column;
                }
                that.element.offset(that.metadata.spatial);    // set absolute position

               
                if (event.clientY < 150) {
                    stop = false;
                    scrollVertical(-10)

                }
        
                if (event.clientY > ($(window).height() - 150)) {
                    stop = false;
                    scrollVertical(10)
                }

                if (event.clientX < 150) {
                    stop = false;
                    scrollHorizontal(-10)

                }
        
                if (event.clientX > ($(window).width() - 150)) {
                    stop = false;
                    scrollHorizontal(10)
                }
                

            }


            document.addEventListener('mousemove', onMouseMove);  // use document events to allow rapid dragging outside the repos div
    
            repos.mouseup( function(event) {  
                //stop = true;
                var thisSpatial = that.metadata.spatial;
                // var inColumn = false;
                
                //places cells at end of columns
                var columns = document.getElementsByClassName("column");
                var nbContainer = document.getElementById("notebook-container");
                for(var c = 0; c < columns.length; c++){
                    var col = columns[c];
                    var colRect = col.getBoundingClientRect();
                    var nbContainerRect = nbContainer.getBoundingClientRect();

                    //if collision with a column
                    if(thisSpatial.left > colRect.left && 
                        thisSpatial.top > colRect.top &&
                        thisSpatial.top < colRect.bottom &&
                        thisSpatial.left < (colRect.left + colRect.width) //&&
                        // thisSpatial.top < nbContainerRect.bottom
                        ){ 
                        that.element.css("background-color", "white");
                    
                        //attach to column if column is empty
                        if((colCellCounts[c]) == 0){ 
                            //make cells into a single div object w/ nb container
                            var cell = that.element.detach();
                            $(col).append(cell);
                            that.metadata.column = c + 1;
                            //drag cells in order?
                            delete that.metadata.spatial;
                            that.element.css("position", '').css("zIndex", '').width('').height('').css("left",'').css("top",'');
                            reindex();
                        }
                        else{ //otherwise insert after cell
                            var allCells = document.getElementsByClassName("cell");
                            for(var c = 0; c < allCells.length; c++){
                                var cell = allCells[c];
                                var cellRect = cell.getBoundingClientRect();
                                if(thisSpatial.left > cellRect.left && //if collision
                                    thisSpatial.top > cellRect.top &&
                                    thisSpatial.left < (cellRect.left + cellRect.width) &&
                                    thisSpatial.top < cellRect.bottom)
                                {
                                    var cellElements = Jupyter.notebook.get_cells();
                                    var newCol = cellElements[c].metadata.column;
                                    var currCell = that.element.detach();
                                    $(cell).after(currCell);
                                    delete that.metadata.spatial;
                                    that.metadata.column = newCol;
                                    that.element.css("position", '').css("zIndex", '').width('').height('').css("left",'').css("top",'');
                                    reindex();
                                }
                            }

                        }
                    }
                    
                }
                if(that.metadata.spatial){
                    delete that.metadata.column;
                    var cell = that.element.detach();
                    $(nbContainer).append(cell)
                    reindex();
                    cell[0].getElementsByClassName("repos")[0].innerHTML = "";
                }
                document.removeEventListener('mousemove', onMouseMove);
                repos.off(event);
            });

        });
        //prompt.ondragstart = function() { return false; };
        //prompt_container.append(repos).append(prompt).append(run_this_cell);
        // new containers needed to insert repos:
        var cell2 = $('<div style="display: flex; flex-direction: row; align-items: stretch;"></div>');  // contains repos and cell3, needs to change to row flow
        var cell3 = $('<div style="display: flex; flex-direction: column; align-items: stretch; width: 98%;"></div>');  // new container for input and output, needs to change to column flow
        cell3.append(input).append(output); ////
        cell2.append(repos).append(cell3);  ////
        cell.append(cell2); 				//// cell cell2 repos cell3 input output
        //
        /////////////////////////////////////////////////////*/

        this.element = cell;
        this.output_area = new outputarea.OutputArea({
            config: this.config,
            selector: output,
            prompt_area: true,
            //prompt_area: false,
            events: this.events,
            keyboard_manager: this.keyboard_manager,
        });
        this.completer = new completer.Completer(this, this.events);

        //ids column for metadata label
        var ncells = Jupyter.notebook.ncells();
        that.metadata.index = ncells + 1;
        var numPrevCells = 0;
        var currCol = 0;
        while(numPrevCells < that.metadata.index){
            currCol++;
            numPrevCells+=colCellCounts[currCol];
        }
        that.metadata.column = currCol;
        
        //attaches first cell of nb to first column
        if(Jupyter.notebook.ncells() == 0){
            var column = document.getElementById("column1");
            $(column).append(that.element);
        }

    };

    CodeCell.prototype.fromJSON = function (data) {
        //create box here? 
        Cell.prototype.fromJSON.apply(this, arguments);
        if (data.cell_type === 'code') {
            if (data.source !== undefined) {
                this.set_text(data.source);
                // make this value the starting point, so that we can only undo
                // to this state, instead of a blank cell
                this.code_mirror.clearHistory();
                this.auto_highlight();
            }
            this.set_input_prompt(data.execution_count);
            this.output_area.trusted = data.metadata.trusted || false;
            this.output_area.fromJSON(data.outputs, data.metadata);
        }
        ////// ChrisNorth ////////////
        // Append to the end of function:  CodeCell.prototype.fromJSON = function (data) {
        // Restores spatial positions on notebook file load.
        //
        //restores position if not in column
        if(data.metadata.spatial) {
        	this.element.css("position", 'absolute').width(800-45);  // pull out of notebook
			this.element.css("zIndex", data.metadata.spatial.zIndex);
			if(!CodeCell.zIndexCount || CodeCell.zIndexCount < data.metadata.spatial.zIndex)
				CodeCell.zIndexCount = data.metadata.spatial.zIndex;
        	this.element.offset(data.metadata.spatial);  // set absolute position
        }
        
        //restores position if in column
        var cells = Jupyter.notebook.get_cells();
        for(var i=0;i<cells.length;i++){
            var cell = cells[i];
            var col = cell.metadata.column;
            var columns = document.getElementsByClassName("column");
            $(columns[col - 1]).append(cell.element);

        }
        //////////////////////////////
    };

    Notebook.prototype.cells_to_markdown = function (indices) {
        if (indices === undefined) {
            indices = this.get_selected_cells_indices();
        }

        for(var i=0; i < indices.length; i++) {
            this.to_markdown(indices[i]);
            reindex();
        }
     };

    Notebook.prototype.cells_to_code = function (indices) {
        if (indices === undefined){
            indices = this.get_selected_cells_indices();
        }
        
        for (var i=0; i <indices.length; i++){
            this.to_code(indices[i]);
            reindex();
        }
    };
    

    
    Notebook.prototype.move_selection_up = function(){
        // actually will move the cell before the selection, after the selection
        var indices = this.get_selected_cells_indices();
        var first = indices[0];
        var last = indices[indices.length - 1];

        var selected = this.get_selected_index();
        var anchored = this.get_anchor_index();

        if (first === 0 || first == Jupyter.notebook.ncells()){
            return;
        }

        var tomove = this.get_cell_element(last);
        var pivot = this.get_cell_element(first - 1);
        
        tomove.detach();
        pivot.before(tomove);
        

        reindex();

    };

    Notebook.prototype.move_selection_down = function(){
        var indices = this.get_selected_cells_indices();
        var first = indices[0];
        var last = indices[indices.length - 1];

        var selected = this.get_selected_index();
        var anchored = this.get_anchor_index();

        if(!this.is_valid_cell_index(last + 1)){
            return;
        }
        if(last == Jupyter.notebook.ncells){ //if at bottom of nb
            return;
        }

        var tomove = this.get_cell_element(first);
        var pivot = this.get_cell_element(last + 1);

        tomove.detach();
        pivot.after(tomove);

        reindex();
    };

    Notebook.prototype.insert_cell_at_index = function(type, index){
        var ncells = this.ncells();
        index = Math.min(index, ncells);
        index = Math.max(index, 0);
        var cell = null;
        type = type || this.class_config.get_sync('default_cell_type');
        if (type === 'above') {
            if (index > 0) {
                type = this.get_cell(index-1).cell_type;
            } else {
                type = 'code';
            }
        } else if (type === 'below') {
            if (index < ncells) {
                type = this.get_cell(index).cell_type;
            } else {
                type = 'code';
            }
        } else if (type === 'selected') {
            type = this.get_selected_cell().cell_type;
        }

        if (ncells === 0 || this.is_valid_cell_index(index) || index === ncells) {
            var cell_options = {
                events: this.events, 
                config: this.config, 
                keyboard_manager: this.keyboard_manager, 
                notebook: this,
                tooltip: this.tooltip
            };
            switch(type) {
            case 'code':
                cell = new codecell.CodeCell(this.kernel, cell_options);
                cell.set_input_prompt();
                break;
            case 'markdown':
                cell = new textcell.MarkdownCell(cell_options);
                break;
            case 'raw':
                cell = new textcell.RawCell(cell_options);
                break;
            default:
                console.log("Unrecognized cell type: ", type, cellmod);
                cell = new cellmod.UnrecognizedCell(cell_options);
            }

            if(this._insert_element_at_index(cell.element,index)) {
                reindex();
                cell.render();
                this.events.trigger('create.Cell', {'cell': cell, 'index': index});
                cell.refresh();
                // We used to select the cell after we refresh it, but there
                // are now cases were this method is called where select is
                // not appropriate. The selection logic should be handled by the
                // caller of the the top level insert_cell methods.
                this.set_dirty(true);
             
            }
        }
        return cell;

    };

    Notebook.prototype._insert_element_at_index = function(element, index){
        if (element === undefined){
            return false;
        }

        var ncells = this.ncells();

        if (ncells === 0) {
            // special case append if empty
            this.container.append(element);
        } else if ( ncells === index ) {
            // special case append it the end, but not empty
            this.get_cell_element(index-1).after(element);
        } else if (this.is_valid_cell_index(index)) {
            // otherwise always somewhere to append to
            this.get_cell_element(index-1).after(element);
        } else {
            return false;
        }
    
        this.undelete_backup_stack.map(function (undelete_backup) {
            if (index < undelete_backup.index) {
                undelete_backup.index += 1;
            }
        });
        this.set_dirty(true);
        return true;
    };

    Notebook.prototype.delete_cells = function(indices) {
        if (indices === undefined) {
            indices = this.get_selected_cells_indices();
        }

        var undelete_backup = {
            cells: [],
            below: false,
            index: 0,
        };

        var cursor_ix_before = this.get_selected_index();
        var deleting_before_cursor = 0;
        for (var i=0; i < indices.length; i++) {
            if (!this.get_cell(indices[i]).is_deletable()) {
                // If any cell is marked undeletable, cancel
                return this;
            }

            if (indices[i] < cursor_ix_before) {
                deleting_before_cursor++;
            }
        }

        // If we started deleting cells from the top, the later indices would
        // get offset. We sort them into descending order to avoid that.
        indices.sort(function(a, b) {return b-a;});
        for (i=0; i < indices.length; i++) {
            var cell = this.get_cell(indices[i]);
            undelete_backup.cells.push(cell.toJSON());
            this.get_cell_element(indices[i]).remove();
            this.events.trigger('delete.Cell', {'cell': cell, 'index': indices[i]});
        }

        var new_ncells = this.ncells();
        // Always make sure we have at least one cell.
        if (new_ncells === 0) {
            this.insert_cell_below('code');
            new_ncells = 1;
        }

        var cursor_ix_after = this.get_selected_index();
        if (cursor_ix_after === null) {
            // Selected cell was deleted
            cursor_ix_after = cursor_ix_before - deleting_before_cursor;
            if (cursor_ix_after >= new_ncells) {
                cursor_ix_after = new_ncells - 1;
                undelete_backup.below = true;
            }
            this.select(cursor_ix_after);
        }

        // Check if the cells were after the cursor
        for (i=0; i < indices.length; i++) {
            if (indices[i] > cursor_ix_before) {
                undelete_backup.below = true;
            }
        }

        // This will put all the deleted cells back in one location, rather than
        // where they came from. It will do until we have proper undo support.
        undelete_backup.index = cursor_ix_after;
        $('#undelete_cell').removeClass('disabled');
        $('#undelete_cell > a').attr('aria-disabled','false');
        this.undelete_backup_stack.push(undelete_backup);
        this.set_dirty(true);

        reindex();

        return this;
    };


    Notebook.prototype.execute_cell_range = function (start, end) {
        this.command_mode();
        var indices = [];
        var cell;
        for (var i=start; i<end; i++) {
            cell = this.get_cell(i);
            if(cell.metadata.column && cell.metadata.label === undefined){
                indices.push(i);
            }
        }
        this.execute_cells(indices);
    };


    function reindex(){
        var cells = Jupyter.notebook.get_cells();
		var ncells = Jupyter.notebook.ncells();
		for (var i=0; i<ncells; i++){
			var cell = cells[i];
            
            var index = Jupyter.notebook.find_cell_index(cell);
            cell.metadata.index = index + 1; //indexing starts at 1

            if(cell.metadata.column){
                var box = document.getElementsByClassName("repos")[i]; 
                $(box)[0].innerHTML = "";
                $(box).append(cell.metadata.index);
            }
		 }
    }

    function countCellsinColumns(){
        var cells = Jupyter.notebook.get_cells();
        var ncells = Jupyter.notebook.ncells();
        for (var i=0; i<nCols; i++){
            colCellCounts[i] = 0;
        }
        for (var j=0; j<ncells; j++){
			var cell = cells[j];
            colCellCounts[cell.metadata.column - 1]++;
        }
        return colCellCounts;
    }

    function createColumnToolbar(column){
        var toolbar = document.createElement('div');
        toolbar.style.backgroundColor = "white";
        toolbar.classList.add("col-toolbar");
        //toolbar.classList.add("deselected");
        toolbar.id = "columnToolbar" + column;

        
        var cell_options = {
            events: Jupyter.notebook.events, 
            config: Jupyter.notebook.config, 
            keyboard_manager: Jupyter.notebook.keyboard_manager, 
            notebook: Jupyter.notebook,
            tooltip: Jupyter.notebook.tooltip
        };

        var buttons = document.createElement('div');
        buttons.style.width = '100%';
        buttons.style.height = '35px';
        buttons.style.border = "1.5px solid black";

        var resize = document.createElement("div");
        resize.classList.add("resizeMe");
        resize.id = "resizeCol" + column;
        resize.style.width = "20px";
        resize.style.height = "33px"; 
        resize.style.float = "right";
        resize.style.backgroundColor = "lightgrey";
        resize.style.cursor =  'col-resize';
        //resize.onclick = "resize()";
        resize.addEventListener("mousedown", resizeColumns);

    
        //resize.addEventListener("mousedown", resize());
        
        buttons.append(resize);


        var addCell = document.createElement('button');
        addCell.classList.add("btn");
        addCell.classList.add("btn-default");
        addCell.style.float = "left";
        addCell.innerHTML = '<i class = "fa fa-plus"></i>';
        addCell.onclick = function(){
            if(column == 0){ //if first column
                Jupyter.notebook.insert_cell_at_index('code', 0);
            }
            else{ 
                var columns = document.getElementsByClassName("column");
                var colIndex = $(this).parents()[2].id;
                colIndex = colIndex.replace('column', '');
                var currCol = columns[colIndex - 1];
                var cellsInCol = currCol.getElementsByClassName("cell");
                if(cellsInCol.length == 0){ //if column is empty
                    var newCodeCell = new codecell.CodeCell(Jupyter.notebook.kernel, cell_options);
                    newCodeCell.set_input_prompt();
                    newCodeCell.metadata.column = column;
                    currCol = columns[colIndex - 1];
                    $(currCol).append(newCodeCell.element);
                    
                }
                else{
                    var lastCell = cellsInCol[cellsInCol.length - 1];
                    var lastIndex = lastCell.getElementsByClassName("repos")[0].innerHTML;
                    Jupyter.notebook.insert_cell_at_index('code', lastIndex);
                }
            }
            
        };
        buttons.append(addCell);

        var moveColRight = document.createElement('button');
        moveColRight.classList.add("btn");
        moveColRight.classList.add("btn-default");
        moveColRight.style.float = "right";
        moveColRight.innerHTML = '<i class = "fa fa-arrow-right"></i>';
        moveColRight.onclick = function(){
            var colIndex = $(this).parents()[2].id;
            colIndex = colIndex.replace('column', '');
            var columns = document.getElementsByClassName("column");
            if(parseInt(colIndex) < columns.length){
                var currCol = columns[colIndex - 1];
                var nextCol = columns[colIndex];
                $(currCol).insertAfter(nextCol);
                var increment = parseInt(colIndex) + 1;
                currCol.id = "column" + increment;
                nextCol.id = "column" + colIndex;

                currCol.querySelector("#click" + colIndex).id = "click" + increment;
                nextCol.querySelector("#click" + increment).id = "click" + colIndex;
                currCol.querySelector("#columnToolbar" + colIndex).id = "columnToolbar" + increment;
                nextCol.querySelector("#columnToolbar" + increment).id = "columnToolbar" + colIndex;
                currCol.querySelector("#resizeCol" + colIndex).id = "resizeCol" + increment;
                nextCol.querySelector("#resizeCol" + increment).id = "resizeCol" + colIndex;
                reindex();


                var cells = Jupyter.notebook.get_cells();
                var currChildren = Array.from(currCol.children);
                var nextChildren = Array.from(nextCol.children);
                currChildren.forEach(c => {
                    if(c.classList.contains("cell")){
                        var cellIndex = c.querySelector(".repos").innerHTML;
                        cells[cellIndex - 1].metadata.column = increment;
                    }
                    
                })
                nextChildren.forEach(c => {
                    if(c.classList.contains("cell")){
                        var cellIndex = c.querySelector(".repos").innerHTML;
                        cells[cellIndex - 1].metadata.column = colIndex;
                    }
                    
                })
        
            }
        }
        buttons.append(moveColRight);

        var moveColLeft = document.createElement('button');
        moveColLeft.classList.add("btn");
        moveColLeft.classList.add("btn-default");
        moveColLeft.style.float = "right";
        
        moveColLeft.innerHTML = '<i class = "fa fa-arrow-left"></i>';
        moveColLeft.onclick = function(){
            var colIndex = $(this).parents()[2].id;
            colIndex = parseInt(colIndex.replace('column', '')); //this is indexed starting at one //5
            if(colIndex > 1){
                var columns = document.getElementsByClassName("column");
                var currColIndex = colIndex - 1; //subtract 1 to access correct index in columns array //4
                var currCol = columns[currColIndex]; 
                var prevCol = columns[currColIndex - 1];
                $(prevCol).insertAfter(currCol);
                currCol.id = "column" + currColIndex;  
                prevCol.id = "column" + colIndex;
                currCol.querySelector("#click" + colIndex).id = "click" + currColIndex;
                prevCol.querySelector("#click" + currColIndex).id = "click" + colIndex;
                currCol.querySelector("#columnToolbar" + colIndex).id = "columnToolbar" + currColIndex;
                prevCol.querySelector("#columnToolbar" + currColIndex).id = "columnToolbar" + colIndex;
                currCol.querySelector("#resizeCol" + colIndex).id = "resizeCol" + currColIndex;
                prevCol.querySelector("#resizeCol" + currColIndex).id = "resizeCol" + colIndex;
                reindex();

                var cells = Jupyter.notebook.get_cells();
                var currChildren = Array.from(currCol.children);
                var prevChildren = Array.from(prevCol.children);
                currChildren.forEach(c => {
                    if(c.classList.contains("cell")){
                        var cellIndex = c.querySelector(".repos").innerHTML;
                        cells[cellIndex - 1].metadata.column = currColIndex;
                    }
                    
                })
                prevChildren.forEach(c => {
                    if(c.classList.contains("cell")){
                        var cellIndex = c.querySelector(".repos").innerHTML;
                        cells[cellIndex - 1].metadata.column = colIndex;
                    }
                    
                })

            }
        }
        buttons.append(moveColLeft);

        var clickable = document.createElement('div');
        clickable.classList.add("clickable-area")
        clickable.id = "click" + column;
        clickable.style.height = "35px";
        clickable.addEventListener("click", selectColumn);
        buttons.append(clickable);

        
        toolbar.append(buttons);

    
        return toolbar;
    }

    function resizeColumns(e){
        var ele = this;
        var colIndex = ele.id.replace('resizeCol', '');
        var column = document.getElementById("column" + colIndex);

        var numColumns = document.getElementsByClassName("column").length;

        let x, w = 0;
        
        x = e.clientX;

        const styles = window.getComputedStyle(column);
        w = parseInt(styles.width, 10);
    
       

        const mouseMoveHandler = function (e) {
            const dx = e.clientX - x;
            if((w + dx) >= 135){
                column.style.width = `${w + dx}px`;
                colWidths[colIndex - 1] =  `${w + dx}px`;
            }
            
            var docWidth = document.getElementById('notebook-container').style.width;
            docWidth = parseInt(docWidth.replace('px', ''));
            docWidth += dx;
            if(docWidth >= numColumns * 600){
                document.getElementById('notebook-container').style.width = `${docWidth}px`;
            }
           
        };

        const mouseUpHandler = function () {
            document.removeEventListener('mousemove', mouseMoveHandler);
            document.removeEventListener('mouseup', mouseUpHandler);
        };

        document.addEventListener('mousemove', mouseMoveHandler);
        document.addEventListener('mouseup', mouseUpHandler);

    }

    function selectColumn(){
        var ele = this;
        var colIndex = ele.id.replace('click', '');

        var previousSelection = document.querySelector(".column.selected");
        var column = document.getElementById("column" + colIndex);

        if(previousSelection != null && previousSelection != column){
            var previousSelection = document.querySelector(".column.selected"); 
            previousSelection.style.border = "";
            previousSelection.classList.remove('selected');
        }

        column.classList.toggle("selected");
        if(column.classList.contains("selected")){
            column.style.border = "5px solid #42a5f5";
        }
        else{
            column.style.border = "";
        }

    }

    function update_styling() {
        nCols = Jupyter.notebook.metadata.columns;

        var newColumnWidth = 100/nCols - 2;
        var newNbContainerWidth = 900*nCols + 50;

        document.getElementById('notebook-container').style.width = newNbContainerWidth.toString() + "px"; //resizing nb container
        document.getElementById('notebook').style.overflowX = "visible";
        document.getElementById('notebook').style.overflowY = "visible";
        document.getElementById('notebook-container').style.height = 'inherit';
        document.getElementById('notebook-container').style.marginLeft = '20px';  // left justify notebook in browser
        document.getElementById('notebook-container').style.backgroundColor = "transparent";
        document.getElementById('notebook-container').style.boxShadow = null;
       

        for(var c = 0; c < nCols; c++){
            var newCol = document.createElement('div');   
            newCol.classList.add("column");
            newCol.id = "column" + (c+1).toString();
            newCol.style.width = "500px";
            colWidths[c] = newColumnWidth.toString() + "%";
            newCol.style.float = 'left';
            newCol.style.margin = "10px";
            newCol.style.height = "inherit";
            newCol.style.minHeight = "30px";
            newCol.style.backgroundColor = "rgba(255,255,255,0.5)";

            document.getElementById('notebook-container').appendChild(newCol);
            var colIndex = newCol.id;
            colIndex = colIndex.replace('column', '');

            var toolbar = createColumnToolbar(colIndex);
            newCol.prepend(toolbar);

        }

       

    }

    function add_column(){

        var numColumns = document.getElementsByClassName("column").length;
        numColumns++;
        document.getElementById("notebook-container").style.width = numColumns*600 + "px";//newNbContainerWidth.toString() + "px"; //resizing nb container
        
        var insertAfter = numColumns;
        var selection = false;
        //restyling existing columns
        var columns = document.getElementsByClassName("column"); 
        for(var c = 0; c < columns.length; c++){
            columns[c].style.float = 'left';
            columns[c].style.margin = "10px";
            var colId = columns[c].id;
            colId = parseInt(colId.replace("column", ""));
            if(colId >= insertAfter){
                var oldIndex = colId;
                colId++;
                columns[c].id = "column" + colId;
                columns[c].querySelector("#click" +oldIndex).id = "click" + colId;
                columns[c].querySelector("#columnToolbar" + oldIndex).id = "columnToolbar" + colId;
                columns[c].querySelector("#resizeCol" + oldIndex).id = "resizeCol" + colId;
            }
            if(columns[c].classList.contains("selected")){
                selection = true;
                insertAfter = columns[c].id.replace("column", "");
                
            }
        }

        var insertAt = numColumns;
        if(selection){
            insertAt = parseInt(insertAfter) + 1;
        }
        
        //adding new column
        var newCol = document.createElement('div');   
        newCol.classList.add("column");
        newCol.id = "column" + insertAt.toString();
        newCol.style.width = "500px"; 
        newCol.style.float = 'left';
        newCol.style.margin = "10px";
        newCol.style.height = "inherit";
        newCol.style.minHeight = "30px";
        newCol.style.backgroundColor = "rgba(255,255,255,1)";

        var colIndex = newCol.id;
        colIndex = colIndex.replace('column', '');
        var toolbar = createColumnToolbar(colIndex);
        newCol.prepend(toolbar);

        var cell_options = {
            events: Jupyter.notebook.events, 
            config: Jupyter.notebook.config, 
            keyboard_manager: Jupyter.notebook.keyboard_manager, 
            notebook: Jupyter.notebook,
            tooltip: Jupyter.notebook.tooltip
        };

        //initialize new column with a code cell
        var newCodeCell = new codecell.CodeCell(Jupyter.notebook.kernel, cell_options);
        newCodeCell.set_input_prompt();
        newCodeCell.metadata.column = nCols + 1;
        $(newCol).append(newCodeCell.element);


        //determine where to insert new column
        if(insertAfter == numColumns){
            document.getElementById('notebook-container').appendChild(newCol);
        }
        else{
            var insertAfterCol = document.getElementById("column" + (insertAfter));
            insertAfterCol.after(newCol);
            reindex();
        }

        
        nCols++;
        Jupyter.notebook.metadata.columns = nCols;

    }

    Notebook.prototype.execute_cell_range = function (start, end) {
        this.command_mode();
        var indices = [];
        for (var i=start; i<end; i++) {
            indices.push(i);
        } 
        console.log("indices from execute cell range: " + indices)
        this.execute_cells(indices);
       
    };

    Notebook.prototype.execute_cells = function (indices) {
        console.log("entered execute_cells");
        console.log(indices);
        if (indices.length === 0) {
            return;
        }

        var cell;
        for (var i = 0; i < indices.length; i++) {
            cell = this.get_cell(indices[i]);
            console.log("hello");
            console.log(cell);
            cell.execute();
        }

        this.select(indices[indices.length - 1]);
        this.command_mode();
        this.set_dirty(true);
    };




    function delete_column(){
        if(confirm("Are you sure you want to delete this column? This action cannot be undone.")){
            console.log("delete the column");

            var columns = document.getElementsByClassName("column"); 
            var lastColumn = columns[nCols-1];


            var selection = false;
            var deletedCol;
            for(var c = 0; c<columns.length; c++){
                if(columns[c].classList.contains("selected")){
                    deletedCol = c;
                    selection = true;
                    columns[c].remove();
                    break;
                }
            } 
            if(!selection){
                lastColumn.remove();
            }
            
            
            nCols--;

            //restyling existing columns
            var columns = document.getElementsByClassName("column"); 
            for(c = 0; c < columns.length; c++){
                columns[c].style.float = 'left';
                columns[c].style.margin = "10px";
                if(c >= deletedCol){
                    console.log(c);
                    columns[c].id = "column" + (c + 1);
                    columns[c].querySelector("#columnToolbar" + (c+2)).id = "columnToolbar" + (c+1);
                    columns[c].querySelector("#resizeCol" + (c+2)).id = "resizeCol" + (c+1);
                    columns[c].querySelector("#click" + (c+2)).id = "click" + (c + 1);

                    var cells = Jupyter.notebook.get_cells();
                    var children = Array.from(columns[c].children);
                    children.forEach(child => {
                        if(child.classList.contains("cell")){
                            var cellIndex = child.querySelector(".repos").innerHTML;
                            cells[cellIndex - 1].metadata.column = parseInt(c+1);
                        }
                        
                    })
                }
            
            
            }
            reindex();

            Jupyter.notebook.metadata.columns = nCols;
        }


    }

    function initialize () {       
        //set intial run indexes
		var cells = Jupyter.notebook.get_cells();
		var ncells = Jupyter.notebook.ncells();

		for (var i=0; i<ncells; i++){
            var cell = cells[i];
            var index = Jupyter.notebook.find_cell_index(cell);
            cell.metadata.index = index;
           
            var box = document.getElementsByClassName("repos")[i]; 
            if(typeof box !== 'undefined'){
                $(box)[0].innerHTML = "";
                $(box).append(index + 1);
            }
            
		}

        //draw columns
        if(!Jupyter.notebook.metadata.columns || Jupyter.notebook.metadata.columns === null){
            Jupyter.notebook.metadata.columns = 1;
        }
        nCols = Jupyter.notebook.metadata.columns;
        update_styling();

	}

    function load_ipython_extension() {
        $(IPython.toolbar.add_buttons_group([
            IPython.keyboard_manager.actions.register({
                'help'   : 'Add Column',
                'icon'    : 'fa-plus-square-o ',
                'handler': function() {
                    add_column();
                },
            }, 'add-column', 'jupyter-notebook'),
            IPython.keyboard_manager.actions.register({
                'help'   : 'Delete Column',
                'icon'    : 'fa-minus-square-o ',
                'handler': function() {
                    delete_column();
                },
            }, 'delete-column', 'jupyter-notebook'),
        ], 'add-delete-columns')).find('.btn').attr('id', 'add-column-btn');
        $("#maintoolbar-container").append($('#add-delete-columns'));

        Jupyter.notebook.restore_checkpoint('checkpoint') 
        return Jupyter.notebook.config.loaded.then(initialize);

    }

    return {
        load_ipython_extension: load_ipython_extension
    };
});


