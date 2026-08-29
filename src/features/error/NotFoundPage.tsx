import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutGrid, ArrowLeft, AlertCircle } from 'lucide-react';
import { Button } from '../../components/ui/Button';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4 sm:p-6 select-none">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Brand Badge Icon */}
        <div className="mx-auto w-20 h-20 rounded-3xl bg-brand-50 border border-brand-100 flex items-center justify-center shadow-lg transform hover:scale-105 transition-transform">
          <AlertCircle className="w-10 h-10 text-brand-600" />
        </div>

        {/* Large 404 Display */}
        <div className="space-y-2">
          <span className="text-7xl font-black tracking-tight text-brand-600 font-mono block">
            404
          </span>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">
            Page Not Found
          </h1>
          <p className="text-sm font-medium text-gray-500 max-w-sm mx-auto leading-relaxed">
            The page you're looking for doesn't exist or may have been moved.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
          <Button
            variant="secondary"
            onClick={() => navigate(-1)}
            className="w-full sm:w-auto flex items-center justify-center gap-2 border-gray-200 text-gray-700 hover:bg-gray-50"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </Button>

          <Button
            variant="primary"
            onClick={() => navigate('/dashboard')}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white shadow-md hover:shadow-lg"
          >
            <LayoutGrid className="w-4 h-4" />
            Go to Dashboard
          </Button>
        </div>

        {/* Footer Brand Verification */}
        <div className="pt-8 border-t border-gray-100">
          <p className="text-xs font-semibold text-gray-400 tracking-wider uppercase">
            Janta Live Setu CMS Platform
          </p>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;
