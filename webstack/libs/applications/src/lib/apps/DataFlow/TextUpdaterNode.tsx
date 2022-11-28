import { Box, Input, Text } from '@chakra-ui/react';
import { useCallback } from 'react';
import { Handle, Position } from 'reactflow';

const handleStyle = { left: 10 };

function TextUpdaterNode(): JSX.Element {
  const onChange = useCallback((event: { target: { value: any } }) => {
    console.log(event.target.value);
  }, []);

  return (
    <Box className="text-updater-node">
      <Handle type="target" position={Position.Top} />
      <Box>
        <Text>Text:</Text>
        <Input id="text" name="text" onChange={onChange} />
      </Box>
      <Handle type="source" position={Position.Bottom} id="a" style={handleStyle} />
      <Handle type="source" position={Position.Bottom} id="b" />
      <Handle type="source" position={Position.Left} id="c" />
    </Box>
  );
}
export default TextUpdaterNode;
