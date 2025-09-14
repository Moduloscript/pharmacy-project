'use client';

import { Label } from '@ui/components/label';
import { Switch } from '@ui/components/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/components/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ui/components/select';
import { MoonIcon, SunIcon, ClockIcon } from 'lucide-react';
import type { ExtendedPreferences } from '../PreferenceManager';

interface QuietHoursProps {
  preferences: ExtendedPreferences;
  onUpdate: (updates: Partial<ExtendedPreferences>) => void;
}

// Generate time options (every 30 minutes)
const generateTimeOptions = () => {
  const options = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      const label = new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
      options.push({ value: time, label });
    }
  }
  return options;
};

const timeOptions = generateTimeOptions();

const presets = [
  {
    name: 'Night (10 PM - 8 AM)',
    start: '22:00',
    end: '08:00',
    icon: MoonIcon,
  },
  {
    name: 'Sleep (11 PM - 7 AM)',
    start: '23:00',
    end: '07:00',
    icon: MoonIcon,
  },
  {
    name: 'Work Hours Off (6 PM - 9 AM)',
    start: '18:00',
    end: '09:00',
    icon: SunIcon,
  },
];

export function QuietHours({ preferences, onUpdate }: QuietHoursProps) {
  const handleTimeChange = (field: 'quietHoursStart' | 'quietHoursEnd', value: string) => {
    onUpdate({ [field]: value });
  };

  const applyPreset = (preset: typeof presets[0]) => {
    onUpdate({
      quietHoursEnabled: true,
      quietHoursStart: preset.start,
      quietHoursEnd: preset.end,
    });
  };

  // Calculate quiet hours duration
  const calculateDuration = () => {
    if (!preferences.quietHoursStart || !preferences.quietHoursEnd) return '';
    
    const start = preferences.quietHoursStart.split(':').map(Number);
    const end = preferences.quietHoursEnd.split(':').map(Number);
    
    let startMinutes = start[0] * 60 + start[1];
    let endMinutes = end[0] * 60 + end[1];
    
    // Handle overnight periods
    if (endMinutes <= startMinutes) {
      endMinutes += 24 * 60;
    }
    
    const duration = endMinutes - startMinutes;
    const hours = Math.floor(duration / 60);
    const minutes = duration % 60;
    
    if (minutes === 0) {
      return `${hours} hour${hours !== 1 ? 's' : ''}`;
    }
    return `${hours}h ${minutes}m`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClockIcon className="h-5 w-5" />
          Quiet Hours
        </CardTitle>
        <CardDescription>
          Set times when you don't want to receive non-urgent notifications
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="quiet-hours-toggle" className="text-base">
              Enable Quiet Hours
            </Label>
            <p className="text-sm text-muted-foreground mt-1">
              Pause non-urgent notifications during specified times
            </p>
          </div>
          <Switch
            id="quiet-hours-toggle"
            checked={preferences.quietHoursEnabled}
            onCheckedChange={(checked) => onUpdate({ quietHoursEnabled: checked })}
          />
        </div>

        {preferences.quietHoursEnabled && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="quiet-start">Start Time</Label>
                <Select
                  value={preferences.quietHoursStart}
                  onValueChange={(value) => handleTimeChange('quietHoursStart', value)}
                >
                  <SelectTrigger id="quiet-start">
                    <SelectValue placeholder="Select start time" />
                  </SelectTrigger>
                  <SelectContent>
                    {timeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="quiet-end">End Time</Label>
                <Select
                  value={preferences.quietHoursEnd}
                  onValueChange={(value) => handleTimeChange('quietHoursEnd', value)}
                >
                  <SelectTrigger id="quiet-end">
                    <SelectValue placeholder="Select end time" />
                  </SelectTrigger>
                  <SelectContent>
                    {timeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {preferences.quietHoursStart && preferences.quietHoursEnd && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted">
                <ClockIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  Quiet hours active for {calculateDuration()} daily
                </span>
              </div>
            )}

            <div>
              <Label className="text-sm font-medium mb-3 block">Quick Presets</Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {presets.map((preset) => {
                  const Icon = preset.icon;
                  const isActive = 
                    preferences.quietHoursStart === preset.start &&
                    preferences.quietHoursEnd === preset.end;
                  
                  return (
                    <button
                      key={preset.name}
                      onClick={() => applyPreset(preset)}
                      className={`flex items-center gap-2 p-3 rounded-lg border text-left transition-colors ${
                        isActive
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'hover:bg-accent'
                      }`}
                    >
                      <Icon className="h-4 w-4 flex-shrink-0" />
                      <div>
                        <div className="text-sm font-medium">{preset.name}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium">Days of Week</Label>
              <p className="text-sm text-muted-foreground">
                Select which days quiet hours should be active
              </p>
              <div className="flex gap-2">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                  <button
                    key={day}
                    className="px-3 py-2 text-sm font-medium rounded-md border hover:bg-accent"
                  >
                    {day}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                All days selected by default. Click to customize.
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
