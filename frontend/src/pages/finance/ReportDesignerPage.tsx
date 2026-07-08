import { useState, useEffect, useRef, useCallback } from 'react'
import { financeApi } from '../../api/finance'
import { useTranslation } from '../../utils/i18n'
import {
  Type, Image, Minus, Square, Hash, Table, Grid3X3,
  Trash2, Copy, Undo2, Redo2, ZoomIn, ZoomOut,
  Save, Eye, EyeOff, ArrowUp, ArrowDown, AlignLeft,
  AlignCenter, AlignRight, Settings,
  ChevronDown, ChevronRight, Layers, FileText, Download
} from 'lucide-react'

// ─── Types ──────────────────────────────────────────────────
interface ReportElement {
  id: string
  type: 'text' | 'dataField' | 'line' | 'rectangle' | 'image' | 'pageNumber' | 'totalPages' | 'table'
  x: number
  y: number
  width: number
  height: number
  text?: string
  dataBinding?: string
  lineDirection?: 'horizontal' | 'vertical'
  src?: string
  style: ElementStyle
  locked?: boolean
  visible?: boolean
  zIndex?: number
}

interface ElementStyle {
  fontSize: number
  fontFamily: string
  bold: boolean
  italic: boolean
  underline: boolean
  textAlign: 'left' | 'center' | 'right'
  verticalAlign: 'top' | 'middle' | 'bottom'
  color: string
  backgroundColor: string
  borderColor: string
  borderWidth: number
  borderStyle: string
}

interface PageSettings {
  width: number
  height: number
  marginTop: number
  marginRight: number
  marginBottom: number
  marginLeft: number
  orientation: 'portrait' | 'landscape'
  background: string
}

interface DataField {
  key: string
  label: string
  type: string
}

interface DataGroup {
  label: string
  fields: DataField[]
}

interface TemplateData {
  id?: number
  name: string
  doc_kind: string
  template_json: {
    elements: ReportElement[]
    page: PageSettings
    settings: Record<string, unknown>
  }
  is_default: boolean
  version?: number
}

const PAGE_SIZES: Record<string, { width: number; height: number }> = {
  A4: { width: 794, height: 1123 },
  A5: { width: 559, height: 794 },
  Letter: { width: 816, height: 1056 },
}

const DEFAULT_STYLE: ElementStyle = {
  fontSize: 12,
  fontFamily: 'B Nazanin',
  bold: false,
  italic: false,
  underline: false,
  textAlign: 'left',
  verticalAlign: 'top',
  color: '#000000',
  backgroundColor: 'transparent',
  borderColor: '#000000',
  borderWidth: 0,
  borderStyle: 'solid',
}

const ELEMENT_DEFAULTS: Record<string, Partial<ReportElement>> = {
  text: { width: 200, height: 30, text: 'متن جدید' },
  dataField: { width: 180, height: 28, dataBinding: '' },
  line: { width: 200, height: 2, lineDirection: 'horizontal' },
  rectangle: { width: 200, height: 100, style: { ...DEFAULT_STYLE, borderWidth: 1, backgroundColor: '#f8f8f8' } },
  image: { width: 120, height: 80, src: '' },
  pageNumber: { width: 60, height: 28 },
  totalPages: { width: 60, height: 28 },
  table: { width: 700, height: 200 },
}

const TOOLBOX_ITEMS = [
  { type: 'text' as const, icon: Type, label: 'متن' },
  { type: 'dataField' as const, icon: Hash, label: 'فیلد داده' },
  { type: 'line' as const, icon: Minus, label: 'خط' },
  { type: 'rectangle' as const, icon: Square, label: 'مستطیل' },
  { type: 'image' as const, icon: Image, label: 'تصویر' },
  { type: 'pageNumber' as const, icon: FileText, label: 'شماره صفحه' },
  { type: 'totalPages' as const, icon: Grid3X3, label: 'تعداد صفحات' },
  { type: 'table' as const, icon: Table, label: 'جدول' },
]

const DOC_KINDS = [
  { value: 'invoice', label: 'صورتحساب' },
  { value: 'notice', label: 'اطلاعیه واریز' },
  { value: 'creditor', label: 'بستانکاری' },
]

let _idCounter = 0
const genId = () => `el_${Date.now()}_${++_idCounter}`

const defaultPageSettings = (): PageSettings => ({
  width: 794, height: 1123,
  marginTop: 40, marginRight: 40, marginBottom: 40, marginLeft: 40,
  orientation: 'portrait', background: '#ffffff',
})

const defaultElementStyle = (type: string): ElementStyle => {
  if (type === 'line') return { ...DEFAULT_STYLE, borderWidth: 2 }
  if (type === 'rectangle') return { ...DEFAULT_STYLE, borderWidth: 1, backgroundColor: '#f8f8f8' }
  return { ...DEFAULT_STYLE }
}

