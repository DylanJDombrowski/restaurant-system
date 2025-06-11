// src/app/api/loyalty/calculate/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const points = parseInt(searchParams.get("points") || "0");

    if (!points || points <= 0) {
      return NextResponse.json(
        { error: "Valid points amount required" },
        { status: 400 }
      );
    }

    const REDEMPTION_RATE = 20; // 20 points = $1
    const MINIMUM_REDEMPTION = 100; // minimum 100 points to redeem

    if (points < MINIMUM_REDEMPTION) {
      return NextResponse.json({
        data: {
          can_redeem: false,
          discount_amount: 0,
          minimum_required: MINIMUM_REDEMPTION,
          message: `Minimum ${MINIMUM_REDEMPTION} points required for redemption`,
        },
      });
    }

    const discount_amount = Math.floor((points / REDEMPTION_RATE) * 100) / 100;

    return NextResponse.json({
      data: {
        can_redeem: true,
        discount_amount,
        points_needed: points,
        conversion_rate: REDEMPTION_RATE,
        message: `${points} points = $${discount_amount.toFixed(2)} discount`,
      },
    });
  } catch (error) {
    console.error("Error calculating loyalty discount:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
