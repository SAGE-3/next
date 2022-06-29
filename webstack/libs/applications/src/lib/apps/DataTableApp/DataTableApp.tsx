/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import {
    Alert,
    AlertIcon,
    AlertTitle,
    AlertDescription,
    Box,
    VStack,
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
    Checkbox,
    CheckboxGroup,
    HStack,
    Menu, MenuButton, IconButton, MenuList, MenuItem, Portal,
} from '@chakra-ui/react'

import { GoKebabVertical } from "react-icons/go";

import { useAppStore } from '@sage3/frontend';
import { App } from "../../schema";

import { state as AppState } from "./index";
import { AppWindow } from '../../components';
import './styles.css';

import * as React from "react";
import {useState} from "react";
import {ColumnMenu} from "./components/ColumnMenu";

function DataTableApp(props: App): JSX.Element {

    const s = props.data.state as AppState;

    const updateState = useAppStore(state => state.updateState);

    // const [messages, setMessages] = useState(s.messages);
    // const [items, setItems] = useState(s.items);
    // const [loaded, setLoaded] = useState(s.loaded);
    // const [headers, setHeaders] = useState(s.headers);
    // const [clicked, setClicked] = useState(s.clicked);
    // const [selected, setSelected] = useState(s.selected);
    const [inputVal, setInputVal] = useState(s.inputVal);
    const [checkedItems, setCheckedItems] = useState(s.checkedItems)


    function handleSubmit() {
        console.log(s.inputVal)
        fetch(
            inputVal)
            .then((res) => res.json())
            .then((json) => {
                // setItems(json)
                // setLoaded(true)
                // setHeaders(Object.keys(json[0]))
                updateState(props._id, { inputVal: inputVal });
                updateState(props._id, { items: json });
                updateState(props._id, { headers: Object.keys(json[0]) });
                updateState(props._id, { loaded: true });
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
        // setClicked(clicked)
        updateState(props._id, {clicked: clicked})
        const cells = document.querySelectorAll('td');
        cells.forEach(cell => {
            cell.addEventListener('click', () => {
                updateState(props._id, { messages: "(Row: " + cell?.closest('tr')?.rowIndex + ", Column: " + cell.cellIndex + ")" })
                // setMessages("(Row: " + cell?.closest('tr')?.rowIndex + ", Column: " + cell.cellIndex + ")")
            })
            // setMessages("(Row: " + cell?.closest('tr')?.rowIndex + ", Column: " + cell.cellIndex + ")")
        })
    }

    function handleChange(info: string) {
        const cols = document.querySelectorAll("td[data-col=" + info + "]")
        cols.forEach((cell: any) => {
                if (!s.checkedItems?.includes(info)) {
                    const checked = s.checkedItems.concat(info)
                    updateState(props._id, {checkedItems: checked})
                    updateState(props._id, { messages: (info).charAt(0).toUpperCase() + (info).slice(1)+ ' tag selected' });
                    cell.className= "highlight"

                    console.log("added: " + cell.cellIndex)
                    const added = s.selected?.concat(cell.cellIndex)
                    updateState(props._id, {selected: added})
                } else {
                    const unchecked = (() => (s.checkedItems?.filter((item: string) => item != info)))()
                    // setCheckedItems((checkedItems: string[]) => checkedItems.filter((item: string) => item != info))
                    updateState(props._id, {checkedItems: unchecked})
                    updateState(props._id, { messages: (info).charAt(0).toUpperCase() + (info).slice(1)+ ' tag unselected' });
                    cell.className = "originalChakra"
                    console.log("removed: " + cell.cellIndex)

                }
            }
        )
        // updateState(props._id, { checkedItems: checkedItems.concat(info) });
        // updateState(props._id, {checkedItems: s.checkedItems})
        console.log("s.checktedItems: " + s.checkedItems)
        console.log("s.selected: " + s.selected)
    }


    return (
    <AppWindow app={props}>

        <>
        <div className="Subcomponent-Container">
            <CheckboxGroup colorScheme='green'>
                <HStack spacing='10' display='flex' zIndex="dropdown">
                    {s.headers?.map((tag: any, index: number) => (
                        <Checkbox
                            value={tag}
                            onChange={(e) => handleChange(tag)}
                        >
                            {tag}
                        </Checkbox>
                    ))}
                    <Menu>
                        <MenuButton
                            as={IconButton}
                            aria-label='Table Operations'
                            icon={<GoKebabVertical/>}
                            position='absolute'
                            right='15px'
                            size="xs"
                        />
                        <Portal>
                            <MenuList>
                                <MenuItem>Console log col name</MenuItem>
                                <MenuItem>Sort</MenuItem>
                                <MenuItem>Compare</MenuItem>
                            </MenuList>
                        </Portal>
                    </Menu>
                </HStack>
            </CheckboxGroup>
        </div>
                <InputGroup size='md'>
                    {!s.loaded ? <Badge fontSize='1.5em' variant='solid' colorScheme='red'>Not loaded</Badge>:<Badge fontSize='1.5em' variant='solid' colorScheme='green'>Loaded</Badge>}
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
                    <Table colorScheme="facebook" variant='simple' size="sm">
                        <Thead>
                            <Tr>
                                {
                                    s.headers?.map((header: string, index: number) => (
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
                                s.items?.map((item: any, index: number) => (
                                    <Tr key={item.id}>
                                        {Object.values(item)?.map((itemChild: any, index) => (
                                            <>
                                                {(typeof itemChild === 'object') ?<Td key={index} data-col={s.headers[index % s.headers.length] }> {handleNesting(itemChild)} </Td> : <Td key={index} data-col={s.headers[index % s.headers.length] } onClick={() => handleCellClick(!s.clicked)}> {itemChild} </Td>}
                                            </>
                                        ))}
                                    </Tr>
                                ))
                            }
                        </Tbody>
                    </Table>
                </TableContainer>
        <div className="Message-Container">
            <VStack spacing={3}>
                <Box
                    fontWeight='bold'
                >
                    Message Center
                </Box>
                <Alert status='info' variant='top-accent' colorScheme='telegram'>
                    <AlertIcon />
                    <AlertTitle>Feedback: </AlertTitle>
                    <AlertDescription>{ s.messages }</AlertDescription>
                    <AlertDescription></AlertDescription>
                </Alert>
            </VStack>
        </div>
        </>

    </AppWindow>
    )
}

export default DataTableApp;