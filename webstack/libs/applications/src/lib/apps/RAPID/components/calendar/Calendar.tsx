import React, { useState, useCallback, useMemo } from 'react';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { Box, Button, Grid, Heading, HStack, VStack, Text, Flex, Input } from '@chakra-ui/react';

import { useColorMode } from '@chakra-ui/react';
import { set } from 'date-fns';

interface CalendarProps {
  onDateSelect: (startDate: Date | null, endDate: Date | null) => void;
  selectedStartDate: Date | null;
  selectedEndDate: Date | null;
  onCancel?: () => void;
}
const Calendar: React.FC<CalendarProps> = ({ onDateSelect, selectedStartDate, selectedEndDate, onCancel }) => {
  const { colorMode } = useColorMode();

  const today = useMemo(() => new Date(), []);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  const formatDate = (date: Date): string => {
    return date.toISOString().split('T')[0]; // Returns date in YYYY-MM-DD format
  };

  const [startDateInput, setStartDateInput] = useState(selectedStartDate ? formatDate(selectedStartDate) : '');
  const [endDateInput, setEndDateInput] = useState(selectedEndDate ? formatDate(selectedEndDate) : '');

  const handleDateClick = (day: number) => {
    const clickedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    if (!isDateValid(clickedDate)) return;

    if (!selectedStartDate || (selectedStartDate && selectedEndDate)) {
      // Start new selection
      onDateSelect(clickedDate, null);
      setStartDateInput(formatDate(clickedDate));
      setEndDateInput('');
    } else {
      // Complete the selection
      if (clickedDate < selectedStartDate) {
        onDateSelect(clickedDate, selectedStartDate);
        setStartDateInput(formatDate(clickedDate));
        setEndDateInput(formatDate(selectedStartDate));
      } else {
        onDateSelect(selectedStartDate, clickedDate);
        setEndDateInput(formatDate(clickedDate));
      }
    }
  };

  const handleInputChange = useCallback(
    (isStartDate: boolean, value: string) => {
      if (isStartDate) {
        setStartDateInput(value);
      } else {
        setEndDateInput(value);
      }

      const date = parseDate(value);
      if (date) {
        if (isStartDate) {
          onDateSelect(date, selectedEndDate);
        } else {
          onDateSelect(selectedStartDate, date);
        }
      }
    },
    [onDateSelect, selectedStartDate, selectedEndDate]
  );

  const parseDate = (dateString: string): Date | null => {
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? null : date;
  };

  const isDateValid = (date: Date): boolean => {
    return date <= today;
  };

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

  const prevMonth = (): void => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = (): void => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const isSelected = (day: number): boolean => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    return (
      (selectedStartDate !== null && date.getTime() === selectedStartDate.getTime()) ||
      (selectedEndDate !== null && date.getTime() === selectedEndDate.getTime())
    );
  };

  const isInRange = (day: number): boolean => {
    if (!selectedStartDate || !selectedEndDate) return false;
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    return date > selectedStartDate && date < selectedEndDate;
  };

  const isFutureDate = (day: number): boolean => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    return date > new Date();
  };

  const isStartDay = (day: number): boolean => {
    if (!selectedStartDate) return false;
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    return date.getTime() === selectedStartDate.getTime();
  };

  const isEndDay = (day: number): boolean => {
    if (!selectedEndDate) return false;
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    return date.getTime() === selectedEndDate.getTime();
  };

  return (
    <Box>
      <VStack spacing={4} height="25rem" justifyContent="space-between">
        <Flex justify="space-between" width="100%">
          <Box width="45%">
            <Text fontSize="xs">Start Date</Text>
            <Input
              placeholder="Start Date"
              value={startDateInput}
              onChange={(e) => handleInputChange(true, e.target.value)}
              size="sm"
              width="100%"
              max={formatDate(today)}
              cursor="default"
              isReadOnly={true} // TODO: here temporarily, need to fix edge cases
            />
          </Box>
          <Box width="45%">
            <Text fontSize="xs">End Date</Text>
            <Input
              placeholder="End Date"
              value={endDateInput}
              onChange={(e) => handleInputChange(false, e.target.value)}
              size="sm"
              width="100%"
              max={formatDate(today)}
              cursor="default"
              isReadOnly={true} // TODO: here temporarily, need to fix edge cases
            />
          </Box>
        </Flex>
        <HStack justifyContent="space-between" width="100%">
          <Button onClick={prevMonth} size="sm">
            <FaChevronLeft />
          </Button>
          <Heading size="md">{currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</Heading>
          <Button onClick={nextMonth} size="sm">
            <FaChevronRight />
          </Button>
        </HStack>
        <Grid templateColumns="repeat(7, 1fr)" width="100%">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <Text key={day} fontWeight="medium" color={colorMode === 'light' ? 'gray.500' : 'gray.200'} textAlign="center">
              {day}
            </Text>
          ))}
          {Array.from({ length: firstDayOfMonth }).map((_, i) => (
            <Box key={`empty-${i}`} height="8" />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const isFuture = isFutureDate(day);
            return (
              <Button
                key={day}
                onClick={() => handleDateClick(day)}
                size="sm"
                variant={isSelected(day) ? 'solid' : 'ghost'}
                colorScheme={isSelected(day) ? 'blue' : isInRange(day) ? 'blue' : 'gray'}
                bg={isInRange(day) ? 'blue.100' : undefined}
                borderRadius="none"
                borderLeftRadius={isStartDay(day) ? 'full' : 'none'}
                borderRightRadius={isEndDay(day) ? 'full' : 'none'}
                isDisabled={isFuture}
                opacity={isFuture ? 0.5 : 1}
              >
                {day}
              </Button>
            );
          })}
        </Grid>
        <Box display="flex" justifyContent="space-between" alignItems="start" width="100%" gap="2">
          <Text
            fontSize="xs"
            display="flex"
            alignItems="baseline"
            _hover={{ textDecoration: 'underline' }}
            cursor="pointer"
            onClick={() => {
              setStartDateInput('');
              setEndDateInput('');
              onDateSelect(null, null);
            }}
          >
            Clear Selection
          </Text>
          <Button onClick={onCancel} isDisabled={!selectedEndDate}>
            Done
          </Button>
        </Box>
      </VStack>
    </Box>
  );
};

export default Calendar;
