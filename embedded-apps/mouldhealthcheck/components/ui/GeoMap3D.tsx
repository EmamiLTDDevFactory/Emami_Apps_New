import React, { useEffect, useState } from 'react';
import { Modal, View, StyleSheet, Platform, Text, ScrollView, TouchableOpacity } from 'react-native';
import { WebView } from 'react-native-webview';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radius, shadow, font } from '@/constants/theme';
import * as Icons from 'phosphor-react-native';
import { useBreakpoint } from '@/utils/responsive';
import Animated, { FadeIn, FadeInRight } from 'react-native-reanimated';

// Map city/town names to real lat/lng coordinates. Ordered most-specific-first so e.g. "GREATER NOIDA"
// or "NAVI MUMBAI" match their own entry before falling through to a broader "NOIDA"/"MUMBAI" match —
// Noida, Gurgaon and Delhi used to all collapse onto Delhi's point; they're real, distinct locations now.
const KNOWN_CITY_COORDS: [string[], number, number][] = [
  // Delhi NCR
  [['GREATER NOIDA'], 77.5006, 28.4744],
  [['NOIDA'], 77.3910, 28.5355],
  [['GURGAON', 'GURUGRAM'], 77.0266, 28.4595],
  [['FARIDABAD'], 77.3178, 28.4089],
  [['MANESAR'], 76.9350, 28.3540],
  [['BAHADURGARH'], 76.9310, 28.6930],
  [['SONEPAT', 'SONIPAT'], 77.0151, 28.9931],
  [['ROHTAK'], 76.6066, 28.8955],
  [['PANIPAT'], 76.9635, 29.3909],
  [['GHAZIABAD'], 77.4538, 28.6692],
  [['MEERUT'], 77.7064, 28.9845],
  [['KARNAL'], 76.9905, 29.6857],
  [['DELHI'], 77.2090, 28.6139],

  // Maharashtra
  [['NAVI MUMBAI'], 73.0297, 19.0330],
  [['THANE'], 72.9781, 19.2183],
  [['TALOJ'], 73.0930, 19.0820],
  [['BHIWANDI'], 73.0483, 19.3002],
  [['VASAI'], 72.8397, 19.4912],
  [['AMBERNATH'], 73.1867, 19.2002],
  [['MUMBAI', 'BOMBAY'], 72.8777, 19.0760],
  [['PIMPRI', 'CHINCHWAD', 'BHOSARI', 'CHAKAN'], 73.8, 18.65],
  [['PUNE'], 73.8567, 18.5204],
  [['NASHIK'], 73.7898, 19.9975],
  [['AURANGABAD'], 75.3433, 19.8762],
  [['KOLHAPUR'], 74.2433, 16.7050],
  [['NAGPUR'], 79.0882, 21.1458],

  // Gujarat
  [['AHMEDABAD'], 72.5714, 23.0225],
  [['VADODARA', 'BARODA'], 73.1812, 22.3072],
  [['SURAT'], 72.8311, 21.1702],
  [['RAJKOT'], 70.8022, 22.3039],
  [['SANAND'], 72.3833, 22.9926],
  [['HALOL'], 73.4667, 22.5],
  [['SILVASSA'], 73.0169, 20.2666],
  [['VAPI'], 72.9089, 20.3703],
  [['DAMAN'], 72.8397, 20.3974],

  // Rajasthan
  [['BHIWADI'], 76.8645, 27.8134],
  [['NEEMRANA'], 76.3853, 27.9925],
  [['ALWAR'], 76.6346, 27.5665],
  [['JAIPUR'], 75.7873, 26.9124],

  // Madhya Pradesh
  [['PITHAMPUR'], 75.6873, 22.6067],
  [['INDORE'], 75.8577, 22.7196],
  [['BHOPAL'], 77.4126, 23.2599],

  // Himachal Pradesh
  [['BADDI'], 76.7909, 30.9578],
  [['SOLAN'], 77.0996, 30.9045],
  [['PARWANOO'], 76.9612, 30.8386],
  [['KALA AMB'], 77.2075, 30.4772],

  // Uttarakhand
  [['PANTNAGAR'], 79.4939, 29.0253],
  [['RUDRAPUR'], 79.4128, 28.9862],
  [['KASHIPUR'], 78.9622, 29.2151],
  [['HARIDWAR'], 78.1642, 29.9457],
  [['DEHRADUN'], 78.0322, 30.3165],

  // Uttar Pradesh
  [['KANPUR'], 80.3319, 26.4499],
  [['LUCKNOW'], 80.9462, 26.8467],
  [['AGRA'], 78.0081, 27.1767],

  // Punjab / Haryana
  [['LUDHIANA'], 75.8573, 30.9010],
  [['CHANDIGARH'], 76.7794, 30.7333],
  [['JALANDHAR'], 75.5762, 31.3260],

  // West Bengal / Northeast
  [['KOLKATA', 'CALCUTTA'], 88.3639, 22.5726],
  [['HOWRAH'], 88.2636, 22.5958],
  [['DURGAPUR'], 87.3119, 23.5204],
  [['HALDIA'], 88.0698, 22.0667],
  [['GUWAHATI', 'AMINGAON'], 91.7362, 26.1445],

  // South India
  [['CHENNAI', 'MADRAS'], 80.2707, 13.0827],
  [['SRIPERUMBUDUR'], 79.9456, 12.9675],
  [['HOSUR'], 77.8258, 12.7409],
  [['COIMBATORE'], 76.9558, 11.0168],
  [['BANGALORE', 'BENGALURU'], 77.5946, 12.9716],
  [['MYSORE', 'MYSURU'], 76.6394, 12.2958],
  [['HYDERABAD'], 78.4867, 17.3850],
  [['VIJAYAWADA'], 80.6480, 16.5062],
  [['VISAKHAPATNAM', 'VIZAG'], 83.2185, 17.6868],
  [['KOCHI', 'COCHIN'], 76.2673, 9.9312],

  // East / Central
  [['BHUBANESWAR'], 85.8245, 20.2961],
  [['PATNA'], 85.1376, 25.5941],
];

