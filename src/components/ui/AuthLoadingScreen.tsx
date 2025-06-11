"use client";

/**
 * A lightweight, CSS-only loading spinner for authentication checks.
 * It uses Tailwind CSS for styling and animations, ensuring a minimal footprint.
 */
export function AuthLoadingScreen() {
  return (
    <div className="flex justify-center items-center w-full h-screen bg-gray-50">
      <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-600"></div>
    </div>
  );
}
