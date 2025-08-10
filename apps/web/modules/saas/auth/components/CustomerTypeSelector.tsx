'use client';

import { Card } from '@ui/components/card';
import { Badge } from '@ui/components/badge';
import { cn } from '@ui/lib';
import { 
  UserIcon, 
  BuildingIcon, 
  ShieldIcon, 
  HeartIcon,
  CheckCircleIcon
} from 'lucide-react';

export type CustomerType = 'RETAIL' | 'WHOLESALE' | 'PHARMACY' | 'CLINIC';

interface CustomerTypeOption {
  value: CustomerType;
  label: string;
  description: string;
  features: string[];
  icon: React.ComponentType<{ className?: string }>;
  priceNote: string;
  recommended?: boolean;
  verificationRequired?: boolean;
}

const customerTypeOptions: CustomerTypeOption[] = [
  {
    value: 'RETAIL',
    label: 'Individual Customer',
    description: 'For personal and family medication needs',
    features: [
      'Retail pricing',
      'Small quantity orders',
      'No business verification required',
      'Personal delivery'
    ],
    icon: UserIcon,
    priceNote: 'Standard retail prices',
    recommended: true
  },
  {
    value: 'WHOLESALE',
    label: 'Wholesale Distributor',
    description: 'For businesses buying in bulk quantities',
    features: [
      'Wholesale pricing (up to 25% savings)',
      'Bulk order quantities',
      'Credit terms available',
      'Business invoice generation'
    ],
    icon: BuildingIcon,
    priceNote: 'Wholesale rates, minimum orders apply',
    verificationRequired: true
  },
  {
    value: 'PHARMACY',
    label: 'Pharmacy/Chemist',
    description: 'Licensed pharmacies and patent medicine stores',
    features: [
      'Pharmacy-specific pricing',
      'Prescription medication access',
      'Professional support',
      'Pharmacy license verification'
    ],
    icon: ShieldIcon,
    priceNote: 'Professional pharmacy rates',
    verificationRequired: true
  },
  {
    value: 'CLINIC',
    label: 'Medical Clinic/Hospital',
    description: 'Healthcare facilities and medical practices',
    features: [
      'Healthcare institution pricing',
      'Direct supply arrangements',
      'Priority order processing',
      'Medical facility verification'
    ],
    icon: HeartIcon,
    priceNote: 'Healthcare facility rates',
    verificationRequired: true
  }
];

interface CustomerTypeSelectorProps {
  value?: CustomerType;
  onChange: (type: CustomerType) => void;
  className?: string;
}

export function CustomerTypeSelector({ 
  value, 
  onChange, 
  className 
}: CustomerTypeSelectorProps) {
  return (
    <div className={cn('space-y-4', className)}>
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Choose Your Customer Type</h3>
        <p className="text-sm text-gray-600 mt-1">
          Select the option that best describes your business or needs for proper pricing and verification.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {customerTypeOptions.map((option) => {
          const Icon = option.icon;
          const isSelected = value === option.value;
          
          return (
            <Card
              key={option.value}
              className={cn(
                'relative cursor-pointer border-2 p-4 transition-all duration-200 hover:shadow-lg',
                isSelected 
                  ? 'border-primary bg-primary/5 shadow-md' 
                  : 'border-gray-200 hover:border-gray-300'
              )}
              onClick={() => onChange(option.value)}
            >
              {/* Selected indicator */}
              {isSelected && (
                <div className="absolute -top-2 -right-2 bg-primary text-white rounded-full p-1">
                  <CheckCircleIcon className="size-4" />
                </div>
              )}
              
              {/* Recommended badge */}
              {option.recommended && (
                <Badge 
                  variant="secondary" 
                  className="absolute top-2 right-2 text-xs bg-green-100 text-green-800"
                >
                  Recommended
                </Badge>
              )}
              
              {/* Header */}
              <div className="flex items-start space-x-3 mb-3">
                <div className={cn(
                  'p-2 rounded-lg',
                  isSelected ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700'
                )}>
                  <Icon className="size-6" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">{option.label}</h4>
                  <p className="text-sm text-gray-600 mt-1">{option.description}</p>
                </div>
              </div>
              
              {/* Features */}
              <ul className="space-y-1 mb-4">
                {option.features.map((feature, index) => (
                  <li key={index} className="flex items-center text-sm text-gray-700">
                    <CheckCircleIcon className="size-3 text-green-500 mr-2 flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
              
              {/* Price note */}
              <div className="pt-3 border-t border-gray-200">
                <p className="text-xs text-gray-600 font-medium">{option.priceNote}</p>
                {option.verificationRequired && (
                  <p className="text-xs text-amber-600 mt-1">
                    <ShieldIcon className="inline size-3 mr-1" />
                    Business verification required
                  </p>
                )}
              </div>
            </Card>
          );
        })}
      </div>
      
      {/* Information notice */}
      {value && customerTypeOptions.find(opt => opt.value === value)?.verificationRequired && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start space-x-2">
            <ShieldIcon className="size-5 text-blue-600 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-blue-900">Verification Required</p>
              <p className="text-blue-700">
                You'll need to provide business documentation for verification before accessing 
                wholesale pricing and features. This process typically takes 1-2 business days.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
