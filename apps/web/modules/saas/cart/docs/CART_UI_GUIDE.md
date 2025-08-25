# Cart UI revamp usage guide

This guide documents the small composition changes and helpers added to align the cart screen with our theme tokens and Material Design style, without changing our component library.

What changed
- RadioGroup now uses design tokens (border-input, text-primary, ring-ring) for consistent theming.
- Alert gained a new `warning` variant mapped to `--highlight` tokens.
- New `SelectableCard` wrapper composes `Card` and adds a tokenized selected state for tappable list items (e.g., delivery options).

How to compose delivery options
```tsx
import { RadioGroup, RadioGroupItem } from '@ui/components/radio-group'
import { SelectableCard } from '@ui/components/selectable-card'
import { Badge } from '@ui/components/badge'

<RadioGroup value={selectedId} onValueChange={setSelected} name="delivery">
  {options.map(opt => (
    <SelectableCard
      key={opt.id}
      selected={selectedId === opt.id}
      className="p-3 cursor-pointer"
      onClick={() => setSelected(opt.id)}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <RadioGroupItem value={opt.id} aria-label={opt.name} />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-card-foreground">{opt.name}</span>
              {opt.price === 0 && <Badge status="success" className="text-xs">Free</Badge>}
            </div>
            <p className="text-sm text-muted-foreground">{opt.description}</p>
          </div>
        </div>
        <span className="font-semibold text-card-foreground">
          {opt.price === 0 ? 'Free' : formatPrice(opt.price)}
        </span>
      </div>
    </SelectableCard>
  ))}
</RadioGroup>
```

Prescription banner
```tsx
import { Alert, AlertTitle, AlertDescription } from '@ui/components/alert'

{hasPrescriptionItems && (
  <Alert variant="warning">
    <AlertTitle>Prescription required</AlertTitle>
    <AlertDescription>
      Some items in your cart require a valid prescription upload during checkout.
    </AlertDescription>
  </Alert>
)}
```

Primary CTA
```tsx
<Button variant="primary" size="lg" className="w-full">
  Proceed to checkout
</Button>
```

Notes
- SelectableCard uses tokens for selected state: `border-primary bg-primary/5 ring-2 ring-ring/40`.
- Keep all chip/badge/accessory colors mapped to semantic tokens (success, info, warning using highlight, error).
- Remove ad‑hoc color classes in cart where possible in favor of theme tokens.