/** Longest-name-first substring match against every known city so "GREATER NOIDA" doesn't
 * accidentally match a shorter unrelated alias first. */
const CITY_LOOKUP = KNOWN_CITY_COORDS
  .flatMap(([aliases, lng, lat]) => aliases.map((alias) => ({ alias, lng, lat })))
  .sort((a, b) => b.alias.length - a.alias.length);

const mapCityToLngLat = (cityName: string): [number, number] => {
  const c = (cityName || '').toUpperCase();
  const match = CITY_LOOKUP.find((entry) => c.includes(entry.alias));
  if (match) return [match.lng, match.lat];

  // Unrecognized city — no real coordinate available. Scatter within India (lng: 70-90, lat: 10-30)
  // rather than mis-plotting it on top of an unrelated real city.
  let hash = 0;
  for (let i = 0; i < c.length; i++) {
     hash = c.charCodeAt(i) + ((hash << 5) - hash);
  }
  const lng = 72 + (Math.abs(hash) % 18);
  const lat = 12 + ((Math.abs(hash) >> 2) % 15);
  return [lng, lat];
};

const groupBy = <T,>(array: T[], key: (item: T) => string): Record<string, T[]> =>
  array.reduce((result: Record<string, T[]>, item) => {
    const k = key(item);
    (result[k] = result[k] || []).push(item);
    return result;
  }, {});

