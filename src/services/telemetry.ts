export type TelemetryEvent = {
  name: string;
  properties?: Record<string, unknown>;
};

export function logEvent(event: TelemetryEvent): void {
  const payload = {
    source: "cogniz-vs",
    timestamp: new Date().toISOString(),
    ...event,
  };
  // eslint-disable-next-line no-console
  console.debug("[Cogniz]", payload);
}
