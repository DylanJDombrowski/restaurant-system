"use client";
import Lottie from "lottie-react";
import authLoaderAnimation from "../../../public/auth-loader.json";

/**
 * A loading screen with a Lottie animation for authentication checks.
 */
export function AuthLoadingScreen() {
  return (
    <div className="flex justify-center items-center w-full h-screen bg-gray-50">
      <div className="w-1/2">
        <Lottie animationData={authLoaderAnimation} loop={true} />
      </div>
    </div>
  );
}
