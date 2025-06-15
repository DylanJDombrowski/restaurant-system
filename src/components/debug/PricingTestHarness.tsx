// src/components/debug/PricingTestHarness.tsx
// Test component to verify pricing without touching main PizzaCustomizer

"use client";
import { useState } from "react";

// Define a type for the test case input
interface TestCaseInput {
  restaurant_id: string;
  menu_item_id: string;
  size_code: string;
  crust_type: string;
  toppings: {
    customization_id: string;
    amount: string;
    placement: string | string[];
  }[];
}

interface TestResult {
  input: TestCaseInput;
  expected: number;
  actual: number;
  passed: boolean;
  error?: string;
}

const TEST_CASES: { name: string; input: TestCaseInput; expected: number }[] = [
  {
    name: "12in Thin + Normal Pepperoni (Whole)",
    input: {
      restaurant_id: "008e95ca-7131-42e6-9659-bf7a76026586",
      menu_item_id: "ef0b0cc8-26b7-4e6d-9ea5-29269642b3ef", // 👈 REPLACE
      size_code: "medium",
      crust_type: "thin",
      toppings: [
        {
          customization_id: "7394712e-3916-439d-b8da-fcac9b69c567", // 👈 REPLACE
          amount: "normal",
          placement: "whole",
        },
      ],
    },
    expected: 17.8, // 15.95 base + 1.85 pepperoni
  },
  {
    name: "12in Thin + Normal Pepperoni (Left Half)",
    input: {
      restaurant_id: "008e95ca-7131-42e6-9659-bf7a76026586",
      menu_item_id: "ef0b0cc8-26b7-4e6d-9ea5-29269642b3ef", // 👈 REPLACE
      size_code: "medium",
      crust_type: "thin",
      toppings: [
        {
          customization_id: "7394712e-3916-439d-b8da-fcac9b69c567", // 👈 REPLACE
          amount: "normal",
          placement: "left",
        },
      ],
    },
    expected: 17.8, // 15.95 base + 1.85 half pepperoni (same as whole per Excel)
  },
  {
    name: "12in Thin + Normal Pepperoni (Quarter)",
    input: {
      restaurant_id: "008e95ca-7131-42e6-9659-bf7a76026586",
      menu_item_id: "ef0b0cc8-26b7-4e6d-9ea5-29269642b3ef", // 👈 REPLACE
      size_code: "medium",
      crust_type: "thin",
      toppings: [
        {
          customization_id: "7394712e-3916-439d-b8da-fcac9b69c567", // 👈 REPLACE
          amount: "normal",
          placement: ["q1"], // Single quarter
        },
      ],
    },
    expected: 17.6, // 15.95 base + 1.65 quarter pepperoni
  },
  {
    name: "12in Thin + Normal Chicken (Whole)",
    input: {
      restaurant_id: "008e95ca-7131-42e6-9659-bf7a76026586",
      menu_item_id: "ef0b0cc8-26b7-4e6d-9ea5-29269642b3ef", // 👈 REPLACE
      size_code: "medium",
      crust_type: "thin",
      toppings: [
        {
          customization_id: "d4443020-faa0-4d20-a8a0-5044eac5dbff", // 👈 REPLACE
          amount: "normal",
          placement: "whole",
        },
      ],
    },
    expected: 19.65, // 15.95 base + 3.70 premium chicken
  },
  {
    name: "10in Thin + Extra Chicken (Half)",
    input: {
      restaurant_id: "008e95ca-7131-42e6-9659-bf7a76026586",
      menu_item_id: "ef0b0cc8-26b7-4e6d-9ea5-29269642b3ef", // 👈 REPLACE
      size_code: "small",
      crust_type: "thin",
      toppings: [
        {
          customization_id: "d4443020-faa0-4d20-a8a0-5044eac5dbff", // 👈 REPLACE
          amount: "extra",
          placement: "right",
        },
      ],
    },
    expected: 15.05, // 11.85 base + 3.20 half extra chicken
  },
];

