import React from 'react';
import { Box } from '@chakra-ui/react';
import DateRangePicker from '../../calendar/DateRangePicker';
import { DateRange } from '../StationEditorModal';

interface DateRangeSelectorProps {
  dateRange: DateRange;
  onDateRangeChange: (newDateRange: DateRange) => void;
  showLabel?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  setAction?: (val: DateRange) => void;
}

const DateRangeSelector: React.FC<DateRangeSelectorProps> = ({
  dateRange,
  onDateRangeChange,
  showLabel = true,
  size = 'md',
  setAction,
}) => {
  const handleDateRangeChange = (newDateRange: DateRange) => {
    onDateRangeChange(newDateRange);
  };

  return (
    <Box>
      {showLabel && <label htmlFor="time-range">Time Range</label>}
      <DateRangePicker size={size} onChange={handleDateRangeChange} dateRange={dateRange} setAction={setAction} />
    </Box>
  );
};

export default DateRangeSelector;
