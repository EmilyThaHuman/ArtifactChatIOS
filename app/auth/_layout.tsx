import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="verify" />
      <Stack.Screen name="callback" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="stripe-success" />
      <Stack.Screen name="stripe-cancel" />
    </Stack>
  );
}