import { Tabs } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={({route}) => ({
        headerShown: false,
        tabBarStyle: 
          // Hide tab bar for main chat, library, and canvases screens
          route.name === 'index' || route.name === 'library' || route.name === 'canvases'
            ? { display: 'none' }
            : {
                backgroundColor: Colors.backgroundSecondary,
                borderTopColor: 'rgba(255, 255, 255, 0.1)',
                borderTopWidth: 1,
              },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      })}
    >
      <Tabs.Screen 
        name="index" 
        options={{
          title: 'Chat',
          tabBarIcon: ({ color, size }) => (
            <Feather name="message-circle" size={size} color={color} />
          ),
        }} 
      />
      <Tabs.Screen 
        name="library" 
        options={{
          title: 'Library',
          tabBarIcon: ({ color, size }) => (
            <Feather name="image" size={size} color={color} />
          ),
        }} 
      />
      <Tabs.Screen 
        name="canvases" 
        options={{
          title: 'Canvases',
          tabBarIcon: ({ color, size }) => (
            <Feather name="file-text" size={size} color={color} />
          ),
        }} 
      />
      <Tabs.Screen 
        name="shared" 
        options={{
          title: 'Shared',
          tabBarIcon: ({ color, size }) => (
            <Feather name="share-2" size={size} color={color} />
          ),
        }} 
      />
      <Tabs.Screen 
        name="profile" 
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Feather name="user" size={size} color={color} />
          ),
        }} 
      />
      <Tabs.Screen 
        name="settings" 
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => (
            <Feather name="settings" size={size} color={color} />
          ),
        }} 
      />
    </Tabs>
  );
}