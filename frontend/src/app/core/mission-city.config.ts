import type { LatLngBoundsLiteral, LatLngExpression } from 'leaflet';

export interface MissionCityMapProfile {
  id: string;
  name: string;
  center: LatLngExpression;
  bounds: LatLngBoundsLiteral;
  initialZoom: number;
  minZoom: number;
  maxZoom: number;
  maxDataZoom: number;
  mapArchiveUrl: string;
  mapDataVersion: string;
  searchTerms: string[];
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
  mapDataVersion: '2026-07-27',
  searchTerms: ['rio tinto', 'rio tinto pb', 'rio tinto paraiba']
};

export const missionCityMaps: MissionCityMapProfile[] = [
  missionCityMap,
  {
    id: 'joao-pessoa-pb',
    name: 'João Pessoa - PB',
    center: [-7.115, -34.86],
    bounds: [[-7.232, -34.9653], [-6.902, -34.793]],
    initialZoom: 13,
    minZoom: 10,
    maxZoom: 18,
    maxDataZoom: 15,
    mapArchiveUrl: '/assets/maps/joao-pessoa-pb.pmtiles',
    mapDataVersion: '2026-07-27',
    searchTerms: ['joao pessoa', 'joao pessoa pb', 'jampa']
  }
];
