/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import React, { useRef, useEffect, Suspense } from 'react';
import { Canvas, extend, ReactThreeFiber, useLoader, useThree } from 'react-three-fiber';
import { useSageAssetUrl, useSageStateAtom } from '@sage3/frontend/smart-data/hooks';
import { file, ThreejsViewerProps, threeState } from './metadata';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

export const ThreejsViewer = (props: ThreejsViewerProps): JSX.Element => {
  //state to move camera position. CameraUpdated to notify cameraControls to cause a rerender for the camera
  const cameraPosition = useSageStateAtom<threeState>(props.state.state);

  return (
    <Canvas style={{ backgroundColor: '#868687' }} camera={{ far: 10000, position: [0, 0, 150], fov: 75 }}>
      <Suspense fallback={null}>
        <LoadObj data={props.data.file} testThis={props.state.object} />
      </Suspense>
      <CameraControls cameraPosition={cameraPosition} />
      <ambientLight />
      <pointLight position={[10, 10, 10]} />
    </Canvas>
  );
};

const LoadObj = (props: { data: ThreejsViewerProps['data']['file']; testThis: any }) => {
  //Loads .obj file from props
  const file = useSageAssetUrl(props.data);

  //The actual object used to load model in canvas
  const object = useLoader(OBJLoader, file.data.url);

  return (
    <Suspense fallback={null}>
      <primitive object={object} />
    </Suspense>
  );
};
//declared namespace for vanilla java orbitControls to convert to React
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      orbitControls: ReactThreeFiber.Object3DNode<OrbitControls, typeof OrbitControls>;
    }
  }
}

extend({ OrbitControls });

//Component used for orbit controls and to set the camera position
const CameraControls = (props: {
  cameraPosition: {
    setData: (arg0: { cameraPosition: { x: number; y: number; z: number } }) => void;
    data: { cameraPosition: { x: number; y: number; z: number } };
  };
}) => {
  //reference to camera
  const {
    camera,
    gl: { domElement },
  } = useThree();

  const controls = useRef<HTMLDivElement>();
  const timeOut = useRef<NodeJS.Timer | undefined>(undefined);

  const handleChange = () => {
    if (timeOut.current) {
      clearTimeout(timeOut.current);
    }

    timeOut.current = setTimeout(() => {
      props.cameraPosition.setData({ cameraPosition: { x: camera.position.x, y: camera.position.y, z: camera.position.z } });
    }, 500);
  };

  //Update between clients whenever camera moves
  useEffect(() => {
    const node = controls.current;
    node?.addEventListener('change', handleChange);
    camera.position.set(
      props.cameraPosition.data.cameraPosition.x,
      props.cameraPosition.data.cameraPosition.y,
      props.cameraPosition.data.cameraPosition.z
    );
    camera.lookAt(0, 0, 0);
  }, [props.cameraPosition.data.cameraPosition]);

  return <orbitControls ref={controls} args={[camera, domElement]} />;
};
export default ThreejsViewer;
