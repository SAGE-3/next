/**
 * Copyright (c) SAGE3 Development Team 2025. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

/**
 * SAGE3 Clock Application Component
 * 
 * This component provides a real-time clock display with timezone support.
 * Features:
 * - Live time updates every second with automatic cleanup
 * - Support for multiple timezones with dynamic abbreviations
 * - 12/24 hour format toggle
 * - Automatic DST handling
 * - Theme-aware styling (light/dark mode)
 * - SVG-based clock face with D3.js manipulation
 * 
 * The component consists of:
 * - AppComponent: Main clock display
 * - ToolbarComponent: Timezone and format controls
 * - Helper functions: Timezone detection and formatting
 */

import { useEffect, useRef, useMemo } from 'react';
import {
  Select,
  Box,
  Switch,
  FormControl,
  FormLabel,
  useColorMode,
  useColorModeValue,
} from '@chakra-ui/react';
import * as d3 from 'd3';

import { SAGEColors } from '@sage3/shared';
import { useAppStore, useHexColor, ColorPicker } from '@sage3/frontend';

import { App } from '../../schema';
import { state as AppState } from './index';
import { AppWindow } from '../../components';
import { ReactComponent as Clock } from './clock.svg';

// ===============================================================================
// TIMEZONE HELPER FUNCTIONS
// These functions handle timezone detection, abbreviation generation, and formatting
// ===============================================================================

/**
 * Get all supported IANA timezone identifiers
 * 
 * Uses the modern Intl.supportedValuesOf API when available (Node 18+, modern browsers)
 * Falls back to a curated list of common timezones for older environments
 * 
 * @returns Array of IANA timezone identifiers (e.g., 'America/New_York')
 */
function getSupportedTimeZones(): string[] {
  try {
    // Use modern API if available (preferred method)
    const fn = (Intl as any)?.supportedValuesOf;
    if (typeof fn === 'function') {
      return fn.call(Intl, 'timeZone') as string[];
    }
  } catch {
    // Silently fall back to hardcoded list
  }

  // Fallback list covering major world timezones
  return [
    'UTC',
    'Pacific/Honolulu',
    'America/Los_Angeles',
    'America/Denver',
    'America/Chicago',
    'America/New_York',
    'Europe/London',
    'Europe/Paris',
    'Europe/Berlin',
    'Europe/Madrid',
    'Asia/Tokyo',
    'Asia/Shanghai',
    'Asia/Kolkata',
    'Australia/Sydney',
  ];
}

/**
 * Convert Intl.DateTimeFormat parts array to a keyed object
 * 
 * @param dt - Configured DateTimeFormat instance
 * @returns Object with part types as keys (e.g., {hour: '14', minute: '30', timeZoneName: 'PST'})
 */
function fmtParts(dt: Intl.DateTimeFormat) {
  return dt.formatToParts().reduce<Record<string, string>>((acc, p) => {
    if (p.type) acc[p.type] = p.value;
    return acc;
  }, {});
}

/**
 * Attempt to get timezone abbreviation using a specific format style
 * 
 * @param zone - IANA timezone identifier (e.g., 'America/New_York')
 * @param date - Date to get abbreviation for (important for DST)
 * @param name - Style of abbreviation to attempt:
 *               - 'short': PST, EST (most common)
 *               - 'shortGeneric': PT, ET (generic, no DST indication)
 *               - 'shortOffset': GMT-8, GMT-5 (offset-based)
 * @returns Timezone abbreviation string or null if format not supported
 */
function tryAbbrev(zone: string, date: Date, name: 'short' | 'shortGeneric' | 'shortOffset'): string | null {
  try {
    const dt = new Intl.DateTimeFormat('en-US', {
      timeZone: zone,
      timeZoneName: name,
      hour: '2-digit',
      minute: '2-digit',
    });
    const tz = fmtParts(dt).timeZoneName;
    return tz || null;
  } catch {
    // Return null if timezone/format combination is not supported
    return null;
  }
}

/**
 * Get the best available timezone abbreviation for a given zone and date
 * 
 * Tries multiple abbreviation formats in order of preference:
 * 1. 'short' - PST, EST (most user-friendly)
 * 2. 'shortGeneric' - PT, ET (fallback for unsupported short names)
 * 3. 'shortOffset' - GMT-8, GMT-5 (always available)
 * 4. synthesizeGMT - Custom GMT±HH:MM format (last resort)
 * 
 * @param zone - IANA timezone identifier
 * @param date - Current date (affects DST abbreviations)
 * @returns Best available timezone abbreviation
 */
