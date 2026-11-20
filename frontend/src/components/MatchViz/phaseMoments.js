const toSeconds = (minute, second) => minute * 60 + second;

/**
 * Key moments that fall inside one game phase: same period, and strictly after the
 * phase start (a moment AT the start ended the previous phase) up to the phase end.
 */
export function momentsInPhase(importantMoments, phase) {
  const startTime = toSeconds(phase.start_minute, phase.start_second);
  const endTime = phase.end_minute !== null ? toSeconds(phase.end_minute, phase.end_second) : toSeconds(999, 999);

  return importantMoments.filter(moment => {
    if (!moment.when) return false;

    // If both sides have a period, they must match
    const hasPeriods =
      moment.period !== null && moment.period !== undefined &&
      phase.start_period !== null && phase.start_period !== undefined;
    if (hasPeriods && moment.period !== phase.start_period) return false;

    const [min, sec] = moment.when.split(":").map(Number);
    const momentTime = toSeconds(min, sec);
    return momentTime > startTime && momentTime <= endTime;
  });
}

export const formatClock = (minute, second) => `${minute}:${String(second).padStart(2, "0")}`;
