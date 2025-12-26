
import AsyncStorage from '@react-native-async-storage/async-storage';

export const saveBoard = async (board: any) => {
  try {
    const jsonValue = JSON.stringify(board);
    await AsyncStorage.setItem('@sudoku_board', jsonValue);
  } catch (e) {
    console.error("Error saving board", e);
  }
};

export const loadBoard = async () => {
  try {
    const jsonValue = await AsyncStorage.getItem('@sudoku_board');
    return jsonValue != null ? JSON.parse(jsonValue) : null;
  } catch (e) {
    console.error("Error loading board", e);
  }
};

export const saveTimer = async (time: number) => {
  try {
    await AsyncStorage.setItem('@sudoku_timer', time.toString());
  } catch (e) {
    console.error("Error saving timer", e);
  }
};

export const loadTimer = async () => {
  try {
    const value = await AsyncStorage.getItem('@sudoku_timer');
    return value != null ? parseInt(value, 10) : null;
  } catch (e) {
    console.error("Error loading timer", e);
  }
};
