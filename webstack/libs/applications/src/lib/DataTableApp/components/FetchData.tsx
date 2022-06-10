import * as React from "react";
import {useState} from "react";
import {
    Button,
    Input,
} from '@chakra-ui/react'

import './styles.css'

interface Props{
    heady:any;
}

export const FetchData = ({heady}:Props) =>  {
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
                setItems(json);
                setLoaded(true)
            })
        setInputVal('')
        setHeaders(Object.keys(items[0]))
        // {(!Array.isArray(items) || !items.length) ? <h1>Invalid json file, can't find headers</h1>: setHeaders(Object.keys(items[0]))}
        // console.log(headers)
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
        </div>

    )
}