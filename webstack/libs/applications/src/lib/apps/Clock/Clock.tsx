// path: src/apps/clock/AppComponent.tsx
/**
 * Copyright (c) SAGE3 Development Team 2022.
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 * Distributed under the SAGE3 License.
 */

import { useEffect, useRef } from 'react';
import { Select, Box, Switch, FormControl, FormLabel } from '@chakra-ui/react';

import { useAppStore } from '@sage3/frontend';
import { App } from '../../schema';

import { state as AppState } from './index';
import { AppWindow } from '../../components';

// D3 library
import * as d3 from 'd3';
// SVG clock file
import { ReactComponent as Clock } from './clock.svg';

// List of timezones (IANA IDs)
const timeZones: string[] = [
  'Pacific/Pago_Pago',
  'Pacific/Honolulu',
  'America/Juneau',
  'America/Los_Angeles',
  'America/Tijuana',
  'America/Vancouver',
  'America/Phoenix',
  'America/Denver',
  'America/Edmonton',
  'America/Chicago',
  'America/Winnipeg',
  'America/Mexico_City',
  'America/New_York',
  'America/Toronto',
  'America/Lima',
  'America/Bogota',
  'America/Caracas',
  'America/Halifax',
  'America/St_Johns',
  'America/Sao_Paulo',
  'Atlantic/Azores',
  'Atlantic/Cape_Verde',
  'Africa/Casablanca',
  'Europe/London',
  'Europe/Madrid',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Rome',
  'Europe/Zurich',
  'Europe/Athens',
  'Europe/Bucharest',
  'Europe/Moscow',
  'Asia/Jerusalem',
  'Asia/Istanbul',
  'Asia/Amman',
  'Africa/Cairo',
  'Asia/Jeddah',
  'Asia/Baghdad',
  'Asia/Tehran',
  'Asia/Dubai',
  'Asia/Kabul',
  'Asia/Karachi',
  'Asia/Calcutta',
  'Asia/Kolkata',
  'Asia/Kathmandu',
  'Asia/Dhaka',
  'Asia/Rangoon',
  'Asia/Bangkok',
  'Asia/Jakarta',
  'Asia/Hong_Kong',
  'Asia/Shanghai',
  'Asia/Singapore',
  'Asia/Taipei',
  'Asia/Tokyo',
  'Asia/Seoul',
  'Australia/Adelaide',
  'Australia/Darwin',
  'Australia/Sydney',
  'Australia/Brisbane',
  'Pacific/Guam',
  'Pacific/Port_Moresby',
  'Pacific/Fiji',
  'Pacific/Auckland',
];

const timeZoneAbbr: string[] = [
  'SST', // Pacific/Pago_Pago
  'HST', // Pacific/Honolulu
  'AKDT', // America/Juneau
  'PDT', // America/Los_Angeles
  'PDT', // America/Tijuana
  'PDT', // America/Vancouver
  'MST', // America/Phoenix
  'MDT', // America/Denver
  'MDT', // America/Edmonton
  'CDT', // America/Chicago
  'CDT', // America/Winnipeg
  'CDT', // America/Mexico_City
  'EDT', // America/New_York
  'EDT', // America/Toronto
  'PET', // America/Lima
  'COT', // America/Bogota
  'VET', // America/Caracas
  'ADT', // America/Halifax
  'NST', // America/St_Johns
  'BRT', // America/Sao_Paulo
  'AZOT', // Atlantic/Azores
  'CVT', // Atlantic/Cape_Verde
  'WET', // Africa/Casablanca
  'BST', // Europe/London
  'CEST', // Europe/Madrid
  'CEST', // Europe/Paris
  'CEST', // Europe/Berlin
  'CEST', // Europe/Rome
  'CEST', // Europe/Zurich
  'EEST', // Europe/Athens
  'EEST', // Europe/Bucharest
  'MSK', // Europe/Moscow
  'IDT', // Asia/Jerusalem
  'TRT', // Asia/Istanbul
  'EEST', // Asia/Amman
  'EET', // Africa/Cairo
  'AST', // Asia/Jeddah
  'AST', // Asia/Baghdad
  'IRST', // Asia/Tehran
  'GST', // Asia/Dubai
  'AFT', // Asia/Kabul
  'PKT', // Asia/Karachi
  'IST', // Asia/Calcutta
  'IST', // Asia/Kolkata
  'NPT', // Asia/Kathmandu
  'BST', // Asia/Dhaka
  'MMT', // Asia/Rangoon
  'ICT', // Asia/Bangkok
  'WIB', // Asia/Jakarta
  'HKT', // Asia/Hong_Kong
  'CST', // Asia/Shanghai
  'SGT', // Asia/Singapore
  'CST', // Asia/Taipei
  'JST', // Asia/Tokyo
  'KST', // Asia/Seoul
  'ACST', // Australia/Adelaide
  'ACST', // Australia/Darwin
  'AEST', // Australia/Sydney
  'AEST', // Australia/Brisbane
  'ChST', // Pacific/Guam
  'PGT', // Pacific/Port_Moresby
  'FJT', // Pacific/Fiji
  'NZST', // Pacific/Auckland
];

