'use client'
import { useState } from 'react'
import { setAzureCreds } from '@/lib/azureSpeech'

interface AzureKeySetupProps {
  onSaved: () => void
  onSkip?: () => void
}

const REGIONS = [
  { value: 'westeurope', label: 'West Europe' },
  { value: 'northeurope', label: 'North Europe' },
  { value: 'uksouth', label: 'UK South' },
  { value: 'eastus', label: 'East US' },
  { value: 'centralus', label: 'Central US' },
  { value: 'southeastasia', label: 'Southeast Asia' },
]

export default function AzureKeySetup({ onSaved, onSkip }: AzureKeySetupProps) {
  const [key, setKey] = useState('')
  const [region, setRegion] = useState('westeurope')

  function save() {
    if (!key.trim() || !region.trim()) return
    setAzureCreds(key, region)
    onSaved()
  }

  return (
    <div className="p-4 space-y-3">
      <div className="text-center">
        <div className="text-3xl mb-2">🎯</div>
        <h3 className="font-semibold text-gray-900 dark:text-white">Dəqiq Tələffüz Qiymətləndirməsi</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Microsoft Azure Speech sənin tələffüzünü FONEM-FONEM qiymətləndirir —
          sadə "söz tanıma"dan fərqli olaraq, nə dediyini yox, NECƏ dediyini ölçür.
          Pulsuz tier: ayda ~5 saat səs (kart tələb olunur, amma yığılmasa pul tutulmur).
        </p>
      </div>

      <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-xs text-blue-800 dark:text-blue-200 space-y-1">
        <p className="font-semibold">Açarı necə alıram? (~5 dəqiqə)</p>
        <ol className="list-decimal list-inside space-y-0.5">
          <li>
            <a
              href="https://portal.azure.com"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-medium"
            >
              portal.azure.com
            </a>{' '}
            — pulsuz Azure hesabı aç (Microsoft/Outlook hesabı ilə)
          </li>
          <li>Axtarış zolağında <b>"Speech service"</b> yaz → "Create"</li>
          <li>
            Pricing tier: <b>Free F0</b> seç (pulsuzdur), Region qeyd et — aşağıda
            seçdiyin regionla EYNİ olmalıdır
          </li>
          <li>Yarandıqdan sonra "Keys and Endpoint" bölməsindən <b>KEY 1</b>-i kopyala</li>
          <li>Aşağıya açarı yapışdır, regionu seç ✓</li>
        </ol>
      </div>

      <input
        type="password"
        value={key}
        onChange={(e) => setKey(e.target.value)}
        placeholder="Azure Speech açarını yapışdır"
        className="input text-sm"
        onKeyDown={(e) => e.key === 'Enter' && save()}
      />

      <select value={region} onChange={(e) => setRegion(e.target.value)} className="input text-sm">
        {REGIONS.map((r) => (
          <option key={r.value} value={r.value}>{r.label}</option>
        ))}
      </select>

      <button onClick={save} disabled={!key.trim() || !region.trim()} className="btn-primary w-full text-sm">
        Yadda saxla və başla →
      </button>

      {onSkip && (
        <button onClick={onSkip} className="w-full text-xs text-gray-400 hover:text-gray-600 text-center">
          Hələlik keç — sadə rejimlə davam et
        </button>
      )}

      <p className="text-[11px] text-gray-400 text-center">
        🔒 Açar yalnız bu cihazda saxlanır, serverə göndərilmir.
      </p>
    </div>
  )
}
