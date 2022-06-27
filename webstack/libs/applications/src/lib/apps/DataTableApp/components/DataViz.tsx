import {
    Badge,
    Button,
    Input,
    InputGroup,
    InputRightElement,
    Table,
    TableContainer,
    Thead,
    Tbody,
    Tr,
    Th,
    Td,
} from '@chakra-ui/react'

import './styles.css'
import * as React from "react";
import {useState} from "react";
import { ColumnMenu } from "./ColumnMenu"


export const DataViz = (props: any) => {
    const [inputVal, setInputVal] = useState('');
    const [items, setItems] = useState<any[]>([]);
    const [loaded, setLoaded] = useState(false);
    const [headers, setHeaders] = useState<any[]>([]);

    function handleSubmit() {
        console.log(inputVal)
        fetch(
            inputVal)
            .then((res) => res.json())
            .then((json) => {
                setItems(json)
                setLoaded(true)
                setHeaders(Object.keys(json[0]))
                props.setTags(headers)
            })
    }

    function handleNesting(child: []) {
        if (typeof Object.keys(child) === 'object') {
            Array.from(child).forEach(element => {
                console.log(Object.keys(element))
            })
        }
        return ""
    }

    function handleCellClick() {
        const cells = document.querySelectorAll('td');
        cells.forEach(cell => {
            cell.addEventListener('click', () =>
                props.setMessages("(Row: " + cell?.closest('tr')?.rowIndex + ", Column: " + cell.cellIndex + ")"))
        });
    }

    return (
        <div>
            <InputGroup size='md'>
                {!loaded ? <Badge fontSize='1.5em' variant='solid' colorScheme='red'>Not loaded</Badge>:<Badge fontSize='1.5em' variant='solid' colorScheme='green'>Loaded</Badge>}
                <Input
                type="text"
                value={inputVal}
                placeholder={'URL here'}
                onChange={(e) => setInputVal(e.target.value)}
                />
                <InputRightElement width='5rem'>
                    <Button variant='outline' onClick={handleSubmit}>Submit</Button>
                </InputRightElement>
            </InputGroup>
        <TableContainer overflowY="auto" display="flex" maxHeight="300px">
            <Table colorScheme="facebook" variant='simple'>
                <Thead>
                    <Tr>
                        {
                            headers.map((header: any, index: number) => (
                                <Th key={index}>
                                    {header}
                                    <ColumnMenu/>
                                </Th>
                            ))
                        }
                    </Tr>
                </Thead>

                <Tbody>
                        {
                            items.map((item, index) => (
                                    <Tr key={item.id}>
                                        {Object.values(item).map((itemChild: any, index) => (
                                            <>
                                                {(typeof itemChild === 'object') ?<Td key={index} data-col={headers[index % headers.length] }> {handleNesting(itemChild)} </Td> : <Td key={index} data-col={headers[index % headers.length] } onClick={handleCellClick}> {itemChild} </Td>}
                                            </>
                                        ))}
                                    </Tr>
                            ))
                        }
                </Tbody>
            </Table>
        </TableContainer>
        </div>
    )
}