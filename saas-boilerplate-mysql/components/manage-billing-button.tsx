"use client";

import { useState } from "react";

export function ManageBillingButton() {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    const res = await fetch("/api/stripe/portal", { method: "POST" });
    const data = await res.json();
    setLoading(false);

    if (data.url) {
      window.location.href = data.url;
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="border border-gray-200 px-5 py-2.5 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-60"
    >
      {loading ? "Redirecting…" : "Manage billing"}
    </button>
  );
}
