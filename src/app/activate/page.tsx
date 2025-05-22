"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ShootingStars } from "@/components/ui/shooting-stars";
import { StarsBackground } from "@/components/ui/stars-background";
import { createBrowserClient } from "@supabase/ssr";

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function ActivatePage() {
  const [activationKey, setActivationKey] = useState("");
  const [status, setStatus] = useState<
    "initial" | "active" | "expired" | "error"
  >("initial");
  const [activationDate, setActivationDate] = useState<Date | null>(null);
  const [expirationDate, setExpirationDate] = useState<Date | null>(null);

  useEffect(() => {
    if (status === "active" && expirationDate) {
      const interval = setInterval(() => {
        if (new Date() > expirationDate) {
          setStatus("expired");
          clearInterval(interval);
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [status, expirationDate]);

  const handleActivate = async () => {
    console.log("🔧 handleActivate triggered");

    try {
      // Step 1: Get current user
      console.log("🔍 Getting current user from Supabase...");
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error("❌ User not authenticated:", userError);
        setStatus("error");
        return;
      }

      const userId = user.id;
      console.log("✅ User authenticated:", userId);

      // Step 2: Check if the license key belongs to the user
      console.log("🔍 Validating license key against user...");
      const { data: licenseRecord, error: licenseError } = await supabase
        .from("license_keys")
        .select("*")
        .eq("license_key", activationKey)
        .eq("user_id", userId)
        .maybeSingle();

      if (licenseError || !licenseRecord) {
        console.error("❌ License validation failed:", licenseError);
        setStatus("error");
        return;
      }

      console.log("✅ License key valid:", licenseRecord);

      // Step 3: Call backend API to activate the key
      console.log("🚀 Sending request to backend activation endpoint...");
      const response = await fetch(
        "http://localhost:3001/api/key-manager/activate-key",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: activationKey }),
        }
      );

      console.log("📡 Response received from backend:", response.status);

      if (response.ok) {
        const json = await response.json();
        console.log("✅ Activation response data:", json);

        const { activation_date, expiration_date } = json.data;

        const activationDateObj = new Date(activation_date * 1000);
        const expirationDateObj = new Date(expiration_date * 1000);

        if (
          isNaN(activationDateObj.getTime()) ||
          isNaN(expirationDateObj.getTime())
        ) {
          throw new Error("Invalid activation or expiration date received");
        }

        setActivationDate(activationDateObj);
        setExpirationDate(expirationDateObj);
        setStatus("active");

        // Step 4: Save activation details to Supabase
        console.log("💾 Updating license record in Supabase...");
        const { error: updateError } = await supabase
          .from("license_keys")
          .update({
            activation_date: activationDateObj.toISOString(),
            expiration_date: expirationDateObj.toISOString(),
          })
          .eq("license_key", activationKey);

        if (updateError) {
          console.error("⚠️ Failed to update activation info:", updateError);
        } else {
          console.log("✅ Activation info updated successfully in Supabase");
        }
      } else {
        const err = await response.json();
        console.error("❌ Activation API error response:", err);
        setStatus("error");
      }
    } catch (error) {
      console.error("🔥 Unexpected activation error:", error);
      setStatus("error");
    }
  };

  const renderStatusMessage = () => {
    switch (status) {
      case "initial":
        return "🛡️ Activate your license first";
      case "active":
        return "✅ License Active";
      case "expired":
        return "❌ License Expired";
      case "error":
        return "⚠️ Activation failed. Try again.";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-indigo-900 to-black text-white px-6 py-12 font-mono">
      <StarsBackground className="absolute inset-0 opacity-40" />
      <ShootingStars className="absolute inset-0" />
      <h1 className="text-4xl font-bold text-center mb-10 text-purple-400">
        Activate Your Antivirus License
      </h1>

      <div className="max-w-md mx-auto">
        <Card className="bg-white/5 backdrop-blur-sm border border-white/10">
          <CardHeader>
            <h2 className="text-xl font-bold text-white text-center">
              {renderStatusMessage()}
            </h2>
          </CardHeader>
          <CardContent>
            <Input
              placeholder="XXXX-XXXX-XXXX-XXXX"
              className="mb-4 bg-black/30 text-white placeholder:text-white/50 border-white/20"
              value={activationKey}
              onChange={(e) => setActivationKey(e.target.value)}
            />
            <Button
              onClick={handleActivate}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white"
              disabled={status === "active" || status === "expired"}
            >
              Activate
            </Button>
            {activationDate && expirationDate && (
              <div className="text-sm mt-4 text-center">
                <p>🕓 Activated: {activationDate.toLocaleString()}</p>
                <p>⏳ Expires: {expirationDate.toLocaleString()}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
