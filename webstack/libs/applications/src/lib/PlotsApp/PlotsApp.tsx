/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { useAppStore } from '@sage3/frontend';
import { Button } from '@chakra-ui/react';
import { AppSchema } from "../schema";

import { state as AppState } from "./index";
import './styles.css';


import Plot from 'react-plotly.js';

import { Divider } from '@chakra-ui/react'


export function PlotsApp(props: AppSchema): JSX.Element {

  const s = props.state as AppState;

  const updateState = useAppStore(state => state.updateState);
  const deleteApp = useAppStore(state => state.delete);

  const plotProps = {width: 960, height: 600, title: 'Ploty Plot Plot'}
  const pieProps = {width: 960, height: 600, title: 'Pies Pies Pies'}

  function handleX(ev: React.ChangeEvent<HTMLInputElement>) {
    updateState(props.id, { x:  ev.target.value.split(',').map(n => parseInt(n,10)) })
  }

  function handleY(ev: React.ChangeEvent<HTMLInputElement>) {
      updateState(props.id, { y:  ev.target.value.split(',').map(n => parseInt(n,10)) })
  }

  function handleClose() {
    deleteApp(props.id);
  }

  return (
    <div className="Plots-Container">
        <h3>{props.name}<button onClick={handleClose}>X</button></h3>
        <Divider orientation='horizontal' />

        <p>X Values:</p>
            <input id="xVal" name="xVal" onChange={handleX}/>
            <p>Y Values:</p>
                <input id="yVal" name="yVal" onChange={handleY}/>
        <Divider orientation='horizontal' />
        <div className="Plots-Container">
            <Plot
                data = {[
                    {
                        x: s.x,
                        y: s.y,
                        type: 'scatter',
                        mode: 'lines+markers',
                        marker: {color: 'red'},
                    }
                ]}

                layout={ plotProps }
            />
        </div>

        <div className="Plots-Container">
            <Plot
                data = {[
                    {
                        values: [19, 26, 55],
                        labels: ['Residential', 'Non-Residential', 'Utility'],
                        type: 'pie'
                    }
                ]}

                layout={ pieProps }
            />
        </div>



    </div>


  )
}

export default PlotsApp;