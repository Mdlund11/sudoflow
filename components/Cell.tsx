import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ANIMATION_TIMINGS, COLORS } from '../constants/theme';
import { useThemeColor } from '../hooks/use-theme-color';

interface CellProps {
  row: number;
  col: number;
  value: number;
  notes: number[];
  isSelected: boolean;
  onPress: () => void;
  size: number;
  isInitial: boolean;
  isConflict: boolean;
  isHighlightRow: boolean;
  isHighlightCol: boolean;
  isHighlightBlock: boolean;
  isHighlightNumber: boolean;
  animationTrigger?: number;
  animationDelay?: number;
  animationType?: 'flash' | 'blade-flip';
  isTargetHint?: boolean;
  isContributingHint?: boolean;
}

const Cell: React.FC<CellProps> = ({
  row,
  col,
  value,
  notes,
  isSelected,
  onPress,
  size,
  isInitial,
  isConflict,
  isHighlightRow,
  isHighlightCol,
  isHighlightBlock,
  isHighlightNumber,
  animationTrigger,
  animationDelay,
  animationType = 'flash',
  isTargetHint,
  isContributingHint,
}) => {
  // Single animation value to keep everything in sync (0 to 1)
  const animProgress = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  const textColor = useThemeColor({}, 'text');
  const textSecondaryColor = useThemeColor({}, 'textSecondary');
  const backgroundColor = useThemeColor({}, 'surface');
  const primaryColor = useThemeColor({}, 'primary');
  const borderLightColor = useThemeColor({}, 'border');
  const borderDarkColor = useThemeColor({}, 'borderDark');
  const selectionColor = useThemeColor({}, 'selection');
  const highlightColor = useThemeColor({}, 'highlight');
  const highlightStrongColor = useThemeColor({}, 'highlightStrong');
  const errorColor = useThemeColor({}, 'error');
  const hintTargetColor = useThemeColor({}, 'hintTarget');
  const hintContributingColor = useThemeColor({}, 'hintContributing');

  useEffect(() => {
    if (animationTrigger && animationDelay !== undefined) {
      // 1. Reset immediately
      animProgress.setValue(0);
      rotateAnim.setValue(0);

      const expandDuration = ANIMATION_TIMINGS?.CELL_EXPAND_DURATION || 100;
      const contractDuration = ANIMATION_TIMINGS?.CELL_CONTRACT_DURATION || 100;
      const totalDuration = expandDuration + contractDuration;
      const bladeFlipDuration = ANIMATION_TIMINGS?.BLADE_FLIP_DURATION || 500;

      // 2. Start the sequence
      const animations = [
        Animated.delay(animationDelay || 0),
      ];

      if (animationType === 'blade-flip') {
        animations.push(
          Animated.timing(rotateAnim, {
            toValue: 1,
            duration: bladeFlipDuration,
            useNativeDriver: true,
          })
        );
      } else {
        animations.push(
          Animated.timing(animProgress, {
            toValue: 1,
            duration: totalDuration,
            useNativeDriver: false, // Color and shadow animations need JS driver
          })
        );
      }

      const animation = Animated.sequence(animations);
      animation.start(() => {
        // Reset values after animation to prevent squished state
        rotateAnim.setValue(0);
        animProgress.setValue(0);
      });

      return () => {
        animation.stop();
        // Force reset even on stop to prevent sticky squished states
        rotateAnim.setValue(0);
        animProgress.setValue(0);
      };
    }
  }, [animationTrigger]);

  const borderRightWidth = (col + 1) % 3 === 0 && col !== 8 ? 2 : 1;
  const borderBottomWidth = (row + 1) % 3 === 0 && row !== 8 ? 2 : 1;
  const borderColor = (col + 1) % 3 === 0 && col !== 8 ? borderDarkColor : borderLightColor;
  const borderBottomColor = (row + 1) % 3 === 0 && row !== 8 ? borderDarkColor : borderLightColor;

  const getBackgroundColor = () => {
    if (isTargetHint) return hintTargetColor;
    if (isContributingHint) return hintContributingColor;
    if (isConflict) return errorColor + '40';
    if (isSelected) return selectionColor;
    if (isHighlightNumber) return highlightStrongColor;
    if (isHighlightRow || isHighlightCol || isHighlightBlock) return highlightColor;
    return backgroundColor;
  };

  // Interpolate peak at the transition point
  const expandPart = (ANIMATION_TIMINGS?.CELL_EXPAND_DURATION || 100);
  const contractPart = (ANIMATION_TIMINGS?.CELL_CONTRACT_DURATION || 100);
  const totalPart = expandPart + contractPart || 200;
  const peakTime = Math.min(0.99, Math.max(0.01, expandPart / totalPart || 0.5));

  // Opacity for the dedicated flash overlay
  const flashOpacity = animProgress.interpolate({
    inputRange: [0, peakTime, 1],
    outputRange: [0, 0.4, 0],
  });

  return (
    <View
      style={{
        zIndex: animationTrigger ? 10 : 0,
      }}
    >
      <TouchableOpacity
        style={[
          styles.cell,
          {
            width: size,
            height: size,
            borderRightWidth,
            borderBottomWidth,
            borderRightColor: borderColor,
            borderBottomColor: borderBottomColor,
            backgroundColor: getBackgroundColor(),
          },
        ]}
        onPress={onPress}
      >
        {/* Flash Overlay */}
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: COLORS.primary,
              opacity: flashOpacity,
            },
          ]}
        />

        <Animated.View
          style={[
            styles.cellBackground,
            animationType === 'blade-flip' && {
              transform: [
                { perspective: 1000 },
                {
                  rotateY: rotateAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0deg', '360deg'],
                  }),
                },
              ],
            },
          ]}
        >
          {value !== 0 ? (
            <Text
              style={[
                styles.cellText,
                {
                  fontSize: size * 0.6,
                  color: isInitial ? textColor : primaryColor,
                  fontWeight: isInitial ? '600' : '500',
                },
                isConflict && { color: errorColor },
              ]}
            >
              {value}
            </Text>
          ) : (
            <View style={styles.notesContainer}>
              {[0, 1, 2].map((r) => (
                <View key={r} style={styles.noteRow}>
                  {[0, 1, 2].map((c) => {
                    const num = r * 3 + c + 1;
                    return (
                      <View key={c} style={styles.noteCell}>
                        {notes && notes.includes(num) && (
                          <Text style={[styles.noteText, { fontSize: size * 0.2, color: textSecondaryColor }]}>
                            {num}
                          </Text>
                        )}
                      </View>
                    );
                  })}
                </View>
              ))}
            </View>
          )}
        </Animated.View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  cell: {
    justifyContent: 'center',
    alignItems: 'center',
    borderColor: COLORS.border,
  },
  cellBackground: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cellText: {
    textAlign: 'center',
  },
  notesContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
    flexDirection: 'column',
    justifyContent: 'space-between',
    padding: 2,
  },
  noteRow: {
    flex: 1,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  noteCell: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noteText: {
    fontWeight: '600',
  },
});

export default Cell;
