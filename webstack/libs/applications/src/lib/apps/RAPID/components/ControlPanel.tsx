import React from 'react';
import { ComponentSelectorProps } from './ComponentSelector';
import { useAppStore } from '@sage3/frontend';
import { AppState } from '../../../types';
import { Button } from '@chakra-ui/react';

export type ControlPanelProps = {
  s: AppState;
  id: string;
}

function ControlPanel({ s, id}: ControlPanelProps ): JSX.Element {
  const { updateStateBatch } = useAppStore((state) => state);

  const handleIncreaseCounter = () => {
    console.log("clicked");
    const ps: Array<{ id: string; updates: Partial<AppState> }> = [];

    ps.push({ id: id, updates: { counter: s.counter + 1} })

    s.children.forEach((id: string) => {
      ps.push({ id: id, updates: { counter: s.counter + 1} })
    })

    updateStateBatch(ps);
  };

  return (
    <div>
      <h1>Control Panel</h1>
      <div>Counter: {s.counter}</div>
      <Button onClick={handleIncreaseCounter}>
        Increase Count
      </Button>
    </div>
  );
}

export default ControlPanel;
