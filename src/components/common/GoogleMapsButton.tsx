import React from 'react';
import { MapPin, ExternalLink } from 'lucide-react';
import { Button } from '../ui/Button';

export interface GoogleMapsButtonProps {
  latitude: number;
  longitude: number;
  label?: string;
  size?: 'sm' | 'md';
}

export const GoogleMapsButton: React.FC<GoogleMapsButtonProps> = ({
  latitude,
  longitude,
  label = 'View on Google Maps',
  size = 'sm',
}) => {
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;

  return (
    <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="inline-block">
      <Button
        type="button"
        variant="outline"
        size={size}
        icon={<MapPin className="w-3.5 h-3.5 text-brand-600" />}
      >
        <span>{label}</span>
        <ExternalLink className="w-3 h-3 text-gray-400 ml-0.5" />
      </Button>
    </a>
  );
};
