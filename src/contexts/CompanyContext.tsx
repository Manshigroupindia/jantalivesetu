import React, { createContext, useContext, useEffect, useState } from 'react';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { CompanySettings } from '../types';
import { updateFavicon } from '../utils/favicon';

interface CompanyContextType {
  companySettings: CompanySettings | null;
  loading: boolean;
  error: string | null;
  refetchCompanySettings: () => Promise<CompanySettings | null>;
}

const DEFAULT_COMPANY_SETTINGS: CompanySettings = {
  companyName: 'Janta Live',
  logoUrl: '',
  headOfficeAddress: 'Regd By Govt of India Vide Reg No. U92190DL2021PTC386070, New Delhi, India',
  officeLocationName: 'Headquarters, New Delhi',
  latitude: 28.6139,
  longitude: 77.2090,
  googleMapsUrl: 'https://maps.google.com/?q=28.6139,77.2090',
  websiteUrl: 'https://jantalive.com',
  helplineNumber: '+91 98765 43210',
  phoneNumbers: ['+91 98765 43210', '+91 98765 43211'],
  emailAddresses: ['support@jantalive.com', 'contact@jantalive.com'],
  teaUnitPrice: 10,
  waterBottlePrice: 20,
  electricityUnitRate: 14,
  electricityPreviousReading: 1200,
  isSetupCompleted: false,
  setupCompleted: false,
  updatedAt: new Date().toISOString(),
};

const CompanyContext = createContext<CompanyContextType>({
  companySettings: null,
  loading: true,
  error: null,
  refetchCompanySettings: async () => null,
});

export const CompanyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const normalizeSettings = (data: any): CompanySettings => {
    const isCompleted = Boolean(
      data.setupCompleted === true ||
      data.isSetupCompleted === true ||
      (data.companyName && data.headOfficeAddress && data.setupCompleted !== false && data.isSetupCompleted !== false)
    );

    return {
      ...DEFAULT_COMPANY_SETTINGS,
      ...data,
      isSetupCompleted: isCompleted,
      setupCompleted: isCompleted,
    };
  };

  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, 'companySettings', 'default'),
      (snap) => {
        if (snap.exists()) {
          setCompanySettings(normalizeSettings(snap.data()));
        } else {
          setCompanySettings({
            ...DEFAULT_COMPANY_SETTINGS,
            isSetupCompleted: false,
            setupCompleted: false,
          });
        }
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching company settings:', err);
        setError('Failed to load company branding settings.');
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  // Dynamically update browser tab favicon whenever companySettings load or change
  useEffect(() => {
    updateFavicon(companySettings?.logoUrl, companySettings?.updatedAt);
  }, [companySettings?.logoUrl, companySettings?.updatedAt]);

  const refetchCompanySettings = async (): Promise<CompanySettings | null> => {
    try {
      const snap = await getDoc(doc(db, 'companySettings', 'default'));
      if (snap.exists()) {
        const normalized = normalizeSettings(snap.data());
        setCompanySettings(normalized);
        return normalized;
      }
    } catch (err) {
      console.error('Error refetching company settings:', err);
    }
    return null;
  };

  return (
    <CompanyContext.Provider value={{ companySettings, loading, error, refetchCompanySettings }}>
      {children}
    </CompanyContext.Provider>
  );
};

export const useCompany = () => useContext(CompanyContext);
