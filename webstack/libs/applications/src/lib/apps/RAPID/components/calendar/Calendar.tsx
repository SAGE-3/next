import React, { useState, useCallback } from 'react';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { Box, Button, Grid, Heading, HStack, VStack, Text, Flex, Input } from '@chakra-ui/react';

import { useColorMode } from '@chakra-ui/react';

interface CalendarProps {
  onDateSelect: (startDate: Date | null, endDate: Date | null) => void;
  selectedStartDate: Date | null;
  selectedEndDate: Date | null;
  onCancel?: () => void;
}
const Calendar: React.FC<CalendarProps> = ({ onDateSelect, selectedStartDate, selectedEndDate, onCancel }) => {
  const { colorMode } = useColorMode();

  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  const formatDate = (date: Date): string => {
    return date.toISOString().split('T')[0]; // Returns date in YYYY-MM-DD format
  };

  const [startDateInput, setStartDateInput] = useState(selectedStartDate ? formatDate(selectedStartDate) : '');
  const [endDateInput, setEndDateInput] = useState(selectedEndDate ? formatDate(selectedEndDate) : '');

  const handleDateClick = (day: number) => {
    const clickedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
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
      <VStack spacing={4} height="23rem" justifyContent="space-between">
        <Flex justify="space-between" width="100%">
          <Input
            placeholder="Start Date"
            value={startDateInput}
            onChange={(e) => handleInputChange(true, e.target.value)}
            size="sm"
            width="45%"
          />
          <Input
            placeholder="End Date"
            value={endDateInput}
            onChange={(e) => handleInputChange(false, e.target.value)}
            size="sm"
            width="45%"
          />
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
              >
                {day}
              </Button>
            );
          })}
        </Grid>
        <Box display="flex" justifyContent="end" width="100%" gap="2">
          <Button onClick={onCancel} isDisabled={!selectedEndDate}>
            Done
          </Button>
        </Box>
      </VStack>
    </Box>
  );
};

export default Calendar;
