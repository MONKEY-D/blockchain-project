"use client";

import { useEffect, useState } from "react";
import { createClient } from "../../../utils/supabase/client";
import { useRouter } from "next/navigation";

const supabase = createClient();

export default function LicensePage() {
  const [license, setLicense] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0); // Set initial value to 0
  const [isClient, setIsClient] = useState(false); // Fix hydration error
  const router = useRouter();

  useEffect(() => {
    setIsClient(true);
    fetchUserAndLicense();
  }, []);

  const fetchUserAndLicense = async () => {
    setLoading(true);

    // ✅ Step 1: Get the logged-in user
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData?.user) {
      console.error("User not authenticated:", authError);
      router.push("/login");
      return;
    }

    const userId = authData.user.id;
    setUserId(userId);

    // ✅ Step 2: Fetch the active license from `license_keys`
    const { data: licenseData, error: licenseError } = await supabase
      .from("license_keys")
      .select("*")
      .eq("user_id", userId)
      .order("activation_date", { ascending: false })
      .limit(1)
      .single();

    console.log("Fetched License Data:", licenseData, licenseError);

    if (licenseError || !licenseData) {
      console.warn("No active license found.");
    } else {
      setLicense(licenseData);
      if (licenseData.expiration_date) {
        updateTimeLeft(new Date(licenseData.expiration_date).getTime());
      }
    }

    setLoading(false);
  };

  const updateTimeLeft = (expiryTime: number | null) => {
    if (!expiryTime) return; // ✅ Only update if expiry time is valid
    const now = new Date().getTime();
    const timeRemaining = expiryTime - now;
    setTimeLeft(timeRemaining > 0 ? timeRemaining : 0);
  };

  useEffect(() => {
    if (timeLeft === 0) return; // ✅ Avoid running interval if no time left

    const interval = setInterval(() => {
      setTimeLeft((prevTime) => Math.max(prevTime - 1000, 0)); // ✅ Prevent negative values
    }, 1000);

    return () => clearInterval(interval);
  }, [timeLeft]);

  const formatTime = (milliseconds: number) => {
    if (milliseconds <= 0) return "0h 0m 0s"; // ✅ Handle negative/zero time
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours}h ${minutes}m ${seconds}s`;
  };

  const getProgress = () => {
    if (!license) return 0;
    const startTime = new Date(license.activation_date).getTime();
    const endTime = new Date(license.expiration_date).getTime();
    const now = new Date().getTime();
    return Math.min(((now - startTime) / (endTime - startTime)) * 100, 100);
  };

  if (!isClient) return null; // ✅ Prevent hydration mismatch

  return (
    <div className="container mx-auto p-6 text-center">
      <h1 className="text-3xl font-bold mb-6 font-mono">Your License Status</h1>

      {loading ? (
        <p className="text-center mt-10">Loading...</p>
      ) : license ? (
        <>
          {/* Active License Info */}
          <div className="p-6 border rounded-md bg-green-100 dark:bg-green-900 text-black dark:text-white">
            <p className="text-lg font-semibold">
              <strong>License Key:</strong> {license.license_key}
            </p>
            <p className="text-lg font-semibold mt-2">
              <strong>Order ID:</strong> {license.order_id}
            </p>
            <p
              className={`text-xl font-bold mt-2 ${
                getProgress() >= 100
                  ? "text-red-700 dark:text-red-300"
                  : "text-green-700 dark:text-green-300"
              }`}
            >
              {getProgress() >= 100
                ? "❌ License Deactivated"
                : "✅ Active License"}
            </p>
          </div>

          {/* Countdown Timer */}
          <div className="mt-8 p-6 border rounded-md bg-gray-200 dark:bg-gray-800 text-black dark:text-white">
            <h2 className="text-2xl font-semibold">⏳ Time Remaining</h2>
            <p className="text-3xl font-bold mt-2">{formatTime(timeLeft)}</p>
          </div>

          {/* Progress Bar */}
          <div className="mt-8">
            <div className="relative w-full h-6 bg-gray-300 dark:bg-gray-700 rounded-full shadow-inner overflow-hidden">
              <div
                className="absolute top-0 left-0 h-full flex items-center justify-center text-xs font-bold text-white transition-all duration-1000"
                style={{
                  width: `${getProgress()}%`,
                  background: `linear-gradient(90deg, #34d399, #10b981)`, // Smooth green gradient
                  borderRadius: "9999px",
                }}
              >
                {getProgress().toFixed(1)}%
              </div>
            </div>
          </div>
        </>
      ) : (
        <p>No active licenses found.</p>
      )}
    </div>
  );
}