/* App component for Clock */
function AppComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const svgRef = useRef<SVGSVGElement>(null);
  const updateState = useAppStore((state) => state.updateState);

  const CLOCK_WIDTH = 320;
  const CLOCK_HEIGHT = 160;
  const CLOCK_ASPECT = CLOCK_WIDTH / CLOCK_HEIGHT;

  // Keep window aspect ratio consistent with the SVG
  useEffect(() => {
    const { width, height, depth } = props.data.size;
    const currentAspect = width / height;
    if (width !== CLOCK_WIDTH || height !== CLOCK_HEIGHT || Math.abs(currentAspect - CLOCK_ASPECT) > 0.01) {
      const newHeight = Math.round(width / CLOCK_ASPECT);
      updateState(props._id, { size: { width, height: newHeight, depth: depth ?? 0 } });
    }
  }, [props.data.size.width, props.data.size.height, props.data.size.depth, props._id, updateState]);

  const updateDigits = (id: string, time: number) => {
    const svgDoc = d3.select(svgRef.current);
    if (!svgDoc.empty()) svgDoc.select('#' + id).text(time.toString().padStart(2, '0'));
  };

  const setTimeZoneText = (timeZoneAbbreviation: string) => {
    const svgDoc = d3.select(svgRef.current);
    if (!svgDoc.empty()) svgDoc.select('#timezone').text(timeZoneAbbreviation.replaceAll('_', ' '));
  };

  const updateDate = (month: number, day: number, year: number) => {
    const monthList = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const svgDoc = d3.select(svgRef.current);
    if (!svgDoc.empty()) svgDoc.select('#date').text(`${monthList[month]} ${day}, ${year}`);
  };

  const updateAmPm = (hours: number) => {
    const svgDoc = d3.select(svgRef.current);
    if (!svgDoc.empty()) svgDoc.select('#ampm').text(hours < 0 ? '24H' : hours >= 12 ? 'PM' : 'AM');
  };

  const setTimeInTimezone = (timeZone: string, is24Hour: boolean) => {
    const date = new Date();
    const parts = Intl.DateTimeFormat('en-US', {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
      hour12: false,
    }).formatToParts(date);

    const byType = Object.fromEntries(parts.map((p) => [p.type, p.value]));

    const month = parseInt(byType.month, 10) - 1;
    const day = parseInt(byType.day, 10);
    const year = parseInt(byType.year, 10);
    const hours = parseInt(byType.hour, 10);
    const minutes = parseInt(byType.minute, 10);

    if (!is24Hour) {
      updateAmPm(hours);
      updateDigits('hour', hours > 12 ? hours - 12 : hours === 0 ? 12 : hours);
      updateDigits('minutes', minutes);
      updateDate(month, day, year);
    } else {
      updateAmPm(-1);
      updateDigits('hour', hours);
      updateDigits('minutes', minutes);
      updateDate(month, day, year);
    }
  };

  useEffect(() => {
    if (!svgRef.current) return;

    const tzFromState = props.data.state.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    const isKnownIana = timeZones.includes(tzFromState);
    if (!isKnownIana) console.warn(`Invalid or unknown timezone: ${tzFromState}; falling back to browser time zone.`);

    const ianaTz = isKnownIana ? tzFromState : Intl.DateTimeFormat().resolvedOptions().timeZone;
    const abbr = timeZoneAbbr[timeZones.indexOf(ianaTz)] ?? 'UTC';

    setTimeZoneText(abbr);

    // Ensure state stores IANA ID (why: avoid Select value mismatch and ambiguity)
    if (props.data.state.timeZone !== ianaTz) {
      updateState(props._id, { timeZone: ianaTz });
    }

    const tick = () => setTimeInTimezone(ianaTz, !!props.data.state.is24Hour);
    tick();
    const timing = window.setInterval(tick, 1000);
    return () => window.clearInterval(timing);
  }, [props._id, props.data.state.timeZone, props.data.state.is24Hour, updateState]);

  return (
    <AppWindow app={props} lockAspectRatio={CLOCK_ASPECT}>
      <Box width="100%" height="100%" p={0} m={0} overflow="hidden">
        <Clock ref={svgRef} width="100%" height="100%" preserveAspectRatio="xMidYMid meet" />
      </Box>
    </AppWindow>
  );
}

/* App toolbar component for the app clock */
function ToolbarComponent(props: App): JSX.Element {
  const updateState = useAppStore((state) => state.updateState);

  const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const selected = props.data.state.timeZone && timeZones.includes(props.data.state.timeZone)
    ? props.data.state.timeZone
    : browserTz;

  const handleTimeZoneChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const ianaTz = event.target.value; // IANA ID
    updateState(props._id, { timeZone: ianaTz }); // keep state in IANA
  };

  const handle24HourToggle = (event: React.ChangeEvent<HTMLInputElement>) => {
    updateState(props._id, { is24Hour: event.target.checked });
  };

  return (
    <div style={{ padding: '1rem', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '1rem' }}>
        <div style={{ fontWeight: 'bold' }}>
          <Select
            id="timezone-select"
            value={selected}
            onChange={handleTimeZoneChange}
            style={{ padding: '0.5rem', borderRadius: '8px', width: '240px', height: '34px' }}
          >
            {timeZones.map((tz, idx) => (
              <option key={tz} value={tz}>
                {timeZoneAbbr[idx]} — {tz.replaceAll('_', ' ')}
              </option>
            ))}
          </Select>
        </div>
        <div style={{ fontSize: '0.8rem' }}>
          <FormControl display="flex" alignItems="center">
            <FormLabel mb="0" style={{ whiteSpace: 'nowrap', marginRight: '0.5rem' }}>
              24 Hour Time
            </FormLabel>
            <Switch id="is24Hours" isChecked={!!props.data.state.is24Hour} onChange={handle24HourToggle} />
          </FormControl>
        </div>
      </div>
    </div>
  );
}

/**
 * Grouped App toolbar component, this component will display when a group of apps are selected
 * @returns JSX.Element | null
 */
const GroupedToolbarComponent = () => {
  return null;
};

export default { AppComponent, ToolbarComponent, GroupedToolbarComponent };