export function PricingTestHarness() {
  const [results, setResults] = useState<TestResult[]>([]);
  const [testing, setTesting] = useState(false);
  const [customTest, setCustomTest] = useState({
    size_code: "medium",
    crust_type: "thin",
    toppings: "[]",
  });
  const [, setCustomResult] = useState<unknown>(null);

  const runTests = async () => {
    setTesting(true);
    const testResults: TestResult[] = [];

    for (const testCase of TEST_CASES) {
      try {
        console.log(`🧪 Running test: ${testCase.name}`);

        const response = await fetch("/api/menu/pizza/calculate-price", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(testCase.input),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        const result = await response.json();
        const actualPrice = result.data?.finalPrice || 0;
        const passed = Math.abs(actualPrice - testCase.expected) < 0.01;

        testResults.push({
          input: testCase.input,
          expected: testCase.expected,
          actual: actualPrice,
          passed,
        });

        console.log(`${passed ? "✅" : "❌"} ${testCase.name}: Expected ${testCase.expected}, Got ${actualPrice}`);
      } catch (error) {
        console.error(`❌ Test failed: ${testCase.name}`, error);
        testResults.push({
          input: testCase.input,
          expected: testCase.expected,
          actual: 0,
          passed: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    setResults(testResults);
    setTesting(false);
  };

  const runCustomTest = async () => {
    try {
      const toppings = JSON.parse(customTest.toppings);
      const testInput = {
        restaurant_id: "008e95ca-7131-42e6-9659-bf7a76026586",
        menu_item_id: "ef0b0cc8-26b7-4e6d-9ea5-29269642b3ef", // 👈 REPLACE
        size_code: customTest.size_code,
        crust_type: customTest.crust_type,
        toppings,
      };

      const response = await fetch("/api/menu/pizza/calculate-price", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(testInput),
      });

      const result = await response.json();
      setCustomResult(result);
    } catch (error) {
      setCustomResult({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const passedCount = results.filter((r) => r.passed).length;
  const totalCount = results.length;

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">🧪 Pizza Pricing Test Harness</h2>
        <p className="text-gray-600">Verify that your database pricing matches Excel before touching the PizzaCustomizer</p>
      </div>

      {/* Test Runner */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg">
        <button
          onClick={runTests}
          disabled={testing}
          className={`px-6 py-3 rounded-lg font-semibold text-white transition-colors ${
            testing ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {testing ? "Running Tests..." : "🚀 Run All Pricing Tests"}
        </button>

        {results.length > 0 && (
          <div className="mt-4">
            <div className={`text-lg font-semibold ${passedCount === totalCount ? "text-green-600" : "text-red-600"}`}>
              Results: {passedCount}/{totalCount} tests passed
            </div>
          </div>
        )}
      </div>

      {/* Test Results */}
      {results.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Test Results</h3>
          <div className="space-y-3">
            {results.map((result, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border-l-4 ${result.passed ? "bg-green-50 border-green-500" : "bg-red-50 border-red-500"}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">
                    {result.passed ? "✅" : "❌"} Test {index + 1}
                  </span>
                  <span className={`font-semibold ${result.passed ? "text-green-600" : "text-red-600"}`}>
                    Expected: ${result.expected.toFixed(2)} | Actual: ${result.actual.toFixed(2)}
                  </span>
                </div>

                <div className="text-sm text-gray-600">
                  <div>
                    Size: {result.input.size_code} | Crust: {result.input.crust_type}
                  </div>
                  <div>Toppings: {JSON.stringify(result.input.toppings)}</div>
                  {result.error && <div className="text-red-600 mt-1">Error: {result.error}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Custom Test */}
      <div className="p-4 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">🔧 Custom Test</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Size</label>
            <select
              value={customTest.size_code}
              onChange={(e) => setCustomTest({ ...customTest, size_code: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="small">Small (10&quot;)</option>
              <option value="medium">Medium (12&quot;)</option>
              <option value="large">Large (14&quot;)</option>
              <option value="xlarge">X-Large (16&quot;)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Crust</label>
            <select
              value={customTest.crust_type}
              onChange={(e) => setCustomTest({ ...customTest, crust_type: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="thin">Thin</option>
              <option value="double_dough">Double Dough</option>
              <option value="gluten_free">Gluten Free</option>
            </select>
          </div>

          <div>
            <button onClick={runCustomTest} className="mt-6 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
              Test Custom
            </button>
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Toppings JSON (Update IDs to match your database)</label>
          <textarea
            value={customTest.toppings}
            onChange={(e) => setCustomTest({ ...customTest, toppings: e.target.value })}
            rows={4}
            className="w-full border border-gray-300 rounded-md px-3 py-2 font-mono text-sm"
            placeholder='[{"customization_id": "your-topping-id", "amount": "normal", "placement": "left"}]'
          />
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
        <h3 className="text-lg font-semibold text-yellow-800 mb-2">📝 Before Running Tests</h3>
        <div className="text-sm text-yellow-700 space-y-2">
          <p>
            <strong>1. Update Customization IDs:</strong> Replace &quot;7394712e-3916-439d-b8da-fcac9b69c567&quot; and
            &quot;d4443020-faa0-4d20-a8a0-5044eac5dbff&quot; with real UUIDs from your `customizations` table.
          </p>
          <p>
            <strong>2. Update Menu Item ID:</strong> Replace &quot;ef0b0cc8-26b7-4e6d-9ea5-29269642b3ef&quot; with a real UUID for a basic
            pizza from your `menu_items` table.
          </p>
          <p>
            <strong>3. Run Database Migration:</strong> Ensure your `calculate_pizza_price` function in Postgres is updated with the new
            fractional pricing logic.
          </p>
          <p>
            <strong>4. Check API:</strong> Make sure your updated API route is deployed and calls the new database function.
          </p>
        </div>
      </div>
    </div>
  );
}
