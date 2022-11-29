/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */
import { useEffect, useState } from 'react';
import { VStack } from '@chakra-ui/react';
import { Canvas, NodeData, EdgeData, Node } from 'reaflow';

import { useAppStore, useAssetStore } from '@sage3/frontend';
import { Asset } from '@sage3/shared/types';

import { App } from '../../schema';
import { state as AppState } from './index';
import { AppWindow } from '../../components';
import { v1 } from 'uuid';
// Styling
import './styling.css';

/*
JSON:
  a string.
  a number.
  a boolean.
  an object.
  an array.
  null.
*/

function isFinal(obj: any): boolean {
  if (typeof (obj) === 'string' || typeof (obj) === 'number' || typeof (obj) === 'boolean' || obj === null || obj === undefined) {
    return true;
  }
  return false;
}

function colorFor(type: string): string {
  switch (type) {
    case 'string':
      return 'white';
    case 'number':
      return 'rgb(232, 196, 121)';
    case 'boolean':
      return 'rgb(170, 255, 0)';
    case 'array':
      return 'orange';
    case 'null':
      return 'rgb(147, 149, 152)';
    case 'object':
      return 'rgb(89, 184, 255)';
    default:
      return 'white';
  }
}

function getNodes(json_object: any, name: string, ret: NodeData[], edg: EdgeData[]): [NodeData[], EdgeData[]] {
  if (isFinal(json_object)) {
    const n: NodeData = {
      id: name,
      width: 275,
      height: 40,
      data: [{
        key: name,
        value: typeof json_object === 'string' ? `"${json_object}"` : json_object.toString(),
        type: typeof json_object,
        color: colorFor(typeof json_object),
        final: true, // array value
      }],
    };
    // get the parent name
    const path = name.split('.');
    path.pop();
    const parent = path.join('.');
    edg.push({ id: v1(), from: parent + '_arr', to: name });
    ret.unshift(n);
    return [ret, edg];
  }

  const fields = [];
  const keys = Object.keys(json_object).sort();
  for (const json_key of keys) {
    if (isFinal(json_object[json_key])) {
      if (json_object[json_key] === null) {
        // null
        const n = {
          key: json_key,
          value: 'null',
          type: typeof json_object[json_key],
          color: colorFor('null'),
          final: false,
        };
        fields.push(n);
      } else {
        // final
        const n = {
          key: json_key,
          value: typeof json_object[json_key] === 'string' ? `"${json_object[json_key]}"` : json_object[json_key].toString(),
          type: typeof json_object[json_key],
          color: colorFor(typeof json_object[json_key]),
          final: Array.isArray(json_object),
        };
        fields.push(n);
      }
    } else if (typeof (json_object[json_key]) === 'object' && !Array.isArray(json_object[json_key])) {
      // object
      const n: NodeData = {
        id: name + '.' + json_key + '_obj',
        width: 150,
        height: 40,
        data: [{
          key: json_key,
          value: 1,
          type: 'object',
          color: colorFor('object'),
          final: false,
        }],
      };
      ret.push(n);
      edg.push({ id: v1(), from: name, to: name + '.' + json_key + '_obj' });
      edg.push({ id: v1(), from: name + '.' + json_key + '_obj', to: name + '.' + json_key });
      getNodes(json_object[json_key], name + '.' + json_key, ret, edg);
    } else if (Array.isArray(json_object[json_key])) {
      // array
      const n: NodeData = {
        id: name + '.' + json_key + '_arr',
        width: 175,
        height: 40,
        data: [{
          key: json_key,
          value: json_object[json_key].length,
          type: 'array',
          color: colorFor('array'),
          final: false,
        }],
      };
      ret.push(n);
      edg.push({ id: v1(), from: name, to: name + '.' + json_key + '_arr' });
      const values = json_object[json_key];
      // cut array to 10 max
      // values.splice(10, values.length)
      values.forEach((value: any, index: number) => {
        if (Array.isArray(value)) {
          ret.push({
            id: name + '.' + json_key + index.toString(),
            width: 175,
            height: 40,
            data: [{
              key: index.toString(),
              value: value.length,
              type: 'array',
              color: colorFor('number'),
              final: true,
            }],
          });
          edg.push({
            id: v1(),
            from: name + '.' + json_key + '_arr',
            to: name + '.' + json_key + index.toString()
          });
          edg.push({
            id: v1(),
            from: name + '.' + json_key + index.toString(),
            to: name + '.' + json_key + '.' + index.toString()
          });
        }
        else if (!isFinal(value)) {
          // add an edge if the value is array/object
          edg.push({
            id: v1(),
            from: name + '.' + json_key + "_arr",
            to: name + '.' + json_key + '.' + index.toString()
          });
        }

        getNodes(value, name + '.' + json_key + '.' + index.toString(), ret, edg);
      });
    }
  }

  const n: NodeData = {
    id: name,
    width: 275,
    height: fields.length * 35,
    data: fields,
  };
  ret.unshift(n);
  return [ret, edg];
}


