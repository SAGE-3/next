// path: src/apps/clock/AppComponent.tsx
/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useEffect, useRef, useState } from 'react';
import { Select, Box, Switch, FormControl, FormLabel } from '@chakra-ui/react';

import { useAppStore } from '@sage3/frontend';
import { App } from '../../schema';

import { state as AppState } from './index';
import { AppWindow } from '../../components';

// D3 library
import * as d3 from 'd3';
// SVG clock file
import { ReactComponent as Clock } from './clock.svg';

// List of timezones
const timeZones: string[] = [
  "Africa/Abidjan",
  "Africa/Accra",
  "Africa/Addis_Ababa",
  "Africa/Algiers",
  "Africa/Asmara",
  "Africa/Bamako",
  "Africa/Bangui",
  "Africa/Banjul",
  "Africa/Bissau",
  "Africa/Blantyre",
  "Africa/Brazzaville",
  "Africa/Bujumbura",
  "Africa/Cairo",
  "Africa/Casablanca",
  "Africa/Ceuta",
  "Africa/Conakry",
  "Africa/Dakar",
  "Africa/Dar_es_Salaam",
  "Africa/Djibouti",
  "Africa/Douala",
  "Africa/El_Aaiun",
  "Africa/Freetown",
  "Africa/Gaborone",
  "Africa/Harare",
  "Africa/Johannesburg",
  "Africa/Juba",
  "Africa/Kampala",
  "Africa/Khartoum",
  "Africa/Kigali",
  "Africa/Kinshasa",
  "Africa/Lagos",
  "Africa/Libreville",
  "Africa/Lome",
  "Africa/Luanda",
  "Africa/Lubumbashi",
  "Africa/Lusaka",
  "Africa/Malabo",
  "Africa/Maputo",
  "Africa/Maseru",
  "Africa/Mbabane",
  "Africa/Mogadishu",
  "Africa/Monrovia",
  "Africa/Nairobi",
  "Africa/Ndjamena",
  "Africa/Niamey",
  "Africa/Nouakchott",
  "Africa/Ouagadougou",
  "Africa/Porto-Novo",
  "Africa/Sao_Tome",
  "Africa/Tripoli",
  "Africa/Tunis",
  "Africa/Windhoek",
  "America/Adak",
  "America/Anchorage",
  "America/Anguilla",
  "America/Antigua",
  "America/Araguaina",
  "America/Argentina/Buenos_Aires",
  "America/Argentina/Catamarca",
  "America/Argentina/Cordoba",
  "America/Argentina/Jujuy",
  "America/Argentina/La_Rioja",
  "America/Argentina/Mendoza",
  "America/Argentina/Rio_Gallegos",
  "America/Argentina/Salta",
  "America/Argentina/San_Juan",
  "America/Argentina/San_Luis",
  "America/Argentina/Tucuman",
  "America/Argentina/Ushuaia",
  "America/Aruba",
  "America/Asuncion",
  "America/Atikokan",
  "America/Bahia",
  "America/Bahia_Banderas",
  "America/Barbados",
  "America/Belem",
  "America/Belize",
  "America/Blanc-Sablon",
  "America/Boa_Vista",
  "America/Bogota",
  "America/Boise",
  "America/Cambridge_Bay",
  "America/Campo_Grande",
  "America/Cancun",
  "America/Caracas",
  "America/Cayenne",
  "America/Cayman",
  "America/Chicago",
  "America/Chihuahua",
  "America/Ciudad_Juarez",
  "America/Costa_Rica",
  "America/Creston",
  "America/Cuiaba",
  "America/Curacao",
  "America/Danmarkshavn",
  "America/Dawson",
  "America/Dawson_Creek",
  "America/Denver",
  "America/Detroit",
  "America/Dominica",
  "America/Edmonton",
  "America/Eirunepe",
  "America/El_Salvador",
  "America/Fort_Nelson",
  "America/Fortaleza",
  "America/Glace_Bay",
  "America/Goose_Bay",
  "America/Grand_Turk",
  "America/Grenada",
  "America/Guadeloupe",
  "America/Guatemala",
  "America/Guayaquil",
  "America/Guyana",
  "America/Halifax",
  "America/Havana",
  "America/Hermosillo",
  "America/Indiana/Indianapolis",
  "America/Indiana/Knox",
  "America/Indiana/Marengo",
  "America/Indiana/Petersburg",
  "America/Indiana/Tell_City",
  "America/Indiana/Vevay",
  "America/Indiana/Vincennes",
  "America/Indiana/Winamac",
  "America/Inuvik",
  "America/Iqaluit",
  "America/Jamaica",
  "America/Juneau",
  "America/Kentucky/Louisville",
  "America/Kentucky/Monticello",
  "America/Kralendijk",
  "America/La_Paz",
  "America/Lima",
  "America/Los_Angeles",
  "America/Lower_Princes",
  "America/Maceio",
  "America/Managua",
  "America/Manaus",
  "America/Marigot",
  "America/Martinique",
  "America/Matamoros",
  "America/Mazatlan",
  "America/Menominee",
  "America/Merida",
  "America/Metlakatla",
  "America/Mexico_City",
  "America/Miquelon",
  "America/Moncton",
  "America/Monterrey",
  "America/Montevideo",
  "America/Montserrat",
  "America/Nassau",
  "America/New_York",
  "America/Nome",
  "America/Noronha",
  "America/North_Dakota/Beulah",
  "America/North_Dakota/Center",
  "America/North_Dakota/New_Salem",
  "America/Nuuk",
  "America/Ojinaga",
  "America/Panama",
  "America/Paramaribo",
  "America/Phoenix",
  "America/Port-au-Prince",
  "America/Port_of_Spain",
  "America/Porto_Velho",
  "America/Puerto_Rico",
  "America/Punta_Arenas",
  "America/Rankin_Inlet",
  "America/Recife",
  "America/Regina",
  "America/Resolute",
  "America/Rio_Branco",
  "America/Santarem",
  "America/Santiago",
  "America/Santo_Domingo",
  "America/Sao_Paulo",
  "America/Scoresbysund",
  "America/Sitka",
  "America/St_Barthelemy",
  "America/St_Johns",
  "America/St_Kitts",
  "America/St_Lucia",
  "America/St_Thomas",
  "America/St_Vincent",
  "America/Swift_Current",
  "America/Tegucigalpa",
  "America/Thule",
  "America/Tijuana",
  "America/Toronto",
  "America/Tortola",
  "America/Vancouver",
  "America/Whitehorse",
  "America/Winnipeg",
  "America/Yakutat",
  "America/Yellowknife",
  "Antarctica/Casey",
  "Antarctica/Davis",
  "Antarctica/DumontDUrville",
  "Antarctica/Macquarie",
  "Antarctica/Mawson",
  "Antarctica/Palmer",
  "Antarctica/Rothera",
  "Antarctica/Syowa",
  "Antarctica/Troll",
  "Antarctica/Vostok",
  "Asia/Almaty",
  "Asia/Amman",
  "Asia/Anadyr",
  "Asia/Aqtau",
  "Asia/Aqtobe",
  "Asia/Ashgabat",
  "Asia/Atyrau",
  "Asia/Baghdad",
  "Asia/Baku",
  "Asia/Bangkok",
  "Asia/Barnaul",
  "Asia/Beirut",
  "Asia/Bishkek",
  "Asia/Brunei",
  "Asia/Chita",
  "Asia/Choibalsan",
  "Asia/Colombo",
  "Asia/Damascus",
  "Asia/Dhaka",
  "Asia/Dili",
  "Asia/Dubai",
  "Asia/Dushanbe",
  "Asia/Famagusta",
  "Asia/Gaza",
  "Asia/Hebron",
  "Asia/Ho_Chi_Minh",
  "Asia/Hong_Kong",
  "Asia/Hovd",
  "Asia/Irkutsk",
  "Asia/Jakarta",
  "Asia/Jayapura",
  "Asia/Jerusalem",
  "Asia/Kabul",
  "Asia/Kamchatka",
  "Asia/Karachi",
  "Asia/Kathmandu",
  "Asia/Khandyga",
  "Asia/Kolkata",
  "Asia/Krasnoyarsk",
  "Asia/Kuala_Lumpur",
  "Asia/Kuching",
  "Asia/Macau",
  "Asia/Magadan",
  "Asia/Makassar",
  "Asia/Manila",
  "Asia/Nicosia",
  "Asia/Novokuznetsk",
  "Asia/Novosibirsk",
  "Asia/Omsk",
  "Asia/Oral",
  "Asia/Pontianak",
  "Asia/Pyongyang",
  "Asia/Qatar",
  "Asia/Qostanay",
  "Asia/Qyzylorda",
  "Asia/Riyadh",
  "Asia/Sakhalin",
  "Asia/Samarkand",
  "Asia/Seoul",
  "Asia/Shanghai",
  "Asia/Singapore",
  "Asia/Srednekolymsk",
  "Asia/Taipei",
  "Asia/Tashkent",
  "Asia/Tbilisi",
  "Asia/Tehran",
  "Asia/Thimphu",
  "Asia/Tokyo",
  "Asia/Tomsk",
  "Asia/Ulaanbaatar",
  "Asia/Urumqi",
  "Asia/Ust-Nera",
  "Asia/Vladivostok",
  "Asia/Yakutsk",
  "Asia/Yangon",
  "Asia/Yekaterinburg",
  "Asia/Yerevan",
  "Atlantic/Azores",
  "Atlantic/Bermuda",
  "Atlantic/Canary",
  "Atlantic/Cape_Verde",
  "Atlantic/Faroe",
  "Atlantic/Madeira",
  "Atlantic/Reykjavik",
  "Atlantic/South_Georgia",
  "Atlantic/Stanley",
  "Atlantic/St_Helena",
  "Australia/Adelaide",
  "Australia/Brisbane",
  "Australia/Broken_Hill",
  "Australia/Darwin",
  "Australia/Eucla",
  "Australia/Hobart",
  "Australia/Lindeman",
  "Australia/Lord_Howe",
  "Australia/Melbourne",
  "Australia/Perth",
  "Australia/Sydney",
  "Europe/Amsterdam",
  "Europe/Andorra",
  "Europe/Astrakhan",
  "Europe/Athens",
  "Europe/Belgrade",
  "Europe/Berlin",
  "Europe/Bratislava",
  "Europe/Brussels",
  "Europe/Bucharest",
  "Europe/Budapest",
  "Europe/Busingen",
  "Europe/Chisinau",
  "Europe/Copenhagen",
  "Europe/Dublin",
  "Europe/Gibraltar",
  "Europe/Guernsey",
  "Europe/Helsinki",
  "Europe/Isle_of_Man",
  "Europe/Istanbul",
  "Europe/Jersey",
  "Europe/Kaliningrad",
  "Europe/Kiev",
  "Europe/Kirov",
  "Europe/Lisbon",
  "Europe/Ljubljana",
  "Europe/London",
  "Europe/Luxembourg",
  "Europe/Madrid",
  "Europe/Malta",
  "Europe/Mariehamn",
  "Europe/Minsk",
  "Europe/Monaco",
  "Europe/Moscow",
  "Europe/Oslo",
  "Europe/Paris",
  "Europe/Podgorica",
  "Europe/Prague",
  "Europe/Riga",
  "Europe/Rome",
  "Europe/Samara",
  "Europe/San_Marino",
  "Europe/Sarajevo",
  "Europe/Saratov",
  "Europe/Simferopol",
  "Europe/Skopje",
  "Europe/Sofia",
  "Europe/Stockholm",
  "Europe/Tallinn",
  "Europe/Tirane",
  "Europe/Vaduz",
  "Europe/Vatican",
  "Europe/Vienna",
  "Europe/Vilnius",
  "Europe/Volgograd",
  "Europe/Warsaw",
  "Europe/Zagreb",
  "Europe/Zurich",
  "Indian/Antananarivo",
  "Indian/Chagos",
  "Indian/Christmas",
  "Indian/Cocos",
  "Indian/Comoro",
  "Indian/Kerguelen",
  "Indian/Mahe",
  "Indian/Maldives",
  "Indian/Mauritius",
  "Indian/Mayotte",
  "Indian/Reunion",
  "Pacific/Apia",
  "Pacific/Auckland",
  "Pacific/Bougainville",
  "Pacific/Chatham",
  "Pacific/Chuuk",
  "Pacific/Easter",
  "Pacific/Efate",
  "Pacific/Fakaofo",
  "Pacific/Fiji",
  "Pacific/Funafuti",
  "Pacific/Galapagos",
  "Pacific/Gambier",
  "Pacific/Guadalcanal",
  "Pacific/Guam",
  "Pacific/Honolulu",
  "Pacific/Kanton",
  "Pacific/Kiritimati",
  "Pacific/Kosrae",
  "Pacific/Kwajalein",
  "Pacific/Majuro",
  "Pacific/Marquesas",
  "Pacific/Midway",
  "Pacific/Nauru",
  "Pacific/Niue",
  "Pacific/Norfolk",
  "Pacific/Noumea",
  "Pacific/Pago_Pago",
  "Pacific/Palau",
  "Pacific/Pitcairn",
  "Pacific/Pohnpei",
  "Pacific/Port_Moresby",
  "Pacific/Rarotonga",
  "Pacific/Saipan",
  "Pacific/Tahiti",
  "Pacific/Tarawa",
  "Pacific/Tongatapu",
  "Pacific/Wake",
  "Pacific/Wallis",
  "UTC",
];

