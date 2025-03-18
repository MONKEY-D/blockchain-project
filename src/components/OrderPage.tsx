"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { createClient } from "../../utils/supabase/client";

const supabase = createClient();

export default function OrderPage() {
  const [orderId, setOrderId] = useState<string | null>(null);
  const [expiryTimestamp, setExpiryTimestamp] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState({
    hours: 0,
    minutes: 0,
    seconds: 0,
  });
  const [progress, setProgress] = useState(0);

  // Fetch order details
  useEffect(() => {
    const fetchOrderDetails = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data?.user) return;

      const { data: userData, error: userError } = await supabase
        .from("user_profiles")
        .select("license_key, activation_date, expiration_date")
        .eq("id", data.user.id)
        .single();

      if (userError || !userData) return;

      setOrderId(`#R${Math.floor(Math.random() * 10000000000)}`); // Dummy Order ID
      setExpiryTimestamp(new Date(userData.expiration_date).getTime());
    };

    fetchOrderDetails();
  }, []);

  // Countdown timer logic
  useEffect(() => {
    if (!expiryTimestamp) return;

    const updateTimer = () => {
      const now = new Date().getTime();
      const remainingTime = expiryTimestamp - now;

      if (remainingTime <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
        setProgress(100);
        return;
      }

      const hours = Math.floor((remainingTime / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((remainingTime / (1000 * 60)) % 60);
      const seconds = Math.floor((remainingTime / 1000) % 60);

      setTimeLeft({ hours, minutes, seconds });

      // Progress calculation (from activation to expiration)
      const totalDuration =
        expiryTimestamp - (expiryTimestamp - 365 * 24 * 60 * 60 * 1000);
      const elapsedTime = totalDuration - remainingTime;
      setProgress((elapsedTime / totalDuration) * 100);
    };

    const timer = setInterval(updateTimer, 1000);
    return () => clearInterval(timer);
  }, [expiryTimestamp]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white p-6">
      <div className="bg-gray-800 p-6 rounded-xl shadow-lg w-full max-w-lg">
        {/* Order ID */}
        <h1 className="text-2xl font-bold">
          Orders /{" "}
          <span className="text-blue-400">{orderId || "Loading..."}</span>
        </h1>

        {/* Payment Status */}
        <p className="text-green-500 text-lg mt-2">✅ Paid</p>

        {/* Countdown Timer */}
        <div className="mt-6">
          <h2 className="text-lg font-semibold">Validity</h2>
          <div className="text-4xl font-bold mt-2">
            {timeLeft.hours.toString().padStart(2, "0")}:
            {timeLeft.minutes.toString().padStart(2, "0")}:
            {timeLeft.seconds.toString().padStart(2, "0")}
          </div>
        </div>

        {/* Filling Animation */}
        <div className="w-full h-3 mt-4 bg-gray-700 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-blue-500"
            initial={{ width: "0%" }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 1, ease: "linear" }}
          />
        </div>
      </div>
    </div>
  );
}
