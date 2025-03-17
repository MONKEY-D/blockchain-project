// import { NextRequest, NextResponse } from "next/server";
// import crypto from "crypto";
// import { createClient } from "@supabase/supabase-js";

// const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
// const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// if (!supabaseUrl || !supabaseAnonKey) {
//   throw new Error("Supabase environment variables are missing");
// }

// const supabase = createClient(supabaseUrl, supabaseAnonKey);

// const keySecret = process.env.RAZORPAY_KEY_SECRET;

// export async function POST(request: NextRequest) {
//   try {
//     const body = await request.json();
//     const {
//       razorpay_order_id,
//       razorpay_payment_id,
//       razorpay_signature,
//       plan,
//       userId,
//     } = body;

//     console.log("Received Data:", body);

//     if (!keySecret) {
//       console.error("❌ Razorpay key secret is missing");
//       return NextResponse.json(
//         { error: "Razorpay key secret missing" },
//         { status: 500 }
//       );
//     }

//     // Generate HMAC SHA256 signature
//     const expectedSignature = crypto
//       .createHmac("sha256", keySecret)
//       .update(`${razorpay_order_id}|${razorpay_payment_id}`)
//       .digest("hex");

//     console.log("Expected Signature:", expectedSignature);
//     console.log("Received Signature:", razorpay_signature);

//     if (expectedSignature !== razorpay_signature) {
//       console.error("❌ Payment verification failed. Signatures do not match.");
//       return NextResponse.json(
//         { error: "Payment verification failed" },
//         { status: 400 }
//       );
//     }

//     // Update Supabase database
//     console.log("✅ Updating database for user:", userId);
//     const { error } = await supabase
//       .from("user_profiles")
//       .update({ plan: plan, is_paid: true })
//       .eq("id", userId);

//     if (error) {
//       console.error("❌ Database update failed:", error);
//       return NextResponse.json(
//         { error: "Database update failed" },
//         { status: 500 }
//       );
//     }

//     console.log("✅ Payment verified & database updated successfully.");
//     return NextResponse.json({ success: true });
//   } catch (error) {
//     console.error("Internal server error:", error);
//     return NextResponse.json(
//       { error: "Internal server error" },
//       { status: 500 }
//     );
//   }
// }

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

// ✅ Use service role key for secure updates
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // More privileges

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error("Supabase environment variables are missing");
}

// ✅ Connect using the Service Role key (DO NOT expose this key in frontend)
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

const keySecret = process.env.RAZORPAY_KEY_SECRET;

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

    if (!keySecret) {
      console.error("❌ Razorpay key secret is missing");
      return NextResponse.json(
        { error: "Razorpay key secret missing" },
        { status: 500 }
      );
    }

    // ✅ Generate HMAC SHA256 signature
    const expectedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    console.log("✅ Expected Signature:", expectedSignature);
    console.log("🔹 Received Signature:", razorpay_signature);

    // 🚨 Validate payment signature
    if (expectedSignature !== razorpay_signature) {
      console.error("❌ Payment verification failed. Signatures do not match.");
      return NextResponse.json(
        { error: "Payment verification failed" },
        { status: 400 }
      );
    }

    // ✅ Ensure userId exists
    if (!userId) {
      console.error("❌ User ID is missing.");
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // ✅ Update Supabase database
    console.log("✅ Updating database for user:", userId);
    const { data, error } = await supabase
      .from("user_profiles")
      .update({ plan: plan, is_paid: true })
      .eq("id", userId)
      .select(); // Get updated data to verify success

    if (error) {
      console.error("❌ Database update failed:", error);
      return NextResponse.json(
        { error: "Database update failed", details: error },
        { status: 500 }
      );
    }

    console.log("✅ Payment verified & database updated successfully:", data);
    return NextResponse.json({ success: true, updatedUser: data });
  } catch (error) {
    console.error("❌ Internal server error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error },
      { status: 500 }
    );
  }
}
