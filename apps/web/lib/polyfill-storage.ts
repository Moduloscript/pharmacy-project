// This polyfill prevents "SecurityError: Cannot initialize local storage" errors
// when using libraries like nuqs that check localStorage in SSR environments.

try {
  if (typeof global !== 'undefined') {
    // We try to access global.localStorage to see if it throws or is missing
    let storage: Storage | undefined;
    try {
      storage = global.localStorage;
    } catch (e) {
      // Accessing getter threw an error (e.g. node-localstorage missing file path)
      storage = undefined;
    }

    if (!storage) {
        // Define a dummy localStorage
        // Using Object.defineProperty to bypass potential broken setters/getters
        Object.defineProperty(global, 'localStorage', {
            value: {
                getItem: () => null,
                setItem: () => {},
                removeItem: () => {},
                clear: () => {},
                key: () => null,
                length: 0,
            },
            writable: true,
            configurable: true,
        });
    } else {
        // It exists, let's verify it actually works
        try {
            storage.getItem('test');
        } catch (e) {
             // It exists but throws on usage, overwrite it
             Object.defineProperty(global, 'localStorage', {
                value: {
                    getItem: () => null,
                    setItem: () => {},
                    removeItem: () => {},
                    clear: () => {},
                    key: () => null,
                    length: 0,
                },
                writable: true,
                configurable: true,
            });
        }
    }
  }
} catch (e) {
  // Last resort: suppress errors during polyfill initialization
  console.warn('Failed to polyfill localStorage:', e);
}
