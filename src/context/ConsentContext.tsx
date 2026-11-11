"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

interface ConsentContextType {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
  preferences: boolean;
  updateConsent: (consent: { analytics?: boolean; marketing?: boolean; preferences?: boolean }) => void;
  hasConsented: boolean;
}

const ConsentContext = createContext<ConsentContextType | undefined>(undefined);

export function ConsentProvider({ children }: { children: ReactNode }) {
  const [consent, setConsent] = useState({
    necessary: true,
    analytics: false,
    marketing: false,
    preferences: false,
  });
  const [hasConsented, setHasConsented] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("cookie-consent");
    if (stored) {
      setConsent(JSON.parse(stored));
      setHasConsented(true);
    }
  }, []);

  const updateConsent = (newConsent: { analytics?: boolean; marketing?: boolean; preferences?: boolean }) => {
    const updated = { ...consent, ...newConsent, necessary: true };
    setConsent(updated);
    setHasConsented(true);
    localStorage.setItem("cookie-consent", JSON.stringify(updated));

    fetch("/api/consent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated),
    });
  };

  return (
    <ConsentContext.Provider value={{ ...consent, updateConsent, hasConsented }}>
      {children}
    </ConsentContext.Provider>
  );
}

export function useConsent() {
  const context = useContext(ConsentContext);
  if (context === undefined) {
    throw new Error("useConsent must be used within a ConsentProvider");
  }
  return context;
}
