import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Animated,
  Image,
  Modal,
  NativeModules,
  Pressable,
  StyleSheet,
  Text,
  TurboModuleRegistry,
  UIManager,
  View,
  Platform,
} from 'react-native'
import Constants, { ExecutionEnvironment } from 'expo-constants'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import { getMapboxAccessToken } from '../../config/mapbox'
import Button from '../ui/Button'
import { colors } from '../../theme/colors'

const STATIC_ZOOM = 15
const STATIC_ZOOM_MIN = 2
const STATIC_ZOOM_MAX = 19

function sameLatLng(a, b, eps = 1e-6) {
  if (!a || !b) return false
  return Math.abs(a.lat - b.lat) < eps && Math.abs(a.lng - b.lng) < eps
}

function rncWebViewNativeAvailable() {
  try {
    if (typeof TurboModuleRegistry?.get === 'function') {
      return TurboModuleRegistry.get('RNCWebViewModule') != null
    }
  } catch {
    /* non-fatal */
  }
  try {
    return NativeModules?.RNCWebViewModule != null
  } catch {
    return false
  }
}

function rnMapboxNativeAvailable() {
  if (Platform.OS !== 'android' && Platform.OS !== 'ios') return false
  try {
    if (typeof TurboModuleRegistry?.get === 'function' && TurboModuleRegistry.get('RNMBXModule') != null) {
      return true
    }
  } catch {
    /* non-fatal */
  }
  try {
    if (typeof UIManager.hasViewManagerConfig === 'function' && UIManager.hasViewManagerConfig('RNMBXMapView')) {
      return true
    }
  } catch {
    /* non-fatal */
  }
  try {
    if (typeof UIManager.getViewManagerConfig === 'function' && UIManager.getViewManagerConfig('RNMBXMapView') != null) {
      return true
    }
  } catch {
    /* non-fatal */
  }
  return NativeModules?.RNMBXModule != null
}

function useRnMapboxNativePath() {
  return useMemo(() => {
    // Allow native Mapbox in dev builds (Expo Go is StoreClient but lacks the module anyway;
    // rnMapboxNativeAvailable() returns false in that case, so this check is redundant and
    // only blocks native maps in custom dev builds where they'd work fine.)
    return rnMapboxNativeAvailable()
  }, [])
}

/** Only true when linked native module exists (e.g. dev build / prebuild). Expo Go has no RNCWebViewModule. */
function useWebViewMapsPath() {
  return useMemo(() => rncWebViewNativeAvailable(), [])
}

// No pin in the URL — we overlay pin as a View so the image never reloads on tap
function staticOsmUri(lat, lng, zoom) {
  const la = Number(lat).toFixed(6)
  const lo = Number(lng).toFixed(6)
  const z = Math.round(zoom)
  return `https://staticmap.openstreetmap.de/staticmap.php?center=${la},${lo}&zoom=${z}&size=640x640`
}

function staticMapboxUri(lat, lng, accessToken, zoom) {
  const lo = Number(lng).toFixed(6)
  const la = Number(lat).toFixed(6)
  const z = Number(zoom).toFixed(2)
  return `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/${lo},${la},${z}/640x640@2x?access_token=${encodeURIComponent(accessToken)}`
}

function staticPreviewUri(lat, lng, accessToken, zoom) {
  if (accessToken) return staticMapboxUri(lat, lng, accessToken, zoom)
  return staticOsmUri(lat, lng, zoom)
}

/** Web Mercator: tap pixel → lat/lng */
function pressToLatLng(tx, ty, iw, ih, centerLat, centerLng, zoom) {
  const scale = 256 * Math.pow(2, zoom)
  const cx = ((centerLng + 180) / 360) * scale
  const sinLat = Math.sin((centerLat * Math.PI) / 180)
  const cy = (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * scale
  const wx = cx + (tx - iw / 2)
  const wy = cy + (ty - ih / 2)
  const lng = (wx / scale) * 360 - 180
  const n = Math.PI - (2 * Math.PI * wy) / scale
  const lat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)))
  return { lat, lng }
}

