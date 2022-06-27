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
import {useEffect, useRef, useState} from "react";
import { ColumnMenu } from "./ColumnMenu"


export const DataViz = (props: any) => {
    // const inputVal = props.inputVal
    // const items = props.items
    // const loaded = props.loaded
    // const headers = props.headers
    // const clicked = props.clicked


    function handleSubmit() {
        console.log(props.inputVal)
        // props.setInputVal()
        fetch(
            props.inputVal)
            .then((res) => res.json())
            .then((json) => {
                props.setItems(json)
                props.setLoaded(true)
                props.setHeaders(Object.keys(json[0]))
                props.setTags(props.headers)
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

    function handleCellClick(clicked: boolean) {
        props.setClicked(clicked)
        const cells = document.querySelectorAll('td');
        cells.forEach(cell => {
            cell.addEventListener('click', () =>
                props.setMessages("(Row: " + cell?.closest('tr')?.rowIndex + ", Column: " + cell.cellIndex + ")"))
        })
    }

    // useEffect(() => {
    //     function handleCellClick() {
    //         const cells = document.querySelectorAll('td');
    //         cells.forEach(cell => {
    //             cell.addEventListener('click', () =>
    //                 props.setMessages("(Row: " + cell?.closest('tr')?.rowIndex + ", Column: " + cell.cellIndex + ")"))
    //         })
    //     }
    //     const click = click_ref.current
    //     click?.handleCellClick;
    // }, [props.messages]);

    return (
        <div>
            <InputGroup size='md'>
                {!props.loaded ? <Badge fontSize='1.5em' variant='solid' colorScheme='red'>Not loaded</Badge>:<Badge fontSize='1.5em' variant='solid' colorScheme='green'>Loaded</Badge>}
                <Input
                type="text"
                value={props.inputVal}
                placeholder={'URL here'}
                onChange={(e) => props.setInputVal(e.target.value)}
                />
                <InputRightElement width='5rem'>
                    <Button variant='outline' onClick={handleSubmit}>Submit</Button>
                </InputRightElement>
            </InputGroup>
        <TableContainer overflowY="auto" display="flex" maxHeight="300px">
            <Table colorScheme="facebook" variant='simple' size="sm">
                <Thead>
                    <Tr>
                        {
                            props.headers?.map((header: any, index: number) => (
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
                            props.items?.map((item: any, index: number) => (
                                    <Tr key={item.id}>
                                        {Object.values(item)?.map((itemChild: any, index) => (
                                            <>
                                                {(typeof itemChild === 'object') ?<Td key={index} data-col={props.headers[index % props.headers.length] }> {handleNesting(itemChild)} </Td> : <Td key={index} data-col={props.headers[index % props.headers.length] } onClick={() => handleCellClick(!props.clicked)}> {itemChild} </Td>}
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