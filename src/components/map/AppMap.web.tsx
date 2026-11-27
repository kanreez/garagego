import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useMemo } from "react";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { StyleSheet, View } from "react-native";
import { colors, doorPaint, fonts, radius } from "../../constants/theme";
import { Coords } from "../../utils/location";
import { AppMapProps, DEFAULT_ZOOM, MapPin } from "./types";

const TILES = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

const PIN_FONT = fonts.semibold.replace(/"/g, "'");

const pillIcon = (id: string, label: string, selected: boolean) => {
  const paint = doorPaint(id);
  return L.divIcon({
    className: "",
    iconSize: [0, 0],
    iconAnchor: [0, 0],
    html: `<div style="transform:translate(-50%,-115%)${selected ? " scale(1.12)" : ""};display:flex;align-items:center;gap:6px;width:max-content;white-space:nowrap;padding:4px 10px 4px 5px;border-radius:6px;border:2px solid ${selected ? paint : colors.white};box-shadow:0 3px 10px rgba(35,39,43,.3);cursor:pointer;font:600 13px/16px ${PIN_FONT};background:${colors.ink};color:${colors.onInk}"><span style="width:12px;height:14px;border-radius:2px;background:${paint}"></span>${escapeHtml(label)}</div>`,
  });
};

const pickedIcon = (paint: string) =>
  L.divIcon({
    className: "",
    iconSize: [0, 0],
    iconAnchor: [0, 0],
    html: `<div style="transform:translate(-50%,-100%);width:30px;height:30px;border-radius:50% 50% 50% 0;rotate:-45deg;translate:0 -4px;background:${paint};border:3px solid ${colors.white};box-shadow:0 3px 10px rgba(35,39,43,.3);display:flex;align-items:center;justify-content:center"><div style="width:8px;height:8px;border-radius:50%;background:${colors.white}"></div></div>`,
  });

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

export function AppMap({ center, zoom = DEFAULT_ZOOM, recenterKey, pins = [], selectedId, onSelectPin, picked, pickedPaint, onPick, fitToPins, interactive = true, style }: AppMapProps) {
  return (
    <View style={[styles.wrap, style]}>
      <MapContainer
        center={[center.latitude, center.longitude]}
        zoom={zoom}
        zoomSnap={0.5}
        style={{ width: "100%", height: "100%" }}
        scrollWheelZoom={false}
        dragging={interactive}
        doubleClickZoom={interactive}
        touchZoom={interactive}
        keyboard={interactive}
        zoomControl={interactive}
        attributionControl
      >
        <TileLayer url={TILES} attribution={ATTRIBUTION} maxZoom={19} />
        <Recenter center={center} zoom={zoom} recenterKey={recenterKey} fitTo={fitToPins && pins.length > 1 ? pins : null} />
        {onPick ? <PickOnClick onPick={onPick} /> : null}
        {pins.map((p) => (
          <PricePin key={p.id} pin={p} selected={p.id === selectedId} onSelect={onSelectPin} />
        ))}
        {picked ? <PickedPin coords={picked} paint={pickedPaint ?? colors.ink} onPick={onPick} /> : null}
      </MapContainer>
    </View>
  );
}

function Recenter({ center, zoom, recenterKey, fitTo }: { center: Coords; zoom: number; recenterKey?: number; fitTo: MapPin[] | null }) {
  const map = useMap();
  const fitKey = fitTo?.map((p) => `${p.latitude},${p.longitude}`).join("|") ?? "";
  useEffect(() => {
    const frame = () => {
      map.invalidateSize();
      if (fitTo) map.fitBounds(L.latLngBounds(fitTo.map((p) => [p.latitude, p.longitude])), { padding: [36, 36], maxZoom: 16 });
      else map.setView([center.latitude, center.longitude], zoom);
    };
    frame();
    const observer = new ResizeObserver(frame);
    observer.observe(map.getContainer());
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, center.latitude, center.longitude, zoom, fitKey, recenterKey]);
  return null;
}

function PickOnClick({ onPick }: { onPick: (c: Coords) => void }) {
  useMapEvents({ click: (e) => onPick({ latitude: e.latlng.lat, longitude: e.latlng.lng }) });
  return null;
}

function PricePin({ pin, selected, onSelect }: { pin: MapPin; selected: boolean; onSelect?: (id: string) => void }) {
  const icon = useMemo(() => pillIcon(pin.id, pin.label, selected), [pin.id, pin.label, selected]);
  return (
    <Marker
      position={[pin.latitude, pin.longitude]}
      icon={icon}
      zIndexOffset={selected ? 1000 : 0}
      keyboard
      title={pin.label}
      eventHandlers={{ click: () => onSelect?.(pin.id) }}
    />
  );
}

function PickedPin({ coords, paint, onPick }: { coords: Coords; paint: string; onPick?: (c: Coords) => void }) {
  const icon = useMemo(() => pickedIcon(paint), [paint]);
  return (
    <Marker
      position={[coords.latitude, coords.longitude]}
      icon={icon}
      draggable={!!onPick}
      zIndexOffset={2000}
      eventHandlers={{
        dragend: (e) => {
          const { lat, lng } = (e.target as L.Marker).getLatLng();
          onPick?.({ latitude: lat, longitude: lng });
        },
      }}
    />
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: "hidden", borderRadius: radius.lg, backgroundColor: colors.sand, zIndex: 0 },
});
