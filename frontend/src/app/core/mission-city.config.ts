import type { LatLngBoundsExpression, LatLngExpression } from 'leaflet';

export interface MissionCityMapProfile {
  id: string;
  name: string;
  center: LatLngExpression;
  bounds: LatLngBoundsExpression;
  initialZoom: number;
  minZoom: number;
  maxZoom: number;
  maxDataZoom: number;
  mapArchiveUrl: string;
  mapDataVersion: string;
}

export const missionCityMap: MissionCityMapProfile = {
  id: 'rio-tinto-pb',
  name: 'Rio Tinto - PB',
  center: [-6.81, -35.08],
  bounds: [[-6.919319, -35.135761], [-6.604803, -34.911106]],
  initialZoom: 13,
  minZoom: 10,
  maxZoom: 18,
  maxDataZoom: 15,
  mapArchiveUrl: '/assets/maps/rio-tinto-pb.pmtiles',
  mapDataVersion: '2026-07-27'
};
