import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface HeaderProps {
  title: string;
}

const Header: React.FC<HeaderProps> = ({ title }) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.header, { paddingTop: insets.top }]}>
      <View style={styles.titleContainer}>
        <Text style={styles.title}>{title}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#f8f8f8',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#a7a7aa',
  },
  titleContainer: {
    height: 44, // Standard iOS/Android header height
    justifyContent: 'center',
    alignItems: Platform.OS === 'ios' ? 'center' : 'flex-start',
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 17,
    fontWeight: Platform.OS === 'ios' ? '600' : '500',
    textAlign: 'center',
  },
});

export default Header;