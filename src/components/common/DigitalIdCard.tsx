import React, { useState } from 'react';
import { StaffProfile, CompanySettings } from '../../types';
import { Shield, RotateCw, Printer, Mail, Phone, Globe, MapPin } from 'lucide-react';
import { Button } from '../ui/Button';

export interface DigitalIdCardProps {
  staff: StaffProfile;
  company: CompanySettings | null;
}

export const DigitalIdCard: React.FC<DigitalIdCardProps> = ({ staff, company }) => {
  const [showBack, setShowBack] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      {/* Controls */}
      <div className="flex items-center gap-2 print:hidden">
        <Button
          variant="outline"
          size="sm"
          icon={<RotateCw className="w-4 h-4" />}
          onClick={() => setShowBack(!showBack)}
        >
          {showBack ? 'View Front Side' : 'View Back Side'}
        </Button>
        <Button variant="secondary" size="sm" icon={<Printer className="w-4 h-4" />} onClick={handlePrint}>
          Print ID Card
        </Button>
      </div>

      {/* ID CARD CONTAINER */}
      <div className="w-[340px] h-[540px] rounded-2xl shadow-2xl bg-white border border-gray-200 overflow-hidden relative font-sans flex flex-col justify-between select-none">
        {!showBack ? (
          /* FRONT SIDE */
          <div className="flex flex-col h-full bg-gradient-to-b from-white to-gray-50">
            {/* RED HEADER */}
            <div className="bg-brand-600 text-white text-center py-2.5 px-3 border-b-4 border-brand-800 shadow-sm">
              <span className="text-xl font-black tracking-widest uppercase block drop-shadow-sm">PRESS</span>
              <span className="text-[9px] font-semibold tracking-tight text-brand-100 block leading-tight">
                Regd By Govt of India Vide Reg No. U92190DL2021PTC386070
              </span>
            </div>

            {/* BRAND SUB HEADER */}
            <div className="px-4 py-3 flex items-center justify-center gap-2 border-b border-gray-100 bg-white">
              {company?.logoUrl ? (
                <img src={company.logoUrl} alt="Logo" className="h-7 w-auto object-contain" />
              ) : (
                <div className="w-7 h-7 rounded-lg bg-brand-600 text-white font-black flex items-center justify-center text-sm shadow-sm">
                  JL
                </div>
              )}
              <span className="text-lg font-black text-gray-900 tracking-tight">
                {company?.companyName || 'Janta Live'}
              </span>
            </div>

            {/* STAFF PHOTO */}
            <div className="flex flex-col items-center justify-center pt-4 pb-2">
              <div className="relative">
                <div className="w-28 h-28 rounded-2xl overflow-hidden border-4 border-white shadow-md bg-gray-100">
                  <img
                    src={staff.photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300'}
                    alt={staff.fullName}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white p-1 rounded-full border-2 border-white shadow-sm">
                  <Shield className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>

            {/* DETAILS */}
            <div className="px-6 space-y-2 text-center flex-1 flex flex-col justify-center">
              <div>
                <h3 className="text-xl font-extrabold text-gray-900 leading-tight">{staff.fullName}</h3>
                <p className="text-xs font-bold text-brand-600 uppercase tracking-wider mt-0.5">{staff.designation}</p>
              </div>

              <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm text-left space-y-1.5 text-xs text-gray-700">
                <div className="flex justify-between">
                  <span className="font-medium text-gray-400 uppercase text-[10px]">Working Area:</span>
                  <span className="font-bold text-gray-800">{staff.workingArea}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-gray-400 uppercase text-[10px]">Mobile:</span>
                  <span className="font-bold text-gray-800">{staff.contactNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-gray-400 uppercase text-[10px]">Email:</span>
                  <span className="font-bold text-gray-800 truncate max-w-[170px]">{staff.email}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-gray-100">
                  <span className="font-medium text-gray-400 uppercase text-[10px]">Valid Upto:</span>
                  <span className="font-bold text-emerald-600">{staff.validUpto || '31 DEC 2028'}</span>
                </div>
              </div>
            </div>

            {/* CARD FOOTER */}
            <div className="bg-gray-900 text-white text-center py-2 px-4 flex justify-between items-center text-[10px] font-semibold">
              <span>AUTHORIZED MEDIA ID</span>
              <span className="font-mono tracking-wider text-brand-400">{staff.idNumber || 'JL-STAFF-2026-0001'}</span>
            </div>
          </div>
        ) : (
          /* BACK SIDE */
          <div className="flex flex-col h-full bg-gray-50 text-gray-800 p-4 justify-between">
            <div>
              {/* HEADER */}
              <div className="border-b border-gray-200 pb-2 mb-3">
                <p className="text-[11px] font-bold text-brand-600 uppercase tracking-wider">EMPLOYEE IDENTIFICATION</p>
                <p className="text-xs font-mono font-extrabold text-gray-900">ID NO: {staff.idNumber || 'JL-STAFF-2026-0001'}</p>
              </div>

              {/* INSTRUCTION POINTS */}
              <div className="space-y-2 text-[10.5px] text-gray-600">
                <p className="font-bold text-gray-900">TERMS & INSTRUCTIONS:</p>
                <ol className="list-decimal pl-3 space-y-1 leading-tight">
                  <li>This card is official property of Janta Live.</li>
                  <li>Cardholder is authorized for official reporting.</li>
                  <li>If found, return to Head Office address immediately.</li>
                  <li>Tampering with this ID card is punishable under law.</li>
                  <li>Card must be displayed during duty hours.</li>
                </ol>
              </div>
            </div>

            {/* HEAD OFFICE DETAILS */}
            <div className="bg-white rounded-xl p-3 border border-gray-200 shadow-sm space-y-1 text-[10px]">
              <p className="font-extrabold text-gray-900 uppercase tracking-wider text-[11px] border-b pb-1 mb-1">
                HEAD OFFICE DETAILS
              </p>
              <p className="flex items-start gap-1 text-gray-600">
                <MapPin className="w-3 h-3 text-brand-600 shrink-0 mt-0.5" />
                <span>{company?.headOfficeAddress || 'Regd By Govt of India Vide Reg No. U92190DL2021PTC386070, New Delhi'}</span>
              </p>
              <p className="flex items-center gap-1 text-gray-600">
                <Phone className="w-3 h-3 text-brand-600 shrink-0" />
                <span>{company?.helplineNumber || '+91 98765 43210'}</span>
              </p>
              <p className="flex items-center gap-1 text-gray-600">
                <Mail className="w-3 h-3 text-brand-600 shrink-0" />
                <span>{company?.emailAddresses?.[0] || 'support@jantalive.com'}</span>
              </p>
              <p className="flex items-center gap-1 text-gray-600">
                <Globe className="w-3 h-3 text-brand-600 shrink-0" />
                <span>{company?.websiteUrl || 'https://jantalive.com'}</span>
              </p>
            </div>

            <div className="text-center text-[9px] text-gray-400 font-semibold pt-1">
              Secure with Janta Live Setu
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
