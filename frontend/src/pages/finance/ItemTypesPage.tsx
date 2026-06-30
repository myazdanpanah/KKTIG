import { useState, useEffect } from 'react'
import { financeApi } from '../../api/finance'
import { Plus, Edit2, Trash2 } from 'lucide-react'

interface ItemType { id: number; name: string; code: string; display_order: number; is_active: boolean; fields_schema?: Array<{id: number; key: string; label: string; field_type: string; required: boolean}> }

export default function ItemTypesPage() {
  const [types, setTypes] = useState<ItemType[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editType, setEditType] = useState<ItemType | null>(null)
  const [form, setForm] = useState({ name: '', code: '', display_order: '0' })
  const [showFields, setShowFields] = useState<ItemType | null>(null)
  const [fields, setFields] = useState<Array<{key: string; label: string; field_type: string; required: boolean}>>([])

  const load = () => { setLoading(true); financeApi.itemTypes().then(r => { setTypes(r.data); setLoading(false) }).catch(() => setLoading(false)) }
  useEffect(load, [])

  const handleSave = async () => {
    if (editType) await financeApi.updateItemType(editType.id, form)
    else await financeApi.createItemType(form)
    setShowForm(false); setEditType(null); load()
  }

  const handleDelete = async (id: number) => {
    if (!confirm('آیا از حذف اطمینان دارید؟')) return
    await financeApi.deleteItemType(id); load()
  }

  const handleSaveFields = async () => {
    if (!showFields) return
    await financeApi.setItemTypeFields(showFields.id, fields)
    setShowFields(null); load()
  }

  return (
    <div className="p-6 space-y-4" dir="rtl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">انواع آیتم</h1>
        <button onClick={() => { setShowForm(true); setEditType(null); setForm({ name: '', code: '', display_order: '0' }) }} className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm"><Plus className="w-4 h-4" /> افزودن</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? <div className="text-center py-8 text-gray-400 col-span-3">بارگذاری...</div>
        : types.map(t => (
          <div key={t.id} className="bg-white dark:bg-gray-800 rounded-xl border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-bold text-gray-900 dark:text-white">{t.name}</div>
                <div className="text-xs text-gray-400 font-mono">{t.code}</div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => { setEditType(t); setForm({ name: t.name, code: t.code, display_order: String(t.display_order) }); setShowForm(true) }} className="p-1 text-gray-400 hover:text-indigo-600"><Edit2 className="w-4 h-4" /></button>
                <button onClick={() => handleDelete(t.id)} className="p-1 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
            <div className="text-xs text-gray-400">فیلدها: {t.fields_schema?.length || 0}</div>
            <button onClick={() => { setShowFields(t); setFields((t.fields_schema || []).map(f => ({ key: f.key, label: f.label, field_type: f.field_type, required: f.required }))) }} className="text-xs text-indigo-600 hover:text-indigo-800">مدیریت فیلدها</button>
          </div>
        ))}
      </div>
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md space-y-4">
            <h3 className="text-lg font-bold">{editType ? 'ویرایش' : 'افزودن'} نوع آیتم</h3>
            <div className="space-y-3">
              <input placeholder="نام" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700" />
              <input placeholder="کد" value={form.code} onChange={e => setForm({...form, code: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700" />
              <input placeholder="ترتیب نمایش" type="number" value={form.display_order} onChange={e => setForm({...form, display_order: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700" />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => { setShowForm(false); setEditType(null) }} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">لغو</button>
              <button onClick={handleSave} className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">ذخیره</button>
            </div>
          </div>
        </div>
      )}
      {showFields && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-lg space-y-4">
            <h3 className="text-lg font-bold">فیلدهای {showFields.name}</h3>
            <div className="space-y-2">
              {fields.map((f, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input placeholder="کلید" value={f.key} onChange={e => { const n=[...fields]; n[i].key=e.target.value; setFields(n) }} className="flex-1 px-2 py-1.5 border rounded text-xs dark:bg-gray-700" />
                  <input placeholder="برچسب" value={f.label} onChange={e => { const n=[...fields]; n[i].label=e.target.value; setFields(n) }} className="flex-1 px-2 py-1.5 border rounded text-xs dark:bg-gray-700" />
                  <select value={f.field_type} onChange={e => { const n=[...fields]; n[i].field_type=e.target.value; setFields(n) }} className="px-2 py-1.5 border rounded text-xs dark:bg-gray-700">
                    <option value="text">متن</option><option value="number">عدد</option><option value="date">تاریخ</option><option value="select">انتخابی</option>
                  </select>
                  <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={f.required} onChange={e => { const n=[...fields]; n[i].required=e.target.checked; setFields(n) }} /> اجباری</label>
                  <button onClick={() => setFields(fields.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600 text-xs">حذف</button>
                </div>
              ))}
            </div>
            <button onClick={() => setFields([...fields, { key: '', label: '', field_type: 'text', required: false }])} className="text-xs text-indigo-600 hover:text-indigo-800">+ افزودن فیلد</button>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowFields(null)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">لغو</button>
              <button onClick={handleSaveFields} className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">ذخیره فیلدها</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
