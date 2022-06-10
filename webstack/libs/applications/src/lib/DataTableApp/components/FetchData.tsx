import * as React from "react";
import {useEffect, useRef, useState} from "react";
import {
    Button,
    Input,
} from '@chakra-ui/react'

import './styles.css'

interface Props{
    url:any;
}

export const FetchData = ({url}:Props) =>  {
    const [inputVal, setInputVal] = useState('')
    const [items, setItems] = useState<any[]>([]);
    const [loaded, setLoaded] = useState(false);

    // useEffect(() => {
    //     fetch(
    //         inputVal)
    //         .then((res) => res.json())
    //         .then((json) => {
    //             setItems(json);
    //             setLoaded(true)
    //         })
    //     }
    // )

    function handleSubmit(e: any) {
        console.log(e)
        console.log(inputVal)
        fetch(
            inputVal)
            .then((res) => res.json())
            .then((json) => {
                setItems(json);
                setLoaded(true)
            })
        setInputVal('')
    }

    return (
        <div>
            {!loaded ? <h1>Not loaded</h1>:<h1>Loaded</h1>}
            <Input
                type="text"
                value={inputVal}
                placeholder={'Fetch data from API'}
                onChange={(e) => setInputVal(e.target.value)}
            />
            <Button size='sm' variant='outline' onClick={handleSubmit}>Submit</Button>
            {
            items.map((item) => (
            <ol key = { item.id } >
                headerNames = { item.keys },
                User_Name: { item.username },
                Full_Name: { item.name },
                User_Email: { item.email }
            </ol>

            ))
        }
        </div>

    )
}