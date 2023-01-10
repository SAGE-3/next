import {
  Node,
  Edge,
} from 'reactflow';

const position = { x: 0, y: 0 };
const edgeType = 'smoothstep';

export const initialNodes: Node[] = [
  {
    id: '1',
    type: 'aceNode',
    data: { label: 'input' },
    position: { x: 350, y: 50 },
  },
  {
    id: '2',
    data: { label: 'node 2' },
    position: { x: 50, y: 125 },
  },
  {
    id: '3',
    type: 'output',
    data: { label: 'output' },
    position: { x: 250, y: 325 },
  },
  { id: '4',
    type: 'output',
    data: { label: 'output' },
    position: { x: 250, y: 425 },
 },
];

export const initialEdges: Edge[] = [
  { id: 'edge1', source: '1', target: '2', type: edgeType, animated: true },
  { id: 'edge2', source: '1', target: '3', type: edgeType, animated: true },
  { id: 'edge3', source: '2', target: '3', type: edgeType, animated: true },
  { id: 'edge4', source: '2', target: '1', type: edgeType, animated: true },
  { id: 'edge5', source: '2', target: '4', type: edgeType, animated: true },
  { id: 'edge6', source: '4', target: '5', type: edgeType, animated: true },
];