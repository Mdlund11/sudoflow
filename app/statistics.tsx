import { RADIUS, SHADOWS, SPACING } from '@/constants/theme';
import { useStats } from '@/context/StatsContext';
import { useThemeColor } from '@/hooks/use-theme-color';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

export default function StatisticsScreen() {
    const { stats, resetStats } = useStats();

    const backgroundColor = useThemeColor({}, 'background');
    const surfaceColor = useThemeColor({}, 'surface');
    const textColor = useThemeColor({}, 'text');
    const textSecondaryColor = useThemeColor({}, 'textSecondary');
    const primaryColor = useThemeColor({}, 'primary');
    const borderColor = useThemeColor({}, 'border');
    const errorColor = useThemeColor({}, 'error');


    const difficultyStats = [
        { label: 'Easy', count: stats.completedGames.Easy, color: '#10B981' },
        { label: 'Medium', count: stats.completedGames.Medium, color: '#F59E0B' },
        { label: 'Hard', count: stats.completedGames.Hard, color: '#EF4444' },
        { label: 'Expert', count: stats.completedGames.Expert, color: '#7C3AED' },
    ];

    return (
        <View style={[styles.container, { backgroundColor }]}>
            <StatusBar style="auto" />
            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.streakSection}>
                    <View style={[styles.streakCard, { backgroundColor: surfaceColor }]}>
                        <MaterialCommunityIcons name="fire" size={48} color="#FF9800" />
                        <Text style={[styles.streakValue, { color: textColor }]}>{stats.currentStreak}</Text>
                        <Text style={[styles.streakLabel, { color: textSecondaryColor }]} numberOfLines={1} adjustsFontSizeToFit>Win Streak</Text>
                    </View>
                    <View style={[styles.streakCard, { backgroundColor: surfaceColor }]}>
                        <MaterialCommunityIcons name="trophy" size={48} color="#FFD700" />
                        <Text style={[styles.streakValue, { color: textColor }]}>{stats.longestStreak}</Text>
                        <Text style={[styles.streakLabel, { color: textSecondaryColor }]} numberOfLines={1} adjustsFontSizeToFit>Longest Streak</Text>
                    </View>
                </View>

                <View style={[styles.section, { backgroundColor: surfaceColor }]}>
                    <Text style={[styles.sectionTitle, { color: primaryColor }]}>Games Completed</Text>
                    {difficultyStats.map((item) => (
                        <View key={item.label} style={[styles.statRow, { borderBottomColor: borderColor }]}>
                            <View style={styles.statLabelContainer}>
                                <View style={[styles.dot, { backgroundColor: item.color }]} />
                                <Text style={[styles.statLabel, { color: textColor }]}>{item.label}</Text>
                            </View>
                            <Text style={[styles.statValue, { color: textColor }]}>{item.count}</Text>
                        </View>
                    ))}
                    <View style={[styles.totalRow, { borderTopColor: borderColor }]}>
                        <Text style={[styles.totalLabel, { color: textColor }]}>Total</Text>
                        <Text style={[styles.totalValue, { color: primaryColor }]}>
                            {Object.values(stats.completedGames).reduce((a, b) => a + b, 0)}
                        </Text>
                    </View>
                </View>

            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        padding: SPACING.m,
    },
    streakSection: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: SPACING.l,
    },
    streakCard: {
        flex: 0.48,
        borderRadius: RADIUS.m,
        padding: SPACING.m,
        alignItems: 'center',
        ...SHADOWS.small,
    },
    streakValue: {
        fontSize: 32,
        fontWeight: '700',
        marginVertical: SPACING.xs,
    },
    streakLabel: {
        fontSize: 10,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    section: {
        borderRadius: RADIUS.m,
        padding: SPACING.m,
        ...SHADOWS.small,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: SPACING.m,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    statRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: SPACING.s,
        borderBottomWidth: 1,
    },
    statLabelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    dot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginRight: SPACING.s,
    },
    statLabel: {
        fontSize: 16,
    },
    statValue: {
        fontSize: 18,
        fontWeight: '600',
    },
    totalRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: SPACING.m,
        paddingTop: SPACING.m,
        borderTopWidth: 2,
    },
    totalLabel: {
        fontSize: 18,
        fontWeight: '700',
    },
    totalValue: {
        fontSize: 24,
        fontWeight: '700',
    },
});
