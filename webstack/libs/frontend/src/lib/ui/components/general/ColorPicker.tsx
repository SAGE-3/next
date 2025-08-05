/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { CSSProperties, useEffect, useState } from 'react';
import { Button, ButtonGroup } from '@chakra-ui/react';

import { SAGEColors, colors } from '@sage3/shared';
import { useHexColor as getColor } from '../../../hooks';



type ColorPickerProps = {
  selectedColor: SAGEColors;
  onChange: (newColor: SAGEColors) => void;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  disabled?: boolean;
  style?: CSSProperties;
};

export function ColorPicker(props: ColorPickerProps) {
  const [selectedColor, setSelectedColor] = useState<SAGEColors>(props.selectedColor);

  // update the color if the selected color changes
  useEffect(() => {
    setSelectedColor(props.selectedColor);
  }, [props.selectedColor]);

  const handleChange = (color: SAGEColors) => {
    setSelectedColor(color);
    props.onChange(color);
  };

  // Color filter for users. Remove 'teal', 'cyan', and 'purple' from the colors array
  const availableColors = colors.filter((color) => color !== 'teal' && color !== 'cyan' && color !== 'purple');

  return (
    <ButtonGroup isAttached size="xs" colorScheme="teal" style={{ ...props.style }} display={'flex'}>
      {availableColors.map((color) => {
        const c = getColor(color);
        return (
          <Button
            flex={1}
            key={c}
            value={c}
            bgColor={c}
            isDisabled={props.disabled}
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
