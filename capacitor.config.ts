import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.khetbook.app",
  appName: "Khetbook",
  webDir: "dist",
  android: {
    allowMixedContent: true,
  },
  plugins: {
    LocalNotifications: {
      smallIcon: "ic_launcher",
      iconColor: "#1F8A4C",
    },
  },
};

export default config;