function abbrFor(zone: string, date: Date): string {
  return (
    tryAbbrev(zone, date, 'short') ||
    tryAbbrev(zone, date, 'shortGeneric') ||
    tryAbbrev(zone, date, 'shortOffset') ||
    synthesizeGMT(zone, date)
  );
}

/**
 * Generate a GMT±HH:MM format timezone abbreviation
 * 
 * This is a fallback when no standard abbreviation is available.
 * Calculates the offset between UTC and the target timezone for the given date.
 * 
 * @param zone - IANA timezone identifier
 * @param date - Date to calculate offset for (handles DST correctly)
 * @returns GMT offset string (e.g., 'GMT-08:00', 'GMT+05:30')
 */
function synthesizeGMT(zone: string, date: Date): string {
  // Helper to get [hours, minutes] for a timezone at the given date
  const f = (tz: string) =>
    new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false })
      .format(date)
      .split(':')
      .map(Number);

  // Get time in both UTC and target timezone
  const [uh, um] = f('UTC');
  const [lh, lm] = f(zone);

  // Convert to minutes for easier calculation
  const utcMin = uh * 60 + um;
  const locMin = lh * 60 + lm;

  // Calculate difference, handling day boundary crossings
  let diff = locMin - utcMin;
  if (diff > 720) diff -= 1440;  // Crossed midnight forward
  if (diff < -720) diff += 1440; // Crossed midnight backward

  // Format as GMT±HH:MM
  const sign = diff >= 0 ? '+' : '-';
  const abs = Math.abs(diff);
  const hh = String(Math.floor(abs / 60)).padStart(2, '0');
  const mm = String(abs % 60).padStart(2, '0');
  return `GMT${sign}${hh}:${mm}`;
}

// ===============================================================================
// MAIN CLOCK COMPONENT
// Renders the clock display with real-time updates and timezone support
// ===============================================================================

