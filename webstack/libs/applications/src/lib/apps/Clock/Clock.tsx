// path: src/apps/clock/AppComponent.tsx
/**
 * Copyright (c) SAGE3 Development Team 2022.
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 * Distributed under the SAGE3 License.
 */

import { useEffect, useRef } from 'react';
import { Select, Box, Switch, FormControl, FormLabel, useColorModeValue } from '@chakra-ui/react';

import { useAppStore } from '@sage3/frontend';
import { App } from '../../schema';

import { state as AppState } from './index';
import { AppWindow } from '../../components';

import * as d3 from 'd3';
import { ReactComponent as Clock } from './clock.svg';

// IANA time zones (labels shown with abbreviations)
const timeZones: string[] = [
  'Pacific/Pago_Pago','Pacific/Honolulu','America/Juneau','America/Los_Angeles','America/Tijuana','America/Vancouver',
  'America/Phoenix','America/Denver','America/Edmonton','America/Chicago','America/Winnipeg','America/Mexico_City',
  'America/New_York','America/Toronto','America/Lima','America/Bogota','America/Caracas','America/Halifax',
  'America/St_Johns','America/Sao_Paulo','Atlantic/Azores','Atlantic/Cape_Verde','Africa/Casablanca','Europe/London',
  'Europe/Madrid','Europe/Paris','Europe/Berlin','Europe/Rome','Europe/Zurich','Europe/Athens','Europe/Bucharest',
  'Europe/Moscow','Asia/Jerusalem','Asia/Istanbul','Asia/Amman','Africa/Cairo','Asia/Jeddah','Asia/Baghdad','Asia/Tehran',
  'Asia/Dubai','Asia/Kabul','Asia/Karachi','Asia/Calcutta','Asia/Kolkata','Asia/Kathmandu','Asia/Dhaka','Asia/Rangoon',
  'Asia/Bangkok','Asia/Jakarta','Asia/Hong_Kong','Asia/Shanghai','Asia/Singapore','Asia/Taipei','Asia/Tokyo','Asia/Seoul',
  'Australia/Adelaide','Australia/Darwin','Australia/Sydney','Australia/Brisbane','Pacific/Guam','Pacific/Port_Moresby',
  'Pacific/Fiji','Pacific/Auckland',
];

const timeZoneAbbr: string[] = [
  'SST','HST','AKDT','PDT','PDT','PDT','MST','MDT','MDT','CDT','CDT','CDT','EDT','EDT','PET','COT','VET','ADT','NST','BRT',
  'AZOT','CVT','WET','BST','CEST','CEST','CEST','CEST','CEST','EEST','EEST','MSK','IDT','TRT','EEST','EET','AST','AST','IRST',
  'GST','AFT','PKT','IST','IST','NPT','BST','MMT','ICT','WIB','HKT','CST','SGT','CST','JST','KST','ACST','ACST','AEST','AEST',
  'ChST','PGT','FJT','NZST',
];

function AppComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const svgRef = useRef<SVGSVGElement>(null);
  const updateState = useAppStore((state) => state.updateState);
  const update = useAppStore((state) => state.update); // needed for sizing

  const CLOCK_WIDTH = 320;
  const CLOCK_HEIGHT = 160;
  const CLOCK_ASPECT = CLOCK_WIDTH / CLOCK_HEIGHT;

  // Chakra: align with Calculator behavior
  const background = useColorModeValue('white', 'gray.700');
  const fg = useColorModeValue('#111111', '#E5E7EB');       // primary text
  const muted = useColorModeValue('#6B7280', '#9CA3AF');    // secondary text

  // Apply color mode to the inline SVG
  useEffect(() => {
    const svgDoc = d3.select(svgRef.current);
    if (svgDoc.empty()) return;

    // Make any built-in SVG background transparent (why: let Box background handle theme)
    svgDoc
      .selectAll('rect#background, #background, #bg, .bg')
      .attr('fill', 'transparent')
      .attr('stroke', 'none');

    // Primary for all text
    svgDoc.selectAll('text').attr('fill', fg);

    // Muted for secondary labels if present
    svgDoc.select('#date').attr('fill', muted);
    svgDoc.select('#ampm').attr('fill', muted);
    svgDoc.select('#timezone').attr('fill', muted);
  }, [fg, muted]);

  // sizing behavior from clockCorrectResizing (unchanged)
  useEffect(() => {
    const { width, height, depth } = props.data.size;
    const currentAspect = width / height;
    if (width !== CLOCK_WIDTH || height !== CLOCK_HEIGHT || Math.abs(currentAspect - CLOCK_ASPECT) > 0.01) {
      const newHeight = Math.round(width / CLOCK_ASPECT);
      update(props._id, { size: { width, height: newHeight, depth: depth ?? 0 } });
    }
  }, [props.data.size.width, props.data.size.height, props.data.size.depth, props._id, update]);

  const updateDigits = (id: string, time: number) => {
    const svgDoc = d3.select(svgRef.current);
    if (!svgDoc.empty()) svgDoc.select('#' + id).text(time.toString().padStart(2, '0'));
  };

  const setTimeZoneText = (abbr: string) => {
    const svgDoc = d3.select(svgRef.current);
    if (!svgDoc.empty()) svgDoc.select('#timezone').text(abbr.replaceAll('_', ' '));
  };

  const updateDate = (month: number, day: number, year: number) => {
    const monthList = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
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

    // Keep state in IANA to match Select values
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
      <Box width="100%" height="100%" p={0} m={0} overflow="hidden" background={background}>
        <Clock ref={svgRef} width="100%" height="100%" preserveAspectRatio="xMidYMid meet" />
      </Box>
    </AppWindow>
  );
}

function ToolbarComponent(props: App): JSX.Element {
  const updateState = useAppStore((state) => state.updateState);

  const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const selected =
    props.data.state.timeZone && timeZones.includes(props.data.state.timeZone)
      ? props.data.state.timeZone
      : browserTz;

  const handleTimeZoneChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const ianaTz = event.target.value;
    updateState(props._id, { timeZone: ianaTz });
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

const GroupedToolbarComponent = () => null;

export default { AppComponent, ToolbarComponent, GroupedToolbarComponent };
