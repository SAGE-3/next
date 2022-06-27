import {
    Checkbox,
    CheckboxGroup,
    HStack,
    Menu, MenuButton, IconButton, MenuList, MenuItem, Portal,
} from '@chakra-ui/react'

import './styles.css'
import * as React from "react";

import { GoKebabVertical } from "react-icons/go";


export const Tags = (props: any) => {

    const tags = Array.from(props.tags)

    function handleChange(e: React.ChangeEvent<HTMLInputElement>, info: string) {
        const cols = document.querySelectorAll("td[data-col=" + info + "]")
        console.log(e.target.checked)
        cols.forEach((cell) => {
            if (e.target.checked) {
                props.setMessages((info).charAt(0).toUpperCase() + (info).slice(1)+ ' tag selected')
                cell.className= "highlight"
            } else {
                cell.className = "css-159t4jc"
                props.setMessages((info).charAt(0).toUpperCase() + (info).slice(1)+ ' tag unselected')
            }
            }
        )
    }

    return (
        <div>
            <CheckboxGroup colorScheme='green'>
                <HStack spacing='10' display='flex' zIndex="dropdown">
                    {tags?.map((tag: any) => (
                        <Checkbox value={tag} onChange={(e) => handleChange(e, tag)}>{tag}</Checkbox>
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

    )
}