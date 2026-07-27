import React, { useCallback, useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useApi } from '../api/client';
import { useToast } from './ui/Toast';
import Button from './ui/Button';

const emptyForm = { color: '', size: '', material: '', image_urls: ['', '', '', ''], price_usd: '', stock: '' };

export default function VariantManager({ productId, baseCurrency }) {
  const { authedRequest } = useApi();
  const toast = useToast();
  const [variants, setVariants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    authedRequest({ method: 'get', url: `/api/admin/products/${productId}/variants` })
      .then((res) => setVariants(res.data))
      .catch(() => setError('Could not load variants.'))
      .finally(() => setLoading(false));
  }, [authedRequest, productId]);

  useEffect(() => {
    load();
  }, [load]);

  const setImageAt = (index, value) => {
    const next = [...form.image_urls];
    next[index] = value;
    setForm({ ...form, image_urls: next });
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    setError(null);

    if (!form.color && !form.size && !form.material) {
      setError('Enter at least a color, size, or material to describe this option.');
      return;
    }
    const priceCents = Math.round(Number(form.price_usd || 0) * 100);
    if (!Number.isInteger(priceCents) || priceCents < 0) {
      setError('Enter a valid price, e.g. 72.55 (or leave blank for 0)');
      return;
    }

    setSaving(true);
    try {
      await authedRequest({
        method: 'post',
        url: `/api/admin/products/${productId}/variants`,
        data: {
          color: form.color || undefined,
          size: form.size || undefined,
          material: form.material || undefined,
          image_urls: form.image_urls.filter(Boolean),
          price_cents: priceCents,
          stock: Number(form.stock || 0),
        },
      });
      setForm(emptyForm);
      toast.success('Option added');
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add option');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (variantId) => {
    if (!window.confirm('Remove this option?')) return;
    try {
      await authedRequest({ method: 'delete', url: `/api/admin/variants/${variantId}` });
      toast.success('Option removed');
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to remove option');
    }
  };

  const inputCls = 'border border-line rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent-500 w-full';

  return (
    <div className="border-t border-line pt-5 mt-2">
      <h3 className="font-display font-bold text-base mb-1">Options (color / size / material)</h3>
      <p className="text-ink/50 text-xs mb-4">
        Shown to customers as a picker on the product page. Each option can have up to 4 photos.
        Note: options currently only preview photos — checkout still charges the base product's
        price/stock above, not the option's, until variant-aware checkout is built.
      </p>

      {loading ? (
        <p className="text-ink/50 text-sm">Loading options…</p>
      ) : (
        <>
          {variants.length > 0 && (
            <ul className="space-y-2 mb-4">
              {variants.map((v) => {
                const images = (v.image_urls && v.image_urls.length > 0 ? v.image_urls : [v.image_url]).filter(Boolean);
                return (
                  <li key={v.id} className="flex items-center gap-3 bg-paper rounded-xl px-3 py-2">
                    <div className="flex gap-1">
                      {images.length > 0 ? (
                        images.slice(0, 4).map((src, i) => (
                          <img key={i} src={src} alt="" className="w-9 h-9 rounded-lg object-cover bg-ink/5" />
                        ))
                      ) : (
                        <img src="https://placehold.co/36x36?text=%20" alt="" className="w-9 h-9 rounded-lg object-cover bg-ink/5" />
                      )}
                    </div>
                    <span className="text-sm flex-1">
                      {[v.color, v.size, v.material].filter(Boolean).join(' / ') || 'Option'}
                    </span>
                    <span className="text-ink/40 text-xs">{v.stock} in stock</span>
                    <button
                      onClick={() => handleDelete(v.id)}
                      aria-label="Remove option"
                      className="text-ink/40 hover:text-red-600"
                    >
                      <Trash2 size={16} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          <form onSubmit={handleAdd} className="grid grid-cols-2 gap-2">
            {error && <p className="col-span-2 text-red-600 text-xs">{error}</p>}
            <input className={inputCls} placeholder="Color (e.g. Blue)" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} />
            <input className={inputCls} placeholder="Size (e.g. Large)" value={form.size} onChange={(e) => setForm({ ...form, size: e.target.value })} />

            <p className="col-span-2 text-xs text-ink/50 -mb-1">Photos for this option (up to 4, all optional)</p>
            {form.image_urls.map((url, i) => (
              <input
                key={i}
                className={inputCls}
                placeholder={`Image ${i + 1} URL`}
                value={url}
                onChange={(e) => setImageAt(i, e.target.value)}
              />
            ))}

            <input className={inputCls} type="number" min="0" placeholder="Stock" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
            <input className={inputCls} type="number" step="0.01" min="0" placeholder={`Price (${baseCurrency || 'usd'}, optional)`} value={form.price_usd} onChange={(e) => setForm({ ...form, price_usd: e.target.value })} />
            <div className="col-span-2">
              <Button type="submit" variant="secondary" size="sm" loading={saving}>Add option</Button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
