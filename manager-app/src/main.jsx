import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  ArrowUpRight, Bell, Check, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight,
  CircleDollarSign, Clock3, Copy, CreditCard, Download, Eye, FileText, FolderKanban,
  GitMerge, ImageIcon, Layers, LayoutDashboard, MapPin, Menu, MoreHorizontal, Package, Plus,
  Printer, Receipt, RefreshCw, Ruler, Search, Trash2, Upload, Users, LogOut, X,
  Pencil
} from 'lucide-react'
import './styles.css'
import { apiBase, apiUrl, canConfigureApiBase, clearApiBase, isApiConfigured, setApiBase } from './api-config.js'

const AREAS = [
  'Foyer', 'Living room', 'Dining', 'Pooja room', 'Bedroom 1', 'Bedroom 2', 'Bedroom 3',
  'Bedroom 4', 'Bedroom 5', 'Bedroom 6', 'Bedroom 7', 'Bedroom 8', 'Bedroom 9', 'Bedroom 10',
  'Guest room', "Parents room", "Grand parent's room", "Mother's room", "Father's room",
  "Son's room", "Daughter's room", 'Master bedroom 1', 'Master bedroom 2', 'Master bedroom 3',
  'Master bedroom 4', 'Master bedroom 5', 'Kitchen', 'Balcony', 'First floor living room',
  'Second floor living room', 'Third floor living room', 'Home theatre', 'Entertainment room',
  'Bar', 'Store room', 'Walk-in wardrobe', 'Bathroom', 'Staircase', 'Gym', 'Office', 'Cabin 1',
  'Cabin 2', 'Cabin 3', 'Cabin 4', 'Cabin 5', 'Cabin 6', 'Cabin 7', 'Cabin 8', 'Cabin 9',
  'Cabin 10', 'Reception area', 'Accounts area', 'HR area', 'Design area', 'Sales area',
  'Purchase department', 'Conference room', "Owner's cabin", "Sir's cabin", "Madam's cabin",
  'Library', 'Study area'
]

const CURTAIN_SYSTEMS = [
  {
    id: 'american',
    name: 'American curtains',
    formula: 'american',
    products: [
      ['American main curtain', 5, 'american'],
      ['American sheer', 5, 'american'],
      ['American lining', 5, 'american']
    ]
  },
  {
    id: 'valence',
    name: 'Valence curtains',
    formula: 'valance',
    products: [
      ['Valence main curtain', 5, 'valance'],
      ['Valence sheer', 5, 'valance'],
      ['Valence lining', 5, 'valance']
    ]
  },
  {
    id: 'eyelet',
    name: 'Eylet curtains',
    formula: 'eyelet',
    products: [
      ['Eylet main curtain', 5, 'eyelet'],
      ['Eylet sheer', 5, 'eyelet'],
      ['Eylet lining', 5, 'eyelet']
    ]
  },
  {
    id: 'ripple',
    name: 'Ripple curtains',
    formula: 'ripple',
    products: [
      ['Ripple main curtain', 5, 'ripple'],
      ['Ripple sheer', 5, 'ripple'],
      ['Ripple lining', 5, 'ripple']
    ]
  }
]

const CLAMP_OPTIONS = ['Ceiling Clamps', 'Single wall clamp', 'Double wall clamp']

const ALL_CURTAIN_COMPONENT_NAMES = new Set([
  ...CURTAIN_SYSTEMS.flatMap((system) => system.products.map(([name]) => name)),
  'American main curtains', 'American sheer curtains', 'American lining',
  'Valence main curtains', 'Valence sheer curtains', 'Valence lining',
  'Eyelet Main curtains', 'Eyelet sheer curtains', 'Eyelet lining',
  'Eylet Main curtains', 'Eylet sheer curtains', 'Eylet lining',
  'Ripple Main curtains', 'Ripple sheer curtain', 'Ripple lining'
])

const MATERIAL_PRODUCTS = [
  ...CURTAIN_SYSTEMS.flatMap((system) => system.products),
  ['American main curtains', 5, 'american'],
  ['American sheer curtains', 5, 'american'],
  ['Valence main curtains', 5, 'valance'],
  ['Valence sheer curtains', 5, 'valance'],
  ['Eyelet Main curtains', 5, 'eyelet'],
  ['Eyelet sheer curtains', 5, 'eyelet'],
  ['Eyelet lining', 5, 'eyelet'],
  ['Ripple Main curtains', 5, 'ripple'],
  ['Ripple sheer curtain', 5, 'ripple'],
  ['Ripple lining', 5, 'ripple'],
  ['Velance Fabric', 5, 'valance'],
  ['American Stitching', 18], ['Velance stitching', 18], ['Roman blinds', 18, 'roman'],
  ['Roller blinds', 18], ['Zebra blinds', 18], ['Wooden Venetian blinds', 18],
  ['Eyelet stitching', 18], ['Ripple stitching', 18], ['Track', 18], ['Runners', 18],
  ...CLAMP_OPTIONS.map((name) => [name, 18]), ['Hooks', 18], ['Installation', 18], ['Delivery', 18],
  ['Bed back fabric', 5], ['Bed border fabric', 5], ['Bed back making', 5], ['Soft board fabric', 5],
  ['Soft board making', 18], ['Seating fabric', 5], ['Seating making', 18], ['Pillow fabric', 5],
  ['Pillow', 18], ['Mattress', 18], ['Wallpaper rolls', 18], ['Wallpaper pasting', 18],
  ['Customised wallpaper', 18], ['Customised wallpaper pasting', 18], ['Carpet', 18],
  ['Bed set', 18], ['Bedsheets', 18], ['Runner fabric', 5], ['Runner stitching', 18],
  ['Vinyl blinds', 18], ['Monsoon blinds', 18], ['Matting', 18], ['Mat', 18],
  ['PVC Matting', 18], ['Rod', 18], ['Support', 18], ['End caps', 18], ['Shower curtain', 18]
].map(([name, gst, formula]) => ({ name, gst, formula: formula || 'standard' }))

const PRODUCTS = [
  ...CURTAIN_SYSTEMS.map((system) => ({ name: system.name, gst: 5, formula: system.formula, curtainSystem: system })),
  ...MATERIAL_PRODUCTS.filter((product) =>
    !ALL_CURTAIN_COMPONENT_NAMES.has(product.name) &&
    !CURTAIN_SYSTEMS.some((system) => system.name === product.name) &&
    !['Track', 'Runners', 'Hooks', ...CLAMP_OPTIONS].includes(product.name)
  )
]

const EDITABLE_MATERIAL_PRODUCTS = MATERIAL_PRODUCTS.filter((product) => !['Track', 'Runners', 'Hooks', ...CLAMP_OPTIONS].includes(product.name))
const EDITABLE_MODAL_PRODUCTS = Array.from(new Set([
  ...PRODUCTS.map((p) => p.name),
  ...MATERIAL_PRODUCTS.filter((product) => !['Track', 'Runners', 'Hooks', ...CLAMP_OPTIONS].includes(product.name)).map((p) => p.name)
]))

const UNITS_TO_INCHES = { in: 1, ft: 12, m: 39.3701, cm: 0.393701 }
const toInches = (value, unit = 'in') => Number(value || 0) * (UNITS_TO_INCHES[unit] || 1)
const fromInches = (value, unit = 'in') => Number(value || 0) / (UNITS_TO_INCHES[unit] || 1)

const currency = (value) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value || 0)
const quantity = (value) => Number(value || 0).toFixed(2)
const uid = (prefix) => prefix + '-' + Math.random().toString(36).slice(2, 8)
const today = () => new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date())

function unitLabel(productName) {
  const p = String(productName || '').toLowerCase().trim()
  if (p.includes('stitching') || p.includes('hook') || p.includes('clamp') || p.includes('runner') || p.includes('end cap') || p.includes('support') || p.includes('pillow') || p.includes('mattress') || p.includes('bed set') || p.includes('bedsheet')) {
    return 'pcs'
  }
  if (p === 'track' || p === 'tracks' || p.includes('rod')) {
    return 'ft'
  }
  if (p.includes('curtain') || p.includes('sheer') || p.includes('lining') || p.includes('eyelet') || p.includes('eylet') || p.includes('ripple') || p.includes('american') || p.includes('valance') || p.includes('valence') || p.includes('fabric')) {
    return 'm'
  }
  if (p.includes('blind') || p.includes('roman') || p.includes('roller') || p.includes('zebra') || p.includes('venetian') || p.includes('wallpaper') || p.includes('carpet') || p.includes('matting')) {
    return 'sq ft'
  }
  return 'units'
}

function findProductDef(name) {
  if (!name) return { name: '', gst: 18, formula: 'standard' }
  const clean = String(name).trim()
  const lower = clean.toLowerCase()
  const fromProducts = PRODUCTS.find((p) => p.name.toLowerCase() === lower)
  if (fromProducts) return fromProducts
  const fromMaterial = MATERIAL_PRODUCTS.find((p) => p.name.toLowerCase() === lower)
  if (fromMaterial) return fromMaterial
  const sys = CURTAIN_SYSTEMS.find((s) => s.name.toLowerCase() === lower)
  if (sys) return { name: sys.name, gst: 5, formula: sys.formula, curtainSystem: sys }
  let formula = 'standard'
  let gst = 18
  const isStitching = lower.includes('stitching')
  const isHardware = lower.includes('track') || lower.includes('runner') || lower.includes('hook') || lower.includes('clamp')
  if (!isStitching && !isHardware) {
    if (lower.includes('eyelet') || lower.includes('eylet')) {
      formula = 'eyelet'
      gst = 5
    } else if (lower.includes('ripple')) {
      formula = 'ripple'
      gst = 5
    } else if (lower.includes('american')) {
      formula = 'american'
      gst = 5
    } else if (lower.includes('valence') || lower.includes('valance')) {
      formula = 'valance'
      gst = 5
    } else if (lower.includes('roman')) {
      formula = 'roman'
      gst = 18
    }
  }
  return { name: clean, gst, formula }
}

function calculateProduct(product, width, height, details = {}) {
  const w = Number(width) || 0
  const h = Number(height) || 0
  const standardArea = Math.max(0, Number(((w / 12) * (h / 12)).toFixed(2)))

  const pName = String(product?.name || product || '').toLowerCase()
  const isStitchingOrHardware = pName.includes('stitching') || pName.includes('track') || pName.includes('clamp') || pName.includes('hook') || pName.includes('runner')
  const effectiveFormula = (!isStitchingOrHardware && (pName.includes('eyelet') || pName.includes('eylet'))) ? 'eyelet'
    : (!isStitchingOrHardware && pName.includes('ripple')) ? 'ripple'
    : (!isStitchingOrHardware && pName.includes('american')) ? 'american'
    : (!isStitchingOrHardware && (pName.includes('valence') || pName.includes('valance'))) ? 'valance'
    : (!isStitchingOrHardware && pName.includes('roman')) ? 'roman'
    : (product?.formula && product.formula !== 'standard' ? product.formula : 'standard')

  if (product.formula === 'american' || effectiveFormula === 'american') {
    const panels = Math.ceil(w / 18)
    const drops = (h + 15) / 39
    const qty = Number((panels * drops).toFixed(2))
    return { quantity: qty, note: panels + ' panels × ' + Number(drops.toFixed(2)) + ' drops = ' + qty.toFixed(2) + ' m', unitPrice: Number(details.price) || 0 }
  }

  // 1. For eylet and ripple curtain:
  // Total Quantity = ⌈W / 20⌉ × ((H + 15) / 39)
  // Width divided by 20 inches, round to next figure = A
  // Height plus 15 inches divided by 39 inches = B
  // Total Quantity = A × B (rounded to 2 decimal places)
  if (product.formula === 'eyelet' || product.formula === 'ripple' || effectiveFormula === 'eyelet' || effectiveFormula === 'ripple') {
    if (w <= 0 || h <= 0) {
      return { quantity: 0, note: 'Dimensions needed', unitPrice: Number(details.price) || 0 }
    }
    const A = Math.ceil(w / 20)
    const B = (h + 15) / 39
    const qty = Number((A * B).toFixed(2))
    return {
      quantity: qty,
      note: `⌈${w}"/20⌉ × (${h}"+15)/39 = ${A} panels × ${Number(B.toFixed(2))} drops = ${qty.toFixed(2)} m`,
      unitPrice: Number(details.price) || 0
    }
  }

  if (product.formula === 'valance' || effectiveFormula === 'valance') {
    const breadths = Math.ceil(w / 50)
    const meters = Math.ceil(((breadths * 15) / 39) * 2) / 2
    const qty = Number(meters.toFixed(2))
    return { quantity: qty, note: breadths + ' breadths · rounded to half metre = ' + qty.toFixed(2) + ' m', unitPrice: Number(details.price) || 0 }
  }

  if (product.formula === 'roman' || effectiveFormula === 'roman') {
    const fabricQty = Math.ceil(w / 50) * ((h + 20) / 39)
    const roundedWidth = Math.ceil((w / 12) * 2) / 2
    const roundedHeight = Math.ceil((h / 12) * 2) / 2
    const rawArea = roundedWidth * roundedHeight
    const billableArea = Math.max(rawArea, Number(details.minimumArea) || 11)
    const stitching = details.romanType === 'Premium' ? 350 : 200
    const total = fabricQty * (Number(details.fabricPrice) || 0) +
      fabricQty * (Number(details.liningPrice) || 0) + billableArea * stitching
    const qty = Number(billableArea.toFixed(2))
    return {
      quantity: qty,
      unitPrice: billableArea ? total / billableArea : 0,
      note: Number(fabricQty.toFixed(2)) + ' m fabric + lining · ' + qty + ' sq ft chargeable'
    }
  }

  return { quantity: standardArea, note: standardArea + ' sq ft', unitPrice: Number(details.price) || 0 }
}

function matchesStaffDraft(draft, target, targetId) {
  if (!draft) return false
  const cleanTarget = String(targetId || '').replace(/^staff-/, '').trim()
  const draftIds = [
    draft.id,
    draft._id,
    draft.rawId,
    draft.localId,
    draft.submissionId
  ].filter((v) => v !== undefined && v !== null && v !== '').map((v) => String(v).trim())

  if (cleanTarget) {
    for (const dId of draftIds) {
      const cleanD = dId.replace(/^staff-/, '')
      if (cleanD.toLowerCase() === cleanTarget.toLowerCase()) return true
      if (dId.toLowerCase() === String(targetId).trim().toLowerCase()) return true
    }
  }

  if (target && typeof target === 'object') {
    const rawTargetId = target.rawId || target.id
    if (rawTargetId) {
      const cT = String(rawTargetId).replace(/^staff-/, '').trim().toLowerCase()
      for (const dId of draftIds) {
        if (dId.replace(/^staff-/, '').toLowerCase() === cT) return true
      }
    }
    const hasTargetId = Boolean(rawTargetId)
    const hasDraftId = draftIds.length > 0
    if (!hasTargetId || !hasDraftId) {
      const areaA = (draft.area || '').trim().toLowerCase()
      const areaB = (target.area || '').trim().toLowerCase()
      const prodA = (draft.product || '').trim().toLowerCase()
      const prodB = (target.product || '').trim().toLowerCase()
      if (areaA && areaA === areaB && prodA && prodA === prodB) {
        if (target.curtainSetId && draft.curtainSetId && target.curtainSetId === draft.curtainSetId) {
          return true
        }
        if (target.createdAt && draft.createdAt && target.createdAt === draft.createdAt) {
          return true
        }
        if (Number(target.width) === Number(draft.width) && Number(target.height) === Number(draft.height)) {
          return true
        }
      }
    }
  }

  return false
}

const DELETED_STAFF_DRAFTS_KEY = 'krishna-decor-deleted-staff-drafts'

function getDeletedStaffDrafts() {
  try {
    const stored = JSON.parse(localStorage.getItem(DELETED_STAFF_DRAFTS_KEY) || '[]')
    return Array.isArray(stored) ? stored : []
  } catch {
    return []
  }
}

function markStaffDraftDeleted(projectId, draftId, draftObj) {
  try {
    const list = getDeletedStaffDrafts()
    const cleanId = String(draftId || draftObj?.rawId || draftObj?.id || '').replace(/^staff-/, '').trim().toLowerCase()
    const entry = {
      projectId: String(projectId || ''),
      id: cleanId,
      area: (draftObj?.area || '').trim().toLowerCase(),
      product: (draftObj?.product || '').trim().toLowerCase(),
      width: Number(draftObj?.width) || 0,
      height: Number(draftObj?.height) || 0,
      deletedAt: Date.now()
    }
    const now = Date.now()
    const active = list.filter((item) => (now - (item.deletedAt || 0)) < 7200000)
    active.push(entry)
    localStorage.setItem(DELETED_STAFF_DRAFTS_KEY, JSON.stringify(active.slice(-1000)))
  } catch {}
}

function isStaffDraftDeleted(projectId, draft) {
  if (!draft) return false
  const pId = String(projectId || '').toLowerCase()
  const list = getDeletedStaffDrafts()
  if (!list.length) return false
  const dId = String(draft.id || draft.rawId || draft.localId || '').replace(/^staff-/, '').trim().toLowerCase()
  const dArea = (draft.area || '').trim().toLowerCase()
  const dProduct = (draft.product || '').trim().toLowerCase()
  const dW = Number(draft.width) || 0
  const dH = Number(draft.height) || 0

  return list.some((item) => {
    if (item.projectId && pId && item.projectId.toLowerCase() !== pId) return false
    if (item.id && dId && item.id === dId) return true
    if (item.area && item.product && item.area === dArea && item.product === dProduct) {
      if (item.width && item.height && item.width === dW && item.height === dH) return true
    }
    return false
  })
}

function filterDeletedDraftsFromProject(project) {
  if (!project) return project
  const remainingDrafts = (project.staffDrafts || []).filter((d) => !isStaffDraftDeleted(project.id, d))
  const remainingAreas = (project.areas || []).map((a) => ({
    ...a,
    products: (a.products || []).filter((p) => !isStaffDraftDeleted(project.id, p))
  }))
  return {
    ...project,
    staffDrafts: remainingDrafts,
    areas: remainingAreas,
    quotations: mergeDuplicateQuotations(project.quotations || [])
  }
}

function staffSubmissionLine(submission) {
  if (!submission) return null
  const subId = String(submission.id ?? submission._id ?? submission.rawId ?? submission.localId ?? uid('draft')).replace(/^staff-/, '')
  submission.id = subId
  const product = findProductDef(submission.product) || MATERIAL_PRODUCTS.find((item) => item.name === submission.product) || { name: submission.product, gst: 18, formula: 'standard' }
  const unit = submission.unit || 'in'
  const widthInInches = toInches(submission.width, unit)
  const heightInInches = toInches(submission.height, unit)
  const measured = calculateProduct(product, widthInInches, heightInInches, submission)
  const isFormulaProduct = product.formula && product.formula !== 'standard'
  const qty = (submission.quantityOverridden && submission.quantity !== undefined && submission.quantity !== null && submission.quantity !== '' && Number(submission.quantity) > 0)
    ? Number(Number(submission.quantity).toFixed(2))
    : (isFormulaProduct || !submission.quantity ? measured.quantity : Number(Number(submission.quantity).toFixed(2)))
  const price = (submission.unitPrice !== undefined && submission.unitPrice !== null && submission.unitPrice !== '') ? Number(submission.unitPrice) : 0
  const gst = (submission.gst !== undefined && submission.gst !== null && submission.gst !== '') ? Number(submission.gst) : product.gst
  const note = measured.note + (submission.notes ? ' · ' + submission.notes : '') + ' · Field entry by ' + (submission.staffName || 'Staff')
  return {
    id: 'staff-' + subId,
    rawId: subId,
    area: submission.area || '',
    product: submission.product || '',
    quantity: Number(qty.toFixed(2)),
    quantityOverridden: Boolean(submission.quantityOverridden),
    unitPrice: price,
    gst,
    note,
    notes: submission.notes || '',
    isStaff: true,
    curtainSetId: submission.curtainSetId || '',
    curtainSystem: submission.curtainSystem || '',
    clampType: submission.clampType || '',
    width: submission.width,
    height: submission.height,
    unit
  }
}

const SESSION_KEY = 'krishna-decor-manager-session'
const usernameAlias = (name) => {
  const localPart = String(name || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '.').replace(/^\.+|\.+$/g, '').slice(0, 60) || 'user'
  return localPart + '@krishnadecor.local'
}

const PROJECTS_CACHE_KEY = 'krishna-decor-manager-projects'
const STAFF_CACHE_KEY = 'krishna-decor-manager-staff'
const MANAGER_QUEUE_KEY = 'krishna-decor-manager-sync-queue'

