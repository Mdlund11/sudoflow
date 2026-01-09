import React, { useEffect, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
    Easing,
    cancelAnimation,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withRepeat,
    withTiming
} from 'react-native-reanimated';

interface ConfettiPieceProps {
    startX: number;
    delay: number;
    duration: number;
    color: string;
    size: number;
    windowHeight: number;
}

const ConfettiPiece: React.FC<ConfettiPieceProps> = ({ startX, delay, duration, color, size, windowHeight }) => {
    const translateY = useSharedValue(-50);
    const rotateX = useSharedValue(0);
    const rotateY = useSharedValue(0);
    const rotateZ = useSharedValue(0);

    useEffect(() => {
        // Fall animation - Run once (no repeat)
        translateY.value = withDelay(
            delay,
            withTiming(windowHeight + 200, { duration: duration, easing: Easing.linear }) // Fall further to ensure off-screen
        );

        // Rotation animations - Loop while falling
        // We can keep these looping effectively since they naturally stop being visible when off screen
        // or match duration roughly
        rotateX.value = withRepeat(withTiming(360, { duration: duration * 0.8 }), -1);
        rotateY.value = withRepeat(withTiming(360, { duration: duration * 1.2 }), -1);
        rotateZ.value = withRepeat(withTiming(360, { duration: duration * 0.5 }), -1);

        return () => {
            cancelAnimation(translateY);
            cancelAnimation(rotateX);
            cancelAnimation(rotateY);
            cancelAnimation(rotateZ);
        }
    }, []);

    const style = useAnimatedStyle(() => ({
        transform: [
            { translateX: startX },
            { translateY: translateY.value },
            { rotateX: `${rotateX.value}deg` },
            { rotateY: `${rotateY.value}deg` },
            { rotateZ: `${rotateZ.value}deg` },
        ],
    }));

    return (
        <Animated.View
            style={[
                styles.piece,
                style,
                { width: size, height: size, backgroundColor: color },
            ]}
        />
    );
};

interface ConfettiRainProps {
    count?: number;
    colors?: string[];
}

const ConfettiRain: React.FC<ConfettiRainProps> = ({
    count = 60,
    colors = ['#FFD700', '#C0C0C0', '#FFFFFF']
}) => {
    const { width, height } = useWindowDimensions();
    const [pieces, setPieces] = useState<any[]>([]);

    useEffect(() => {
        const newPieces = Array.from({ length: count }).map((_, i) => ({
            key: i,
            startX: Math.random() * width,
            delay: Math.random() * 3000, // Spawn over 3 seconds
            duration: 2500 + Math.random() * 2000, // 2.5s - 4.5s fall time
            color: colors[Math.floor(Math.random() * colors.length)],
            size: 6 + Math.random() * 6,
        }));
        setPieces(newPieces);
    }, [count, width, colors]);

    return (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
            {pieces.map((p) => (
                <ConfettiPiece
                    key={p.key}
                    startX={p.startX}
                    delay={p.delay}
                    duration={p.duration}
                    color={p.color}
                    size={p.size}
                    windowHeight={height}
                />
            ))}
        </View>
    );
};

const styles = StyleSheet.create({
    piece: {
        position: 'absolute',
        top: 0,
        left: 0,
        borderRadius: 2,
    },
});

export default ConfettiRain;
