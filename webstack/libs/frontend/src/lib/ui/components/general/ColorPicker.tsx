/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { useState } from 'react';
import { Button, ButtonGroup } from '@chakra-ui/react';

import { SAGEColors, colors } from '@sage3/shared';
import { useHexColor } from '../../../hooks';
import { useUIStore } from '@sage3/frontend';

type ColorPickerProps = {
  selectedColor: SAGEColors;
  onChange: (newColor: SAGEColors) => void;
  size?: 'xs' | 'sm' | 'md' | 'lg';
};

export function ColorPicker(props: ColorPickerProps) {
  const [selectedColor, setSelectedColor] = useState<SAGEColors>(props.selectedColor);
  const setWhiteboardMode = useUIStore((state) => state.setWhiteboardMode);

  const handleChange = (color: SAGEColors) => {
    setSelectedColor(color);
    setWhiteboardMode(true);
    props.onChange(color);
  };

  return (
    <ButtonGroup isAttached size="xs" colorScheme="teal">
      {colors.map((color) => {
        const c = useHexColor(color);
        return (
          <Button
            key={c}
            value={c}
            bgColor={c}
            _hover={{ background: c, opacity: 0.7, transform: 'scaleY(1.2)' }}
            _active={{ background: c, opacity: 0.9 }}
            size={props.size ? props.size : 'md'}
            onClick={() => handleChange(color)}
            transform={selectedColor === color ? 'scaleY(1.2)' : 'scaleY(1)'}
          />
        );
      })}
    </ButtonGroup>
  );
}
