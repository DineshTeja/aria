"use client";
import { Person } from "@/lib/types/person";
import {
  createClient,
  AnamClient,
  unsafe_createClientWithApiKey,
} from "@anam-ai/js-sdk";
import { createContext, useContext, useState, useCallback } from "react";

const PERSONA_ID = process.env.NEXT_PUBLIC_PERSONA_ID;
// const DISABLE_BRAINS = process.env.NEXT_PUBLIC_DISABLE_BRAINS === 'true';
const DISABLE_BRAINS = true;
const DISABLE_FILLER_PHRASES =
  process.env.NEXT_PUBLIC_DISABLE_FILLER_PHRASES === "true";

interface AnamContextDetails {
  anamClient: AnamClient;
  sessionToken: string | undefined;
  apiKey: string | undefined;
  reset: () => void;
}

const AnamContext = createContext<AnamContextDetails>({
  anamClient: createClient("dummy", {
    personaId: PERSONA_ID!,
    disableBrains: DISABLE_BRAINS,
    disableFillerPhrases: DISABLE_FILLER_PHRASES,
  }),
  sessionToken: undefined,
  apiKey: undefined,
  reset: () => {},
});

type AnamContextProviderProps = {
  children: React.ReactNode;
  apiKey?: string;
  sessionToken?: string;
  person?: Person;
};

export const AnamContextProvider = ({
  children,
  apiKey,
  sessionToken,
}: AnamContextProviderProps) => {
  const createAnamClient = useCallback(() => {
    if (sessionToken) {
      console.log("Created client with session token");
      return createClient(sessionToken, {
        personaId: PERSONA_ID!,
        disableBrains: DISABLE_BRAINS,
        disableFillerPhrases: DISABLE_FILLER_PHRASES,
      });
    } else if (apiKey) {
      console.log("Created client with API key");
      return unsafe_createClientWithApiKey(apiKey, {
        personaId: PERSONA_ID!,
        disableBrains: DISABLE_BRAINS,
        disableFillerPhrases: DISABLE_FILLER_PHRASES,
      });
    } else {
      console.error("Anam Provider: No session token or API key provided");
      return createClient("dummy", {
        personaId: PERSONA_ID!,
        disableBrains: DISABLE_BRAINS,
        disableFillerPhrases: DISABLE_FILLER_PHRASES,
      });
    }
  }, [apiKey, sessionToken]);

  const [anamClient, setAnamClient] = useState(createAnamClient());

  const reset = useCallback(() => {
    setAnamClient(createAnamClient());
  }, [createAnamClient]);

  return (
    <AnamContext.Provider value={{ anamClient, sessionToken, apiKey, reset }}>
      {children}
    </AnamContext.Provider>
  );
};

export const useAnam = () => {
  const context = useContext(AnamContext);
  if (!context) {
    throw new Error("useAnam must be used within an AnamProvider");
  }
  return context;
};
