import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:5000", // ✅ Change this after backend deployment
        changeOrigin: true,
        secure: false,
      },
    },
  },
});

// git remote add origin https://github.com/Umar7799/user_managment.git