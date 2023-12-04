import {map} from "./options.js";

// TODO Use Float64Array for scales with numeric ranges, e.g. position?
export function valueObject(channels, scales) {
  const values = Object.fromEntries(
    Object.entries(channels).map(([name, {scale: scaleName, value}]) => {
      const scale = scaleName == null ? null : scales[scaleName];
      return [name, scale == null ? value : map(value, scale)];
    })
  );
  values.channels = channels; // expose channel state for advanced usage
  return values;
}
