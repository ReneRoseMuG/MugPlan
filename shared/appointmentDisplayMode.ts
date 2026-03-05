export const appointmentDisplayModes = ["standard", "compact", "detail"] as const;

export type AppointmentDisplayMode = (typeof appointmentDisplayModes)[number];

export const defaultAppointmentDisplayMode: AppointmentDisplayMode = "standard";
