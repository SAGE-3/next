import {
    Alert,
    AlertIcon,
    AlertTitle,
    AlertDescription,
    Stack,
} from '@chakra-ui/react'

import './styles.css'

interface Props{
    data:any;
}


export const MessageCenter = ({data}:Props) => {

    return (
        <Stack spacing={3}>
            <Alert status='success' variant='subtle'>
                This is where user feedback will be displayed!
            </Alert>
            <Alert status='success' variant='subtle'>
                Cool Message!
            </Alert>
            <Alert status='success' variant='subtle'>
                Maybe old messages will fade away?
            </Alert>
        </Stack>
    )
}