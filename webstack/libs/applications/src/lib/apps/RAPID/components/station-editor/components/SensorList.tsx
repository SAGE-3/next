import React from 'react';
import { Box, Input, Text, Button } from '@chakra-ui/react';
import { SelectedSensor } from '../StationEditorModal';

interface SensorListProps {
  selectedSensors: SelectedSensor[];
  setSelectedSensors: React.Dispatch<React.SetStateAction<SelectedSensor[]>>;
}

const SensorList: React.FC<SensorListProps> = ({ selectedSensors, setSelectedSensors }) => {
  return (
    <Box display="flex" flexDir="column" gap="3">
      <h3>Select Sensors</h3>
      <Input placeholder="Search" />
      <hr />
      <Box display="flex" justifyContent="space-between" alignItems="baseline">
        <h3>Selected Sensors</h3>
        <Text
          fontSize="xs"
          backgroundColor="transparent"
          _hover={{ textDecoration: 'underline' }}
          cursor="pointer"
          onClick={() => setSelectedSensors([])}
        >
          Clear
        </Text>
      </Box>
      <Box overflow="auto" height="200px">
        {selectedSensors.length > 0 ? (
          selectedSensors.map((sensor) => (
            <Box display="flex" justifyContent="space-between" marginY="2" key={`${sensor.type}-${sensor.id}`}>
              <p>{`${sensor.type}: ${sensor.id}`}</p>
              <Button
                size="xs"
                onClick={() => setSelectedSensors(selectedSensors.filter((s) => !(s.id === sensor.id && s.type === sensor.type)))}
              >
                Remove
              </Button>
            </Box>
          ))
        ) : (
          <p>No sensors selected. Please select sensors by clicking on them on the map, or search for a station.</p>
        )}
      </Box>
      <hr />
    </Box>
  );
};

export default SensorList;