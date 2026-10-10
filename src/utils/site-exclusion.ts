/**
 * Site exclusion helper: checks if current site is paused or blacklisted.
 */

export function isHostExcluded(hostname: string, excludedList: string[]): boolean {
  if (!hostname || !excludedList || excludedList.length === 0) return false;
  const cleanHost = hostname.toLowerCase().trim();

  return excludedList.some((excluded) => {
    const cleanExcluded = excluded.toLowerCase().trim();
    return cleanHost === cleanExcluded || cleanHost.endsWith('.' + cleanExcluded);
  });
}
