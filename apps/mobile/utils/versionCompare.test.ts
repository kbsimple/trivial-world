/**
 * Tests for version comparison utility
 * Per D-14: Uses semver for version comparison
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  compareVersions,
  hasUpdateAvailable,
  isMajorVersionChange,
  getVersionDifference,
} from './versionCompare';

describe('compareVersions', () => {
  it('returns -1 when first version is less than second', () => {
    expect(compareVersions('1.0.0', '2.0.0')).toBe(-1);
    expect(compareVersions('1.0.0', '1.1.0')).toBe(-1);
    expect(compareVersions('1.0.0', '1.0.1')).toBe(-1);
    expect(compareVersions('1.2.3', '1.2.4')).toBe(-1);
  });

  it('returns 1 when first version is greater than second', () => {
    expect(compareVersions('2.0.0', '1.0.0')).toBe(1);
    expect(compareVersions('1.1.0', '1.0.0')).toBe(1);
    expect(compareVersions('1.0.1', '1.0.0')).toBe(1);
    expect(compareVersions('1.2.4', '1.2.3')).toBe(1);
  });

  it('returns 0 when versions are equal', () => {
    expect(compareVersions('1.0.0', '1.0.0')).toBe(0);
    expect(compareVersions('2.3.4', '2.3.4')).toBe(0);
    expect(compareVersions('0.0.1', '0.0.1')).toBe(0);
  });

  it('handles prerelease versions correctly', () => {
    // Prerelease versions are less than their release counterparts
    expect(compareVersions('1.0.0-alpha', '1.0.0')).toBe(-1);
    expect(compareVersions('1.0.0-beta.1', '1.0.0')).toBe(-1);
    expect(compareVersions('1.0.0-rc.1', '1.0.0')).toBe(-1);

    // Comparing prerelease versions
    expect(compareVersions('1.0.0-alpha', '1.0.0-beta')).toBe(-1);
    expect(compareVersions('1.0.0-beta.1', '1.0.0-beta.2')).toBe(-1);
  });

  it('handles build metadata correctly', () => {
    // Build metadata does not affect version precedence
    expect(compareVersions('1.0.0+build.1', '1.0.0+build.2')).toBe(0);
    expect(compareVersions('1.0.0', '1.0.0+build.1')).toBe(0);
  });

  it('returns 0 for invalid versions and logs warning', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(compareVersions('invalid', '1.0.0')).toBe(0);
    expect(compareVersions('1.0.0', 'invalid')).toBe(0);
    expect(compareVersions('not-a-version', 'also-not-version')).toBe(0);

    expect(warnSpy).toHaveBeenCalledTimes(3);
    warnSpy.mockRestore();
  });

  it('handles versions with leading zeros', () => {
    // semver treats 01.0.0 as invalid (leading zeros not allowed)
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(compareVersions('01.0.0', '1.0.0')).toBe(0);
    expect(warnSpy).toHaveBeenCalled();

    warnSpy.mockRestore();
  });
});

describe('hasUpdateAvailable', () => {
  it('returns true when index version is greater than downloaded', () => {
    expect(hasUpdateAvailable('2.0.0', '1.0.0')).toBe(true);
    expect(hasUpdateAvailable('1.1.0', '1.0.0')).toBe(true);
    expect(hasUpdateAvailable('1.0.1', '1.0.0')).toBe(true);
    expect(hasUpdateAvailable('1.2.3', '1.2.2')).toBe(true);
  });

  it('returns false when index version is less than or equal to downloaded', () => {
    expect(hasUpdateAvailable('1.0.0', '2.0.0')).toBe(false);
    expect(hasUpdateAvailable('1.0.0', '1.0.0')).toBe(false);
    expect(hasUpdateAvailable('1.0.0', '1.1.0')).toBe(false);
    expect(hasUpdateAvailable('1.2.3', '1.2.4')).toBe(false);
  });

  it('returns false when versions are equal', () => {
    expect(hasUpdateAvailable('1.0.0', '1.0.0')).toBe(false);
    expect(hasUpdateAvailable('2.3.4', '2.3.4')).toBe(false);
  });

  it('handles prerelease versions correctly', () => {
    // Release version is greater than prerelease
    expect(hasUpdateAvailable('1.0.0', '1.0.0-beta')).toBe(true);
    expect(hasUpdateAvailable('1.0.0-beta', '1.0.0')).toBe(false);

    // Newer prerelease
    expect(hasUpdateAvailable('1.0.0-beta.2', '1.0.0-beta.1')).toBe(true);
    expect(hasUpdateAvailable('1.0.0-rc.1', '1.0.0-beta.5')).toBe(true);
  });

  it('returns false and logs warning for invalid versions', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(hasUpdateAvailable('invalid', '1.0.0')).toBe(false);
    expect(hasUpdateAvailable('1.0.0', 'invalid')).toBe(false);
    expect(hasUpdateAvailable('not-a-version', 'also-not-version')).toBe(false);

    expect(warnSpy).toHaveBeenCalledTimes(3);
    warnSpy.mockRestore();
  });

  it('handles typical update scenarios', () => {
    // Major update available
    expect(hasUpdateAvailable('2.0.0', '1.5.3')).toBe(true);

    // Minor update available
    expect(hasUpdateAvailable('1.6.0', '1.5.3')).toBe(true);

    // Patch update available
    expect(hasUpdateAvailable('1.5.4', '1.5.3')).toBe(true);

    // Already up to date
    expect(hasUpdateAvailable('1.5.3', '1.5.3')).toBe(false);

    // Downloaded is newer (downgrade scenario)
    expect(hasUpdateAvailable('1.5.2', '1.5.3')).toBe(false);
  });
});

describe('isMajorVersionChange', () => {
  it('returns true when major versions differ', () => {
    expect(isMajorVersionChange('2.0.0', '1.0.0')).toBe(true);
    expect(isMajorVersionChange('3.5.2', '1.0.0')).toBe(true);
    expect(isMajorVersionChange('1.0.0', '2.0.0')).toBe(true);
    expect(isMajorVersionChange('0.1.0', '1.0.0')).toBe(true);
  });

  it('returns false when major versions are same', () => {
    expect(isMajorVersionChange('1.0.0', '1.0.0')).toBe(false);
    expect(isMajorVersionChange('1.5.0', '1.0.0')).toBe(false);
    expect(isMajorVersionChange('1.0.1', '1.0.0')).toBe(false);
    expect(isMajorVersionChange('2.3.4', '2.0.0')).toBe(false);
  });

  it('handles minor and patch changes as non-major', () => {
    expect(isMajorVersionChange('1.1.0', '1.0.0')).toBe(false);
    expect(isMajorVersionChange('1.0.1', '1.0.0')).toBe(false);
    expect(isMajorVersionChange('1.99.99', '1.0.0')).toBe(false);
  });

  it('handles version 0.x changes correctly', () => {
    // 0.x to 0.y is a major change in semver terms (different major version)
    expect(isMajorVersionChange('0.2.0', '0.1.0')).toBe(false); // major is still 0
    expect(isMajorVersionChange('1.0.0', '0.1.0')).toBe(true); // 0 -> 1 is major change
    expect(isMajorVersionChange('0.1.0', '1.0.0')).toBe(true); // 1 -> 0 is major change
  });

  it('returns false and logs warning for invalid versions', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(isMajorVersionChange('invalid', '1.0.0')).toBe(false);
    expect(isMajorVersionChange('1.0.0', 'invalid')).toBe(false);
    expect(isMajorVersionChange('not-a-version', 'also-not-version')).toBe(false);

    expect(warnSpy).toHaveBeenCalledTimes(3);
    warnSpy.mockRestore();
  });

  it('ignores prerelease identifiers when checking major version', () => {
    expect(isMajorVersionChange('2.0.0-beta', '1.0.0')).toBe(true);
    expect(isMajorVersionChange('1.0.0-rc.1', '1.0.0')).toBe(false);
    expect(isMajorVersionChange('1.0.0-alpha', '0.9.0')).toBe(true);
  });
});

describe('getVersionDifference', () => {
  it('describes major updates correctly', () => {
    expect(getVersionDifference('2.0.0', '1.0.0')).toBe('Major update: 1.0.0 → 2.0.0');
    expect(getVersionDifference('3.0.0', '2.0.0')).toBe('Major update: 2.0.0 → 3.0.0');
  });

  it('describes minor updates correctly', () => {
    expect(getVersionDifference('1.1.0', '1.0.0')).toBe('Minor update: 1.0.0 → 1.1.0');
    expect(getVersionDifference('2.5.0', '2.4.0')).toBe('Minor update: 2.4.0 → 2.5.0');
  });

  it('describes patch updates correctly', () => {
    expect(getVersionDifference('1.0.1', '1.0.0')).toBe('Patch update: 1.0.0 → 1.0.1');
    expect(getVersionDifference('2.3.5', '2.3.4')).toBe('Patch update: 2.3.4 → 2.3.5');
  });

  it('returns "Up to date" for equal versions', () => {
    expect(getVersionDifference('1.0.0', '1.0.0')).toBe('Up to date');
    expect(getVersionDifference('2.3.4', '2.3.4')).toBe('Up to date');
  });

  it('prioritizes major over minor over patch differences', () => {
    // When major differs, show major update even if minor/patch also differ
    expect(getVersionDifference('2.1.1', '1.0.0')).toBe('Major update: 1.0.0 → 2.1.1');

    // When minor differs, show minor update even if patch also differs
    expect(getVersionDifference('1.2.3', '1.1.0')).toBe('Minor update: 1.1.0 → 1.2.3');
  });

  it('handles downgrades correctly (still shows the difference)', () => {
    // Note: The function describes the difference, not whether it's an "upgrade"
    expect(getVersionDifference('1.0.0', '2.0.0')).toBe('Major update: 2.0.0 → 1.0.0');
    expect(getVersionDifference('1.0.0', '1.1.0')).toBe('Minor update: 1.1.0 → 1.0.0');
    expect(getVersionDifference('1.0.0', '1.0.1')).toBe('Patch update: 1.0.1 → 1.0.0');
  });

  it('returns generic message for invalid versions', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(getVersionDifference('invalid', '1.0.0')).toBe('Update available: invalid');
    expect(getVersionDifference('1.0.0', 'invalid')).toBe('Update available: 1.0.0');

    expect(warnSpy).toHaveBeenCalledTimes(2);
    warnSpy.mockRestore();
  });

  it('handles versions with different lengths of components', () => {
    expect(getVersionDifference('10.20.30', '1.2.3')).toBe('Major update: 1.2.3 → 10.20.30');
    expect(getVersionDifference('1.20.3', '1.2.3')).toBe('Minor update: 1.2.3 → 1.20.3');
    expect(getVersionDifference('1.2.30', '1.2.3')).toBe('Patch update: 1.2.3 → 1.2.30');
  });
});

describe('edge cases and integration scenarios', () => {
  it('handles typical pack update flow', () => {
    const downloadedVersion = '1.2.3';
    const indexVersion = '1.2.4';

    // Check if update is available
    expect(hasUpdateAvailable(indexVersion, downloadedVersion)).toBe(true);

    // Check if it's a major change
    expect(isMajorVersionChange(indexVersion, downloadedVersion)).toBe(false);

    // Get human-readable difference
    expect(getVersionDifference(indexVersion, downloadedVersion)).toBe('Patch update: 1.2.3 → 1.2.4');
  });

  it('handles major version upgrade scenario', () => {
    const downloadedVersion = '1.5.3';
    const indexVersion = '2.0.0';

    expect(hasUpdateAvailable(indexVersion, downloadedVersion)).toBe(true);
    expect(isMajorVersionChange(indexVersion, downloadedVersion)).toBe(true);
    expect(getVersionDifference(indexVersion, downloadedVersion)).toBe('Major update: 1.5.3 → 2.0.0');
  });

  it('handles no update needed scenario', () => {
    const downloadedVersion = '1.5.3';
    const indexVersion = '1.5.3';

    expect(hasUpdateAvailable(indexVersion, downloadedVersion)).toBe(false);
    expect(isMajorVersionChange(indexVersion, downloadedVersion)).toBe(false);
    expect(getVersionDifference(indexVersion, downloadedVersion)).toBe('Up to date');
  });

  it('handles prerelease to release upgrade', () => {
    const downloadedVersion = '1.0.0-beta.2';
    const indexVersion = '1.0.0';

    expect(hasUpdateAvailable(indexVersion, downloadedVersion)).toBe(true);
    expect(isMajorVersionChange(indexVersion, downloadedVersion)).toBe(false);
  });

  it('handles 0.x initial version scenario', () => {
    const downloadedVersion = '0.1.0';
    const indexVersion = '1.0.0';

    expect(hasUpdateAvailable(indexVersion, downloadedVersion)).toBe(true);
    expect(isMajorVersionChange(indexVersion, downloadedVersion)).toBe(true);
    expect(getVersionDifference(indexVersion, downloadedVersion)).toBe('Major update: 0.1.0 → 1.0.0');
  });
});