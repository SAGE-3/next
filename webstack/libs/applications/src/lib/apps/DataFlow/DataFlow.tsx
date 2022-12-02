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

// import dagre from 'dagre';

import 'reactflow/dist/style.css';

import AceEditor from 'react-ace';
import { v5 as uuidv5 } from 'uuid';
import { initialNodes, initialEdges } from './nodes-edges';

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


function getNodeLength(node: Node): number {
  return node.data.code.length;
}

// const nodeTypes = { textUpdater: TextUpdaterNode };

const minimapStyle = {
  height: 50,
  width: 80,
};




import React from 'react';
import shallow from 'zustand/shallow';

import 'reactflow/dist/style.css';

import useStore from './store';
import ColorChooserNode from './ColorChooserNode';
import { motion } from 'framer-motion';

const nodeTypes = { colorChooser: ColorChooserNode };

const selector = (state: { nodes: Node[]; edges: Edge[]; onNodesChange: any; onEdgesChange: any; onConnect: any; }) => ({
  nodes: state.nodes,
  edges: state.edges,
  onNodesChange: state.onNodesChange,
  onEdgesChange: state.onEdgesChange,
  onConnect: state.onConnect,
});


function Flow() {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect } = useStore(selector, shallow);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      nodeTypes={nodeTypes}
      proOptions={{ hideAttribution: true }}
      fitView
    />
  );
}


function AppComponent(props: App): JSX.Element {

  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);

  const onNodesChange = useCallback((changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)), [setNodes]);
  const onEdgesChange = useCallback((changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)), [setEdges]);
  const onConnect = useCallback((connection: Connection) => setEdges((eds) => addEdge(connection, eds)), [setEdges]);

  return (
    <AppWindow app={props} lockToBackground={true}>
      <motion.div style={{ width: '100%', height: '100%', scale: .475}}>
     <Flow />
      {/* <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView={false}
        proOptions={{ hideAttribution: true }}
        onlyRenderVisibleElements={true}
      >
        <MiniMap style={minimapStyle} zoomable pannable />
        <Controls />
        <Background color="#aaa" gap={16}/>
      </ReactFlow> */}
    </motion.div>
    </AppWindow>
  );
}

function ToolbarComponent(props: App): JSX.Element {
  return <Box></Box>;
}

export default { AppComponent, ToolbarComponent };
