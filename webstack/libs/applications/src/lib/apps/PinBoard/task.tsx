import React, {Component, useRef, useState} from 'react';

import './styles.css';
import {DraggableCore} from 'react-draggable';
import {DraggableData, RndDragEvent} from "react-rnd";
import {useAppStore, useUIStore} from "../../../../../frontend/src";
import {App} from "../../schema";

type WindowProps = {
  app: App;
  children: JSX.Element;
  // React Rnd property to control the window aspect ratio (optional)
  lockAspectRatio?: boolean | number;
  lockToBackground?: boolean;
  processing?: boolean;
};


export function Task(props: WindowProps) {
  // Ref to the app container
  const divRef = useRef<HTMLDivElement>(null);

// UI store for global setting
  const zindex = useUIStore((state) => state.zIndex);

  const appDragging = useUIStore((state) => state.appDragging);
  const setAppDragging = useUIStore((state) => state.setAppDragging);
  const gridSize = useUIStore((state) => state.gridSize);
  const selectedApp = useUIStore((state) => state.selectedAppId);
  const selectedApps = useUIStore((state) => state.selectedApps);
  const isGrouped = selectedApps.includes(props.app._id);

  const setDeltaPosition = useUIStore((state) => state.setDeltaPostion);

// Local state
  const [pos, setPos] = useState({x: props.app.data.position.x, y: props.app.data.position.y});
  const [size, setSize] = useState({width: props.app.data.size.width, height: props.app.data.size.height});
  const [myZ, setMyZ] = useState(zindex);
  const [appWasDragged, setAppWasDragged] = useState(false);
  const [dragStatePos, setDragStartPosition] = useState(props.app.data.position);

  const update = useAppStore((state) => state.update);
  const apps = useAppStore((state) => state.apps);


// Handle when the window starts to drag
  function handleDragStart() {
    // Trying to optimize performance
    if (divRef.current) {
      // divRef.current.style.willChange = 'transform';
    }
    setAppDragging(true);
    // bringForward();
    setDragStartPosition(props.app.data.position);
    setDeltaPosition({x: 0, y: 0, z: 0}, props.app._id);
  }

// When the window is being dragged
  function handleDrag(_e: RndDragEvent, data: DraggableData) {
    setAppWasDragged(true);
    if (isGrouped) {
      const dx = data.x - props.app.data.position.x;
      const dy = data.y - props.app.data.position.y;
      setDeltaPosition({x: dx, y: dy, z: 0}, props.app._id);
    }
  }

// Handle when the app is finished being dragged
  function handleDragStop(_e: RndDragEvent, data: DraggableData) {
    let x = data.x;
    let y = data.y;
    x = Math.round(x / gridSize) * gridSize;
    y = Math.round(y / gridSize) * gridSize;
    const dx = x - props.app.data.position.x;
    const dy = y - props.app.data.position.y;
    setPos({x, y});
    setAppDragging(false);
    update(props.app._id, {
      position: {
        x,
        y,
        z: props.app.data.position.z,
      },
    });
    if (isGrouped) {
      selectedApps.forEach((appId) => {
        if (appId === props.app._id) return;
        const app = apps.find((el) => el._id == appId);
        if (!app) return;
        const p = app.data.position;
        update(appId, {
          position: {
            x: p.x + dx,
            y: p.y + dy,
            z: p.z,
          },
        });
      });
    }
    // Trying to optimize performance
    if (divRef.current) {
      // divRef.current.style.willChange = 'auto';
    }
  }

  return (
    <DraggableCore
      onStart={handleDragStart}
      onDrag={handleDrag}
      onStop={handleDragStop}
    >
      <div className="TaskContainer"
           style={{
             position: 'absolute',
             top: this.props.position.top,
             left: this.props.position.left,
           }}
      >
        <div className="TaskHandle"/>
        {this.props.task.content}
      </div>
    </DraggableCore>
  );
}
