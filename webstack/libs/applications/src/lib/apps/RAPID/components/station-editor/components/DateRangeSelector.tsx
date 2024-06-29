import React from 'react';
import { Box } from '@chakra-ui/react';
import DateRangePicker from '../../calendar/DateRangePicker';
import { DateRange } from '../StationEditorModal';

interface DateRangeSelectorProps {
  dateRange: DateRange;
  onDateRangeChange: (newDateRange: DateRange) => void;
  showLabel?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

const DateRangeSelector: React.FC<DateRangeSelectorProps> = ({ dateRange, onDateRangeChange, showLabel = true, size = 'md' }) => {
  const handleDateRangeChange = (newDateRange: DateRange) => {
    onDateRangeChange(newDateRange);
    console.log('New date range:', newDateRange);
  };

  return (
    <Box>
      {showLabel && <label htmlFor="time-range">Time Range</label>}
      <DateRangePicker size={size} onChange={handleDateRangeChange} dateRange={dateRange} />
    </Box>
  );
};

export default DateRangeSelector;
