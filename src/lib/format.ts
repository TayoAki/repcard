import { format } from "date-fns";

export const formatDuration = (seconds: number) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes} min`;
};

/** "Thu, Aug 6 · 8:45 AM" */
export const formatSessionDate = (iso: string) => format(new Date(iso), "EEE, MMM d · h:mm a");

const KG_PER_LB = 0.45359237;

/** Weights are stored in kg; render in the athlete's unit. */
export const displayWeight = (kg: number, unit: "kg" | "lb") =>
  unit === "kg" ? `${Math.round(kg * 10) / 10} kg` : `${Math.round((kg / KG_PER_LB) * 10) / 10} lb`;

export const displayVolume = (kg: number, unit: "kg" | "lb") =>
  unit === "kg"
    ? `${Math.round(kg).toLocaleString()} kg`
    : `${Math.round(kg / KG_PER_LB).toLocaleString()} lb`;
