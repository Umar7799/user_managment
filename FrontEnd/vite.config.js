import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      "/api": {
        target: "https://user-managment-backend-twn9.onrender.com", // ✅ Change this after backend deployment
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
