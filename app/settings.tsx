import { RADIUS, SHADOWS, SPACING } from '@/constants/theme';
import { useSettings } from '@/context/SettingsContext';
import { useThemeColor } from '@/hooks/use-theme-color';
import { StatusBar } from 'expo-status-bar';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

export default function SettingsScreen() {
    const {
        highlightEnabled,
        toggleHighlight,
        autoRemoveNotes,
        toggleAutoRemoveNotes,
        hideSolvedNumbers,
        toggleHideSolvedNumbers,
        completionAnimationsEnabled,
        toggleCompletionAnimations,
        streakTrackingEnabled,
        toggleStreakTracking
    } = useSettings();

    const backgroundColor = useThemeColor({}, 'background');
    const surfaceColor = useThemeColor({}, 'surface');
    const textColor = useThemeColor({}, 'text');
    const textSecondaryColor = useThemeColor({}, 'textSecondary');
    const primaryColor = useThemeColor({}, 'primary');

    return (
        <View style={[styles.container, { backgroundColor }]}>
            <StatusBar style="auto" />
            <ScrollView contentContainerStyle={styles.content}>
                <View style={[styles.section, { backgroundColor: surfaceColor }]}>
                    <Text style={[styles.sectionTitle, { color: primaryColor }]}>Gameplay</Text>
                    <View style={styles.row}>
                        <View style={styles.rowTextContainer}>
                            <Text style={[styles.rowTitle, { color: textColor }]}>Highlight Areas</Text>
                            <Text style={[styles.rowSubtitle, { color: textSecondaryColor }]}>
                                Highlight row, column, and block for the selected cell
                            </Text>
                        </View>
                        <Switch
                            value={highlightEnabled}
                            onValueChange={toggleHighlight}
                            trackColor={{ false: textSecondaryColor, true: primaryColor }}
                            thumbColor={surfaceColor}
                            ios_backgroundColor={textSecondaryColor}
                            {...{ activeTrackColor: primaryColor, activeThumbColor: surfaceColor }} // Web specific props
                            style={{ accentColor: primaryColor } as any}
                        />
                    </View>
                    <View style={[styles.row, { marginTop: SPACING.m }]}>
                        <View style={styles.rowTextContainer}>
                            <Text style={[styles.rowTitle, { color: textColor }]}>Auto-Remove Notes</Text>
                            <Text style={[styles.rowSubtitle, { color: textSecondaryColor }]}>
                                Automatically remove notes when a number is placed
                            </Text>
                        </View>
                        <Switch
                            value={autoRemoveNotes}
                            onValueChange={toggleAutoRemoveNotes}
                            trackColor={{ false: textSecondaryColor, true: primaryColor }}
                            thumbColor={surfaceColor}
                            ios_backgroundColor={textSecondaryColor}
                            {...{ activeTrackColor: primaryColor, activeThumbColor: surfaceColor }} // Web specific props
                            style={{ accentColor: primaryColor } as any}
                        />
                    </View>
                    <View style={[styles.row, { marginTop: SPACING.m }]}>
                        <View style={styles.rowTextContainer}>
                            <Text style={[styles.rowTitle, { color: textColor }]}>Hide Solved Numbers</Text>
                            <Text style={[styles.rowSubtitle, { color: textSecondaryColor }]}>
                                Hide number buttons when all instances are placed
                            </Text>
                        </View>
                        <Switch
                            value={hideSolvedNumbers}
                            onValueChange={toggleHideSolvedNumbers}
                            trackColor={{ false: textSecondaryColor, true: primaryColor }}
                            thumbColor={surfaceColor}
                            ios_backgroundColor={textSecondaryColor}
                            {...{ activeTrackColor: primaryColor, activeThumbColor: surfaceColor }} // Web specific props
                            style={{ accentColor: primaryColor } as any}
                        />
                    </View>
                    <View style={[styles.row, { marginTop: SPACING.m }]}>
                        <View style={styles.rowTextContainer}>
                            <Text style={[styles.rowTitle, { color: textColor }]}>Completion Animations</Text>
                            <Text style={[styles.rowSubtitle, { color: textSecondaryColor }]}>
                                Show animations when rows, columns, or blocks are completed
                            </Text>
                        </View>
                        <Switch
                            value={completionAnimationsEnabled}
                            onValueChange={toggleCompletionAnimations}
                            trackColor={{ false: textSecondaryColor, true: primaryColor }}
                            thumbColor={surfaceColor}
                            ios_backgroundColor={textSecondaryColor}
                            {...{ activeTrackColor: primaryColor, activeThumbColor: surfaceColor }} // Web specific props
                            style={{ accentColor: primaryColor } as any}
                        />
                    </View>
                    <View style={[styles.row, { marginTop: SPACING.m }]}>
                        <View style={styles.rowTextContainer}>
                            <Text style={[styles.rowTitle, { color: textColor }]}>Streak Tracking</Text>
                            <Text style={[styles.rowSubtitle, { color: textSecondaryColor }]}>
                                Track daily game completion streaks
                            </Text>
                        </View>
                        <Switch
                            value={streakTrackingEnabled}
                            onValueChange={toggleStreakTracking}
                            trackColor={{ false: textSecondaryColor, true: primaryColor }}
                            thumbColor={surfaceColor}
                            ios_backgroundColor={textSecondaryColor}
                            {...{ activeTrackColor: primaryColor, activeThumbColor: surfaceColor }} // Web specific props
                            style={{ accentColor: primaryColor } as any}
                        />
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
    section: {
        marginBottom: SPACING.l,
        borderRadius: RADIUS.m,
        padding: SPACING.m,
        ...SHADOWS.small,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: SPACING.m,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    rowTextContainer: {
        flex: 1,
        paddingRight: SPACING.m,
    },
    rowTitle: {
        fontSize: 16,
        fontWeight: '500',
        marginBottom: 4,
    },
    rowSubtitle: {
        fontSize: 12,
    },
});
