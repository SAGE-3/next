/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { Box } from '@chakra-ui/react';

import { App } from '../../schema';
import { AppWindow } from '../../components';

import 'reactflow/dist/style.css';
// import './styles.css';
import AceEditor from 'react-ace';
import { v5 as uuidv5 } from 'uuid';

import { useState, useCallback, useMemo } from 'react';
import ReactFlow, {
  addEdge,
  FitViewOptions,
  applyNodeChanges,
  applyEdgeChanges,
  Node,
  Edge,
  NodeChange,
  EdgeChange,
  Connection,
  MiniMap,
  Background,
  Controls,
  Position,
  MarkerType,
} from 'reactflow';
import TextUpdaterNode from './TextUpdaterNode';
import AceNode from './AceNode';

function getNodeLength(node: Node): number {
  return node.data.code.length;
}

const initialNodes: Node[] = [
  {
    id: '2',
    type: 'input',
    data: {
      label: (
        <button
          onClick={() => {
            console.log('hello world');
          }}
        >
          Click me
        </button>
      ),
    },
    position: { x: 250, y: 5 },
  },
  {
    id: `uuid-${uuidv5('node1', uuidv5.URL)}`,
    type: 'textUpdater',
    position: { x: 0, y: 0 },
    data: { label: 'Text Updater' },
  },
  {
    id: '0',
    data: {
      label: <AceNode />,
    },
    style: {
      border: '1px solid #ddd',
      borderRadius: '5px',
      padding: '10px',
      background: '#1a1a1a',
      width: '100%',
      height: '110px',
    },
    hidden: false,
    position: { x: 0, y: 0 },
  },
  {
    id: '1',
    type: 'input',
    data: {
      label: 'Input Node',
    },
    position: { x: 250, y: 0 },
  },
  {
    id: '2',
    data: {
      label: 'Default Node',
    },
    position: { x: 100, y: 100 },
  },
  {
    id: '3',
    type: 'output',
    data: {
      label: 'Output Node',
    },
    position: { x: 400, y: 100 },
  },
  {
    id: '4',
    type: 'custom',
    position: { x: 100, y: 200 },
    data: {
      selects: {
        'handle-0': 'smoothstep',
        'handle-1': 'smoothstep',
      },
    },
  },
  {
    id: '5',
    type: 'output',
    data: {
      label: 'custom style',
    },
    className: 'circle',
    style: {
      background: '#2B6CB0',
      color: 'white',
    },
    position: { x: 400, y: 200 },
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
  },
  {
    id: '6',
    type: 'output',
    style: {
      background: '#63B3ED',
      color: 'white',
      width: 100,
    },
    data: {
      label: 'Node',
    },
    position: { x: 400, y: 325 },
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
  },
  {
    id: '7',
    type: 'default',
    className: 'annotation',
    data: {
      label: (
        <>
          On the bottom left you see the <strong>Controls</strong> and the bottom right the <strong>MiniMap</strong>. This is also just a
          node 🥳
        </>
      ),
    },
    draggable: false,
    selectable: false,
    position: { x: 150, y: 400 },
  },
];

const initialEdges: Edge[] = [
  {
    id: 'e0-0',
    source: '0',
    target: '1',
    animated: true,
    type: 'smoothstep',
    label: 'Hello World',
    markerEnd: {
      type: MarkerType.Arrow,
    },
  },
  { id: 'e1-2', source: '1', target: '2', label: 'this is an edge label' },
  { id: 'e1-3', source: '1', target: '3', animated: true },
  {
    id: 'e4-5',
    source: '4',
    target: '5',
    type: 'smoothstep',
    sourceHandle: 'handle-0',
    data: {
      selectIndex: 0,
    },
    markerEnd: {
      type: MarkerType.ArrowClosed,
    },
  },
  {
    id: 'e4-6',
    source: '4',
    target: '6',
    type: 'smoothstep',
    sourceHandle: 'handle-1',
    data: {
      selectIndex: 1,
    },
    markerEnd: {
      type: MarkerType.ArrowClosed,
    },
  },
];

const nodeTypes = { textUpdater: TextUpdaterNode };

const minimapStyle = {
  height: 50,
  width: 80,
};

function Flow() {
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);

  const onNodesChange = useCallback((changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)), [setNodes]);
  const onEdgesChange = useCallback((changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)), [setEdges]);
  const onConnect = useCallback((connection: Connection) => setEdges((eds) => addEdge(connection, eds)), [setEdges]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      fitView={true}
      style={{
        width: '100%',
        height: '100%',
        // animation: 'fadein 1s',
        // turn off animations
        animation: 'none',
      }}
      proOptions={{ hideAttribution: true }}
      onlyRenderVisibleElements={true}
    >
      <MiniMap style={minimapStyle} zoomable pannable />
      <Controls />
      <Background color="#aaa" gap={16} />
    </ReactFlow>
  );
}

function AppComponent(props: App): JSX.Element {
  return (
    <AppWindow app={props} lockToBackground={true}>
      <Flow />
    </AppWindow>
  );
}

function ToolbarComponent(props: App): JSX.Element {
  return <Box></Box>;
}

export default { AppComponent, ToolbarComponent };
