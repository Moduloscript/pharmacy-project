# Cart System

This module provides a comprehensive shopping cart system with both full-page views and a quick-access drawer.

## Components

### CartDrawer
A slide-out drawer component that provides quick access to cart contents without leaving the current page.

**Features:**
- View all cart items with images, prices, and quantities
- Inline quantity controls (increase/decrease)
- Remove individual items or clear entire cart
- Toast notifications for all cart actions
- Cart summary with subtotal, discounts, delivery fees, and total
- Empty state with link to browse products
- Prescription requirement notices
- Responsive design with mobile support
- Keyboard navigation and accessibility

**Usage:**
```tsx
import { CartDrawer, useCartDrawer } from '@saas/cart';

function MyComponent() {
  const { isOpen, openDrawer, closeDrawer } = useCartDrawer();

  return (
    <>
      <button onClick={openDrawer}>Open Cart</button>
      <CartDrawer isOpen={isOpen} onClose={closeDrawer} />
    </>
  );
}
```

### MiniCart
A compact cart button component that displays the current item count and opens the cart drawer.

**Usage:**
```tsx
import { MiniCart } from '@saas/cart';

function Navigation() {
  return (
    <div>
      <MiniCart 
        showLabel={true}
        variant="outline"
        size="default"
      />
    </div>
  );
}
```

### Integration with Navigation
The cart drawer is already integrated into the main navigation. When users click the "Cart" menu item, it opens the drawer instead of navigating to the cart page. This provides a much faster and more user-friendly experience.

## Hooks

### useCartDrawer
Manages cart drawer state and provides cart summary information.

**Returns:**
- `isOpen`: boolean - Whether the drawer is currently open
- `openDrawer`: function - Opens the cart drawer
- `closeDrawer`: function - Closes the cart drawer
- `toggleDrawer`: function - Toggles drawer open/closed
- `cartSummary`: object - Full cart summary data
- `hasItems`: boolean - Whether cart has items
- `itemCount`: number - Total quantity of items
- `total`: number - Total cart value

### useCartToast
Provides consistent toast notifications for cart actions.

**Methods:**
- `showAddedToCart(productName, quantity)` - Shows success toast when item added
- `showRemovedFromCart(productName)` - Shows toast when item removed
- `showUpdatedQuantity(productName, newQuantity)` - Shows toast when quantity changed
- `showCartCleared()` - Shows toast when cart is cleared
- `showError(message, options)` - Shows error toast
- `showSuccess(message, options)` - Shows success toast

## Store Integration

The cart drawer integrates seamlessly with the existing Jotai-based cart store:

- `cartItemsAtom` - List of cart items
- `cartSummaryAtom` - Computed cart totals and metadata
- `updateCartItemQuantityAtom` - Action to update item quantities
- `removeFromCartAtom` - Action to remove items
- `clearCartAtom` - Action to clear entire cart

## User Experience Improvements

1. **Quick Access**: Users can view and manage their cart from any page without navigation
2. **Real-time Updates**: All changes reflect immediately with visual feedback
3. **Toast Notifications**: Clear feedback for all cart operations
4. **Responsive Design**: Works seamlessly on mobile and desktop
5. **Accessibility**: Proper ARIA labels, keyboard navigation, and focus management
6. **Empty State**: Helpful guidance when cart is empty
7. **Visual Indicators**: Badge shows item count, special notices for prescriptions
8. **Inline Actions**: Modify quantities and remove items without page reloads

## Benefits over Full Page Cart

- **Faster**: No page navigation required
- **Context Preserved**: Users stay on the current page
- **Mobile Friendly**: Drawer pattern works well on small screens
- **Progressive Enhancement**: Still works if JavaScript fails (falls back to cart page)
- **Better Conversion**: Reduces friction in the shopping process
