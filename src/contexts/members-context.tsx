"use client";

import { createContext, useContext, useEffect, useState } from "react";

interface MembersConfig {
  member1: string;
  member2: string;
}

interface MembersContextValue extends MembersConfig {
  setMember1: (name: string) => void;
  setMember2: (name: string) => void;
}

const MembersContext = createContext<MembersContextValue>({
  member1: "찬영",
  member2: "연주",
  setMember1: () => {},
  setMember2: () => {},
});

export function MembersProvider({ children }: { children: React.ReactNode }) {
  const [member1, setMember1State] = useState("찬영");
  const [member2, setMember2State] = useState("연주");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("members-config");
      if (saved) {
        const config = JSON.parse(saved) as MembersConfig;
        if (config.member1) setMember1State(config.member1);
        if (config.member2) setMember2State(config.member2);
      }
    } catch {}
  }, []);

  const setMember1 = (name: string) => {
    setMember1State(name);
    try {
      const saved = localStorage.getItem("members-config");
      const config = saved ? (JSON.parse(saved) as MembersConfig) : {};
      localStorage.setItem("members-config", JSON.stringify({ ...config, member1: name }));
    } catch {}
  };

  const setMember2 = (name: string) => {
    setMember2State(name);
    try {
      const saved = localStorage.getItem("members-config");
      const config = saved ? (JSON.parse(saved) as MembersConfig) : {};
      localStorage.setItem("members-config", JSON.stringify({ ...config, member2: name }));
    } catch {}
  };

  return (
    <MembersContext.Provider value={{ member1, member2, setMember1, setMember2 }}>
      {children}
    </MembersContext.Provider>
  );
}

export function useMembers(): MembersContextValue {
  return useContext(MembersContext);
}
