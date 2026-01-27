"use client";

import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from "react";
import { AppConfig, UserSession, showConnect, UserData } from "@stacks/connect";

interface StacksAuthContextType {
  isConnected: boolean;
  userData: UserData | null;
  stxAddress: string | null;
  connect: () => void;
  disconnect: () => void;
}

const appConfig = new AppConfig(["store_write", "publish_data"]);
const userSession = new UserSession({ appConfig });

const StacksAuthContext = createContext<StacksAuthContextType | undefined>(undefined);

export function StacksAuthProvider({ children }: { children: ReactNode }) {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const safeIsUserSignedIn = () => {
      try {
        return userSession.isUserSignedIn();
      } catch (error) {
        console.warn("Stacks auth session data invalid. Clearing session.", error);
        userSession.signUserOut();
        return false;
      }
    };

    const safeLoadUserData = () => {
      try {
        return userSession.loadUserData();
      } catch (error) {
        console.warn("Failed to load Stacks user data. Clearing session.", error);
        userSession.signUserOut();
        return null;
      }
    };

    if (userSession.isSignInPending()) {
      userSession
        .handlePendingSignIn()
        .then((userData) => {
          setUserData(userData);
          setIsConnected(true);
        })
        .catch((error) => {
          console.warn("Failed to complete Stacks sign-in. Clearing session.", error);
          userSession.signUserOut();
        });
    } else if (safeIsUserSignedIn()) {
      const loadedUserData = safeLoadUserData();
      if (loadedUserData) {
        setUserData(loadedUserData);
        setIsConnected(true);
      }
    }
  }, []);

  const connect = useCallback(() => {
    showConnect({
      appDetails: {
        name: "STX Prediction Market",
        icon: window.location.origin + "/bitcoin-logo.svg",
      },
      redirectTo: "/",
      onFinish: () => {
        try {
          const userData = userSession.loadUserData();
          setUserData(userData);
          setIsConnected(true);
        } catch (error) {
          console.warn("Failed to load Stacks user data after connect.", error);
          userSession.signUserOut();
        }
      },
      userSession,
    });
  }, []);

  const disconnect = useCallback(() => {
    userSession.signUserOut();
    setUserData(null);
    setIsConnected(false);
  }, []);

  const stxAddress = userData?.profile?.stxAddress?.mainnet || 
                     userData?.profile?.stxAddress?.testnet || 
                     null;

  return (
    <StacksAuthContext.Provider
      value={{
        isConnected,
        userData,
        stxAddress,
        connect,
        disconnect,
      }}
    >
      {children}
    </StacksAuthContext.Provider>
  );
}

export function useStacksAuth() {
  const context = useContext(StacksAuthContext);
  if (context === undefined) {
    throw new Error("useStacksAuth must be used within a StacksAuthProvider");
  }
  return context;
}
