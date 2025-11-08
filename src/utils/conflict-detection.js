/**
 * Checks if content contains git conflict markers.
 *
 * @param {string} content - Content to check
 * @return {boolean} True if content contains conflict markers
 */
export function hasConflictMarkers(content) {
  return content.includes('<<<<<<<') && content.includes('=======') && content.includes('>>>>>>>');
}