function AppComponent(props: App): JSX.Element {
  // Extract state and setup hooks
  const s = props.data.state as AppState;
  const svgRef = useRef<SVGSVGElement>(null); // Reference to SVG clock element
  const updateState = useAppStore((state) => state.updateState);

  // Clock display constants
  const CLOCK_WIDTH = 320;
  const CLOCK_HEIGHT = 130;
  const CLOCK_ASPECT = CLOCK_WIDTH / CLOCK_HEIGHT; // For maintaining aspect ratio

  // Theme-aware color setup
  const { colorMode } = useColorMode();
  const primary = useColorModeValue('black', 'white');         // Primary text color
  const background = useColorModeValue('white', 'gray.900');   // Background color
  const border = useColorModeValue('#EEEEEE', '#2a2a2a'); // Border color

  // Prop value color
  const digColor = useHexColor(props.data.state.color);

  // Build time zones + current abbreviations once at component mount
  // This is memoized to avoid recalculating on every render
  const { timeZones, timeZoneAbbr } = useMemo(() => {
    const zones = getSupportedTimeZones();
    const now = new Date();
    const abbrs = zones.map((z) => abbrFor(z, now));
    return { timeZones: zones, timeZoneAbbr: abbrs };
  }, []);

  // Apply theme colors to SVG elements when color mode changes
  useEffect(() => {
    const svg = d3.select(svgRef.current);
    if (svg.empty()) return;

    // Style time digits with accent color
    svg.selectAll('text').attr('fill', digColor);
    // console.log("color: props.data.state.color ", props.data.state.color);
    // console.log('Setting clock digit color to', digColor);

    // Style border elements
    svg.select('#frame').attr('stroke', border)

    // Style secondary text elements (date, AM/PM, timezone) with primary color
    svg.select('#date').attr('fill', primary).attr('font-size', '16px');
    svg.select('#ampm').attr('fill', primary).attr('font-size', '16px');
    svg.select('#timezone').attr('fill', primary).attr('font-size', '16px');

    // Ensure background elements are transparent (let CSS handle background)
    svg.selectAll('#background, #bg, .bg, rect#background')
      .attr('fill', 'transparent')
      .attr('stroke', 'none');

  }, [colorMode, props.data.state.color]);

  // ===============================================================================
  // SVG UPDATE FUNCTIONS
  // These functions manipulate specific elements in the SVG clock face
  // ===============================================================================

  /**
   * Update numeric time digits in the SVG (hours, minutes)
   * @param id - SVG element ID (e.g., 'hour', 'minutes')
   * @param time - Numeric time value to display
   */
  const updateDigits = (id: string, time: number) => {
    const svgDoc = d3.select(svgRef.current);
    if (!svgDoc.empty()) {
      if (id === 'hour') {
        svgDoc.select('#' + id).text(time.toString());
      } else {
        svgDoc.select('#' + id).text(time.toString().padStart(2, '0'));
      }
    }
  };

  /**
   * Update timezone abbreviation display
   * @param abbr - Timezone abbreviation (e.g., 'PST', 'GMT-08:00')
   */
  const setTimeZoneText = (abbr: string) => {
    const svgDoc = d3.select(svgRef.current);
    if (!svgDoc.empty()) {
      // Replace underscores with spaces for better readability
      svgDoc.select('#timezone').text(abbr.replaceAll('_', ' '));
    }
  };

  /**
   * Update date display in the clock
   * @param month - Month index (0-11)
   * @param day - Day of month (1-31)
   * @param year - Full year (e.g., 2025)
   */
  const updateDate = (month: number, day: number, year: number) => {
    const monthList = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const svgDoc = d3.select(svgRef.current);
    if (!svgDoc.empty()) {
      svgDoc.select('#date').text(`${monthList[month]} ${day}, ${year}`);
    }
  };

  /**
   * Update AM/PM or 24H indicator
   * @param hours - Hour value (-1 for 24H mode, 0-23 for 12H mode)
   */
  const updateAmPm = (hours: number) => {
    const svgDoc = d3.select(svgRef.current);
    if (!svgDoc.empty()) {
      // Special case: hours < 0 indicates 24H mode
      const indicator = hours < 0 ? '24H' : hours >= 12 ? 'PM' : 'AM';
      svgDoc.select('#ampm').text(indicator);
    }
  };

  /**
   * Update all time/date displays for a specific timezone
   * This is the main function that coordinates all clock updates
   * @param timeZone - IANA timezone identifier
   * @param is24Hour - Whether to display in 24-hour format
   */
  const setTimeInTimezone = (timeZone: string, is24Hour: boolean) => {
    const date = new Date();

    // Get formatted date/time parts for the specified timezone
    const parts = Intl.DateTimeFormat('en-US', {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
      hour12: false, // Always get 24H format, we'll convert if needed
    }).formatToParts(date);

    // Convert parts array to keyed object for easier access
    const byType = Object.fromEntries(parts.map((p) => [p.type, p.value]));
    const month = parseInt(byType.month, 10) - 1; // Convert to 0-based month
    const day = parseInt(byType.day, 10);
    const year = parseInt(byType.year, 10);
    const hours = parseInt(byType.hour, 10); // 0-23
    const minutes = parseInt(byType.minute, 10);

    // Update displays based on format preference
    if (!is24Hour) {
      // 12-hour format: convert hours and show AM/PM
      updateAmPm(hours);
      const displayHour = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
      updateDigits('hour', displayHour);
      updateDigits('minutes', minutes);
      updateDate(month, day, year);
    } else {
      // 24-hour format: show hours as-is and indicate 24H mode
      updateAmPm(-1); // -1 signals 24H mode
      updateDigits('hour', hours);
      updateDigits('minutes', minutes);
      updateDate(month, day, year);
    }
  };

  // ===============================================================================
  // LIVE CLOCK EFFECT
  // Sets up real-time updates with proper cleanup and timezone validation
  // ===============================================================================

  useEffect(() => {
    // Early return if SVG ref not ready
    if (!svgRef.current) return;

    // Determine the timezone to use, with fallback to browser timezone
    const tzFromState = props.data.state.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    const isKnownIana = timeZones.includes(tzFromState);

    // Log warning for invalid timezones (helps with debugging)
    if (!isKnownIana) {
      console.warn(`Invalid or unknown timezone: ${tzFromState}; falling back to browser time zone.`);
    }

    // Use validated timezone
    const ianaTz = isKnownIana ? tzFromState : Intl.DateTimeFormat().resolvedOptions().timeZone;

    // Sync state with validated timezone if they differ
    if (props.data.state.timeZone !== ianaTz) {
      updateState(props._id, { timeZone: ianaTz });
    }

    // Track interval ID for proper cleanup
    let intervalId: number | null = null;

    /**
     * Update function called every second
     * Updates both time display and timezone abbreviation (important for DST changes)
     */
    const tick = () => {
      // Get current abbreviation (changes with DST)
      // const abbrNow = abbrFor(ianaTz, new Date());
      setTimeZoneText(ianaTz);

      // Update all time/date displays
      setTimeInTimezone(ianaTz, !!props.data.state.is24Hour);
    };

    // Initial update, then start interval
    tick();
    intervalId = window.setInterval(tick, 1000 * 10); // Update every 10 seconds

    // Cleanup function - called when component unmounts or dependencies change
    return () => {
      if (intervalId !== null) {
        window.clearInterval(intervalId);
        intervalId = null;
      }
    };
  }, [props._id, props.data.state.timeZone, props.data.state.is24Hour]);
  // Dependencies: Only re-run when app ID, timezone, or format changes

  return (
    <AppWindow app={props} lockAspectRatio={CLOCK_ASPECT}>
      <Box
        width="100%"
        height="100%"
        p={0}
        m={0}
        overflow="hidden"
        background={background}
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        {/* SVG Clock Face - styled and updated via D3 */}
        <Clock
          ref={svgRef}
          width="100%"
          height="100%"
          preserveAspectRatio="xMidYMid meet"
        />
      </Box>
    </AppWindow>
  );
}

