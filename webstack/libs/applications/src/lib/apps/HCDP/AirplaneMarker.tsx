import { useEffect, useState } from 'react';
import { LeafletTrackingMarker } from 'react-leaflet-tracking-marker';
import L from 'leaflet';

import arrowIcon from './arrow.png';
import { Popup } from 'react-leaflet';
import React from 'react';

const icon = L.icon({
  iconSize: [100, 100],
  popupAnchor: [2, -20],
  iconUrl: arrowIcon,
});

// const dataStory = [
//   {
//     lat: 20.8415,
//     lng: -156.2948,
//   },

//   {
//     lat: 20.7067,
//     lng: -156.3554,
//   },
// ];

function getNewLocation(lat: number, lon: number, distance: number, bearing: number) {
  // Convert latitude, longitude, and bearing to radians
  const latRad = toRadians(lat);
  const lonRad = toRadians(lon);
  const bearingRad = toRadians(bearing);

  // Convert distance from miles to radians
  const distanceRad = distance / 3959;

  // Calculate new latitude
  const newLatRad = Math.asin(Math.sin(latRad) * Math.cos(distanceRad) + Math.cos(latRad) * Math.sin(distanceRad) * Math.cos(bearingRad));
  const newLat = toDegrees(newLatRad);

  // Calculate new longitude
  const newLonRad =
    lonRad +
    Math.atan2(
      Math.sin(bearingRad) * Math.sin(distanceRad) * Math.cos(latRad),
      Math.cos(distanceRad) - Math.sin(latRad) * Math.sin(newLatRad)
    );
  const newLon = toDegrees(newLonRad);

  // Return new location as an object with latitude and longitude properties
  return { latitude: newLat, longitude: newLon };
}

// Helper function to convert degrees to radians
function toRadians(degrees: number) {
  return (degrees * Math.PI) / 180;
}

// Helper function to convert radians to degrees
function toDegrees(radians: number) {
  return (radians * 180) / Math.PI;
}

let cursor = 0;

export default function AirplaneMarker(props: { dataStory: { lat: number; lng: number }[]; degree: number; index: number }) {
  const [currentTrack, setCurrentTrack] = useState(props.dataStory[0]);
  const { lat, lng } = currentTrack;
  const [prevPos, setPrevPos] = useState<any>([lat, lng]);
  const [duration, setDuration] = useState(1000);
  const [intervalTimer, setIntervalTimer] = useState(1000);
  const [locations, setLocations] = useState<any>([...props.dataStory]);

  useEffect(() => {
    //TODO factor in wind speed and change color of plane

    const x = getNewLocation(lat, lng, 5, props.degree).latitude;
    const y = getNewLocation(lat, lng, 5, props.degree).longitude;
    setLocations((prev: any) => [
      { lat: lat, lng: lng },
      { lat: x, lng: y },
    ]);
  }, []);
  console.log(props.index);
  useEffect(() => {
    setCurrentTrack(locations[cursor]);

    const interval = setInterval(() => {
      if (cursor === locations.length - 1) {
        setIntervalTimer(50);
        setDuration(1);
        clearInterval(interval);
        cursor = 0;
        setCurrentTrack(locations[cursor]);
        return;
      }

      setDuration(1000);
      setIntervalTimer(1000);
      cursor = 1;
      setCurrentTrack(locations[cursor]);
    }, intervalTimer);
    return () => {
      cursor = 0;
      clearInterval(interval);
    };
  }, [intervalTimer, locations]);

  useEffect(() => {
    if (prevPos[1] !== lng && prevPos[0] !== lat) setPrevPos([lat, lng]);
  }, [lat, lng, prevPos]);

  return (
    <LeafletTrackingMarker icon={icon} position={[lat, lng]} previousPosition={prevPos} duration={duration}>
      <Popup>{'Hello, there! 🐱‍🏍 '}</Popup>
    </LeafletTrackingMarker>
  );
}
