import React, { useState } from 'react';
import { Button, Flex, Popover, PopoverTrigger, PopoverContent, PopoverBody, Text, useDisclosure } from '@chakra-ui/react';
import { IoCalendarSharp } from 'react-icons/io5';
import Calendar from './Calendar';

interface DateRange {
  startDate: Date | null;
  endDate: Date | null;
}

interface DateRangePickerProps {
  onChange?: (range: DateRange) => void;
  initialDateRange?: DateRange;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

const DateRangePicker: React.FC<DateRangePickerProps> = ({ onChange, initialDateRange, size = 'md' }) => {
  const [dateRange, setDateRange] = useState<DateRange>(initialDateRange || { startDate: null, endDate: null });
  const { onClose, onOpen, isOpen } = useDisclosure();

  const handleDateSelect = (startDate: Date | null, endDate: Date | null) => {
    const newDateRange = { startDate, endDate };
    setDateRange(newDateRange);
    if (onChange) {
      onChange(newDateRange);
    }
  };

  const formatDate = (date: Date | null): string => {
    return date
      ? date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        })
      : '';
  };

  return (
    <Popover onClose={onClose} isOpen={isOpen} onOpen={onOpen}>
      <PopoverTrigger>
        <Button size={size} rightIcon={<IoCalendarSharp />} variant="outline" width="100%">
          <Flex width="100%">
            <Text>{formatDate(dateRange.startDate) || 'Start Date'}</Text>
            <Text mx={2}>-</Text>
            <Text>{formatDate(dateRange.endDate) || 'End Date'}</Text>
          </Flex>
        </Button>
      </PopoverTrigger>
      <PopoverContent width="auto">
        <PopoverBody>
          <Calendar
            onDateSelect={handleDateSelect}
            selectedStartDate={dateRange.startDate}
            selectedEndDate={dateRange.endDate}
            onCancel={onClose}
          />
        </PopoverBody>
      </PopoverContent>
    </Popover>
  );
};

export default DateRangePicker;
