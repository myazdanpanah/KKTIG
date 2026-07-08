import { useState, useEffect, useMemo } from 'react'
import { financeApi } from '../../api/finance'
import { Plus, Edit2, Trash2, ChevronDown, ChevronRight, Layers } from 'lucide-react'
import { useTranslation } from '../../utils/i18n'

interface ItemType {
  id: number; name: string; code: string; parent: number | null; parent_name: string;
  display_order: number; is_active: boolean; children_count: number;
  fields_schema?: Array<{ id: number; key: string; label: string; field_type: string; required: boolean }>
}

interface TreeNode extends ItemType {
  children: TreeNode[]
}

function buildTree(items: ItemType[]): TreeNode[] {
  const map = new Map<number, TreeNode>()
  items.forEach(it => map.set(it.id, { ...it, children: [] }))
  const roots: TreeNode[] = []
  map.forEach(node => {
    if (node.parent && map.has(node.parent)) {
      map.get(node.parent)!.children.push(node)
    } else {
      roots.push(node)
    }
  })
  return roots
}

function TreeItem({ node, depth, onEdit, onDelete, onManageFields, expanded, onToggle }: {
  node: TreeNode; depth: number; onEdit: (t: ItemType) => void; onDelete: (id: number) => void
  onManageFields: (t: ItemType) => void; expanded: Set<number>; onToggle: (id: number) => void
}) {
  const hasChildren = node.children.length > 0
  const isExpanded = expanded.has(node.id)
  const { t } = useTranslation()

  return (
    <div>
      <div
        className="flex items-center gap-2 px-3 py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 group"
        style={{ paddingLeft: `${depth * 24 + 12}px` }}
      >
        {hasChildren ? (
          <button onClick={() => onToggle(node.id)} className="p-0.5 text-gray-400 hover:text-gray-600">
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        ) : (
          <div className="w-5" />
        )}
        <Layers className="w-4 h-4 text-indigo-400 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900 dark:text-white text-sm">{node.name}</span>
            <span className="text-xs text-gray-400 font-mono">{node.code}</span>
            {!node.is_active && <span className="text-xs px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-600 text-gray-500">{t('itemTypesInactive')}</span>}
            {hasChildren && <span className="text-xs text-gray-400">({node.children.length})</span>}
          </div>
          {node.fields_schema && node.fields_schema.length > 0 && (
            <div className="text-xs text-gray-400 mt-0.5">{t('itemTypesFields')} {node.fields_schema.length}</div>
          )}
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onManageFields(node)} className="px-2 py-1 text-xs text-indigo-600 hover:bg-indigo-50 rounded">{t('itemTypesManageFields')}</button>
          <button onClick={() => onEdit(node)} className="p-1 text-gray-400 hover:text-indigo-600 rounded"><Edit2 className="w-4 h-4" /></button>
          <button onClick={() => onDelete(node.id)} className="p-1 text-gray-400 hover:text-red-600 rounded"><Trash2 className="w-4 h-4" /></button>
        </div>
      </div>
      {isExpanded && node.children.map(child => (
        <TreeItem key={child.id} node={child} depth={depth + 1} onEdit={onEdit} onDelete={onDelete}
          onManageFields={onManageFields} expanded={expanded} onToggle={onToggle} />
      ))}
    </div>
  )
}

