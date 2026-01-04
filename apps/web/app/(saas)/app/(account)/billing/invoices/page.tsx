'use client'

import { FileText } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@ui/components/card'

export default function InvoicesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100/50 dark:from-slate-950 dark:to-slate-900">
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
              <div className="p-3 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl shadow-lg">
                  <FileText className="h-8 w-8 text-white" strokeWidth={1.5} />
              </div>
              <div>
                  <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100">
                  Invoices
                  </h1>
                  <p className="text-slate-600 mt-1 text-lg dark:text-slate-400">
                  View and download your billing statements
                  </p>
              </div>
              </div>
          </div>

          <Card>
              <CardHeader>
                  <CardTitle>Recent Invoices</CardTitle>
                  <CardDescription>You have no pending invoices.</CardDescription>
              </CardHeader>
              <CardContent>
                  <div className="flex flex-col items-center justify-center py-12 text-center text-zinc-500">
                      <FileText className="h-12 w-12 mb-4 opacity-20" />
                      <p>No invoices available yet.</p>
                  </div>
              </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
