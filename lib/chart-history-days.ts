/** Default trailing days for transactions credit-flow chart (deferred load). */
export const CHART_HISTORY_DAYS = 90;

/**
 * Trailing days loaded for dashboard HUD charts (activity, credit flow, message traffic).
 * Must cover the longest HUD period (`6m` = 183d, `1y` credit flow = 366d).
 */
export const DASHBOARD_HUD_HISTORY_DAYS = 366;
