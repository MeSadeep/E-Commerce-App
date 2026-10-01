import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { CartProvider, useCart } from './CartContext';
let mockAuth;
jest.mock('@auth0/auth0-react',()=>({useAuth0:()=>mockAuth}));
let current, root, host;
function Probe(){current=useCart();return null;}
beforeEach(()=>{global.IS_REACT_ACT_ENVIRONMENT=true;localStorage.clear();host=document.createElement('div');root=createRoot(host);});
afterEach(()=>act(()=>root.unmount()));
test('cart becomes ready after delayed Auth0 hydration, then clearing persists',()=>{
 localStorage.setItem('cart:user-a',JSON.stringify([{productId:1,quantity:1,price_cents:100}]));
 mockAuth={isLoading:true,isAuthenticated:false,user:null};
 act(()=>root.render(<CartProvider><Probe/></CartProvider>));
 expect(current.cartReady).toBe(false);
 mockAuth={isLoading:false,isAuthenticated:true,user:{sub:'user-a'}};
 act(()=>root.render(<CartProvider><Probe/></CartProvider>));
 expect(current.cartReady).toBe(true);expect(current.items).toHaveLength(1);
 act(()=>current.clearCart());
 expect(current.items).toEqual([]);expect(JSON.parse(localStorage.getItem('cart:user-a')||'[]')).toEqual([]);
});
test('clearing one account preserves another account cart',()=>{
 localStorage.setItem('cart:user-b',JSON.stringify([{productId:2,quantity:2,price_cents:100}]));
 mockAuth={isLoading:false,isAuthenticated:true,user:{sub:'user-a'}};
 act(()=>root.render(<CartProvider><Probe/></CartProvider>));
 act(()=>current.clearCart());
 expect(JSON.parse(localStorage.getItem('cart:user-b'))).toHaveLength(1);
});