function ToolbarComponent(props: App): JSX.Element {
  const updateState = useAppStore((state) => state.updateState);
  const locked = props.data.state.lock;

  // Build timezone list with abbreviations (same logic as AppComponent)
  // Memoized to avoid recalculation on every render
  const { timeZones, timeZoneAbbr } = useMemo(() => {
    const zones = getSupportedTimeZones();
    const now = new Date();
    const abbrs = zones.map((z) => abbrFor(z, now));
    return { timeZones: zones, timeZoneAbbr: abbrs };
  }, []);

  // Determine which timezone is currently selected
  const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const selected =
    props.data.state.timeZone && timeZones.includes(props.data.state.timeZone)
      ? props.data.state.timeZone
      : browserTz;

  /**
   * Handle timezone selection change
   * Updates the app state with the new timezone
   */
  const handleTimeZoneChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateState(props._id, { timeZone: e.target.value });
  };

  /**
   * Handle 24-hour format toggle
   * Updates the app state with the new format preference
   */
  const handle24HourToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateState(props._id, { is24Hour: e.target.checked });
  };

  /**
   * Handle digit color change
   * Updates the app state with the new digit color
   */
  const handleColorChange = (color: string) => {
    updateState(props._id, { color: color });
  }

  return (
    <div style={{ fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '0.5rem' }}>

        {/* Timezone Selection Dropdown */}
        <div style={{ fontWeight: 'bold' }}>
          <Select
            id="timezone-select"
            value={selected}
            onChange={handleTimeZoneChange}
            style={{ padding: '0.5rem', borderRadius: '8px', width: '280px', height: '34px' }}
          >
            {timeZones.map((tz, idx) => (
              <option key={tz} value={tz}>
                {/* Display format: "PST — America/Los Angeles" */}
                {timeZoneAbbr[idx]} — {tz.replaceAll('_', ' ')}
              </option>
            ))}
          </Select>
        </div>

        {/* 24-Hour Format Toggle */}
        <div style={{ fontSize: '0.8rem' }}>
          <FormControl display="flex" alignItems="center">
            <FormLabel mb="0" style={{ whiteSpace: 'nowrap', marginRight: '0.5rem' }}>
              24 Hour
            </FormLabel>
            <Switch
              id="is24Hours"
              isChecked={!!props.data.state.is24Hour}
              onChange={handle24HourToggle}
            />
          </FormControl>
        </div>
        <div style={{ marginLeft: 'auto', marginRight: '0.5rem' }}>
          <ColorPicker onChange={handleColorChange} selectedColor={props.data.state.color as SAGEColors} size="xs" disabled={locked} />
        </div>
      </div>
    </div>
  );
}

const GroupedToolbarComponent = () => null;

export default { AppComponent, ToolbarComponent, GroupedToolbarComponent };
