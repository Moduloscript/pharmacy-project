'use client';

import { useState, useEffect } from 'react';
import { Card } from '@ui/components/card';
import { Button } from '@ui/components/button';

export default function AdminDebugPage() {
  const [apiResult, setApiResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const testCustomersAPI = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('Calling /api/admin/customers...');
      const response = await fetch('/api/admin/customers');
      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      console.log('API Response:', data);
      setApiResult(data);
    } catch (err: any) {
      console.error('API Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const testStatsAPI = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('Calling /api/admin/customers/stats...');
      const response = await fetch('/api/admin/customers/stats');
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      console.log('Stats API Response:', data);
      setApiResult(data);
    } catch (err: any) {
      console.error('Stats API Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Auto-test on load
    testCustomersAPI();
  }, []);

  return (
    <div className="container mx-auto px-6 py-8">
      <h1 className="text-3xl font-bold mb-6">Admin API Debug</h1>
      
      <div className="space-y-6">
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">API Testing</h2>
          <div className="flex gap-4 mb-4">
            <Button onClick={testCustomersAPI} disabled={loading}>
              Test Customers API
            </Button>
            <Button onClick={testStatsAPI} disabled={loading}>
              Test Stats API
            </Button>
          </div>
          
          {loading && (
            <div className="p-4 bg-blue-50 text-blue-800 rounded">
              Loading...
            </div>
          )}
          
          {error && (
            <div className="p-4 bg-red-50 text-red-800 rounded mb-4">
              <strong>Error:</strong> {error}
            </div>
          )}
        </Card>

        {apiResult && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">API Response</h2>
            <pre className="bg-gray-100 p-4 rounded overflow-auto text-sm">
              {JSON.stringify(apiResult, null, 2)}
            </pre>
          </Card>
        )}
      </div>
    </div>
  );
}