/* App component for JsonEx */

function AppComponent(props: App): JSX.Element {
  // App state
  const s = props.data.state as AppState;
  // Update the app
  const update = useAppStore((state) => state.update);
  // Asset store
  const assets = useAssetStore((state) => state.assets);
  // Get the asset
  const [file, setFile] = useState<Asset>();
  // Get the data
  const [data, setData] = useState<any>(null);

  const [nodes, setNodes] = useState<NodeData[]>([]);
  const [edges, setEdges] = useState<EdgeData[]>([]);

  // Get the asset from the state id value
  useEffect(() => {
    const myasset = assets.find((a) => a._id === s.assetid);
    if (myasset) {
      setFile(myasset);
      // Update the app title
      update(props._id, { title: myasset?.data.originalfilename });
    }
  }, [s.assetid, assets]);

  // Get the data from the asset
  useEffect(() => {
    if (file) {
      const localurl = '/api/assets/static/' + file.data.file;
      if (localurl) {
        fetch(localurl, {
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
        })
          .then(function (response) {
            return response.json();
          })
          .then(async function (json) {
            // save into the state
            setData(json);
          });
      }
    }
  }, [file]);

  useEffect(() => {
    if (data) {
      const [n, e] = getNodes(data, 'root', [], []);
      setNodes(n);
      setEdges(e);
    }
  }, data);

  return (
    <AppWindow app={props}>
      <div style={{
        position: 'absolute', top: 0, bottom: 0, left: 0, right: 0,
        // grid
        backgroundColor: "#0d0e17",
        backgroundSize: '20px 20px',
        backgroundImage: '-webkit-repeating-radial-gradient(top center, rgba(255,255,255,.1), rgba(255,255,255,.1) 1px, transparent 0, transparent 100%)',
      }}>
        <Canvas
          edges={edges}
          nodes={nodes}
          fit={true}
          zoomable={true}
          pannable={true}
          animated={true}
          readonly={true}
          direction={"RIGHT"}
          node={
            <Node>
              {event =>
                <foreignObject height={event.height} width={event.width} x={0} y={0}>
                  <VStack key={event.node.id} fontWeight="medium" p={2} align={"left"} overflow={"hidden"} whiteSpace={"nowrap"} textOverflow={"ellipsis"} >
                    {event.node.data.map((elt: any) => {
                      if (elt.type === 'array') {
                        return <span key={elt.key} style={{ color: "white" }}> <span style={{ color: elt.color }}> {elt.key}</span> (array {elt.value})</span>
                      } else if (elt.type === 'object') {
                        return <span key={elt.key} style={{ color: "white" }}> <span style={{ color: elt.color }}> {elt.key}</span> (object)</span>
                      } else if (elt.final) {
                        return <span key={elt.key} style={{ color: elt.color }}> {elt.value.toString()}</span>
                      } else {
                        return <span key={elt.key} style={{ color: elt.color }}><span style={{ color: "rgb(89, 184, 255)" }}>{elt.key}:</span> {elt.value}</span>
                      }
                    }
                    )}
                  </VStack>
                </foreignObject>
              }
            </Node>
          }
          onLayoutChange={layout => console.log('Layout', layout)}
        />
      </div>

    </AppWindow >
  );
}

/* App toolbar component for the app JsonEx */

function ToolbarComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);

  return (<></>);
}

export default { AppComponent, ToolbarComponent };