/* App component for Clock */

function AppComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const svgRef = useRef<SVGSVGElement>(null);
  const updateState = useAppStore((state) => state.updateState);
  const update = useAppStore((state) => state.update);

  const CLOCK_WIDTH = 320;
  const CLOCK_HEIGHT = 160;
  const CLOCK_ASPECT = CLOCK_WIDTH / CLOCK_HEIGHT;

  // Ensure AppWindow size always matches the SVG clock's size and keeps aspect ratio
  useEffect(() => {
    const { width, height, depth } = props.data.size;
    // If the size is not the correct aspect ratio, or not the default, update it
    const currentAspect = width / height;
    if (width !== CLOCK_WIDTH || height !== CLOCK_HEIGHT || Math.abs(currentAspect - CLOCK_ASPECT) > 0.01) {
      // Always keep the same aspect ratio, prefer width as the driver
      const newHeight = Math.round(width / CLOCK_ASPECT);
      update(props._id, { size: { width, height: newHeight, depth: depth ?? 0 } });
    }
  }, [props.data.size.width, props.data.size.height, props.data.size.depth, props._id, update]);

  const updateDigits = (id: string, time: number) => {
    const svgDoc = d3.select(svgRef.current);
    if (!svgDoc.empty())
      svgDoc.select('#' + id).text(time.toString().padStart(2, '0'));
  };

  const setTimeZoneText = (timeZone: string) => {
    const svgDoc = d3.select(svgRef.current);
    if (!svgDoc.empty())
      svgDoc.select('#timezone').text(timeZone);
  };

  const updateDate = (month: number, day: number, year: number) => {
    const monthList = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const svgDoc = d3.select(svgRef.current);
    if (!svgDoc.empty())
      svgDoc.select('#date').text(`${monthList[month]} ${day}, ${year}`);
  };

  const updateAmPm = (hours: number) => {
    const svgDoc = d3.select(svgRef.current);
    if (!svgDoc.empty())
      svgDoc.select('#ampm').text(hours < 0 ? '24H' : hours >= 12 ? 'PM' : 'AM');
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
    console.log(`${timeZone} ${is24Hour} ${hours}:${minutes} ${month}/${day}/${year}`);

    if (!is24Hour){
      updateAmPm(hours);
      updateDigits('hour', hours > 12 ? hours - 12 : hours);
      updateDigits('minutes', minutes);
      updateDate(month, day, year);
    }
    else {
      updateAmPm(-1);
      updateDigits('hour', hours);
      updateDigits('minutes', minutes);
      updateDate(month, day, year);
    }
  };

  useEffect(() => {
    if (!svgRef.current) 
      return;

    const tz = props.data.state.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    const validTz = timeZones.includes(tz) ? tz : 'UTC';

    if (!timeZones.includes(tz)) console.warn(`Invalid or unknown timezone: ${tz}; falling back to UTC.`);

    setTimeZoneText(validTz);
    // ensure state is consistent with what we display
    if (props.data.state.timeZone !== validTz) updateState(props._id, { timeZone: validTz });

    const tick = () => setTimeInTimezone(validTz, !!props.data.state.is24Hour);

    tick(); // update immediately
    const timing = window.setInterval(tick, 1000);

    return () => {
      window.clearInterval(timing);
    };
    // re-run when user changes tz or 24h toggle
  }, [props._id, props.data.state.timeZone, props.data.state.is24Hour]);

  return (
    <AppWindow
      app={props}
      lockAspectRatio={CLOCK_ASPECT}
    >
      <Box width="100%" height="100%" p={0} m={0} overflow="hidden">
        <Clock ref={svgRef} width="100%" height="100%" preserveAspectRatio="xMidYMid meet" />
      </Box>
    </AppWindow>
  );
}

/* App toolbar component for the app clock */

function ToolbarComponent(props: App): JSX.Element {
  const updateState = useAppStore((state) => state.updateState);
  const [selectedTimezone, setSelectedTimezone] = useState<string | undefined>(props.data.state.timeZone);

  const handleTimeZoneChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const tz = event.target.value;
    setSelectedTimezone(tz);
    updateState(props._id, { timeZone: tz });
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
            value={selectedTimezone}
            onChange={handleTimeZoneChange}
            style={{ padding: '0.5rem', borderRadius: '8px', width: '220px', height: '32px' }}
         >
            {timeZones.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </Select>
        </div>
        <div style={{ fontSize: '0.8rem' }}>
          <FormControl display="flex" alignItems="center">
            <FormLabel mb="0" style={{ whiteSpace: 'nowrap', marginRight: '0.5rem' }}>
              24 Hour Time
            </FormLabel>
            <Switch id="is24Hours" isChecked={props.data.state.is24Hour} onChange={handle24HourToggle} />
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
