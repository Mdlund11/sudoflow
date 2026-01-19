import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View, ViewProps } from 'react-native';
import { RADIUS, SPACING } from '../constants/theme';
import { useThemeColor } from '../hooks/use-theme-color';

interface ShareCardProps extends ViewProps {
    board: number[][];
    difficulty: string;
    time: string;
    mistakes: number;
    seRating?: number;
    hodokuScore?: number;
}

const ShareCard: React.FC<ShareCardProps> = ({ board, difficulty, time, mistakes, seRating, hodokuScore, style, ...props }) => {
    const primaryColor = useThemeColor({}, 'primary');
    const surfaceColor = useThemeColor({}, 'surface');
    const textColor = useThemeColor({}, 'text');
    const textSecondaryColor = useThemeColor({}, 'textSecondary');
    const borderColor = useThemeColor({}, 'border');

    return (
        <View style={[styles.card, { backgroundColor: surfaceColor, borderColor }, style]} {...props}>
            <View style={styles.header}>
                <View style={styles.brandContainer}>
                    <View style={[styles.logo, { backgroundColor: primaryColor }]}>
                        <MaterialCommunityIcons name="grid" size={20} color="#FFF" />
                    </View>
                    <Text style={[styles.brandName, { color: textColor }]}>SudoFlow</Text>
                </View>
                <Text style={[styles.difficulty, { color: primaryColor }]}>{difficulty.toUpperCase()}</Text>
            </View>

            <View style={styles.statsRow}>
                <View style={styles.stat}>
                    <Text style={[styles.statLabel, { color: textSecondaryColor }]}>Time</Text>
                    <Text style={[styles.statValue, { color: textColor }]}>{time}</Text>
                </View>
                <View style={styles.stat}>
                    <Text style={[styles.statLabel, { color: textSecondaryColor }]}>Mistakes</Text>
                    <Text style={[styles.statValue, { color: textColor }]}>{mistakes}</Text>
                </View>
                {seRating !== undefined && (
                    <View style={styles.stat}>
                        <Text style={[styles.statLabel, { color: textSecondaryColor }]}>SE Rating</Text>
                        <Text style={[styles.statValue, { color: textColor }]}>{seRating.toFixed(1)}</Text>
                    </View>
                )}
            </View>

            <View style={styles.heatmapContainer}>
                {board.map((row, r) => (
                    <View key={r} style={styles.heatmapRow}>
                        {row.map((cell, c) => {
                            // Artistic representation: color based on value parity/range
                            const opacity = cell === 0 ? 0.05 : 0.1 + (cell / 10);
                            return (
                                <View
                                    key={c}
                                    style={[
                                        styles.heatmapCell,
                                        { backgroundColor: primaryColor, opacity }
                                    ]}
                                />
                            );
                        })}
                    </View>
                ))}
            </View>

            <View style={styles.footer}>
                <Text style={[styles.footerText, { color: textSecondaryColor }]}>
                    Played on SudoFlow - Find your flow.
                </Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        width: 300,
        padding: SPACING.l,
        borderRadius: RADIUS.l,
        borderWidth: 1,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.l,
    },
    brandContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.s,
    },
    logo: {
        width: 32,
        height: 32,
        borderRadius: RADIUS.s,
        justifyContent: 'center',
        alignItems: 'center',
    },
    brandName: {
        fontSize: 18,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    difficulty: {
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 1,
    },
    statsRow: {
        flexDirection: 'row',
        gap: SPACING.xl,
        marginBottom: SPACING.l,
    },
    stat: {
        gap: 2,
    },
    statLabel: {
        fontSize: 12,
        fontWeight: '600',
    },
    statValue: {
        fontSize: 24,
        fontWeight: '800',
    },
    heatmapContainer: {
        width: '100%',
        aspectRatio: 1,
        backgroundColor: 'rgba(0,0,0,0.02)',
        padding: 4,
        borderRadius: RADIUS.m,
        marginBottom: SPACING.m,
    },
    heatmapRow: {
        flex: 1,
        flexDirection: 'row',
    },
    heatmapCell: {
        flex: 1,
        margin: 1,
        borderRadius: 2,
    },
    footer: {
        alignItems: 'center',
    },
    footerText: {
        fontSize: 11,
        fontWeight: '500',
    },
});

export default ShareCard;