/** Web Mercator: lat/lng → pixel offset from top-left of a view of size iw×ih */
function latLngToPixel(lat, lng, iw, ih, centerLat, centerLng, zoom) {
  const scale = 256 * Math.pow(2, zoom)
  const cx = ((centerLng + 180) / 360) * scale
  const sinLat0 = Math.sin((centerLat * Math.PI) / 180)
  const cy = (0.5 - Math.log((1 + sinLat0) / (1 - sinLat0)) / (4 * Math.PI)) * scale
  const px = ((lng + 180) / 360) * scale
  const sinLat1 = Math.sin((lat * Math.PI) / 180)
  const py = (0.5 - Math.log((1 + sinLat1) / (1 - sinLat1)) / (4 * Math.PI)) * scale
  return { x: px - cx + iw / 2, y: py - cy + ih / 2 }
}

const PIN_SIZE = 28
const PIN_HALF = PIN_SIZE / 2

function MapPickerStaticPreview({ pin, onPick, geoBusy, onUseMyLocation, onUseLocation, onClose }) {
  const [layout, setLayout] = useState({ iw: 320, ih: 260 })
  // mapCenter controls the background image — decoupled from pin so taps never reload the image
  const [mapCenter, setMapCenter] = useState({ lat: pin.lat, lng: pin.lng, zoom: STATIC_ZOOM })
  const accessToken = useMemo(() => getMapboxAccessToken(), [])
  const prevGeoBusyRef = useRef(geoBusy)
  const zoomDebounceRef = useRef(null)

  // Pinch-to-zoom: scale visually during gesture; commit integer zoom step on release (RNGH Gesture API)
  const pinchScaleAnim = useRef(new Animated.Value(1)).current

  const pinchGesture = useMemo(
    () =>
      Gesture.Pinch()
        .onUpdate((e) => {
          pinchScaleAnim.setValue(e.scale)
        })
        .onEnd((e) => {
          pinchScaleAnim.setValue(1)
          const s = typeof e.scale === 'number' && e.scale > 0 ? e.scale : 1
          const zoomDelta = Math.log2(s)
          setMapCenter((c) => {
            const newZoom = Math.min(
              STATIC_ZOOM_MAX,
              Math.max(STATIC_ZOOM_MIN, Math.round(c.zoom + zoomDelta))
            )
            return newZoom === c.zoom ? c : { ...c, zoom: newZoom }
          })
        }),
    [pinchScaleAnim]
  )

  // When GPS finishes (geoBusy true→false) re-center the map on the new pin
  useEffect(() => {
    if (prevGeoBusyRef.current && !geoBusy) {
      setMapCenter({ lat: pin.lat, lng: pin.lng, zoom: STATIC_ZOOM })
    }
    prevGeoBusyRef.current = geoBusy
  }, [geoBusy, pin.lat, pin.lng])

  // Background image: only changes when mapCenter changes (not on every tap)
  const uri = useMemo(
    () => staticPreviewUri(mapCenter.lat, mapCenter.lng, accessToken, mapCenter.zoom),
    [mapCenter.lat, mapCenter.lng, mapCenter.zoom, accessToken]
  )

  // Marker pixel position over the background image
  const markerPixel = useMemo(() => {
    const { x, y } = latLngToPixel(pin.lat, pin.lng, layout.iw, layout.ih, mapCenter.lat, mapCenter.lng, mapCenter.zoom)
    return {
      left: Math.round(x - PIN_HALF),
      top: Math.round(y - PIN_SIZE), // anchor at bottom-center like a map pin
    }
  }, [pin.lat, pin.lng, layout.iw, layout.ih, mapCenter.lat, mapCenter.lng, mapCenter.zoom])

  // Debounce zoom button presses so rapid taps batch into one image fetch
  const pendingZoomDeltaRef = useRef(0)
  function handleZoom(delta) {
    pendingZoomDeltaRef.current += delta
    if (zoomDebounceRef.current) clearTimeout(zoomDebounceRef.current)
    zoomDebounceRef.current = setTimeout(() => {
      const totalDelta = pendingZoomDeltaRef.current
      pendingZoomDeltaRef.current = 0
      zoomDebounceRef.current = null
      setMapCenter((c) => ({
        ...c,
        zoom: Math.min(STATIC_ZOOM_MAX, Math.max(STATIC_ZOOM_MIN, c.zoom + totalDelta)),
      }))
    }, 250)
  }

  return (
    <>
      <Text style={styles.staticHint}>
        {accessToken
          ? 'Tap to move pin · Pinch or use +/− to zoom'
          : 'Tap to move pin · Pinch or use +/− to zoom · Add EXPO_MAPBOX_TOKEN for Mapbox tiles'}
      </Text>
      <View
        style={styles.mapWrap}
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout
          if (width > 0 && height > 0) setLayout({ iw: width, ih: height })
        }}
      >
        <GestureDetector gesture={pinchGesture}>
          <View style={StyleSheet.absoluteFill} collapsable={false}>
            <Animated.View
              style={[StyleSheet.absoluteFill, { transform: [{ scale: pinchScaleAnim }] }]}
              pointerEvents="box-none"
            >
              <Pressable
                style={StyleSheet.absoluteFill}
                onPress={(ev) => {
                  const { locationX, locationY } = ev.nativeEvent
                  const { lat, lng } = pressToLatLng(
                    locationX, locationY,
                    layout.iw, layout.ih,
                    mapCenter.lat, mapCenter.lng, mapCenter.zoom
                  )
                  onPick({ lat, lng })
                }}
              >
                <Image
                  source={{ uri }}
                  style={styles.staticImg}
                  resizeMode="cover"
                  fadeDuration={0}
                />
              </Pressable>
            </Animated.View>
          </View>
        </GestureDetector>

        {/* Pin marker — repositioned without reloading image */}
        <View style={[styles.pinMarker, { left: markerPixel.left, top: markerPixel.top }]}>
          <View style={styles.pinHead} />
          <View style={styles.pinTail} />
        </View>

        {/* Zoom controls */}
        <View style={styles.mapZoomControls}>
          <Pressable style={styles.mapZoomBtn} onPress={() => handleZoom(1)}>
            <Text style={styles.mapZoomTxt}>+</Text>
          </Pressable>
          <View style={styles.mapZoomDivider} />
          <Pressable style={styles.mapZoomBtn} onPress={() => handleZoom(-1)}>
            <Text style={styles.mapZoomTxt}>−</Text>
          </Pressable>
        </View>
      </View>

      <Text style={styles.coords}>
        Selected: {pin.lat.toFixed(6)}, {pin.lng.toFixed(6)}
      </Text>
      <Button title={geoBusy ? 'Locating...' : 'Use my location'} variant="outline" onPress={onUseMyLocation} />
      <View style={{ height: 8 }} />
      <Button title="Use this location" onPress={onUseLocation} />
      <View style={{ height: 8 }} />
      <Button title="Cancel" variant="outline" onPress={onClose} />
    </>
  )
}