function mergeDuplicateQuotations(quotations = []) {
  if (!Array.isArray(quotations) || quotations.length <= 1) return quotations || []

  const merged = []
  const keyMap = new Map()

  for (const raw of quotations) {
    if (!raw) continue
    const id = String(raw.id || '').trim()
    const title = String(raw.title || '').trim().toLowerCase()
    
    // Items signature to detect identical content
    const itemsSig = Array.isArray(raw.items)
      ? raw.items.map(i => `${(i.area||'').toLowerCase()}::${(i.product||'').toLowerCase()}::${i.quantity}::${i.unitPrice}`).sort().join('|')
      : ''

    let existingKey = null
    for (const [k, existing] of keyMap.entries()) {
      const existingId = String(existing.id || '').trim()
      const existingTitle = String(existing.title || '').trim().toLowerCase()
      const existingSig = Array.isArray(existing.items)
        ? existing.items.map(i => `${(i.area||'').toLowerCase()}::${(i.product||'').toLowerCase()}::${i.quantity}::${i.unitPrice}`).sort().join('|')
        : ''

      if (id && existingId && id.toLowerCase() === existingId.toLowerCase()) {
        existingKey = k
        break
      }
      if (title && existingTitle && title === existingTitle) {
        existingKey = k
        break
      }
      if (itemsSig && existingSig && itemsSig === existingSig && itemsSig.length > 0) {
        existingKey = k
        break
      }
    }

    if (existingKey) {
      const existing = keyMap.get(existingKey)
      const status = (existing.status === 'Approved' || raw.status === 'Approved')
        ? 'Approved'
        : (existing.status === 'Sent' || raw.status === 'Sent')
          ? 'Sent'
          : 'Draft'
      const date = (raw.date && raw.date > (existing.date || '')) ? raw.date : (existing.date || raw.date)

      const itemMap = new Map()
      for (const it of (existing.items || [])) {
        const itemKey = it.id || ((it.area || '').toLowerCase() + '::' + (it.product || '').toLowerCase())
        itemMap.set(itemKey, { ...it })
      }
      for (const it of (raw.items || [])) {
        const itemKey = it.id || ((it.area || '').toLowerCase() + '::' + (it.product || '').toLowerCase())
        if (itemMap.has(itemKey)) {
          const prev = itemMap.get(itemKey)
          itemMap.set(itemKey, {
            ...prev,
            ...it,
            quantity: Math.max(Number(prev.quantity) || 0, Number(it.quantity) || 0),
            unitPrice: Math.max(Number(prev.unitPrice) || 0, Number(it.unitPrice) || 0),
            gst: Number(it.gst) || Number(prev.gst) || 0,
            note: [prev.note, it.note].filter(Boolean).filter((v, idx, arr) => arr.indexOf(v) === idx).join('; ')
          })
        } else {
          itemMap.set(itemKey, { ...it })
        }
      }

      existing.status = status
      existing.date = date
      if (raw.title && !existing.title) existing.title = raw.title
      existing.items = Array.from(itemMap.values())
    } else {
      const copy = {
        ...raw,
        id: id || uid('quote'),
        items: Array.isArray(raw.items) ? raw.items.map((it) => ({ ...it })) : []
      }
      keyMap.set(copy.id, copy)
      merged.push(copy)
    }
  }

  return merged
}


function nextQuotationId(quotations = []) {
  const yy = String(new Date().getFullYear()).slice(-2)
  let maxSeq = 14
  for (const q of (quotations || [])) {
    const match = String(q?.id || '').match(/KD-\d+-(\d+)/i)
    if (match) {
      const num = parseInt(match[1], 10)
      if (Number.isFinite(num) && num > maxSeq) {
        maxSeq = num
      }
    }
  }
  let candidate = `KD-${yy}-${String(maxSeq + 1).padStart(3, '0')}`
  while ((quotations || []).some((q) => q && q.id === candidate)) {
    maxSeq++
    candidate = `KD-${yy}-${String(maxSeq + 1).padStart(3, '0')}`
  }
  return candidate
}

function getCachedProjects() {
  try {
    const data = JSON.parse(localStorage.getItem(PROJECTS_CACHE_KEY) || '[]')
    if (!Array.isArray(data)) return []
    return data.map(filterDeletedDraftsFromProject)
  } catch { return [] }
}

function saveCachedProjects(projects) {
  try {
    const normalized = (projects || []).map(filterDeletedDraftsFromProject)
    localStorage.setItem(PROJECTS_CACHE_KEY, JSON.stringify(normalized))
  } catch {}
}

function getCachedStaff() {
  try {
    const data = JSON.parse(localStorage.getItem(STAFF_CACHE_KEY) || '[]')
    return Array.isArray(data) ? data : []
  } catch { return [] }
}

function saveCachedStaff(staff) {
  try {
    localStorage.setItem(STAFF_CACHE_KEY, JSON.stringify(staff))
  } catch {}
}

function getManagerQueue() {
  try {
    const data = JSON.parse(localStorage.getItem(MANAGER_QUEUE_KEY) || '[]')
    return Array.isArray(data) ? data : []
  } catch { return [] }
}

function saveManagerQueue(queue) {
  try {
    localStorage.setItem(MANAGER_QUEUE_KEY, JSON.stringify(queue))
  } catch {}
}

function enqueueMutation(mutation) {
  const queue = getManagerQueue()
  queue.push({
    id: globalThis.crypto?.randomUUID?.() || 'mut-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    timestamp: new Date().toISOString(),
    ...mutation
  })
  saveManagerQueue(queue)
  return queue
}

function isNetworkError(error) {
  return !error?.status && (error instanceof TypeError || /network|fetch|internet|failed|load|abort/i.test(String(error?.message || '')))
}

async function apiRequest(path, options = {}) {
  const session = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null')
  let response
  try {
    response = await fetch(apiUrl(path), {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(session?.token ? { Authorization: 'Bearer ' + session.token } : {}),
        ...(options.headers || {})
      }
    })
  } catch (err) {
    const error = new Error('Cannot reach data server: ' + (err.message || 'offline'))
    error.isNetwork = true
    throw error
  }
  if (response.status === 204) return {}
  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(body.error || 'The request could not be completed.')
    error.status = response.status
    throw error
  }
  return body
}

function getTotals(items) {
  const untaxed = items.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unitPrice || 0), 0)
  const tax5 = items.filter((item) => item.gst === 5).reduce((sum, item) => sum + item.quantity * item.unitPrice * 0.05, 0)
  const tax18 = items.filter((item) => item.gst === 18).reduce((sum, item) => sum + item.quantity * item.unitPrice * 0.18, 0)
  return { untaxed, tax5, tax18, tax: tax5 + tax18, total: untaxed + tax5 + tax18 }
}

