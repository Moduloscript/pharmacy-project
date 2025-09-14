'use client';

import { useState } from 'react';
import { Button } from '@ui/components/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@ui/components/dialog';
import { Textarea } from '@ui/components/textarea';
import { DownloadIcon, UploadIcon, CopyIcon, CheckIcon } from 'lucide-react';
import { toast } from 'sonner';
import type { ExtendedPreferences } from '../PreferenceManager';

interface ImportExportProps {
  preferences: ExtendedPreferences;
  onImport: (preferences: Partial<ExtendedPreferences>) => void;
}

export function ImportExport({ preferences, onImport }: ImportExportProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [importData, setImportData] = useState('');
  const [copied, setCopied] = useState(false);

  const exportPreferences = () => {
    // Remove sensitive data before export
    const exportData = {
      ...preferences,
      id: undefined,
      customerId: undefined,
      createdAt: undefined,
      updatedAt: undefined,
    };
    
    const json = JSON.stringify(exportData, null, 2);
    
    // Create download
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `notification-preferences-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('Preferences exported successfully!');
  };

  const copyToClipboard = () => {
    const exportData = {
      ...preferences,
      id: undefined,
      customerId: undefined,
      createdAt: undefined,
      updatedAt: undefined,
    };
    
    const json = JSON.stringify(exportData, null, 2);
    navigator.clipboard.writeText(json);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Preferences copied to clipboard!');
  };

  const importPreferences = () => {
    try {
      const parsed = JSON.parse(importData);
      
      // Validate the imported data
      if (typeof parsed !== 'object') {
        throw new Error('Invalid preference format');
      }
      
      // Import the preferences
      onImport(parsed);
      setIsOpen(false);
      setImportData('');
      toast.success('Preferences imported successfully!');
    } catch (error) {
      toast.error('Invalid preference data. Please check the format and try again.');
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setImportData(content);
    };
    reader.readAsText(file);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <DownloadIcon className="h-4 w-4 mr-1" />
          Import/Export
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import/Export Preferences</DialogTitle>
          <DialogDescription>
            Export your current preferences or import previously saved settings
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          <div>
            <h3 className="font-medium mb-3">Export Preferences</h3>
            <div className="flex gap-2">
              <Button onClick={exportPreferences} variant="outline">
                <DownloadIcon className="h-4 w-4 mr-2" />
                Download as JSON
              </Button>
              <Button onClick={copyToClipboard} variant="outline">
                {copied ? (
                  <>
                    <CheckIcon className="h-4 w-4 mr-2" />
                    Copied!
                  </>
                ) : (
                  <>
                    <CopyIcon className="h-4 w-4 mr-2" />
                    Copy to Clipboard
                  </>
                )}
              </Button>
            </div>
          </div>
          
          <div>
            <h3 className="font-medium mb-3">Import Preferences</h3>
            <div className="space-y-3">
              <div>
                <label
                  htmlFor="file-upload"
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer"
                >
                  <UploadIcon className="h-4 w-4 mr-2" />
                  Choose File
                </label>
                <input
                  id="file-upload"
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  className="sr-only"
                />
              </div>
              
              <Textarea
                placeholder="Or paste your preference JSON here..."
                value={importData}
                onChange={(e) => setImportData(e.target.value)}
                className="min-h-[200px] font-mono text-sm"
              />
              
              <Button 
                onClick={importPreferences} 
                disabled={!importData.trim()}
                className="w-full"
              >
                Import Preferences
              </Button>
            </div>
          </div>
          
          <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              <strong>Note:</strong> Imported preferences will replace your current settings. 
              Make sure to export your current preferences first if you want to keep a backup.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
