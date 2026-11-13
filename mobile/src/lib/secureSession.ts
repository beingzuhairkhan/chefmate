import * as SecureStore from 'expo-secure-store';

const SESSION_TOKEN_KEY = 'chefmate-session-token';

export const secureSession = {
  getToken: () => SecureStore.getItemAsync(SESSION_TOKEN_KEY),
  saveToken: (token: string) => SecureStore.setItemAsync(SESSION_TOKEN_KEY, token),
  clearToken: () => SecureStore.deleteItemAsync(SESSION_TOKEN_KEY),
};
