#!/usr/bin/env node
// Check that all translation keys are present in both fa and en locales
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const i18nPath = resolve(__dirname, '../src/utils/i18n.ts')
const content = readFileSync(i18nPath, 'utf-8')

// Extract fa and en key sections
const faMatch = content.match(/fa:\s*\{([\s\S]*?)\},\s*en:/)
const enMatch = content.match(/en:\s*\{([\s\S]*?)\},\s*\}\s*as const/)

if (!faMatch || !enMatch) {
  console.error('Could not parse fa/en sections from i18n.ts')
  process.exit(1)
}

const extractKeys = (section) => {
  const keys = []
  const lines = section.split('\n')
  for (const line of lines) {
    const m = line.match(/^\s*(\w+):\s*['"]/)
    if (m) keys.push(m[1])
  }
  return keys
}

const faKeys = extractKeys(faMatch[1])
const enKeys = extractKeys(enMatch[1])

const faSet = new Set(faKeys)
const enSet = new Set(enKeys)

const missingInEn = faKeys.filter(k => !enSet.has(k))
const missingInFa = enKeys.filter(k => !faSet.has(k))

let errors = 0

if (missingInEn.length > 0) {
  console.error(`❌ Missing in EN (${missingInEn.length}): ${missingInEn.join(', ')}`)
  errors++
}

if (missingInFa.length > 0) {
  console.error(`❌ Missing in FA (${missingInFa.length}): ${missingInFa.join(', ')}`)
  errors++
}

if (errors === 0) {
  console.log(`✅ All ${faKeys.length} translation keys are present in both fa and en locales`)
} else {
  console.log(`\nTotal FA keys: ${faKeys.length}, Total EN keys: ${enKeys.length}`)
}
process.exit(errors)