const getHtmlContent = (cityDataStr: string, activeMetric: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=yes" />
  <script src="https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.js"></script>
  <link href="https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.css" rel="stylesheet" />
  <style>
    body { margin: 0; padding: 0; background-color: #E2E8F0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; overflow: hidden; }
    #mapViz { width: 100vw; height: 100vh; }
    .maplibregl-popup-content {
      background: #fff !important;
      border: 1px solid #E5E7EB !important;
      border-radius: 14px !important;
      padding: 16px 18px !important;
      color: #111827 !important;
      box-shadow: 0 10px 40px rgba(0,0,0,0.12) !important;
      min-width: 180px !important;
    }
    .maplibregl-popup-anchor-bottom .maplibregl-popup-tip {
      border-top-color: #fff !important;
    }
    .maplibregl-popup-close-button {
      color: #9CA3AF !important;
      font-size: 18px !important;
      right: 8px !important;
      top: 8px !important;
    }
    .popup-title {
      font-size: 13px;
      font-weight: 900;
      letter-spacing: 0.3px;
      margin-bottom: 12px;
      padding-bottom: 10px;
      border-bottom: 2px solid #F3F4F6;
      color: #111827;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .popup-title::before {
      content: '';
      width: 10px;
      height: 10px;
      border-radius: 3px;
      background: linear-gradient(135deg, #6366F1, #8B5CF6);
    }
    .popup-stat-row {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 8px;
    }
    .popup-stat-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
    }
    .popup-stat-label {
      flex: 1;
      font-size: 12px;
      color: #6B7280;
      font-weight: 600;
    }
    .popup-stat-val {
      font-size: 15px;
      font-weight: 900;
    }
    .maplibregl-ctrl-group {
      background: #fff !important;
      border: 1px solid #E5E7EB !important;
      border-radius: 10px !important;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08) !important;
    }
    .maplibregl-ctrl-group button {
      width: 34px !important;
      height: 34px !important;
    }

    /* City label styling */
    .city-label {
      font-size: 10px;
      font-weight: 800;
      color: #374151;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      text-shadow: 0 1px 3px rgba(255,255,255,0.9);
      pointer-events: none;
    }
  </style>
</head>
<body>
  <div id="mapViz"></div>
  <script>
    const cityData = JSON.parse('${cityDataStr}');
    const activeMetric = '${activeMetric}';

    const map = new maplibregl.Map({
      container: 'mapViz',
      style: {
        "version": 8,
        "sources": {},
        "layers": [
          {
            "id": "background",
            "type": "background",
            "paint": { "background-color": "#E2E8F0" }
          }
        ]
      },
      center: [78.9629, 22.5937],
      zoom: 3.8,
      pitch: 0,
      bearing: 0,
      dragRotate: false
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false, showZoom: true }), 'top-right');

    map.on('load', () => {
      map.addSource('india', {
        type: 'geojson',
        data: 'https://raw.githubusercontent.com/Subhash9325/GeoJson-Data-of-Indian-States/master/Indian_States'
      });

      // Crisp white state fill
      map.addLayer({
        'id': 'state-fill',
        'type': 'fill',
        'source': 'india',
        'paint': {
          'fill-color': '#FFFFFF',
          'fill-opacity': 1
        }
      });

      // Bolder state borders
      map.addLayer({
        'id': 'state-borders',
        'type': 'line',
        'source': 'india',
        'paint': {
          'line-color': '#94A3B8',
          'line-width': 1.5,
          'line-opacity': 0.8
        }
      });

      // State labels
      map.addLayer({
        'id': 'state-labels',
        'type': 'symbol',
        'source': 'india',
        'layout': {
          'text-field': ['get', 'NAME_1'],
          'text-size': 9,
          'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
          'text-anchor': 'center'
        },
        'paint': {
          'text-color': '#CBD5E1',
          'text-halo-color': '#ffffff',
          'text-halo-width': 1
        }
      });
      
      let maxValue = 1;
      cityData.forEach(c => {
         let val = c.total;
         if (activeMetric === 'Running') val = c.running;
         if (activeMetric === 'NPA') val = c.npa;
         if (val > maxValue) maxValue = val;
      });

      // For each city, create Running and NPA as separate features
      const runFeatures = [];
      const npaFeatures = [];
      
      cityData.forEach(c => {
        if (activeMetric === 'Total') {
          // Running circle (offset slightly left)
          if (c.running > 0) {
            runFeatures.push({
              type: 'Feature',
              geometry: { type: 'Point', coordinates: [c.lng - 0.3, c.lat] },
              properties: { ...c, metricVal: c.running }
            });
          }
          // NPA circle (offset slightly right)
          if (c.npa > 0) {
            npaFeatures.push({
              type: 'Feature',
              geometry: { type: 'Point', coordinates: [c.lng + 0.3, c.lat] },
              properties: { ...c, metricVal: c.npa }
            });
          }
          // If both are 0, still show a small total dot
          if (c.running === 0 && c.npa === 0) {
            runFeatures.push({
              type: 'Feature',
              geometry: { type: 'Point', coordinates: [c.lng, c.lat] },
              properties: { ...c, metricVal: 1 }
            });
          }
        } else if (activeMetric === 'Running') {
          if (c.running > 0) {
            runFeatures.push({
              type: 'Feature',
              geometry: { type: 'Point', coordinates: [c.lng, c.lat] },
              properties: { ...c, metricVal: c.running }
            });
          }
        } else if (activeMetric === 'NPA') {
          if (c.npa > 0) {
            npaFeatures.push({
              type: 'Feature',
              geometry: { type: 'Point', coordinates: [c.lng, c.lat] },
              properties: { ...c, metricVal: c.npa }
            });
          }
        }
      });

      // All cities source (for labels and interaction). Materials are JSON-stringified since GL JS
      // feature properties aren't guaranteed to round-trip nested arrays/objects — parsed back out
      // in the click handler below.
      map.addSource('cities-all', {
         type: 'geojson',
         data: {
            type: 'FeatureCollection',
            features: cityData.map(c => ({
               type: 'Feature',
               geometry: { type: 'Point', coordinates: [c.lng, c.lat] },
               properties: { city: c.city, total: c.total, running: c.running, npa: c.npa, materials: JSON.stringify(c.materials) }
            }))
         }
      });

      // Running bubbles source
      map.addSource('cities-running', {
         type: 'geojson',
         data: { type: 'FeatureCollection', features: runFeatures }
      });

      // NPA bubbles source
      map.addSource('cities-npa', {
         type: 'geojson',
         data: { type: 'FeatureCollection', features: npaFeatures }
      });

      // --- RUNNING BUBBLE (soft green) ---
      // Outer glow
      map.addLayer({
         'id': 'run-glow',
         'type': 'circle',
         'source': 'cities-running',
         'paint': {
            'circle-radius': ['interpolate', ['linear'], ['get', 'metricVal'], 0, 12, maxValue, 32],
            'circle-color': '#10B981',
            'circle-opacity': 0.1,
            'circle-blur': 0.8
         }
      });
      // Main bubble
      map.addLayer({
         'id': 'run-circle',
         'type': 'circle',
         'source': 'cities-running',
         'paint': {
            'circle-radius': ['interpolate', ['linear'], ['get', 'metricVal'], 0, 6, maxValue, 20],
            'circle-color': '#10B981',
            'circle-opacity': 0.7,
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ECFDF5',
            'circle-stroke-opacity': 0.9
         }
      });
      // Count label inside running bubble
      map.addLayer({
        'id': 'run-label',
        'type': 'symbol',
        'source': 'cities-running',
        'layout': {
          'text-field': ['to-string', ['get', 'metricVal']],
          'text-size': 10,
          'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
          'text-allow-overlap': true,
          'text-ignore-placement': true
        },
        'paint': {
          'text-color': '#fff',
          'text-halo-color': 'rgba(16,185,129,0.3)',
          'text-halo-width': 1
        }
      });

      // --- NPA BUBBLE (soft rose) ---
      // Outer glow
      map.addLayer({
         'id': 'npa-glow',
         'type': 'circle',
         'source': 'cities-npa',
         'paint': {
            'circle-radius': ['interpolate', ['linear'], ['get', 'metricVal'], 0, 12, maxValue, 32],
            'circle-color': '#F43F5E',
            'circle-opacity': 0.1,
            'circle-blur': 0.8
         }
      });
      // Main bubble
      map.addLayer({
         'id': 'npa-circle',
         'type': 'circle',
         'source': 'cities-npa',
         'paint': {
            'circle-radius': ['interpolate', ['linear'], ['get', 'metricVal'], 0, 6, maxValue, 20],
            'circle-color': '#F43F5E',
            'circle-opacity': 0.7,
            'circle-stroke-width': 2,
            'circle-stroke-color': '#FFF1F2',
            'circle-stroke-opacity': 0.9
         }
      });
      // Count label inside NPA bubble
      map.addLayer({
        'id': 'npa-label',
        'type': 'symbol',
        'source': 'cities-npa',
        'layout': {
          'text-field': ['to-string', ['get', 'metricVal']],
          'text-size': 10,
          'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
          'text-allow-overlap': true,
          'text-ignore-placement': true
        },
        'paint': {
          'text-color': '#fff',
          'text-halo-color': 'rgba(244,63,94,0.3)',
          'text-halo-width': 1
        }
      });

      // --- City name labels ---
      map.addLayer({
        'id': 'city-names',
        'type': 'symbol',
        'source': 'cities-all',
        'layout': {
          'text-field': ['get', 'city'],
          'text-size': 10,
          'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
          'text-offset': [0, 1.8],
          'text-anchor': 'top',
          'text-allow-overlap': false
        },
        'paint': {
          'text-color': '#4B5563',
          'text-halo-color': '#fff',
          'text-halo-width': 2
        }
      });

      // Invisible interact layer
      map.addLayer({
         'id': 'city-interact',
         'type': 'circle',
         'source': 'cities-all',
         'paint': {
            'circle-radius': 30,
            'circle-color': 'transparent',
            'circle-stroke-width': 0
         }
      });

      map.on('click', 'city-interact', (e) => {
        const props = e.features[0].properties;
        // Tell the host app (React Native / web parent) to open the full Brand > Sub Brand > Vendor >
        // Material breakdown dialog for this city — richer than a map popup can show.
        const payload = JSON.stringify({
          type: 'city-click',
          city: props.city,
          total: props.total,
          running: props.running,
          npa: props.npa,
          materials: JSON.parse(props.materials),
        });
        if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
          window.ReactNativeWebView.postMessage(payload);
        } else if (window.parent) {
          window.parent.postMessage(payload, '*');
        }
      });

      map.on('mouseenter', 'city-interact', () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', 'city-interact', () => { map.getCanvas().style.cursor = ''; });
    });
  </script>
