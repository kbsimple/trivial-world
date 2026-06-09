import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from 'tamagui';

interface DownloadProgressProps {
  packName: string;
  progress: number; // 0-100
  bytesWritten: number;
  bytesTotal: number;
}

/**
 * Download progress component
 * Per D-10: Progress bar during pack download
 * Per UI-SPEC: Show percentage and bytes transferred
 */
export function DownloadProgress({
  packName,
  progress,
  bytesWritten,
  bytesTotal,
}: DownloadProgressProps) {
  const theme = useTheme();

  const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: theme.color?.val as string }]}>
        Downloading {packName}...
      </Text>

      {/* Progress bar (D-10) */}
      <View style={styles.progressBarContainer}>
        <View
          style={[
            styles.progressBar,
            {
              width: `${progress}%`,
              backgroundColor: '#228b22',
            },
          ]}
        />
      </View>

      {/* Percentage and bytes */}
      <Text style={[styles.progressText, { color: theme.color?.val as string }]}>
        {progress}% - {formatBytes(bytesWritten)} / {formatBytes(bytesTotal)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  progressBarContainer: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    opacity: 0.7,
  },
});