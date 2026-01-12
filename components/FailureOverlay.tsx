import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import React, { useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withSpring,
    withTiming
} from 'react-native-reanimated';
import { RADIUS, SPACING } from '../constants/theme';
import { useThemeColor } from '../hooks/use-theme-color';

interface FailureOverlayProps {
    onNewGame: () => void;
    onDismiss: () => void;
}

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);

const FAILURE_MESSAGES = [
    "Don't give up! Every mistake is a lesson.",
    "Every giant was once a beginner. Try again.",
    "Clarity comes with practice. Shall we go again?",
    "A minor setback for a major comeback.",
    "The logic is there. Just take a deep breath.",
    "Progress isn't linear. Keep moving forward.",
    "Resilience is the key to mastery.",
    "Perfection is a journey, not a destination.",
    "You're getting closer with every try.",
    "Dust yourself off. The next grid is waiting.",
    "Even the sharpest mind needs a second chance.",
    "Logic puzzles take patience. You've got this.",
    "Mistake made, lesson learned. Ready for round two?",
    "Pause, reflect, and jump back in.",
    "Your focus is improving. Try another one.",
    "Success is built on persistence.",
    "One more time? The solution is out there.",
    "Keep going. The rhythm will find you.",
    "Growth happens in the challenge.",
    "Re-center and reset. You're almost there.",
];

const FailureOverlay: React.FC<FailureOverlayProps> = ({ onNewGame, onDismiss }) => {
    const primaryColor = useThemeColor({}, 'primary');
    const surfaceColor = useThemeColor({}, 'surface');
    const textColor = useThemeColor({}, 'text');
    const errorColor = useThemeColor({}, 'error');

    // Select random message once on mount
    const randomMessage = React.useMemo(() => {
        return FAILURE_MESSAGES[Math.floor(Math.random() * FAILURE_MESSAGES.length)];
    }, []);

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

            <View style={styles.centerContainer}>
                <Animated.View style={[styles.card, { backgroundColor: surfaceColor }, cardStyle]}>

                    <Animated.View style={[styles.header, titleStyle]}>
                        <MaterialCommunityIcons name="heart-broken" size={64} color={errorColor} style={{ marginBottom: SPACING.s }} />
                        <Text style={[styles.title, { color: primaryColor }]}>GAME OVER</Text>
                    </Animated.View>

                    <Animated.View style={[styles.content, contentStyle]}>
                        <Text style={[styles.subtitle, { color: textColor }]}>
                            {randomMessage}
                        </Text>

                        <View style={styles.divider} />

                        <View style={styles.actions}>
                            <TouchableOpacity
                                style={[styles.button, { backgroundColor: primaryColor, ...styles.shadow }]}
                                onPress={onNewGame}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.buttonText}>Try Again</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.outlineButton, { borderColor: primaryColor }]}
                                onPress={onDismiss}
                                activeOpacity={0.7}
                            >
                                <Text style={[styles.outlineButtonText, { color: primaryColor }]}>View Board</Text>
                            </TouchableOpacity>
                        </View>
                    </Animated.View>

                </Animated.View>
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
        alignItems: 'center',
    },
    title: {
        fontSize: 28,
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
        marginBottom: SPACING.l,
        textAlign: 'center',
        paddingHorizontal: SPACING.m,
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
        paddingVertical: SPACING.m,
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
});

export default FailureOverlay;
