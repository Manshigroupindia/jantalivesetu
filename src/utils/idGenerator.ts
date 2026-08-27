/**
 * Collision-safe Staff ID Generator
 * Example output: JL-STAFF-2026-0001
 */
export function generateStaffIdNumber(existingCount: number = 0): string {
  const currentYear = new Date().getFullYear();
  const nextSeq = String(existingCount + 1).padStart(4, '0');
  return `JL-STAFF-${currentYear}-${nextSeq}`;
}
