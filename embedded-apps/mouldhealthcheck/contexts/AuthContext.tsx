import React, { createContext, useContext, useState } from "react";

type UserType = {
  Email: string;
  vendorCode: string;
  vendorName: string;
  matnr: string;
  email: string;
  Vendor: string;
  Role?: string;
};

type AuthContextType = {
  user: UserType | null;
  setUser: (user: UserType | null) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  setUser: () => {},
  logout: () => {},
});

export const AuthProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [user, setUser] = useState<UserType | null>(null);

  const logout = () => setUser(null);

  return (
    <AuthContext.Provider value={{ user, setUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);