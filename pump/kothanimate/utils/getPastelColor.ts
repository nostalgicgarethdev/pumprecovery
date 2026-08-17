export const getPastelColor = (str: string) => {
  // Simple hash function to convert input string to a number
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash; // Convert to 32bit integer
  }
  hash = Math.abs(hash);

  // Generate pastel color
  const pastelRed = (hash % 128) + 127; // 127-255
  const pastelGreen = ((hash >> 8) % 128) + 127; // 127-255
  const pastelBlue = ((hash >> 16) % 128) + 127; // 127-255

  // Convert RGB values to a hexadecimal color string
  const color = `#${pastelRed
    .toString(16)
    .padStart(2, "0")}${pastelGreen
    .toString(16)
    .padStart(2, "0")}${pastelBlue.toString(16).padStart(2, "0")}`;

  return color;
};
