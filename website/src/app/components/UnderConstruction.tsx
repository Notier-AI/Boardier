"use client";

import { useState, useEffect } from "react";
import { PenTool, Construction, KeyRound } from "lucide-react";

const ADMIN_CODE = "33458";
const STORAGE_KEY = "boardier-construction-bypass";

export default function UnderConstruction({ children }: { children: React.ReactNode }) {
  const [bypassed, setBypassed] = useState<boolean | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    setBypassed(sessionStorage.getItem(STORAGE_KEY) === "true");
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code === ADMIN_CODE) {
      sessionStorage.setItem(STORAGE_KEY, "true");
      setBypassed(true);
    } else {
      setError(true);
      setTimeout(() => setError(false), 1500);
    }
  };

  // Still loading from sessionStorage
  if (bypassed === null) return null;

  if (bypassed) return <>{children}</>;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center font-kalam bg-root-bg text-root-fg p-6">
      <div className="sketch-card max-w-md w-full p-8 text-center">
        <div className="flex justify-center mb-4">
          <div className="sketch-border p-3 bg-brand-yellow text-root-fg animate-wiggle">
            <PenTool size={32} />
          </div>
        </div>
        <h1 className="text-4xl font-bold font-caveat mb-2">Boardier</h1>

        <div className="flex items-center justify-center gap-2 text-brand-red mb-4">
          <Construction size={20} />
          <span className="text-lg font-semibold">Under Construction</span>
          <Construction size={20} />
        </div>

        <p className="text-root-fg/70 mb-6 leading-relaxed">
          We&apos;re working hard to get this site ready. Check back soon!
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex items-center gap-2 sketch-border px-3 py-2 bg-card-bg">
            <KeyRound size={16} className="text-root-fg/50 shrink-0" />
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Enter admin code"
              className="w-full bg-transparent outline-none font-kalam text-root-fg placeholder:text-root-fg/40"
            />
          </div>
          <button
            type="submit"
            className="sketch-button !bg-brand-green text-white py-2 px-4 hover:!bg-[#00b548] font-semibold"
          >
            Enter Site
          </button>
          {error && (
            <p className="text-brand-red text-sm animate-wiggle">Incorrect code. Try again.</p>
          )}
        </form>
      </div>
    </div>
  );
}
