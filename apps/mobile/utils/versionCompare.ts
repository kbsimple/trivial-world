import { compare, gt, major, minor, patch } from 'semver';

/**
 * Version comparison utility for pack updates
 * Per D-14: Uses semver for version comparison
 *
 * Note: `compare` is kept for potential future use cases where
 * full version comparison (-1, 0, 1) is needed instead of just gt.
 */

/**
 * Check if a newer version is available
 * @param indexVersion - Version from pack index (PackIndexEntry.version)
 * @param downloadedVersion - Version stored in database (QuestionPackModel.version)
 * @returns true if index version is greater than downloaded version
 */
export function hasUpdateAvailable(indexVersion: string, downloadedVersion: string): boolean {
  try {
    // Use semver.gt to check if index version is greater than downloaded
    return gt(indexVersion, downloadedVersion);
  } catch (error) {
    // If versions are invalid semver, log warning and return false
    console.warn(`Invalid semver comparison: ${indexVersion} vs ${downloadedVersion}`, error);
    return false;
  }
}

/**
 * Check if version bump is a major change (potentially breaking)
 * @param indexVersion - Version from pack index
 * @param downloadedVersion - Version stored in database
 * @returns true if major version differs
 */
export function isMajorVersionChange(indexVersion: string, downloadedVersion: string): boolean {
  try {
    return major(indexVersion) !== major(downloadedVersion);
  } catch (error) {
    console.warn(`Invalid semver for major comparison: ${indexVersion} vs ${downloadedVersion}`, error);
    return false;
  }
}

/**
 * Get version difference description
 * @param indexVersion - Version from pack index
 * @param downloadedVersion - Version stored in database
 * @returns Human-readable version difference
 */
export function getVersionDifference(indexVersion: string, downloadedVersion: string): string {
  try {
    const indexMajor = major(indexVersion);
    const indexMinor = minor(indexVersion);
    const indexPatch = patch(indexVersion);

    const downloadedMajor = major(downloadedVersion);
    const downloadedMinor = minor(downloadedVersion);
    const downloadedPatch = patch(downloadedVersion);

    if (indexMajor !== downloadedMajor) {
      return `Major update: ${downloadedVersion} → ${indexVersion}`;
    }
    if (indexMinor !== downloadedMinor) {
      return `Minor update: ${downloadedVersion} → ${indexVersion}`;
    }
    if (indexPatch !== downloadedPatch) {
      return `Patch update: ${downloadedVersion} → ${indexVersion}`;
    }

    return 'Up to date';
  } catch (error) {
    console.warn(`Invalid semver for difference: ${indexVersion} vs ${downloadedVersion}`, error);
    return `Update available: ${indexVersion}`;
  }
}

/**
 * Compare two versions
 * Note: This function is kept for potential future use cases where
 * full version ordering is needed. Currently not used in production code
 * but tested for completeness and available for pack management features.
 * @returns -1 if a < b, 0 if a == b, 1 if a > b
 */
export function compareVersions(a: string, b: string): -1 | 0 | 1 {
  try {
    return compare(a, b);
  } catch (error) {
    console.warn(`Invalid semver for comparison: ${a} vs ${b}`, error);
    return 0;
  }
}