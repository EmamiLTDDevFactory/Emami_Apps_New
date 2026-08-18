import React, { useState } from 'react';
import { View, StyleSheet, Platform, Text, ScrollView, TouchableOpacity } from 'react-native';
import { WebView } from 'react-native-webview';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radius, shadow, font } from '@/constants/theme';
import * as Icons from 'phosphor-react-native';
import { useBreakpoint } from '@/utils/responsive';
import Animated, { FadeIn, FadeInRight } from 'react-native-reanimated';

// Map city names to rough lat/lng coordinates
const mapCityToLngLat = (cityName: string): [number, number] => {
  const c = (cityName || '').toUpperCase();
  if (c.includes('KOLKATA') || c.includes('CALCUTTA')) return [88.3639, 22.5726];
  if (c.includes('TALOJ') || c.includes('MUMBAI') || c.includes('BOMBAY')) return [73.1143, 19.0583]; // Mumbai/Taloja
  if (c.includes('DELHI') || c.includes('NOIDA') || c.includes('GURGAON')) return [77.2090, 28.6139];
  if (c.includes('CHENNAI') || c.includes('MADRAS')) return [80.2707, 13.0827];
  if (c.includes('BANGALORE') || c.includes('BENGALURU')) return [77.5946, 12.9716];
  if (c.includes('AHMEDABAD')) return [72.5714, 23.0225];
  if (c.includes('PUNE')) return [73.8567, 18.5204];
  if (c.includes('HYDERABAD')) return [78.4867, 17.3850];
  if (c.includes('GUWAHATI') || c.includes('ASSAM') || c.includes('AMINGAON')) return [91.7362, 26.1445];
  if (c.includes('PANTNAGAR') || c.includes('RUDRAPUR')) return [79.4939, 29.0253];
  if (c.includes('BADDI')) return [76.7909, 30.9578];
  if (c.includes('VAPI')) return [72.9089, 20.3703];
  if (c.includes('DAMAN')) return [72.8397, 20.3974];
  
  // Scatter unknown cities pseudo-randomly within India (lng: 70-90, lat: 10-30)
  let hash = 0;
  for (let i = 0; i < c.length; i++) {
     hash = c.charCodeAt(i) + ((hash << 5) - hash);
  }
  const lng = 72 + (Math.abs(hash) % 18);
  const lat = 12 + ((Math.abs(hash) >> 2) % 15);
  return [lng, lat];
};

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
         const val = c.total;
         if (val > maxValue) maxValue = val;
      });

      // For each city, create Running and NPA as separate features
      const runFeatures = [];
      const npaFeatures = [];
      
      cityData.forEach(c => {
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
      });

      // All cities source (for labels and interaction)
      map.addSource('cities-all', {
         type: 'geojson',
         data: {
            type: 'FeatureCollection',
            features: cityData.map(c => ({
               type: 'Feature',
               geometry: { type: 'Point', coordinates: [c.lng, c.lat] },
               properties: c
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
        const popupHtml = \`
           <div class="popup-title">\${props.city}</div>
           <div class="popup-stat-row">
             <div class="popup-stat-dot" style="background:#6366F1"></div>
             <span class="popup-stat-label">Total Assets</span>
             <span class="popup-stat-val" style="color:#6366F1">\${props.total}</span>
           </div>
           <div class="popup-stat-row">
             <div class="popup-stat-dot" style="background:#10B981"></div>
             <span class="popup-stat-label">Running</span>
             <span class="popup-stat-val" style="color:#10B981">\${props.running}</span>
           </div>
           <div class="popup-stat-row">
             <div class="popup-stat-dot" style="background:#F43F5E"></div>
             <span class="popup-stat-label">NPA</span>
             <span class="popup-stat-val" style="color:#F43F5E">\${props.npa}</span>
           </div>
        \`;
        new maplibregl.Popup()
          .setLngLat(e.lngLat)
          .setHTML(popupHtml)
          .addTo(map);
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
  
  type StatData = { total: number; running: number; npa: number; lat: number; lng: number };

  // 1. Process data for Map (Aggregated by City)
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
        map.set(cityName, { total: 0, running: 0, npa: 0, lat, lng });
      }
      
      const loc = map.get(cityName)!;
      loc.total += 1;
      
      if (item.ZRUNNING === 'X' || item.Zrunning === 'X' || item.status === 'Running Asset') {
         loc.running += 1;
      } else if (item.ZNPA === 'X' || item.Znpa === 'X' || item.status === 'NPA Asset') {
         loc.npa += 1;
      } else {
         loc.running += 1;
      }
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
              srcDoc={htmlContent} 
              style={{ width: '100%', height: '100%', border: 'none', borderRadius: 20 } as any} 
              sandbox="allow-scripts allow-same-origin"
            />
          ) : (
            <WebView
              source={{ html: htmlContent }}
              style={styles.webview}
              scrollEnabled={false}
              bounces={false}
              showsHorizontalScrollIndicator={false}
              showsVerticalScrollIndicator={false}
              originWhitelist={['*']}
              javaScriptEnabled={true}
              domStorageEnabled={true}
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
    </View>
  );
}

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
  }
});
