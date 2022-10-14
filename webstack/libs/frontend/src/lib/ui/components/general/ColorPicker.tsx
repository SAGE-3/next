/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { Button, ButtonGroup } from '@chakra-ui/react';
import { SAGEColors, colors } from '@sage3/shared';
import { useState } from 'react';
import { useHexColor } from '../../../hooks';

type ColorPickerProps = {
  selectedColor: SAGEColors;
  onChange: (newColor: SAGEColors) => void;
};

export function ColorPicker(props: ColorPickerProps) {
  const [selectedColor, setSelectedColor] = useState<SAGEColors>(props.selectedColor);

  const handleChange = (color: SAGEColors) => {
    setSelectedColor(color);
    props.onChange(color);
  };

  return (
    <ButtonGroup isAttached size="xs" colorScheme="teal" py="2">
      {colors.map((color) => {
        const c = useHexColor(color);
        return (
          <Button
            key={c}
            value={c}
            bgColor={c}
            _hover={{ background: c, opacity: 0.7, transform: 'scaleY(1.3)' }}
            _active={{ background: c, opacity: 0.9 }}
            size="md"
            onClick={() => handleChange(color)}
            border={selectedColor === color ? '3px solid white' : 'none'}
            width="43px"
          />
        );
      })}
    </ButtonGroup>
  );
}
