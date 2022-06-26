/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { useAppStore } from '@sage3/frontend';
import { App } from "../../schema";

import { state as AppState } from "./index";
import { AppWindow } from '../../components';
import './styles.css';

import { Tags } from "./components/Tags"
import { DataViz } from "./components/DataViz"
import { MessageCenter } from "./components/MessageCenter"
import * as React from "react";
import {useState} from "react";

function DataTableApp(props: App): JSX.Element {

    const s = props.data.state as AppState;

    const updateState = useAppStore(state => state.updateState);

    const [tags, setTags] = useState<any>([]);
    const [messages, setMessages] = useState<any>('...')


    return (
    <AppWindow app={props}>

        <>
        <div className="Subcomponent-Container">
            <Tags tags={tags} setMessages={setMessages}/>
        </div>

        <DataViz setTags={setTags} setMessages={setMessages}/>

        <div className="Message-Container">
            <MessageCenter messages={messages}/>
        </div>
        </>

    </AppWindow>
    )
}

export default DataTableApp;