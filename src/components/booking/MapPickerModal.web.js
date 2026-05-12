import { useEffect, useMemo, useRef } from 'react'
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import L from 'leaflet'
import { getMapboxAccessToken } from '../../config/mapbox'
import Button from '../ui/Button'
import { colors } from '../../theme/colors'

function sameLatLng(a, b, eps = 1e-6) {
  if (!a || !b) return false
  return Math.abs(a.lat - b.lat) < eps && Math.abs(a.lng - b.lng) < eps
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
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markerRef = useRef(null)
  const pinRef = useRef(pin)
  const onPickRef = useRef(onPick)
  const lastLocalPickRef = useRef(null)
  const prevGeoBusyRef = useRef(geoBusy)
  const mapboxToken = useMemo(() => getMapboxAccessToken(), [])

  pinRef.current = pin
  onPickRef.current = onPick

  useEffect(() => {
    if (!document.getElementById('leaflet-min-css')) {
      const style = document.createElement('style')
      style.id = 'leaflet-min-css'
      style.innerHTML = `
        .leaflet-container{height:100%;width:100%;overflow:hidden;position:relative;outline:0;background:#ddd}
        .leaflet-pane,.leaflet-tile,.leaflet-marker-icon,.leaflet-marker-shadow,.leaflet-tile-container,.leaflet-pane>svg,.leaflet-pane>canvas{position:absolute;left:0;top:0}
        .leaflet-pane{z-index:400}
        .leaflet-tile-pane{z-index:200}
        .leaflet-overlay-pane{z-index:400}
        .leaflet-shadow-pane{z-index:500}
        .leaflet-marker-pane{z-index:600}
        .leaflet-tooltip-pane{z-index:650}
        .leaflet-popup-pane{z-index:700}
        .leaflet-map-pane canvas{z-index:100}
        .leaflet-map-pane svg{z-index:200}
        .leaflet-tile{visibility:hidden}
        .leaflet-tile-loaded{visibility:inherit}
        .leaflet-zoom-box{box-sizing:border-box;z-index:800}
        .leaflet-control{position:relative;z-index:800;pointer-events:auto}
        .leaflet-top,.leaflet-bottom{position:absolute;z-index:1000;pointer-events:none}
        .leaflet-top.leaflet-left,.leaflet-top.leaflet-right,.leaflet-bottom.leaflet-left,.leaflet-bottom.leaflet-right{pointer-events:none}
        .leaflet-control-container .leaflet-control{pointer-events:auto}
        .leaflet-top{top:0}.leaflet-right{right:0}.leaflet-bottom{bottom:0}.leaflet-left{left:0}
        .leaflet-control-zoom{border:1px solid #cbd5e1;border-radius:8px;overflow:hidden;background:#fff;margin:10px}
        .leaflet-control-zoom a{display:block;width:36px;height:36px;line-height:34px;text-align:center;text-decoration:none;color:#0f172a;background:#fff;font-size:22px;font-weight:600}
        .leaflet-control-zoom a+a{border-top:1px solid #e2e8f0}
        .leaflet-container{background:#cbd5e1;touch-action:pan-x pan-y pinch-zoom}
      `
      document.head.appendChild(style)
    }
  }, [])

  useEffect(() => {
    if (!visible) {
      lastLocalPickRef.current = null
      markerRef.current = null
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
      return undefined
    }

    const host = mapRef.current
    if (!host || mapInstanceRef.current) return undefined

    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    })

    const openPin = pinRef.current

    const map = L.map(host, {
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
      minZoom: 2,
    }).setView([openPin.lat, openPin.lng], 15)

    if (mapboxToken) {
      L.tileLayer(
        `https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/512/{z}/{x}/{y}@2x?access_token=${encodeURIComponent(mapboxToken)}`,
        {
          tileSize: 512,
          zoomOffset: -1,
          maxZoom: 22,
          attribution:
            '© <a href="https://www.mapbox.com/about/maps/">Mapbox</a> © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        }
      ).addTo(map)
    } else {
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap',
      }).addTo(map)
    }

    const marker = L.marker([openPin.lat, openPin.lng], { draggable: true }).addTo(map)
    marker.on('dragend', () => {
      const p = marker.getLatLng()
      const pt = { lat: p.lat, lng: p.lng }
      lastLocalPickRef.current = pt
      onPickRef.current?.(pt)
    })

    map.on('click', (e) => {
      const { lat, lng } = e.latlng
      marker.setLatLng([lat, lng])
      const pt = { lat, lng }
      lastLocalPickRef.current = pt
      onPickRef.current?.(pt)
    })

    mapInstanceRef.current = map
    markerRef.current = marker

    return () => undefined
  }, [visible, mapboxToken])

  useEffect(() => {
    if (!visible || !mapInstanceRef.current || !markerRef.current) return

    const geoJustFinished = prevGeoBusyRef.current && !geoBusy
    prevGeoBusyRef.current = geoBusy

    const lp = lastLocalPickRef.current
    if (lp && sameLatLng(lp, pin)) {
      lastLocalPickRef.current = null
      return
    }

    markerRef.current.setLatLng([pin.lat, pin.lng])

    if (geoJustFinished) {
      mapInstanceRef.current.flyTo([pin.lat, pin.lng], 15, { duration: 0.55, easeLinearity: 0.25 })
    }
  }, [visible, pin.lat, pin.lng, geoBusy])

  if (!visible) return null

  const coordFmt = `${pin.lat.toFixed(6)}, ${pin.lng.toFixed(6)}`

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.card}>
          <Text style={styles.title}>Pick location on map</Text>
          <Text style={styles.sub}>
            Use your location, click the map, or drag the red pin to adjust exactly where you are.
            {!mapboxToken ? ' Add a Mapbox token in env for Mapbox tiles.' : ''}
          </Text>

          <View style={styles.mapBox}>
            <div ref={mapRef} style={styles.mapHost} />
          </View>

          <Text style={styles.coords}>Selected: {coordFmt}</Text>
          <Button title={geoBusy ? 'Locating...' : 'Use my location'} variant="outline" onPress={onUseMyLocation} />
          <View style={{ height: 8 }} />
          <Button title="Use this location" onPress={onUseLocation} />
          <View style={{ height: 8 }} />
          <Button title="Cancel" variant="outline" onPress={onClose} />
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
  },
  title: { fontSize: 18, fontWeight: '700', color: colors.slate900 },
  sub: { marginTop: 4, marginBottom: 10, fontSize: 13, color: colors.slate500, lineHeight: 18 },
  mapBox: {
    height: 250,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.slate200,
    overflow: 'hidden',
  },
  mapHost: { width: '100%', height: '100%' },
  coords: { marginTop: 8, marginBottom: 10, fontSize: 12, color: colors.slate600 },
})
