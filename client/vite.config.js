import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    proxy: {
      "/api": "chat-app-vcsg-2xp4v26oz-raghurams-projects.vercel.app/",
    },
  },
  plugins: [react()],
});
