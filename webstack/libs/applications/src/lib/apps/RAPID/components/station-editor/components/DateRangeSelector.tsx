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
  showLabel?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

const DateRangeSelector: React.FC<DateRangeSelectorProps> = ({ dateRange, setDateRange, showLabel = true, size = "md" }) => {
  const handleDateRangeChange = (newDateRange: DateRange) => {
    setDateRange(newDateRange);
    console.log('New date range:', newDateRange);
  };

  return (
    <Box>
      {showLabel && <label htmlFor="time range">Time Range</label>}
      <DateRangePicker size={size} onChange={handleDateRangeChange} initialDateRange={dateRange} />
    </Box>
  );
};

export default DateRangeSelector;
