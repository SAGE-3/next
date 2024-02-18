import { useEffect } from 'react';
import Map, { NavigationControl } from 'react-map-gl/maplibre';
import { Box } from '@chakra-ui/react';
import { Marker } from 'react-map-gl';
import Pin from './Pin';

function LocationMap() {
  const mapTilerAPI = 'elzgvVROErSfCRbrVabp';

  return (
    <Box width="100%" height="100%">
      <Map
        initialViewState={{
          longitude: -122.4,
          latitude: 37.8,
          zoom: 14,
        }}
        reuseMaps
        mapStyle={`https://api.maptiler.com/maps/streets/style.json?key=${mapTilerAPI}`}
      >
        <Marker latitude={37.8} longitude={-122.4}>
          <Pin size={20} />
        </Marker>
        <NavigationControl position="top-left" />
      </Map>
    </Box>
  );
}

export default LocationMap;
