/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { useAppStore } from '@sage3/frontend';
// import { Button } from '@chakra-ui/react';
import { AppSchema } from "../schema";

import { state as AppState } from "./index";
import './styles.css';

import { FetchData } from "./components/FetchData"
import { Tags } from "./components/Tags"
import { DataViz } from "./components/DataViz"
import { MessageCenter } from "./components/MessageCenter"
// import { FileLoad } from "./components/FileLoad"

export function DataTable(props: AppSchema): JSX.Element {

  const s = props.state as AppState;

  const updateState = useAppStore(state => state.updateState);
  const deleteApp = useAppStore(state => state.delete);

  // function handleAddClick() {
  //   updateState(props.id, { count: s.count + 1 })
  // }
  //
  // function handleSubClick() {
  //   updateState(props.id, { count: s.count - 1 })
  // }

  function handleClose() {
    deleteApp(props.id);
  }

  return (
    <div className="Table-Container">
        <h3>{props.name} - <button onClick={handleClose}>X</button></h3>

        <FetchData url={s.data}/>
        <button>Submit</button>

        <div className="Message-Container">
            <Tags data={s.data}/>
        </div>

        <DataViz data={s.data}/>

        <div className="Message-Container">
            <MessageCenter data={s.data}/>
        </div>

    </div>
  )
}

export default DataTable;