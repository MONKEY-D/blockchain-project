"use client";

import { createClient } from "@supabase/supabase-js";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ShootingStars } from "@/components/ui/shooting-stars";
import { StarsBackground } from "@/components/ui/stars-background";

const supabaseUrl = "https://ifsnwnibelqxtrzazfox.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlmc253bmliZWxxeHRyemF6Zm94Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAzMzMzMDUsImV4cCI6MjA1NTkwOTMwNX0.9Gzs7kvxhjMIYUuJsIiyk3AWCKTj6fDwS5F9WiYF7X0";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
    try {
      const response = await fetch(
        "http://localhost:3001/api/key-manager/activate-key",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: activationKey }),
        }
      );

      if (response.ok) {
        const data = await response.json();

        // Convert UNIX timestamp (seconds) to JS Date (ms)
        const activationDateObj = new Date(data.activation_date * 1000);
        const expirationDateObj = new Date(data.expiration_date * 1000);

        setActivationDate(activationDateObj);
        setExpirationDate(expirationDateObj);
        setStatus("active");

        // Save to Supabase
        const { error } = await supabase
          .from("license_keys")
          .update({
            activation_date: activationDateObj.toISOString(),
            expiration_date: expirationDateObj.toISOString(),
          })
          .eq("key", activationKey); // Assuming your table has a `key` column to identify the license

        if (error) {
          console.error("Failed to save activation info to Supabase:", error);
        }
      } else {
        const err = await response.json();
        console.error("Activation error:", err);
        setStatus("error");
      }
    } catch (error) {
      console.error("Activation failed:", error);
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
