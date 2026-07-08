import { useState, useEffect } from 'react'
import { financeApi } from '../../api/finance'
import { useTranslation } from '../../utils/i18n'
import { FileText, Download, Trash2, Search, RefreshCw } from 'lucide-react'

interface GeneratedFile {
  id: number
  file_name: string
  file_type: string
  file_format: string
  file_size: number
  letter_number: string
  invoice_id: number
  payer_name: string
  generated_by: string
  created_at: string
  last_accessed: string | null
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

export default function GeneratedFilesPage() {
  const { t } = useTranslation()
  const [files, setFiles] = useState<GeneratedFile[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterFormat, setFilterFormat] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [cleaningUp, setCleaningUp] = useState(false)

  const loadFiles = async () => {
    setLoading(true)
    try {
      const params: Record<string, string> = {}
      if (filterType) params.file_type = filterType
      if (filterFormat) params.file_format = filterFormat
      const res = await financeApi.generatedFiles(params)
      setFiles(res.data)
    } catch {
      setError(t('finLoadError'))
      setTimeout(() => setError(null), 4000)
    }
    setLoading(false)
  }

  useEffect(() => { loadFiles() }, [filterType, filterFormat])

  const filtered = files.filter(f =>
    !search || f.file_name.includes(search) || f.letter_number.includes(search) || f.payer_name.includes(search)
  )

  const handleDownload = async (id: number) => {
    try {
      const res = await financeApi.downloadGeneratedFile(id)
      const blob = new Blob([res.data])
      const file = files.find(f => f.id === id)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = file?.file_name || 'file'; a.click()
      URL.revokeObjectURL(url)
      // Refresh to update last_accessed
      loadFiles()
    } catch {
      setError(t('finFileDownloadError'))
      setTimeout(() => setError(null), 4000)
    }
  }

  const handleSoftDelete = async (id: number) => {
    if (!confirm(t('finConfirmFileDelete'))) return
    try {
      await financeApi.softDeleteGeneratedFile(id)
      setSuccess(t('finFileSoftDeleted'))
      setTimeout(() => setSuccess(null), 3000)
      loadFiles()
    } catch {
      setError(t('finFileCleanupError'))
      setTimeout(() => setError(null), 4000)
    }
  }

  const handleCleanup = async () => {
    if (!confirm(t('finConfirmCleanup'))) return
    setCleaningUp(true)
    try {
      const res = await financeApi.cleanupGeneratedFiles()
      setSuccess(`${res.data.deleted_count} فایل حذف شد`)
      setTimeout(() => setSuccess(null), 3000)
      loadFiles()
    } catch {
      setError(t('finFileCleanupError'))
      setTimeout(() => setError(null), 4000)
    }
    setCleaningUp(false)
  }

  const formatIcon = (fmt: string) => {
    const colors: Record<string, string> = {
      pdf: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
      excel: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
      word: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
      html: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
    }
    return colors[fmt] || 'bg-gray-100 text-gray-600'
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6" dir="rtl">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">{t('finGeneratedFiles')}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('finGeneratedFilesDesc')}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={loadFiles}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition">
              <RefreshCw className="w-4 h-4" /> {t('dbRefresh')}
            </button>
            <button onClick={handleCleanup} disabled={cleaningUp}
              className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 border border-red-200 dark:border-red-800 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition disabled:opacity-50">
              <Trash2 className="w-4 h-4" /> {cleaningUp ? t('loading') : t('finCleanupDeleted')}
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('payersSearch')}
              className="w-full pr-9 pl-3 py-2 text-sm border rounded-xl dark:bg-gray-800 dark:border-gray-700 dark:text-white" />
          </div>
          <select value={filterType} onChange={e => setFilterType(e.target.value)}
            className="px-3 py-2 text-sm border rounded-xl dark:bg-gray-800 dark:border-gray-700">
            <option value="">همه انواع</option>
            <option value="invoice">صورتحساب</option>
            <option value="notice">اطلاعیه واریز</option>
            <option value="creditor">بستانکاری</option>
          </select>
          <select value={filterFormat} onChange={e => setFilterFormat(e.target.value)}
            className="px-3 py-2 text-sm border rounded-xl dark:bg-gray-800 dark:border-gray-700">
            <option value="">همه فرمت‌ها</option>
            <option value="pdf">PDF</option>
            <option value="excel">Excel</option>
            <option value="word">Word</option>
            <option value="html">HTML</option>
          </select>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          {(['pdf', 'excel', 'word', 'html'] as const).map(fmt => {
            const count = files.filter(f => f.file_format === fmt).length
            return (
              <div key={fmt} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-3 text-center">
                <div className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${formatIcon(fmt)}`}>
                  {fmt}
                </div>
                <div className="text-lg font-bold text-gray-900 dark:text-white mt-1">{count}</div>
              </div>
            )
          })}
        </div>

        {/* File list */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>{t('finNoGeneratedFiles')}</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-400 uppercase">{t('invPayer')}</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-400 uppercase">{t('finFileName')}</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-400 uppercase">{t('finFileFormat')}</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-400 uppercase">{t('finFileSize')}</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-400 uppercase">{t('finFileDate')}</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-gray-400 uppercase">{t('payersActions')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(f => (
                  <tr key={f.id} className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition">
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{f.payer_name}</div>
                      <div className="text-[10px] text-gray-400">{f.letter_number}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-gray-400" />
                        <span className="text-xs text-gray-700 dark:text-gray-300 truncate max-w-[200px]">{f.file_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${formatIcon(f.file_format)}`}>
                        {f.file_format}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{formatFileSize(f.file_size)}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{f.created_at.slice(0, 10)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => handleDownload(f.id)}
                          className="p-1.5 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 rounded-lg text-emerald-600 transition" title="دانلود">
                          <Download className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleSoftDelete(f.id)}
                          className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg text-red-500 transition" title="حذف">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Toasts */}
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg shadow-lg z-50">
          {error} <button onClick={() => setError(null)} className="mr-2">✕</button>
        </div>
      )}
      {success && (
        <div className="fixed bottom-4 right-4 bg-emerald-100 border border-emerald-400 text-emerald-700 px-4 py-3 rounded-lg shadow-lg z-50">
          {success}
        </div>
      )}
    </div>
  )
}
