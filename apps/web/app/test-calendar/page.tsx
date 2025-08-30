"use client";

import { useState } from "react";
import { YearEstablishedPicker, DatePicker } from "@ui/components/date-picker";

export default function TestCalendarPage() {
  const [selectedYear, setSelectedYear] = useState<number | undefined>(2020);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  return (
    <div className="container mx-auto py-8 space-y-8">
      <h1 className="text-3xl font-bold">Calendar Component Test</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Year Established Picker</h2>
          <div className="max-w-sm">
            <YearEstablishedPicker
              value={selectedYear}
              onChange={setSelectedYear}
              placeholder="Select establishment year"
            />
          </div>
          <p className="text-sm text-gray-600">
            Selected year: {selectedYear ? selectedYear : "None"}
          </p>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Full Date Picker</h2>
          <div className="max-w-sm">
            <DatePicker
              value={selectedDate}
              onChange={setSelectedDate}
              placeholder="Select a date"
              mode="full"
            />
          </div>
          <p className="text-sm text-gray-600">
            Selected date: {selectedDate ? selectedDate.toLocaleDateString() : "None"}
          </p>
        </div>
      </div>

      <div className="mt-8 p-4 bg-green-50 border border-green-200 rounded-lg">
        <h3 className="text-lg font-semibold text-green-800 mb-2">✅ Implementation Status</h3>
        <ul className="text-sm text-green-700 space-y-1">
          <li>• YearEstablishedPicker component created and functional</li>
          <li>• Integration with BusinessSignupForm complete</li>
          <li>• Form validation maintained</li>
          <li>• TypeScript support included</li>
          <li>• Accessible dropdown with calendar icon</li>
        </ul>
      </div>

      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="text-lg font-semibold text-blue-800 mb-2">📋 Next Steps</h3>
        <ol className="text-sm text-blue-700 space-y-1">
          <li>1. Navigate to the business signup form to see the new Year Established picker</li>
          <li>2. Test the form submission with selected year</li>
          <li>3. Verify validation works correctly</li>
          <li>4. Remove this test page when satisfied</li>
        </ol>
      </div>
    </div>
  );
}
