import React, { useState, useCallback, useMemo } from 'react';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { Box, Button, Grid, Heading, HStack, VStack, Text, Flex, Input } from '@chakra-ui/react';

import { useColorMode } from '@chakra-ui/react';
import { DateRange } from '../station-editor/StationEditorModal';

interface CalendarProps {
  onDateSelect: (startDate: Date | null, endDate: Date | null) => void;
  selectedStartDate: Date | null;
  selectedEndDate: Date | null;
  setAction?: (val: DateRange) => void;
  onCancel?: () => void;
}
const Calendar: React.FC<CalendarProps> = ({ onDateSelect, selectedStartDate, selectedEndDate, onCancel, setAction }) => {
  const { colorMode } = useColorMode();

  const today = useMemo(() => new Date(), []);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  const formatDate = (date: Date): string => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    const ss = String(date.getSeconds()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
  };

  const [startDateInput, setStartDateInput] = useState(selectedStartDate ? formatDate(selectedStartDate) : '');
  const [endDateInput, setEndDateInput] = useState(selectedEndDate ? formatDate(selectedEndDate) : '');

  const handleDateClick = (day: number) => {
    const clickedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    if (!isDateValid(clickedDate)) return;

    const adjustEndDate = (date: Date): Date => {
      const now = new Date();
      if (date.toDateString() === now.toDateString()) {
        // If it's today, use the current time
        return now;
      } else {
        // Set to 11:59:59 PM
        return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);
      }
    };

    if (!selectedStartDate || (selectedStartDate && selectedEndDate)) {
      // Start new selection
      onDateSelect(clickedDate, null);
      setStartDateInput(formatDate(clickedDate));
      setEndDateInput('');
    } else {
      // Complete the selection
      if (clickedDate < selectedStartDate) {
        const adjustedEndDate = adjustEndDate(selectedStartDate);
        onDateSelect(clickedDate, adjustedEndDate);
        setStartDateInput(formatDate(clickedDate));
        setEndDateInput(formatDate(adjustedEndDate));
      } else {
        const adjustedEndDate = adjustEndDate(clickedDate);
        onDateSelect(selectedStartDate, adjustedEndDate);
        setEndDateInput(formatDate(adjustedEndDate));
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

  const handleDone = () => {
    if (setAction && selectedStartDate && selectedEndDate) {
      setAction({ startDate: selectedStartDate, endDate: selectedEndDate });
    }
    if (onCancel) {
      onCancel();
    }
  };

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

    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();

    const startYear = selectedStartDate.getFullYear();
    const startMonth = selectedStartDate.getMonth();
    const startDay = selectedStartDate.getDate();

    const endYear = selectedEndDate.getFullYear();
    const endMonth = selectedEndDate.getMonth();
    const endDay = selectedEndDate.getDate();

    // Check if current date is after start date
    const isAfterStart =
      currentYear > startYear ||
      (currentYear === startYear && currentMonth > startMonth) ||
      (currentYear === startYear && currentMonth === startMonth && day > startDay);

    // Check if current date is before end date
    const isBeforeEnd =
      currentYear < endYear ||
      (currentYear === endYear && currentMonth < endMonth) ||
      (currentYear === endYear && currentMonth === endMonth && day < endDay);

    return isAfterStart && isBeforeEnd;
  };

  const isFutureDate = (day: number): boolean => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    return date > new Date();
  };

  const isStartDay = (day: number): boolean => {
    if (!selectedStartDate) return false;
    return (
      currentDate.getFullYear() === selectedStartDate.getFullYear() &&
      currentDate.getMonth() === selectedStartDate.getMonth() &&
      day === selectedStartDate.getDate()
    );
  };

  const isEndDay = (day: number): boolean => {
    if (!selectedEndDate) return false;
    return (
      currentDate.getFullYear() === selectedEndDate.getFullYear() &&
      currentDate.getMonth() === selectedEndDate.getMonth() &&
      day === selectedEndDate.getDate()
    );
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
                variant={isSelected(day) || isStartDay(day) || isEndDay(day) ? 'solid' : 'ghost'}
                colorScheme={isSelected(day) || isStartDay(day) || isEndDay(day) ? 'blue' : isInRange(day) ? 'blue' : 'gray'}
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
          <Button onClick={handleDone} isDisabled={!selectedEndDate}>
            Done
          </Button>
        </Box>
      </VStack>
    </Box>
  );
};

export default Calendar;
