import type { CapacitorConfig } from '@capacitor/cli';

const appUrl = process.env.CAPACITOR_APP_URL;

const config: CapacitorConfig = {
  appId: 'com.nbbc.mobile',
  appName: 'NBBC Platform',
  webDir: 'public-mobile',
  server: appUrl
    ? {
        url: appUrl,
        cleartext: false,
        androidScheme: 'https',
      }
    : undefined,
};

export default config;
