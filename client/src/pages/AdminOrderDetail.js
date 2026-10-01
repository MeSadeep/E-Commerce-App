import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useApi } from '../api/client';
import { useToast } from '../components/ui/Toast';
import Button from '../components/ui/Button';
import ErrorState from '../components/ui/ErrorState';
import Skeleton from '../components/ui/Skeleton';

function formatPrice(cents, currency = 'usd') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100);
}

const STATUS_STYLES = {
  paid: 'bg-emerald-100 text-emerald-700',
  pending: 'bg-amber-100 text-amber-700',
  fulfilled: 'bg-accent-100 text-accent-700',
  cancelled: 'bg-ink/10 text-ink/50',
  refunded: 'bg-red-100 text-red-700',
};

export default function AdminOrderDetail() {
  const { id } = useParams();
  const { authedRequest } = useApi();
  const toast = useToast();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const load = () => {
    setError(false);
    setOrder(null);
    authedRequest({ method: 'get', url: `/api/admin/orders/${id}` })
      .then((res) => setOrder(res.data))
      .catch(() => setError(true));
  };

  useEffect(load, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCancel = async () => {
    const confirmMsg = 'Cancel this pending order and expire its Stripe Checkout link?';
    if (!window.confirm(confirmMsg)) return;

    setCancelling(true);
    try {
      const res = await authedRequest({ method: 'post', url: `/api/admin/orders/${id}/cancel` });
      toast.success(res.data.refunded ? 'Order refunded and cancelled' : 'Order cancelled');
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to cancel order');
    } finally {
      setCancelling(false);
    }
  };

  if (error) {
    return (
      <div>
        <ErrorState title="Order not found" onRetry={load} />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="space-y-4">
        <Skeleton variant="rect" height="120px" className="rounded-2xl" />
        <Skeleton variant="rect" height="200px" className="rounded-2xl" />
      </div>
    );
  }

  const canCancel = order.status === 'pending';

  return (
    <div>
      <Link to="/admin/orders" className="text-accent-600 text-sm hover:underline mb-6 inline-block">← Back to Orders</Link>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display font-bold text-2xl tracking-tight">Order #{order.id}</h1>
          <p className="text-ink/50 text-sm mt-1">
            {new Date(order.created_at).toLocaleString(undefined, {
              year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
            })}
          </p>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_STYLES[order.status] || 'bg-ink/10 text-ink/50'}`}>
          {order.status}
        </span>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        {/* Customer */}
        <div className="bg-white border border-line rounded-2xl p-5">
          <h3 className="font-display font-bold text-base mb-3">Customer</h3>
          {order.customer?.name && <p className="font-medium text-ink">{order.customer.name}</p>}
          {order.customer?.email && <p className="text-ink/60 text-sm">{order.customer.email}</p>}
          {!order.customer?.name && !order.customer?.email && (
            <p className="text-ink/40 text-sm">Profile unavailable</p>
          )}
          <p className="text-ink/30 text-xs mt-2 break-all">{order.auth0_user_id}</p>
        </div>

        {/* Payment */}
        <div className="bg-white border border-line rounded-2xl p-5">
          <h3 className="font-display font-bold text-base mb-3">Payment</h3>
          {order.payment ? (
            <>
              {order.payment.cardBrand && (
                <p className="text-ink capitalize">
                  {order.payment.cardBrand} •••• {order.payment.cardLast4}
                </p>
              )}
              {order.payment.amountReceived !== null && (
                <p className="text-ink/60 text-sm">Charged {formatPrice(order.payment.amountReceived, order.currency)}</p>
              )}
              {order.payment.receiptUrl && (
                <a href={order.payment.receiptUrl} target="_blank" rel="noreferrer" className="text-accent-600 text-sm hover:underline">
                  View Stripe receipt →
                </a>
              )}
              {!order.payment.cardBrand && <p className="text-ink/40 text-sm">No completed payment yet</p>}
            </>
          ) : (
            <p className="text-ink/40 text-sm">Payment details unavailable</p>
          )}
        </div>
      </div>

      {/* Items */}
      <div className="bg-white border border-line rounded-2xl overflow-hidden mb-6">
        <h3 className="font-display font-bold text-base px-5 pt-5 mb-3">Items</h3>
        <ul className="divide-y divide-line">
          {order.items.map((item, i) => (
            <li key={i} className="flex items-center gap-4 px-5 py-3">
              {item.image_url && <img src={item.image_url} alt="" className="w-12 h-12 rounded-lg object-cover" />}
              <div className="flex-1">
                <p className="font-medium text-ink text-sm">{item.name}</p>
                <p className="text-ink/50 text-xs">Qty {item.quantity}</p>
              </div>
              <p className="text-sm font-medium">{formatPrice(item.unit_price_cents * item.quantity, order.currency)}</p>
            </li>
          ))}
        </ul>
        <div className="flex justify-between items-center px-5 py-4 border-t border-line font-medium">
          <span>Total</span>
          <span>{formatPrice(order.total_cents, order.currency)}</span>
        </div>
      </div>

      {canCancel && (
        <Button variant="danger" onClick={handleCancel} loading={cancelling}>
          Cancel pending order
        </Button>
      )}
    </div>
  );
}