function leafletPickerHtml(lat, lng, accessToken) {
  const la = Number(lat).toFixed(8)
  const lo = Number(lng).toFixed(8)
  const tokenJson = JSON.stringify(accessToken || '')
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=5,user-scalable=yes"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
html,body,#m{margin:0;padding:0;height:100%;width:100%}
#m{background:#e2e8f0}
#m.leaflet-container,.leaflet-container{
  touch-action:pan-x pan-y pinch-zoom;
  -webkit-tap-highlight-color:transparent
}
.leaflet-control-zoom a{min-width:36px;min-height:36px;line-height:36px;font-size:20px;font-weight:600}
</style>
</head>
<body>
<div id="m"></div>
<script>
(function(){
  var ACCESS = ${tokenJson};
  var la = ${la}, lo = ${lo};
  var map = L.map('m', {
    zoomControl: true,
    zoomControlOptions: { position: 'topright' },
    attributionControl: true,
    scrollWheelZoom: true,
    wheelPxPerZoomLevel: 60,
    doubleClickZoom: true,
    touchZoom: true,
    boxZoom: true,
    dragging: true,
    keyboard: true,
    maxZoom: 22,
    minZoom: 2
  }).setView([la, lo], 15);
  if (ACCESS && String(ACCESS).length > 0) {
    L.tileLayer('https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/512/{z}/{x}/{y}@2x?access_token=' + encodeURIComponent(ACCESS), {
      tileSize: 512,
      zoomOffset: -1,
      maxZoom: 22,
      attribution: '&copy; Mapbox &copy; OpenStreetMap'
    }).addTo(map);
  } else {
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap' }).addTo(map);
  }
  var icon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41]
  });
  var marker = L.marker([la, lo], { draggable: true, icon: icon }).addTo(map);
  window.__leafletMap = map;
  function post(lat, lng) {
    try {
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'pick', lat: lat, lng: lng }));
      }
    } catch (e) {}
  }
  marker.on('dragend', function (ev) {
    var p = ev.target.getLatLng();
    post(p.lat, p.lng);
  });
  map.on('click', function (ev) {
    marker.setLatLng(ev.latlng);
    post(ev.latlng.lat, ev.latlng.lng);
  });
  window.__syncExternalPin = function (a, b) {
    var lat2 = Number(a), lng2 = Number(b);
    if (!isFinite(lat2) || !isFinite(lng2)) return;
    marker.setLatLng([lat2, lng2]);
    var z = Math.max(map.getZoom(), 14);
    if (map.flyTo) {
      map.flyTo([lat2, lng2], z, { duration: 0.55, easeLinearity: 0.25 });
    } else {
      map.setView([lat2, lng2], z, { animate: true });
    }
  };
  setTimeout(function () { map.invalidateSize(); }, 200);
})();
</script>
</body>
</html>`
}

/** Leaflet inside WebView — only mount when native RNCWebViewModule is linked. */
function MapPickerLeafletWeb({ pin, onPick, geoBusy, onUseMyLocation, onUseLocation, onClose, visible }) {
  const webRef = useRef(null)
  const lastPickFromWebRef = useRef(null)
  const WebView = useMemo(() => {
    try {
      return require('react-native-webview').WebView
    } catch {
      return null
    }
  }, [])

  const mapboxAccessToken = useMemo(() => getMapboxAccessToken(), [])
  const [seed] = useState(() => ({ lat: pin.lat, lng: pin.lng }))
  const html = useMemo(() => leafletPickerHtml(seed.lat, seed.lng, mapboxAccessToken), [seed.lat, seed.lng, mapboxAccessToken])

  const onMessage = useCallback(
    (e) => {
      try {
        const data = JSON.parse(String(e?.nativeEvent?.data || ''))
        if (data?.type === 'pick' && Number.isFinite(Number(data.lat)) && Number.isFinite(Number(data.lng))) {
          const coords = { lat: Number(data.lat), lng: Number(data.lng) }
          lastPickFromWebRef.current = coords
          onPick(coords)
        }
      } catch {
        /* ignore */
      }
    },
    [onPick]
  )

  useEffect(() => {
    if (!visible) return
    const fromWeb = lastPickFromWebRef.current
    if (fromWeb && sameLatLng(fromWeb, pin)) {
      lastPickFromWebRef.current = null
      return
    }
    const la = Number(pin.lat)
    const lo = Number(pin.lng)
    if (!Number.isFinite(la) || !Number.isFinite(lo)) return
    const js = `try{typeof window.__syncExternalPin==='function'&&window.__syncExternalPin(${la},${lo});}catch(e){}true;`
    webRef.current?.injectJavaScript(js)
  }, [visible, pin.lat, pin.lng])

  if (!WebView) return <MapPickerStaticPreview {...{ pin, onPick, geoBusy, onUseMyLocation, onUseLocation, onClose }} />

  return (
    <>
      <View style={styles.mapWrap}>
        <WebView
          ref={webRef}
          source={{ html, baseUrl: 'https://localhost' }}
          style={StyleSheet.absoluteFill}
          originWhitelist={['*']}
          javaScriptEnabled
          domStorageEnabled
          mixedContentMode="always"
          setSupportMultipleWindows={false}
          nestedScrollEnabled
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          bounces={false}
          keyboardDisplayRequiresUserAction={false}
          onMessage={onMessage}
          onLoadEnd={() => {
            webRef.current?.injectJavaScript(
              'try{if(window.__leafletMap){window.__leafletMap.invalidateSize();}}catch(e){}true;'
            )
          }}
        />
      </View>
      <Text style={styles.coords}>
        Selected: {pin.lat.toFixed(6)}, {pin.lng.toFixed(6)}
      </Text>
      <Button title={geoBusy ? 'Locating...' : 'Use my location'} variant="outline" onPress={onUseMyLocation} />
      <View style={{ height: 8 }} />
      <Button title="Use this location" onPress={onUseLocation} />
      <View style={{ height: 8 }} />
      <Button title="Cancel" variant="outline" onPress={onClose} />
    </>
  )
}

function getLngLatFromMapboxEvent(e) {
  const coords = e?.geometry?.coordinates || e?.features?.[0]?.geometry?.coordinates
  if (!Array.isArray(coords) || coords.length < 2) return null
  const lng = Number(coords[0])
  const lat = Number(coords[1])
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  return { lat, lng }
}

function MapPickerRnMapboxNative({
  RNMapbox,
  visible,
  pin,
  geoBusy,
  onPick,
  onUseMyLocation,
  onUseLocation,
  onClose,
  mapboxToken,
}) {
  const cameraRef = useRef(null)
  const mapVisibleWasRef = useRef(false)
  const prevGeoBusyRef = useRef(geoBusy)
  const zoomRef = useRef(14)

  useEffect(() => {
    if (!RNMapbox?.setAccessToken || !mapboxToken) return
    RNMapbox.setAccessToken(mapboxToken).catch(() => {
      /* non-fatal */
    })
  }, [RNMapbox, mapboxToken])

  useEffect(() => {
    if (!visible) {
      mapVisibleWasRef.current = false
      return
    }
    if (!mapVisibleWasRef.current) {
      mapVisibleWasRef.current = true
      requestAnimationFrame(() => {
        cameraRef.current?.setCamera?.({
          centerCoordinate: [pin.lng, pin.lat],
          zoomLevel: 14,
          animationDuration: 0,
        })
      })
    }
  }, [visible, pin.lat, pin.lng])

  useEffect(() => {
    if (!visible) {
      prevGeoBusyRef.current = geoBusy
      return
    }
    if (prevGeoBusyRef.current && !geoBusy) {
      cameraRef.current?.setCamera?.({
        centerCoordinate: [pin.lng, pin.lat],
        zoomLevel: 15,
        animationDuration: 600,
      })
    }
    prevGeoBusyRef.current = geoBusy
  }, [visible, geoBusy, pin.lat, pin.lng])

  return (
    <>
      <View style={styles.mapWrap}>
        <RNMapbox.MapView
          style={StyleSheet.absoluteFill}
          styleURL="mapbox://styles/mapbox/streets-v12"
          compassEnabled
          zoomEnabled
          rotateEnabled={false}
          pitchEnabled={false}
          logoEnabled={false}
          attributionEnabled={false}
          onPress={(e) => {
            const p = getLngLatFromMapboxEvent(e)
            if (p) onPick(p)
          }}
          onCameraChanged={(e) => {
            const z = Number(e?.properties?.zoom ?? e?.properties?.zoomLevel)
            if (Number.isFinite(z)) zoomRef.current = z
          }}
        >
          <RNMapbox.Camera ref={cameraRef} defaultSettings={{ centerCoordinate: [pin.lng, pin.lat], zoomLevel: 14 }} />
          <RNMapbox.PointAnnotation
            id="map-picker-pin"
            coordinate={[pin.lng, pin.lat]}
            draggable
            onDragEnd={(e) => {
              const p = getLngLatFromMapboxEvent(e)
              if (p) onPick(p)
            }}
          >
            <View style={styles.rnMapboxPin} />
          </RNMapbox.PointAnnotation>
        </RNMapbox.MapView>
      </View>

      <View style={styles.zoomBar}>
        <Button
          title="Zoom out"
          variant="outline"
          style={styles.zoomBtn}
          onPress={() => {
            const next = Math.max(STATIC_ZOOM_MIN, zoomRef.current - 1)
            zoomRef.current = next
            cameraRef.current?.setCamera?.({ zoomLevel: next, animationDuration: 200 })
          }}
        />
        <Button
          title="Zoom in"
          variant="outline"
          style={styles.zoomBtn}
          onPress={() => {
            const next = Math.min(22, zoomRef.current + 1)
            zoomRef.current = next
            cameraRef.current?.setCamera?.({ zoomLevel: next, animationDuration: 200 })
          }}
        />
      </View>
      <Text style={styles.zoomHint}>Pinch or double-tap to zoom, use buttons, tap map to pick, or drag the pin.</Text>
      <Text style={styles.coords}>
        Selected: {pin.lat.toFixed(6)}, {pin.lng.toFixed(6)}
      </Text>
      <Button title={geoBusy ? 'Locating...' : 'Use my location'} variant="outline" onPress={onUseMyLocation} />
      <View style={{ height: 8 }} />
      <Button title="Use this location" onPress={onUseLocation} />
      <View style={{ height: 8 }} />
      <Button title="Cancel" variant="outline" onPress={onClose} />
    </>
  )
}

export default function MapPickerModal({
  visible,
  pin,
  geoBusy,
  onClose,
  onPick,
  onUseMyLocation,
  onUseLocation,
}) {
  const canRnMapboxNative = useRnMapboxNativePath()
  const canWebView = useWebViewMapsPath()
  const mapboxToken = useMemo(() => getMapboxAccessToken(), [])
  const hasMapbox = Boolean(mapboxToken)
  const rnMapboxModule = useMemo(() => {
    if (!canRnMapboxNative) return null
    try {
      const mod = require('@rnmapbox/maps')
      return mod?.default || mod
    } catch {
      return null
    }
  }, [canRnMapboxNative])
  const useRnMapbox = Boolean(canRnMapboxNative && hasMapbox && rnMapboxModule)

  if (!visible) return null

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.card}>
          <Text style={styles.title}>Pick location on map</Text>
          <Text style={styles.sub}>
            {useRnMapbox
              ? 'Use your location, tap the map, pinch to zoom, or drag the red pin to adjust exactly where you are.'
              : canWebView
                ? `Use your location, tap the map, pinch or use the zoom controls (+/− top-right), or drag the pin.${hasMapbox ? '' : ' Add EXPO_MAPBOX_TOKEN for Mapbox tiles.'}`
                : `Use GPS or tap the preview.${hasMapbox ? ' Mapbox static preview.' : ''}`}
          </Text>
          {useRnMapbox ? (
            <MapPickerRnMapboxNative
              RNMapbox={rnMapboxModule}
              visible={visible}
              pin={pin}
              geoBusy={geoBusy}
              onPick={onPick}
              onUseMyLocation={onUseMyLocation}
              onUseLocation={onUseLocation}
              onClose={onClose}
              mapboxToken={mapboxToken}
            />
          ) : canWebView ? (
            <MapPickerLeafletWeb
              visible={visible}
              pin={pin}
              onPick={onPick}
              geoBusy={geoBusy}
              onUseMyLocation={onUseMyLocation}
              onUseLocation={onUseLocation}
              onClose={onClose}
            />
          ) : (
            <MapPickerStaticPreview
              pin={pin}
              onPick={onPick}
              geoBusy={geoBusy}
              onUseMyLocation={onUseMyLocation}
              onUseLocation={onUseLocation}
              onClose={onClose}
            />
          )}
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', padding: 14, justifyContent: 'center' },
  card: {
    borderRadius: 16,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.slate200,
    padding: 14,
    maxHeight: '92%',
  },
  title: { fontSize: 18, fontWeight: '700', color: colors.slate900 },
  sub: { marginTop: 4, marginBottom: 10, fontSize: 13, color: colors.slate500, lineHeight: 18 },
  staticHint: { fontSize: 12, color: colors.slate600, lineHeight: 17, marginBottom: 8 },
  mapWrap: {
    marginTop: 6,
    height: 260,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.slate200,
    backgroundColor: colors.slate100,
  },
  staticImg: { width: '100%', height: '100%' },
  pinMarker: {
    position: 'absolute',
    width: PIN_SIZE,
    height: PIN_SIZE,
    alignItems: 'center',
    pointerEvents: 'none', // style-based in RN 0.71+ — prevents this View intercepting taps
  },
  pinHead: {
    width: PIN_SIZE,
    height: PIN_SIZE,
    borderRadius: PIN_SIZE / 2,
    backgroundColor: colors.brand,
    borderWidth: 2.5,
    borderColor: colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 3,
    elevation: 5,
  },
  pinTail: {
    width: 3,
    height: 8,
    backgroundColor: colors.brand,
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
    marginTop: -2,
  },
  mapZoomControls: {
    position: 'absolute',
    top: 10,
    right: 10,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.slate200,
    elevation: 4, // Android shadow
    shadowColor: '#000', // iOS shadow
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 2,
  },
  mapZoomBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapZoomDivider: {
    height: 1,
    backgroundColor: colors.slate200,
  },
  mapZoomTxt: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.slate900,
    lineHeight: 22,
  },
  rnMapboxPin: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#ef4444',
    borderWidth: 2,
    borderColor: colors.white,
  },
  coords: { marginTop: 8, marginBottom: 10, fontSize: 12, color: colors.slate600 },
  zoomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 8,
  },
  zoomBtn: { flex: 1 },
  zoomHint: { fontSize: 11, color: colors.slate500, textAlign: 'center', marginTop: 6, marginBottom: 2 },
})
