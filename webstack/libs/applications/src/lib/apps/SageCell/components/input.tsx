import { Input } from '@chakra-ui/react';

export function SageCellInput(props: any): JSX.Element {
  const { input, onChange } = props;
  return (
    <Input
      value={input}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Enter code here"
      size="lg"
      variant="filled"
      fontFamily="Menlo, Consolas"
    />
  );
}

// Websocket

// import { WebSocket } from 'ws';
// import { v1 } from 'uuid';

// const ws = new WebSocket('ws://localhost:8888/api/kernels/798fe98f-c3de-4242-bb4e-842c505be063?token=763656f13ad47423');
//2039a9308fb4:8888/?token=763656f13ad47423
