/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */
import {
  Text,
  Badge,
  Image,
  Alert,
  AlertIcon,
} from '@chakra-ui/react';

import Ansi from 'ansi-to-react';

/**
 *
 * @param output
 * @returns {JSX.Element}
 */
export const OutputBox = (output: any): JSX.Element => {
    
      return (
        <>
          {/**
           * TODO: Fix the display of the execution count
           */}
          {!output.execute_result ? null : (
            <Text fontSize="xs" color="gray.500" style={{
              fontFamily: 'monospace',
            }}>
            {/* <Badge colorScheme="green" rounded="sm" size="lg"> */}
              {`Out [${output.execute_result.execution_count}]`}
              {/* </Badge> */}
            </Text>
          )}
          {output.request_id ? null : null}
          {!output.error ? null : !Array.isArray(output.error) ? (
            <Alert status="error">{`${output.error.ename}: ${output.error.evalue}`}</Alert>
          ) : (
            <>
                  <Alert status="error" variant="left-accent">
                    <AlertIcon />
                    <Ansi>{output.error[output.error.length - 1]}</Ansi>
                  </Alert>
            </>
          )}

          {!output.stream ? null : output.stream.name === 'stdout' ? (
            <Text id="sc-stdout">{output.stream.text}</Text>
          ) : (
            // <Alert status="error">
              <Text id="sc-stderr" color="red">
                {output.stream.text}
              </Text>
            // </Alert>
          )}

          {!output.display_data
            ? null
            : Object.keys(output.display_data.data).map((key, i) => {
                switch (key) {
                  case 'text/plain':
                    return (
                      <Text key={i} id="sc-stdout">
                        {output.display_data.data[key]}
                      </Text>
                    );
                  case 'text/html':
                    return <div key={i} dangerouslySetInnerHTML={{ __html: output.display_data.data[key] }} />;
                  case 'image/png':
                    return <Image key={i} src={`data:image/png;base64,${output.display_data.data[key]}`} />;
                  case 'image/jpeg':
                    return <Image key={i} src={`data:image/jpeg;base64,${output.display_data.data[key]}`} />;
                  case 'image/svg+xml':
                    return <div key={i} dangerouslySetInnerHTML={{ __html: output.display_data.data[key] }} />;
                  case 'application/javascript':
                    return <Text>javascript not handled</Text>;
                  case 'text/latex':
                    return <Text>latex not handled</Text>;
                  default:
                    return <></>;
                }
              })}

          {!output.execute_result
            ? null
            : Object.keys(output.execute_result.data).map((key, i) => {
                switch (key) {
                  case 'text/plain':
                    return (
                      <Text key={i} id="sc-stdout">
                        {output.execute_result.data[key]}
                      </Text>
                    );
                  case 'text/html':
                    return <div key={i} dangerouslySetInnerHTML={{ __html: output.execute_result.data[key] }} />;
                  case 'image/png':
                    return <Image key={i} src={`data:image/png;base64,${output.execute_result.data[key]}`} />;
                  case 'image/jpeg':
                    return <Image key={i} src={`data:image/jpeg;base64,${output.execute_result.data[key]}`} />;
                  case 'image/svg+xml':
                    return <div key={i} dangerouslySetInnerHTML={{ __html: output.execute_result.data[key] }} />;
                  case 'application/javascript':
                    return <Text>javascript not handled</Text>;
                  case 'text/latex':
                    return <Text>latex not handled</Text>;
                  default:
                    return <></>;
                }
              })}
        </>
      );
};
