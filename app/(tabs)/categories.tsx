import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function CategoriesScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Categories</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#faf9f7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontFamily: 'DMSerifDisplay-Regular',
    fontSize: 24,
    color: '#1a1a1a',
  },
});
