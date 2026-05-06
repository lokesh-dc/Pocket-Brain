import React from 'react';
import { Tabs } from 'expo-router';
import { Brain, Search, Settings, List } from 'lucide-react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#1e293b',
          borderTopColor: '#334155',
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: '#6366f1',
        tabBarInactiveTintColor: '#94a3b8',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Mind',
          tabBarIcon: ({ color }) => <Brain size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="two"
        options={{
          title: 'Entries',
          tabBarIcon: ({ color }) => <List size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}