export default function ItemTypesPage() {
  const { t } = useTranslation()
  const [types, setTypes] = useState<ItemType[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editType, setEditType] = useState<ItemType | null>(null)
  const [form, setForm] = useState({ name: '', code: '', display_order: '0', parent: '' as string })
  const [showFields, setShowFields] = useState<ItemType | null>(null)
  const [fields, setFields] = useState<Array<{ key: string; label: string; field_type: string; required: boolean }>>([])
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const [search, setSearch] = useState('')

  const load = () => { setLoading(true); financeApi.itemTypes().then(r => { setTypes(r.data); setLoading(false) }).catch(() => setLoading(false)) }
  useEffect(load, [])

  const tree = useMemo(() => {
    const filtered = search
      ? types.filter(it => it.name.includes(search) || it.code.includes(search))
      : types
    return buildTree(filtered)
  }, [types, search])

  const parentOptions = useMemo(() => {
    if (!editType) return types.filter(t => t.is_active)
    // Exclude the item being edited and its descendants
    const descIds = new Set<number>()
    const collect = (id: number) => {
      descIds.add(id)
      types.filter(t => t.parent === id).forEach(c => collect(c.id))
    }
    collect(editType.id)
    return types.filter(t => t.is_active && t.id !== editType.id && !descIds.has(t.id))
  }, [types, editType])

  const toggleExpand = (id: number) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const expandAll = () => setExpanded(new Set(types.map(t => t.id)))
  const collapseAll = () => setExpanded(new Set())

  const handleSave = async () => {
    const data: Record<string, unknown> = { ...form, parent: form.parent ? Number(form.parent) : null, display_order: Number(form.display_order) }
    if (editType) await financeApi.updateItemType(editType.id, data)
    else await financeApi.createItemType(data)
    setShowForm(false); setEditType(null); load()
  }

  const handleDelete = async (id: number) => {
    if (!confirm(t('itemTypesDeleteConfirm'))) return
    await financeApi.deleteItemType(id); load()
  }

  const handleSaveFields = async () => {
    if (!showFields) return
    await financeApi.setItemTypeFields(showFields.id, fields)
    setShowFields(null); load()
  }

  const startEdit = (ty: ItemType) => {
    setEditType(ty)
    setForm({ name: ty.name, code: ty.code, display_order: String(ty.display_order), parent: ty.parent ? String(ty.parent) : '' })
    setShowForm(true)
  }

  return (
    <div className="p-6 space-y-4" dir="rtl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('itemTypesTitle')}</h1>
        <button onClick={() => { setShowForm(true); setEditType(null); setForm({ name: '', code: '', display_order: '0', parent: '' }) }} className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm"><Plus className="w-4 h-4" /> {t('itemTypesAdd')}</button>
      </div>
      <div className="flex items-center gap-2">
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder={t('itemTypesSearch')} className="flex-1 px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600" />
        <button onClick={expandAll} className="px-3 py-2 text-xs border rounded-lg hover:bg-gray-50 dark:border-gray-600">{t('itemTypesExpandAll')}</button>
        <button onClick={collapseAll} className="px-3 py-2 text-xs border rounded-lg hover:bg-gray-50 dark:border-gray-600">{t('itemTypesCollapseAll')}</button>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-xl border divide-y dark:divide-gray-700">
        {loading ? <div className="text-center py-8 text-gray-400">{t('loading')}</div>
          : tree.length === 0 ? <div className="text-center py-8 text-gray-400">{t('payNoData')}</div>
          : tree.map(node => (
            <TreeItem key={node.id} node={node} depth={0} onEdit={startEdit} onDelete={handleDelete}
              onManageFields={(ty) => { setShowFields(ty); setFields((ty.fields_schema || []).map(f => ({ key: f.key, label: f.label, field_type: f.field_type, required: f.required }))) }}
              expanded={expanded} onToggle={toggleExpand} />
          ))}
      </div>

      {/* Create/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md space-y-4">
            <h3 className="text-lg font-bold">{editType ? t('itemTypesEdit') : t('itemTypesCreate')}</h3>
            <div className="space-y-3">
              <input placeholder={t('itemTypesPlaceholderName')} value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600" />
              <input placeholder={t('itemTypesPlaceholderCode')} value={form.code} onChange={e => setForm({...form, code: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600" />
              <select value={form.parent} onChange={e => setForm({...form, parent: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600">
                <option value="">{t('itemTypesParentNone')}</option>
                {parentOptions.map(p => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
              </select>
              <input placeholder={t('itemTypesPlaceholderOrder')} type="number" value={form.display_order} onChange={e => setForm({...form, display_order: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600" />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => { setShowForm(false); setEditType(null) }} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">{t('cancel')}</button>
              <button onClick={handleSave} className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">{t('save')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Fields Modal */}
      {showFields && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-lg space-y-4">
            <h3 className="text-lg font-bold">{t('itemTypesFieldsTitle')} {showFields.name}</h3>
            <div className="space-y-2">
              {fields.map((f, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input placeholder={t('itemTypesFieldKey')} value={f.key} onChange={e => { const n=[...fields]; n[i].key=e.target.value; setFields(n) }} className="flex-1 px-2 py-1.5 border rounded text-xs dark:bg-gray-700 dark:border-gray-600" />
                  <input placeholder={t('itemTypesFieldLabel')} value={f.label} onChange={e => { const n=[...fields]; n[i].label=e.target.value; setFields(n) }} className="flex-1 px-2 py-1.5 border rounded text-xs dark:bg-gray-700 dark:border-gray-600" />
                  <select value={f.field_type} onChange={e => { const n=[...fields]; n[i].field_type=e.target.value; setFields(n) }} className="px-2 py-1.5 border rounded text-xs dark:bg-gray-700 dark:border-gray-600">
                    <option value="text">{t('itemTypesFieldTypeText')}</option><option value="number">{t('itemTypesFieldTypeNumber')}</option><option value="date">{t('itemTypesFieldTypeDate')}</option><option value="select">{t('itemTypesFieldTypeSelect')}</option>
                  </select>
                  <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={f.required} onChange={e => { const n=[...fields]; n[i].required=e.target.checked; setFields(n) }} /> {t('itemTypesFieldRequired')}</label>
                  <button onClick={() => setFields(fields.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600 text-xs">{t('itemTypesFieldDelete')}</button>
                </div>
              ))}
            </div>
            <button onClick={() => setFields([...fields, { key: '', label: '', field_type: 'text', required: false }])} className="text-xs text-indigo-600 hover:text-indigo-800">{t('itemTypesFieldAdd')}</button>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowFields(null)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">{t('cancel')}</button>
              <button onClick={handleSaveFields} className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">{t('itemTypesFieldsSave')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
