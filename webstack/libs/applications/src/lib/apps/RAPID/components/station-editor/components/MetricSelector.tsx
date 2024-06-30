import React, { useEffect, useState } from 'react';
import { Box, Select } from '@chakra-ui/react';
import { METRICS } from '../../../data/constants';
import { SelectedSensor } from '../StationEditorModal';

interface MetricSelectorProps {
  selectedSensors: SelectedSensor[];
  setSelectedMetric: React.Dispatch<React.SetStateAction<string | null>>;
  initialMetric: string | null;
  showLabel?: boolean;
  setAction?: (val: string) => void;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

const MetricSelector: React.FC<MetricSelectorProps> = ({
  selectedSensors,
  setSelectedMetric,
  initialMetric,
  showLabel = true,
  size = 'md',
  setAction,
}) => {
  const [metrics, setMetrics] = useState<React.ReactNode[] | null>(null);

  useEffect(() => {
    showConditionalMetrics();
  }, [selectedSensors]);

  function containsWaggleSensors() {
    return selectedSensors.some((sensor) => sensor.type === 'Waggle');
  }

  function containsMesonetSensors() {
    return selectedSensors.some((sensor) => sensor.type === 'Mesonet');
  }

  function showConditionalMetrics() {
    if (selectedSensors.length === 0) {
      setMetrics(null);
      return;
    }
    switch (true) {
      case containsWaggleSensors() && containsMesonetSensors():
        setMetrics(
          METRICS.filter((metric) => metric.waggle !== null && metric.mesonet !== null).map((metric) => (
            <option key={metric.name} value={JSON.stringify(metric)}>
              {metric.name}
            </option>
          ))
        );
        break;
      case containsWaggleSensors():
        setMetrics(
          METRICS.filter((metric) => metric.waggle !== null).map((metric) => (
            <option key={metric.name} value={JSON.stringify(metric)}>
              {metric.name}
            </option>
          ))
        );
        break;
      case containsMesonetSensors():
        setMetrics(
          METRICS.filter((metric) => metric.mesonet !== null).map((metric) => (
            <option key={metric.name} value={JSON.stringify(metric)}>
              {metric.name}
            </option>
          ))
        );
        break;
    }
  }

  return (
    <Box>
      {showLabel && <label htmlFor="metric">Metric</label>}
      <Select
        size={size}
        width="100%"
        name="metric"
        placeholder="Metric"
        value={initialMetric || undefined}
        onChange={(e) => {
          setSelectedMetric(e.target.value);
          if (setAction) {
            setAction(e.target.value);
          }
        }}
      >
        {metrics}
      </Select>
    </Box>
  );
};

export default MetricSelector;
