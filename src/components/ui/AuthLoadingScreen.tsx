// src/components/ui/AuthLoadingScreen.tsx

"use client";

import { Player } from "@lottiefiles/react-lottie-player";

export function AuthLoadingScreen() {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        width: "100%",
        height: "100vh",
        backgroundColor: "#f0f2f5", // Optional: change to your app's background
      }}
    >
      <Player
        autoplay
        loop
        src="/auth-loader.json"
        style={{ height: "300px", width: "300px" }}
      />
    </div>
  );
}
