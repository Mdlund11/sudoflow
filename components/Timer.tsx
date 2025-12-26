import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { AppState, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useThemeColor } from '../hooks/use-theme-color';
import { loadTimer, saveTimer } from '../utils/storage';
import { formatTime } from '../utils/timeUtils';

interface TimerProps {
  isSolved?: boolean;
  onComplete?: (finalTime: number) => void;
}

const Timer: React.FC<TimerProps> = ({ isSolved, onComplete }) => {
  const [time, setTime] = useState(0);
  const [isRunning, setIsRunning] = useState(true);
  const [appState, setAppState] = useState(AppState.currentState);
  const textColor = useThemeColor({}, 'text');

  useEffect(() => {
    if (isSolved) {
      setIsRunning(false);
      onComplete?.(time);
    }
  }, [isSolved]);

  useEffect(() => {
    const handleAppStateChange = (nextAppState: any) => {
      if (appState.match(/inactive|background/) && nextAppState === 'active' && !isSolved) {
        setIsRunning(true);
      } else {
        setIsRunning(false);
      }
      setAppState(nextAppState);
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [appState, isSolved]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    if (isRunning && !isSolved) {
      interval = setInterval(() => {
        setTime(prevTime => prevTime + 1);
      }, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isRunning, isSolved]);

  useEffect(() => {
    const saveCurrentTime = async () => {
      if (!isRunning) {
        await saveTimer(time);
      }
    };
    saveCurrentTime();
  }, [isRunning, time]);

  useEffect(() => {
    const initializeTimer = async () => {
      const savedTime = await loadTimer();
      if (savedTime) {
        setTime(savedTime);
      }
    };
    initializeTimer();
  }, []);

  const handlePause = () => {
    if (!isSolved) {
      setIsRunning(!isRunning);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.timerText, { color: textColor }]}>{formatTime(time)}</Text>
      <TouchableOpacity onPress={handlePause} style={[styles.iconButton, isSolved && { opacity: 0.5 }]} disabled={isSolved}>
        <MaterialCommunityIcons name={isRunning ? "pause" : "play"} size={20} color={textColor} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timerText: {
    fontSize: 14,
    fontWeight: '600',
  },
  iconButton: {
    padding: 4,
  },
});

export default Timer;
