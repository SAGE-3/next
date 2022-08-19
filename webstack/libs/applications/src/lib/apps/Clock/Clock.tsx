/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { useEffect, useRef, useState } from 'react';
import { Text, VStack, Input, InputGroup } from '@chakra-ui/react';

import { useAppStore } from '@sage3/frontend';
import { App } from '../../schema';

import { state as AppState } from './index';
import { AppWindow } from '../../components';

// D3 library
import * as d3 from 'd3';
// SVG clock file
import { ReactComponent as Clock } from './clock.svg';
//import { ReactComponent as AppIcon } from './icon.svg';

/* App component for SVGBox */

function AppComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const update = useAppStore((state) => state.update);

  const svgRef = useRef<SVGSVGElement>(null);
  const [nightMode, setNightMode] = useState(false);
  const [city, setCity] = useState(s.city);
  // local offset for the clock
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60;
  const [clockoffset, setClockOffset] = useState(0);

  useEffect(() => {
    setCity(s.city);
    localizeCity(s.city);
    // Update the app title
    update(props._id, { description: 'Clock> ' + s.city });
  }, [s.city]);

  const localizeCity = (city: string) => {
    const key = 'AIzaSyBQ335g9XtAX56ZCqqF6jsHz4mP-qIX5vo';
    const url = "https://maps.googleapis.com/maps/api/geocode/json?address=" +
      city + "&key=" + key;
    d3.json(url).then((json: any) => {
      const geometry = json.results[0].geometry;
      const name = json.results[0].address_components[0].long_name;
      if (geometry !== undefined && name !== undefined) {
        const lat = geometry.location.lat;
        const lng = geometry.location.lng;
        console.log('City>', city, lat, lng)
        clockSelected(lat, lng, city);
      }
    });
  };

  const clockSelected = (lat: number, lon: number, cityName: string) => {
    const apikey = "4R3QHZXPDCOL";
    const url = `https://api.timezonedb.com/v2.1/get-time-zone?key=${apikey}&format=json&by=position&lat=${lat}&lng=${lon}`;
    fetch(url, {
      redirect: 'follow',
      referrerPolicy: 'no-referrer',
    })
      .then((response) => {
        return response.json();
      })
      .then((json: any) => {
        const timeOffset = parseInt(json.gmtOffset) + offset;
        let id = cityName.toLowerCase() + lat + lon;
        id = id.replace(/ /g, "");
        id = id.replace(/\./g, '');
        const clock = {
          name: cityName.charAt(0).toUpperCase() + cityName.slice(1),
          offset: timeOffset,
          id: id,
        };
        console.log('clock>', clock);
        setClockOffset(timeOffset);
      })
      .catch((err) => {
        console.log('Timezonedb> error', err);
      });
  };

  const rotateElement = (id: string, angle: number) => {
    const svgDoc = d3.select(svgRef.current);
    if (svgDoc) {
      svgDoc.select("#" + id).attr('transform', 'rotate(' + angle + ', 100, 100)');
    }
  };

  const toggleNightMode = (background: string, dial: string) => {
    const svgDoc = d3.select(svgRef.current);
    if (svgDoc) {
      svgDoc.select("#" + "background").style("fill", background);
      svgDoc.select("#" + "dial").style("fill", dial);
      svgDoc.select("#" + "hourHand").style("fill", dial);
      svgDoc.select("#" + "minuteHand").style("fill", dial);
    } else {
      setNightMode((prev) => !prev);
    }
  };

  const setTime = () => {
    const secondToHourConstant = 3600;
    const secondToMinuteConstant = 60;
    const hourOffset = Math.floor(clockoffset / secondToHourConstant);
    const minuteOffset = (clockoffset % secondToHourConstant) / secondToMinuteConstant;
    const now = new Date();
    const hours = (now.getHours() + hourOffset) % 24;
    const minutes = (now.getMinutes() + minuteOffset) % 60;
    const seconds = now.getSeconds();

    // rotate hour hands
    rotateElement('hourHand', 30 * hours + 0.5 * minutes);
    // rotate minute hand
    rotateElement('minuteHand', 6 * minutes);
    // rotate second hand
    rotateElement('secondHand', 6 * seconds);
    // Night time mode
    if ((hours >= 19 || hours < 7) && !nightMode) {
      setNightMode(true);
      toggleNightMode("rgba(0,0,0,255)", "rgb(235,235,235)");
    } else if ((hours < 19 && hours >= 7) && nightMode) {
      setNightMode(false);
      toggleNightMode("rgba(255,255,255,255)", "rgb(40,40,40)");
    }
  };

  useEffect(() => {
    let timing: number;
    if (svgRef.current) {
      timing = window.setInterval(setTime, 1000);
    }
    return () => {
      clearInterval(timing);
    }
  }, [svgRef, s.file, offset]);

  return (
    <AppWindow app={props}>
      <VStack p={0} m={2} >
        <Clock ref={svgRef} />
        {/* <Text fontSize={"2xl"}>{city}</Text> */}
      </VStack>
    </AppWindow>
  );
}

/* App toolbar component for the app SVGBox */

function ToolbarComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);
  const [city, setCity] = useState(s.city);
  const changeCity = () => {
    console.log('CCCCCCCC', city)
    updateState(props._id, { city: city });
  }
  const handleCityChange = (event: any) => setCity(event.target.value);
  return <>
    <form onSubmit={changeCity}>
      <InputGroup size="xs" minWidth="200px">
        <Input
          placeholder="City"
          value={city}
          onChange={handleCityChange}
          onPaste={(event) => {
            event.stopPropagation();
          }}
          backgroundColor="whiteAlpha.300"
        />
      </InputGroup>
    </form>∏
  </>;
}

export default { AppComponent, ToolbarComponent };
