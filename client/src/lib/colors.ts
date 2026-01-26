export const pastelColors = [
  "#E8F4F8",
  "#FDF6E3",
  "#F0F4E8",
  "#F8E8F4",
  "#E8E8F8",
  "#F4F0E8",
  "#E8F8F0",
  "#F8F0E8",
  "#F0E8F8",
  "#E8F0F4",
  "#FEF3E2",
  "#E2F0FE",
  "#F3FEE2",
  "#FEE2F3",
  "#E2FEF3",
  "#F3E2FE",
];

export const defaultHeaderColor = "#f1f5f9";

export function getRandomPastelColor(index?: number): string {
  if (index !== undefined) {
    return pastelColors[index % pastelColors.length];
  }
  return pastelColors[Math.floor(Math.random() * pastelColors.length)];
}
