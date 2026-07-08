import { useState, useEffect, useCallback } from 'react'
import { financeApi } from '../../api/finance'
import { useTranslation } from '../../utils/i18n'
import { Save, Building2, Landmark, UserCircle, FileText, Upload, Check } from 'lucide-react'

interface Company {
  id: number; name: string; description: string; logo: string | null; is_active: boolean
  national_id: string; economic_code: string; registration_number: string
  address: string; postal_code: string; phone: string
  bank_name1: string; account_number1: string; shaba_number1: string
  bank_name2: string; account_number2: string; shaba_number2: string
  manager_name: string; manager_position: string
  signature_path: string; stamp_path: string; approved_output_path: string
}

const emptyCompany: Company = {
  id: 0, name: '', description: '', logo: null, is_active: true,
  national_id: '', economic_code: '', registration_number: '',
  address: '', postal_code: '', phone: '',
  bank_name1: '', account_number1: '', shaba_number1: '',
  bank_name2: '', account_number2: '', shaba_number2: '',
  manager_name: '', manager_position: '',
  signature_path: '', stamp_path: '', approved_output_path: '',
}

export default function CompanySettingsPage() {
  const { t } = useTranslation()
  const [company, setCompany] = useState<Company>(emptyCompany)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)

  useEffect(() => {
    financeApi.companies().then(r => {
      if (r.data.length > 0) {
        const c = r.data[0]
        setCompany(c)
        if (c.logo) setLogoPreview(c.logo)
      }
      setLoading(false)
    }).catch(() => { setLoading(false); setError('خطا در بارگذاری اطلاعات شرکت') })
  }, [])

  const handleChange = (field: keyof Company, value: string) => {
    setCompany(prev => ({ ...prev, [field]: value }))
  }

  const handleLogoChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (logoPreview && logoPreview.startsWith('blob:')) URL.revokeObjectURL(logoPreview)
      setLogoFile(file)
      setLogoPreview(URL.createObjectURL(file))
    }
  }, [logoPreview])

  const handleSave = async () => {
    if (saving) return
    setSaving(true)
    setError(null)
    try {
      if (company.id) {
        // Update existing company
        await financeApi.updateCompany(company.id, {
          name: company.name, description: company.description, is_active: company.is_active,
          national_id: company.national_id, economic_code: company.economic_code,
          registration_number: company.registration_number,
          address: company.address, postal_code: company.postal_code, phone: company.phone,
          bank_name1: company.bank_name1, account_number1: company.account_number1,
          shaba_number1: company.shaba_number1,
          bank_name2: company.bank_name2, account_number2: company.account_number2,
          shaba_number2: company.shaba_number2,
          manager_name: company.manager_name, manager_position: company.manager_position,
          signature_path: company.signature_path, stamp_path: company.stamp_path,
          approved_output_path: company.approved_output_path,
        })
      } else {
        // Create new company
        const res = await financeApi.createCompany({
          name: company.name, description: company.description, is_active: true,
          national_id: company.national_id, economic_code: company.economic_code,
          registration_number: company.registration_number,
          address: company.address, postal_code: company.postal_code, phone: company.phone,
          bank_name1: company.bank_name1, account_number1: company.account_number1,
          shaba_number1: company.shaba_number1,
          bank_name2: company.bank_name2, account_number2: company.account_number2,
          shaba_number2: company.shaba_number2,
          manager_name: company.manager_name, manager_position: company.manager_position,
          signature_path: company.signature_path, stamp_path: company.stamp_path,
          approved_output_path: company.approved_output_path,
        })
        setCompany(res.data)
      }

      // Upload logo if selected
      if (logoFile && company.id) {
        const fd = new FormData()
        fd.append('logo', logoFile)
        await financeApi.updateCompany(company.id, fd as unknown as Record<string, unknown>) // FormData for file upload
      }

      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {
      setError('خطا در ذخیره اطلاعات شرکت')
    }
    setSaving(false)
  }

  if (loading) {
    return <div className="p-6 text-center text-gray-400">{t('loading')}</div>
  }

  const InputField = ({ label, field, dir, placeholder }: { label: string; field: keyof Company; dir?: string; placeholder?: string }) => (
    <div>
      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</label>
      <input
        value={company[field] as string}
        onChange={e => handleChange(field, e.target.value)}
        dir={dir}
        placeholder={placeholder}
        className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
      />
    </div>
  )

  const Section = ({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) => (
    <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-6 space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Icon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
        <h3 className="text-base font-bold text-gray-900 dark:text-white">{title}</h3>
      </div>
      {children}
    </div>
  )

  return (
    <div className="p-6 space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('compSettingsTitle')}</h1>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-lg text-sm hover:bg-emerald-700 disabled:opacity-50 transition"
        >
          {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saved ? t('compSaved') : saving ? t('loading') : t('save')}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Company Identity */}
      <Section icon={Building2} title={t('compIdentity')}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <InputField label={t('compName')} field="name" placeholder={t('compNamePlaceholder')} />
          </div>
          <InputField label={t('compDescription')} field="description" placeholder={t('compDescriptionPlaceholder')} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <InputField label={t('compNationalId')} field="national_id" dir="ltr" placeholder="12345678901" />
          <InputField label={t('compEconomicCode')} field="economic_code" dir="ltr" placeholder="1234567890123456" />
          <InputField label={t('compRegNumber')} field="registration_number" dir="ltr" placeholder="12345" />
        </div>
      </Section>

      {/* Contact */}
      <Section icon={Building2} title={t('compContact')}>
        <InputField label={t('compAddress')} field="address" placeholder={t('compAddressPlaceholder')} />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <InputField label={t('compPostalCode')} field="postal_code" dir="ltr" placeholder="1234567890" />
          <InputField label={t('compPhone')} field="phone" dir="ltr" placeholder="021-12345678" />
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('compLogo')}</label>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-600 transition">
                <Upload className="w-4 h-4" />
                <span className="text-xs">{t('compUploadLogo')}</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
              </label>
              {logoPreview && (
                <img src={logoPreview} alt="Logo" className="h-10 w-10 object-contain rounded border dark:border-gray-600" />
              )}
            </div>
          </div>
        </div>
      </Section>

      {/* Banking – Primary */}
      <Section icon={Landmark} title={t('compBankPrimary')}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <InputField label={t('compBankName')} field="bank_name1" placeholder={t('compBankNamePlaceholder')} />
          <InputField label={t('compAccountNumber')} field="account_number1" dir="ltr" placeholder="1234567890123" />
          <InputField label={t('compShabaNumber')} field="shaba_number1" dir="ltr" placeholder="IR123456789012345678901234" />
        </div>
      </Section>

      {/* Banking – Secondary */}
      <Section icon={Landmark} title={t('compBankSecondary')}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <InputField label={t('compBankName')} field="bank_name2" placeholder={t('compBankNamePlaceholder')} />
          <InputField label={t('compAccountNumber')} field="account_number2" dir="ltr" placeholder="1234567890123" />
          <InputField label={t('compShabaNumber')} field="shaba_number2" dir="ltr" placeholder="IR123456789012345678901234" />
        </div>
      </Section>

      {/* Signatory */}
      <Section icon={UserCircle} title={t('compSignatory')}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InputField label={t('compManagerName')} field="manager_name" placeholder={t('compManagerNamePlaceholder')} />
          <InputField label={t('compManagerPosition')} field="manager_position" placeholder={t('compManagerPositionPlaceholder')} />
        </div>
      </Section>

      {/* File Paths */}
      <Section icon={FileText} title={t('compFilePaths')}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <InputField label={t('compSignaturePath')} field="signature_path" dir="ltr" placeholder="/path/to/signature.png" />
          <InputField label={t('compStampPath')} field="stamp_path" dir="ltr" placeholder="/path/to/stamp.png" />
          <InputField label={t('compOutputPath')} field="approved_output_path" dir="ltr" placeholder="/path/to/output/" />
        </div>
      </Section>
    </div>
  )
}
