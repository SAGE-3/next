import React, {Component} from 'react';
import {Task} from './task';
import Draggable from 'react-draggable';

import './styles.css';

class TaskList extends Component {
  shouldComponentUpdate(nextProps: any) {
    if (nextProps.tasks === this.props.tasks) {
      return false;
    }
    return true;
  }

  render() {
    return this.props.tasks.map((task, index) => (
      <Task key={task.id} task={task} index={index} />
    ));
  }
}

export function Column(props: TaskList) {
    return (
      <div>
        <h3>{this.props.column.title}</h3>
        <div className="ColumnContainer">
          <Draggable axis="y" handle=".handle">
            <div className="TaskListContainer">
              <TaskList {...props} />
            </div>
          </Draggable>
        </div>
      </div>
    );
}