</body>
</html>
`;

export default function GeoMap3D({ data = [] }: { data?: any[] }) {
  const { isTabletUp: isTablet } = useBreakpoint();
  const [activeMetric, setActiveMetric] = useState<'Total' | 'Running' | 'NPA'>('Total');

  type CityMaterial = { brandName: string; subBrandName: string; vendorName: string; moldCode: string; moldDescription: string; status: 'Running Asset' | 'NPA Asset'; cost: number; depreciation: number };
  type StatData = { total: number; running: number; npa: number; lat: number; lng: number; materials: CityMaterial[] };
  type CityClickPayload = { type: 'city-click'; city: string; total: number; running: number; npa: number; materials: CityMaterial[] };

  // Bubble-tap detail dialog — populated from the map's postMessage (web: window message event,
  // native: WebView onMessage), since a maplibre popup alone can't show a full Brand > Sub Brand >
  // Vendor > Material breakdown.
  const [cityDetail, setCityDetail] = useState<CityClickPayload | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const handleMessage = (event: MessageEvent) => {
      if (typeof event.data !== 'string') return;
      try {
        const parsed = JSON.parse(event.data);
        if (parsed && parsed.type === 'city-click') setCityDetail(parsed);
      } catch {
        // ignore unrelated postMessage traffic (e.g. from maplibre's own iframe internals)
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleNativeMessage = (data: string) => {
    try {
      const parsed = JSON.parse(data);
      if (parsed && parsed.type === 'city-click') setCityDetail(parsed);
    } catch {
      // ignore malformed payloads
    }
  };

  // 1. Process data for Map (Aggregated by City) — also keeps the full per-material list (brand/sub
  // brand/vendor/status/value) per city so a bubble tap can show the full breakdown, not just counts.
  const cityData = React.useMemo(() => {
    const map = new Map<string, StatData>();

    const sourceData = data.length > 0 ? data : [
       { VendCity: 'KOLKATA', ZRUNNING: 'X' }, { VendCity: 'TALOJ23', ZNPA: 'X' },
       { VendCity: 'DELHI', ZRUNNING: 'X' }, { VendCity: 'GUWAHATI', ZNPA: 'X' },
       { VendCity: 'BANGALORE', ZRUNNING: 'X' }, { VendCity: 'CHENNAI', ZRUNNING: 'X' }
    ];

    sourceData.forEach(item => {
      const rawCity = item.VendCity || item.CITY || item.city || item.VEND_CITY || item.VEND_REG_NAME || 'Unknown City';
      const cityName = rawCity.toUpperCase();

      if (!map.has(cityName)) {
        const [lng, lat] = mapCityToLngLat(cityName);
        map.set(cityName, { total: 0, running: 0, npa: 0, lat, lng, materials: [] });
      }

      const loc = map.get(cityName)!;
      loc.total += 1;

      const status: 'Running Asset' | 'NPA Asset' =
        (item.ZRUNNING === 'X' || item.Zrunning === 'X' || item.status === 'Running Asset')
          ? 'Running Asset'
          : (item.ZNPA === 'X' || item.Znpa === 'X' || item.status === 'NPA Asset')
            ? 'NPA Asset'
            : 'Running Asset';

      if (status === 'Running Asset') loc.running += 1; else loc.npa += 1;

      loc.materials.push({
        brandName: item.BRANDDESC || item.BrandDesc || item.Branddesc || item.brandDesc || 'Unknown Brand',
        subBrandName: item.SUBBRANDDESC || item.SubBrandDesc || item.Subbranddesc || item.subBrandDesc || 'Unspecified',
        vendorName: item.NAME1 || item.Name1 || `Vendor ${item.LIFNR || item.Lifnr || ''}`,
        moldCode: item.MATNR || item.Matnr || '',
        moldDescription: item.MAKTX || item.Maktx || item.moldDescription || item.description || 'Unnamed material',
        status,
        cost: parseFloat(item.KANSW || item.Kansw || '0'),
        depreciation: parseFloat(item.KNAFA || item.Knafa || '0'),
      });
    });

    return Array.from(map.entries()).map(([city, stats]) => ({ city, ...stats }));
  }, [data]);

  // 2. Process data for Side Panel (Aggregated by Category)
  const categoryData = React.useMemo(() => {
     const catMap = new Map<string, { total: number; running: number; npa: number }>();
     
     const sourceData = data.length > 0 ? data : [
        { category: 'Injection', status: 'Running Asset' }, { category: 'Injection', status: 'NPA Asset' },
        { category: 'Cubic', status: 'Running Asset' }, { category: 'Core Back', status: 'NPA Asset' },
        { category: 'Injection', status: 'Running Asset' }, { category: 'Cubic', status: 'Running Asset' }
     ];

     sourceData.forEach(item => {
        const catName = item.CATEGORY || item.Category || item.category || 'General';
        if (!catMap.has(catName)) {
           catMap.set(catName, { total: 0, running: 0, npa: 0 });
        }
        const c = catMap.get(catName)!;
        c.total += 1;
        if (item.ZRUNNING === 'X' || item.Zrunning === 'X' || item.status === 'Running Asset') {
           c.running += 1;
        } else if (item.ZNPA === 'X' || item.Znpa === 'X' || item.status === 'NPA Asset') {
           c.npa += 1;
        } else {
           c.running += 1;
        }
     });

     return Array.from(catMap.entries()).sort((a, b) => b[1].total - a[1].total);
  }, [data]);

  const maxCatTotal = Math.max(1, ...categoryData.map(c => c[1].total));
  const totalAssets = cityData.reduce((a, c) => a + c.total, 0);
  const totalRunning = cityData.reduce((a, c) => a + c.running, 0);
  const totalNpa = cityData.reduce((a, c) => a + c.npa, 0);
  const totalCities = cityData.length;

  const htmlContent = getHtmlContent(JSON.stringify(cityData), activeMetric);

  const METRIC_CONFIG = {
    Total: { color: '#6366F1', glow: 'rgba(99,102,241,0.25)', icon: Icons.Globe, gradient: ['#6366F1', '#8B5CF6'] as const },
    Running: { color: '#10B981', glow: 'rgba(16,185,129,0.25)', icon: Icons.Play, gradient: ['#10B981', '#34D399'] as const },
    NPA: { color: '#F43F5E', glow: 'rgba(244,63,94,0.25)', icon: Icons.Warning, gradient: ['#F43F5E', '#FB7185'] as const },
  };

  const activeConfig = METRIC_CONFIG[activeMetric];

  return (
    <View style={[styles.container]}>
      {/* Dark futuristic header */}
      <View style={styles.headerRow}>
         <View>
            <View style={styles.header}>
               <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: activeConfig.color + '18', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: activeConfig.color + '30' }}>
                 <Icons.GlobeHemisphereWest size={22} color={activeConfig.color} weight="duotone" />
               </View>
               <View>
                 <Text style={styles.title}>India Asset Map</Text>
                 <Text style={styles.subtitle}>{totalCities} locations • {totalAssets} assets tracked</Text>
               </View>
            </View>
         </View>
         
         {/* Futuristic Metric Selector */}
         <View style={styles.selectorRow}>
            {(['Total', 'Running', 'NPA'] as const).map(metric => {
              const cfg = METRIC_CONFIG[metric];
              const isActive = activeMetric === metric;
              return (
                <TouchableOpacity 
                   key={metric}
                   style={[
                     styles.metricPill,
                     isActive && {
                       backgroundColor: cfg.color,
                       shadowColor: cfg.color,
                       shadowOffset: { width: 0, height: 4 },
                       shadowOpacity: 0.4,
                       shadowRadius: 12,
                       elevation: 8,
                     }
                   ]}
                   onPress={() => setActiveMetric(metric)}
                   activeOpacity={0.7}
                >
                   <cfg.icon size={14} color={isActive ? '#FFF' : cfg.color} weight={isActive ? "fill" : "bold"} />
                   <Text style={[styles.metricPillText, isActive && { color: '#FFF' }]}>{metric}</Text>
                </TouchableOpacity>
              );
            })}
         </View>
      </View>

      {/* Quick Stats Row */}
      <View style={{ flexDirection: 'row', gap: 12, marginTop: 20, marginBottom: 20 }}>
        {[
          { label: 'Total', value: totalAssets, color: '#6366F1', icon: Icons.Stack },
          { label: 'Running', value: totalRunning, color: '#10B981', icon: Icons.Play },
          { label: 'NPA', value: totalNpa, color: '#F43F5E', icon: Icons.Warning },
          { label: 'Cities', value: totalCities, color: '#0EA5E9', icon: Icons.MapPin },
        ].map((stat, i) => (
          <Animated.View key={stat.label} entering={FadeIn.delay(i * 80).springify()} style={{
            flex: 1,
            backgroundColor: stat.color + '10',
            borderRadius: 14,
            padding: 14,
            borderWidth: 1,
            borderColor: stat.color + '20',
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <stat.icon size={14} color={stat.color} weight="bold" />
              <Text style={{ fontSize: 9, color: stat.color, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 }}>{stat.label}</Text>
            </View>
            <Text style={{ fontSize: 22, fontWeight: '900', color: '#111827' }}>{stat.value}</Text>
          </Animated.View>
        ))}
      </View>
      
      <View style={{ flexDirection: isTablet ? 'row' : 'column', gap: 20 }}>
        {/* Map Visualization */}
        <View style={[styles.mapWrap, isTablet && { flex: 2.5 }]}>
          {Platform.OS === 'web' ? (
            <iframe 
              key={activeMetric}
              srcDoc={htmlContent} 
              style={{ width: '100%', height: '100%', border: 'none', borderRadius: 20 } as any} 
              sandbox="allow-scripts allow-same-origin"
            />
          ) : (
            <WebView
              key={activeMetric}
              source={{ html: htmlContent }}
              style={styles.webview}
              scrollEnabled={false}
              bounces={false}
              showsHorizontalScrollIndicator={false}
              showsVerticalScrollIndicator={false}
              originWhitelist={['*']}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              onMessage={(event) => handleNativeMessage(event.nativeEvent.data)}
            />
          )}
          
          {/* Clean Bubble Legend */}
          <View style={[styles.legend, { borderColor: '#E5E7EB' }]}>
             <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
               <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                 <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#10B981', opacity: 0.8 }} />
                 <Text style={[styles.legendLabelText, { color: '#10B981' }]}>Running</Text>
               </View>
               <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                 <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#F43F5E', opacity: 0.8 }} />
                 <Text style={[styles.legendLabelText, { color: '#F43F5E' }]}>NPA</Text>
               </View>
             </View>
             <Text style={{ fontSize: 9, color: '#9CA3AF', fontWeight: '600', marginTop: 6 }}>Bubble size = asset count</Text>
          </View>
        </View>
        
        {/* Category Breakdown Panel */}
        <View style={[styles.statsPanel, isTablet && { flex: 1.5 }]}>
          <View style={styles.statsHeader}>
             <View>
               <Text style={styles.statsTitle}>Category Breakdown</Text>
               <Text style={{ fontSize: 11, color: '#9CA3AF', fontWeight: '600', marginTop: 2 }}>Running vs NPA distribution</Text>
             </View>
             <View style={styles.barLegend}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(16,185,129,0.08)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 }}>
                  <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
                  <Text style={[styles.legendDotText, { color: '#10B981' }]}>Run</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(244,63,94,0.08)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 }}>
                  <View style={[styles.legendDot, { backgroundColor: '#F43F5E' }]} />
                  <Text style={[styles.legendDotText, { color: '#F43F5E' }]}>NPA</Text>
                </View>
             </View>
          </View>
          
          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} nestedScrollEnabled={true}>
             {categoryData.map(([catName, stats], i) => (
                <Animated.View key={i} entering={FadeInRight.delay(i * 120).springify()} style={styles.categoryRow}>
                   {/* Category label with colored dot */}
                   <View style={{ width: 90, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                     <View style={{ width: 4, height: 28, borderRadius: 2, backgroundColor: ['#6366F1', '#0EA5E9', '#F59E0B', '#EC4899', '#10B981'][i % 5] }} />
                     <Text style={styles.catLabel} numberOfLines={1}>{catName}</Text>
                   </View>
                   
                   <View style={styles.barsContainer}>
                      {/* NPA Bar */}
                      <View style={[styles.barWrap, { justifyContent: 'flex-end' }]}>
                         <Text style={[styles.barValTextRight, { color: '#F43F5E' }]}>{stats.npa}</Text>
                         <View style={{
                           width: `${Math.max((stats.npa / maxCatTotal) * 100, 5)}%`,
                           height: 24,
                           borderRadius: 6,
                           overflow: 'hidden',
                         }}>
                           <LinearGradient
                             colors={['#FB7185', '#F43F5E']}
                             start={{ x: 0, y: 0 }}
                             end={{ x: 1, y: 0 }}
                             style={{ flex: 1, borderRadius: 6 }}
                           />
                         </View>
                      </View>
                      
                      {/* Center divider */}
                      <View style={styles.barDivider} />
                      
                      {/* Running Bar */}
                      <View style={[styles.barWrap, { justifyContent: 'flex-start' }]}>
                         <View style={{
                           width: `${Math.max((stats.running / maxCatTotal) * 100, 5)}%`,
                           height: 24,
                           borderRadius: 6,
                           overflow: 'hidden',
                         }}>
                           <LinearGradient
                             colors={['#10B981', '#34D399']}
                             start={{ x: 0, y: 0 }}
                             end={{ x: 1, y: 0 }}
                             style={{ flex: 1, borderRadius: 6 }}
                           />
                         </View>
                         <Text style={[styles.barValTextLeft, { color: '#10B981' }]}>{stats.running}</Text>
                      </View>
                   </View>
                </Animated.View>
             ))}
          </ScrollView>
        </View>
      </View>

      {/* Bubble-tap detail dialog — Brand > Sub Brand > Vendor > Material breakdown for the tapped city,
          with Running/NPA segregation and values visible at every level. */}
      <Modal visible={!!cityDetail} transparent animationType="fade" onRequestClose={() => setCityDetail(null)}>
        <View style={styles.dialogOverlay}>
          <View style={styles.dialogCard}>
            <View style={styles.dialogHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.dialogTitle} numberOfLines={1}>{cityDetail?.city}</Text>
                <Text style={styles.dialogSubtitle}>
                  {cityDetail?.total ?? 0} material{(cityDetail?.total ?? 0) === 1 ? '' : 's'} · {cityDetail?.running ?? 0} Running · {cityDetail?.npa ?? 0} NPA
                </Text>
              </View>
              <TouchableOpacity onPress={() => setCityDetail(null)} style={{ padding: 4 }}>
                <Icons.X size={20} color="#6B7280" weight="bold" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 480 }} showsVerticalScrollIndicator={false}>
              {Object.entries(groupBy(cityDetail?.materials ?? [], (m) => m.brandName)).map(([brandName, brandMaterials]) => (
                <View key={brandName} style={styles.dialogBrandBlock}>
                  <DialogGroupHeader label={brandName} materials={brandMaterials} icon={Icons.Tag} />
                  {Object.entries(groupBy(brandMaterials, (m) => m.subBrandName)).map(([subBrandName, subBrandMaterials]) => (
                    <View key={subBrandName} style={styles.dialogSubBrandBlock}>
                      <DialogGroupHeader label={subBrandName} materials={subBrandMaterials} icon={Icons.Bookmark} indent={16} />
                      {Object.entries(groupBy(subBrandMaterials, (m) => m.vendorName)).map(([vendorName, vendorMaterials]) => (
                        <View key={vendorName} style={styles.dialogVendorBlock}>
                          <DialogGroupHeader label={vendorName} materials={vendorMaterials} icon={Icons.Buildings} indent={32} />
                          {vendorMaterials.map((m, idx) => {
                            const isRunning = m.status === 'Running Asset';
                            return (
                              <View key={`${m.moldCode}-${idx}`} style={styles.dialogMaterialRow}>
                                <View style={[styles.dialogStatusDot, { backgroundColor: isRunning ? '#10B981' : '#F43F5E' }]} />
                                <View style={{ flex: 1 }}>
                                  <Text style={styles.dialogMaterialTitle} numberOfLines={1}>{m.moldDescription}</Text>
                                  <Text style={styles.dialogMaterialCode}>Code: {m.moldCode}</Text>
                                </View>
                                <View style={{ alignItems: 'flex-end' }}>
                                  <Text style={[styles.dialogStatusPillText, { color: isRunning ? '#10B981' : '#F43F5E' }]}>{isRunning ? 'Running' : 'NPA'}</Text>
                                  <Text style={styles.dialogMaterialValue}>₹{m.cost.toLocaleString('en-IN')}</Text>
                                </View>
                              </View>
                            );
                          })}
                        </View>
                      ))}
                    </View>
                  ))}
                </View>
              ))}
              {!cityDetail?.materials?.length && (
                <Text style={{ padding: 20, textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>No material details available for this location.</Text>
              )}
            </ScrollView>

            <TouchableOpacity style={styles.dialogCloseBtn} onPress={() => setCityDetail(null)}>
              <Text style={styles.dialogCloseBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/** Group header row (Brand / Sub Brand / Vendor level) — name + Running/NPA counts + Acquisition value. */
const DialogGroupHeader = ({ label, materials, icon: Icon, indent = 0 }: { label: string; materials: any[]; icon: Icons.Icon; indent?: number }) => {
  const running = materials.filter((m) => m.status === 'Running Asset').length;
  const npa = materials.filter((m) => m.status === 'NPA Asset').length;
  const cost = materials.reduce((s, m) => s + (m.cost || 0), 0);
  return (
    <View style={[styles.dialogGroupHeader, { marginLeft: indent }]}>
      <Icon size={13} color="#6366F1" weight="bold" />
      <Text style={styles.dialogGroupLabel} numberOfLines={1}>{label}</Text>
      <View style={styles.dialogGroupStats}>
        <Text style={[styles.dialogGroupStatText, { color: '#10B981' }]}>{running} Run</Text>
        <Text style={[styles.dialogGroupStatText, { color: '#F43F5E' }]}>{npa} NPA</Text>
        <Text style={[styles.dialogGroupStatText, { color: '#6366F1' }]}>₹{cost.toLocaleString('en-IN')}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    marginVertical: 20,
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.08)',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.06,
    shadowRadius: 30,
    elevation: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  title: {
    fontSize: 20,
    fontWeight: '900' as any,
    color: '#111827',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '600' as any,
    marginTop: 2,
  },
  selectorRow: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    padding: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.1)',
    gap: 4,
  },
  metricPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metricPillText: {
    fontSize: 13,
    fontWeight: '800' as any,
    color: '#6B7280',
  },
  mapWrap: {
    width: '100%',
    height: 460,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.2)',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 6,
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  legend: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    minWidth: 130,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  legendTitle: {
    fontSize: 11,
    fontWeight: '900' as any,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  legendScale: {
    width: '100%',
  },
  legendBar: {
    height: 6,
    width: '100%',
    borderRadius: 3,
  },
  legendLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  legendLabelText: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '700' as any,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statsPanel: {
    width: '100%',
    maxHeight: 460,
  },
  statsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: '900' as any,
    color: '#111827',
  },
  barLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendDotText: {
    fontSize: 11,
    fontWeight: '800' as any,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
    gap: 12,
  },
  catLabel: {
    fontSize: 13,
    fontWeight: '800' as any,
    color: '#374151',
    flex: 1,
  },
  barsContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  barDivider: {
    height: 30,
    width: 2,
    backgroundColor: '#E5E7EB',
    borderRadius: 1,
  },
  barWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  barValTextLeft: {
    fontSize: 13,
    fontWeight: '900' as any,
    minWidth: 24,
  },
  barValTextRight: {
    fontSize: 13,
    fontWeight: '900' as any,
    minWidth: 24,
    textAlign: 'right',
  },

  // Bubble-tap Brand > Sub Brand > Vendor > Material breakdown dialog
  dialogOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  dialogCard: {
    width: '100%',
    maxWidth: 560,
    maxHeight: '85%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 30,
    elevation: 12,
  },
  dialogHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingBottom: 14,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  dialogTitle: { fontSize: 17, fontWeight: '900' as any, color: '#111827' },
  dialogSubtitle: { fontSize: 12, color: '#6B7280', fontWeight: '600' as any, marginTop: 3 },
  dialogBrandBlock: { marginBottom: 14 },
  dialogSubBrandBlock: { marginTop: 8 },
  dialogVendorBlock: { marginTop: 6 },
  dialogGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  dialogGroupLabel: { flex: 1, fontSize: 13, fontWeight: '800' as any, color: '#111827' },
  dialogGroupStats: { flexDirection: 'row', gap: 10 },
  dialogGroupStatText: { fontSize: 11, fontWeight: '800' as any },
  dialogMaterialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginLeft: 44,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F9FAFB',
  },
  dialogStatusDot: { width: 8, height: 8, borderRadius: 4 },
  dialogMaterialTitle: { fontSize: 13, fontWeight: '700' as any, color: '#111827' },
  dialogMaterialCode: { fontSize: 10, color: '#9CA3AF', fontWeight: '600' as any, marginTop: 1 },
  dialogStatusPillText: { fontSize: 10, fontWeight: '900' as any },
  dialogMaterialValue: { fontSize: 12, fontWeight: '800' as any, color: '#111827', marginTop: 2 },
  dialogCloseBtn: {
    marginTop: 14,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  dialogCloseBtnText: { fontSize: 13, fontWeight: '800' as any, color: '#111827' },
});
