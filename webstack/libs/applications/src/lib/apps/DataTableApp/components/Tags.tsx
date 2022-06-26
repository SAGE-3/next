import {
    Checkbox,
    CheckboxGroup,
    HStack,
    Menu, MenuButton, IconButton, MenuList, MenuItem,
} from '@chakra-ui/react'

import './styles.css'
import * as React from "react";

import { GoKebabVertical } from "react-icons/go";
import {useState} from "react";


export const Tags = (props: any) => {

    const tags = props.tags

    function handleChange(info: string) {
        props.setMessages((info).charAt(0).toUpperCase() + (info).slice(1)+ ' tag selected')

    }

    return (
        <div>
            <CheckboxGroup colorScheme='green'>
                <HStack spacing='10' display='flex'>
                    {tags.map((tag: string) => (
                        <Checkbox value={tag} onChange={(e) => handleChange(tag)}>{tag}</Checkbox>
                    ))}
                    <Menu>
                        <MenuButton
                            as={IconButton}
                            aria-label='Table Operations'
                            icon={<GoKebabVertical/>}
                            position='absolute'
                            right='25px'
                        />
                        <MenuList>
                            <MenuItem>Table Operation</MenuItem>
                        </MenuList>
                    </Menu>
                </HStack>
            </CheckboxGroup>
        </div>

    )
}