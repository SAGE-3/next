import {
    Menu, MenuButton, IconButton, MenuList, MenuItem,
} from '@chakra-ui/react'

import './styles.css'
import * as React from "react";
import {FiChevronDown, FiChevronRight} from "react-icons/fi";

import { colMenus } from "../colMenus";


export const ColumnMenu = () => {

    const SubMenu = () => (
        <MenuList mt='5px'>
            {colMenus.map((data, key) => {
                return (
                        <MenuItem>
                            {data.type}
                            <Menu>
                            <MenuButton
                                as={IconButton}
                                aria-label='options'
                                icon={<FiChevronRight/>}
                                variant='ghost'
                                size='xs'
                                ml='20%'
                            />
                            <MenuList>
                                    {data.actions.map((vals, index) => {
                                        return (
                                            <MenuItem>
                                                <MenuButton>{vals}</MenuButton>

                                            </MenuItem>
                                        )
                                    })
                                    }
                            </MenuList>
                            </Menu>
                        </MenuItem>
                )
            })
            }
        </MenuList>
    )

    return (
            <Menu>
                <MenuButton
                    as={IconButton}
                    aria-label='Options'
                    size='md'
                    variant='ghost'
                    icon={<FiChevronDown/>}
                    ml='20%'
                />
                <MenuItem as={SubMenu}/>
            </Menu>

    )
}