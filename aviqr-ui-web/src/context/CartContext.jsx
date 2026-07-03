import { createContext, useContext, useState, useCallback } from 'react';

// Hoists the cart out of CustomerMenu.jsx so the Customer Portal shell can show
// a persistent cart badge/tab from any of the three QR-flow pages. A cart only
// ever belongs to one shop at a time (matches the real single-shop-per-order
// model — there's no cross-restaurant checkout), so switching shops clears it.
const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [shopId, setShopId] = useState(null);
  const [shopName, setShopName] = useState('');
  const [cart, setCart] = useState({}); // { itemId: qty }
  const [catalog, setCatalog] = useState({}); // { itemId: {id,name,price,...} } — for rendering the Cart tab/badge without re-fetching the menu

  // Called by CustomerMenu.jsx once it knows which shop/menu it's showing.
  // Switching to a different shop starts a fresh cart.
  const bindShop = useCallback((id, name, items) => {
    setShopId(prev => {
      if (prev && prev !== id) setCart({});
      return id;
    });
    setShopName(name);
    setCatalog(Object.fromEntries((items || []).map(i => [i.id, i])));
  }, []);

  const addItem = useCallback(id => setCart(c => ({ ...c, [id]: (c[id] || 0) + 1 })), []);
  const remItem = useCallback(id => setCart(c => {
    const n = { ...c };
    if (n[id] > 1) n[id]--; else delete n[id];
    return n;
  }), []);
  const clearCart = useCallback(() => setCart({}), []);

  const cartItems = Object.entries(cart).map(([id, qty]) => ({ ...(catalog[id] || { id }), qty }));
  const cartCount = Object.values(cart).reduce((a, v) => a + v, 0);
  const cartTotal = cartItems.reduce((a, i) => a + (i.price || 0) * i.qty, 0);

  return (
    <CartContext.Provider value={{
      shopId, shopName, cart, cartItems, cartCount, cartTotal,
      bindShop, addItem, remItem, clearCart,
    }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be inside CartProvider');
  return ctx;
};
