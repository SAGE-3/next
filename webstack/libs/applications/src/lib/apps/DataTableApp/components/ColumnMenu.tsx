import {
    Button, Menu, MenuButton, Portal, IconButton, MenuList, MenuItem,
} from '@chakra-ui/react'

import './styles.css'
import * as React from "react";
import {FiChevronDown, FiChevronRight} from "react-icons/fi";

import { colMenus } from "../colMenus";


export const ColumnMenu = (props: any) => {

    const header = props.header;

    function handleClick(header: string) {
        console.log("clicked! " + header)
    }


    const SubMenu = () => (
        <MenuList>
            {colMenus.map((data, key) => {
                return (
                        <MenuItem>
                            {/*<MenuButton as={Button}>*/}
                            {/*    {data.function}*/}
                            {/*</MenuButton>*/}

                            <MenuButton
                                as={Button}
                                aria-label='Actions'
                                size='xs'
                                variant='link'
                                // ml='20%'
                                onClick={(e) => handleClick(props.header)}
                            >
                            {data.function}
                            </MenuButton>

                            {/*<Menu>*/}
                            {/*<MenuButton*/}
                            {/*    as={IconButton}*/}
                            {/*    aria-label='options'*/}
                            {/*    icon={<FiChevronRight/>}*/}
                            {/*    variant='ghost'*/}
                            {/*    size='xs'*/}
                            {/*    ml='20%'*/}
                            {/*/>*/}
                            {/*<MenuList>*/}
                            {/*        {data.functions.map((vals, index) => {*/}
                            {/*            return (*/}
                            {/*                <MenuItem>*/}
                            {/*                    <MenuButton>{vals}</MenuButton>*/}

                            {/*                </MenuItem>*/}
                            {/*            )*/}
                            {/*        })*/}
                            {/*        }*/}
                            {/*</MenuList>*/}
                            {/*</Menu>*/}
                        </MenuItem>
                )
            })
            }
        </MenuList>
    )

    return (

        <Menu>
            {({ isOpen }) => (
                <>
                    <MenuButton
                        as={IconButton}
                        aria-label='Options'
                        size='sm'
                        variant='ghost'
                        icon={<FiChevronDown/>}
                        ml='20%'
                        isActive={isOpen}
                    />
                    <MenuItem as={SubMenu}/>
                </>
            )}
        </Menu>

    )
}