function App() {
  const [connectionReady, setConnectionReady] = useState(() => isApiConfigured())
  const [session, setSession] = useState(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null')
      return (parsed && parsed.token && parsed.user) ? parsed : null
    } catch {
      return null
    }
  })
  const [projects, setProjects] = useState(() => getCachedProjects())
  const [staff, setStaff] = useState(() => getCachedStaff())
  const [loading, setLoading] = useState(() => Boolean(session && !getCachedProjects().length))
  const [selectedProjectId, setSelectedProjectId] = useState(() => {
    const cached = getCachedProjects()
    return cached[0]?.id || ''
  })
  const [page, setPage] = useState('overview')
  const [areaId, setAreaId] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [mobileMenu, setMobileMenu] = useState(false)
  const [toast, setToast] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [syncState, setSyncState] = useState('synced')
  const [pendingCount, setPendingCount] = useState(() => getManagerQueue().length)
  const syncingRef = useRef(false)

  const syncAll = async (userInitiated = false) => {
    if (!session || syncingRef.current) return
    syncingRef.current = true
    setSyncState('syncing')
    try {
      const queue = getManagerQueue()
      let syncedData = null

      if (queue.length > 0) {
        try {
          syncedData = await apiRequest('/sync', {
            method: 'POST',
            body: JSON.stringify({ mutations: queue })
          })
          saveManagerQueue([])
          setPendingCount(0)
        } catch (syncErr) {
          if (syncErr.isNetwork) throw syncErr
          const remaining = []
          for (const mut of queue) {
            try {
              if (mut.type === 'create_project' && mut.project) {
                await apiRequest('/projects', { method: 'POST', body: JSON.stringify(mut.project) })
              } else if (mut.type === 'update_project' && mut.projectId) {
                await apiRequest('/projects/' + mut.projectId, { method: 'PUT', body: JSON.stringify(mut.change) })
              } else if (mut.type === 'delete_project' && mut.projectId) {
                await apiRequest('/projects/' + mut.projectId, { method: 'DELETE' })
              } else if (mut.type === 'delete_submission' && mut.projectId && mut.submissionId) {
                await apiRequest('/staff/projects/' + mut.projectId + '/submissions/' + encodeURIComponent(mut.submissionId), { method: 'DELETE' })
              } else if (mut.type === 'create_staff' && mut.staff) {
                await apiRequest('/staff', { method: 'POST', body: JSON.stringify(mut.staff) })
              } else if (mut.type === 'delete_staff' && mut.staffId) {
                await apiRequest('/staff/' + mut.staffId, { method: 'DELETE' })
              }
            } catch (replayErr) {
              if (replayErr.isNetwork) {
                remaining.push(...queue.slice(queue.indexOf(mut)))
                break
              }
            }
          }
          saveManagerQueue(remaining)
          setPendingCount(remaining.length)
        }
      }

      if (!syncedData) {
        const [projRes, staffRes] = await Promise.all([
          apiRequest('/projects'),
          apiRequest('/staff').catch(() => ({ staff: [] }))
        ])
        syncedData = { projects: projRes.projects || [], staff: staffRes.staff || [] }
      }

      const nextProjects = (syncedData.projects || []).map(filterDeletedDraftsFromProject)
      const nextStaff = syncedData.staff || []

      setProjects(nextProjects)
      saveCachedProjects(nextProjects)
      if (nextStaff.length) {
        setStaff(nextStaff)
        saveCachedStaff(nextStaff)
      }
      setSelectedProjectId((current) => nextProjects.some((item) => item.id === current) ? current : (nextProjects[0]?.id || ''))
      setSyncState('synced')
      if (userInitiated) {
        setToast('Synchronized with cloud.')
      }

      // Automatically mirror live data to Windows desktop local disk backup if running inside desktop hub
      if (typeof window !== 'undefined' && window.krishnaHub?.saveBackup) {
        window.krishnaHub.saveBackup({
          projects: nextProjects,
          staff: nextStaff
        }).catch(() => {})
      }
    } catch (error) {
      if (error.status === 401) {
        localStorage.removeItem(SESSION_KEY)
        setSession(null)
      } else {
        setSyncState('offline')
        if (userInitiated) {
          setToast('Offline — changes remain saved safely on this device.')
        }
      }
    } finally {
      syncingRef.current = false
      setLoading(false)
      setPendingCount(getManagerQueue().length)
    }
  }

  useEffect(() => {
    if (session) {
      syncAll()
      const interval = window.setInterval(() => syncAll(), 10000)
      const onOnline = () => syncAll()
      window.addEventListener('online', onOnline)
      return () => {
        window.clearInterval(interval)
        window.removeEventListener('online', onOnline)
      }
    }
  }, [session])

  useEffect(() => {
    if (typeof window !== 'undefined' && window.krishnaHub?.onTriggerSync) {
      const cleanup = window.krishnaHub.onTriggerSync(() => {
        syncAll(true)
      })
      return cleanup
    }
  }, [session])

  useEffect(() => {
    if (typeof window !== 'undefined' && window.krishnaHub?.onCloudUrlChanged) {
      const cleanup = window.krishnaHub.onCloudUrlChanged((newUrl) => {
        if (newUrl) {
          setApiBase(newUrl)
          setToast('Sync address updated to ' + newUrl)
          syncAll(true)
        }
      })
      return cleanup
    }
  }, [session])

  useEffect(() => {
    if (toast) {
      const timer = window.setTimeout(() => setToast(''), 3000)
      return () => window.clearTimeout(timer)
    }
  }, [toast])

  if (!connectionReady) return <ConnectionSetup role="Manager" onConnected={() => setConnectionReady(true)} />

  const project = projects.find((item) => item.id === selectedProjectId) || projects[0]
  const selectProject = (id) => {
    const next = projects.find((item) => item.id === id)
    setSelectedProjectId(id)
    setAreaId(next?.areas[0]?.id || '')
    setPage('overview')
    setMobileMenu(false)
  }

  const mirrorToDesktopBackup = (nextProjectsList, nextStaffList) => {
    if (typeof window !== 'undefined' && window.krishnaHub?.saveBackup) {
      window.krishnaHub.saveBackup({
        projects: nextProjectsList || projects,
        staff: nextStaffList || staff
      }).catch(() => {})
    }
  }

  const patchProject = (change) => {
    if (!project) return null
    const nextQuotations = change.quotations ? mergeDuplicateQuotations(change.quotations) : project.quotations
    const normalizedChange = change.quotations ? { ...change, quotations: nextQuotations } : change
    const updated = { ...project, ...normalizedChange, updatedAt: new Date().toISOString() }
    const nextList = projects.map((item) => item.id === project.id ? updated : item)
    setProjects(nextList)
    saveCachedProjects(nextList)
    mirrorToDesktopBackup(nextList, staff)
    enqueueMutation({ type: 'update_project', projectId: project.id, change: normalizedChange })
    setPendingCount(getManagerQueue().length)
    syncAll()
    return updated
  }

  const updateArea = (id, change) => {
    if (!project) return
    patchProject({ areas: project.areas.map((area) => area.id === id ? { ...area, ...change } : area) })
  }

  const createProject = (values) => {
    const newProject = {
      id: uid('proj'),
      name: values.name || 'Untitled project',
      status: 'Needs site details',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      assignedStaffId: '',
      customer: {
        name: values.customer || '',
        address: '',
        location: '',
        reference: '',
        visitDate: '',
        sitePhoto: ''
      },
      areas: [],
      quotations: [],
      payments: [],
      staffDrafts: [],
      activityLog: [],
      syncMutations: []
    }
    const nextList = [newProject, ...projects]
    setProjects(nextList)
    saveCachedProjects(nextList)
    mirrorToDesktopBackup(nextList, staff)
    enqueueMutation({ type: 'create_project', project: newProject })
    setPendingCount(getManagerQueue().length)
    setSelectedProjectId(newProject.id)
    setAreaId('')
    setPage('customer')
    setShowCreate(false)
    setToast('Project created — saved locally.')
    syncAll()
  }

  const completeAuthentication = (nextSession) => {
    localStorage.setItem(SESSION_KEY, JSON.stringify(nextSession))
    setSession(nextSession)
  }

  const logout = async () => {
    try { await apiRequest('/auth/logout', { method: 'POST' }) } catch {}
    localStorage.removeItem(SESSION_KEY)
    setSession(null)
    setProjects([])
    setStaff([])
    setSelectedProjectId('')
  }

  const deleteProject = () => {
    if (!project || !window.confirm('Delete "' + project.name + '"? This removes its customer, quotation, and payment records.')) return
    const remaining = projects.filter((item) => item.id !== project.id)
    const next = remaining[0]
    setProjects(remaining)
    saveCachedProjects(remaining)
    mirrorToDesktopBackup(remaining, staff)
    enqueueMutation({ type: 'delete_project', projectId: project.id })
    setPendingCount(getManagerQueue().length)
    setSelectedProjectId(next?.id || '')
    setAreaId(next?.areas?.[0]?.id || '')
    setToast(project.name + ' was deleted.')
    syncAll()
  }

  const createStaffMember = (formValues) => {
    const id = uid('staff')
    const newStaff = { id, name: formValues.name.trim(), role: 'staff', createdAt: new Date().toISOString() }
    const nextStaffList = [...staff, newStaff]
    setStaff(nextStaffList)
    saveCachedStaff(nextStaffList)
    mirrorToDesktopBackup(projects, nextStaffList)
    enqueueMutation({
      type: 'create_staff',
      staff: { id, name: formValues.name.trim(), password: formValues.password }
    })
    setPendingCount(getManagerQueue().length)
    syncAll()
  }

  const removeStaffMember = (person) => {
    const nextStaffList = staff.filter((item) => item.id !== person.id)
    setStaff(nextStaffList)
    saveCachedStaff(nextStaffList)
    mirrorToDesktopBackup(projects, nextStaffList)
    enqueueMutation({ type: 'delete_staff', staffId: person.id })
    setPendingCount(getManagerQueue().length)
    syncAll()
  }

  const navigation = [
    ['overview', 'Overview', LayoutDashboard],
    ['customer', 'Customer details', FolderKanban],
    ['areas', 'Areas & materials', Ruler],
    ['quotations', 'Quotations', FileText],
    ['invoice', 'Invoice', Receipt],
    ['payments', 'Payments', CreditCard],
    ['team', 'Staff access', Users]
  ]
  const titles = {
    overview: ['Project overview', 'A clear view of the work, quotation and payment status.'],
    customer: ['Customer details', 'Keep the visit information and site reference together.'],
    areas: ['Areas & materials', 'Capture measurements and turn them into order-ready quantities.'],
    quotations: ['Quotations', 'Editable client-ready quotations with automatic GST totals.'],
    invoice: ['Invoice', 'Generate an invoice only from an approved quotation.'],
    payments: ['Payment tracking', 'See exactly what has been received and what is outstanding.'],
    team: ['Staff access', 'Manage staff accounts and review every field submission.']
  }
  const notifications = useMemo(() => projects.flatMap((item) => [
    ...(item.activityLog || []).map((entry) => ({
      id: entry.id,
      projectId: item.id,
      page: 'areas',
      title: entry.action,
      detail: item.name + ' · ' + entry.detail,
      createdAt: entry.createdAt
    })),
    ...(item.quotations || []).filter((quote) => quote.status !== 'Approved').map((quote) => ({
      id: item.id + '-' + quote.id,
      projectId: item.id,
      page: 'quotations',
      title: quote.id + ' needs approval',
      detail: item.name + ' · Draft quotation',
      createdAt: item.updatedAt
    }))
  ]).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 8), [projects])
  useEffect(() => {
    const onKeyDown = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setNotificationsOpen(false)
        setSearchOpen(true)
      }
      if (event.key === 'Escape') {
        setSearchOpen(false)
        setNotificationsOpen(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
  if (!session) return <AuthScreen onAuthenticated={completeAuthentication} onConfigure={canConfigureApiBase() ? () => { clearApiBase(); setConnectionReady(false) } : null} />
  if (loading) return <LoadingWorkspace />

  return (
    <div className="app-shell">
      <aside className={'sidebar ' + (mobileMenu ? 'open' : '')}>
        <div className="brand"><span className="brand-mark">K</span><span>KRISHNA<span>DECOR</span></span><button className="mobile-close" onClick={() => setMobileMenu(false)}><X size={18} /></button></div>
        <div className="workspace-label">OWNER WORKSPACE</div>
        <button className="new-project" onClick={() => setShowCreate(true)}><Plus size={16} />New project</button>
        <nav>
          {navigation.map(([id, label, Icon]) => <button key={id} className={page === id ? 'nav-item active' : 'nav-item'} onClick={() => { setPage(id); setMobileMenu(false) }}><Icon size={17} />{label}{id === 'quotations' && project?.quotations?.length > 0 ? <span className="nav-count">{project.quotations.length}</span> : null}</button>)}
        </nav>
        <div className="project-label"><span>YOUR PROJECTS</span><button onClick={() => setShowCreate(true)}><Plus size={15} /></button></div>
        <div className="project-list">
          {projects.map((item) => <button className={item.id === project?.id ? 'project-card selected' : 'project-card'} key={item.id} onClick={() => selectProject(item.id)}>
            <span className="project-icon">{item.name.slice(0, 1)}</span>
            <span><strong>{item.name}</strong><small>{item.customer.name || 'New project'}</small></span>
            <MoreHorizontal size={16} />
          </button>)}
        </div>
        <div className="sidebar-footer"><span className="avatar">{(session?.user?.name || 'Owner').slice(0, 2).toUpperCase()}</span><span><strong>{session?.user?.name || 'Owner'}</strong><small>Owner account</small></span><button className="logout-button" title="Sign out" onClick={logout}><LogOut size={15} /></button></div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <button className="menu-button" onClick={() => setMobileMenu(true)}><Menu size={21} /></button>
          <div className="crumbs"><span>Projects</span><ChevronRight size={13} /><strong>{project?.name || (page === 'team' ? 'Staff access' : 'New workspace')}</strong></div>
          <div className="top-actions">
            <button
              type="button"
              className={'sync-indicator-btn ' + syncState}
              onClick={() => syncAll(true)}
              title={syncState === 'synced' ? 'Online & synchronized (click to refresh)' : syncState === 'syncing' ? 'Synchronizing…' : 'Offline — click to retry sync'}
            >
              <span className={'sync-dot ' + syncState} />
              <span>
                {syncState === 'synced'
                  ? 'Cloud Synced'
                  : syncState === 'syncing'
                  ? 'Syncing…'
                  : pendingCount > 0
                  ? `Offline (${pendingCount} pending)`
                  : 'Offline (Local)'}
              </span>
              <RefreshCw size={12} className={syncState === 'syncing' ? 'spin-anim' : ''} />
            </button>
            <button className="search-button" onClick={() => { setNotificationsOpen(false); setSearchOpen(true) }}><Search size={17} /><span>Search</span><kbd>⌘ K</kbd></button>
            <div className="notification-wrap"><button className="icon-button notification" title="Notifications" aria-label="Notifications" aria-expanded={notificationsOpen} onClick={() => { setSearchOpen(false); setNotificationsOpen((open) => !open) }}><Bell size={19} />{notifications.length ? <i /> : null}</button>{notificationsOpen && <NotificationPanel notifications={notifications} onSelect={(notification) => { selectProject(notification.projectId); setPage(notification.page); setNotificationsOpen(false) }} />}</div>
            <span className="avatar top-avatar">{session.user.name.slice(0, 2).toUpperCase()}</span>
          </div>
        </header>
        <section className="page-head">
          <div><p className="eyebrow">{project?.status || 'OWNER WORKSPACE'}</p><h1>{titles[page][0]}</h1><p className="subhead">{titles[page][1]}</p></div>
          <div className="page-actions">{page === 'quotations' && project ? <button className="button primary" onClick={() => makeQuotation(project, patchProject, setToast)}><Plus size={16} />New quotation</button> : null}</div>
        </section>

        {page === 'team' ? <Team projects={projects} staff={staff} onCreateStaff={createStaffMember} onRemoveStaff={removeStaffMember} onRefresh={() => syncAll(true)} toast={setToast} /> : project ? <>
          {page === 'overview' && <Overview project={project} onPage={setPage} onRefresh={() => syncAll(true)} onDeleteProject={deleteProject} patchProject={patchProject} toast={setToast} />}
          {page === 'customer' && <Customer project={project} patchProject={patchProject} toast={setToast} />}
          {page === 'areas' && <Areas project={project} areaId={areaId} setAreaId={setAreaId} updateArea={updateArea} patchProject={patchProject} toast={setToast} />}
          {page === 'quotations' && <Quotations project={project} patchProject={patchProject} toast={setToast} />}
          {page === 'invoice' && <Invoice project={project} toast={setToast} />}
          {page === 'payments' && <Payments project={project} patchProject={patchProject} toast={setToast} />}
        </> : <EmptyWorkspace onCreate={() => setShowCreate(true)} />}
      </main>
      {showCreate && <NewProjectModal onClose={() => setShowCreate(false)} onCreate={createProject} />}
      {searchOpen && <SearchDialog projects={projects} navigation={navigation} onClose={() => setSearchOpen(false)} onSelect={(result) => { if (result.type === 'project') selectProject(result.id); else setPage(result.id); setSearchOpen(false) }} />}
      {toast && <div className="toast"><CheckCircle2 size={17} />{toast}</div>}
    </div>
  )
}

function ConnectionSetup({ role, onConnected }) {
  const [address, setAddress] = useState(() => apiBase())
  const [error, setError] = useState('')
  const [testing, setTesting] = useState(false)
  const connectWithUrl = async (targetUrl) => {
    setTesting(true)
    setError('')
    try {
      const base = setApiBase(targetUrl)
      const response = await fetch(base + '/health')
      const body = await response.json().catch(() => ({}))
      if (!response.ok || !body.ok) throw new Error(body.error || 'The data server did not respond.')
      onConnected()
    } catch (connectionError) {
      setError(connectionError.message || 'Could not connect to that data server.')
    } finally {
      setTesting(false)
    }
  }
  const connect = (event) => {
    event.preventDefault()
    connectWithUrl(address)
  }
  return <main className="connection-screen"><section className="connection-card"><div className="auth-brand"><span className="brand-mark">K</span><span>KRISHNA<span>DECOR</span></span></div><p className="eyebrow">{role.toUpperCase()} APP SETUP</p><h1>Connect to your workspace</h1><p>The apps synchronize automatically with the 24/7 cloud backend. You can also specify a custom address below.</p><form onSubmit={connect}><button type="button" className="button secondary preset-cloud-btn" style={{ width: '100%', marginBottom: '14px', border: '1px dashed #2563b8', background: '#eef4fc', color: '#173e73', fontWeight: 'bold' }} onClick={() => { setAddress('https://krishna-decor-api.onrender.com/api'); connectWithUrl('https://krishna-decor-api.onrender.com/api'); }}>Connect to 24/7 Cloud (Render + Neon)</button><label>Custom Sync address<input value={address} placeholder="https://krishna-decor-api.onrender.com/api" autoCapitalize="none" autoCorrect="off" inputMode="url" onChange={(event) => setAddress(event.target.value)} /></label>{error && <p className="auth-error">{error}</p>}<button className="button primary auth-submit" disabled={testing}>{testing ? 'Checking connection…' : 'Save & Connect'}<ArrowUpRight size={16} /></button></form><small>Default: <code>https://krishna-decor-api.onrender.com/api</code></small></section></main>
}

function AuthScreen({ onAuthenticated, onConfigure }) {
  const [setupRequired, setSetupRequired] = useState(null)
  const [values, setValues] = useState({ name: '', password: '' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [checking, setChecking] = useState(true)
  const currentServer = apiBase()
  const isCloud = currentServer.includes('krishna-decor-api.onrender.com')

  const resetToCloud = () => {
    clearApiBase()
    setError('')
    checkHealth()
  }

  const checkHealth = useCallback(() => {
    setChecking(true)
    apiRequest('/health')
      .then((result) => {
        setSetupRequired(result.setupRequired)
        setError('')
      })
      .catch(() => {
        setError('Cannot reach the Krishna Decor API. Start the api service, then refresh this page.')
      })
      .finally(() => setChecking(false))
  }, [])

  useEffect(() => {
    checkHealth()
    const timer = setInterval(() => {
      apiRequest('/health')
        .then((result) => {
          setSetupRequired(result.setupRequired)
          setError('')
        })
        .catch(() => {})
    }, 2500)
    return () => clearInterval(timer)
  }, [checkHealth])

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const result = await apiRequest(setupRequired ? '/auth/bootstrap' : '/auth/login', {
        method: 'POST',
        body: JSON.stringify({ ...values, email: usernameAlias(values.name), role: 'manager' })
      })
      onAuthenticated(result)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSubmitting(false)
    }
  }
  return <main className="auth-screen"><section className="auth-panel"><div className="auth-brand"><span className="brand-mark">K</span><span>KRISHNA<span>DECOR</span></span></div>{setupRequired === null && !error ? <div className="auth-loading"><Clock3 size={22} /><p>Connecting to your workspace…</p></div> : <><p className="eyebrow">{setupRequired ? 'SECURE FIRST-TIME SETUP' : 'OWNER SIGN IN'}</p><h1>{setupRequired ? 'Create the owner account' : 'Welcome back'}</h1><p className="auth-copy">{setupRequired ? 'There are no pre-created accounts or project records. Set the owner user name and password for this installation.' : 'Sign in to manage your live Krishna Decor projects.'}</p><div className="server-status-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 12px', margin: '0 0 16px', background: '#eef4fc', border: '1px solid #cddcf0', borderRadius: '99px', fontSize: '11px', color: '#244b7d' }}><span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 0 2px rgba(16,185,129,.25)' }}></span><span>Sync: {isCloud ? '24/7 Cloud (Render + Neon)' : 'Custom Server'}</span><code style={{ fontFamily: 'Consolas, monospace', fontSize: '10px', color: '#173e73' }}>{currentServer}</code></div><form onSubmit={submit} className="auth-form" autoComplete="off"><Field label="User name" name="manager-login-name" autoComplete="off" value={values.name} onChange={(event) => setValues({ ...values, name: event.target.value })} /><Field label="Password" name="manager-login-password" type="password" minLength="8" value={values.password} autoComplete={setupRequired ? 'new-password' : 'current-password'} onChange={(event) => setValues({ ...values, password: event.target.value })} />{error && <div className="auth-error-box"><p className="auth-error">{error}</p>{(!isCloud || /reach|connect|failed|offline/i.test(error)) && <button type="button" className="button secondary" style={{ marginTop: '0.5rem', width: '100%', background: '#f0fdf4', borderColor: '#86efac', color: '#166534', fontWeight: 'bold' }} onClick={resetToCloud}>Reset to 24/7 Cloud Server</button>}<button type="button" className="button secondary" style={{ marginTop: '0.5rem', width: '100%' }} disabled={checking} onClick={checkHealth}>{checking ? 'Connecting…' : 'Retry connection'}</button></div>}<button className="button primary auth-submit" disabled={submitting || setupRequired === null}>{submitting ? 'Please wait…' : setupRequired ? 'Create owner account' : 'Sign in'}<ArrowUpRight size={16} /></button></form>{onConfigure && <button className="connection-link" onClick={onConfigure}>Use a different data server</button>}</>}</section><aside className="auth-aside"><p className="eyebrow light">KRISHNA DECOR / OWNER DESK</p><h2>Project management that carries the detail.</h2><p>Measurements, materials, approvals and payment tracking live in one secure workspace.</p><div className="auth-points"><span><CheckCircle2 size={16} />No seeded customer or financial data</span><span><CheckCircle2 size={16} />Role-limited field staff access</span><span><CheckCircle2 size={16} />Persistent shared project records</span></div></aside></main>
}

function LoadingWorkspace() {
  return <main className="loading-workspace"><span className="brand-mark">K</span><p>Loading your owner workspace…</p></main>
}

function EmptyWorkspace({ onCreate }) {
  return <section className="empty-workspace"><span className="empty-orbit"><FolderKanban size={30} /></span><p className="eyebrow">NO PROJECTS YET</p><h2>Your workspace is ready.</h2><p>Create a project to record the client, capture site measurements and prepare the first quotation.</p><button className="button primary" onClick={onCreate}><Plus size={16} />Create first project</button></section>
}

function SearchDialog({ projects, navigation, onClose, onSelect }) {
  const [query, setQuery] = useState('')
  const normalizedQuery = query.trim().toLowerCase()
  const projectResults = projects.filter((item) => [item.name, item.customer?.name, item.customer?.location, item.customer?.address].some((value) => String(value || '').toLowerCase().includes(normalizedQuery)))
  const pageResults = navigation.filter(([, label]) => label.toLowerCase().includes(normalizedQuery))
  return <div className="search-layer" role="presentation" onMouseDown={onClose}><section className="search-dialog" role="dialog" aria-modal="true" aria-label="Search workspace" onMouseDown={(event) => event.stopPropagation()}><div className="search-input"><Search size={18} /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search projects or sections" /><button className="icon-button" title="Close search" aria-label="Close search" onClick={onClose}><X size={16} /></button></div><div className="search-results">{pageResults.length > 0 && <div className="search-group"><p>WORKSPACE</p>{pageResults.map(([id, label, Icon]) => <button key={id} onClick={() => onSelect({ type: 'page', id })}><Icon size={16} /><span>{label}</span><ChevronRight size={15} /></button>)}</div>}{projectResults.length > 0 && <div className="search-group"><p>PROJECTS</p>{projectResults.map((item) => <button key={item.id} onClick={() => onSelect({ type: 'project', id: item.id })}><FolderKanban size={16} /><span><strong>{item.name}</strong><small>{item.customer?.name || item.customer?.location || 'Project workspace'}</small></span><ChevronRight size={15} /></button>)}</div>}{!pageResults.length && !projectResults.length && <div className="search-empty">No projects or sections match &quot;{query}&quot;.</div>}</div></section></div>
}

function NotificationPanel({ notifications, onSelect }) {
  return <div className="notification-panel" role="status"><div className="notification-panel-head"><strong>Notifications</strong><span>{notifications.length}</span></div>{notifications.length ? <div className="notification-list">{notifications.map((item) => <button key={item.id} onClick={() => onSelect(item)}><Bell size={15} /><span><strong>{item.title}</strong><small>{item.detail}</small></span><ChevronRight size={14} /></button>)}</div> : <p className="notification-empty">You are all caught up.</p>}</div>
}

function Team({ projects, staff, onCreateStaff, onRemoveStaff, onRefresh, toast }) {
  const emptyStaffForm = { name: '', password: '' }
  const [form, setForm] = useState(emptyStaffForm)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [removingStaffId, setRemovingStaffId] = useState('')
  const [staffToRemove, setStaffToRemove] = useState(null)
  const createStaff = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      if (onCreateStaff) {
        await onCreateStaff(form)
      } else {
        await apiRequest('/staff', { method: 'POST', body: JSON.stringify({ ...form, email: usernameAlias(form.name) }) })
      }
      setForm(emptyStaffForm)
      toast('Staff account created. They can now select any project.')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSubmitting(false)
    }
  }
  const removeStaff = async (person) => {
    setRemovingStaffId(person.id)
    try {
      if (onRemoveStaff) {
        await onRemoveStaff(person)
      } else {
        await apiRequest('/staff/' + person.id, { method: 'DELETE' })
      }
      toast(person.name + ' was removed from staff access.')
    } catch (requestError) {
      toast('Could not remove staff member: ' + requestError.message)
    } finally {
      setRemovingStaffId('')
      setStaffToRemove(null)
    }
  }
  const activity = projects.flatMap((project) => (project.activityLog || []).map((entry) => ({ ...entry, projectName: project.name }))).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  return <><div className="team-layout"><section className="panel team-form"><div className="section-heading"><div><p className="eyebrow">FIELD ACCESS</p><h3>Add a staff member</h3></div><Users size={20} /></div><p className="team-copy">Every staff member can select any manager-created project. Each field submission is automatically attributed to their user name.</p><form onSubmit={createStaff} className="team-inputs" autoComplete="off"><Field label="Staff member name" name="new-staff-name" autoComplete="off" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /><Field label="Temporary password" name="new-staff-password" autoComplete="new-password" type="password" minLength="8" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />{error && <p className="auth-error">{error}</p>}<button className="button primary" disabled={submitting}>{submitting ? 'Creating…' : 'Create staff account'}<ArrowUpRight size={16} /></button></form></section><section className="panel team-list"><div className="section-heading"><div><p className="eyebrow">STAFF ACCOUNTABILITY</p><h3>Field activity log</h3></div><div className="activity-actions"><span className="tag">{activity.length} records</span><button className="text-button" onClick={onRefresh}>Refresh activity</button></div></div>{activity.length ? <table className="simple-table audit-table"><thead><tr><th>Staff member</th><th>Project</th><th>Action</th><th>Recorded</th></tr></thead><tbody>{activity.map((entry) => <tr key={entry.id}><td><strong>{entry.actorName}</strong></td><td>{entry.projectName}</td><td><strong>{entry.action}</strong><small>{entry.detail}</small></td><td>{new Date(entry.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</td></tr>)}</tbody></table> : <Empty label="Staff submissions will appear here with the user name and time recorded." />}</section><section className="panel staff-directory"><div className="section-heading"><div><p className="eyebrow">STAFF DIRECTORY</p><h3>Active accounts</h3></div></div>{staff.length ? <div className="directory-grid">{staff.map((person) => <div className="staff-card" key={person.id}><span>{person.name.slice(0, 1).toUpperCase()}</span><div><strong>{person.name}</strong><small>Name and password sign-in</small></div><button type="button" className="button remove-staff" disabled={removingStaffId === person.id} onClick={() => setStaffToRemove(person)}><Trash2 size={14} />{removingStaffId === person.id ? 'Removing...' : 'Remove'}</button></div>)}</div> : <Empty label="No staff accounts have been created." />}</section></div>{staffToRemove && <ConfirmRemovalModal person={staffToRemove} busy={removingStaffId === staffToRemove.id} onClose={() => setStaffToRemove(null)} onConfirm={() => removeStaff(staffToRemove)} />}</>
}

function ConfirmRemovalModal({ person, busy, onClose, onConfirm }) {
  return <div className="modal-layer" onMouseDown={busy ? undefined : onClose}><section className="modal confirm-removal" role="dialog" aria-modal="true" aria-label="Remove staff member" onMouseDown={(event) => event.stopPropagation()}><button className="modal-close" type="button" aria-label="Close" disabled={busy} onClick={onClose}><X size={18} /></button><span className="modal-kicker">REMOVE STAFF ACCESS</span><h2>Remove {person.name}?</h2><p>This account will no longer be able to sign in. Existing field entries remain in the project history.</p><div className="modal-actions"><button type="button" className="button secondary" disabled={busy} onClick={onClose}>Cancel</button><button type="button" className="button danger-button" disabled={busy} onClick={onConfirm}><Trash2 size={15} />{busy ? 'Removing...' : 'Remove staff'}</button></div></section></div>
}

function Overview({ project, onPage, onRefresh, onDeleteProject, patchProject, toast }) {
  const currentQuote = project.quotations[project.quotations.length - 1]
  const totals = getTotals(currentQuote?.items || [])
  const paid = project.payments.reduce((sum, payment) => sum + (payment.state === 'Received' ? payment.amount : 0), 0)
  const progress = project.areas.length ? Math.min(100, 25 + project.areas.length * 20 + (currentQuote ? 30 : 0)) : 12
  const staffDrafts = project.staffDrafts || []
  const savedDrafts = staffDrafts
  const [editingDraft, setEditingDraft] = useState(null)
  const removeDraft = (draftId, draftDesc, draftObj = null) => {
    const cleanTarget = String(draftId || draftObj?.rawId || draftObj?.id || '').replace(/^staff-/, '').trim()
    markStaffDraftDeleted(project.id, cleanTarget, draftObj)

    if (cleanTarget) {
      apiRequest('/staff/projects/' + project.id + '/submissions/' + encodeURIComponent(cleanTarget), { method: 'DELETE' }).catch(() => {})
      enqueueMutation({ type: 'delete_submission', projectId: project.id, submissionId: cleanTarget })
    }

    const remaining = (project.staffDrafts || []).filter((s) => {
      if (matchesStaffDraft(s, draftObj, draftId)) return false
      if (cleanTarget && String(s.id || s.rawId || s.localId || '').replace(/^staff-/, '').trim().toLowerCase() === cleanTarget.toLowerCase()) return false
      if (isStaffDraftDeleted(project.id, s)) return false
      return true
    })
    const nextAreas = (project.areas || []).map((a) => ({
      ...a,
      products: (a.products || []).filter((p) => {
        if (matchesStaffDraft(p, draftObj, draftId)) return false
        if (cleanTarget && String(p.id || p.rawId || '').replace(/^staff-/, '').trim().toLowerCase() === cleanTarget.toLowerCase()) return false
        if (isStaffDraftDeleted(project.id, p)) return false
        return true
      })
    }))
    const nextMutations = (project.syncMutations || []).map((m) => ({
      ...m,
      submissionIds: (m.submissionIds || []).filter((sId) => String(sId).replace(/^staff-/, '').trim().toLowerCase() !== cleanTarget.toLowerCase())
    })).filter((m) => (m.submissionIds || []).length > 0)

    patchProject?.({ staffDrafts: remaining, areas: nextAreas, syncMutations: nextMutations })
    toast?.('Field submission removed.')
  }
  return <div className="overview-grid">
    <section className="hero-card">
      <div className="hero-glow" />
      <div className="hero-content"><p className="eyebrow light">PROJECT HEALTH</p><h2>{project.name}</h2><p>{project.customer.location || 'Add the customer’s location and visit details to start the workflow.'}</p>
        <div className="hero-progress"><div><span>Project completion</span><strong>{progress}%</strong></div><div className="progress-track"><i style={{ width: progress + '%' }} /></div></div>
      </div>
      <div className="hero-meta"><div><MapPin size={16} /><span><small>Location</small><b>{project.customer.location || '—'}</b></span></div></div>
      <button className="button danger-button overview-delete" onClick={onDeleteProject}><Trash2 size={15} />Delete project</button>
    </section>
    <section className="stats-row">
      <Stat icon={<Ruler size={18} />} label="Measured areas" value={project.areas.length} note={project.areas.length ? 'Ready to quote' : 'Add your first area'} />
      <Stat icon={<FileText size={18} />} label="Quotation value" value={currentQuote ? currency(totals.total) : '—'} note={currentQuote ? currentQuote.id : 'No quotation yet'} />
      <Stat icon={<CircleDollarSign size={18} />} label="Payment received" value={currency(paid)} note={currentQuote ? currency(Math.max(0, totals.total - paid)) + ' outstanding' : 'Awaiting quotation'} />
    </section>
    <section className="panel activity-panel"><div className="panel-title"><div><p className="eyebrow">WORKFLOW</p><h3>Move this project forward</h3></div><button className="text-button" onClick={() => onPage('areas')}>View all <ArrowUpRight size={15} /></button></div>
      <div className="workflow">
        <WorkflowStep done={Boolean(project.customer.name && project.customer.address)} step="01" title="Customer details" description="Site address and reference" action="Review details" onClick={() => onPage('customer')} />
        <WorkflowStep done={project.areas.length > 0} step="02" title="Areas & measurements" description={project.areas.length ? project.areas.length + ' areas measured' : 'Select spaces and enter dimensions'} action="Open areas" onClick={() => onPage('areas')} />
        <WorkflowStep done={Boolean(currentQuote)} step="03" title="Quotation" description={currentQuote ? currentQuote.id + ' is ' + currentQuote.status.toLowerCase() : 'Build the client quote'} action="View quotation" onClick={() => onPage('quotations')} />
        <WorkflowStep done={currentQuote?.status === 'Approved'} step="04" title="Invoice & payment" description="Available after quotation approval" action="Track payment" onClick={() => onPage('payments')} />
      </div>
    </section>
    <section className="panel recent-panel"><div className="panel-title"><div><p className="eyebrow">AREAS</p><h3>Latest measurements</h3></div><button className="text-button" onClick={() => onPage('areas')}>Manage areas <ArrowUpRight size={15} /></button></div>
      {project.areas.length ? <div className="area-preview-grid">{project.areas.slice(0, 4).map((area, index) => <div className={'area-preview tone-' + (index % 3)} key={area.id}><span>{String(index + 1).padStart(2, '0')}</span><h4>{area.name}</h4><p>{area.width} × {area.height} in</p><small>{area.products?.length || 0} materials</small></div>)}</div> : <Empty label="No areas have been selected yet." action="Add an area" onClick={() => onPage('areas')} />}</section>
    <section className="panel staff-updates-panel"><div className="panel-title"><div><p className="eyebrow">STAFF UPDATES</p><h3>Saved field measurements and product selections</h3></div><div className="staff-update-actions"><span className="tag">{savedDrafts.length} saved</span><button className="text-button" onClick={onRefresh}>Refresh updates</button></div></div>
      {staffDrafts.length ? <div className="staff-update-list">{staffDrafts.slice().reverse().map((draft) => <article className="staff-update" key={draft.id}><span className="staff-update-avatar">{(draft.staffName || 'S').slice(0, 1).toUpperCase()}</span><div><strong>{draft.area} / {draft.product}</strong><p>{quantity(draft.width)} × {quantity(draft.height)} {draft.unit} {draft.notes ? '· ' + draft.notes : ''}</p><small>Saved by {draft.staffName || 'Staff'} · {new Date(draft.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</small></div><div className="staff-update-side"><em>{draft.status === 'Pending review' ? 'Saved' : draft.status}</em>{patchProject && <div className="row-action-buttons"><button type="button" className="icon-button" title="Edit field entry" aria-label="Edit field entry" onClick={() => setEditingDraft(staffSubmissionLine(draft))}><Pencil size={14} /></button><button type="button" className="icon-button danger" title="Delete field entry" aria-label="Delete field entry" onClick={() => removeDraft(draft.id, draft.area + ' / ' + draft.product, draft)}><Trash2 size={14} /></button></div>}</div></article>)}</div> : <Empty label="Saved staff cart items will appear here automatically." />}
    </section>
    {editingDraft && (
      <EditMaterialModal
        material={editingDraft}
        areas={project.areas}
        onClose={() => setEditingDraft(null)}
        onSave={(updated) => {
          const targetId = updated.rawId || updated.id
          const cleanArea = (updated.area || '').trim()
          const nextDrafts = (project.staffDrafts || []).map((draft) => {
            if (matchesStaffDraft(draft, updated, targetId)) {
              const w = Number(updated.width) > 0 ? Number(updated.width) : (Number(draft.width) || 0)
              const h = Number(updated.height) > 0 ? Number(updated.height) : (Number(draft.height) || 0)
              const u = updated.unit || draft.unit || 'in'
              return {
                ...draft,
                area: cleanArea || draft.area,
                product: updated.product || draft.product,
                width: w,
                height: h,
                unit: u,
                clampType: updated.clampType !== undefined ? updated.clampType : (draft.clampType || ''),
                quantity: (updated.quantity !== undefined && updated.quantity !== '') ? Number(updated.quantity) : (Number(draft.quantity) || 0),
                unitPrice: Number(updated.unitPrice) || 0,
                gst: Number(updated.gst) || 18,
                notes: updated.note !== undefined ? updated.note : (draft.notes || '')
              }
            }
            return draft
          })

          let nextAreas = [...(project.areas || [])]
          const existingAreaIndex = nextAreas.findIndex(a => a.name.toLowerCase() === cleanArea.toLowerCase())
          if (cleanArea && existingAreaIndex === -1) {
            const factor = UNITS_TO_INCHES[updated.unit] || 1
            const w = Number(updated.width) > 0 ? Number((Number(updated.width) * factor).toFixed(2)) : 0
            const h = Number(updated.height) > 0 ? Number((Number(updated.height) * factor).toFixed(2)) : 0
            nextAreas.push({
              id: uid('area'),
              name: cleanArea,
              width: w,
              height: h,
              unit: updated.unit || 'in',
              products: []
            })
          } else if (existingAreaIndex >= 0) {
            const targetArea = nextAreas[existingAreaIndex]
            if ((!targetArea.width || !targetArea.height) && Number(updated.width) > 0 && Number(updated.height) > 0) {
              const factor = UNITS_TO_INCHES[updated.unit] || 1
              nextAreas[existingAreaIndex] = {
                ...targetArea,
                width: Number((Number(updated.width) * factor).toFixed(2)),
                height: Number((Number(updated.height) * factor).toFixed(2)),
                unit: updated.unit || targetArea.unit
              }
            }
          }

          patchProject?.({ staffDrafts: nextDrafts, areas: nextAreas })
          toast?.(`Staff entry for ${updated.product} updated.`)
          setEditingDraft(null)
        }}
      />
    )}
  </div>
}

function Stat({ icon, label, value, note }) {
  return <div className="stat-card"><span className="stat-icon">{icon}</span><p>{label}</p><h3>{value}</h3><small>{note}</small></div>
}

function WorkflowStep({ done, step, title, description, action, onClick }) {
  return <button className="workflow-step" onClick={onClick}><span className={done ? 'step-status done' : 'step-status'}>{done ? <CheckCircle2 size={18} /> : step}</span><span><strong>{title}</strong><small>{description}</small></span><span className="workflow-action">{action}<ChevronRight size={16} /></span></button>
}

function Customer({ project, patchProject, toast }) {
  const customer = project.customer
  const fileRef = useRef()
  const setCustomer = (key, value) => patchProject({ customer: { ...customer, [key]: value }, status: project.status === 'Needs site details' ? 'Site details in progress' : project.status })
  const loadPhoto = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setCustomer('sitePhoto', reader.result)
    reader.readAsDataURL(file)
  }
  return <div className="customer-layout">
    <section className="panel form-panel"><div className="section-heading"><div><p className="eyebrow">CONTACT</p><h3>Customer & site</h3></div><span className="autosave"><CheckCircle2 size={14} />Saved automatically</span></div>
      <div className="form-grid">
        <Field label="Customer name" value={customer.name} placeholder="Full name" onChange={(e) => setCustomer('name', e.target.value)} />
        <Field label="Date of visit" type="date" value={customer.visitDate} onChange={(e) => setCustomer('visitDate', e.target.value)} />
        <Field label="Site location" value={customer.location} placeholder="City, State" onChange={(e) => setCustomer('location', e.target.value)} />
        <Field label="Reference" value={customer.reference} placeholder="Architect, designer or referral" onChange={(e) => setCustomer('reference', e.target.value)} />
        <label className="field full"><span>Site address</span><textarea rows="4" value={customer.address} placeholder="Complete project address" onChange={(e) => setCustomer('address', e.target.value)} /></label>
      </div>
      <div className="form-footer"><p>These details appear on the quotation and invoice records.</p><button className="button primary" onClick={() => toast('Customer details saved.')}>Save details</button></div>
    </section>
    <section className="panel photo-panel"><div className="section-heading"><div><p className="eyebrow">SITE PIC</p><h3>Reference image</h3></div>{customer.sitePhoto && <button className="icon-button" onClick={() => setCustomer('sitePhoto', '')}><Trash2 size={16} /></button>}</div>
      {customer.sitePhoto ? <img className="site-image" src={customer.sitePhoto} alt="Project site" /> : <button className="upload-zone" onClick={() => fileRef.current?.click()}><span><ImageIcon size={27} /></span><strong>Upload site picture</strong><small>JPG, PNG or WEBP</small></button>}
      <input ref={fileRef} className="hidden" type="file" accept="image/*" onChange={loadPhoto} />
      {customer.sitePhoto && <button className="button secondary full-button" onClick={() => fileRef.current?.click()}><Upload size={16} />Replace image</button>}
    </section>
  </div>
}

function Field({ label, ...props }) {
  return <label className="field"><span>{label}</span><input {...props} /></label>
}

function RenameAreaModal({ area, onClose, onSave }) {
  const [name, setName] = useState(area.name)
  const handleSubmit = (e) => {
    e.preventDefault()
    if (name.trim()) onSave(name.trim())
  }
  return (
    <div className="modal-layer" onMouseDown={onClose}>
      <form className="modal" onSubmit={handleSubmit} onMouseDown={(e) => e.stopPropagation()}>
        <button type="button" className="modal-close" onClick={onClose}><X size={18} /></button>
        <span className="modal-kicker">PROJECT AREA</span>
        <h2>Rename area</h2>
        <p>Update the name for this space. Associated materials and staff entries will update automatically.</p>
        <Field label="Area name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        <div className="modal-actions">
          <button type="button" className="button secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="button primary">Save name</button>
        </div>
      </form>
    </div>
  )
}

function EditMaterialModal({ material, areas = [], onClose, onSave }) {
  const currentArea = areas.find((a) => a.name.toLowerCase() === (material.area || '').toLowerCase()) ||
    areas.find((a) => a.id === material.originAreaId)
  const [areaName, setAreaName] = useState(material.area || currentArea?.name || areas[0]?.name || '')
  const [isCustomArea, setIsCustomArea] = useState(
    Boolean(material.area && !areas.some((a) => a.name.toLowerCase() === (material.area || '').toLowerCase()))
  )
  const [product, setProduct] = useState(material.product)
  const [unit, setUnit] = useState(material.unit || currentArea?.unit || 'in')
  const [width, setWidth] = useState(() => {
    if (material.width !== undefined && material.width !== null && material.width !== '' && Number(material.width) > 0) {
      return material.unit && material.unit !== 'in' ? Number(fromInches(material.width, material.unit).toFixed(2)) : material.width
    }
    if (currentArea?.width) {
      return currentArea.unit && currentArea.unit !== 'in' ? Number(fromInches(currentArea.width, currentArea.unit).toFixed(2)) : currentArea.width
    }
    return ''
  })
  const [height, setHeight] = useState(() => {
    if (material.height !== undefined && material.height !== null && material.height !== '' && Number(material.height) > 0) {
      return material.unit && material.unit !== 'in' ? Number(fromInches(material.height, material.unit).toFixed(2)) : material.height
    }
    if (currentArea?.height) {
      return currentArea.unit && currentArea.unit !== 'in' ? Number(fromInches(currentArea.height, currentArea.unit).toFixed(2)) : currentArea.height
    }
    return ''
  })
  const [clampType, setClampType] = useState(material.clampType || '')
  const [quantity, setQuantity] = useState(material.quantity ?? 0)
  const [quantityOverridden, setQuantityOverridden] = useState(Boolean(material.quantityOverridden))
  const [unitPrice, setUnitPrice] = useState(material.unitPrice ?? 0)
  const [gst, setGst] = useState(material.gst || 18)
  const [note, setNote] = useState(material.notes || material.note || '')

  const isStaff = Boolean(material.isStaff)
  const isCurtainSelected =
    CURTAIN_SYSTEMS.some((sys) => sys.name === product) ||
    ALL_CURTAIN_COMPONENT_NAMES.has(product) ||
    /curtain|sheer|lining|eyelet|eylet|ripple|american|valance|valence/i.test(product || '')

  // Effective dimensions in inches
  const effectiveWidthInches = toInches(width, unit) || (currentArea ? Number(currentArea.width) : 0)
  const effectiveHeightInches = toInches(height, unit) || (currentArea ? Number(currentArea.height) : 0)

  const prevProductRef = useRef(product)

  useEffect(() => {
    const prodObj = findProductDef(product) || MATERIAL_PRODUCTS.find((p) => p.name === product) || { name: product, gst: 18, formula: 'standard' }
    if (effectiveWidthInches > 0 && effectiveHeightInches > 0) {
      const calc = calculateProduct(prodObj, effectiveWidthInches, effectiveHeightInches)
      const productChanged = prevProductRef.current !== product
      if (productChanged || !quantityOverridden) {
        setQuantity(calc.quantity)
        setNote(calc.note)
        setGst(prodObj.gst)
        if (productChanged) {
          prevProductRef.current = product
          setQuantityOverridden(false)
        }
      }
    }
  }, [product, effectiveWidthInches, effectiveHeightInches, quantityOverridden])

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave({
      ...material,
      area: (areaName || '').trim(),
      product,
      width: Number(width) > 0 ? Number(width) : (Number(material.width) || 0),
      height: Number(height) > 0 ? Number(height) : (Number(material.height) || 0),
      unit,
      clampType: isCurtainSelected ? clampType : '',
      quantity: Number(Number(quantity || 0).toFixed(2)),
      quantityOverridden,
      unitPrice: Number(unitPrice) || 0,
      gst: Number(gst) || 18,
      note
    })
  }

  return (
    <div className="modal-layer" onMouseDown={onClose}>
      <form className="modal" onSubmit={handleSubmit} onMouseDown={(e) => e.stopPropagation()}>
        <button type="button" className="modal-close" onClick={onClose}><X size={18} /></button>
        <span className="modal-kicker">{isStaff ? 'FIELD MEASUREMENT' : 'MATERIAL ITEM'} · {areaName || material.area}</span>
        <h2>Edit {isStaff ? 'staff entry' : 'material'}</h2>
        <p>Update specifications, dimensions, quantity, MRP and tax rate. Changes are saved to this project workspace.</p>

        <label className="field" style={{ marginTop: '14px' }}>
          <span>Assigned Area / Space</span>
          {areas.length > 0 && !isCustomArea ? (
            <div style={{ display: 'flex', gap: '8px' }}>
              <select
                value={areaName}
                onChange={(e) => {
                  if (e.target.value === '__new__') {
                    setIsCustomArea(true)
                    setAreaName('')
                  } else {
                    setAreaName(e.target.value)
                  }
                }}
                style={{ flex: 1 }}
              >
                {!areas.some((a) => a.name.toLowerCase() === (areaName || '').toLowerCase()) && areaName && (
                  <option value={areaName}>{areaName} (Current)</option>
                )}
                {areas.map((a) => (
                  <option key={a.id} value={a.name}>{a.name}</option>
                ))}
                <option value="__new__">+ Enter new area name…</option>
              </select>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                required
                value={areaName}
                placeholder="e.g. Master Bedroom, Balcony"
                onChange={(e) => setAreaName(e.target.value)}
                style={{ flex: 1 }}
              />
              {areas.length > 0 && (
                <button
                  type="button"
                  className="button secondary small"
                  onClick={() => {
                    setIsCustomArea(false)
                    setAreaName(areas[0]?.name || '')
                  }}
                >
                  Choose existing
                </button>
              )}
            </div>
          )}
        </label>

        <label className="field" style={{ marginTop: '14px' }}>
          <span>Product / material</span>
          <select value={product} onChange={(e) => setProduct(e.target.value)}>
            {!EDITABLE_MODAL_PRODUCTS.includes(product) && product && (
              <option value={product}>{product}</option>
            )}
            {EDITABLE_MODAL_PRODUCTS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </label>

        {(isStaff || isCurtainSelected || Boolean(width || height || currentArea?.width)) && (
          <div className="measure-row" style={{ marginTop: '14px' }}>
            <label className="field" style={{ flex: 1 }}>
              <span>Width ({unit})</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={width}
                placeholder="Width"
                onChange={(e) => {
                  setWidth(e.target.value)
                  setQuantityOverridden(false)
                }}
              />
            </label>
            <span style={{ alignSelf: 'center', marginTop: '18px', fontWeight: 'bold' }}>×</span>
            <label className="field" style={{ flex: 1 }}>
              <span>Height ({unit})</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={height}
                placeholder="Height"
                onChange={(e) => {
                  setHeight(e.target.value)
                  setQuantityOverridden(false)
                }}
              />
            </label>
            <label className="field" style={{ width: '130px' }}>
              <span>Unit</span>
              <select
                value={unit}
                onChange={(e) => {
                  setUnit(e.target.value)
                  setQuantityOverridden(false)
                }}
              >
                <option value="in">Inches</option>
                <option value="ft">Feet</option>
                <option value="m">Metres</option>
                <option value="cm">Centimetres</option>
              </select>
            </label>
          </div>
        )}

        {isCurtainSelected && (
          <label className="field" style={{ marginTop: '14px' }}>
            <span>Mounting clamp <small>(optional)</small></span>
            <select value={clampType} onChange={(e) => setClampType(e.target.value)}>
              <option value="">Select a clamp type (Optional)</option>
              {CLAMP_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
        )}

        <div className="form-grid" style={{ marginTop: '14px', gap: '12px' }}>
          <Field
            label={`Calculated Quantity (${unitLabel(product)})`}
            type="number"
            step="0.01"
            min="0"
            value={quantity}
            onChange={(e) => {
              setQuantity(e.target.value)
              setQuantityOverridden(true)
            }}
          />
          <Field
            label="Unit MRP (₹)"
            type="number"
            step="1"
            min="0"
            value={unitPrice}
            onChange={(e) => setUnitPrice(e.target.value)}
          />
        </div>

        {['eyelet', 'ripple'].includes(findProductDef(product).formula) && (
          <div style={{ marginTop: '6px', fontSize: '12px', color: '#1d4ed8', fontWeight: 600 }}>
            Formula: ⌈W / 20⌉ × ((H + 15) / 39) = {Number(quantity).toFixed(2)} m
          </div>
        )}

        <label className="field" style={{ marginTop: '14px' }}>
          <span>GST Rate</span>
          <select value={gst} onChange={(e) => setGst(e.target.value)}>
            <option value="5">5% GST</option>
            <option value="18">18% GST</option>
          </select>
        </label>

        <label className="field" style={{ marginTop: '14px' }}>
          <span>Notes / specification</span>
          <input
            value={note}
            placeholder="e.g. Dimensions, custom make notes"
            onChange={(e) => setNote(e.target.value)}
          />
        </label>

        <div className="modal-actions">
          <button type="button" className="button secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="button primary">Save material</button>
        </div>
      </form>
    </div>
  )
}

function AreaDimensionDrawer({ area, onChangeDimension, onChangeUnit, staffEntriesCount, onSyncToStaff, onClose }) {
  const [localWidth, setLocalWidth] = useState(() => {
    const val = fromInches(area.width, area.unit)
    return val ? (area.unit === 'in' ? String(Math.round(val)) : String(Number(val.toFixed(2)))) : ''
  })
  const [localHeight, setLocalHeight] = useState(() => {
    const val = fromInches(area.height, area.unit)
    return val ? (area.unit === 'in' ? String(Math.round(val)) : String(Number(val.toFixed(2)))) : ''
  })

  useEffect(() => {
    const valW = fromInches(area.width, area.unit)
    const formattedW = valW ? (area.unit === 'in' ? String(Math.round(valW)) : String(Number(valW.toFixed(2)))) : ''
    if (Number(localWidth) !== valW && formattedW !== localWidth) {
      setLocalWidth(formattedW)
    }
    const valH = fromInches(area.height, area.unit)
    const formattedH = valH ? (area.unit === 'in' ? String(Math.round(valH)) : String(Number(valH.toFixed(2)))) : ''
    if (Number(localHeight) !== valH && formattedH !== localHeight) {
      setLocalHeight(formattedH)
    }
  }, [area.width, area.height, area.unit])

  const handleWidthChange = (val) => {
    setLocalWidth(val)
    onChangeDimension(area.id, 'width', val)
  }
  const handleHeightChange = (val) => {
    setLocalHeight(val)
    onChangeDimension(area.id, 'height', val)
  }

  return (
    <div className="area-dimensions-drawer">
      <div className="area-dimensions-drawer-head">
        <strong>Edit measurements for {area.name}</strong>
        <span>Dimensions stored in inches for precision calculations</span>
      </div>
      <div className="measurement-grid" style={{ marginTop: '6px' }}>
        <label className="measure-field">
          <span>Width</span>
          <div>
            <input
              type="number"
              min="0"
              step="any"
              value={localWidth}
              placeholder="0"
              onChange={(e) => handleWidthChange(e.target.value)}
            />
            <small>{area.unit}</small>
          </div>
        </label>
        <span className="times">×</span>
        <label className="measure-field">
          <span>Height</span>
          <div>
            <input
              type="number"
              min="0"
              step="any"
              value={localHeight}
              placeholder="0"
              onChange={(e) => handleHeightChange(e.target.value)}
            />
            <small>{area.unit}</small>
          </div>
        </label>
        <label className="unit-field">
          <span>Unit</span>
          <select value={area.unit} onChange={(e) => onChangeUnit(area.id, e.target.value)}>
            <option value="in">Inches</option>
            <option value="ft">Feet</option>
            <option value="m">Metres</option>
            <option value="cm">Centimetres</option>
          </select>
        </label>
      </div>
      <div className="dimensions-drawer-footer">
        <span className="dimensions-note">
          Live coverage: <b>{quantity(area.width)} in × {quantity(area.height)} in</b> ({quantity(((area.width / 12) * (area.height / 12)).toFixed(2))} sq ft)
        </span>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {staffEntriesCount > 0 && (
            <button
              type="button"
              className="button secondary small"
              onClick={onSyncToStaff}
              title="Apply these dimensions to all staff entries in this room"
            >
              Update {staffEntriesCount} staff {staffEntriesCount === 1 ? 'entry' : 'entries'}
            </button>
          )}
          <button
            type="button"
            className="button secondary small"
            onClick={onClose}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}

function Areas({ project, areaId, setAreaId, updateArea, patchProject, toast }) {
  const [viewFilter, setViewFilter] = useState('all') // 'all' by default, or specific area id
  const [calcAreaId, setCalcAreaId] = useState(() => areaId || project.areas[0]?.id || '')
  const [showCalculator, setShowCalculator] = useState(true)
  const [editingDimensionsId, setEditingDimensionsId] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [areaChoice, setAreaChoice] = useState('')
  const [customArea, setCustomArea] = useState('')
  const [renamingArea, setRenamingArea] = useState(null)
  const [editingMaterial, setEditingMaterial] = useState(null)
  const [draft, setDraft] = useState({ product: PRODUCTS[0].name, price: 0, fabricPrice: 650, liningPrice: 290, romanType: 'Premium', minimumArea: 11, clampType: '' })

  // Keep calcAreaId valid if areas change
  useEffect(() => {
    if (!project.areas.some((a) => a.id === calcAreaId) && project.areas[0]) {
      setCalcAreaId(project.areas[0].id)
    }
  }, [project.areas, calcAreaId])

  const targetCalcArea = project.areas.find((a) => a.id === calcAreaId) || project.areas[0]
  const selectedProduct = PRODUCTS.find((item) => item.name === draft.product) || PRODUCTS[0]
  const preview = targetCalcArea ? calculateProduct(selectedProduct, targetCalcArea.width, targetCalcArea.height, draft) : null

  const addArea = (nameInput, initialWidth, initialHeight, initialUnit) => {
    const chosenName = (nameInput || areaChoice || customArea || '').trim()
    if (!chosenName) return
    if (project.areas.some((a) => a.name.toLowerCase() === chosenName.toLowerCase())) {
      toast(`"${chosenName}" already exists in this project.`)
      return
    }
    const unit = initialUnit || 'in'
    const widthInInches = initialWidth !== undefined ? toInches(initialWidth, unit) : 0
    const heightInInches = initialHeight !== undefined ? toInches(initialHeight, unit) : 0
    const newArea = {
      id: uid('area'),
      name: chosenName,
      width: Number(widthInInches.toFixed(2)) || 0,
      height: Number(heightInInches.toFixed(2)) || 0,
      unit,
      products: []
    }
    patchProject({ areas: [...project.areas, newArea], status: 'Measurements in progress' })
    setCalcAreaId(newArea.id)
    setAreaId?.(newArea.id)
    setAreaChoice('')
    setCustomArea('')
    if (!newArea.width || !newArea.height) {
      setEditingDimensionsId(newArea.id)
      toast(chosenName + ' added. Enter its dimensions next.')
    } else {
      toast(chosenName + ' registered with site measurements.')
    }
    setTimeout(() => {
      document.getElementById('area-card-' + newArea.id)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }, 100)
  }

  const handleRenameArea = (newName) => {
    if (!renamingArea) return
    const clean = newName.trim()
    if (!clean) return
    const oldName = renamingArea.name
    if (clean !== oldName) {
      if (project.areas.some(a => a.id !== renamingArea.id && a.name.toLowerCase() === clean.toLowerCase())) {
        toast(`An area named "${clean}" already exists.`)
        return
      }
      const nextAreas = project.areas.map(a => a.id === renamingArea.id ? {
        ...a,
        name: clean,
        products: (a.products || []).map(p => ({ ...p, area: clean }))
      } : a)
      const nextDrafts = (project.staffDrafts || []).map(d => (d.area || '').toLowerCase() === oldName.toLowerCase() ? { ...d, area: clean } : d)
      patchProject({ areas: nextAreas, staffDrafts: nextDrafts })
      toast(`Area renamed to "${clean}".`)
    }
    setRenamingArea(null)
  }

  const removeArea = (id) => {
    const target = project.areas.find(item => item.id === id)
    if (!target) return
    if (typeof window !== 'undefined' && window.confirm && !window.confirm(`Delete area "${target.name}" and all materials added to it?`)) return
    const remaining = project.areas.filter((item) => item.id !== id)
    const draftsToDelete = (project.staffDrafts || []).filter((d) => (d.area || '').trim().toLowerCase() === target.name.trim().toLowerCase())
    for (const d of draftsToDelete) {
      markStaffDraftDeleted(project.id, d.id || d.rawId, d)
      const cleanId = String(d.id || d.rawId || '').replace(/^staff-/, '').trim()
      if (cleanId) {
        apiRequest('/staff/projects/' + project.id + '/submissions/' + encodeURIComponent(cleanId), { method: 'DELETE' }).catch(() => {})
        enqueueMutation({ type: 'delete_submission', projectId: project.id, submissionId: cleanId })
      }
    }
    const remainingDrafts = (project.staffDrafts || []).filter((d) => (d.area || '').trim().toLowerCase() !== target.name.trim().toLowerCase())
    patchProject({ areas: remaining, staffDrafts: remainingDrafts })
    if (calcAreaId === id) setCalcAreaId(remaining[0]?.id || '')
    if (viewFilter === id) setViewFilter('all')
    if (editingDimensionsId === id) setEditingDimensionsId(null)
    setAreaId?.(remaining[0]?.id || '')
    toast(`Area "${target.name}" was deleted.`)
  }

  const changeUnit = (targetId, unit) => updateArea(targetId, { unit })
  const changeDimension = (targetId, key, value) => {
    const targetArea = project.areas.find(a => a.id === targetId)
    if (!targetArea) return
    const newInches = Number(toInches(value, targetArea.unit).toFixed(2))
    const newW = key === 'width' ? newInches : (targetArea.width || 0)
    const newH = key === 'height' ? newInches : (targetArea.height || 0)

    const updatedProducts = (targetArea.products || []).map((p) => {
      const prodObj = findProductDef(p.product) || MATERIAL_PRODUCTS.find((x) => x.name === p.product) || { name: p.product, gst: p.gst, formula: 'standard' }
      const calc = calculateProduct(prodObj, newW, newH)
      return {
        ...p,
        width: newW,
        height: newH,
        unit: targetArea.unit || p.unit || 'in',
        quantity: Number(Number(calc.quantity || 0).toFixed(2)),
        note: calc.note
      }
    })

    const cleanAreaName = targetArea.name.toLowerCase()
    let staffUpdated = false
    const nextDrafts = (project.staffDrafts || []).map((draft) => {
      if ((draft.area || '').toLowerCase() === cleanAreaName) {
        staffUpdated = true
        const prodObj = findProductDef(draft.product) || MATERIAL_PRODUCTS.find((p) => p.name === draft.product) || { name: draft.product, gst: 18, formula: 'standard' }
        const calc = calculateProduct(prodObj, newW, newH)
        const unit = targetArea.unit || draft.unit || 'in'
        return {
          ...draft,
          width: Number(fromInches(newW, unit).toFixed(2)),
          height: Number(fromInches(newH, unit).toFixed(2)),
          unit,
          quantity: Number(Number(calc.quantity || 0).toFixed(2)),
          notes: draft.notes ? draft.notes : calc.note
        }
      }
      return draft
    })

    const nextAreas = project.areas.map(a => a.id === targetId ? { ...a, [key]: newInches, products: updatedProducts } : a)
    patchProject(staffUpdated ? { areas: nextAreas, staffDrafts: nextDrafts } : { areas: nextAreas })
  }

  const syncAreaDimensionsToStaff = (targetArea) => {
    const cleanAreaName = targetArea.name.toLowerCase()
    let updatedCount = 0
    const nextDrafts = (project.staffDrafts || []).map((draft) => {
      if ((draft.area || '').toLowerCase() === cleanAreaName) {
        updatedCount++
        const wIn = targetArea.width
        const hIn = targetArea.height
        const unit = targetArea.unit || draft.unit || 'in'
        const wVal = Number(fromInches(wIn, unit).toFixed(2))
        const hVal = Number(fromInches(hIn, unit).toFixed(2))
        const prodObj = findProductDef(draft.product) || MATERIAL_PRODUCTS.find((p) => p.name === draft.product) || { name: draft.product, gst: 18, formula: 'standard' }
        const calculated = calculateProduct(prodObj, wIn, hIn)
        return {
          ...draft,
          width: wVal,
          height: hVal,
          unit,
          quantity: Number(Number(calculated.quantity || 0).toFixed(2)),
          notes: draft.notes ? draft.notes : calculated.note
        }
      }
      return draft
    })
    if (updatedCount > 0) {
      patchProject({ staffDrafts: nextDrafts })
      toast(`Updated dimensions and quantities for ${updatedCount} staff ${updatedCount === 1 ? 'entry' : 'entries'} in ${targetArea.name}.`)
    }
  }

  const addMaterial = () => {
    if (!targetCalcArea) { toast('Please add or select an area first.'); return }
    if (!targetCalcArea.width || !targetCalcArea.height) {
      toast(`Add width and height for ${targetCalcArea.name} before calculating a material.`)
      setEditingDimensionsId(targetCalcArea.id)
      return
    }
    const curtainSetId = selectedProduct.curtainSystem ? uid('curtain-set') : ''
    const items = selectedProduct.curtainSystem
      ? selectedProduct.curtainSystem.products.map(([name, gst, formula]) => {
        const component = { name, gst, formula: formula || 'standard' }
        const calculated = calculateProduct(component, targetCalcArea.width, targetCalcArea.height, draft)
        return {
          id: uid('line'),
          area: targetCalcArea.name,
          product: component.name,
          width: targetCalcArea.width,
          height: targetCalcArea.height,
          unit: targetCalcArea.unit || 'in',
          quantity: calculated.quantity,
          unitPrice: calculated.unitPrice,
          gst: component.gst,
          note: calculated.note,
          curtainSetId,
          curtainSystem: selectedProduct.curtainSystem.id,
          clampType: draft.clampType || ''
        }
      })
      : (() => {
        const calculated = calculateProduct(selectedProduct, targetCalcArea.width, targetCalcArea.height, draft)
        return [{
          id: uid('line'),
          area: targetCalcArea.name,
          product: selectedProduct.name,
          width: targetCalcArea.width,
          height: targetCalcArea.height,
          unit: targetCalcArea.unit || 'in',
          quantity: calculated.quantity,
          unitPrice: calculated.unitPrice,
          gst: selectedProduct.gst,
          note: calculated.note
        }]
      })()
    updateArea(targetCalcArea.id, { products: [...(targetCalcArea.products || []), ...items] })
    toast(selectedProduct.curtainSystem
      ? `${selectedProduct.name} added with its main, sheer and lining lines.`
      : `${selectedProduct.name} added to ${targetCalcArea.name}.`)
    setTimeout(() => {
      document.getElementById('area-card-' + targetCalcArea.id)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }, 100)
  }

  const removeMaterial = (targetAreaId, productId, productName) => {
    const targetArea = project.areas.find(a => a.id === targetAreaId)
    if (!targetArea) return
    updateArea(targetAreaId, { products: (targetArea.products || []).filter((x) => String(x.id) !== String(productId)) })
    toast(`${productName} removed from ${targetArea.name}.`)
  }

  const removeStaffMaterial = (rawDraftId, productName, itemObj = null) => {
    const cleanTarget = String(rawDraftId || itemObj?.rawId || itemObj?.id || '').replace(/^staff-/, '').trim()
    markStaffDraftDeleted(project.id, cleanTarget, itemObj)

    if (cleanTarget) {
      apiRequest('/staff/projects/' + project.id + '/submissions/' + encodeURIComponent(cleanTarget), { method: 'DELETE' }).catch(() => {})
      enqueueMutation({ type: 'delete_submission', projectId: project.id, submissionId: cleanTarget })
    }

    const nextDrafts = (project.staffDrafts || []).filter((d) => {
      if (matchesStaffDraft(d, itemObj, rawDraftId)) return false
      if (cleanTarget && String(d.id || d.rawId || d.localId || '').replace(/^staff-/, '').trim().toLowerCase() === cleanTarget.toLowerCase()) return false
      if (isStaffDraftDeleted(project.id, d)) return false
      return true
    })

    const nextAreas = (project.areas || []).map((a) => ({
      ...a,
      products: (a.products || []).filter((p) => {
        if (matchesStaffDraft(p, itemObj, rawDraftId)) return false
        if (cleanTarget && String(p.id || p.rawId || '').replace(/^staff-/, '').trim().toLowerCase() === cleanTarget.toLowerCase()) return false
        if (isStaffDraftDeleted(project.id, p)) return false
        return true
      })
    }))

    const nextMutations = (project.syncMutations || []).map((m) => ({
      ...m,
      submissionIds: (m.submissionIds || []).filter((sId) => String(sId).replace(/^staff-/, '').trim().toLowerCase() !== cleanTarget.toLowerCase())
    })).filter((m) => (m.submissionIds || []).length > 0)

    patchProject({ staffDrafts: nextDrafts, areas: nextAreas, syncMutations: nextMutations })
    toast(`Staff entry for ${productName} removed.`)
  }

  const saveEditedMaterial = (updated) => {
    if (updated.isStaff) {
      const targetId = updated.rawId || updated.id
      const cleanArea = (updated.area || '').trim()
      const nextDrafts = (project.staffDrafts || []).map((draft) => {
        if (matchesStaffDraft(draft, updated, targetId)) {
          const w = Number(updated.width) > 0 ? Number(updated.width) : (Number(draft.width) || 0)
          const h = Number(updated.height) > 0 ? Number(updated.height) : (Number(draft.height) || 0)
          const u = updated.unit || draft.unit || 'in'
          return {
            ...draft,
            area: cleanArea || draft.area,
            product: updated.product || draft.product,
            width: w,
            height: h,
            unit: u,
            clampType: updated.clampType !== undefined ? updated.clampType : (draft.clampType || ''),
            quantity: (updated.quantity !== undefined && updated.quantity !== '') ? Number(updated.quantity) : (Number(draft.quantity) || 0),
            unitPrice: Number(updated.unitPrice) || 0,
            gst: Number(updated.gst) || 18,
            notes: updated.note !== undefined ? updated.note : (draft.notes || '')
          }
        }
        return draft
      })

      let nextAreas = [...(project.areas || [])]
      const existingAreaIndex = nextAreas.findIndex(a => a.name.toLowerCase() === cleanArea.toLowerCase())
      if (cleanArea && existingAreaIndex === -1) {
        const factor = UNITS_TO_INCHES[updated.unit] || 1
        const w = Number(updated.width) > 0 ? Number((Number(updated.width) * factor).toFixed(2)) : 0
        const h = Number(updated.height) > 0 ? Number((Number(updated.height) * factor).toFixed(2)) : 0
        nextAreas.push({
          id: uid('area'),
          name: cleanArea,
          width: w,
          height: h,
          unit: updated.unit || 'in',
          products: []
        })
      } else if (existingAreaIndex >= 0) {
        const targetArea = nextAreas[existingAreaIndex]
        if ((!targetArea.width || !targetArea.height) && Number(updated.width) > 0 && Number(updated.height) > 0) {
          const factor = UNITS_TO_INCHES[updated.unit] || 1
          nextAreas[existingAreaIndex] = {
            ...targetArea,
            width: Number((Number(updated.width) * factor).toFixed(2)),
            height: Number((Number(updated.height) * factor).toFixed(2)),
            unit: updated.unit || targetArea.unit
          }
        }
      }

      patchProject({ staffDrafts: nextDrafts, areas: nextAreas })
      toast(`Staff entry for ${updated.product} updated.`)
    } else {
      const originAreaId = updated.originAreaId
      const targetAreaName = updated.area
      const targetArea = project.areas.find(a => a.name === targetAreaName) || project.areas.find(a => a.id === originAreaId)

      const nextAreas = project.areas.map(a => {
        const isOrigin = a.id === originAreaId
        const isTarget = a.id === targetArea?.id

        if (isOrigin && !isTarget) {
          // Item moved away from origin area
          return { ...a, products: (a.products || []).filter(p => String(p.id) !== String(updated.id)) }
        }
        if (isTarget && !isOrigin) {
          // Item moved into target area
          const movedItem = {
            id: updated.id,
            area: a.name,
            product: updated.product,
            width: updated.width !== undefined ? updated.width : a.width,
            height: updated.height !== undefined ? updated.height : a.height,
            unit: updated.unit || a.unit || 'in',
            clampType: updated.clampType || '',
            quantity: Number(updated.quantity) || 0,
            quantityOverridden: Boolean(updated.quantityOverridden),
            unitPrice: Number(updated.unitPrice) || 0,
            gst: Number(updated.gst) || 18,
            note: updated.note || ''
          }
          return { ...a, products: [...(a.products || []), movedItem] }
        }
        if (isTarget && isOrigin) {
          // Updated within same area
          return {
            ...a,
            products: (a.products || []).map(p => String(p.id) === String(updated.id) ? {
              ...p,
              area: a.name,
              product: updated.product,
              width: updated.width !== undefined ? updated.width : p.width,
              height: updated.height !== undefined ? updated.height : p.height,
              unit: updated.unit || p.unit || 'in',
              clampType: updated.clampType || '',
              quantity: Number(updated.quantity) || 0,
              quantityOverridden: Boolean(updated.quantityOverridden),
              unitPrice: Number(updated.unitPrice) || 0,
              gst: Number(updated.gst) || 18,
              note: updated.note || ''
            } : p)
          }
        }
        return a
      })
      patchProject({ areas: nextAreas })
      toast(`${updated.product} updated.`)
    }
    setEditingMaterial(null)
  }

  // Aggregate project metrics across all areas and materials
  const totalAreasCount = project.areas.length
  const totalMaterialLines = project.areas.reduce((sum, a) => sum + (a.products?.length || 0), 0) + (project.staffDrafts?.length || 0)
  const totalSqFt = project.areas.reduce((sum, a) => sum + Number(((Number(a.width || 0) / 12) * (Number(a.height || 0) / 12)).toFixed(2)), 0)
  const totalEstimatedAmount = project.areas.reduce((sum, a) => {
    const areaSum = (a.products || []).reduce((s, p) => s + (Number(p.quantity) || 0) * (Number(p.unitPrice) || 0), 0)
    return sum + areaSum
  }, 0) + (project.staffDrafts || []).reduce((sum, d) => sum + (Number(d.quantity) || 0) * (Number(d.unitPrice) || 0), 0)

  // Filtered areas according to viewFilter and search query
  const queryLower = searchQuery.toLowerCase().trim()
  const displayedAreas = project.areas.filter((a) => {
    if (viewFilter !== 'all' && a.id !== viewFilter) return false
    if (!queryLower) return true
    if (a.name.toLowerCase().includes(queryLower)) return true
    const hasMatchingMaterial = (a.products || []).some(p => p.product.toLowerCase().includes(queryLower) || (p.note || '').toLowerCase().includes(queryLower))
    const hasMatchingDraft = (project.staffDrafts || []).some(d => (d.area || '').toLowerCase() === a.name.toLowerCase() && (d.product.toLowerCase().includes(queryLower) || (d.notes || '').toLowerCase().includes(queryLower)))
    return hasMatchingMaterial || hasMatchingDraft
  })

  // Detect unassigned staff drafts
  const knownAreaNames = new Set(project.areas.map(a => a.name.toLowerCase()))
  const unassignedStaffDrafts = (project.staffDrafts || []).filter(d => !knownAreaNames.has((d.area || '').toLowerCase()))

  return (
    <div className="areas-layout">
      <aside className="area-sidebar panel">
        <div className="section-heading">
          <div><p className="eyebrow">PROJECT SPACES</p><h3>Areas</h3></div>
          <span className="tag">{project.areas.length}</span>
        </div>

        <div className="add-area">
          <select value={areaChoice} onChange={(e) => { setAreaChoice(e.target.value); if (e.target.value) setCustomArea('') }}>
            <option value="">Select standard area</option>
            {AREAS.filter((name) => !project.areas.some((item) => item.name.toLowerCase() === name.toLowerCase())).map((name) => <option key={name}>{name}</option>)}
          </select>
          <button onClick={() => addArea()} aria-label="Add area" title="Add area"><Plus size={17} /></button>
        </div>

        <div className="add-custom-area">
          <input
            placeholder="Or type custom area name"
            value={customArea}
            onChange={(e) => { setCustomArea(e.target.value); if (e.target.value) setAreaChoice('') }}
            onKeyDown={(e) => { if (e.key === 'Enter') addArea(customArea) }}
          />
          {customArea.trim() && (
            <button type="button" className="button primary small" onClick={() => addArea(customArea)}>
              <Plus size={13} />Add
            </button>
          )}
        </div>

        <div className="area-list">
          {project.areas.length > 0 && (
            <button
              type="button"
              className={'all-areas-sidebar-btn' + (viewFilter === 'all' ? ' active' : '')}
              onClick={() => setViewFilter('all')}
            >
              <span>All Areas & Materials</span>
              <span className="sidebar-count-badge">{project.areas.length} rooms</span>
            </button>
          )}

          {project.areas.length ? project.areas.map((item, index) => {
            const count = (item.products?.length || 0) + (project.staffDrafts || []).filter(d => (d.area || '').toLowerCase() === item.name.toLowerCase()).length
            const isSelected = viewFilter === item.id || (viewFilter === 'all' && calcAreaId === item.id)
            return (
              <div className="area-row-wrapper" key={item.id}>
                <button
                  type="button"
                  className={isSelected ? 'area-row active' : 'area-row'}
                  onClick={() => {
                    setCalcAreaId(item.id)
                    setAreaId?.(item.id)
                    if (viewFilter !== 'all') {
                      setViewFilter(item.id)
                    } else {
                      document.getElementById('area-card-' + item.id)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
                    }
                  }}
                >
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <div>
                    <strong>{item.name}</strong>
                    <small>{item.width && item.height ? `${item.width} × ${item.height} in · ${count} items` : `${count} items · Dimensions needed`}</small>
                  </div>
                  {isSelected && <ChevronRight size={15} />}
                </button>
                <div className="area-row-actions">
                  <button
                    type="button"
                    className="area-action-btn"
                    title={'Rename ' + item.name}
                    onClick={(e) => { e.stopPropagation(); setRenamingArea(item) }}
                  >
                    <Pencil size={12} />
                  </button>
                  <button
                    type="button"
                    className="area-action-btn danger"
                    title={'Delete ' + item.name}
                    onClick={(e) => { e.stopPropagation(); removeArea(item.id) }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            )
          }) : <div className="area-empty">Choose a room or type a custom area name above to begin.</div>}
        </div>
      </aside>

      <div className="area-workspace">
        {/* Project Areas & Materials Summary Stats */}
        <div className="areas-summary-bar">
          <div className="summary-stat-chip">
            <div className="summary-stat-chip-icon"><Ruler size={16} /></div>
            <div>
              <span>Project Areas</span>
              <strong>{totalAreasCount} {totalAreasCount === 1 ? 'room' : 'rooms'}</strong>
            </div>
          </div>
          <div className="summary-stat-chip">
            <div className="summary-stat-chip-icon"><Package size={16} /></div>
            <div>
              <span>Total Materials</span>
              <strong>{totalMaterialLines} {totalMaterialLines === 1 ? 'item' : 'items'}</strong>
            </div>
          </div>
          <div className="summary-stat-chip">
            <div className="summary-stat-chip-icon"><Ruler size={16} /></div>
            <div>
              <span>Measured Coverage</span>
              <strong>{quantity(totalSqFt)} sq ft</strong>
            </div>
          </div>
          <div className="summary-stat-chip">
            <div className="summary-stat-chip-icon"><CircleDollarSign size={16} /></div>
            <div>
              <span>Materials Value</span>
              <strong>{currency(totalEstimatedAmount)}</strong>
            </div>
          </div>
        </div>

        {/* Filter Bar & Quick Controls */}
        <div className="areas-action-bar">
          <div className="areas-filter-pills">
            <button
              type="button"
              className={'area-filter-pill' + (viewFilter === 'all' ? ' active' : '')}
              onClick={() => setViewFilter('all')}
            >
              All Areas <span className="pill-count">{project.areas.length}</span>
            </button>
            {project.areas.map((a) => {
              const count = (a.products?.length || 0) + (project.staffDrafts || []).filter(d => (d.area || '').toLowerCase() === a.name.toLowerCase()).length
              return (
                <button
                  type="button"
                  key={a.id}
                  className={'area-filter-pill' + (viewFilter === a.id ? ' active' : '')}
                  onClick={() => {
                    setViewFilter(a.id)
                    setCalcAreaId(a.id)
                    setAreaId?.(a.id)
                  }}
                >
                  {a.name} <span className="pill-count">{count}</span>
                </button>
              )
            })}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div className="areas-search-box">
              <Search size={14} />
              <input
                placeholder="Search areas or materials…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button type="button" onClick={() => setSearchQuery('')} className="area-action-btn" title="Clear search">
                  <X size={12} />
                </button>
              )}
            </div>

            <button
              type="button"
              className={'button small ' + (showCalculator ? 'secondary' : 'primary')}
              onClick={() => setShowCalculator(!showCalculator)}
            >
              {showCalculator ? 'Hide Calculator' : '+ Calculate Material'}
            </button>
          </div>
        </div>

        {/* Material Order Line Calculator (Pre-fills target area and adds lines directly) */}
        {showCalculator && (
          <section className="panel material-calculator-card" id="material-calculator">
            <div className="section-heading" style={{ marginBottom: '14px' }}>
              <div>
                <p className="eyebrow">ORDER LINE CALCULATOR</p>
                <h3>Calculate a material for any area</h3>
              </div>
              <span className="autosave"><CheckCircle2 size={14} />Auto-calculated quantities</span>
            </div>

            {project.areas.length > 0 ? (
              <div className="target-area-selector">
                <span>Target Area / Space:</span>
                <select
                  value={calcAreaId}
                  onChange={(e) => {
                    setCalcAreaId(e.target.value)
                    setAreaId?.(e.target.value)
                  }}
                >
                  {project.areas.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} {a.width && a.height ? `(${fromInches(a.width, a.unit).toFixed(a.unit === 'in' ? 0 : 2)} × ${fromInches(a.height, a.unit).toFixed(a.unit === 'in' ? 0 : 2)} ${a.unit})` : '(No dimensions)'}
                    </option>
                  ))}
                </select>
                {targetCalcArea && (
                  <button
                    type="button"
                    className="button secondary small"
                    onClick={() => setEditingDimensionsId(targetCalcArea.id)}
                    title="Edit dimensions for this target area"
                  >
                    <Ruler size={13} />
                    {targetCalcArea.width && targetCalcArea.height ? 'Adjust dimensions' : 'Enter dimensions'}
                  </button>
                )}
              </div>
            ) : (
              <div className="area-empty-materials" style={{ marginBottom: '14px' }}>
                <p>Add a project area first to begin calculating and adding materials.</p>
              </div>
            )}

            <div className="product-controls">
              <label className="field product-select">
                <span>Product / material</span>
                <select value={draft.product} onChange={(e) => {
                  const nextProduct = PRODUCTS.find((item) => item.name === e.target.value)
                  setDraft({ ...draft, product: e.target.value, clampType: nextProduct?.curtainSystem ? draft.clampType : '' })
                }}>
                  {PRODUCTS.map((item) => <option key={item.name}>{item.name}</option>)}
                </select>
              </label>

              {selectedProduct.curtainSystem && (
                <label className="field product-select">
                  <span>Mounting clamp <small>(optional)</small></span>
                  <select value={draft.clampType} onChange={(e) => setDraft({ ...draft, clampType: e.target.value })}>
                    <option value="">Select a clamp type</option>
                    {CLAMP_OPTIONS.map((name) => <option key={name} value={name}>{name}</option>)}
                  </select>
                  <small>Clamp options are available only for curtain systems and are not regular material choices.</small>
                </label>
              )}

              {selectedProduct.formula === 'roman' ? (
                <div className="roman-controls">
                  <Field label="Fabric MRP / m" type="number" value={draft.fabricPrice} onChange={(e) => setDraft({ ...draft, fabricPrice: e.target.value })} />
                  <Field label="Lining MRP / m" type="number" value={draft.liningPrice} onChange={(e) => setDraft({ ...draft, liningPrice: e.target.value })} />
                  <label className="field">
                    <span>Roman finish</span>
                    <select value={draft.romanType} onChange={(e) => setDraft({ ...draft, romanType: e.target.value })}>
                      <option>Premium</option>
                      <option>Regular</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>Minimum area</span>
                    <select value={draft.minimumArea} onChange={(e) => setDraft({ ...draft, minimumArea: e.target.value })}>
                      <option value="11">11 sq ft</option>
                      <option value="16.5">16.5 sq ft</option>
                    </select>
                  </label>
                </div>
              ) : (
                <Field label="MRP per unit" type="number" value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })} />
              )}
            </div>

            <div className="calculation-result">
              <div>
                <span>{selectedProduct.curtainSystem ? 'Quantity per curtain line' : 'Calculated quantity'}</span>
                <strong>
                  {quantity(preview?.quantity)} <small>{['american', 'eyelet', 'ripple', 'valance'].includes(selectedProduct.formula) || /curtain|sheer|lining|eyelet|eylet|ripple|american|valance|valence/i.test(selectedProduct.name) ? 'm' : 'sq ft'}</small>
                </strong>
                <p>{selectedProduct.curtainSystem ? 'Adds main curtain, sheer and lining together. ' + (preview?.note || '') : (preview?.note || (targetCalcArea ? 'Add measurements to calculate' : 'Select an area'))}</p>
                {(selectedProduct.formula === 'eyelet' || selectedProduct.formula === 'ripple' || /eyelet|eylet|ripple/i.test(selectedProduct.name)) && (
                  <div style={{ marginTop: '4px', fontSize: '11px', color: '#1d4ed8', fontWeight: 600 }}>
                    Formula: ⌈W / 20⌉ × ((H + 15) / 39)
                  </div>
                )}
              </div>
              <div>
                <span>Quoted unit price</span>
                <strong>{currency(preview?.unitPrice)}</strong>
                <p>GST {selectedProduct.gst}% applicable</p>
              </div>
              <button
                className="button primary"
                onClick={addMaterial}
                disabled={!targetCalcArea}
              >
                <Plus size={16} />{selectedProduct.curtainSystem ? 'Add curtain set to ' : 'Add to '}{targetCalcArea?.name || 'Area'}
              </button>
            </div>
          </section>
        )}

        {/* Master List: All Areas Along with Materials */}
        {displayedAreas.length > 0 ? (
          <div className="all-areas-container">
            {displayedAreas.map((area, index) => {
              const thisAreaStaffDrafts = (project.staffDrafts || []).filter(item => (item.area || '').toLowerCase() === area.name.toLowerCase()).map(staffSubmissionLine)
              const areaMaterials = [...(area.products || []), ...thisAreaStaffDrafts]
              const areaSubtotal = (area.products || []).reduce((s, p) => s + (Number(p.quantity) || 0) * (Number(p.unitPrice) || 0), 0) + thisAreaStaffDrafts.reduce((s, d) => s + (Number(d.quantity) || 0) * (Number(d.unitPrice) || 0), 0)

              return (
                <div
                  className={'area-card' + (calcAreaId === area.id ? ' highlight-target' : '')}
                  id={'area-card-' + area.id}
                  key={area.id}
                >
                  {/* Area Card Header with Name, Measurements, and Actions */}
                  <div className="area-card-header">
                    <div className="area-card-title-group">
                      <span className="area-card-index">{String(index + 1).padStart(2, '0')}</span>
                      <div className="area-card-title-flex">
                        <h3>{area.name}</h3>
                        <button
                          type="button"
                          className="area-action-btn"
                          title={'Rename ' + area.name}
                          onClick={() => setRenamingArea(area)}
                        >
                          <Pencil size={13} />
                        </button>
                      </div>

                      <div className="area-dim-pill">
                        <Ruler size={13} />
                        <span>
                          {area.width && area.height ? (
                            `${fromInches(area.width, area.unit).toFixed(area.unit === 'in' ? 0 : 2)} × ${fromInches(area.height, area.unit).toFixed(area.unit === 'in' ? 0 : 2)} ${area.unit} · ${quantity(((area.width / 12) * (area.height / 12)).toFixed(2))} sq ft`
                          ) : (
                            'Dimensions needed'
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="area-card-actions">
                      <button
                        type="button"
                        className={'button small ' + (editingDimensionsId === area.id ? 'primary' : 'secondary')}
                        onClick={() => setEditingDimensionsId(editingDimensionsId === area.id ? null : area.id)}
                        title="Edit dimensions for this area"
                      >
                        <Ruler size={13} />
                        {editingDimensionsId === area.id ? 'Close dimensions' : 'Edit dimensions'}
                      </button>

                      <button
                        type="button"
                        className="button small primary"
                        onClick={() => {
                          setCalcAreaId(area.id)
                          setShowCalculator(true)
                          document.getElementById('material-calculator')?.scrollIntoView({ behavior: 'smooth' })
                        }}
                        title={'Calculate and add material to ' + area.name}
                      >
                        <Plus size={13} />Add material
                      </button>

                      <button
                        type="button"
                        className="icon-button danger"
                        title={'Delete ' + area.name}
                        onClick={() => removeArea(area.id)}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  {/* Inline Dimension Editor for this Area */}
                  {editingDimensionsId === area.id && (
                    <AreaDimensionDrawer
                      area={area}
                      onChangeDimension={changeDimension}
                      onChangeUnit={changeUnit}
                      staffEntriesCount={thisAreaStaffDrafts.length}
                      onSyncToStaff={() => syncAreaDimensionsToStaff(area)}
                      onClose={() => setEditingDimensionsId(null)}
                    />
                  )}

                  {/* Materials Table for this Area */}
                  {areaMaterials.length > 0 ? (
                    <div className="area-table-wrap">
                      <table className="simple-table">
                        <thead>
                          <tr>
                            <th>Material</th>
                            <th>Quantity</th>
                            <th>Unit MRP</th>
                            <th>GST</th>
                            <th>Amount</th>
                            <th>Source</th>
                            <th style={{ width: '84px', textAlign: 'right' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {/* Manager-added materials */}
                          {(area.products || []).map((item) => {
                            const lineTotal = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0)
                            return (
                              <tr key={item.id}>
                                <td>
                                  <strong>{item.product}</strong>
                                  {item.note && <small>{item.note}</small>}
                                </td>
                                <td><strong>{quantity(item.quantity)} <small style={{ fontWeight: 500, opacity: 0.85 }}>{unitLabel(item.product)}</small></strong></td>
                                <td>{currency(item.unitPrice)}</td>
                                <td><span className="tax-pill">{item.gst}%</span></td>
                                <td><strong>{currency(lineTotal)}</strong></td>
                                <td><span className="material-source-badge manager">Manager</span></td>
                                <td>
                                  <div className="row-action-buttons">
                                    <button
                                      className="icon-button"
                                      title={'Edit ' + item.product}
                                      aria-label={'Edit ' + item.product}
                                      onClick={() => setEditingMaterial({ ...item, originAreaId: area.id, area: area.name, isStaff: false })}
                                    >
                                      <Pencil size={14} />
                                    </button>
                                    <button
                                      className="icon-button danger"
                                      title={'Remove ' + item.product}
                                      aria-label={'Remove ' + item.product}
                                      onClick={() => removeMaterial(area.id, item.id, item.product)}
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            )
                          })}

                          {/* Staff-submitted entries for this area */}
                          {thisAreaStaffDrafts.map((item) => {
                            const lineTotal = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0)
                            return (
                              <tr className="staff-material" key={item.id}>
                                <td>
                                  <strong>{item.product}</strong>
                                  {item.note && <small>{item.note}</small>}
                                </td>
                                <td><strong>{quantity(item.quantity)} <small style={{ fontWeight: 500, opacity: 0.85 }}>{unitLabel(item.product)}</small></strong></td>
                                <td>{item.unitPrice ? currency(item.unitPrice) : 'Set in quote'}</td>
                                <td><span className="tax-pill">{item.gst}%</span></td>
                                <td><strong>{lineTotal ? currency(lineTotal) : '—'}</strong></td>
                                <td><span className="material-source-badge staff">Staff</span></td>
                                <td>
                                  <div className="row-action-buttons">
                                    <button
                                      className="icon-button"
                                      title={'Edit staff entry for ' + item.product}
                                      aria-label={'Edit staff entry for ' + item.product}
                                      onClick={() => setEditingMaterial({ ...item, originAreaId: area.id, area: area.name, isStaff: true })}
                                    >
                                      <Pencil size={14} />
                                    </button>
                                    <button
                                      className="icon-button danger"
                                      title={'Remove staff entry for ' + item.product}
                                      aria-label={'Remove staff entry for ' + item.product}
                                      onClick={() => removeStaffMaterial(item.rawId || item.id, item.product, item)}
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="area-empty-materials">
                      <div className="area-empty-materials-info">
                        <Package size={22} />
                        <div>
                          <p>No materials added for {area.name} yet.</p>
                          <small>Use the calculator above or click the button on the right to add curtains, blinds, tracks or fabrics.</small>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="button secondary small"
                        onClick={() => {
                          setCalcAreaId(area.id)
                          setShowCalculator(true)
                          document.getElementById('material-calculator')?.scrollIntoView({ behavior: 'smooth' })
                        }}
                      >
                        <Plus size={13} />Add material to {area.name}
                      </button>
                    </div>
                  )}

                  {/* Area Card Footer with subtotal and quick add */}
                  <div className="area-card-footer">
                    <div className="area-card-subtotal">
                      <span>{areaMaterials.length} line {areaMaterials.length === 1 ? 'item' : 'items'} in {area.name}</span>
                      <strong>Subtotal: {currency(areaSubtotal)}</strong>
                    </div>

                    <button
                      type="button"
                      className="text-button"
                      onClick={() => {
                        setCalcAreaId(area.id)
                        setShowCalculator(true)
                        document.getElementById('material-calculator')?.scrollIntoView({ behavior: 'smooth' })
                      }}
                    >
                      <Plus size={13} />Add another material to {area.name}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <section className="panel blank-workspace">
            <Package size={34} />
            <h3>{searchQuery ? 'No matching areas or materials found' : 'No areas created yet'}</h3>
            <p>
              {searchQuery
                ? 'Try adjusting your search query or clear the filter to see all areas.'
                : 'Select a room from standard areas or type a custom name in the sidebar to begin capturing measurements and materials.'}
            </p>
            {searchQuery && (
              <button
                type="button"
                className="button secondary small"
                style={{ marginTop: '14px' }}
                onClick={() => setSearchQuery('')}
              >
                Clear search
              </button>
            )}
          </section>
        )}

        {/* Unassigned Staff Drafts (if field staff captured rooms not yet registered in project.areas) */}
        {unassignedStaffDrafts.length > 0 && (
          <section className="unassigned-drafts-card">
            <div className="unassigned-drafts-head">
              <div>
                <h4>Staff Submissions with New Area Names ({unassignedStaffDrafts.length})</h4>
                <p>These entries were recorded by site staff for room names not yet formally added to this project.</p>
              </div>
            </div>
            <table className="simple-table">
              <thead>
                <tr>
                  <th>Field Area</th>
                  <th>Product</th>
                  <th>Quantity</th>
                  <th>MRP</th>
                  <th>Notes</th>
                  <th style={{ width: '120px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {unassignedStaffDrafts.map(staffSubmissionLine).map((item) => (
                  <tr key={item.id}>
                    <td><strong>{item.area}</strong></td>
                    <td>{item.product}</td>
                    <td><strong>{quantity(item.quantity)} <small style={{ fontWeight: 500, opacity: 0.85 }}>{unitLabel(item.product)}</small></strong></td>
                    <td>{item.unitPrice ? currency(item.unitPrice) : 'Set in quote'}</td>
                    <td><small>{item.note || '—'}</small></td>
                    <td>
                      <div className="row-action-buttons">
                        <button
                          type="button"
                          className="button small secondary"
                          title="Register this room as a project area"
                          onClick={() => addArea(item.area, item.width, item.height, item.unit)}
                        >
                          <Plus size={12} />Create Area
                        </button>
                        <button
                          type="button"
                          className="icon-button"
                          title="Edit staff submission"
                          aria-label="Edit staff submission"
                          onClick={() => setEditingMaterial(item)}
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          type="button"
                          className="icon-button danger"
                          title="Delete staff submission"
                          aria-label="Delete staff submission"
                          onClick={() => removeStaffMaterial(item.rawId || item.id, item.product, item)}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
      </div>

      {renamingArea && (
        <RenameAreaModal
          area={renamingArea}
          onClose={() => setRenamingArea(null)}
          onSave={handleRenameArea}
        />
      )}
      {editingMaterial && (
        <EditMaterialModal
          material={editingMaterial}
          areas={project.areas}
          onClose={() => setEditingMaterial(null)}
          onSave={saveEditedMaterial}
        />
      )}
    </div>
  )
}

function isHardwareLine(line) {
  if (!line) return false
  if (line.isAutoHardware || line.area === 'Hardware') return true
  const p = (line.product || '').toLowerCase().trim()
  return p === 'track' || p === 'tracks' || p === 'runners' || p === 'runner' || p === 'hooks' || p === 'hook' ||
    CLAMP_OPTIONS.some(c => c.toLowerCase() === p) ||
    p.includes('clamp')
}

function curtainHardwareLines(project) {
  const unitsToInches = { in: 1, ft: 12, m: 39.3701, cm: 0.393701 }

  const isCurtainProduct = (name) => {
    if (!name) return false
    const n = name.toLowerCase()
    return CURTAIN_SYSTEMS.some((sys) =>
      sys.name.toLowerCase() === n ||
      sys.products.some(([p]) => p.toLowerCase() === n)
    ) || n.includes('american main') || n.includes('american sheer') || n.includes('american lining') ||
       n.includes('valence main') || n.includes('valence sheer') || n.includes('valence lining') ||
       n.includes('eylet main') || n.includes('eylet sheer') || n.includes('eylet lining') ||
       n.includes('eyelet main') || n.includes('eyelet sheer') || n.includes('eyelet lining') ||
       n.includes('ripple main') || n.includes('ripple sheer') || n.includes('ripple lining')
  }

  let totalTrackFeet = 0
  const clampCounts = {}

  // 1. Process project areas
  for (const area of project.areas || []) {
    const curtainSets = new Map()
    for (const product of area.products || []) {
      if (!isCurtainProduct(product.product)) continue
      const setId = product.curtainSetId || (area.id + '-curtain-set')
      if (!curtainSets.has(setId)) {
        curtainSets.set(setId, {
          width: Number(area.width) || 0,
          clampType: product.clampType || ''
        })
      } else {
        const existing = curtainSets.get(setId)
        if (product.clampType && !existing.clampType) existing.clampType = product.clampType
      }
    }

    for (const [, item] of curtainSets) {
      const trackFeet = Math.ceil((Number(item.width) || 0) / 12)
      if (!trackFeet) continue
      totalTrackFeet += trackFeet
      if (item.clampType) {
        const clampQty = Math.max(2, Math.ceil(trackFeet / 3) + 1)
        clampCounts[item.clampType] = (clampCounts[item.clampType] || 0) + clampQty
      }
    }
  }

  // 2. Process staff drafts
  const staffCurtainSets = new Map()
  for (const draft of project.staffDrafts || []) {
    if (!isCurtainProduct(draft.product)) continue
    const widthInInches = Number(draft.width || 0) * (unitsToInches[draft.unit] || 1)
    const setId = draft.curtainSetId || ('staff-' + (draft.area || 'area') + '-' + (draft.curtainSystem || draft.product))
    if (!staffCurtainSets.has(setId)) {
      staffCurtainSets.set(setId, {
        width: widthInInches,
        clampType: draft.clampType || ''
      })
    } else {
      const existing = staffCurtainSets.get(setId)
      if (draft.clampType && !existing.clampType) existing.clampType = draft.clampType
    }
  }

  for (const [, item] of staffCurtainSets) {
    const trackFeet = Math.ceil((Number(item.width) || 0) / 12)
    if (!trackFeet) continue
    totalTrackFeet += trackFeet
    if (item.clampType) {
      const clampQty = Math.max(2, Math.ceil(trackFeet / 3) + 1)
      clampCounts[item.clampType] = (clampCounts[item.clampType] || 0) + clampQty
    }
  }

  if (totalTrackFeet <= 0) return []

  const hardware = [
    {
      id: 'hardware-unified-track',
      area: 'Hardware',
      product: 'Track',
      quantity: totalTrackFeet,
      unitPrice: 0,
      gst: 18,
      note: `Unified: ${totalTrackFeet} running ft of track for all curtain sets`,
      isAutoHardware: true
    },
    {
      id: 'hardware-unified-runners',
      area: 'Hardware',
      product: 'Runners',
      quantity: totalTrackFeet * 3,
      unitPrice: 0,
      gst: 18,
      note: `Unified: 3 runners per running ft (${totalTrackFeet * 3} total)`,
      isAutoHardware: true
    },
    {
      id: 'hardware-unified-hooks',
      area: 'Hardware',
      product: 'Hooks',
      quantity: totalTrackFeet * 3,
      unitPrice: 0,
      gst: 18,
      note: `Unified: 3 hooks per running ft (${totalTrackFeet * 3} total)`,
      isAutoHardware: true
    }
  ]

  for (const [clampType, qty] of Object.entries(clampCounts)) {
    hardware.push({
      id: 'hardware-unified-clamp-' + clampType.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      area: 'Hardware',
      product: clampType,
      quantity: qty,
      unitPrice: 0,
      gst: 18,
      note: `Unified: ${qty} mounting clamps for curtain tracks`,
      isAutoHardware: true
    })
  }

  return hardware
}

function unifyQuoteItems(items) {
  if (!Array.isArray(items)) return []
  const regular = []
  const hardwareMap = new Map()

  for (const item of items) {
    if (!isHardwareLine(item)) {
      regular.push(item)
    } else {
      let p = (item.product || 'Hardware').trim()
      let key = p.toLowerCase()
      if (key === 'tracks') { key = 'track'; p = 'Track' }
      if (key === 'runner') { key = 'runners'; p = 'Runners' }
      if (key === 'hook') { key = 'hooks'; p = 'Hooks' }
      if (key === 'track') { p = 'Track' }
      if (key === 'runners') { p = 'Runners' }
      if (key === 'hooks') { p = 'Hooks' }
      for (const opt of CLAMP_OPTIONS) {
        if (opt.toLowerCase() === key) {
          p = opt
          break
        }
      }
      if (!hardwareMap.has(key)) {
        hardwareMap.set(key, {
          ...item,
          id: item.id || ('hardware-unified-' + key.replace(/[^a-z0-9]+/g, '-')),
          area: 'Hardware',
          product: p,
          quantity: Number((Number(item.quantity) || 0).toFixed(2)),
          unitPrice: Number(item.unitPrice) || 0,
          gst: Number(item.gst) || 18,
          isAutoHardware: true
        })
      } else {
        const existing = hardwareMap.get(key)
        existing.quantity = Number((existing.quantity + (Number(item.quantity) || 0)).toFixed(2))
        if (!existing.unitPrice && Number(item.unitPrice) > 0) {
          existing.unitPrice = Number(item.unitPrice)
        }
      }
    }
  }

  // Sort unified hardware: Track first, Runners second, Hooks third, Clamps fourth
  const hardwareOrder = (product) => {
    const p = (product || '').toLowerCase().trim()
    if (p === 'track' || p.includes('track')) return 1
    if (p === 'runners' || p.includes('runner')) return 2
    if (p === 'hooks' || p.includes('hook')) return 3
    if (p.includes('clamp')) return 4
    return 5
  }
  const sortedEntries = Array.from(hardwareMap.entries()).sort(
    ([, a], [, b]) => hardwareOrder(a.product) - hardwareOrder(b.product)
  )
  hardwareMap.clear()
  for (const [k, v] of sortedEntries) {
    hardwareMap.set(k, v)
  }

  // Regular items at the top, unified hardware (tracks, runners, hooks, clamps) at the bottom
  return [...regular, ...Array.from(hardwareMap.values())]
}

function makeQuotation(project, patchProject, toast, onCreated) {
  const regularItems = [
    ...project.areas.flatMap((area) => area.products || []),
    ...(project.staffDrafts || []).map(staffSubmissionLine)
  ]
  const hardware = curtainHardwareLines(project)
  const items = unifyQuoteItems([...regularItems, ...hardware])
  if (!items.length) { toast('Add at least one material line before creating a quotation.'); return }
  const existingClean = mergeDuplicateQuotations(project.quotations || [])
  const number = nextQuotationId(existingClean)
  const draftIndex = existingClean.length + 1
  const newDraft = {
    id: number,
    title: `Draft ${draftIndex}`,
    date: today(),
    status: 'Draft',
    items
  }
  patchProject({ quotations: [...existingClean, newDraft] })
  onCreated?.(number)
  toast(`${number} (Draft ${draftIndex}) created with unified curtain hardware.`)
}

function duplicateQuotation(quote, project, patchProject, toast, onCreated) {
  if (!quote) return
  const existingClean = mergeDuplicateQuotations(project.quotations || [])
  const number = nextQuotationId(existingClean)
  const draftIndex = existingClean.length + 1
  const clonedItems = (quote.items || []).map((it) => ({
    ...it,
    id: uid('line')
  }))
  const newDraft = {
    ...quote,
    id: number,
    title: quote.title ? `${quote.title} (Copy)` : `Draft ${draftIndex}`,
    date: today(),
    status: 'Draft',
    items: clonedItems
  }
  patchProject({ quotations: [...existingClean, newDraft] })
  onCreated?.(number)
  toast(`${number} (Draft ${draftIndex}) created as a copy of ${quote.id}.`)
}

function CompareDraftsModal({ allQuotations, currentQuoteId, onSelect, onClose }) {
  return (
    <div className="modal-layer" onMouseDown={onClose}>
      <div className="modal compare-drafts-modal" style={{ maxWidth: '820px', width: '95%' }} onMouseDown={(e) => e.stopPropagation()}>
        <button type="button" className="modal-close" onClick={onClose}><X size={18} /></button>
        <span className="modal-kicker">SIDE-BY-SIDE REVIEW</span>
        <h2>Compare Quotation Drafts</h2>
        <p className="subhead">Compare scope, rates, and totals across all drafts for this project.</p>

        <div className="compare-table-wrap">
          <table className="compare-table">
            <thead>
              <tr>
                <th style={{ width: '160px' }}>Attribute</th>
                {allQuotations.map((q, idx) => (
                  <th key={q.id} className={q.id === currentQuoteId ? 'current-column' : ''}>
                    <div className="compare-head-col">
                      <span className="compare-draft-badge">Draft {idx + 1}</span>
                      <strong>{q.title || q.id}</strong>
                      <small>{q.id}</small>
                      {q.id === currentQuoteId && <span className="compare-active-tag">Active</span>}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Status</td>
                {allQuotations.map((q) => (
                  <td key={q.id} className={q.id === currentQuoteId ? 'current-column' : ''}>
                    <span className={'status-badge ' + q.status.toLowerCase().replace(' ', '-')}>{q.status}</span>
                  </td>
                ))}
              </tr>
              <tr>
                <td>Date</td>
                {allQuotations.map((q) => (
                  <td key={q.id} className={q.id === currentQuoteId ? 'current-column' : ''}>{q.date}</td>
                ))}
              </tr>
              <tr>
                <td>Total line items</td>
                {allQuotations.map((q) => (
                  <td key={q.id} className={q.id === currentQuoteId ? 'current-column' : ''}>
                    <strong>{(q.items || []).length} items</strong>
                  </td>
                ))}
              </tr>
              <tr>
                <td>Untaxed amount</td>
                {allQuotations.map((q) => {
                  const t = getTotals(q.items || [])
                  return <td key={q.id} className={q.id === currentQuoteId ? 'current-column' : ''}>{currency(t.untaxed)}</td>
                })}
              </tr>
              <tr>
                <td>GST (5% + 18%)</td>
                {allQuotations.map((q) => {
                  const t = getTotals(q.items || [])
                  return <td key={q.id} className={q.id === currentQuoteId ? 'current-column' : ''}>{currency(t.tax)}</td>
                })}
              </tr>
              <tr className="compare-total-row">
                <td><strong>Final Total (incl. GST)</strong></td>
                {allQuotations.map((q) => {
                  const t = getTotals(q.items || [])
                  return (
                    <td key={q.id} className={'compare-total-cell ' + (q.id === currentQuoteId ? 'current-column' : '')}>
                      <strong>{currency(t.total)}</strong>
                    </td>
                  )
                })}
              </tr>
              <tr>
                <td>Action</td>
                {allQuotations.map((q) => (
                  <td key={q.id} className={q.id === currentQuoteId ? 'current-column' : ''}>
                    {q.id === currentQuoteId ? (
                      <span className="compare-selected-btn">Currently active</span>
                    ) : (
                      <button
                        type="button"
                        className="button primary compact"
                        onClick={() => { onSelect(q.id); onClose(); }}
                      >
                        Switch to this draft
                      </button>
                    )}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        <div className="modal-actions" style={{ marginTop: '20px' }}>
          <button type="button" className="button secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}

function MergeQuotationsModal({ currentQuote, allQuotations, onClose, onMerge }) {
  const otherQuotes = allQuotations.filter((q) => q.id !== currentQuote.id)
  const [sourceId, setSourceId] = useState(otherQuotes[0]?.id || '')
  const [removeSource, setRemoveSource] = useState(true)

  const selectedSource = otherQuotes.find((q) => q.id === sourceId)

  return (
    <div className="modal-layer" onMouseDown={onClose}>
      <div className="modal" style={{ maxWidth: '490px' }} onMouseDown={(e) => e.stopPropagation()}>
        <button type="button" className="modal-close" onClick={onClose}><X size={18} /></button>
        <span className="modal-kicker">CONSOLIDATE QUOTATIONS</span>
        <h2>Merge quotations</h2>
        <p>
          Combine line items from another version into <strong>{currentQuote.id}</strong> ({currentQuote.status}).
        </p>

        {otherQuotes.length === 0 ? (
          <p className="subhead" style={{ margin: '20px 0' }}>There are no other quotation versions available to merge.</p>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); onMerge(sourceId, removeSource) }}>
            <label className="field" style={{ marginBottom: '14px' }}>
              <span>Select version to merge from</span>
              <select value={sourceId} onChange={(e) => setSourceId(e.target.value)}>
                {otherQuotes.map((item, idx) => (
                  <option key={item.id} value={item.id}>
                    Draft {idx + 1}: {item.title || item.id} · {item.status} ({item.items?.length || 0} items)
                  </option>
                ))}
              </select>
            </label>

            {selectedSource && (
              <div style={{ background: '#f4f7fc', border: '1px solid #d8e2f0', borderRadius: '7px', padding: '12px 14px', marginBottom: '16px', fontSize: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <strong>Source: {selectedSource.id}</strong>
                  <span className={'status-badge ' + selectedSource.status.toLowerCase().replace(' ', '-')}>{selectedSource.status}</span>
                </div>
                <div style={{ color: '#556985', display: 'grid', gap: '3px' }}>
                  <span>Line items: {selectedSource.items?.length || 0}</span>
                  <span>Date: {selectedSource.date}</span>
                </div>
              </div>
            )}

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#445670', cursor: 'pointer', marginBottom: '20px' }}>
              <input
                type="checkbox"
                checked={removeSource}
                onChange={(e) => setRemoveSource(e.target.checked)}
              />
              Remove source version ({sourceId}) after merging to prevent duplicate drafts
            </label>

            <div className="modal-actions">
              <button type="button" className="button secondary" onClick={onClose}>Cancel</button>
              <button type="submit" className="button primary" disabled={!sourceId}>
                <GitMerge size={16} />Merge into {currentQuote.id}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

function Quotations({ project, patchProject, toast }) {
  const [showMergeModal, setShowMergeModal] = useState(false)
  const [showCompareModal, setShowCompareModal] = useState(false)
  const [editingTitle, setEditingTitle] = useState(false)
  const [draftTitleInput, setDraftTitleInput] = useState('')

  const cleanQuotations = useMemo(() => mergeDuplicateQuotations(project.quotations || []), [project.quotations])

  useEffect(() => {
    if ((project.quotations || []).length !== cleanQuotations.length) {
      patchProject({ quotations: cleanQuotations })
    }
  }, [project.quotations, cleanQuotations])

  const [quoteId, setQuoteId] = useState(() => cleanQuotations[cleanQuotations.length - 1]?.id || '')

  // Automatically select latest draft when a new draft is added
  const prevCountRef = useRef(cleanQuotations.length)
  useEffect(() => {
    if (cleanQuotations.length > prevCountRef.current) {
      const newest = cleanQuotations[cleanQuotations.length - 1]
      if (newest) setQuoteId(newest.id)
    }
    prevCountRef.current = cleanQuotations.length
  }, [cleanQuotations])

  useEffect(() => {
    if (!quoteId || !cleanQuotations.some((q) => q.id === quoteId)) {
      setQuoteId(cleanQuotations[cleanQuotations.length - 1]?.id || '')
    }
  }, [cleanQuotations, quoteId])

  const quote = cleanQuotations.find((item) => item.id === quoteId) || cleanQuotations[cleanQuotations.length - 1]
  const currentIndex = cleanQuotations.findIndex((item) => item.id === quote?.id)
  const savedStaffEntries = project.staffDrafts || []

  // Arrow key draft toggling when not typing in form fields
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return
      if (cleanQuotations.length <= 1) return

      if (e.key === 'ArrowLeft' && (e.altKey || !e.ctrlKey)) {
        if (currentIndex > 0) {
          e.preventDefault()
          setQuoteId(cleanQuotations[currentIndex - 1].id)
        }
      } else if (e.key === 'ArrowRight' && (e.altKey || !e.ctrlKey)) {
        if (currentIndex < cleanQuotations.length - 1) {
          e.preventDefault()
          setQuoteId(cleanQuotations[currentIndex + 1].id)
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [cleanQuotations, currentIndex])

  const deleteQuotation = (idToDelete) => {
    const target = cleanQuotations.find((item) => item.id === idToDelete)
    if (!target) return
    const targetLabel = target.title ? `${target.title} (${target.id})` : target.id
    if (!window.confirm(`Delete quotation draft "${targetLabel}"? This cannot be undone.`)) return
    const remaining = cleanQuotations.filter((item) => item.id !== idToDelete)
    patchProject({ quotations: remaining })
    const nextQuote = remaining[remaining.length - 1]
    setQuoteId(nextQuote?.id || '')
    toast(`Draft quotation "${targetLabel}" was deleted.`)
  }

  const saveDraftTitle = (newTitle) => {
    const trimmed = newTitle.trim()
    patchProject({
      quotations: cleanQuotations.map((item) =>
        item.id === quote.id ? { ...item, title: trimmed } : item
      )
    })
    setEditingTitle(false)
    toast(`Draft updated: ${trimmed || quote.id}`)
  }

  const editLine = (lineId, change) => {
    patchProject({
      quotations: cleanQuotations.map((item) =>
        item.id === quote.id
          ? { ...item, items: item.items.map((line) => (line.id === lineId ? { ...line, ...change } : line)) }
          : item
      )
    })
  }

  const deleteLine = (lineId) => {
    patchProject({
      quotations: cleanQuotations.map((item) =>
        item.id === quote.id
          ? { ...item, items: item.items.filter((line) => line.id !== lineId) }
          : item
      )
    })
    toast('Item removed from quotation.')
  }

  const changeStatus = (status) => {
    patchProject({
      quotations: cleanQuotations.map((item) => {
        if (item.id === quote.id) {
          return { ...item, status }
        }
        if (status === 'Approved' && item.status === 'Approved') {
          return { ...item, status: 'Draft' }
        }
        return item
      }),
      status: status === 'Approved' ? 'Quotation approved' : project.status
    })
    toast(quote.id + (quote.title ? ` (${quote.title})` : '') + ' marked as ' + status.toLowerCase() + '.')
  }

  const mergeVersions = (sourceId, removeSource = true) => {
    const source = cleanQuotations.find((q) => q.id === sourceId)
    if (!source || !quote) return

    const itemMap = new Map()
    for (const it of (quote.items || [])) {
      const key = `${(it.area || '').toLowerCase()}::${(it.product || '').toLowerCase()}`
      itemMap.set(key, { ...it })
    }
    for (const it of (source.items || [])) {
      const key = `${(it.area || '').toLowerCase()}::${(it.product || '').toLowerCase()}`
      if (itemMap.has(key)) {
        const prev = itemMap.get(key)
        itemMap.set(key, {
          ...prev,
          quantity: (Number(prev.quantity) || 0) + (Number(it.quantity) || 0),
          unitPrice: Math.max(Number(prev.unitPrice) || 0, Number(it.unitPrice) || 0),
          note: [prev.note, it.note].filter(Boolean).join('; ')
        })
      } else {
        itemMap.set(key, { ...it, id: uid('line') })
      }
    }

    const mergedQuote = {
      ...quote,
      items: Array.from(itemMap.values())
    }

    let nextQuotations = cleanQuotations.map((q) => q.id === quote.id ? mergedQuote : q)
    if (removeSource) {
      nextQuotations = nextQuotations.filter((q) => q.id !== sourceId)
    }

    const deduplicated = mergeDuplicateQuotations(nextQuotations)
    patchProject({ quotations: deduplicated })
    setShowMergeModal(false)
    toast(`Merged ${sourceId} into ${quote.id}.`)
  }

  if (!quote)
    return (
      <section className="panel empty-quote">
        <FileText size={32} />
        <p className="eyebrow">NO QUOTATION YET</p>
        <h2>Start from your measured areas</h2>
        <p>
          {savedStaffEntries.length
            ? savedStaffEntries.length + ' saved staff cart item' + (savedStaffEntries.length === 1 ? ' is' : 's are') + ' ready to be included.'
            : 'Add materials to an area, then create a quotation.'}{' '}
          The products and calculated quantities will carry through automatically.
        </p>
        <button
          type="button"
          className="button primary"
          style={{ marginTop: '16px' }}
          onClick={() => makeQuotation(project, patchProject, toast, setQuoteId)}
        >
          <Plus size={16} />Create first quotation draft
        </button>
      </section>
    )

  return (
    <div className="quotation-layout">
      {/* 1. DRAFTS NAVIGATOR & TOGGLE BAR */}
      <section className="quotation-drafts-navigator panel">
        <div className="drafts-nav-header">
          <div className="drafts-nav-title">
            <span className="drafts-nav-icon"><Layers size={19} /></span>
            <div>
              <div className="drafts-nav-heading-row">
                <h3>Quotation Drafts</h3>
                <span className="drafts-count-badge">
                  {cleanQuotations.length} {cleanQuotations.length === 1 ? 'draft' : 'drafts'}
                </span>
                {quote.status === 'Approved' && (
                  <span className="status-badge approved">Approved scope</span>
                )}
              </div>
              <p className="drafts-nav-subtitle">
                Toggle between drafts to review alternatives, customize rates, or offer client options.
              </p>
            </div>
          </div>

          <div className="drafts-quick-actions">
            <button
              type="button"
              className="button primary drafts-action-btn"
              title="Create a new draft quotation from project materials"
              onClick={() => makeQuotation(project, patchProject, toast, setQuoteId)}
            >
              <Plus size={14} />
              <span>+ New draft</span>
            </button>
          </div>
        </div>

        {/* PRIMARY PROMINENT DRAFT TOGGLE DROPDOWN BAR */}
        <div className="draft-dropdown-hero-bar">
          <div className="draft-dropdown-hero-left">
            <label htmlFor="quotation-draft-dropdown" className="draft-dropdown-hero-label">
              <span className="draft-dropdown-label-kicker">SELECT DRAFT</span>
              <span className="draft-dropdown-label-main">Toggle Draft:</span>
            </label>
            <div className="draft-dropdown-hero-select-wrap">
              <select
                id="quotation-draft-dropdown"
                className="draft-dropdown-hero-select"
                value={quote.id}
                onChange={(e) => setQuoteId(e.target.value)}
                title="Toggle around the different drafts of the quotation from this drop down"
                aria-label="Toggle quotation draft from dropdown"
              >
                {cleanQuotations.map((item, idx) => {
                  const itemTotals = getTotals(item.items || [])
                  const isCurrent = item.id === quote.id
                  return (
                    <option key={item.id} value={item.id}>
                      {isCurrent ? '▶ ' : ''}Draft {idx + 1}: {item.title || item.id} — {currency(itemTotals.total)} ({item.status})
                    </option>
                  )
                })}
              </select>
            </div>
          </div>

          <div className="draft-dropdown-hero-right">
            {cleanQuotations.length > 1 && (
              <div className="drafts-stepper">
                <button
                  type="button"
                  className="drafts-stepper-btn"
                  title="Previous draft (Left Arrow / Alt+Left)"
                  aria-label="Previous draft"
                  disabled={currentIndex <= 0}
                  onClick={() => setQuoteId(cleanQuotations[currentIndex - 1].id)}
                >
                  <ChevronLeft size={16} />
                  <span>Prev</span>
                </button>
                <span className="drafts-stepper-indicator">
                  Draft {currentIndex + 1} of {cleanQuotations.length}
                </span>
                <button
                  type="button"
                  className="drafts-stepper-btn"
                  title="Next draft (Right Arrow / Alt+Right)"
                  aria-label="Next draft"
                  disabled={currentIndex >= cleanQuotations.length - 1}
                  onClick={() => setQuoteId(cleanQuotations[currentIndex + 1].id)}
                >
                  <span>Next</span>
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
            <span className="draft-dropdown-active-pill">
              Active: <strong>Draft {currentIndex + 1}</strong>
            </span>
          </div>
        </div>

        {/* The Interactive Draft Cards Row */}
        <div className="drafts-toggle-track" role="tablist" aria-label="Quotation drafts list">
          {cleanQuotations.map((item, idx) => {
            const isSelected = item.id === quote.id
            const itemTotals = getTotals(item.items || [])
            const draftNumber = `Draft ${idx + 1}`
            const draftTitle = item.title || draftNumber
            return (
              <div
                key={item.id}
                role="tab"
                aria-selected={isSelected}
                tabIndex={0}
                className={'draft-toggle-card' + (isSelected ? ' active' : '')}
                onClick={() => setQuoteId(item.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setQuoteId(item.id)
                  }
                }}
              >
                <div className="draft-card-top">
                  <span className="draft-card-badge">{draftNumber}</span>
                  <span className={'status-badge ' + item.status.toLowerCase().replace(' ', '-')}>
                    {item.status}
                  </span>
                  {isSelected && <span className="active-dot" title="Active draft being viewed" />}
                </div>

                <div className="draft-card-name">
                  <strong>{draftTitle}</strong>
                  <small>{item.id} · {item.date}</small>
                </div>

                <div className="draft-card-footer">
                  <div className="draft-card-stats">
                    <span className="draft-card-amount">{currency(itemTotals.total)}</span>
                    <span className="draft-card-items">{(item.items || []).length} items</span>
                  </div>
                  {item.status === 'Draft' && cleanQuotations.length > 1 && (
                    <button
                      type="button"
                      className="draft-card-del-btn"
                      title={`Delete ${item.title || item.id}`}
                      aria-label={`Delete ${item.title || item.id}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteQuotation(item.id)
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            )
          })}

          <button
            type="button"
            className="draft-add-card-btn"
            title="Create another draft quotation from project materials"
            onClick={() => makeQuotation(project, patchProject, toast, setQuoteId)}
          >
            <Plus size={18} />
            <span>+ Add draft</span>
          </button>
        </div>
      </section>

      {/* 2. ACTIVE DRAFT ACTIONS & METADATA BAR */}
      <section className="active-draft-bar panel">
        <div className="active-draft-info">
          <div className="active-draft-label-wrap">
            <span className="active-draft-kicker">VIEWING DRAFT {currentIndex + 1} OF {cleanQuotations.length}</span>
            {editingTitle ? (
              <form
                className="draft-rename-form"
                onSubmit={(e) => {
                  e.preventDefault()
                  saveDraftTitle(draftTitleInput)
                }}
              >
                <input
                  autoFocus
                  type="text"
                  value={draftTitleInput}
                  onChange={(e) => setDraftTitleInput(e.target.value)}
                  placeholder="e.g. Option A - Velvet Fabric, 10% Discount"
                />
                <button type="submit" className="button primary compact">Save title</button>
                <button type="button" className="button secondary compact" onClick={() => setEditingTitle(false)}>Cancel</button>
              </form>
            ) : (
              <div className="active-draft-title-display">
                <h2>{quote.title || `Draft ${currentIndex + 1}`}: {quote.id}</h2>
                <button
                  type="button"
                  className="icon-button edit-title-btn"
                  title="Rename draft (e.g. Option A, Discounted Package)"
                  onClick={() => {
                    setDraftTitleInput(quote.title || `Draft ${currentIndex + 1}`)
                    setEditingTitle(true)
                  }}
                >
                  <Pencil size={13} />
                </button>
              </div>
            )}
          </div>
          <p className="active-draft-subhead">
            {quote.status === 'Approved'
              ? 'This draft is client-approved and linked to the Tax Invoice.'
              : 'Editable draft quotation. Adjust line items below or switch between draft options.'}
          </p>
        </div>

        <div className="active-draft-switch-dropdown-wrap">
          <label htmlFor="active-bar-draft-select" className="active-draft-switch-label">
            <span>Switch draft:</span>
          </label>
          <select
            id="active-bar-draft-select"
            className="active-bar-draft-select"
            value={quote.id}
            onChange={(e) => setQuoteId(e.target.value)}
            title="Toggle draft of quotation from dropdown"
            aria-label="Toggle draft of quotation from dropdown"
          >
            {cleanQuotations.map((item, idx) => {
              const itemTotals = getTotals(item.items || [])
              return (
                <option key={item.id} value={item.id}>
                  Draft {idx + 1}: {item.title || item.id} — {currency(itemTotals.total)} ({item.status})
                </option>
              )
            })}
          </select>
        </div>

        <div className="quote-actions">
          {cleanQuotations.length > 1 && (
            <button
              type="button"
              className="button secondary"
              title="Compare all drafts side-by-side"
              onClick={() => setShowCompareModal(true)}
            >
              <Layers size={15} />Compare drafts
            </button>
          )}
          {cleanQuotations.length > 1 && (
            <button
              type="button"
              className="button secondary"
              title="Merge another quotation version into this quotation"
              onClick={() => setShowMergeModal(true)}
            >
              <GitMerge size={15} />Merge versions
            </button>
          )}
          <button type="button" className="button secondary" onClick={() => window.print()}>
            <Printer size={15} />Print
          </button>
          <button type="button" className="button secondary" onClick={() => window.print()}>
            <Download size={15} />PDF
          </button>
          {quote.status !== 'Approved' && (
            <button type="button" className="button primary" onClick={() => changeStatus('Approved')}>
              <CheckCircle2 size={15} />Approve draft
            </button>
          )}
          {quote.status === 'Draft' && cleanQuotations.length > 1 && (
            <button
              type="button"
              className="button danger-button delete-quote-btn"
              title={`Delete draft quotation ${quote.id}`}
              onClick={() => deleteQuotation(quote.id)}
            >
              <Trash2 size={15} />Delete draft
            </button>
          )}
        </div>
      </section>

      {/* 3. DOCUMENT SHEET */}
      <DocumentSheet project={project} quote={quote} editable onEditLine={editLine} onDeleteLine={deleteLine} />

      {/* 4. MODALS */}
      {showMergeModal && (
        <MergeQuotationsModal
          currentQuote={quote}
          allQuotations={cleanQuotations}
          onClose={() => setShowMergeModal(false)}
          onMerge={mergeVersions}
        />
      )}
      {showCompareModal && (
        <CompareDraftsModal
          allQuotations={cleanQuotations}
          currentQuoteId={quote.id}
          onSelect={(selectedId) => setQuoteId(selectedId)}
          onClose={() => setShowCompareModal(false)}
        />
      )}
    </div>
  )
}

function Total({ label, value, total }) { return <div className={total ? 'total-line total' : 'total-line'}><span>{label}</span><strong>{currency(value)}</strong></div> }

function DocumentSheet({ project, quote, editable = false, onEditLine, onDeleteLine, documentType = 'Quotation', documentNumber = quote.id }) {
  const unifiedItems = useMemo(() => unifyQuoteItems(quote.items || []), [quote.items])
  const totals = getTotals(unifiedItems)
  const customerName = project.customer.name || 'Customer name'
  const address = project.customer.address || project.customer.location || 'Site address to be added'
  const isInvoice = documentType !== 'Quotation'
  return <article className={'quotation-sheet document-sheet' + (isInvoice ? ' invoice-sheet' : '')}>
    <header className="document-header">
      <div className="document-company"><h2>Krishna Decor</h2><p>CTS NO-1813|B|2<br />Bapat Galli Car Parking<br /><strong>Belgaum-Karnataka</strong><br />Mob-9036674138<br />E-mail - krishna.decor2015@gmail.com</p><p className="document-customer">{customerName}<br /><span>{project.name}</span></p></div>
      <div className="document-title"><div className="document-brand">KRISHNA DECOR</div><h1>{documentType} <span>#</span> {documentNumber}</h1>{quote?.title && !isInvoice && <span className="document-draft-tag">{quote.title}</span>}<p>GSTIN: 29AWZPK1722G1Z4</p></div>
    </header>
    <section className="document-details" aria-label={documentType + ' details'}><div><strong>{isInvoice ? 'Invoice Date' : 'Quotation Date'}</strong><span>{quote.date}</span></div><div><strong>{isInvoice ? 'Payment Terms' : 'Expiration'}</strong><span>{isInvoice ? 'As agreed' : 'Valid for 30 days'}</span></div><div><strong>{isInvoice ? 'Billing To' : 'Salesperson'}</strong><span>{isInvoice ? customerName : 'Krishna Decor'}</span></div></section>
    <div className="document-table-shell"><table className="document-table"><thead><tr><th>Description</th><th>Quantity</th><th>Unit Price</th><th>Taxes</th><th>Amount</th>{editable && <th style={{ width: '40px', textAlign: 'center' }}></th>}</tr></thead><tbody>{unifiedItems.map((line) => <tr key={line.id}><td><strong>{line.area ? line.area + ' - ' : ''}{line.product}</strong>{line.note && <small>{line.note}</small>}</td><td>{editable ? <input aria-label="Order quantity" type="number" min="0" step="0.01" placeholder="0" value={line.quantity || ''} onChange={(e) => onEditLine(line.id, { quantity: e.target.value === '' ? 0 : Number(Number(e.target.value).toFixed(2)) })} /> : <span>{quantity(line.quantity)} {unitLabel(line.product)}</span>}</td><td>{editable ? <div className="price-input"><span>₹</span><input aria-label="Unit price" type="number" min="0" placeholder="0" value={line.unitPrice || ''} onChange={(e) => onEditLine(line.id, { unitPrice: e.target.value === '' ? 0 : Number(e.target.value) })} /></div> : <span>{currency(line.unitPrice)}</span>}</td><td><span>GST {line.gst}%</span></td><td><strong>{currency(line.quantity * line.unitPrice)}</strong></td>{editable && <td style={{ textAlign: 'center' }}><button type="button" className="icon-button danger" title="Remove line item" aria-label="Remove line item" onClick={() => onDeleteLine?.(line.id)}><Trash2 size={14} /></button></td>}</tr>)}</tbody></table></div>
    <div className="document-summary"><section className="document-terms"><h3>Terms and conditions</h3><ol><li>NO CREDIT</li><li>70% advance payment</li><li>30% balance payment BEFORE DELIVERY</li><li>Minimum delivery time is 20 days.</li><li>Early delivery is not a commitment or guarantee.</li><li>Scaffolding, ladder and stools required for installation must be provided by the customer.</li></ol></section><section className="document-totals"><Total label="Untaxed Amount" value={totals.untaxed} /><Total label="SGST / UTGST" value={totals.tax / 2} /><Total label="CGST" value={totals.tax / 2} /><Total label="Total" value={totals.total} total /></section></div>
    <footer className="document-footer"><div className="document-bank"><p>Bank Details</p><strong>KRISHNA DECOR</strong><span>Ac No 917020002479616<br />Axis Bank IFSC CODE UTIB0002941<br />Kadolkar Galli Branch</span></div><div className="document-signature"><p>I accept the above {documentType.toLowerCase()} with the terms and conditions.</p><span>Customer Signature</span></div></footer>
  </article>
}

function Invoice({ project, toast }) {
  const approved = project.quotations.find((quote) => quote.status === 'Approved')
  if (!approved) return <section className="panel invoice-state"><span className="state-icon"><Clock3 size={25} /></span><p className="eyebrow">WAITING FOR APPROVAL</p><h2>Approve a quotation first</h2><p>Invoices are intentionally restricted to approved quotations, so the billing record always matches the agreed scope.</p><button className="button secondary" onClick={() => toast('Open Quotations and mark the client-approved version.')}>View quotations</button></section>
  const invoiceNumber = 'INV-' + approved.id.replace(/^KD-/, '')
  return <div className="quotation-layout invoice-layout"><div className="quote-controls panel"><span className="status-badge approved">Approved quotation</span><div className="quote-actions"><button className="button secondary" onClick={() => window.print()}><Printer size={16} />Print bill</button><button className="button secondary" onClick={() => window.print()}><Download size={16} />Save PDF</button></div></div><DocumentSheet project={project} quote={approved} documentType="Tax Invoice" documentNumber={invoiceNumber} /></div>
}

function Payments({ project, patchProject, toast }) {
  const quote = project.quotations.find((item) => item.status === 'Approved')
  const total = getTotals(quote?.items || []).total
  const received = project.payments.reduce((sum, payment) => payment.state === 'Received' ? sum + Number(payment.amount) : sum, 0)
  const outstanding = Math.max(0, total - received)
  const canRecordPayment = Boolean(quote) && outstanding > 0
  const defaultInvoiceNo = quote ? 'INV-' + quote.id.replace(/^KD-/, '') : ''

  const defaultPaymentState = {
    label: 'Advance payment',
    amount: '',
    method: 'Bank transfer',
    date: new Date().toISOString().slice(0, 10),
    utr: '',
    reference: '',
    chequeNumber: '',
    invoiceNumber: ''
  }

  const [showAdd, setShowAdd] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [payment, setPayment] = useState(defaultPaymentState)

  const editingItem = editingId ? project.payments.find((p) => p.id === editingId) : null
  const maxAllowed = editingItem ? (outstanding + Number(editingItem.amount || 0)) : outstanding

  const startEditPayment = (item) => {
    setEditingId(item.id)
    setPayment({
      label: item.label || '',
      amount: String(item.amount || ''),
      method: item.method || 'Bank transfer',
      date: item.date || new Date().toISOString().slice(0, 10),
      utr: item.utr || '',
      reference: item.reference || '',
      chequeNumber: item.chequeNumber || '',
      invoiceNumber: item.invoiceNumber || ''
    })
    setShowAdd(true)
  }

  const cancelForm = () => {
    setShowAdd(false)
    setEditingId(null)
    setPayment(defaultPaymentState)
  }

  const savePayment = async () => {
    const amount = Number(payment.amount)
    if (!quote) { toast('Approve a quotation before recording a payment.'); return }
    if (!Number.isFinite(amount) || amount <= 0) { toast('Enter a payment amount greater than zero.'); return }
    if (amount > maxAllowed) { toast('Payment cannot exceed the outstanding balance of ' + currency(maxAllowed) + '.'); return }

    const record = {
      id: editingId || uid('pay'),
      label: payment.label.trim() || 'Payment',
      amount,
      method: payment.method,
      date: payment.date,
      state: 'Received',
      utr: payment.method === 'UPI' ? (payment.utr?.trim() || '') : (payment.method === 'Bank transfer' ? (payment.reference?.trim() || payment.utr?.trim() || '') : ''),
      reference: ['Bank transfer', 'Cash'].includes(payment.method) ? (payment.reference?.trim() || payment.utr?.trim() || '') : '',
      invoiceNumber: ['Bank transfer', 'Cheque'].includes(payment.method) ? (payment.invoiceNumber?.trim() || '') : '',
      chequeNumber: payment.method === 'Cheque' ? (payment.chequeNumber?.trim() || '') : ''
    }

    let nextPayments
    if (editingId) {
      nextPayments = project.payments.map((p) => p.id === editingId ? record : p)
    } else {
      nextPayments = [...project.payments, record]
    }

    const saved = await patchProject({ payments: nextPayments })
    if (saved) {
      setShowAdd(false)
      const wasEditing = Boolean(editingId)
      setEditingId(null)
      setPayment({
        ...defaultPaymentState,
        label: 'Balance payment',
        method: payment.method
      })
      toast(wasEditing ? 'Payment record updated.' : 'Payment recorded.')
    }
  }

  const deletePayment = async (item) => {
    if (!window.confirm('Delete payment record of ' + currency(item.amount) + ' (' + item.label + ')?')) return
    const nextPayments = project.payments.filter((p) => p.id !== item.id)
    const saved = await patchProject({ payments: nextPayments })
    if (saved) toast('Payment record removed.')
  }

  return <div className="payments-layout">
    <section className="payment-hero panel"><div><p className="eyebrow">COLLECTION STATUS</p><h2>{currency(received)} <span>received</span></h2><p>{quote ? 'Against approved quotation ' + quote.id : 'Approve a quotation before recording payments.'}</p></div><div className="payment-amounts"><div><small>Quotation total</small><strong>{currency(total)}</strong></div><div><small>Outstanding</small><strong>{currency(outstanding)}</strong></div></div></section>
    <section className="panel payment-ledger"><div className="section-heading"><div><p className="eyebrow">PAYMENT LEDGER</p><h3>Project payments</h3></div><button className="button primary" title={!quote ? 'Approve a quotation before recording payments' : outstanding <= 0 ? 'The approved quotation has been paid in full' : 'Record payment'} disabled={!canRecordPayment} onClick={() => { if (showAdd && !editingId) { setShowAdd(false) } else { setEditingId(null); setPayment(defaultPaymentState); setShowAdd(true) } }}><Plus size={16} />Record payment</button></div>
      {!quote && <p className="payment-note">Payments become available once a quotation is approved.</p>}{quote && outstanding <= 0 && <p className="payment-note">This approved quotation has been paid in full. No further payment records can be added.</p>}
      {showAdd && (canRecordPayment || editingId) && <div className="payment-form">
        <div className="payment-form-header">
          <h4>{editingId ? 'Edit payment record' : 'Record new payment'}</h4>
          {editingId && <span className="payment-badge-editing">Editing existing record</span>}
        </div>
        <div className="payment-form-row">
          <Field label="Payment for" placeholder="e.g. Advance payment" value={payment.label} onChange={(e) => setPayment({ ...payment, label: e.target.value })} />
          <Field label="Amount" type="number" min="0.01" max={maxAllowed} step="0.01" placeholder={'Max ' + currency(maxAllowed)} value={payment.amount} onChange={(e) => setPayment({ ...payment, amount: e.target.value })} />
          <label className="field">
            <span>Method</span>
            <select value={payment.method} onChange={(e) => setPayment({ ...payment, method: e.target.value })}>
              <option>UPI</option>
              <option>Bank transfer</option>
              <option>Cheque</option>
              <option>Cash</option>
            </select>
          </label>
          <Field label="Received date" type="date" value={payment.date} onChange={(e) => setPayment({ ...payment, date: e.target.value })} />
        </div>

        {payment.method === 'UPI' && (
          <div className="payment-optional-box">
            <div className="payment-optional-title">
              <strong>UPI Payment Details</strong>
              <span>Optional section to input UTR number for banking verification</span>
            </div>
            <div className="payment-optional-grid">
              <Field
                label="UTR number (Optional)"
                placeholder="e.g. 402812345678 (Optional)"
                value={payment.utr}
                onChange={(e) => setPayment({ ...payment, utr: e.target.value })}
              />
            </div>
          </div>
        )}

        {payment.method === 'Bank transfer' && (
          <div className="payment-optional-box">
            <div className="payment-optional-title">
              <strong>Bank Transfer Details</strong>
              <span>Optional inputs for storing UTR / Transaction Reference and Invoice number</span>
            </div>
            <div className="payment-optional-grid">
              <Field
                label="UTR / Transaction Reference (Optional)"
                placeholder="e.g. UTR / NEFT / RTGS / IMPS reference (Optional)"
                value={payment.reference}
                onChange={(e) => setPayment({ ...payment, reference: e.target.value })}
              />
              <div className="field">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span>Invoice number (Optional)</span>
                  {defaultInvoiceNo && payment.invoiceNumber !== defaultInvoiceNo && (
                    <button
                      type="button"
                      className="use-invoice-btn"
                      onClick={() => setPayment((prev) => ({ ...prev, invoiceNumber: defaultInvoiceNo }))}
                    >
                      Use {defaultInvoiceNo}
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  placeholder={defaultInvoiceNo ? `${defaultInvoiceNo} (Optional)` : 'e.g. INV-015 (Optional)'}
                  value={payment.invoiceNumber}
                  onChange={(e) => setPayment({ ...payment, invoiceNumber: e.target.value })}
                />
              </div>
            </div>
          </div>
        )}

        {payment.method === 'Cheque' && (
          <div className="payment-optional-box">
            <div className="payment-optional-title">
              <strong>Cheque Details</strong>
              <span>Optional inputs for storing Cheque Number and Invoice number</span>
            </div>
            <div className="payment-optional-grid">
              <Field
                label="Cheque Number (Optional)"
                placeholder="e.g. 000123 (6-digit Cheque No.) (Optional)"
                value={payment.chequeNumber}
                onChange={(e) => setPayment({ ...payment, chequeNumber: e.target.value })}
              />
              <div className="field">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span>Invoice number (Optional)</span>
                  {defaultInvoiceNo && payment.invoiceNumber !== defaultInvoiceNo && (
                    <button
                      type="button"
                      className="use-invoice-btn"
                      onClick={() => setPayment((prev) => ({ ...prev, invoiceNumber: defaultInvoiceNo }))}
                    >
                      Use {defaultInvoiceNo}
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  placeholder={defaultInvoiceNo ? `${defaultInvoiceNo} (Optional)` : 'e.g. INV-015 (Optional)'}
                  value={payment.invoiceNumber}
                  onChange={(e) => setPayment({ ...payment, invoiceNumber: e.target.value })}
                />
              </div>
            </div>
          </div>
        )}

        {payment.method === 'Cash' && (
          <div className="payment-optional-box">
            <div className="payment-optional-title">
              <strong>Cash Receipt Details</strong>
              <span>Cash received in hand</span>
            </div>
            <div className="payment-optional-grid">
              <Field
                label="Receipt memo / Notes (Optional)"
                placeholder="e.g. Received at showroom (Optional)"
                value={payment.reference}
                onChange={(e) => setPayment({ ...payment, reference: e.target.value })}
              />
            </div>
          </div>
        )}

        <div className="payment-form-actions">
          <button type="button" className="button secondary" onClick={cancelForm}>Cancel</button>
          <button
            type="button"
            className="button primary"
            disabled={!payment.amount || Number(payment.amount) <= 0 || Number(payment.amount) > maxAllowed}
            onClick={savePayment}
          >
            {editingId ? 'Save changes' : 'Record payment'}
          </button>
        </div>
      </div>}

      {project.payments.length ? (
        <table className="simple-table payment-table">
          <thead>
            <tr>
              <th>Payment</th>
              <th>Date</th>
              <th>Method</th>
              <th>Reference / Details</th>
              <th>Status</th>
              <th>Amount</th>
              <th style={{ width: '80px', textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {project.payments.map((item) => (
              <tr key={item.id}>
                <td><strong>{item.label}</strong></td>
                <td>{item.date}</td>
                <td><strong>{item.method}</strong></td>
                <td>
                  {item.method === 'UPI' && (
                    item.utr ? <span className="reference-pill">UTR: {item.utr}</span> : <span className="muted-dash">—</span>
                  )}
                  {item.method === 'Bank transfer' && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                      {item.reference && <span className="reference-pill">Ref: {item.reference}</span>}
                      {item.invoiceNumber && <span className="reference-pill invoice-pill">Inv: {item.invoiceNumber}</span>}
                      {!item.reference && !item.invoiceNumber && <span className="muted-dash">—</span>}
                    </div>
                  )}
                  {item.method === 'Cheque' && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                      {item.chequeNumber && <span className="reference-pill">Cheque: {item.chequeNumber}</span>}
                      {item.invoiceNumber && <span className="reference-pill invoice-pill">Inv: {item.invoiceNumber}</span>}
                      {!item.chequeNumber && !item.invoiceNumber && <span className="muted-dash">—</span>}
                    </div>
                  )}
                  {item.method === 'Cash' && (
                    <span className="reference-pill cash-pill">{item.reference ? 'Cash: ' + item.reference : 'Cash in hand'}</span>
                  )}
                  {!['UPI', 'Bank transfer', 'Cheque', 'Cash'].includes(item.method) && (
                    <span className="muted-dash">—</span>
                  )}
                </td>
                <td><span className="status-badge approved">{item.state}</span></td>
                <td><strong>{currency(item.amount)}</strong></td>
                <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                  <button
                    type="button"
                    className="icon-button"
                    title="Edit payment details"
                    aria-label="Edit payment details"
                    style={{ marginRight: '6px' }}
                    onClick={() => startEditPayment(item)}
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    type="button"
                    className="icon-button danger"
                    title="Delete payment record"
                    aria-label="Delete payment record"
                    onClick={() => deletePayment(item)}
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <Empty label="No payments recorded yet." />
      )}
    </section>
  </div>
}

function Empty({ label, action, onClick }) { return <div className="empty-state"><Package size={22} /><p>{label}</p>{action && <button className="text-button" onClick={onClick}>{action}<ArrowUpRight size={14} /></button>}</div> }

function NewProjectModal({ onClose, onCreate }) {
  const [values, setValues] = useState({ name: '', customer: '' })
  return <div className="modal-layer" onMouseDown={onClose}><form className="modal" onSubmit={(e) => { e.preventDefault(); onCreate(values) }} onMouseDown={(e) => e.stopPropagation()}><button type="button" className="modal-close" onClick={onClose}><X size={18} /></button><span className="modal-kicker">NEW PROJECT</span><h2>Set up a project</h2><p>Start with a project name. Customer details can be completed in the next step.</p><Field label="Project name" value={values.name} placeholder="e.g. Mehta Residence" onChange={(e) => setValues({ ...values, name: e.target.value })} /><Field label="Customer name (optional)" value={values.customer} placeholder="e.g. Priya Mehta" onChange={(e) => setValues({ ...values, customer: e.target.value })} /><div className="modal-actions"><button type="button" className="button secondary" onClick={onClose}>Cancel</button><button type="submit" className="button primary">Create project <ArrowUpRight size={16} /></button></div></form></div>
}

createRoot(document.getElementById('root')).render(<App />)
