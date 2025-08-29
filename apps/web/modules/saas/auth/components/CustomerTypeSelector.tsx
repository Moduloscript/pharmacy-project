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
    <div className={cn('space-y-6', className)}>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 md:gap-8">
        {customerTypeOptions.map((option) => {
          const Icon = option.icon;
          const isSelected = value === option.value;
          
          return (
            <Card
              key={option.value}
              className={cn(
                'relative cursor-pointer border-2 p-6 md:p-8 transition-shadow duration-300 hover:shadow-lg min-h-[360px] h-full flex flex-col',
                isSelected 
                  ? 'border-primary bg-primary/10 shadow-lg ring-2 ring-primary/20' 
                  : 'border-muted-foreground/20 hover:border-primary/50 hover:bg-muted/20'
              )}
              onClick={() => onChange(option.value)}
            >
              {/* Selected indicator */}
              {isSelected && (
                <div className="absolute -top-3 -right-3 bg-primary text-white rounded-full p-1.5 shadow-lg">
                  <CheckCircleIcon className="size-5" />
                </div>
              )}
              
              {/* Recommended badge */}
              {option.recommended && (
                <Badge 
                  className="absolute top-3 right-3 text-xs bg-green-500 text-white border-0 shadow-sm"
                >
                  Recommended
                </Badge>
              )}
              
              {/* Header */}
              <div className="flex flex-col items-center text-center mb-6">
                <div className={cn(
                  'p-4 rounded-full mb-4 transition-all duration-200',
                  isSelected ? 'bg-primary text-white shadow-lg' : 'bg-muted text-muted-foreground'
                )}>
                  <Icon className="size-8" />
                </div>
                <div>
                  <h4 className="font-semibold text-foreground text-lg mb-1">{option.label}</h4>
                  <p className="text-sm text-muted-foreground">{option.description}</p>
                </div>
              </div>
              
              {/* Features */}
              <ul className="space-y-2 mb-6 flex-1">
                {option.features.map((feature, index) => (
                  <li key={index} className="flex items-start text-sm text-muted-foreground">
                    <CheckCircleIcon className="size-4 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{feature}</span>
                  </li>
                ))}
              </ul>
              
              {/* Price note */}
              <div className="mt-auto pt-4 border-t border-border/50">
                <p className="text-sm text-foreground font-medium mb-1">{option.priceNote}</p>
                {option.verificationRequired && (
                  <p className="text-xs text-amber-600 flex items-center">
                    <ShieldIcon className="size-3 mr-1" />
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
