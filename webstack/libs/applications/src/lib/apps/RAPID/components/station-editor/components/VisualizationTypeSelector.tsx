import React from 'react';
import { Box, Select } from '@chakra-ui/react';

interface VisualizationTypeSelectorProps {
  setSelectedVisualizationType: React.Dispatch<React.SetStateAction<string | null>>;
  initialType: string | null;
}

const VisualizationTypeSelector: React.FC<VisualizationTypeSelectorProps> = ({ setSelectedVisualizationType, initialType }) => {
  return (
    <Box>
      <label htmlFor="visualization type">Visualization Type</label>
      <Select
        placeholder="Visualization Type"
        value={initialType || undefined}
        onChange={(e) => {
          setSelectedVisualizationType(e.target.value);
        }}
      >
        <option value="Line Graph">Line Graph</option>
        <option value="Overview">Overview</option>
      </Select>
    </Box>
  );
};

export default VisualizationTypeSelector;
