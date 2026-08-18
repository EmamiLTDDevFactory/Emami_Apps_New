import React, { createContext, useState } from 'react';

export const FormContext = createContext<any>(null);

export const FormProvider = ({ children }: { children: React.ReactNode }) => {
  // Global payload structure
  const [header, setHeader] = useState({ Lifnr: "100000", Name1: "Inspector Name" });
  const [items, setItems] = useState<any[]>([]);

  // Function to overwrite/initiate items (used when screen loads)
  const setAllItems = (newItems: any[]) => setItems(newItems);

  // Function to update a specific item (used when user changes data)
  const updateItem = (id: string, updatedFields: any) => {
    setItems((prev) => 
      prev.map((item) => (item.id === id ? { ...item, ...updatedFields } : item))
    );
  };

  return (
    <FormContext.Provider value={{ header, items, setAllItems, updateItem, setHeader }}>
      {children}
    </FormContext.Provider>
  );
};