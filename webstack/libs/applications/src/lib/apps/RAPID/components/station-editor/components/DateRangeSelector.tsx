// DateRangeSelector.tsx
import React from 'react';
import { Box } from '@chakra-ui/react';
import DateRangePicker from '../../calendar/DateRangePicker';

interface DateRange {
  startDate: Date | null;
  endDate: Date | null;
}

interface DateRangeSelectorProps {
  dateRange: DateRange;
  setDateRange: React.Dispatch<React.SetStateAction<DateRange>>;
}

const DateRangeSelector: React.FC<DateRangeSelectorProps> = ({ dateRange, setDateRange }) => {
  const handleDateRangeChange = (newDateRange: DateRange) => {
    setDateRange(newDateRange);
    console.log('New date range:', newDateRange);
  };

  return (
    <Box>
      <label htmlFor="time range">Time Range</label>
      <DateRangePicker onChange={handleDateRangeChange} initialDateRange={dateRange} />
    </Box>
  );
};

export default DateRangeSelector;
