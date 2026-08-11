import React, { useState, useEffect } from 'react';
import { Search, X, Globe, Mail, Server, Share2, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { fetchAllWebsites } from '../../firebase/services/websiteService';
import { fetchGmailAccounts } from '../../firebase/services/gmailService';
import { fetchPlatformAccounts } from '../../firebase/services/platformService';
import { fetchSocialAccounts } from '../../firebase/services/socialService';
import { WebsiteClientData, GmailAccount, PlatformAccount, SocialAccount } from '../../types';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);

  const [websites, setWebsites] = useState<WebsiteClientData[]>([]);
  const [gmails, setGmails] = useState<GmailAccount[]>([]);
  const [platforms, setPlatforms] = useState<PlatformAccount[]>([]);
  const [socials, setSocials] = useState<SocialAccount[]>([]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [w, g, p, s] = await Promise.all([
        fetchAllWebsites(),
        fetchGmailAccounts(),
        fetchPlatformAccounts(),
        fetchSocialAccounts(),
      ]);
      setWebsites(w);
      setGmails(g);
      setPlatforms(p);
      setSocials(s);
    } catch (err) {
      console.error('Failed to load global search data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const term = query.toLowerCase().trim();

  const matchingWebsites = term
    ? websites.filter(
        item =>
          item.clientName?.toLowerCase().includes(term) ||
          item.websiteName?.toLowerCase().includes(term) ||
          item.domain?.toLowerCase().includes(term) ||
          item.emailId?.toLowerCase().includes(term)
      ).slice(0, 5)
    : [];

  const matchingGmails = term
    ? gmails.filter(
        item =>
          item.accountName?.toLowerCase().includes(term) ||
          item.gmailAddress?.toLowerCase().includes(term) ||
          item.ownerClient?.toLowerCase().includes(term)
      ).slice(0, 5)
    : [];

  const matchingPlatforms = term
    ? platforms.filter(
        item =>
          item.platformName?.toLowerCase().includes(term) ||
          item.platformType?.toLowerCase().includes(term) ||
          item.loginId?.toLowerCase().includes(term)
      ).slice(0, 5)
    : [];

  const matchingSocials = term
    ? socials.filter(
        item =>
          item.accountName?.toLowerCase().includes(term) ||
          item.usernameEmail?.toLowerCase().includes(term) ||
          item.platform?.toLowerCase().includes(term) ||
          item.ownerClient?.toLowerCase().includes(term)
      ).slice(0, 5)
    : [];

  const totalMatches =
    matchingWebsites.length + matchingGmails.length + matchingPlatforms.length + matchingSocials.length;

  const handleSelect = (path: string) => {
    onClose();
    navigate(path);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/60 backdrop-blur-xs pt-16 px-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[80vh]">
        {/* Search Input Top Bar */}
        <div className="p-4 border-b border-slate-200 flex items-center space-x-3 bg-slate-50">
          <Search className="w-5 h-5 text-brand-600 flex-shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search clients, websites, domains, Gmails, platforms, social media..."
            className="w-full bg-transparent text-sm focus:outline-none text-slate-900 placeholder:text-slate-400 font-medium"
            autoFocus
          />
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Results Container */}
        <div className="p-4 overflow-y-auto space-y-6 flex-grow">
          {loading && <p className="text-xs text-slate-400 text-center py-4">Searching database...</p>}

          {!query.trim() && !loading && (
            <div className="py-8 text-center text-slate-400 text-xs">
              Type any client name, domain, email, hosting platform, or social media account to instantly search.
            </div>
          )}

          {query.trim() && totalMatches === 0 && !loading && (
            <div className="py-8 text-center text-slate-500 text-xs">
              No matching records found for "{query}".
            </div>
          )}

          {/* Website & Domain Results */}
          {matchingWebsites.length > 0 && (
            <div>
              <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                <Globe className="w-3.5 h-3.5 text-brand-600" />
                <span>Websites & Clients ({matchingWebsites.length})</span>
              </div>
              <div className="space-y-1.5">
                {matchingWebsites.map(item => (
                  <div
                    key={item.id}
                    onClick={() => handleSelect(`/websites/${item.id}`)}
                    className="p-2.5 bg-slate-50 hover:bg-brand-50 border border-slate-200 hover:border-brand-300 rounded-lg cursor-pointer transition-colors flex items-center justify-between group"
                  >
                    <div>
                      <div className="font-semibold text-xs text-slate-900 group-hover:text-brand-700">
                        {item.clientName} — <span className="font-normal text-slate-600">{item.websiteName}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">{item.domain}</div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-brand-600" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Gmail Results */}
          {matchingGmails.length > 0 && (
            <div>
              <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                <Mail className="w-3.5 h-3.5 text-rose-600" />
                <span>Gmail Accounts ({matchingGmails.length})</span>
              </div>
              <div className="space-y-1.5">
                {matchingGmails.map(item => (
                  <div
                    key={item.id}
                    onClick={() => handleSelect('/gmail')}
                    className="p-2.5 bg-slate-50 hover:bg-rose-50 border border-slate-200 hover:border-rose-300 rounded-lg cursor-pointer transition-colors flex items-center justify-between group"
                  >
                    <div>
                      <div className="font-semibold text-xs text-slate-900 group-hover:text-rose-700">{item.accountName}</div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">{item.gmailAddress}</div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-rose-600" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Hosting & Platform Results */}
          {matchingPlatforms.length > 0 && (
            <div>
              <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                <Server className="w-3.5 h-3.5 text-indigo-600" />
                <span>Hosting & Platforms ({matchingPlatforms.length})</span>
              </div>
              <div className="space-y-1.5">
                {matchingPlatforms.map(item => (
                  <div
                    key={item.id}
                    onClick={() => handleSelect('/platforms')}
                    className="p-2.5 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 rounded-lg cursor-pointer transition-colors flex items-center justify-between group"
                  >
                    <div>
                      <div className="font-semibold text-xs text-slate-900 group-hover:text-indigo-700">{item.platformName} ({item.platformType})</div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">{item.loginId}</div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Social Accounts Results */}
          {matchingSocials.length > 0 && (
            <div>
              <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                <Share2 className="w-3.5 h-3.5 text-sky-600" />
                <span>Social Media ({matchingSocials.length})</span>
              </div>
              <div className="space-y-1.5">
                {matchingSocials.map(item => (
                  <div
                    key={item.id}
                    onClick={() => handleSelect('/social')}
                    className="p-2.5 bg-slate-50 hover:bg-sky-50 border border-slate-200 hover:border-sky-300 rounded-lg cursor-pointer transition-colors flex items-center justify-between group"
                  >
                    <div>
                      <div className="font-semibold text-xs text-slate-900 group-hover:text-sky-700">{item.accountName} ({item.platform})</div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">{item.usernameEmail}</div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-sky-600" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
