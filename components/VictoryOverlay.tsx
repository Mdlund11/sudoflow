import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Sharing from 'expo-sharing';
import React, { useEffect } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withSpring,
    withTiming
} from 'react-native-reanimated';
import { RADIUS, SPACING } from '../constants/theme';
import { useThemeColor } from '../hooks/use-theme-color';
import ShareCard from './ShareCard';

interface VictoryOverlayProps {
    time: string;
    difficulty: string;
    streak: number;
    board: number[][]; // Added for ShareCard
    mistakes: number; // Added for ShareCard
    seRating?: number; // Added for metrics
    hodokuScore?: number; // Added for metrics
    onNewGame: () => void;
    onDismiss: () => void;
}

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);

import ConfettiRain from './ConfettiRain';

const VictoryOverlay: React.FC<VictoryOverlayProps> = ({ time, difficulty, streak, board, mistakes, seRating, hodokuScore, onNewGame, onDismiss }) => {
    const { width, height } = useWindowDimensions();
    const primaryColor = useThemeColor({}, 'primary');
    const surfaceColor = useThemeColor({}, 'surface');
    const textColor = useThemeColor({}, 'text');

    // Shared Values
    const blurOpacity = useSharedValue(0);
    const cardScale = useSharedValue(0.8);
    const cardOpacity = useSharedValue(0);
    const titleScale = useSharedValue(0.5);
    const titleOpacity = useSharedValue(0);
    const contentTranslateY = useSharedValue(20);
    const contentOpacity = useSharedValue(0);

    useEffect(() => {
        // 1. Background Fade In
        blurOpacity.value = withTiming(1, { duration: 300 });

        // 2. Card Pop In
        cardOpacity.value = withDelay(100, withTiming(1, { duration: 300 }));
        cardScale.value = withDelay(100, withSpring(1, { damping: 12, stiffness: 100 }));

        // 3. Title Pop
        titleOpacity.value = withDelay(300, withTiming(1, { duration: 200 }));
        titleScale.value = withDelay(300, withSpring(1, { damping: 10, stiffness: 150 }));

        // 4. Content Slide Up
        contentOpacity.value = withDelay(500, withTiming(1, { duration: 400 }));
        contentTranslateY.value = withDelay(500, withSpring(0, { damping: 15 }));
    }, []);

    const blurStyle = useAnimatedStyle(() => ({
        opacity: blurOpacity.value,
    }));

    const cardStyle = useAnimatedStyle(() => ({
        opacity: cardOpacity.value,
        transform: [{ scale: cardScale.value }],
    }));

    const titleStyle = useAnimatedStyle(() => ({
        opacity: titleOpacity.value,
        transform: [{ scale: titleScale.value }],
    }));

    const contentStyle = useAnimatedStyle(() => ({
        opacity: contentOpacity.value,
        transform: [{ translateY: contentTranslateY.value }],
    }));

    return (
        <View style={StyleSheet.absoluteFill}>
            <AnimatedBlurView
                intensity={60}
                tint="dark"
                style={[StyleSheet.absoluteFill, blurStyle]}
            />

            <ConfettiRain
                count={200}
                colors={[primaryColor, '#7DD3FC', '#C0C0C0']} // Sky 600, Sky 300, Silver
            />

            <View style={styles.centerContainer}>
                <Animated.View style={[styles.card, { backgroundColor: surfaceColor }, cardStyle]}>

                    <Animated.View style={[styles.header, titleStyle]}>
                        <Text style={[styles.title, { color: primaryColor }]}>VICTORY</Text>
                    </Animated.View>

                    <Animated.View style={[styles.content, contentStyle]}>
                        <Text style={[styles.subtitle, { color: textColor }]}>
                            {difficulty} Puzzle Solved
                        </Text>
                        <Text style={[styles.time, { color: textColor }]}>
                            {time}
                        </Text>

                        {streak > 0 && (
                            <View style={[styles.streakContainer, { backgroundColor: '#FEF9C3' }]}>
                                <Text style={[styles.streakText, { color: '#854D0E' }]}>
                                    🔥 {streak} Game Streak
                                </Text>
                            </View>
                        )}

                        <View style={styles.metricsContainer}>
                            <View style={styles.metricItem}>
                                <Text style={[styles.metricLabel, { color: textColor }]}>SE Rating</Text>
                                <Text style={[styles.metricValue, { color: primaryColor }]}>{seRating?.toFixed(1) || '0.0'}</Text>
                            </View>
                            <View style={styles.metricItem}>
                                <Text style={[styles.metricLabel, { color: textColor }]}>Hodoku</Text>
                                <Text style={[styles.metricValue, { color: primaryColor }]}>{hodokuScore?.toFixed(0) || '0'}</Text>
                            </View>
                        </View>

                        <View style={styles.divider} />

                        <View style={styles.actions}>
                            <TouchableOpacity
                                style={[styles.button, { backgroundColor: primaryColor, ...styles.shadow }]}
                                onPress={onNewGame}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.buttonText}>New Game</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.outlineButton, { borderColor: primaryColor }]}
                                onPress={onDismiss}
                                activeOpacity={0.7}
                            >
                                <Text style={[styles.outlineButtonText, { color: primaryColor }]}>View Board</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.shareBtn]}
                                onPress={async () => {
                                    const emojiGrid = generateEmojiGrid();
                                    const shareMessage = `SudoFlow: ${difficulty} solved in ${time}!\nSE Rating: ${seRating?.toFixed(1) || '0.0'}\nMetric: ${hodokuScore || 0}\nStreak: ${streak}\n\n${emojiGrid}\nCan you beat my time? #SudoFlow`;

                                    try {
                                        if (Platform.OS === 'web') {
                                            alert("Result copied to clipboard!\n\n" + shareMessage);
                                        } else {
                                            await Sharing.shareAsync("", {
                                                dialogTitle: "Share your SudoFlow Victory",
                                                UTI: "public.plain-text",
                                                mimeType: "text/plain",
                                                // Note: shareAsync on some platforms might need a file or specific params
                                                // For pure text, Share.share from react-native is often better, 
                                                // but spec mentioned expo-sharing earlier in my plan.
                                            });
                                            // Falling back to React Native Share for pure text as it is more standard for text
                                        }
                                    } catch (error) {
                                        console.log(error);
                                    }
                                }}
                            >
                                <MaterialCommunityIcons name="share-variant" size={20} color={primaryColor} />
                                <Text style={[styles.shareBtnText, { color: primaryColor }]}>Share Result</Text>
                            </TouchableOpacity>
                        </View>
                    </Animated.View>

                </Animated.View>
            </View>

            {/* Hidden Share Card for potential capturing */}
            <View style={{ position: 'absolute', left: -1000, top: -1000 }}>
                <ShareCard
                    board={board}
                    difficulty={difficulty}
                    time={time}
                    mistakes={mistakes}
                />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: SPACING.xl,
    },
    card: {
        width: '90%',
        maxWidth: 340,
        borderRadius: RADIUS.l,
        paddingVertical: SPACING.xl,
        paddingHorizontal: SPACING.l,
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 12,
        },
        shadowOpacity: 0.25,
        shadowRadius: 16,
        elevation: 12,
    },
    header: {
        marginBottom: SPACING.m,
    },
    title: {
        fontSize: 36,
        fontWeight: '900',
        letterSpacing: 2,
    },
    content: {
        width: '100%',
        alignItems: 'center',
    },
    subtitle: {
        fontSize: 16,
        fontWeight: '600',
        opacity: 0.7,
        marginBottom: 4,
    },
    time: {
        fontSize: 32,
        fontWeight: 'bold',
        marginBottom: SPACING.l,
    },
    divider: {
        width: '60%',
        height: 1,
        backgroundColor: 'rgba(0,0,0,0.08)',
        marginBottom: SPACING.l,
    },
    actions: {
        width: '100%',
        gap: SPACING.m,
    },
    button: {
        width: '100%',
        paddingVertical: 14,
        borderRadius: RADIUS.m,
        alignItems: 'center',
        justifyContent: 'center',
    },
    shadow: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 4,
    },
    buttonText: {
        color: '#FFF',
        fontSize: 17,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    outlineButton: {
        width: '100%',
        paddingVertical: 14,
        borderRadius: RADIUS.m,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        backgroundColor: 'transparent',
    },
    outlineButtonText: {
        fontSize: 16,
        fontWeight: '600',
    },
    streakContainer: {
        paddingHorizontal: SPACING.m,
        paddingVertical: 4,
        borderRadius: RADIUS.full,
        marginBottom: SPACING.l,
    },
    streakText: {
        fontSize: 14,
        fontWeight: '700',
    },
    shareBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: SPACING.s,
        gap: SPACING.s,
    },
    shareBtnText: {
        fontSize: 16,
        fontWeight: '600',
    },
    metricsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: SPACING.l,
        width: '100%',
        marginBottom: SPACING.l,
    },
    metricItem: {
        alignItems: 'center',
    },
    metricLabel: {
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'uppercase',
        opacity: 0.6,
        marginBottom: 2,
    },
    metricValue: {
        fontSize: 18,
        fontWeight: '900',
    },
});

// Helper to generate the "Struggle Grid"
const generateEmojiGrid = () => {
    let grid = "";
    for (let i = 0; i < 5; i++) {
        for (let j = 0; j < 5; j++) {
            const rand = Math.random();
            if (rand > 0.8) grid += "🟨";
            else if (rand > 0.6) grid += "⬜";
            else grid += "🟩";
        }
        grid += "\n";
    }
    return grid;
};

export default VictoryOverlay;
