// /**
//  * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
//  * University of Hawaii, University of Illinois Chicago, Virginia Tech
//  *
//  * Distributed under the terms of the SAGE3 License.  The full license is in
//  * the file LICENSE, distributed as part of this software.
//  */

// import { useState } from 'react';
// import { useAppStore } from '@sage3/frontend';
// import { Container, Button, Input } from '@chakra-ui/react';
// import { App, AppGroup } from '../../schema';

// import { state as AppState } from './index';
// import { AppWindow } from '../../components';

// // Styling
// import './styling.css';
// import { update } from 'plotly.js';
// import { count } from 'console';

// /* App component for counter-test */

// function AppComponent(props: App): JSX.Element {
//   // Extract state from props
//   const s = props.data.state as AppState;
//   const updateState = useAppStore((state) => state.updateState);

//   const incrementCount = () => {
//     updateState(props._id, {count: s.count + 1})
//   }

//   // States for inputs and result
//   const [firstInput, setFirstInput] = useState<string>('');
//   const [secondInput, setSecondInput] = useState<string>('');
//   const [result, setResult] = useState<number>(0);

//   // Handler for input change
//   const handleFirstInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     let value = e.target.value;
//     value = value.replace(/[^0-9-]/g, ''); // Filter out anything except numbers and dash
//     setFirstInput(value);
//   }
//   const handleSecondInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     let value = e.target.value;
//     value = value.replace(/[^0-9-]/g, ''); // Filter out anything except numbers and dash
//     setSecondInput(value);
//   }

//   // Functions for calculations
//   const addNumbers = () => {
//     const result = parseInt(firstInput) + parseInt(secondInput);
//     setResult(result);
//   }
//   const subtractNumbers = () => {
//     const result = parseInt(firstInput) - parseInt(secondInput);
//     setResult(result);
//   }
//   const multiplyNumbers = () => {
//     const result = parseInt(firstInput) * parseInt(secondInput);
//     setResult(result);
//   }
//   const divideNumbers = () => {
//     const result = parseInt(firstInput) / parseInt(secondInput);
//     setResult(result);
//   }

//   return (
//     <AppWindow app={props}>
//       <>
//         <Container maxW="xs" p="6">
//           {s.count}
//           <Input
//               placeholder={"Enter a first number"}
//               size="md"
//               variant="outline"
//               _placeholder={{ color: 'inherit' }}
//               onChange={handleFirstInputChange}
//               value={firstInput}
//             />
//           <Input
//               placeholder={"Enter a second number"}
//               size="md"
//               variant="outline"
//               _placeholder={{ color: 'inherit' }}
//               onChange={handleSecondInputChange}
//               value={secondInput}
//             />

//           <Button onClick={addNumbers}>+</Button>
//           <Button onClick={subtractNumbers}>-</Button>
//           <Button onClick={multiplyNumbers}>x</Button>
//           <Button onClick={divideNumbers}>/</Button>

//           <Button onClick={incrementCount}>Increment Count</Button>

//           <h1> Result : {result}</h1>
//         </Container>
//       </>
//     </AppWindow>
//   );
// }

// /* App toolbar component for the app counter-test */
// function ToolbarComponent(props: App): JSX.Element {
//   const s = props.data.state as AppState; // Get state information
//   const updateState = useAppStore((state) => state.updateState);

//   return (
//     <>
//     </>
//   );
// }

// /**
//  * Grouped App toolbar component, this component will display when a group of apps are selected
//  * @returns JSX.Element | null
//  */
// const GroupedToolbarComponent = (props: { apps: AppGroup }) => {
//   return null;
// };

// export default { AppComponent, ToolbarComponent, GroupedToolbarComponent };


import { useAppStore } from '@sage3/frontend';
import { Container, Button, Input } from '@chakra-ui/react';
import { App, AppGroup } from '../../schema';

import { state as AppState } from './index';
import { AppWindow } from '../../components';

// Styling
import './styling.css';

function AppComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);

  const handleFirstInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    value = value.replace(/[^0-9-]/g, ''); // Filter out anything except numbers and dash
    updateState(props._id, { firstInput: Number(value) }); // Globally update firstInput
  }

  const handleSecondInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    value = value.replace(/[^0-9-]/g, ''); // Filter out anything except numbers and dash
    updateState(props._id, { secondInput: Number(value) }) // Globally update secondInput
  }

  return (
    <AppWindow app={props}>
      <>
        <Container maxW="xs" p="6">
          <Input
              placeholder={"Enter the first number"}
              size="md"
              variant="outline"
              _placeholder={{ color: 'inherit' }}
              onChange={handleFirstInputChange}
              value={s.firstInput}
            />
          <Input
              placeholder={"Enter the second number"}
              size="md"
              variant="outline"
              _placeholder={{ color: 'inherit' }}
              onChange={handleSecondInputChange}
              value={s.secondInput}
            />

          <h1> Result : {s.result}</h1>
        </Container>
      </>
    </AppWindow>
  );
}

function ToolbarComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);

  const addNumbers = () => {
    const result = s.firstInput + s.secondInput;
    updateState(props._id, { result });
  }

  const subtractNumbers = () => {
    const result = s.firstInput - s.secondInput;
    updateState(props._id, { result });
  }

  const multiplyNumbers = () => {
    const result = s.firstInput * s.secondInput;
    updateState(props._id, { result });
  }

  const divideNumbers = () => {
    const result = s.firstInput / s.secondInput;
    updateState(props._id, { result });
  }

  return (
    <>
      <Button onClick={addNumbers}>+</Button>
      <Button onClick={subtractNumbers}>-</Button>
      <Button onClick={multiplyNumbers}>x</Button>
      <Button onClick={divideNumbers}>/</Button>
    </>
  );
}

const GroupedToolbarComponent = (props: { apps: AppGroup }) => {
  return null;
};

export default { AppComponent, ToolbarComponent, GroupedToolbarComponent };
