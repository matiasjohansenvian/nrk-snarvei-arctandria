/**
 * Formats a given date value into a Norwegian date and time string.
 * Returns null if the value is invalid.
 */
export function formatNorwegianDateTime(value) {
  if (!value) return null;

  const date = new Date(value);
  if (isNaN(date)) return null;

  const now = new Date();
  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);

  const isSameDay = (d1, d2) =>
    d1.getDate() === d2.getDate() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getFullYear() === d2.getFullYear();

  let dateStr;
  if (isSameDay(date, now)) {
    dateStr = 'i dag';
  } else if (isSameDay(date, yesterday)) {
    dateStr = 'i går';
  } else {
    dateStr = date.toLocaleDateString('nb-NO', { dateStyle: 'long' });
  }

  const timeStr = date.toLocaleTimeString('nb-NO', { timeStyle: 'short' });

  return `${dateStr} kl. ${timeStr}`;
}
