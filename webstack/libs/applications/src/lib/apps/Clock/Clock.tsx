// path: src/apps/clock/Clock.tsx
import { useEffect, useRef, useLayoutEffect, useMemo } from 'react';
import {
  Select,
  Box,
  Switch,
  FormControl,
  FormLabel,
  useColorMode,
  useColorModeValue,
} from '@chakra-ui/react';

import { useAppStore } from '@sage3/frontend';
import { App } from '../../schema';
import { state as AppState } from './index';
import { AppWindow } from '../../components';

import * as d3 from 'd3';
import { ReactComponent as Clock } from './clock.svg';

// ---- Time zone helpers (runtime-derived, no hardcoded arrays) ----
function getSupportedTimeZones(): string[] {
  try {
    const fn = (Intl as any)?.supportedValuesOf;
    if (typeof fn === 'function') {
      return fn.call(Intl, 'timeZone') as string[];
    }
  } catch {
  }
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

function fmtParts(dt: Intl.DateTimeFormat) {
  return dt.formatToParts().reduce<Record<string, string>>((acc, p) => {
    if (p.type) acc[p.type] = p.value;
    return acc;
  }, {});
}

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
    return null;
  }
}

function abbrFor(zone: string, date: Date): string {
  return (
    tryAbbrev(zone, date, 'short') ||         
    tryAbbrev(zone, date, 'shortGeneric') ||  
    tryAbbrev(zone, date, 'shortOffset') ||   
    synthesizeGMT(zone, date)                 
  );
}

function synthesizeGMT(zone: string, date: Date): string {
  const f = (tz: string) =>
    new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false })
      .format(date)
      .split(':')
      .map(Number);
  const [uh, um] = f('UTC');
  const [lh, lm] = f(zone);
  const utcMin = uh * 60 + um;
  const locMin = lh * 60 + lm;
  let diff = locMin - utcMin;
  if (diff > 720) diff -= 1440;
  if (diff < -720) diff += 1440;
  const sign = diff >= 0 ? '+' : '-';
  const abs = Math.abs(diff);
  const hh = String(Math.floor(abs / 60)).padStart(2, '0');
  const mm = String(abs % 60).padStart(2, '0');
  return `GMT${sign}${hh}:${mm}`;
}

function AppComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const svgRef = useRef<SVGSVGElement>(null);
  const updateState = useAppStore((state) => state.updateState);
  const update = useAppStore((state) => state.update);

  const CLOCK_WIDTH = 320;
  const CLOCK_HEIGHT = 130;
  const CLOCK_ASPECT = CLOCK_WIDTH / CLOCK_HEIGHT;

  const { colorMode } = useColorMode();
  const lightBg = useColorModeValue('white', undefined);

  // Build time zones + current abbreviations once
  const { timeZones, timeZoneAbbr } = useMemo(() => {
    const zones = getSupportedTimeZones();
    const now = new Date();
    const abbrs = zones.map((z) => abbrFor(z, now));
    return { timeZones: zones, timeZoneAbbr: abbrs };
  }, []);

  // Theme colors on the SVG
  useEffect(() => {
    const svg = d3.select(svgRef.current);
    if (svg.empty()) return;

    const isLight = colorMode === 'light';
    const primary = isLight ? '#111111' : '#E5E7EB';
    const secondary = isLight ? '#6B7280' : '#9CA3AF';

    svg.selectAll('text').attr('fill', primary);
    svg.select('#date').attr('fill', secondary);
    svg.select('#ampm').attr('fill', secondary);
    svg.select('#timezone').attr('fill', secondary);

    if (isLight) {
      svg.selectAll('#background, #bg, .bg, rect#background')
        .attr('fill', 'transparent')
        .attr('stroke', 'none');
    }
  }, [colorMode]);

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

  // Live clock + live abbreviation update
  useEffect(() => {
    if (!svgRef.current) return;

    const tzFromState = props.data.state.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    const isKnownIana = timeZones.includes(tzFromState);
    if (!isKnownIana) {
      console.warn(`Invalid or unknown timezone: ${tzFromState}; falling back to browser time zone.`);
    }

    const ianaTz = isKnownIana ? tzFromState : Intl.DateTimeFormat().resolvedOptions().timeZone;

    // Ensure state holds a supported IANA zone
    if (props.data.state.timeZone !== ianaTz) {
      updateState(props._id, { timeZone: ianaTz });
    }

    const tick = () => {
      // Update time and the CURRENT abbreviation (handles DST changes)
      const abbrNow = abbrFor(ianaTz, new Date());
      setTimeZoneText(abbrNow);
      setTimeInTimezone(ianaTz, !!props.data.state.is24Hour);
    };

    tick();
    const timing = window.setInterval(tick, 1000);
    return () => window.clearInterval(timing);
  }, [props._id, props.data.state.timeZone, props.data.state.is24Hour, updateState, timeZones]);

  return (
    <AppWindow app={props} lockAspectRatio={CLOCK_ASPECT}>
      <Box
        width="100%"
        height="100%"
        p={0}
        m={0}
        overflow="hidden"
        background={colorMode === 'light' ? lightBg : 'transparent'}
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
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

  // Same runtime zone/abbr list as AppComponent, built once for this component
  const { timeZones, timeZoneAbbr } = useMemo(() => {
    const zones = getSupportedTimeZones();
    const now = new Date();
    const abbrs = zones.map((z) => abbrFor(z, now));
    return { timeZones: zones, timeZoneAbbr: abbrs };
  }, []);

  const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const selected =
    props.data.state.timeZone && timeZones.includes(props.data.state.timeZone)
      ? props.data.state.timeZone
      : browserTz;

  const handleTimeZoneChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateState(props._id, { timeZone: e.target.value });
  };
  const handle24HourToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateState(props._id, { is24Hour: e.target.checked });
  };

  return (
    <div style={{ padding: '1rem', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '1rem' }}>
        <div style={{ fontWeight: 'bold' }}>
          <Select
            id="timezone-select"
            value={selected}
            onChange={handleTimeZoneChange}
            style={{ padding: '0.5rem', borderRadius: '8px', width: '280px', height: '34px' }}
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
