"use client";
import { useState } from "react";

interface SpecialInstructionsProps {
  instructions: string;
  onChange: (instructions: string) => void;
  placeholder?: string;
  maxLength?: number;
  className?: string;
}

export function SpecialInstructions({
  instructions,
  onChange,
  placeholder = "Any special requests for this pizza...",
  maxLength = 500,
  className = "",
}: SpecialInstructionsProps) {
  const [isFocused, setIsFocused] = useState(false);
  const characterCount = instructions.length;
  const isNearLimit = characterCount > maxLength * 0.8;
  const isOverLimit = characterCount > maxLength;

  return (
    <section className={className}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-900">Special Instructions</h3>
        <div className={`text-xs font-medium ${isOverLimit ? "text-red-600" : isNearLimit ? "text-amber-600" : "text-gray-500"}`}>
          {characterCount}/{maxLength}
        </div>
      </div>

      <div className="relative">
        <textarea
          placeholder={placeholder}
          value={instructions}
          onChange={(e) => {
            if (e.target.value.length <= maxLength) {
              onChange(e.target.value);
            }
          }}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          rows={3}
          className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 transition-colors resize-none ${
            isOverLimit
              ? "border-red-300 focus:ring-red-500 focus:border-red-500"
              : isFocused
              ? "border-blue-300 focus:ring-blue-500 focus:border-blue-500"
              : "border-gray-300 hover:border-gray-400"
          }`}
        />

        {/* Character indicator */}
        {isFocused && (
          <div className="absolute bottom-2 right-2 text-xs text-gray-400 bg-white px-1 rounded">
            {characterCount}/{maxLength}
          </div>
        )}
      </div>

      {/* Helper text */}
      <div className="mt-2 text-xs text-gray-600">
        <div className="flex items-start space-x-4">
          <div>
            <span className="font-medium">Examples:</span> Extra crispy, light sauce, cut in squares
          </div>
        </div>
      </div>

      {/* Common quick selections */}
      {!instructions && (
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="text-xs text-gray-500">Quick options:</span>
          {["Extra crispy", "Light sauce", "Well done", "Cut in squares", "No cheese on half"].map((option) => (
            <button
              key={option}
              onClick={() => onChange(option)}
              className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded border transition-colors"
            >
              {option}
            </button>
          ))}
        </div>
      )}

      {/* Warning for over limit */}
      {isOverLimit && (
        <div className="mt-2 text-xs text-red-600 flex items-center">
          <span className="mr-1">⚠️</span>
          Text exceeds maximum length. Please shorten your message.
        </div>
      )}
    </section>
  );
}
