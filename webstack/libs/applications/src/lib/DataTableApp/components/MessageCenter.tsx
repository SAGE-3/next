import {
    Alert,
    AlertIcon,
    AlertTitle,
    AlertDescription,
    Box,
    VStack, Th,
} from '@chakra-ui/react'

import './styles.css'
import * as React from "react";

export const MessageCenter = (props: any) => {

    const messages = props.messages;

    return (
        <VStack spacing={3}>
            {/*{*/}
            {/*    messages.map((message: string[], index: number) => (*/}
            {/*        <Alert key={index} status='success' variant='subtle'> {message} </Alert>*/}
            {/*    ))*/}
            {/*}*/}
            <Box
                fontWeight='bold'
            >
                Message Center
            </Box>
            <Alert status='info' variant='top-accent' colorScheme='telegram'>
                <AlertIcon />
                <AlertTitle>Feedback: </AlertTitle>
                <AlertDescription>{ messages }</AlertDescription>
                <AlertDescription></AlertDescription>
            </Alert>
        </VStack>

    )
}