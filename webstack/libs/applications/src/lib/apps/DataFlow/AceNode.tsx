import { Box, Input, Text } from '@chakra-ui/react';
import React, { useCallback } from 'react';
import { Handle, Position } from 'reactflow';
import AceEditor from 'react-ace';

const handleStyle = { left: 10 };

function AceNode(): JSX.Element {
  const onChange = useCallback((event: { target: { value: any } }) => {
    console.log(event.target.value);
  }, []);

  return (
    <Box>
      <Handle type="target" position={Position.Top} />
      <Box>
        <AceEditor
          mode="python"
          theme="monokai"
          name="example"
          fontSize={14}
          showPrintMargin={false}
          showGutter={true}
          highlightActiveLine={false}
          value="print('hello world')"
          setOptions={{
            showLineNumbers: true,
            tabSize: 2,
          }}
          minLines={4}
          maxLines={5}
          width="100%"
        />
      </Box>
      <Handle type="source" position={Position.Bottom} id="a" style={handleStyle} />
      <Handle type="source" position={Position.Bottom} id="b" />
      <Handle type="source" position={Position.Left} id="c" />
    </Box>
  );
}
export default AceNode;
