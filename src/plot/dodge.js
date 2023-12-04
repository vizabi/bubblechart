import IntervalTree from "interval-tree-1d";
import {finite, positive, ascendingDefined, descendingDefined} from "./defined.js";
import {identity, maybeNamed, maybeValue, number, valueof} from "./options.js";
import {applyPosition} from "./projection.js";

const anchorXLeft = ({marginLeft}) => [1, marginLeft];
const anchorXRight = ({width, marginRight}) => [-1, width - marginRight];
const anchorXMiddle = ({width, marginLeft, marginRight}) => [0, (marginLeft + width - marginRight) / 2];
const anchorYTop = ({marginTop}) => [1, marginTop];
const anchorYBottom = ({height, howManyFacets, facet}) => [-1, height/howManyFacets * facet];
const anchorYMiddle = ({height, marginTop, marginBottom}) => [0, (marginTop + height - marginBottom) / 2];

function maybeAnchor(anchor) {
  return typeof anchor === "string" ? {anchor} : anchor;
}


export function dodgeY(dodgeOptions = {}, options = {}) {
  if (arguments.length === 1) [dodgeOptions, options] = mergeOptions(dodgeOptions);
  let {anchor = "bottom", padding = 1, r = options.r} = maybeAnchor(dodgeOptions);
  switch (`${anchor}`.toLowerCase()) {
    case "top": anchor = anchorYTop; break;
    case "bottom": anchor = anchorYBottom; break;
    case "middle": anchor = anchorYMiddle; break;
    default: throw new Error(`unknown dodge anchor: ${anchor}`);
  }
  return dodge("y", "x", anchor, number(padding), r, options);
}

function mergeOptions(options) {
  const {anchor, padding, ...rest} = options;
  const {r} = rest; // don’t consume r; allow it to propagate
  return [{anchor, padding, r}, rest];
}

function sortValue(value) {
  let channel, order;
  ({channel, value, order} = {...maybeValue(value)});
  const negate = channel?.startsWith("-");
  if (negate) channel = channel.slice(1);
  if (order === undefined) order = negate ? descendingDefined : ascendingDefined;
  if (typeof order !== "function") {
    switch (`${order}`.toLowerCase()) {
      case "ascending": order = ascendingDefined; break;
      case "descending": order = descendingDefined; break;
      default: throw new Error(`invalid order: ${order}`);
    }
  }
  return (data, facets, channels) => {
    let V;
    if (channel === undefined) {
      V = valueof(data, value);
    } else {
      if (channels === undefined) throw new Error("channel sort requires an initializer");
      V = channels[channel];
      if (!V) return {}; // ignore missing channel
      V = V.value;
    }
    const compareValue = (i, j) => order(V[i], V[j]);
    return {data, facets: facets.map((I) => I.slice().sort(compareValue))};
  };
}

function dodge(y, x, anchor, padding, r, options) {
  if (r != null && typeof r !== "number") {
    let {channels, sort, reverse} = options;
    channels = maybeNamed(channels);
    if (channels?.r === undefined) options = {...options, channels: {...channels, r: {value: r, scale: "r"}}};
    if (sort === undefined && reverse === undefined) options.sort = {channel: "-r"};
  }
  const sorter = sortValue(options.sort);

  return function ({data, facets, channels, scales, baseline, context} = {}) {
    const {data: sd, facets: sf} = sorter(data, facets, channels);
    data = sd; facets = sf;

    let {[x]: X, r: R} = channels;
    if (!channels[x]) throw new Error(`missing channel: ${x}`);
    ({[x]: X} = applyPosition(channels, scales, context));
    const cr = R ? undefined : r !== undefined ? number(r) : this.r !== undefined ? this.r : 3;
    if (R) R = valueof(R.value, scales[R.scale] || identity, Float64Array);
    const Y = new Float64Array(X.length);
    const radius = R ? (i) => R[i] : () => cr;

    //facet loop
    for (let i = 0; i < facets.length; i++) {

      let ky = -1
      let ty = baseline[i] || baseline || 0;
      const compare = ky ? compareAscending : compareSymmetric;
      const tree = IntervalTree();
      const I = facets[i].filter(R ? (i) => finite(X[i]) && positive(R[i]) : (i) => finite(X[i]));
      const intervals = new Float64Array(2 * I.length + 2);

      //datapoint loop
      for (const i of I) {
        const ri = radius(i);
        const y0 = ky ? ri + padding : 0; // offset baseline for varying radius
        const l = X[i] - ri;
        const h = X[i] + ri;

        // The first two positions are 0 to test placing the dot on the baseline.
        let k = 2;

        // For any previously placed circles that may overlap this circle, compute
        // the y-positions that place this circle tangent to these other circles.
        // https://observablehq.com/@mbostock/circle-offset-along-line
        tree.queryInterval(l - padding, h + padding, ([, , j]) => {
          const yj = Y[j] - y0;
          const dx = X[i] - X[j];
          const dr = padding + (R ? R[i] + R[j] : 2 * cr);
          const dy = Math.sqrt(dr * dr - dx * dx);
          intervals[k++] = yj - dy;
          intervals[k++] = yj + dy;
        });

        // Find the best y-value where this circle can fit.
        let candidates = intervals.slice(0, k);
        if (ky) candidates = candidates.filter((y) => y >= 0);
        out: for (const y of candidates.sort(compare)) {
          for (let j = 0; j < k; j += 2) {
            if (intervals[j] + 1e-6 < y && y < intervals[j + 1] - 1e-6) {
              continue out;
            }
          }
          Y[i] = y + y0;
          break;
        }

        // Insert the placed circle into the interval tree.
        tree.insert([l, h, i]);
      }
      if (!ky) ky = 1;
      for (const i of I) {
        Y[i] = Y[i] * ky + ty;
      }
    }
    

    return {
      data,
      facets,
      channels: {
        [y]: {value: Y, source: null}, // don’t show in tooltip
        [x]: {value: X, source: channels[x]},
        ...(R && {r: {value: R, source: channels.r}})
      }
    };
  };
}

function compareSymmetric(a, b) {
  return Math.abs(a) - Math.abs(b);
}

function compareAscending(a, b) {
  return a - b;
}
