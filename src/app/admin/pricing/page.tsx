'use client';

import { useEffect, useState } from 'react';
import AdminShell from '@/components/admin/AdminShell';
import { formatCurrency } from '@/lib/utils';
import {
  DollarSign,
  Plus,
  Trash2,
  Power,
  Save,
  Percent,
} from 'lucide-react';

interface MarkupRule {
  id: string;
  name: string;
  typeId: string | null;
  aircraftSlug: string | null;
  markupType: string;
  markupValue: number;
  priority: number;
  active: boolean;
  type: { id: string; name: string } | null;
}

interface AircraftType {
  id: string;
  name: string;
}

export default function AdminPricing() {
  const [rules, setRules] = useState<MarkupRule[]>([]);
  const [types, setTypes] = useState<AircraftType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  // New rule form
  const [newName, setNewName] = useState('');
  const [newTypeId, setNewTypeId] = useState('');
  const [newMarkupType, setNewMarkupType] = useState('percentage');
  const [newMarkupValue, setNewMarkupValue] = useState('');
  const [newPriority, setNewPriority] = useState('0');
  const [saving, setSaving] = useState(false);

  const fetchRules = async () => {
    try {
      const res = await fetch('/api/admin/markup');
      const data = await res.json();
      setRules(data.rules);
      setTypes(data.types);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const addRule = async () => {
    if (!newName || !newMarkupValue) return;
    setSaving(true);
    try {
      await fetch('/api/admin/markup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName,
          typeId: newTypeId || null,
          markupType: newMarkupType,
          markupValue: newMarkupValue,
          priority: newPriority,
        }),
      });
      setNewName('');
      setNewTypeId('');
      setNewMarkupValue('');
      setNewPriority('0');
      setShowAdd(false);
      await fetchRules();
    } catch (e) {
      console.error(e);
    }
    setSaving(false);
  };

  const toggleRule = async (id: string) => {
    try {
      await fetch(`/api/admin/markup/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle' }),
      });
      await fetchRules();
    } catch (e) {
      console.error(e);
    }
  };

  const deleteRule = async (id: string) => {
    if (!confirm('Delete this markup rule?')) return;
    try {
      await fetch(`/api/admin/markup/${id}`, { method: 'DELETE' });
      await fetchRules();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <AdminShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold text-white">Pricing & Markup</h1>
            <p className="text-jet-light text-sm mt-1">Configure markup rules for aircraft pricing</p>
          </div>
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="inline-flex items-center gap-2 bg-gold-gradient text-jet-black text-sm font-medium px-4 py-2 rounded-lg hover:shadow-lg hover:shadow-gold/20 transition-all"
          >
            <Plus className="h-4 w-4" />
            Add Rule
          </button>
        </div>

        {/* How Markup Works */}
        <div className="bg-jet-charcoal border border-white/5 rounded-xl p-5">
          <h3 className="text-sm font-medium text-white mb-2 flex items-center gap-2">
            <Percent className="h-4 w-4 text-gold" />
            How Markup Works
          </h3>
          <p className="text-xs text-jet-light leading-relaxed">
            Markup rules apply to the base price from data providers. Rules are evaluated by priority
            (highest first) and specificity: aircraft-specific rules override type-specific rules,
            which override global rules. Display prices are rounded to the nearest $50.
          </p>
        </div>

        {/* Add Rule Form */}
        {showAdd && (
          <div className="bg-jet-dark border border-gold/20 rounded-xl p-6 space-y-4">
            <h3 className="text-sm font-medium text-gold">New Markup Rule</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-jet-muted mb-1">Rule Name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="w-full bg-jet-charcoal border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-gold/50"
                  placeholder="e.g. Heavy Jet Premium"
                />
              </div>
              <div>
                <label className="block text-xs text-jet-muted mb-1">Aircraft Type (optional)</label>
                <select
                  value={newTypeId}
                  onChange={e => setNewTypeId(e.target.value)}
                  className="w-full bg-jet-charcoal border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-gold/50"
                >
                  <option value="">Global (all types)</option>
                  {types.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-jet-muted mb-1">Markup Type</label>
                <select
                  value={newMarkupType}
                  onChange={e => setNewMarkupType(e.target.value)}
                  className="w-full bg-jet-charcoal border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-gold/50"
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed Amount ($)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-jet-muted mb-1">
                  Value {newMarkupType === 'percentage' ? '(%)' : '($)'}
                </label>
                <input
                  type="number"
                  value={newMarkupValue}
                  onChange={e => setNewMarkupValue(e.target.value)}
                  className="w-full bg-jet-charcoal border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-gold/50"
                  placeholder={newMarkupType === 'percentage' ? '15' : '500'}
                />
              </div>
              <div>
                <label className="block text-xs text-jet-muted mb-1">Priority (higher = checked first)</label>
                <input
                  type="number"
                  value={newPriority}
                  onChange={e => setNewPriority(e.target.value)}
                  className="w-full bg-jet-charcoal border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-gold/50"
                  placeholder="0"
                />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={addRule}
                disabled={saving || !newName || !newMarkupValue}
                className="inline-flex items-center gap-2 bg-gold-gradient text-jet-black text-sm font-medium px-4 py-2 rounded-lg hover:shadow-lg hover:shadow-gold/20 transition-all disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {saving ? 'Saving...' : 'Save Rule'}
              </button>
              <button
                onClick={() => setShowAdd(false)}
                className="px-4 py-2 text-sm text-jet-light hover:text-white transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Rules Table */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin h-8 w-8 border-2 border-gold border-t-transparent rounded-full" />
          </div>
        ) : (
          <div className="bg-jet-dark border border-white/5 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-jet-muted text-xs uppercase tracking-wider border-b border-white/5">
                  <th className="text-left py-3 px-4">Rule</th>
                  <th className="text-left py-3 px-4">Applies To</th>
                  <th className="text-left py-3 px-4">Type</th>
                  <th className="text-right py-3 px-4">Value</th>
                  <th className="text-center py-3 px-4">Priority</th>
                  <th className="text-center py-3 px-4">Status</th>
                  <th className="text-right py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {rules.map(rule => (
                  <tr key={rule.id} className={`hover:bg-white/[0.02] transition-colors ${!rule.active ? 'opacity-50' : ''}`}>
                    <td className="py-3 px-4 text-white font-medium">{rule.name}</td>
                    <td className="py-3 px-4 text-jet-light">
                      {rule.aircraftSlug
                        ? `Aircraft: ${rule.aircraftSlug}`
                        : rule.type
                        ? rule.type.name
                        : 'All Aircraft (Global)'}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded ${
                        rule.markupType === 'percentage'
                          ? 'bg-purple-500/10 text-purple-400'
                          : 'bg-blue-500/10 text-blue-400'
                      }`}>
                        {rule.markupType === 'percentage' ? <Percent className="h-3 w-3" /> : <DollarSign className="h-3 w-3" />}
                        {rule.markupType}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-white font-medium">
                      {rule.markupType === 'percentage'
                        ? `${rule.markupValue}%`
                        : formatCurrency(rule.markupValue)}
                    </td>
                    <td className="py-3 px-4 text-center text-jet-light">{rule.priority}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`text-xs ${rule.active ? 'text-green-400' : 'text-red-400'}`}>
                        {rule.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => toggleRule(rule.id)}
                          className={`p-1.5 rounded transition-colors ${
                            rule.active
                              ? 'text-green-400 hover:bg-green-500/10'
                              : 'text-jet-muted hover:bg-white/5'
                          }`}
                          title={rule.active ? 'Disable' : 'Enable'}
                        >
                          <Power className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => deleteRule(rule.id)}
                          className="p-1.5 text-red-400 hover:bg-red-500/10 rounded transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {rules.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-jet-muted">
                      No markup rules. Click &quot;Add Rule&quot; to create one.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
