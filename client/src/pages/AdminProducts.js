import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Pencil } from 'lucide-react';
import { useApi } from '../api/client';
import { useToast } from '../components/ui/Toast';
import Modal from '../components/ui/Modal';
import TextField from '../components/ui/TextField';
import Button from '../components/ui/Button';
import VariantManager from '../components/VariantManager';

export default function AdminProducts() {
  const { authedRequest } = useApi();
  const [searchParams] = useSearchParams();
  const toast = useToast();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newProduct, setNewProduct] = useState({ name: '', price_usd: '', stock: '', image_url: '' });

  // Edit modal state — null when closed, otherwise the product being edited
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', price_usd: '', stock: '', image_url: '' });
  const [editErrors, setEditErrors] = useState({});
  const [editSaving, setEditSaving] = useState(false);

  const query = (searchParams.get('q') || '').toLowerCase();

  // Uses the admin listing (not the public /api/products one) since this
  // page needs to see inactive/soft-deleted products too, to reactivate them.
  const loadProducts = useCallback(() => {
    authedRequest({ method: 'get', url: '/api/admin/products' })
      .then((res) => setProducts(res.data))
      .catch(() => setError('Could not load products.'))
      .finally(() => setLoading(false));
  }, [authedRequest]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const describeError = (err, fallback) => {
    const data = err.response?.data;
    if (!data) return fallback;
    if (data.error) return data.error;
    if (Array.isArray(data.errors) && data.errors.length > 0) {
      return data.errors.map((e) => `${e.path}: ${e.msg} (got "${e.value}")`).join('; ');
    }
    return fallback;
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setError(null);

    const priceCents = Math.round(Number(newProduct.price_usd) * 100);
    if (!Number.isInteger(priceCents) || priceCents < 0) {
      setError('Enter a valid price, e.g. 72.55');
      return;
    }

    try {
      await authedRequest({
        method: 'post',
        url: '/api/admin/products',
        data: {
          name: newProduct.name,
          price_cents: priceCents,
          stock: Number(newProduct.stock),
          image_url: newProduct.image_url || undefined,
        },
      });
      setNewProduct({ name: '', price_usd: '', stock: '', image_url: '' });
      toast.success('Product added');
      loadProducts();
    } catch (err) {
      setError(describeError(err, 'Failed to create product'));
    }
  };

  const handleStockChange = async (id, stock) => {
    try {
      await authedRequest({ method: 'patch', url: `/api/admin/products/${id}`, data: { stock: Number(stock) } });
      loadProducts();
    } catch (err) {
      toast.error(describeError(err, 'Failed to update stock'));
    }
  };

  // A product with real order history can't be hard-deleted (the backend
  // falls back to soft-delete and tells us so) — either way, refresh the
  // list and show whatever message came back.
  const handleDelete = async (id) => {
    if (!window.confirm('Delete this product?')) return;
    try {
      const res = await authedRequest({ method: 'delete', url: `/api/admin/products/${id}` });
      toast.info(res.data?.softDeleted ? res.data.message : 'Product deleted');
      loadProducts();
    } catch (err) {
      toast.error(describeError(err, 'Failed to delete product'));
    }
  };

  const handleReactivate = async (id) => {
    try {
      await authedRequest({ method: 'patch', url: `/api/admin/products/${id}`, data: { is_active: true } });
      toast.success('Product reactivated');
      loadProducts();
    } catch (err) {
      toast.error(describeError(err, 'Failed to reactivate product'));
    }
  };

  // --- Edit modal ---

  const openEdit = (product) => {
    setEditing(product);
    setEditErrors({});
    setEditForm({
      name: product.name,
      price_usd: (product.price_cents / 100).toFixed(2),
      stock: String(product.stock),
      image_url: product.image_url || '',
    });
  };

  const closeEdit = () => setEditing(null);

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    const errors = {};
    const priceCents = Math.round(Number(editForm.price_usd) * 100);
    if (!editForm.name.trim()) errors.name = 'Name is required';
    if (!Number.isInteger(priceCents) || priceCents < 0) errors.price_usd = 'Enter a valid price, e.g. 72.55';
    if (!Number.isInteger(Number(editForm.stock)) || Number(editForm.stock) < 0) errors.stock = 'Enter a valid stock number';
    if (Object.keys(errors).length > 0) {
      setEditErrors(errors);
      return;
    }

    setEditSaving(true);
    try {
      await authedRequest({
        method: 'patch',
        url: `/api/admin/products/${editing.id}`,
        data: {
          name: editForm.name,
          price_cents: priceCents,
          stock: Number(editForm.stock),
          image_url: editForm.image_url || null,
        },
      });
      toast.success('Product updated');
      closeEdit();
      loadProducts();
    } catch (err) {
      setEditErrors({ form: describeError(err, 'Failed to save changes') });
    } finally {
      setEditSaving(false);
    }
  };

  if (loading) return <p className="text-ink/50">Loading…</p>;

  const inputCls = 'border border-line rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent-500';
  const filtered = query ? products.filter((p) => p.name.toLowerCase().includes(query)) : products;

  return (
    <div>
      <h1 className="font-display font-bold text-2xl tracking-tight mb-1">Products</h1>
      {query && <p className="text-ink/50 text-sm mb-4">Filtered by "{query}" — {filtered.length} result(s)</p>}
      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      <form onSubmit={handleCreate} className="bg-white border border-line rounded-2xl p-6 flex flex-wrap gap-3 items-end mb-6 mt-4">
        <h3 className="w-full font-display font-bold text-lg mb-1">Add product</h3>
        <input className={inputCls} placeholder="Name" value={newProduct.name} onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })} required />
        <input className={inputCls} placeholder="Price in dollars (e.g. 72.55)" type="number" step="0.01" min="0" value={newProduct.price_usd} onChange={(e) => setNewProduct({ ...newProduct, price_usd: e.target.value })} required />
        <input className={inputCls} placeholder="Stock" type="number" value={newProduct.stock} onChange={(e) => setNewProduct({ ...newProduct, stock: e.target.value })} required />
        <input className={inputCls} placeholder="Image URL (optional)" value={newProduct.image_url} onChange={(e) => setNewProduct({ ...newProduct, image_url: e.target.value })} />
        <button className="bg-ink text-white rounded-full px-5 py-2 text-sm font-medium hover:bg-ink/90 transition-colors" type="submit">Add</button>
      </form>

      <table className="w-full bg-white border border-line rounded-2xl overflow-hidden">
        <thead className="bg-accent-50 text-left text-sm">
          <tr>
            <th className="px-4 py-3">Image</th>
            <th className="px-4 py-3">Name</th>
            <th className="px-4 py-3">Price</th>
            <th className="px-4 py-3">Stock</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody className="text-sm divide-y divide-line">
          {filtered.map((p) => (
            <tr key={p.id} className={p.is_active ? '' : 'opacity-50'}>
              <td className="px-4 py-3">
                <img
                  src={p.image_url || 'https://placehold.co/48x48?text=%20'}
                  alt=""
                  className="w-10 h-10 rounded-lg object-cover bg-ink/5"
                />
              </td>
              <td className="px-4 py-3">{p.name}</td>
              <td className="px-4 py-3">{(p.price_cents / 100).toFixed(2)} {p.currency}</td>
              <td className="px-4 py-3">
                <input
                  type="number"
                  defaultValue={p.stock}
                  onBlur={(e) => handleStockChange(p.id, e.target.value)}
                  className="w-20 border border-line rounded-lg px-2 py-1"
                  disabled={!p.is_active}
                />
              </td>
              <td className="px-4 py-3">
                <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${p.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-ink/10 text-ink/50'}`}>
                  {p.is_active ? 'Active' : 'Hidden'}
                </span>
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <button
                  onClick={() => openEdit(p)}
                  aria-label={`Edit ${p.name}`}
                  className="text-ink/50 hover:text-ink mr-3 inline-flex align-middle"
                >
                  <Pencil size={16} />
                </button>
                {p.is_active ? (
                  <button className="text-red-600 hover:underline" onClick={() => handleDelete(p.id)}>Delete</button>
                ) : (
                  <button className="text-accent-600 hover:underline" onClick={() => handleReactivate(p.id)}>Reactivate</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <Modal isOpen={!!editing} onClose={closeEdit} title={editing ? `Edit "${editing.name}"` : 'Edit product'}>
        {editing && (
          <>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              {editErrors.form && <p className="text-red-600 text-sm">{editErrors.form}</p>}

              {editForm.image_url && (
                <img src={editForm.image_url} alt="" className="w-full h-40 object-cover rounded-xl bg-ink/5" />
              )}

              <TextField
                label="Image URL"
                value={editForm.image_url}
                onChange={(e) => setEditForm({ ...editForm, image_url: e.target.value })}
                placeholder="https://..."
                helperText="Paste a direct link to an image (Cloudinary, imgbb, etc.)"
              />
              <TextField
                label="Name"
                required
                value={editForm.name}
                error={editErrors.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
              <TextField
                label="Price (dollars)"
                required
                type="number"
                step="0.01"
                min="0"
                value={editForm.price_usd}
                error={editErrors.price_usd}
                onChange={(e) => setEditForm({ ...editForm, price_usd: e.target.value })}
              />
              <TextField
                label="Stock"
                required
                type="number"
                min="0"
                value={editForm.stock}
                error={editErrors.stock}
                onChange={(e) => setEditForm({ ...editForm, stock: e.target.value })}
              />

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="ghost" type="button" onClick={closeEdit}>Cancel</Button>
                <Button type="submit" loading={editSaving}>Save changes</Button>
              </div>
            </form>

            {/* Deliberately OUTSIDE the form above — VariantManager has its
                own <form> internally for adding an option, and HTML doesn't
                allow nesting <form> elements (it breaks submit behavior). */}
            <VariantManager productId={editing.id} baseCurrency={editing.currency} />
          </>
        )}
      </Modal>
    </div>
  );
}
