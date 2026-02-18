'use client'

import { useMemo, useState } from 'react'
import Papa from 'papaparse'
import { supabaseClient } from '@/lib/db/supabaseClient'

type CsvRow = {
  sku?: string
  name?: string
  image_url?: string
}

type ImportResult = {
  rowIndex: number
  sku: string
  name: string
  imageUrl: string
  status: 'pending' | 'updated' | 'not_found' | 'invalid' | 'error'
  message?: string
}

const CSV_TEMPLATE = `sku,name,image_url
123456,ADVIL TB 200MG 24 CPLT,https://example.com/image.jpg
`

function normalizeRow(row: CsvRow): CsvRow {
  return {
    sku: row.sku?.trim() || '',
    name: row.name?.trim() || '',
    image_url: row.image_url?.trim() || '',
  }
}

function buildTemplateUrl() {
  const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv;charset=utf-8;' })
  return URL.createObjectURL(blob)
}

export default function ProductImageCsvImport() {
  const [csvText, setCsvText] = useState('')
  const [rows, setRows] = useState<CsvRow[]>([])
  const [results, setResults] = useState<ImportResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const templateUrl = useMemo(() => buildTemplateUrl(), [])

  const validRows = useMemo(() => {
    return rows
      .map(normalizeRow)
      .filter(row => (row.sku || row.name) && row.image_url)
  }, [rows])

  function parseCsv(text: string) {
    setError(null)
    const parsed = Papa.parse<CsvRow>(text, {
      header: true,
      skipEmptyLines: true,
    })

    if (parsed.errors?.length) {
      setError(parsed.errors[0].message)
      setRows([])
      return
    }

    setRows(parsed.data || [])
  }

  function handleFileChange(file: File | null) {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const text = String(reader.result || '')
      setCsvText(text)
      parseCsv(text)
    }
    reader.readAsText(file)
  }

  async function updateRow(row: CsvRow, rowIndex: number): Promise<ImportResult> {
    const normalized = normalizeRow(row)
    const sku = normalized.sku || ''
    const name = normalized.name || ''
    const imageUrl = normalized.image_url || ''

    if ((!sku && !name) || !imageUrl) {
      return {
        rowIndex,
        sku,
        name,
        imageUrl,
        status: 'invalid',
        message: 'Missing SKU/Name or image_url',
      }
    }

    const baseQuery = supabaseClient.from('products').select('id, name, sku').limit(1)
    let lookup = baseQuery

    if (sku) {
      lookup = lookup.eq('sku', sku)
    } else if (name) {
      lookup = lookup.eq('name', name)
    }

    const { data: product, error: lookupError } = await lookup.maybeSingle()

    if (lookupError) {
      return {
        rowIndex,
        sku,
        name,
        imageUrl,
        status: 'error',
        message: lookupError.message,
      }
    }

    if (!product) {
      return {
        rowIndex,
        sku,
        name,
        imageUrl,
        status: 'not_found',
        message: 'No product matched this SKU/Name',
      }
    }

    const { error: updateError } = await supabaseClient
      .from('products')
      .update({ image_url: imageUrl })
      .eq('id', product.id)

    if (updateError) {
      return {
        rowIndex,
        sku,
        name,
        imageUrl,
        status: 'error',
        message: updateError.message,
      }
    }

    return {
      rowIndex,
      sku,
      name: product.name || name,
      imageUrl,
      status: 'updated',
    }
  }

  async function runImport() {
    if (!validRows.length) return
    setLoading(true)
    setResults([])
    setError(null)

    const newResults: ImportResult[] = []
    for (let i = 0; i < validRows.length; i += 1) {
      const result = await updateRow(validRows[i], i + 1)
      newResults.push(result)
      setResults([...newResults])
    }

    setLoading(false)
  }

  const statusCounts = results.reduce(
    (acc, result) => {
      acc[result.status] = (acc[result.status] || 0) + 1
      return acc
    },
    {} as Record<ImportResult['status'], number>
  )

  return (
    <div className="space-y-6">
      <div className="rounded border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold mb-2">CSV Import</h2>
        <p className="text-sm text-slate-600 mb-4">
          Upload a CSV with headers: <span className="font-medium">sku, name, image_url</span>.
          We match by SKU first, then by exact name.
        </p>
        <div className="flex flex-wrap gap-3 mb-4">
          <a
            className="inline-flex items-center rounded border border-slate-300 px-3 py-2 text-sm"
            href={templateUrl}
            download="image-import-template.csv"
          >
            Download CSV template
          </a>
          <label className="inline-flex items-center rounded border border-slate-300 px-3 py-2 text-sm cursor-pointer">
            <input
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(event) => handleFileChange(event.target.files?.[0] || null)}
            />
            Upload CSV file
          </label>
        </div>
        <textarea
          value={csvText}
          onChange={(event) => {
            setCsvText(event.target.value)
            parseCsv(event.target.value)
          }}
          placeholder="Paste CSV content here..."
          className="textarea w-full h-48"
        />
        {error && (
          <div className="mt-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}
      </div>

      <div className="rounded border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold mb-2">Preview</h3>
        <p className="text-sm text-slate-600 mb-4">
          Rows parsed: <span className="font-medium">{rows.length}</span> ·
          Valid rows: <span className="font-medium">{validRows.length}</span>
        </p>
        <button
          type="button"
          onClick={runImport}
          disabled={loading || !validRows.length}
          className="rounded bg-primary-600 px-4 py-2 text-white disabled:opacity-50"
        >
          {loading ? 'Importing...' : 'Run Import'}
        </button>
      </div>

      {results.length > 0 && (
        <div className="rounded border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Results</h3>
          <div className="flex flex-wrap gap-3 text-sm mb-4">
            <span>Updated: {statusCounts.updated || 0}</span>
            <span>Not found: {statusCounts.not_found || 0}</span>
            <span>Invalid: {statusCounts.invalid || 0}</span>
            <span>Errors: {statusCounts.error || 0}</span>
          </div>
          <div className="max-h-96 overflow-auto text-sm">
            <table className="w-full border-collapse">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 pr-3">Row</th>
                  <th className="py-2 pr-3">SKU</th>
                  <th className="py-2 pr-3">Name</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Message</th>
                </tr>
              </thead>
              <tbody>
                {results.map(result => (
                  <tr key={`${result.rowIndex}-${result.sku}-${result.name}`} className="border-b">
                    <td className="py-2 pr-3">{result.rowIndex}</td>
                    <td className="py-2 pr-3">{result.sku}</td>
                    <td className="py-2 pr-3">{result.name}</td>
                    <td className="py-2 pr-3 capitalize">{result.status}</td>
                    <td className="py-2 pr-3 text-slate-600">{result.message || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
