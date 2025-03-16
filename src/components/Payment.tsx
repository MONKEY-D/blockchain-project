"use client";

import { useState, useEffect } from "react";
import { Button } from "./ui/button";

declare global {
  interface Window {
    Razorpay: any;
  }
}

export const PaymentButton = () => {
  const AMOUNT = 100;
  const [isProcessing, setIsProcessing] = useState(false);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);

  useEffect(() => {
    // Ensure Razorpay script is loaded
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => setRazorpayLoaded(true);
    document.body.appendChild(script);
  }, []);

  const handlePayment = async () => {
    if (!razorpayLoaded) {
      alert("Razorpay SDK not loaded. Please wait.");
      return;
    }

    setIsProcessing(true);

    try {
      const response = await fetch("/api/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: AMOUNT }),
      });

      if (!response.ok) throw new Error("Failed to create order");

      const data = await response.json();

      if (!window.Razorpay) {
        throw new Error("Razorpay SDK failed to load");
      }

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: AMOUNT * 100,
        currency: "INR",
        name: "Blockchain Project",
        description: "Test Transaction",
        order_id: data.id, // Corrected from `data.orderId`
        handler: function (response: any) {
          console.log("Payment Successful", response);
        },
        prefill: {
          name: "Kartik Verma",
          email: "kartikverma88272@gmail.com",
          contact: "9516950830",
        },
        theme: {
          color: "#3399cc",
        },
      };

      const rzp1 = new window.Razorpay(options);
      rzp1.open();
    } catch (error) {
      console.error("Payment failed", error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <div className="p-6 bg-white rounded-lg shadow-md">
        <h1 className="text-3xl font-bold mb-4">Payment Page</h1>
        <p>Amount to pay: {AMOUNT} INR</p>
        <Button
          onClick={handlePayment}
          disabled={isProcessing || !razorpayLoaded}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {isProcessing ? "Processing..." : "Pay Now"}
        </Button>
      </div>
    </div>
  );
};

export default PaymentButton;
