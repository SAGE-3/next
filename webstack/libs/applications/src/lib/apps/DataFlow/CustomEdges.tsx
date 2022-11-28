// import React from 'react';
// import { EdgeProps, getSmoothStepPath, getMarkerEnd, Position, Node, XYPosition, getBezierPath } from 'reactflow';

// export type EdgeVariant = 'linear' | 'smoothstep' | 'bezier';

// type CustomEdgeProps = EdgeProps<{
//   label?: string;
//   variant: EdgeVariant;
// }>;

// type LinearEdgePathProps = {
//   sourceX: number;
//   sourceY: number;
//   targetX: number;
//   targetY: number;
// };

// type StepBezierEdgePathProps = LinearEdgePathProps & {
//   sourcePosition: Position;
//   targetPosition: Position;
// };

// type EdgePathCalculationProps = StepBezierEdgePathProps & {
//   variant: EdgeVariant;
// };

// // copied from 'rf src/container/EdgeRenderer/utils.ts'
// const getHandlePosition = (position: Position, node: Node, handle: any | null = null): XYPosition => {
//   const x = (handle?.x || 0) + node.__rf.position.x;
//   const y = (handle?.y || 0) + node.__rf.position.y;
//   const width = handle?.width || node.__rf.width;
//   const height = handle?.height || node.__rf.height;

//   switch (position) {
//     case Position.Top:
//       return {
//         x: x + width / 2,
//         y,
//       };
//     case Position.Right:
//       return {
//         x: x + width,
//         y: y + height / 2,
//       };
//     case Position.Bottom:
//       return {
//         x: x + width / 2,
//         y: y + height,
//       };
//     case Position.Left:
//       return {
//         x,
//         y: y + height / 2,
//       };
//   }
// };

// const getCustomEdgePath = ({
//   variant,
//   sourceX,
//   sourceY,
//   targetX,
//   targetY,
//   sourcePosition,
//   targetPosition,
// }: EdgePathCalculationProps): string => {
//   switch (variant) {
//     case 'bezier':
//       return getBezierPath({
//         sourceX,
//         sourceY,
//         sourcePosition,
//         targetX,
//         targetY,
//         targetPosition,
//       });
//     case 'smoothstep':
//       return getSmoothStepPath({
//         sourceX,
//         sourceY,
//         sourcePosition,
//         targetX,
//         targetY,
//         targetPosition,
//       });
//     case 'linear':
//       return `M ${sourceX},${sourceY}L ${targetX},${targetY}`;
//   }
// };

// const CustomEdge: React.FC<CustomEdgeProps> = ({
//   id,
//   style = {},
//   sourcePosition,
//   targetPosition,
//   data,
//   arrowHeadType,
//   markerEndId,
//   source,
//   target,
// }) => {
//   const nodes = useStoreState((state) => state.nodes);

//   const sourceNode = nodes.find((node) => node.id === source);
//   const sourceHandle = getHandlePosition(sourcePosition, sourceNode as Node, null);

//   const targetNode = nodes.find((node) => node.id === target);
//   const targetHandle = getHandlePosition(targetPosition, targetNode as Node, null);

//   const markerEnd = getMarkerEnd(arrowHeadType, markerEndId);

//   const edgePath = getCustomEdgePath({
//     sourceX: sourceHandle.x,
//     sourceY: sourceHandle.y,
//     sourcePosition,
//     targetX: targetHandle.x,
//     targetY: targetHandle.y,
//     targetPosition,
//     variant: data?.variant ?? 'bezier',
//   });

//   return (
//     <>
//       <path id={id} style={style} className="react-flow__edge-path" d={edgePath} markerEnd={markerEnd} />
//       {data?.label ? (
//         <text>
//           <textPath href={`#${id}`} style={{ fontSize: '12px' }} startOffset="50%" textAnchor="middle">
//             {data.label}
//           </textPath>
//         </text>
//       ) : null}
//     </>
//   );
// };
