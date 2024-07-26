type CsvTableType = {
  data: (string | number)[][];
};
import React from 'react';
import { TableContainer, Table, Thead, Tr, Th, Td, Tbody } from '@chakra-ui/react';

function CsvTable({ data }: CsvTableType) {
  return (
    <TableContainer>
      <Table variant="striped" colorScheme="teal">
        <Thead>
          <Tr>
            {data[0].map((d: string | number) => (
              <Th>{d}</Th>
            ))}
          </Tr>
        </Thead>
        <Tbody>
          {data.slice(1).map((row: (string | number)[], index: number) => (
            <Tr key={index}>
              {row.map((col: string | number, index) => (
                <Td key={index}>{col}</Td>
              ))}
            </Tr>
          ))}
        </Tbody>
      </Table>
    </TableContainer>
  );
}

export default CsvTable;
