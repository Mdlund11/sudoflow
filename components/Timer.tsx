import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { AppState, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useThemeColor } from '../hooks/use-theme-color';
import { loadTimer, saveTimer } from '../utils/storage';
import { formatTime } from '../utils/timeUtils';

export interface TimerRef {
  getTime: () => number;
}

interface TimerProps {
  isSolved?: boolean;
  isFailed?: boolean;
}

const Timer = forwardRef<TimerRef, TimerProps>(({ isSolved, isFailed }, ref) => {
  const [time, setTime] = useState(0);
  const [isRunning, setIsRunning] = useState(true);
  const [appState, setAppState] = useState(AppState.currentState);
  const textColor = useThemeColor({}, 'text');

  useImperativeHandle(ref, () => ({
    getTime: () => time
  }));

  useEffect(() => {
    if (isSolved || isFailed) {
      setIsRunning(false);
    }
  }, [isSolved, isFailed]);

  useEffect(() => {
    const handleAppStateChange = (nextAppState: any) => {
      if (appState.match(/inactive|background/) && nextAppState === 'active' && !isSolved && !isFailed) {
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
  }, [appState, isSolved, isFailed]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    if (isRunning && !isSolved && !isFailed) {
      interval = setInterval(() => {
        setTime(prevTime => prevTime + 1);
      }, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isRunning, isSolved, isFailed]);

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
    if (!isSolved && !isFailed) {
      setIsRunning(!isRunning);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.timerText, { color: textColor }]}>{formatTime(time)}</Text>
      <TouchableOpacity onPress={handlePause} style={[styles.iconButton, (isSolved || isFailed) && { opacity: 0.5 }]} disabled={isSolved || isFailed}>
        <MaterialCommunityIcons name={isRunning ? "pause" : "play"} size={20} color={textColor} />
      </TouchableOpacity>
    </View>
  );
});

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
