export const DamageSeverity = {
  Low: 'LOW',
  Mid: 'MID',
  High: 'HIGH',
} as const;

export type DamageSeverity = (typeof DamageSeverity)[keyof typeof DamageSeverity];
