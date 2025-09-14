'use client';

import { Label } from '@ui/components/label';
import { Switch } from '@ui/components/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ui/components/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/components/card';
import { Badge } from '@ui/components/badge';
import { PhoneIcon, MailIcon, MessageSquareIcon, AlertCircleIcon } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import type { ExtendedPreferences } from '../PreferenceManager';

interface ChannelPreferencesProps {
  preferences: ExtendedPreferences;
  onUpdate: (updates: Partial<ExtendedPreferences>) => void;
}

const channelInfo = {
  sms: {
    icon: PhoneIcon,
    label: 'SMS',
    description: 'Text messages to your mobile phone',
    color: 'bg-blue-500',
  },
  whatsapp: {
    icon: MessageSquareIcon,
    label: 'WhatsApp',
    description: 'Rich messages with images and quick replies',
    color: 'bg-green-500',
  },
  email: {
    icon: MailIcon,
    label: 'Email',
    description: 'Detailed messages to your email inbox',
    color: 'bg-purple-500',
  },
};

export function ChannelPreferences({ preferences, onUpdate }: ChannelPreferencesProps) {
  const handleChannelToggle = (channel: string) => {
    const key = `${channel}Enabled` as keyof ExtendedPreferences;
    onUpdate({ [key]: !preferences[key] });
  };

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;
    
    const items = Array.from(preferences.channelPriority || []);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    onUpdate({ channelPriority: items });
  };

  const enabledChannels = [
    preferences.smsEnabled && 'sms',
    preferences.whatsappEnabled && 'whatsapp',
    preferences.emailEnabled && 'email',
  ].filter(Boolean);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Notification Channels</CardTitle>
          <CardDescription>
            Choose how you want to receive notifications. You can enable multiple channels.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(channelInfo).map(([key, info]) => {
            const Icon = info.icon;
            const enabled = preferences[`${key}Enabled` as keyof ExtendedPreferences];
            
            return (
              <div
                key={key}
                className={`flex items-center justify-between p-4 rounded-lg border ${
                  enabled ? 'bg-accent/50' : 'bg-muted/30'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-full ${info.color} text-white`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <Label htmlFor={`${key}-toggle`} className="text-base font-medium">
                      {info.label}
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {info.description}
                    </p>
                    {key === 'whatsapp' && !enabled && (
                      <Badge variant="secondary" className="mt-2">
                        Coming Soon
                      </Badge>
                    )}
                  </div>
                </div>
                <Switch
                  id={`${key}-toggle`}
                  checked={enabled as boolean}
                  onCheckedChange={() => handleChannelToggle(key)}
                  disabled={key === 'whatsapp'} // WhatsApp temporarily disabled
                />
              </div>
            );
          })}
          
          {enabledChannels.length === 0 && (
            <div className="flex items-center gap-2 p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200">
              <AlertCircleIcon className="h-4 w-4" />
              <p className="text-sm">
                Please enable at least one channel to receive notifications
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Preferred Channel</CardTitle>
          <CardDescription>
            Select your preferred channel for non-urgent notifications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={preferences.preferredChannel}
            onValueChange={(value) => onUpdate({ preferredChannel: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select preferred channel" />
            </SelectTrigger>
            <SelectContent>
              {enabledChannels.map((channel) => (
                channel && (
                  <SelectItem key={channel} value={channel}>
                    {channelInfo[channel as keyof typeof channelInfo].label}
                  </SelectItem>
                )
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Channel Priority</CardTitle>
          <CardDescription>
            Drag to reorder the fallback priority when your preferred channel is unavailable
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="channels">
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                  {(preferences.channelPriority || ['sms', 'whatsapp', 'email']).map((channel, index) => {
                    const info = channelInfo[channel as keyof typeof channelInfo];
                    const Icon = info.icon;
                    const enabled = preferences[`${channel}Enabled` as keyof ExtendedPreferences];
                    
                    return (
                      <Draggable key={channel} draggableId={channel} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`flex items-center gap-3 p-3 rounded-lg border ${
                              snapshot.isDragging ? 'shadow-lg' : ''
                            } ${enabled ? 'bg-background' : 'bg-muted/50 opacity-50'}`}
                          >
                            <div className="text-muted-foreground font-medium">
                              {index + 1}
                            </div>
                            <Icon className="h-4 w-4" />
                            <span className="flex-1">{info.label}</span>
                            {!enabled && (
                              <Badge variant="outline" className="text-xs">
                                Disabled
                              </Badge>
                            )}
                          </div>
                        )}
                      </Draggable>
                    );
                  })}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </CardContent>
      </Card>
    </div>
  );
}
