import { StyleProp, ViewStyle } from "react-native";
import { Coords } from "../../utils/location";

export type MapPin = Coords & { id: string; label: string };

export type AppMapProps = {
  center: Coords;
  zoom?: number;
  recenterKey?: number;
  pins?: MapPin[];
  selectedId?: string | null;
  onSelectPin?: (id: string) => void;
  picked?: Coords | null;
  pickedPaint?: string;
  onPick?: (coords: Coords) => void;
  fitToPins?: boolean;
  interactive?: boolean;
  style?: StyleProp<ViewStyle>;
};

export const DEFAULT_ZOOM = 14;
