import { ActionSheetProvider } from '@expo/react-native-action-sheet';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import 'react-native-reanimated';



import { Colors } from '../constants/theme';
import { SettingsProvider } from '../context/SettingsContext';
import { StatsProvider } from '../context/StatsContext';
import { useColorScheme } from '../hooks/use-color-scheme';
import { useThemeColor } from '../hooks/use-theme-color';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  return (
    <SettingsProvider>
      <StatsProvider>
        <RootLayoutContent />
      </StatsProvider>
    </SettingsProvider>
  );
}

function RootLayoutContent() {
  const colorScheme = useColorScheme();
  const router = useRouter();


  const backgroundColor = useThemeColor({}, 'background');
  const primaryColor = useThemeColor({}, 'primary');
  const surfaceColor = useThemeColor({}, 'surface');

  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  const themeColors = colorScheme === 'dark' ? Colors.dark : Colors.light;

  return (
    <ActionSheetProvider>
      <ThemeProvider value={colorScheme === 'dark' ? {
        ...DarkTheme,
        colors: {
          ...DarkTheme.colors,
          primary: themeColors.primary,
          background: themeColors.background,
          card: themeColors.surface,
          text: themeColors.text,
          border: themeColors.border,
          notification: themeColors.primary,
        }
      } : {
        ...DefaultTheme,
        colors: {
          ...DefaultTheme.colors,
          primary: themeColors.primary,
          background: themeColors.background,
          card: themeColors.surface,
          text: themeColors.text,
          border: themeColors.border,
          notification: themeColors.primary,
        }
      }}>
        <View style={[styles.container, { backgroundColor }]}>
          <View style={styles.contentContainer}>
            <Stack>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen
                name="statistics"
                options={{
                  presentation: 'modal',
                  headerShown: true,
                  headerTitle: 'Statistics',
                  headerTitleAlign: 'center',
                  headerStyle: { backgroundColor: surfaceColor },
                  headerTintColor: primaryColor,
                }}
              />
              <Stack.Screen
                name="new-game"
                options={{
                  presentation: 'modal',
                  headerShown: true,
                  headerTitle: 'New Game',
                  headerTitleAlign: 'center',
                  headerStyle: { backgroundColor: surfaceColor },
                  headerTintColor: primaryColor,
                }}
              />
              <Stack.Screen
                name="settings"
                options={{
                  title: 'Settings',
                  headerShown: true,
                  headerBackTitle: 'Back',
                  headerStyle: { backgroundColor: themeColors.surface },
                  headerTintColor: themeColors.primary,
                }}
              />
              <Stack.Screen
                name="donate"
                options={{
                  title: 'Support sudoflow',
                  headerShown: true,
                  headerBackTitle: 'Back',
                  headerStyle: { backgroundColor: themeColors.surface },
                  headerTintColor: themeColors.primary,
                }}
              />
              <Stack.Screen name="+not-found" />
            </Stack>
            <StatusBar style="auto" />
          </View>
        </View>
      </ThemeProvider>
    </ActionSheetProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    width: '100%',
    maxWidth: '100%',
    alignSelf: 'center',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },
  menu: {
    marginTop: 100, // Adjust based on header height
    marginLeft: 16,
    borderRadius: 12,
    padding: 8,
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  menuIcon: {
    marginRight: 16,
  },
  menuText: {
    fontSize: 16,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    marginHorizontal: 16,
  },
});
