import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { generateLicenseKey } from "../../../../utils/liscenceUtils"; // Fixed import typo

// Load environment variables securely
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const keySecret = process.env.RAZORPAY_KEY_SECRET;

if (!supabaseUrl || !supabaseServiceRoleKey || !keySecret) {
  throw new Error("Missing required environment variables.");
}

// Initialize Supabase client securely
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      plan,
      userId,
    } = body;

    console.log("🔹 Received Payment Data:", body);

    // Validate request data
    if (
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature ||
      !userId
    ) {
      console.error("Missing payment details:", {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        userId,
      });
      return NextResponse.json(
        { error: "Missing payment details" },
        { status: 400 }
      );
    }

    // Ensure keySecret is defined
    if (!keySecret) {
      console.error("Razorpay key secret is missing.");
      return NextResponse.json(
        { error: "Server misconfiguration" },
        { status: 500 }
      );
    }

    // Generate and verify HMAC SHA256 signature
    const expectedSignature = crypto
      .createHmac("sha256", keySecret as string) // Type assertion ensures TypeScript treats it as a string
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      console.error("Payment verification failed. Signatures do not match.");
      return NextResponse.json(
        { error: "Payment verification failed" },
        { status: 400 }
      );
    }

    // Check if user exists before updating
    const { data: existingUser, error: fetchError } = await supabase
      .from("user_profiles")
      .select("id")
      .eq("id", userId)
      .single();

    if (fetchError || !existingUser) {
      console.error("User not found:", fetchError || "No matching user ID.");
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Generate unique license key
    let licenseKey;
    let isUnique = false;

    while (!isUnique) {
      licenseKey = generateLicenseKey();
      const { data: existingKey } = await supabase
        .from("license_keys")
        .select("id")
        .eq("license_key", licenseKey)
        .single();
      if (!existingKey) isUnique = true;
    }

    const activationDate = new Date().toISOString();
    const expirationDate = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 minutes expiry

    // Update user profile in Supabase
    const { error: userError } = await supabase
      .from("user_profiles")
      .update({ plan, is_paid: true })
      .eq("id", userId);

    if (userError) {
      console.error("User profile update failed:", userError);
      return NextResponse.json(
        { error: "User profile update failed", details: userError },
        { status: 500 }
      );
    }

    // Insert license key into Supabase
    const { error: licenseError } = await supabase.from("license_keys").insert([
      {
        user_id: userId,
        order_id: razorpay_order_id,
        license_key: licenseKey,
        activation_date: activationDate,
        expiration_date: expirationDate,
      },
    ]);

    if (licenseError) {
      console.error("License key insertion failed:", licenseError);
      return NextResponse.json(
        { error: "License key insertion failed", details: licenseError },
        { status: 500 }
      );
    }

    console.log("✅ Payment verified & database updated successfully.");
    return NextResponse.json({
      success: true,
      license_key: licenseKey,
      activation_date: activationDate,
      expiration_date: expirationDate,
    });
  } catch (error) {
    console.error("Internal server error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error },
      { status: 500 }
    );
  }
}
