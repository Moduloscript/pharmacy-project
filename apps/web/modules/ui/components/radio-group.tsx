'use client'

import React, { createContext, useContext } from 'react'
import { cn } from '@ui/lib'

interface RadioGroupContextValue {
  value?: string
  onValueChange?: (value: string) => void
  name?: string
}

const RadioGroupContext = createContext<RadioGroupContextValue>({})

interface RadioGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: string
  onValueChange?: (value: string) => void
  name?: string
}

export function RadioGroup({
  className,
  value,
  onValueChange,
  name,
  ...props
}: RadioGroupProps) {
  return (
    <RadioGroupContext.Provider value={{ value, onValueChange, name }}>
      <div className={cn('grid gap-2', className)} {...props} />
    </RadioGroupContext.Provider>
  )
}

interface RadioGroupItemProps extends React.InputHTMLAttributes<HTMLInputElement> {
  value: string
}

export function RadioGroupItem({
  className,
  value,
  ...props
}: RadioGroupItemProps) {
  const context = useContext(RadioGroupContext)
  
  return (
    <input
      type="radio"
      className={cn(
        'aspect-square h-4 w-4 rounded-full border border-gray-300 text-blue-600 shadow focus:ring-2 focus:ring-blue-500',
        className
      )}
      value={value}
      checked={context.value === value}
      onChange={(e) => {
        if (e.target.checked && context.onValueChange) {
          context.onValueChange(value)
        }
      }}
      name={context.name}
      {...props}
    />
  )
}
