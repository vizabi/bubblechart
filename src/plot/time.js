

function parseInterval(input, intervals, type) {
  let name = `${input}`.toLowerCase();
  if (name.endsWith("s")) name = name.slice(0, -1); // drop plural
  let period = 1;
  const match = /^(?:(\d+)\s+)/.exec(name);
  if (match) {
    name = name.slice(match[0].length);
    period = +match[1];
  }
  switch (name) {
    case "quarter":
      name = "month";
      period *= 3;
      break;
    case "half":
      name = "month";
      period *= 6;
      break;
  }
  let interval = intervals.get(name);
  if (!interval) throw new Error(`unknown interval: ${input}`);
  if (period > 1) {
    if (!interval.every) throw new Error(`non-periodic interval: ${name}`);
    interval = interval.every(period);
    interval[intervalDuration] = durations.get(name) * period;
    interval[intervalType] = type;
  }
  return interval;
}

export function maybeTimeInterval(interval) {
  return parseInterval(interval, timeIntervals, "time");
}

export function maybeUtcInterval(interval) {
  return parseInterval(interval, utcIntervals, "utc");
}
