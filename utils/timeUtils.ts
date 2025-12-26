/**
 * Formats seconds into a MM:SS string.
 * @param seconds Total number of seconds
 * @returns Formatted time string
 */
export const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
};