// ─── Main Component ─────────────────────────────────────────
export default function ReportDesignerPage() {
  const { t } = useTranslation()

  // Template state
  const [templates, setTemplates] = useState<TemplateData[]>([])
  const [, setCurrentTemplate] = useState<TemplateData | null>(null)
  const [templateName, setTemplateName] = useState('قالب جدید')
  const [docKind, setDocKind] = useState('invoice')

  // Design state
  const [elements, setElements] = useState<ReportElement[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [page, setPage] = useState<PageSettings>(defaultPageSettings())
  const [history, setHistory] = useState<ReportElement[][]>([[]])
  const [historyIdx, setHistoryIdx] = useState(0)

  // UI state
  const [zoom, setZoom] = useState(0.7)
  const [showGrid, setShowGrid] = useState(true)
  const [showPreview, setShowPreview] = useState(false)
  const [previewHtml, setPreviewHtml] = useState('')
  const [showDataPanel, setShowDataPanel] = useState(true)
  const [showTemplateList, setShowTemplateList] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dataSchema, setDataSchema] = useState<Record<string, DataGroup>>({})

  // Drag state
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [dragElementStart, setDragElementStart] = useState({ x: 0, y: 0 })

  // Resize state
  const [isResizing, setIsResizing] = useState(false)
  const [resizeHandle, setResizeHandle] = useState('')
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, w: 0, h: 0, ex: 0, ey: 0 })

  const canvasRef = useRef<HTMLDivElement>(null)
  const undoLimit = 50

  // ─── Selection helpers ──────────────────────────────────
  const selectedElement = elements.find(el => el.id === selectedId) || null

  // ─── Load templates ─────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    Promise.all([
      financeApi.templates().catch(() => ({ data: [] })),
      financeApi.templateDataSchema().catch(() => ({ data: {} })),
    ]).then(([tmplRes, schemaRes]) => {
      if (cancelled) return
      setTemplates(tmplRes.data)
      setDataSchema(schemaRes.data)
      // Load default template or create empty
      const defaultTmpl = tmplRes.data.find((t: TemplateData) => t.is_default && t.doc_kind === 'invoice')
      if (defaultTmpl) {
        loadTemplate(defaultTmpl)
      }
      setLoading(false)
    }).catch(() => {
      if (!cancelled) setLoading(false)
    })
    return () => { cancelled = true }
  }, [])

  const loadTemplate = (tmpl: TemplateData) => {
    setCurrentTemplate(tmpl)
    setTemplateName(tmpl.name)
    setDocKind(tmpl.doc_kind)
    const tj = tmpl.template_json || { elements: [], page: defaultPageSettings(), settings: {} }
    setElements(tj.elements || [])
    setPage(tj.page || defaultPageSettings())
    setSelectedId(null)
    setHistory([tj.elements || []])
    setHistoryIdx(0)
  }

  // ─── History ────────────────────────────────────────────
  const pushHistory = useCallback((newElements: ReportElement[]) => {
    setHistory(prev => {
      const trimmed = prev.slice(0, historyIdx + 1)
      const next = [...trimmed, newElements]
      if (next.length > undoLimit) next.shift()
      return next
    })
    setHistoryIdx(prev => Math.min(prev + 1, undoLimit - 1))
  }, [historyIdx])

  const undo = () => {
    if (historyIdx > 0) {
      setHistoryIdx(historyIdx - 1)
      setElements(history[historyIdx - 1])
      setSelectedId(null)
    }
  }

  const redo = () => {
    if (historyIdx < history.length - 1) {
      setHistoryIdx(historyIdx + 1)
      setElements(history[historyIdx + 1])
      setSelectedId(null)
    }
  }

  // ─── Element operations ─────────────────────────────────
  const addElement = (type: ReportElement['type']) => {
    const defaults = ELEMENT_DEFAULTS[type] || {}
    const newEl: ReportElement = {
      id: genId(),
      type,
      x: (page.marginLeft || 40) + Math.random() * 100,
      y: (page.marginTop || 40) + Math.random() * 100,
      width: defaults.width || 200,
      height: defaults.height || 30,
      text: defaults.text || '',
      dataBinding: defaults.dataBinding || '',
      lineDirection: defaults.lineDirection || 'horizontal',
      src: defaults.src || '',
      style: { ...defaultElementStyle(type), ...(defaults.style || {}) },
      locked: false,
      visible: true,
      zIndex: elements.length,
    }
    const next = [...elements, newEl]
    setElements(next)
    setSelectedId(newEl.id)
    pushHistory(next)
  }

  const updateElement = (id: string, changes: Partial<ReportElement>) => {
    setElements(prev => {
      const next = prev.map(el => el.id === id ? { ...el, ...changes } : el)
      return next
    })
  }

  const updateElementStyle = (id: string, styleChanges: Partial<ElementStyle>) => {
    setElements(prev => {
      const next = prev.map(el => el.id === id ? { ...el, style: { ...el.style, ...styleChanges } } : el)
      return next
    })
  }

  const deleteElement = (id: string) => {
    const next = elements.filter(el => el.id !== id)
    setElements(next)
    if (selectedId === id) setSelectedId(null)
    pushHistory(next)
  }

  const duplicateElement = (id: string) => {
    const el = elements.find(e => e.id === id)
    if (!el) return
    const newEl = { ...el, id: genId(), x: el.x + 20, y: el.y + 20 }
    const next = [...elements, newEl]
    setElements(next)
    setSelectedId(newEl.id)
    pushHistory(next)
  }

  const bringForward = (id: string) => {
    setElements(prev => {
      const sorted = [...prev].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0))
      const idx = sorted.findIndex(el => el.id === id)
      if (idx < sorted.length - 1) {
        const temp = sorted[idx].zIndex
        sorted[idx].zIndex = sorted[idx + 1].zIndex
        sorted[idx + 1].zIndex = temp
      }
      return sorted
    })
  }

  const sendBackward = (id: string) => {
    setElements(prev => {
      const sorted = [...prev].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0))
      const idx = sorted.findIndex(el => el.id === id)
      if (idx > 0) {
        const temp = sorted[idx].zIndex
        sorted[idx].zIndex = sorted[idx - 1].zIndex
        sorted[idx - 1].zIndex = temp
      }
      return sorted
    })
  }

  // ─── Keyboard shortcuts ─────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedId) {
          e.preventDefault()
          deleteElement(selectedId)
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault()
        if (e.shiftKey) redo(); else undo()
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault()
        if (selectedId) duplicateElement(selectedId)
      }
      if (e.key === 'Escape') setSelectedId(null)
      // Arrow keys for nudging
      if (selectedId && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault()
        const delta = e.shiftKey ? 10 : 1
        const el = elements.find(el => el.id === selectedId)
        if (el && !el.locked) {
          const changes: Partial<ReportElement> = {}
          if (e.key === 'ArrowUp') changes.y = el.y - delta
          if (e.key === 'ArrowDown') changes.y = el.y + delta
          if (e.key === 'ArrowLeft') changes.x = el.x - delta
          if (e.key === 'ArrowRight') changes.x = el.x + delta
          updateElement(selectedId, changes)
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [selectedId, elements])

  // ─── Canvas mouse events ────────────────────────────────
  const canvasToPage = (clientX: number, clientY: number) => {
    if (!canvasRef.current) return { x: 0, y: 0 }
    const rect = canvasRef.current.getBoundingClientRect()
    return {
      x: (clientX - rect.left) / zoom,
      y: (clientY - rect.top) / zoom,
    }
  }

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.target === canvasRef.current || (e.target as HTMLElement).classList.contains('canvas-inner')) {
      setSelectedId(null)
    }
  }

  const handleElementMouseDown = (e: React.MouseEvent, el: ReportElement) => {
    e.stopPropagation()
    if (el.locked) { setSelectedId(el.id); return }
    setSelectedId(el.id)
    setIsDragging(true)
    setDragStart(canvasToPage(e.clientX, e.clientY))
    setDragElementStart({ x: el.x, y: el.y })
  }

  const handleResizeMouseDown = (e: React.MouseEvent, handle: string, el: ReportElement) => {
    e.stopPropagation()
    setIsResizing(true)
    setResizeHandle(handle)
    setResizeStart({
      x: el.x, y: el.y, w: el.width, h: el.height,
      ex: canvasToPage(e.clientX, e.clientY).x,
      ey: canvasToPage(e.clientX, e.clientY).y,
    })
  }

  useEffect(() => {
    if (!isDragging && !isResizing) return
    const handleMouseMove = (e: MouseEvent) => {
      const pos = canvasToPage(e.clientX, e.clientY)
      if (isDragging && selectedId) {
        const dx = pos.x - dragStart.x
        const dy = pos.y - dragStart.y
        updateElement(selectedId, {
          x: Math.round((dragElementStart.x + dx) / 5) * 5,
          y: Math.round((dragElementStart.y + dy) / 5) * 5,
        })
      }
      if (isResizing && selectedId) {
        const dx = pos.x - resizeStart.ex
        const dy = pos.y - resizeStart.ey
        const el = elements.find(el => el.id === selectedId)
        if (!el) return
        let newX = resizeStart.x, newY = resizeStart.y
        let newW = resizeStart.w, newH = resizeStart.h
        if (resizeHandle.includes('e')) newW = Math.max(20, resizeStart.w + dx)
        if (resizeHandle.includes('w')) { newW = Math.max(20, resizeStart.w - dx); newX = resizeStart.x + dx }
        if (resizeHandle.includes('s')) newH = Math.max(10, resizeStart.h + dy)
        if (resizeHandle.includes('n')) { newH = Math.max(10, resizeStart.h - dy); newY = resizeStart.y + dy }
        updateElement(selectedId, {
          x: Math.round(newX / 5) * 5, y: Math.round(newY / 5) * 5,
          width: Math.round(newW / 5) * 5, height: Math.round(newH / 5) * 5,
        })
      }
    }
    const handleMouseUp = () => {
      if (isDragging || isResizing) {
        setElements(prev => {
          pushHistory(prev)
          return prev
        })
      }
      setIsDragging(false)
      setIsResizing(false)
    }
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, isResizing, selectedId, dragStart, dragElementStart, resizeStart, resizeHandle])

  // ─── Template save/load ─────────────────────────────────
  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      await financeApi.saveActiveTemplate({
        name: templateName,
        doc_kind: docKind,
        elements,
        page,
        settings: {},
      })
      // Reload templates list
      const res = await financeApi.templates()
      setTemplates(res.data)
    } catch {
      setError('خطا در ذخیره قالب')
      setTimeout(() => setError(null), 4000)
    }
    setSaving(false)
  }

  const handlePreview = async () => {
    try {
      const res = await financeApi.templatePreview({ template_json: { elements, page } })
      setPreviewHtml(res.data.html)
      setShowPreview(true)
    } catch {
      setError('خطا در پیش‌نمایش')
      setTimeout(() => setError(null), 4000)
    }
  }

  const handleExportJson = () => {
    const data = JSON.stringify({ name: templateName, doc_kind: docKind, elements, page }, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `${templateName}.json`; a.click()
    URL.revokeObjectURL(url)
  }

  const handleImportJson = () => {
    const input = document.createElement('input')
    input.type = 'file'; input.accept = '.json'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target?.result as string)
          if (data.elements) setElements(data.elements)
          if (data.page) setPage(data.page)
          if (data.name) setTemplateName(data.name)
          if (data.doc_kind) setDocKind(data.doc_kind)
        } catch { setError('خطا در خواندن فایل'); setTimeout(() => setError(null), 3000) }
      }
      reader.readAsText(file)
    }
    input.click()
  }

  // ─── Render ─────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600" />
      </div>
    )
  }

  const scaledPageW = page.width * zoom
  const scaledPageH = page.height * zoom

  return (
    <div className="h-screen flex flex-col bg-gray-100 dark:bg-gray-950 overflow-hidden select-none">
      {/* ── Top Toolbar ─────────────────────────────────── */}
      <div className="h-12 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center px-3 gap-2 flex-shrink-0 z-20">
        <div className="flex items-center gap-2 mr-3">
          <Layers className="w-5 h-5 text-emerald-600" />
          <span className="text-sm font-bold text-gray-900 dark:text-white hidden md:inline">{t('finReportDesigner')}</span>
        </div>

        {/* Template selector */}
        <div className="relative">
          <button onClick={() => setShowTemplateList(!showTemplateList)} className="flex items-center gap-1 px-2 py-1 text-xs border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 dark:border-gray-700">
            <span className="max-w-[120px] truncate">{templateName}</span>
            <ChevronDown className="w-3 h-3" />
          </button>
          {showTemplateList && (
            <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 border rounded-xl shadow-xl w-64 z-50 p-2 max-h-60 overflow-y-auto">
              {DOC_KINDS.map(dk => (
                <div key={dk.value} className="mb-2">
                  <div className="text-[10px] font-bold text-gray-400 uppercase px-2 mb-1">{dk.label}</div>
                  {templates.filter(t => t.doc_kind === dk.value).map(tmpl => (
                    <button key={tmpl.id} onClick={() => { loadTemplate(tmpl); setShowTemplateList(false) }}
                      className={`w-full text-right px-2 py-1.5 text-xs rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 ${tmpl.is_default ? 'font-bold' : ''}`}>
                      {tmpl.is_default && <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />}
                      <span className="truncate">{tmpl.name}</span>
                      <span className="text-[10px] text-gray-400 mr-auto">v{tmpl.version}</span>
                    </button>
                  ))}
                </div>
              ))}
              {templates.length === 0 && <div className="text-xs text-gray-400 text-center py-2">هنوز قالبی ذخیره نشده</div>}
            </div>
          )}
        </div>

        <div className="w-px h-6 bg-gray-200 dark:bg-gray-700" />

        {/* Doc Kind */}
        <select value={docKind} onChange={e => setDocKind(e.target.value)}
          className="px-2 py-1 text-xs border rounded-lg dark:bg-gray-800 dark:border-gray-700">
          {DOC_KINDS.map(dk => <option key={dk.value} value={dk.value}>{dk.label}</option>)}
        </select>

        <div className="w-px h-6 bg-gray-200 dark:bg-gray-700" />

        {/* History */}
        <button onClick={undo} disabled={historyIdx <= 0} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg disabled:opacity-30" title="Undo (Ctrl+Z)">
          <Undo2 className="w-4 h-4" />
        </button>
        <button onClick={redo} disabled={historyIdx >= history.length - 1} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg disabled:opacity-30" title="Redo (Ctrl+Shift+Z)">
          <Redo2 className="w-4 h-4" />
        </button>

        <div className="w-px h-6 bg-gray-200 dark:bg-gray-700" />

        {/* Zoom */}
        <button onClick={() => setZoom(z => Math.max(0.25, z - 0.1))} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
          <ZoomOut className="w-4 h-4" />
        </button>
        <span className="text-[10px] text-gray-500 w-10 text-center">{Math.round(zoom * 100)}%</span>
        <button onClick={() => setZoom(z => Math.min(2, z + 0.1))} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
          <ZoomIn className="w-4 h-4" />
        </button>

        <div className="w-px h-6 bg-gray-200 dark:bg-gray-700" />

        {/* Grid toggle */}
        <button onClick={() => setShowGrid(!showGrid)} className={`p-1.5 rounded-lg ${showGrid ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`} title="Grid">
          <Grid3X3 className="w-4 h-4" />
        </button>

        {/* Data panel toggle */}
        <button onClick={() => setShowDataPanel(!showDataPanel)} className={`p-1.5 rounded-lg ${showDataPanel ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`} title="Data Fields">
          <Hash className="w-4 h-4" />
        </button>

        <div className="flex-1" />

        {/* Template name */}
        <input value={templateName} onChange={e => setTemplateName(e.target.value)}
          className="px-2 py-1 text-xs border rounded-lg w-40 dark:bg-gray-800 dark:border-gray-700 dark:text-white" placeholder="نام قالب" />

        <div className="w-px h-6 bg-gray-200 dark:bg-gray-700" />

        {/* Actions */}
        <button onClick={handleImportJson} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg" title="Import JSON">
          <Download className="w-4 h-4" />
        </button>
        <button onClick={handleExportJson} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg" title="Export JSON">
          <Settings className="w-4 h-4" />
        </button>
        <button onClick={handlePreview} className="flex items-center gap-1 px-2 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Eye className="w-3.5 h-3.5" /> {t('finTemplatePreview')}
        </button>
        <button onClick={handleSave} disabled={saving} className="flex items-center gap-1 px-2 py-1.5 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50">
          <Save className="w-3.5 h-3.5" /> {saving ? t('loading') : t('save')}
        </button>
      </div>

      {/* ── Main Area ──────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── Left Toolbox ─────────────────────────────── */}
        <div className="w-52 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col flex-shrink-0 z-10">
          <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-800 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
            {t('finToolbox')}
          </div>
          <div className="p-2 space-y-1 overflow-y-auto flex-1">
            {TOOLBOX_ITEMS.map(item => (
              <button key={item.type} onClick={() => addElement(item.type)}
                className="w-full flex items-center gap-2 px-2.5 py-2 text-xs rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-700 dark:hover:text-emerald-300 transition text-gray-700 dark:text-gray-300">
                <item.icon className="w-4 h-4 flex-shrink-0" />
                <span>{item.label}</span>
              </button>
            ))}
          </div>

          {/* Page settings */}
          <div className="border-t border-gray-100 dark:border-gray-800 p-2 space-y-2">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1">{t('finPageSize')}</div>
            <select value={`${page.width}x${page.height}`} onChange={e => {
              const [w, h] = e.target.value.split('x').map(Number)
              setPage(p => ({ ...p, width: w, height: h }))
            }} className="w-full px-2 py-1.5 text-xs border rounded-lg dark:bg-gray-800 dark:border-gray-700">
              {Object.entries(PAGE_SIZES).map(([k, v]) => (
                <option key={k} value={`${v.width}x${v.height}`}>{k} ({v.width}×{v.height})</option>
              ))}
            </select>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => ({ ...p, orientation: 'portrait', width: 794, height: 1123 }))}
                className={`flex-1 px-2 py-1 text-[10px] rounded border ${page.orientation === 'portrait' ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'dark:border-gray-700'}`}>
                افقی
              </button>
              <button onClick={() => setPage(p => ({ ...p, orientation: 'landscape', width: 1123, height: 794 }))}
                className={`flex-1 px-2 py-1 text-[10px] rounded border ${page.orientation === 'landscape' ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'dark:border-gray-700'}`}>
                عمودی
              </button>
            </div>
            <div className="grid grid-cols-2 gap-1">
              {[['marginTop', 'بالا'], ['marginRight', 'راست'], ['marginBottom', 'پایین'], ['marginLeft', 'چپ']].map(([key, label]) => (
                <div key={key} className="flex items-center gap-1">
                  <span className="text-[9px] text-gray-400 w-6">{label}</span>
                  <input type="number" value={page[key as keyof PageSettings] as number}
                    onChange={e => setPage(p => ({ ...p, [key]: Number(e.target.value) }))}
                    className="flex-1 px-1 py-0.5 text-[10px] border rounded dark:bg-gray-800 dark:border-gray-700 w-full" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Center Canvas ────────────────────────────── */}
        <div className="flex-1 overflow-auto flex items-start justify-center bg-gray-200 dark:bg-gray-950 p-6"
          onMouseDown={handleCanvasMouseDown}>
          <div ref={canvasRef}
            className="relative shadow-2xl"
            style={{ width: scaledPageW, height: scaledPageH, background: page.background }}>
            {/* Grid overlay */}
            {showGrid && (
              <svg className="absolute inset-0 pointer-events-none" width={scaledPageW} height={scaledPageH} style={{ opacity: 0.15 }}>
                {Array.from({ length: Math.ceil(page.width / 25) + 1 }).map((_, i) => (
                  <line key={`v${i}`} x1={i * 25 * zoom} y1={0} x2={i * 25 * zoom} y2={scaledPageH} stroke="#888" strokeWidth={i % 4 === 0 ? 0.8 : 0.3} />
                ))}
                {Array.from({ length: Math.ceil(page.height / 25) + 1 }).map((_, i) => (
                  <line key={`h${i}`} x1={0} y1={i * 25 * zoom} x2={scaledPageW} y2={i * 25 * zoom} stroke="#888" strokeWidth={i % 4 === 0 ? 0.8 : 0.3} />
                ))}
              </svg>
            )}
            {/* Margin guides */}
            <div className="absolute pointer-events-none border border-dashed border-blue-300/40 dark:border-blue-600/30"
              style={{ left: page.marginLeft * zoom, top: page.marginTop * zoom,
                width: (page.width - page.marginLeft - page.marginRight) * zoom,
                height: (page.height - page.marginTop - page.marginBottom) * zoom }} />
            {/* Elements */}
            {elements.filter(el => el.visible !== false).sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0)).map(el => (
              <div key={el.id}
                className={`absolute ${selectedId === el.id ? 'ring-2 ring-blue-500 ring-offset-1 ring-offset-transparent' : ''} ${el.locked ? 'cursor-default' : 'cursor-move'}`}
                style={{ left: el.x * zoom, top: el.y * zoom, width: el.width * zoom, height: el.height * zoom, zIndex: el.zIndex || 0 }}
                onMouseDown={e => handleElementMouseDown(e, el)}>
                {/* Element content */}
                {el.type === 'text' && (
                  <div className="w-full h-full overflow-hidden flex items-start p-0.5" style={{
                    fontSize: el.style.fontSize * zoom,
                    fontFamily: el.style.fontFamily,
                    fontWeight: el.style.bold ? 'bold' : 'normal',
                    fontStyle: el.style.italic ? 'italic' : 'normal',
                    textDecoration: el.style.underline ? 'underline' : 'none',
                    textAlign: el.style.textAlign,
                    color: el.style.color,
                    backgroundColor: el.style.backgroundColor !== 'transparent' ? el.style.backgroundColor : undefined,
                    border: el.style.borderWidth > 0 ? `${el.style.borderWidth * zoom}px ${el.style.borderStyle} ${el.style.borderColor}` : 'none',
                    whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.3,
                  }}>{el.text || ''}</div>
                )}
                {el.type === 'dataField' && (
                  <div className="w-full h-full overflow-hidden flex items-center gap-1 px-1" style={{
                    fontSize: el.style.fontSize * zoom,
                    fontFamily: el.style.fontFamily,
                    fontWeight: el.style.bold ? 'bold' : 'normal',
                    fontStyle: el.style.italic ? 'italic' : 'normal',
                    textAlign: el.style.textAlign,
                    color: el.style.color,
                    backgroundColor: '#eff6ff',
                    border: `1px dashed #3b82f6`,
                    borderRadius: 4,
                  }}>
                    <Hash className="w-3 h-3 text-blue-400 flex-shrink-0" />
                    <span className="truncate text-[10px]">{el.dataBinding || 'فیلد...'}</span>
                  </div>
                )}
                {el.type === 'line' && (
                  <div className="w-full h-full" style={{
                    borderTop: el.lineDirection === 'vertical' ? 'none' : `${Math.max(2, el.style.borderWidth)}px solid ${el.style.borderColor}`,
                    borderLeft: el.lineDirection === 'vertical' ? `${Math.max(2, el.style.borderWidth)}px solid ${el.style.borderColor}` : 'none',
                  }} />
                )}
                {el.type === 'rectangle' && (
                  <div className="w-full h-full" style={{
                    backgroundColor: el.style.backgroundColor !== 'transparent' ? el.style.backgroundColor : undefined,
                    border: `${el.style.borderWidth}px ${el.style.borderStyle} ${el.style.borderColor}`,
                  }} />
                )}
                {el.type === 'image' && (
                  <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 border border-dashed border-gray-300 dark:border-gray-600 rounded">
                    {el.src ? <img src={el.src} className="w-full h-full object-contain" alt="" /> :
                      <Image className="w-6 h-6 text-gray-300" />}
                  </div>
                )}
                {(el.type === 'pageNumber' || el.type === 'totalPages') && (
                  <div className="w-full h-full flex items-center justify-center bg-amber-50 dark:bg-amber-900/20 border border-dashed border-amber-300 rounded text-[10px] text-amber-600">
                    {el.type === 'pageNumber' ? '📄 ۱' : '📄 ۱/۱'}
                  </div>
                )}
                {el.type === 'table' && (
                  <div className="w-full h-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded overflow-hidden">
                    <table className="w-full h-full text-[8px]">
                      <thead><tr className="bg-gray-200 dark:bg-gray-700">
                        <th className="px-1 py-0.5 border text-right">ردیف</th>
                        <th className="px-1 py-0.5 border text-right">شرح</th>
                        <th className="px-1 py-0.5 border text-right">بدهکار</th>
                        <th className="px-1 py-0.5 border text-right">بستانکار</th>
                      </tr></thead>
                      <tbody>
                        <tr><td className="px-1 py-0.5 border">۱</td><td className="px-1 py-0.5 border">—</td><td className="px-1 py-0.5 border text-right">—</td><td className="px-1 py-0.5 border text-right">—</td></tr>
                        <tr><td className="px-1 py-0.5 border">۲</td><td className="px-1 py-0.5 border">—</td><td className="px-1 py-0.5 border text-right">—</td><td className="px-1 py-0.5 border text-right">—</td></tr>
                      </tbody>
                    </table>
                  </div>
                )}
                {/* Selection handles */}
                {selectedId === el.id && !el.locked && (
                  <>
                    {/* Corner handles */}
                    {['nw', 'ne', 'sw', 'se', 'n', 's', 'e', 'w'].map(h => (
                      <div key={h}
                        className="absolute bg-blue-500 border border-white rounded-sm"
                        style={{
                          width: 7, height: 7,
                          ...(h.includes('n') ? { top: -4 } : h.includes('s') ? { bottom: -4 } : { top: '50%', transform: 'translateY(-50%)' }),
                          ...(h.includes('w') ? { left: -4 } : h.includes('e') ? { right: -4 } : { left: '50%', transform: 'translateX(-50%)' }),
                          cursor: h === 'nw' || h === 'se' ? 'nwse-resize' : h === 'ne' || h === 'sw' ? 'nesw-resize' : h === 'n' || h === 's' ? 'ns-resize' : 'ew-resize',
                        }}
                        onMouseDown={e => handleResizeMouseDown(e, h, el)} />
                    ))}
                    {/* Size label */}
                    <div className="absolute -bottom-5 left-0 text-[9px] text-blue-600 bg-blue-50 px-1 rounded whitespace-nowrap">
                      {el.width}×{el.height} @ ({el.x},{el.y})
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── Right Properties Panel ───────────────────── */}
        <div className="w-64 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 flex flex-col flex-shrink-0 z-10">
          {selectedElement ? (
            <>
              <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  {TOOLBOX_ITEMS.find(t => t.type === selectedElement.type)?.label || selectedElement.type}
                </span>
                <div className="flex gap-0.5">
                  <button onClick={() => duplicateElement(selectedElement.id)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded" title="Duplicate">
                    <Copy className="w-3 h-3" />
                  </button>
                  <button onClick={() => bringForward(selectedElement.id)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded" title="Bring Forward">
                    <ArrowUp className="w-3 h-3" />
                  </button>
                  <button onClick={() => sendBackward(selectedElement.id)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded" title="Send Backward">
                    <ArrowDown className="w-3 h-3" />
                  </button>
                  <button onClick={() => updateElement(selectedElement.id, { locked: !selectedElement.locked })}
                    className={`p-1 rounded ${selectedElement.locked ? 'bg-amber-100 text-amber-600' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`} title="Lock">
                    {selectedElement.locked ? '🔒' : '🔓'}
                  </button>
                  <button onClick={() => deleteElement(selectedElement.id)} className="p-1 hover:bg-red-100 text-red-500 rounded" title="Delete">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {/* Position & Size */}
                <Section title={t('finPositionSize')}>
                  <div className="grid grid-cols-2 gap-1.5">
                    <NumField label="X" value={selectedElement.x} onChange={v => updateElement(selectedElement.id, { x: v })} />
                    <NumField label="Y" value={selectedElement.y} onChange={v => updateElement(selectedElement.id, { y: v })} />
                    <NumField label="W" value={selectedElement.width} onChange={v => updateElement(selectedElement.id, { width: Math.max(10, v) })} />
                    <NumField label="H" value={selectedElement.height} onChange={v => updateElement(selectedElement.id, { height: Math.max(5, v) })} />
                  </div>
                </Section>

                {/* Text content */}
                {(selectedElement.type === 'text' || selectedElement.type === 'dataField') && (
                  <Section title={t('finContent')}>
                    {selectedElement.type === 'text' ? (
                      <textarea value={selectedElement.text || ''} onChange={e => updateElement(selectedElement.id, { text: e.target.value })}
                        className="w-full px-2 py-1.5 text-xs border rounded-lg dark:bg-gray-800 dark:border-gray-700 h-16 resize-y" dir="rtl" />
                    ) : (
                      <select value={selectedElement.dataBinding || ''} onChange={e => updateElement(selectedElement.id, { dataBinding: e.target.value })}
                        className="w-full px-2 py-1.5 text-xs border rounded-lg dark:bg-gray-800 dark:border-gray-700">
                        <option value="">انتخاب فیلد...</option>
                        {Object.entries(dataSchema).map(([groupKey, group]) => (
                          <optgroup key={groupKey} label={group.label}>
                            {group.fields.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
                          </optgroup>
                        ))}
                      </select>
                    )}
                  </Section>
                )}

                {/* Line direction */}
                {selectedElement.type === 'line' && (
                  <Section title="جهت خط">
                    <div className="flex gap-1">
                      <button onClick={() => updateElement(selectedElement.id, { lineDirection: 'horizontal' })}
                        className={`flex-1 px-2 py-1 text-[10px] rounded border ${selectedElement.lineDirection === 'horizontal' ? 'bg-emerald-50 border-emerald-300' : 'dark:border-gray-700'}`}>
                        افقی —
                      </button>
                      <button onClick={() => updateElement(selectedElement.id, { lineDirection: 'vertical' })}
                        className={`flex-1 px-2 py-1 text-[10px] rounded border ${selectedElement.lineDirection === 'vertical' ? 'bg-emerald-50 border-emerald-300' : 'dark:border-gray-700'}`}>
                        عمودی |
                      </button>
                    </div>
                  </Section>
                )}

                {/* Image src */}
                {selectedElement.type === 'image' && (
                  <Section title="آدرس تصویر">
                    <input value={selectedElement.src || ''} onChange={e => updateElement(selectedElement.id, { src: e.target.value })}
                      className="w-full px-2 py-1.5 text-xs border rounded-lg dark:bg-gray-800 dark:border-gray-700" placeholder="URL یا مسیر فایل" />
                  </Section>
                )}

                {/* Style — Font */}
                {['text', 'dataField', 'pageNumber', 'totalPages'].includes(selectedElement.type) && (
                  <Section title={t('finFontStyle')}>
                    <div className="space-y-1.5">
                      <div className="flex gap-1">
                        <button onClick={() => updateElementStyle(selectedElement.id, { bold: !selectedElement.style.bold })}
                          className={`px-2 py-1 text-xs rounded border font-bold ${selectedElement.style.bold ? 'bg-gray-200 dark:bg-gray-700' : 'dark:border-gray-700'}`}>B</button>
                        <button onClick={() => updateElementStyle(selectedElement.id, { italic: !selectedElement.style.italic })}
                          className={`px-2 py-1 text-xs rounded border italic ${selectedElement.style.italic ? 'bg-gray-200 dark:bg-gray-700' : 'dark:border-gray-700'}`}>I</button>
                        <button onClick={() => updateElementStyle(selectedElement.id, { underline: !selectedElement.style.underline })}
                          className={`px-2 py-1 text-xs rounded border underline ${selectedElement.style.underline ? 'bg-gray-200 dark:bg-gray-700' : 'dark:border-gray-700'}`}>U</button>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => updateElementStyle(selectedElement.id, { textAlign: 'left' })}
                          className={`flex-1 p-1 rounded border ${selectedElement.style.textAlign === 'left' ? 'bg-gray-200 dark:bg-gray-700' : 'dark:border-gray-700'}`}>
                          <AlignLeft className="w-3 h-3 mx-auto" />
                        </button>
                        <button onClick={() => updateElementStyle(selectedElement.id, { textAlign: 'center' })}
                          className={`flex-1 p-1 rounded border ${selectedElement.style.textAlign === 'center' ? 'bg-gray-200 dark:bg-gray-700' : 'dark:border-gray-700'}`}>
                          <AlignCenter className="w-3 h-3 mx-auto" />
                        </button>
                        <button onClick={() => updateElementStyle(selectedElement.id, { textAlign: 'right' })}
                          className={`flex-1 p-1 rounded border ${selectedElement.style.textAlign === 'right' ? 'bg-gray-200 dark:bg-gray-700' : 'dark:border-gray-700'}`}>
                          <AlignRight className="w-3 h-3 mx-auto" />
                        </button>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => updateElementStyle(selectedElement.id, { verticalAlign: 'top' })}
                          className={`flex-1 p-1 rounded border text-[9px] ${selectedElement.style.verticalAlign === 'top' ? 'bg-gray-200 dark:bg-gray-700' : 'dark:border-gray-700'}`}>
                          ↑
                        </button>
                        <button onClick={() => updateElementStyle(selectedElement.id, { verticalAlign: 'middle' })}
                          className={`flex-1 p-1 rounded border text-[9px] ${selectedElement.style.verticalAlign === 'middle' ? 'bg-gray-200 dark:bg-gray-700' : 'dark:border-gray-700'}`}>
                          ↔
                        </button>
                        <button onClick={() => updateElementStyle(selectedElement.id, { verticalAlign: 'bottom' })}
                          className={`flex-1 p-1 rounded border text-[9px] ${selectedElement.style.verticalAlign === 'bottom' ? 'bg-gray-200 dark:bg-gray-700' : 'dark:border-gray-700'}`}>
                          ↓
                        </button>
                      </div>
                      <NumField label={t('finFontSize')} value={selectedElement.style.fontSize}
                        onChange={v => updateElementStyle(selectedElement.id, { fontSize: Math.max(6, v) })} />
                      <div className="flex gap-1">
                        <label className="flex items-center gap-1 text-[10px] flex-1">
                          <span className="text-gray-400">{t('finFontFamily')}:</span>
                          <select value={selectedElement.style.fontFamily}
                            onChange={e => updateElementStyle(selectedElement.id, { fontFamily: e.target.value })}
                            className="flex-1 px-1 py-0.5 text-[10px] border rounded dark:bg-gray-800 dark:border-gray-700">
                            <option value="B Nazanin">B Nazanin</option>
                            <option value="Tahoma">Tahoma</option>
                            <option value="Arial">Arial</option>
                            <option value="IranSans">IranSans</option>
                          </select>
                        </label>
                      </div>
                      <div className="flex gap-1 items-center">
                        <span className="text-[10px] text-gray-400">{t('finColor')}:</span>
                        <input type="color" value={selectedElement.style.color}
                          onChange={e => updateElementStyle(selectedElement.id, { color: e.target.value })}
                          className="w-6 h-6 rounded border cursor-pointer" />
                        <span className="text-[10px] text-gray-400 ml-2">{t('finBgColor')}:</span>
                        <input type="color" value={selectedElement.style.backgroundColor === 'transparent' ? '#ffffff' : selectedElement.style.backgroundColor}
                          onChange={e => updateElementStyle(selectedElement.id, { backgroundColor: e.target.value })}
                          className="w-6 h-6 rounded border cursor-pointer" />
                      </div>
                    </div>
                  </Section>
                )}

                {/* Border */}
                {['text', 'dataField', 'rectangle', 'image'].includes(selectedElement.type) && (
                  <Section title={t('finBorderStyle')}>
                    <div className="space-y-1.5">
                      <NumField label={t('finBorderWidth')} value={selectedElement.style.borderWidth}
                        onChange={v => updateElementStyle(selectedElement.id, { borderWidth: Math.max(0, v) })} />
                      <div className="flex gap-1 items-center">
                        <span className="text-[10px] text-gray-400">{t('finBorderColor')}:</span>
                        <input type="color" value={selectedElement.style.borderColor}
                          onChange={e => updateElementStyle(selectedElement.id, { borderColor: e.target.value })}
                          className="w-6 h-6 rounded border cursor-pointer" />
                      </div>
                      <select value={selectedElement.style.borderStyle}
                        onChange={e => updateElementStyle(selectedElement.id, { borderStyle: e.target.value })}
                        className="w-full px-2 py-1 text-[10px] border rounded dark:bg-gray-800 dark:border-gray-700">
                        <option value="solid">خط پیوسته</option>
                        <option value="dashed">خط خط‌دار</option>
                        <option value="dotted">خط نقطه‌چین</option>
                      </select>
                    </div>
                  </Section>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center p-4">
              <div className="text-center text-gray-400 text-xs">
                <Layers className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p>{t('finSelectElement')}</p>
                <p className="text-[10px] mt-1">{t('finSelectElementHint')}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom Data Panel ──────────────────────────── */}
      {showDataPanel && (
        <div className="h-40 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 flex-shrink-0 overflow-auto z-10">
          <div className="px-3 py-1.5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t('finDataFields')}</span>
            <button onClick={() => setShowDataPanel(false)} className="p-0.5 hover:bg-gray-100 rounded"><EyeOff className="w-3 h-3 text-gray-400" /></button>
          </div>
          <div className="p-2 flex gap-3 overflow-x-auto">
            {Object.entries(dataSchema).map(([groupKey, group]) => (
              <div key={groupKey} className="min-w-[200px]">
                <div className="text-[10px] font-bold text-gray-500 dark:text-gray-400 mb-1">{group.label}</div>
                <div className="space-y-0.5">
                  {group.fields.map(f => (
                    <button key={f.key} onClick={() => {
                      // Add as dataField element at center of page
                      const newEl: ReportElement = {
                        id: genId(), type: 'dataField',
                        x: Math.round((page.width / 2) - 90), y: Math.round((page.height / 2) - 14),
                        width: 180, height: 28, dataBinding: f.key,
                        style: { ...DEFAULT_STYLE },
                      }
                      const next = [...elements, newEl]
                      setElements(next)
                      setSelectedId(newEl.id)
                      pushHistory(next)
                    }}
                      className="block w-full text-right px-2 py-1 text-[10px] rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-600 dark:text-gray-400 hover:text-blue-600 transition">
                      <Hash className="w-2.5 h-2.5 inline ml-1 text-blue-400" />{f.label}
                      <span className="text-[8px] text-gray-300 mr-1">{f.key.split('.').pop()}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Preview Modal ──────────────────────────────── */}
      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-3 border-b dark:border-gray-700">
              <h3 className="font-bold text-gray-900 dark:text-white">{t('finTemplatePreview')}</h3>
              <button onClick={() => setShowPreview(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">✕</button>
            </div>
            <div className="flex-1 overflow-auto p-4 bg-gray-100 dark:bg-gray-900 flex justify-center">
              <iframe srcDoc={previewHtml} className="bg-white shadow-xl" style={{ width: page.width, height: page.height, border: 'none' }} title="Preview" />
            </div>
          </div>
        </div>
      )}

      {/* ── Error Toast ────────────────────────────────── */}
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 z-50">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-2 text-red-500 hover:text-red-700">✕</button>
        </div>
      )}
    </div>
  )
}

// ─── Sub-components ─────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true)
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-1 px-2 py-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider hover:bg-gray-50 dark:hover:bg-gray-800">
        {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        {title}
      </button>
      {open && <div className="px-2 pb-2">{children}</div>}
    </div>
  )
}

function NumField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-[10px] text-gray-400 w-4">{label}</span>
      <input type="number" value={Math.round(value)}
        onChange={e => onChange(Number(e.target.value))}
        className="flex-1 px-1.5 py-0.5 text-[10px] border rounded dark:bg-gray-800 dark:border-gray-700" />
    </div>
  )
}
