import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  ArrowUpRight, Bell, Check, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight,
  CircleDollarSign, Clock3, Copy, CreditCard, Download, Eye, FileText, FolderKanban,
  FolderOpen, HardDrive,
  GitMerge, Layers, LayoutDashboard, MapPin, Menu, MoreHorizontal, Package, Plus,
  Printer, Receipt, RefreshCw, Ruler, Search, Trash2, Users, LogOut, X,
  Pencil, Phone, Mail
} from 'lucide-react'
import './styles.css'
import documentBg from './assets/document-bg.jpg'
import { apiBase, apiUrl, canConfigureApiBase, clearApiBase, isApiConfigured, setApiBase, cloudApiBase, isDesktopApp } from './api-config.js'

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

// Individual curtain materials:
// 1. Valence: renamed from Valence curtain, sheer and lining removed
// 2. American: automated sheer and lining removed, all 3 as individual materials
// 3. Eyelet & Ripple: automated sheer and lining removed, all 3 as individual materials
const INDIVIDUAL_CURTAIN_PRODUCTS = [
  ['American main curtain', 5, 'american'],
  ['American sheer curtain', 5, 'american'],
  ['American lining', 5, 'american'],
  ['Eyelet main curtain', 5, 'eyelet'],
  ['Eyelet sheer curtain', 5, 'eyelet'],
  ['Eyelet lining', 5, 'eyelet'],
  ['Ripple main curtain', 5, 'ripple'],
  ['Ripple sheer curtain', 5, 'ripple'],
  ['Ripple lining', 5, 'ripple'],
  ['Valence', 5, 'valance']
]

// Legacy bundle definitions kept empty so automated computation of sheer and lining is removed
const CURTAIN_SYSTEMS = []

const CLAMP_OPTIONS = ['Ceiling Clamps', 'Single wall clamp', 'Double wall clamp']

const ALL_CURTAIN_COMPONENT_NAMES = new Set([
  ...INDIVIDUAL_CURTAIN_PRODUCTS.map(([name]) => name),
  'American main curtains', 'American sheer', 'American sheer curtains', 'American lining',
  'Valence main curtains', 'Valence main curtain', 'Valence curtains',
  'Eyelet Main curtains', 'Eyelet sheer', 'Eyelet sheer curtains', 'Eyelet lining',
  'Eylet Main curtains', 'Eylet main curtain', 'Eylet sheer', 'Eylet sheer curtains', 'Eylet lining',
  'Ripple Main curtains', 'Ripple sheer', 'Ripple sheer curtain', 'Ripple lining'
])

const MATERIAL_PRODUCTS = [
  ...INDIVIDUAL_CURTAIN_PRODUCTS,
  ['American sheer', 5, 'american'],
  ['American main curtains', 5, 'american'],
  ['American sheer curtains', 5, 'american'],
  ['Eyelet Main curtains', 5, 'eyelet'],
  ['Eyelet sheer curtains', 5, 'eyelet'],
  ['Eylet main curtain', 5, 'eyelet'],
  ['Eylet sheer curtain', 5, 'eyelet'],
  ['Eylet sheer', 5, 'eyelet'],
  ['Eylet lining', 5, 'eyelet'],
  ['Ripple Main curtains', 5, 'ripple'],
  ['Ripple sheer curtain', 5, 'ripple'],
  ['Ripple sheer', 5, 'ripple'],
  ['Valence main curtain', 5, 'valance'],
  ['Valence main curtains', 5, 'valance'],
  ['American Stitching', 18, 'stitching-american'],
  ['Valence Stitching', 18, 'stitching-valance'],
  ['Velance stitching', 18, 'stitching-valance'],
  ['Valance stitching', 18, 'stitching-valance'],
  ['Roman blinds', 18, 'roman'],
  ['Roller blinds', 18, 'blind-sqft'], ['Zebra blinds', 18, 'blind-sqft'], ['Wooden Venetian blinds', 18, 'blind-sqft'],
  ['Eyelet Stitching', 18, 'stitching-eyelet'],
  ['Eyelet stitching', 18, 'stitching-eyelet'],
  ['Ripple Stitching', 18, 'stitching-ripple'],
  ['Ripple stitching', 18, 'stitching-ripple'],
  ['Tracks', 18, 'tracks'], ['Runners', 18, 'runners'],
  ['Hooks', 18, 'hooks'],
  ['Ceiling clamps', 18, 'ceiling-clamp'], ['Single wall clamps', 18, 'single-clamp'], ['Double wall clamps', 18, 'double-clamp'],
  ...CLAMP_OPTIONS.map((name) => [name, 18, 'clamp']),
  ['Bed back fabric', 5], ['Bed border fabric', 5], ['Bed back making', 5], ['Soft board fabric', 5],
  ['Soft board making', 18], ['Seating fabric', 5], ['Seating making', 18], ['Pillow fabric', 5],
  ['Pillow', 18], ['Mattress', 18], ['Wallpaper rolls', 18], ['Wallpaper pasting', 18],
  ['Customised wallpaper', 18], ['Customised wallpaper pasting', 18], ['Carpet', 18],
  ['Bed set', 18], ['Bedsheets', 18], ['Bed sheet', 18], ['Runner fabric', 5], ['Runner stitching', 18],
  ['Vinyl blinds', 18], ['Monsoon blinds', 18, 'blind-sqft'], ['Matting', 18], ['Mat', 18],
  ['PVC Matting', 18], ['Rod', 18], ['Support', 18], ['End caps', 18], ['Shower curtain', 18]
].map(([name, gst, formula]) => ({ name, gst, formula: formula || 'standard' }))

const PRODUCTS = [
  ...INDIVIDUAL_CURTAIN_PRODUCTS.map(([name, gst, formula]) => ({ name, gst, formula })),
  ...MATERIAL_PRODUCTS.filter((product) =>
    !INDIVIDUAL_CURTAIN_PRODUCTS.some(([name]) => name === product.name) &&
    !ALL_CURTAIN_COMPONENT_NAMES.has(product.name) &&
    !['Installation', 'Delivery'].includes(product.name) &&
    !['Velance stitching', 'Valance stitching', 'Eyelet stitching', 'Ripple stitching'].includes(product.name)
  )
]

const EDITABLE_MATERIAL_PRODUCTS = MATERIAL_PRODUCTS.filter((product) => !['Installation', 'Delivery'].includes(product.name))
const EDITABLE_MODAL_PRODUCTS = Array.from(new Set([
  ...PRODUCTS.map((p) => p.name),
  ...MATERIAL_PRODUCTS.filter((product) => !['Installation', 'Delivery'].includes(product.name)).map((p) => p.name)
]))

const UNITS_TO_INCHES = { in: 1, ft: 12, m: 39.3701, cm: 0.393701 }
const toInches = (value, unit = 'in') => Number(value || 0) * (UNITS_TO_INCHES[unit] || 1)
const fromInches = (value, unit = 'in') => Number(value || 0) / (UNITS_TO_INCHES[unit] || 1)

const currency = (value) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value || 0)
const quantity = (value) => Number(value || 0).toFixed(2)
const uid = (prefix) => prefix + '-' + Math.random().toString(36).slice(2, 8)
const today = () => new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date())

function isStitchingPanelProduct(name) {
  if (!name) return false
  const p = String(name).toLowerCase().trim()
  if (!p.includes('stitching')) return false
  return p.includes('american') || p.includes('valence') || p.includes('velance') || p.includes('valance') || p.includes('eyelet') || p.includes('eylet') || p.includes('ripple')
}

function unitLabel(productName) {
  const p = String(productName || '').toLowerCase().trim()
  if (
    p === 'american stitching' ||
    p === 'valence stitching' ||
    p === 'velance stitching' ||
    p === 'valance stitching' ||
    p === 'eyelet stitching' ||
    p === 'ripple stitching' ||
    (p.includes('stitching') && (p.includes('american') || p.includes('valence') || p.includes('velance') || p.includes('valance') || p.includes('eyelet') || p.includes('eylet') || p.includes('ripple')))
  ) {
    return 'panels'
  }
  if (p === 'wallpaper rolls' || p.includes('wallpaper roll') || p.includes('rolls')) {
    return 'rolls'
  }
  if (p === 'rod' || p === 'track' || p === 'tracks') {
    return 'ft'
  }
  if (p === 'carpet' || p === 'matting' || p === 'pvc matting' || p.includes('blind') || p.includes('roman') || p.includes('roller') || p.includes('zebra') || p.includes('venetian') || p.includes('wallpaper')) {
    return 'sq ft'
  }
  if (p === 'shower curtain') {
    return 'pcs'
  }
  if (p.includes('fabric') || (p.includes('curtain') && p !== 'shower curtain') || p.includes('sheer') || p.includes('lining') || p.includes('eyelet') || p.includes('eylet') || p.includes('ripple') || p.includes('american') || p.includes('valance') || p.includes('valence')) {
    return 'm'
  }
  if (p.includes('stitching') || p.includes('hook') || p.includes('clamp') || p.includes('runner') || p.includes('end cap') || p.includes('support') || p.includes('pillow') || p.includes('mattress') || p.includes('bed set') || p.includes('bedsheet') || p.includes('bed sheet') || p.includes('bed back making') || p.includes('soft board making') || p.includes('seating making') || p === 'mat') {
    return 'pcs'
  }
  return 'units'
}

function isCurtainProduct(name) {
  if (!name) return false
  const n = String(name).toLowerCase().trim()
  if (n === 'shower curtain') return false
  if (n.includes('stitching')) return false
  return n.includes('curtain') || n.includes('sheer') || n.includes('lining') ||
    n.includes('eyelet') || n.includes('eylet') || n.includes('ripple') ||
    n.includes('american') || n.includes('valence') || n.includes('valance')
}

// Materials that take optional measurement input, manual quantity input and MRP per unit price input:
const MANUAL_QUANTITY_MATERIALS = new Set([
  'bed back fabric',
  'bed border fabric',
  'bed back making',
  'soft board fabric',
  'soft board making',
  'seating fabric',
  'seating making',
  'pillow fabric',
  'pillow',
  'mattress',
  'wallpaper rolls',
  'wallpaper roll',
  'wallpaper pasting',
  'customised wallpaper',
  'customised wallpaper pasting',
  'carpet',
  'bed set',
  'bed sheet',
  'bedsheet',
  'bedsheets',
  'runner fabric',
  'matting',
  'mat',
  'pvc matting',
  'rod',
  'support',
  'end caps',
  'end cap',
  'shower curtain'
])

function isManualQuantityMaterial(productName) {
  if (!productName) return false
  const clean = String(productName).trim().toLowerCase()
  return MANUAL_QUANTITY_MATERIALS.has(clean)
}

function isHardwareProduct(productName) {
  if (!productName) return false
  const p = String(productName).toLowerCase().trim()
  if (p.includes('fabric') || p.includes('stitching')) return false
  return p === 'tracks' || p === 'track' ||
    p.includes('runner') ||
    p.includes('hook') ||
    p.includes('clamp') ||
    CLAMP_OPTIONS.some((c) => c.toLowerCase() === p)
}

function isSquareFootBlind(productName) {
  if (!productName) return false
  const p = String(productName).toLowerCase().trim()
  return p.includes('roller blind') ||
    p.includes('zebra blind') ||
    p.includes('wooden venetian blind') ||
    (p.includes('monsoon') && p.includes('blind'))
}

function getAreaMeasurementSets(area, staffDrafts = []) {
  if (!area) return []
  if (Array.isArray(area.measurementSets) && area.measurementSets.length > 0) {
    return area.measurementSets
  }
  const sets = []
  const seenDims = new Set()
  if (Number(area.width) > 0 || Number(area.height) > 0) {
    const unit = area.unit || 'in'
    const wVal = fromInches(area.width, unit)
    const hVal = fromInches(area.height, unit)
    const key = `${wVal}x${hVal}_${unit}`
    seenDims.add(key)
    sets.push({
      id: 'default-set',
      label: 'Measurement 1',
      width: unit === 'in' ? Math.round(wVal) : Number(wVal.toFixed(2)),
      height: unit === 'in' ? Math.round(hVal) : Number(hVal.toFixed(2)),
      unit
    })
  }

  // If there are staff drafts for this area, incorporate any distinct measurements not already in sets
  if (Array.isArray(staffDrafts) && staffDrafts.length > 0) {
    const areaDrafts = staffDrafts.filter(d => (d.area || '').trim().toLowerCase() === (area.name || '').trim().toLowerCase() && Number(d.width) > 0 && Number(d.height) > 0)
    for (let idx = 0; idx < areaDrafts.length; idx++) {
      const d = areaDrafts[idx]
      const key = `${d.width}x${d.height}_${d.unit || 'in'}`
      if (!seenDims.has(key)) {
        seenDims.add(key)
        sets.push({
          id: `staff-mset-${idx + 1}`,
          label: d.notes ? `${d.notes.split('·')[0].trim()}` : `Field Measurement ${sets.length + 1}`,
          width: d.width,
          height: d.height,
          unit: d.unit || 'in'
        })
      }
    }
  }

  // Also discover any distinct measurements in area products
  if (Array.isArray(area.products) && area.products.length > 0) {
    for (const p of area.products) {
      if (Array.isArray(p.measurements) && p.measurements.length > 0) {
        for (const m of p.measurements) {
          if (Number(m.width) > 0 && Number(m.height) > 0) {
            const key = `${m.width}x${m.height}_${m.unit || 'in'}`
            if (!seenDims.has(key)) {
              seenDims.add(key)
              sets.push({
                id: m.id || `prod-mset-${sets.length + 1}`,
                label: m.label || p.variantLabel || `Measurement ${sets.length + 1}`,
                width: m.width,
                height: m.height,
                unit: m.unit || area.unit || 'in'
              })
            }
          }
        }
      } else if (Number(p.width) > 0 && Number(p.height) > 0) {
        const u = p.unit || area.unit || 'in'
        const wVal = fromInches(p.width, u)
        const hVal = fromInches(p.height, u)
        const key = `${wVal}x${hVal}_${u}`
        if (!seenDims.has(key)) {
          seenDims.add(key)
          sets.push({
            id: `prod-dim-${sets.length + 1}`,
            label: p.variantLabel || `${p.product} Measurement`,
            width: u === 'in' ? Math.round(wVal) : Number(wVal.toFixed(2)),
            height: u === 'in' ? Math.round(hVal) : Number(hVal.toFixed(2)),
            unit: u
          })
        }
      }
    }
  }

  return sets
}

function calculateMeasurementSetsCoverage(setsOrArea = [], defaultUnit = 'in', staffDrafts = []) {
  let sets = []
  let unit = defaultUnit
  if (Array.isArray(setsOrArea)) {
    sets = setsOrArea
  } else if (setsOrArea && typeof setsOrArea === 'object') {
    sets = getAreaMeasurementSets(setsOrArea, staffDrafts)
    unit = setsOrArea.unit || defaultUnit
  }
  let totalSqFt = 0
  let validSets = 0
  for (const s of sets) {
    const w = Number(s.width) || 0
    const h = Number(s.height) || 0
    const u = s.unit || unit || 'in'
    if (w > 0 && h > 0) {
      const sqft = (toInches(w, u) / 12) * (toInches(h, u) / 12)
      totalSqFt += sqft
      validSets++
    }
  }
  return { totalSqFt: Number(totalSqFt.toFixed(2)), validSets }
}

function formatItemMeasurementSummary(item) {
  if (!item) return ''
  if (item.measurementSummary) return item.measurementSummary
  if (Array.isArray(item.measurements) && item.measurements.length > 0) {
    const valid = item.measurements.filter((m) => Number(m.width) > 0 && Number(m.height) > 0)
    if (valid.length === 1) {
      const m = valid[0]
      const sqft = ((toInches(m.width, m.unit || 'in') / 12) * (toInches(m.height, m.unit || 'in') / 12)).toFixed(2)
      return `${m.label ? m.label + ': ' : ''}${m.width} × ${m.height} ${m.unit || 'in'} (${Number(sqft)} sq ft)`
    }
    if (valid.length > 1) {
      const totalSqFt = valid.reduce((sum, m) => sum + ((toInches(m.width, m.unit || 'in') / 12) * (toInches(m.height, m.unit || 'in') / 12)), 0)
      return `${valid.length} sets: ` + valid.map((m) => `${m.label || 'Set'}: ${m.width}×${m.height} ${m.unit || 'in'}`).join(', ') + ` (Total ${totalSqFt.toFixed(2)} sq ft)`
    }
  }
  if (Number(item.width) > 0 && Number(item.height) > 0) {
    const u = item.unit || 'in'
    const w = u === 'in' ? Math.round(fromInches(item.width, u)) : Number(fromInches(item.width, u).toFixed(2))
    const h = u === 'in' ? Math.round(fromInches(item.height, u)) : Number(fromInches(item.height, u).toFixed(2))
    const sqft = ((toInches(w, u) / 12) * (toInches(h, u) / 12)).toFixed(2)
    const label = item.variantLabel ? `${item.variantLabel}: ` : ''
    return `${label}${w} × ${h} ${u} (${Number(sqft)} sq ft)`
  }
  return ''
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
  const isHardware = isHardwareProduct(lower)
  if (isStitching) {
    if (lower.includes('american')) {
      formula = 'stitching-american'
      gst = 18
    } else if (lower.includes('valence') || lower.includes('velance') || lower.includes('valance')) {
      formula = 'stitching-valance'
      gst = 18
    } else if (lower.includes('eyelet') || lower.includes('eylet')) {
      formula = 'stitching-eyelet'
      gst = 18
    } else if (lower.includes('ripple')) {
      formula = 'stitching-ripple'
      gst = 18
    }
  } else if (isHardware) {
    if (lower === 'tracks' || lower === 'track') {
      formula = 'tracks'
      gst = 18
    } else if (lower.includes('runner')) {
      formula = 'runners'
      gst = 18
    } else if (lower.includes('hook')) {
      formula = 'hooks'
      gst = 18
    } else if (lower.includes('ceiling clamp')) {
      formula = 'ceiling-clamp'
      gst = 18
    } else if (lower.includes('single wall clamp')) {
      formula = 'single-clamp'
      gst = 18
    } else if (lower.includes('double wall clamp') || lower.includes('double clamp')) {
      formula = 'double-clamp'
      gst = 18
    } else if (lower.includes('clamp')) {
      formula = 'clamp'
      gst = 18
    }
  } else if (isSquareFootBlind(lower)) {
    formula = 'blind-sqft'
    gst = 18
  } else {
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

  if (isManualQuantityMaterial(product?.name || product)) {
    const manualQty = (details.manualQuantity !== undefined && details.manualQuantity !== '')
      ? Number(details.manualQuantity)
      : (details.quantity !== undefined ? Number(details.quantity) : 0)
    return {
      quantity: manualQty,
      note: details.note || '',
      unitPrice: Number(details.price) || 0
    }
  }

  const pName = String(product?.name || product || '').toLowerCase()
  const isStitching = pName.includes('stitching')
  const isHardware = isHardwareProduct(pName)
  const isBlind = isSquareFootBlind(pName)
  const isStitchingOrHardware = isStitching || isHardware

  // 1. Hardware Products: Tracks, Runners, Hooks, Clamps
  if (isHardware || ['tracks', 'runners', 'hooks', 'ceiling-clamp', 'single-clamp', 'double-clamp', 'clamp'].includes(product?.formula)) {
    if (w <= 0) {
      return { quantity: 0, note: 'Width needed', unitPrice: Number(details.price) || 0 }
    }
    const trackFeet = Math.ceil(w / 12)
    if (product?.formula === 'tracks' || pName === 'tracks' || pName === 'track') {
      return {
        quantity: trackFeet,
        note: `⌈${w}"/12⌉ = ${trackFeet} ft running length`,
        unitPrice: Number(details.price) || 0
      }
    }
    if (product?.formula === 'runners' || (pName.includes('runner') && !pName.includes('fabric'))) {
      const qty = trackFeet * 3
      return {
        quantity: qty,
        note: `${trackFeet} ft track × 3 = ${qty} pcs`,
        unitPrice: Number(details.price) || 0
      }
    }
    if (product?.formula === 'hooks' || pName.includes('hook')) {
      const qty = trackFeet * 3
      return {
        quantity: qty,
        note: `${trackFeet} ft track × 3 = ${qty} pcs`,
        unitPrice: Number(details.price) || 0
      }
    }
    if (product?.formula === 'ceiling-clamp' || pName.includes('ceiling clamp')) {
      const qty = Math.ceil(trackFeet / 2)
      return {
        quantity: qty,
        note: `⌈${trackFeet} ft track / 2⌉ = ${qty} pcs`,
        unitPrice: Number(details.price) || 0
      }
    }
    if (product?.formula === 'single-clamp' || pName.includes('single wall clamp')) {
      const qty = Math.ceil(trackFeet / 2)
      return {
        quantity: qty,
        note: `⌈${trackFeet} ft track / 2⌉ = ${qty} pcs`,
        unitPrice: Number(details.price) || 0
      }
    }
    if (product?.formula === 'double-clamp' || pName.includes('double wall clamp') || pName.includes('double clamp')) {
      const qty = Math.ceil(trackFeet / 2)
      return {
        quantity: qty,
        note: `⌈${trackFeet} ft track / 2⌉ = ${qty} pcs`,
        unitPrice: Number(details.price) || 0
      }
    }
    if (pName.includes('clamp')) {
      const qty = Math.ceil(trackFeet / 2)
      return {
        quantity: qty,
        note: `⌈${trackFeet} ft track / 2⌉ = ${qty} pcs`,
        unitPrice: Number(details.price) || 0
      }
    }
  }

  // 2. Stitching Products: quantity is number of panels
  // American Stitching: (Width / 18) inches = A rounded up to next integer
  if (product?.formula === 'stitching-american' || (isStitching && pName.includes('american'))) {
    if (w <= 0) {
      return { quantity: 0, note: 'Dimensions needed', unitPrice: Number(details.price) || 0 }
    }
    const panels = Math.ceil(w / 18)
    return {
      quantity: panels,
      note: `⌈${w}"/18⌉ = ${panels} panels`,
      unitPrice: Number(details.price) || 0
    }
  }

  // Valence Stitching: ((Width + 14) / 50) inches = A rounded up to next integer
  if (product?.formula === 'stitching-valance' || (isStitching && (pName.includes('valence') || pName.includes('velance') || pName.includes('valance')))) {
    if (w <= 0) {
      return { quantity: 0, note: 'Dimensions needed', unitPrice: Number(details.price) || 0 }
    }
    const panels = Math.ceil((w + 14) / 50)
    return {
      quantity: panels,
      note: `⌈(${w}"+14)/50⌉ = ${panels} panels`,
      unitPrice: Number(details.price) || 0
    }
  }

  // Eyelet Stitching: (Width / 20) inches = A rounded up to next integer
  if (product?.formula === 'stitching-eyelet' || (isStitching && (pName.includes('eyelet') || pName.includes('eylet')))) {
    if (w <= 0) {
      return { quantity: 0, note: 'Dimensions needed', unitPrice: Number(details.price) || 0 }
    }
    const panels = Math.ceil(w / 20)
    return {
      quantity: panels,
      note: `⌈${w}"/20⌉ = ${panels} panels`,
      unitPrice: Number(details.price) || 0
    }
  }

  // Ripple Stitching: (Width / 20) inches = A rounded up to next integer
  if (product?.formula === 'stitching-ripple' || (isStitching && pName.includes('ripple'))) {
    if (w <= 0) {
      return { quantity: 0, note: 'Dimensions needed', unitPrice: Number(details.price) || 0 }
    }
    const panels = Math.ceil(w / 20)
    return {
      quantity: panels,
      note: `⌈${w}"/20⌉ = ${panels} panels`,
      unitPrice: Number(details.price) || 0
    }
  }

  const effectiveFormula = (!isStitchingOrHardware && (pName.includes('eyelet') || pName.includes('eylet'))) ? 'eyelet'
    : (!isStitchingOrHardware && pName.includes('ripple')) ? 'ripple'
    : (!isStitchingOrHardware && pName.includes('american')) ? 'american'
    : (!isStitchingOrHardware && (pName.includes('valence') || pName.includes('valance'))) ? 'valance'
    : (!isStitchingOrHardware && pName.includes('roman')) ? 'roman'
    : (product?.formula && product.formula !== 'standard' ? product.formula : 'standard')

  if (product.formula === 'american' || effectiveFormula === 'american') {
    if (w <= 0 || h <= 0) {
      return { quantity: 0, note: 'Dimensions needed', unitPrice: Number(details.price) || 0 }
    }
    const A = Math.ceil(w / 18)
    const B = (h + 15) / 39
    const qty = Number((A * B).toFixed(2))
    return { quantity: qty, note: `⌈${w}"/18⌉ × (${h}"+15)/39 = ${A} panels × ${Number(B.toFixed(2))} drops = ${qty.toFixed(2)} m`, unitPrice: Number(details.price) || 0 }
  }

  // Eyelet & Ripple curtains formula:
  // (Width / 20) inches = A rounded to next figure
  // ((Height + 15) / 39) inches = B
  // Total Quantity = B × A (rounded to 2 decimal places)
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

  // Valence formula:
  // ((Width + 14) / 50) inches = A rounded to next figure
  // ((A × 15) / 39) inches = B rounded to next figure
  // B is the quantity in metres
  if (product.formula === 'valance' || effectiveFormula === 'valance') {
    if (w <= 0) {
      return { quantity: 0, note: 'Dimensions needed', unitPrice: Number(details.price) || 0 }
    }
    const A = Math.ceil((w + 14) / 50)
    const B = Math.ceil((A * 15) / 39)
    const qty = Number(B.toFixed(2))
    return { quantity: qty, note: `⌈(${w}"+14)/50⌉ = ${A} · ⌈(${A}×15)/39⌉ = ${qty} m`, unitPrice: Number(details.price) || 0 }
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

  // 3. Blinds: Roller blinds, Zebra blinds, Wooden Venetian blinds, Monsoon blinds
  // (Width / 12) = A round to feet as a whole number
  // (Height / 12) = B round to feet as whole number
  // Quantity = A x B sqft calculation with minimum chargeable area option (11 or 16.5 sqft)
  if (product?.formula === 'blind-sqft' || isBlind) {
    if (w <= 0 || h <= 0) {
      return { quantity: 0, note: 'Dimensions needed', unitPrice: Number(details.price) || 0 }
    }
    const A = Math.max(1, Math.round(w / 12))
    const B = Math.max(1, Math.round(h / 12))
    const rawArea = A * B
    const minChargeable = (details.minimumArea !== undefined && details.minimumArea !== null && details.minimumArea !== '')
      ? Number(details.minimumArea)
      : (product?.minimumArea !== undefined && product?.minimumArea !== null && product?.minimumArea !== '' ? Number(product.minimumArea) : 11)
    const billableArea = Math.max(rawArea, minChargeable)
    return {
      quantity: billableArea,
      note: `${A} ft (${w}") × ${B} ft (${h}") = ${rawArea} sq ft${billableArea > rawArea ? ` (Min. ${billableArea} sq ft chargeable)` : ''}`,
      unitPrice: Number(details.price) || 0
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
  const measureSummary = formatItemMeasurementSummary({ width: widthInInches, height: heightInInches, unit })
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
    width: widthInInches,
    height: heightInInches,
    unit,
    measurementSummary: measureSummary
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

let saveProjectsTimer = null
function saveCachedProjects(projects, immediate = false) {
  const doSave = () => {
    try {
      const normalized = (projects || []).map(filterDeletedDraftsFromProject)
      localStorage.setItem(PROJECTS_CACHE_KEY, JSON.stringify(normalized))
    } catch {}
  }
  if (immediate) {
    if (saveProjectsTimer) clearTimeout(saveProjectsTimer)
    doSave()
  } else {
    if (saveProjectsTimer) clearTimeout(saveProjectsTimer)
    saveProjectsTimer = setTimeout(doSave, 300)
  }
}

const DELETED_STAFF_KEY = 'krishna-decor-deleted-staff-ids'

function getDeletedStaffIds() {
  try {
    const data = JSON.parse(localStorage.getItem(DELETED_STAFF_KEY) || '[]')
    if (Array.isArray(data)) {
      return new Set(data.map((item) => String(item).toLowerCase().trim()).filter(Boolean))
    }
  } catch {}
  return new Set()
}

function addDeletedStaffId(id, name) {
  try {
    const set = getDeletedStaffIds()
    if (id) set.add(String(id).toLowerCase().trim())
    if (name) set.add(String(name).toLowerCase().trim())
    localStorage.setItem(DELETED_STAFF_KEY, JSON.stringify([...set]))
  } catch {}
}

function unmarkDeletedStaff(name, id) {
  try {
    const set = getDeletedStaffIds()
    if (id) set.delete(String(id).toLowerCase().trim())
    if (name) set.delete(String(name).toLowerCase().trim())
    localStorage.setItem(DELETED_STAFF_KEY, JSON.stringify([...set]))
  } catch {}
}

function filterDeletedStaff(staffList = []) {
  if (!Array.isArray(staffList)) return []
  const deleted = getDeletedStaffIds()
  return staffList.filter((s) => {
    if (!s) return false
    const sid = String(s.id || '').toLowerCase().trim()
    const sname = String(s.name || '').toLowerCase().trim()
    return (!sid || !deleted.has(sid)) && (!sname || !deleted.has(sname))
  })
}

function getCachedStaff() {
  try {
    const data = JSON.parse(localStorage.getItem(STAFF_CACHE_KEY) || '[]')
    return Array.isArray(data) ? filterDeletedStaff(data) : []
  } catch { return [] }
}

function saveCachedStaff(staff) {
  try {
    const clean = filterDeletedStaff(staff || [])
    localStorage.setItem(STAFF_CACHE_KEY, JSON.stringify(clean))
  } catch {}
}

const CLOUD_QUEUE_KEY = 'krishna-decor-cloud-queue'
function getCloudQueue() {
  try {
    const data = JSON.parse(localStorage.getItem(CLOUD_QUEUE_KEY) || '[]')
    return Array.isArray(data) ? data : []
  } catch { return [] }
}

let saveCloudQueueTimer = null
function saveCloudQueue(queue, immediate = false) {
  const doSave = () => {
    try {
      localStorage.setItem(CLOUD_QUEUE_KEY, JSON.stringify(queue))
    } catch {}
  }
  if (immediate) {
    if (saveCloudQueueTimer) clearTimeout(saveCloudQueueTimer)
    doSave()
  } else {
    if (saveCloudQueueTimer) clearTimeout(saveCloudQueueTimer)
    saveCloudQueueTimer = setTimeout(doSave, 300)
  }
}

function getManagerQueue() {
  try {
    const data = JSON.parse(localStorage.getItem(MANAGER_QUEUE_KEY) || '[]')
    return Array.isArray(data) ? data : []
  } catch { return [] }
}

let saveQueueTimer = null
function saveManagerQueue(queue, immediate = false) {
  const doSave = () => {
    try {
      localStorage.setItem(MANAGER_QUEUE_KEY, JSON.stringify(queue))
    } catch {}
  }
  if (immediate) {
    if (saveQueueTimer) clearTimeout(saveQueueTimer)
    doSave()
  } else {
    if (saveQueueTimer) clearTimeout(saveQueueTimer)
    saveQueueTimer = setTimeout(doSave, 300)
  }
}

function enqueueMutation(mutation) {
  const mut = {
    id: globalThis.crypto?.randomUUID?.() || 'mut-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    timestamp: new Date().toISOString(),
    ...mutation
  }
  const queue = getManagerQueue()
  queue.push(mut)
  saveManagerQueue(queue)

  if (isDesktopApp()) {
    const cloudQ = getCloudQueue()
    cloudQ.push(mut)
    saveCloudQueue(cloudQ)
  }
  return queue
}

function isNetworkError(error) {
  return !error?.status && (error instanceof TypeError || /network|fetch|internet|failed|load|abort|offline/i.test(String(error?.message || '')))
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

function getTotals(items, quoteOrDiscount = null) {
  if (!Array.isArray(items)) return { untaxed: 0, regularUntaxed: 0, discount: 0, rawDiscount: 0, tax5: 0, tax18: 0, tax: 0, total: 0 }
  const regularItems = items.filter((item) => !isDiscountLine(item))
  const regularUntaxed = regularItems
    .filter((item) => !isInstallationServiceLine(item) && !isDeliveryServiceLine(item))
    .reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0), 0)

  const untaxed = regularItems.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0), 0)
  const tax5 = regularItems.filter((item) => Number(item.gst) === 5).reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0) * 0.05, 0)
  const tax18 = regularItems.filter((item) => Number(item.gst) === 18).reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0) * 0.18, 0)
  const tax = tax5 + tax18

  const discountLine = items.find((item) => isDiscountLine(item))
  const rawDiscount = discountLine
    ? (Number(discountLine.unitPrice) || 0)
    : (typeof quoteOrDiscount === 'number' ? quoteOrDiscount : (Number(quoteOrDiscount?.discount) || 0))
  const discount = Math.min(Math.max(0, rawDiscount), regularUntaxed)

  const total = Math.max(0, (untaxed + tax) - discount)

  return { untaxed, regularUntaxed, discount, rawDiscount, tax5, tax18, tax, total }
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
  const [cloudSyncState, setCloudSyncState] = useState('synced')
  const [cloudPendingCount, setCloudPendingCount] = useState(() => getCloudQueue().length)
  const [backupConfig, setBackupConfig] = useState({ configured: true, path: '' })
  const syncingRef = useRef(false)
  const syncTimeoutRef = useRef(null)
  const backupTimeoutRef = useRef(null)
  const cloudSyncingRef = useRef(false)
  const cloudSyncTimeoutRef = useRef(null)

  const debouncedSync = (delay = 1000) => {
    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current)
    syncTimeoutRef.current = setTimeout(() => {
      syncAll()
    }, delay)
  }

  const debouncedCloudSync = (delay = 4000) => {
    if (!isDesktopApp()) return
    if (cloudSyncTimeoutRef.current) clearTimeout(cloudSyncTimeoutRef.current)
    cloudSyncTimeoutRef.current = setTimeout(() => {
      syncCloud()
    }, delay)
  }

  const getCloudAuthToken = async (cloudBase, forceFresh = false) => {
    if (!forceFresh) {
      const cached = localStorage.getItem('krishna-decor-cloud-token')
      if (cached) return cached
    }
    let creds = null
    try {
      const stored = localStorage.getItem('krishna-decor-cloud-creds')
      if (stored) creds = JSON.parse(stored)
    } catch {}
    if (!creds || !creds.password) {
      creds = { name: 'Dinesh', email: 'dinesh@krishnadecor.local', password: 'KDecor2026', role: 'manager' }
    }
    const authRes = await fetch(cloudBase + '/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(creds),
      signal: AbortSignal.timeout(35000)
    })
    if (!authRes.ok) throw new Error('Cloud authentication failed (status ' + authRes.status + ')')
    const authData = await authRes.json()
    if (!authData.token) throw new Error('No authentication token returned by cloud')
    localStorage.setItem('krishna-decor-cloud-token', authData.token)
    return authData.token
  }

  const mergeCloudData = (cloudData) => {
    if (!cloudData || !Array.isArray(cloudData.projects)) return
    const cloudProjects = cloudData.projects.map(filterDeletedDraftsFromProject)
    const cloudStaff = Array.isArray(cloudData.staff) ? filterDeletedStaff(cloudData.staff) : []

    setProjects((currentProjects) => {
      let hasChanges = false
      const updatedList = currentProjects.map((localProj) => {
        const cloudProj = cloudProjects.find((p) => p.id === localProj.id)
        if (!cloudProj) return localProj

        const localTime = new Date(localProj.updatedAt || localProj.createdAt || 0).getTime()
        const cloudTime = new Date(cloudProj.updatedAt || cloudProj.createdAt || 0).getTime()
        const cloudIsNewer = cloudTime > localTime

        // 1. Merge staffDrafts (union by ID)
        const localDraftMap = new Map((localProj.staffDrafts || []).map((d) => [String(d.id || d.rawId || ''), d]))
        let draftsChanged = false
        for (const cd of (cloudProj.staffDrafts || [])) {
          const cid = String(cd.id || cd.rawId || '')
          if (cid && !localDraftMap.has(cid)) {
            localDraftMap.set(cid, cd)
            draftsChanged = true
          }
        }
        const mergedDrafts = [...localDraftMap.values()]

        // 2. Merge activityLog (union by ID)
        const localActMap = new Map((localProj.activityLog || []).map((a) => [String(a.id || ''), a]))
        let actsChanged = false
        for (const ca of (cloudProj.activityLog || [])) {
          const cid = String(ca.id || '')
          if (cid && !localActMap.has(cid)) {
            localActMap.set(cid, ca)
            actsChanged = true
          }
        }
        const mergedActs = [...localActMap.values()].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

        // 3. Merge quotations (union by ID, keeping newer version if updated)
        const localQuoteMap = new Map((localProj.quotations || []).map((q) => [String(q.id || ''), q]))
        let quotesChanged = false
        for (const cq of (cloudProj.quotations || [])) {
          const qid = String(cq.id || '')
          if (!qid) continue
          const existing = localQuoteMap.get(qid)
          if (!existing) {
            localQuoteMap.set(qid, cq)
            quotesChanged = true
          } else if (cloudIsNewer) {
            localQuoteMap.set(qid, cq)
            quotesChanged = true
          }
        }
        const mergedQuotations = [...localQuoteMap.values()]

        // 4. Merge payments (union by ID)
        const localPayMap = new Map((localProj.payments || []).map((p) => [String(p.id || ''), p]))
        let paymentsChanged = false
        for (const cp of (cloudProj.payments || [])) {
          const pid = String(cp.id || '')
          if (!pid) continue
          if (!localPayMap.has(pid)) {
            localPayMap.set(pid, cp)
            paymentsChanged = true
          } else if (cloudIsNewer) {
            localPayMap.set(pid, cp)
            paymentsChanged = true
          }
        }
        const mergedPayments = [...localPayMap.values()]

        // 5. Merge areas (union of area objects or names)
        const localAreaNames = new Set((localProj.areas || []).map((a) => typeof a === 'string' ? a : a.name))
        let areasChanged = false
        const mergedAreas = [...(localProj.areas || [])]
        for (const ca of (cloudProj.areas || [])) {
          const caname = typeof ca === 'string' ? ca : ca.name
          if (caname && !localAreaNames.has(caname)) {
            localAreaNames.add(caname)
            mergedAreas.push(ca)
            areasChanged = true
          }
        }

        // Apply changes
        if (cloudIsNewer) {
          hasChanges = true
          return {
            ...cloudProj,
            staffDrafts: mergedDrafts,
            activityLog: mergedActs,
            quotations: mergedQuotations,
            payments: mergedPayments,
            areas: mergedAreas,
            updatedAt: cloudProj.updatedAt || new Date().toISOString()
          }
        } else if (draftsChanged || actsChanged || quotesChanged || paymentsChanged || areasChanged) {
          hasChanges = true
          return {
            ...localProj,
            staffDrafts: mergedDrafts,
            activityLog: mergedActs,
            quotations: mergedQuotations,
            payments: mergedPayments,
            areas: mergedAreas,
            updatedAt: new Date().toISOString()
          }
        }
        return localProj
      })

      // Add any projects that exist on cloud but not locally
      const localIds = new Set(currentProjects.map((p) => p.id))
      const brandNewProjects = cloudProjects.filter((p) => !localIds.has(p.id))
      if (brandNewProjects.length > 0) {
        hasChanges = true
        updatedList.unshift(...brandNewProjects)
      }

      if (hasChanges) {
        saveCachedProjects(updatedList)
        mirrorToDesktopBackup(updatedList, staff)
        return updatedList
      }
      return currentProjects
    })

    if (Array.isArray(cloudData.staff)) {
      setStaff((currentStaff) => {
        const cloudQ = getCloudQueue()
        const pendingCreated = cloudQ.filter((m) => m.type === 'create_staff' && m.staff).map((m) => m.staff)
        const pendingDeletedIds = new Set(cloudQ.filter((m) => m.type === 'delete_staff' && m.staffId).map((m) => String(m.staffId).toLowerCase().trim()))
        const deletedIds = getDeletedStaffIds()

        const activeCloudStaff = filterDeletedStaff(cloudStaff).filter((s) => (
          !pendingDeletedIds.has(String(s.id).toLowerCase().trim()) &&
          !deletedIds.has(String(s.id).toLowerCase().trim()) &&
          !deletedIds.has(String(s.name).toLowerCase().trim())
        ))
        const activeIds = new Set(activeCloudStaff.map((s) => s.id))
        const unconfirmedCreated = filterDeletedStaff(pendingCreated).filter((s) => !activeIds.has(s.id))

        const mergedStaff = filterDeletedStaff([...activeCloudStaff, ...unconfirmedCreated])
        const currentIds = currentStaff.map((s) => s.id).sort().join(',')
        const mergedIds = mergedStaff.map((s) => s.id).sort().join(',')

        if (currentIds !== mergedIds) {
          saveCachedStaff(mergedStaff)
          mirrorToDesktopBackup(projects, mergedStaff)
          return mergedStaff
        }
        return currentStaff
      })
    }
  }

  const syncCloud = async (userInitiated = false) => {
    if (!isDesktopApp() || cloudSyncingRef.current) return
    cloudSyncingRef.current = true
    setCloudSyncState('syncing')
    try {
      const cloudBase = cloudApiBase()
      if (!cloudBase) {
        setCloudSyncState('synced')
        return
      }

      // Obtain or refresh auth token
      let cloudToken = await getCloudAuthToken(cloudBase, false).catch(() => null)
      if (!cloudToken) {
        cloudToken = await getCloudAuthToken(cloudBase, true).catch(() => null)
      }
      if (!cloudToken) {
        throw new Error('Could not authenticate with 24/7 cloud server.')
      }

      // Build mutation list:
      // 1. Pending mutations from local queue
      const queue = getCloudQueue()
      const sentIds = new Set(queue.map((m) => m.id))
      const mutations = [...queue]

      // 2. Ensure tombstoned staff are deleted on cloud
      const deletedStaffIds = getDeletedStaffIds()
      for (const delId of deletedStaffIds) {
        if (!mutations.some((m) => m.type === 'delete_staff' && (m.staffId === delId || m.staffName === delId))) {
          mutations.push({
            id: 'tombstone-' + delId,
            type: 'delete_staff',
            staffId: delId,
            staffName: delId
          })
        }
      }

      // 3. When user clicks sync or queue is empty, ensure all local projects exist on cloud
      if (userInitiated || queue.length === 0) {
        const cachedProjects = getCachedProjects()
        for (const proj of cachedProjects) {
          if (!mutations.some((m) => (m.type === 'create_project' || m.type === 'update_project') && (m.projectId === proj.id || m.project?.id === proj.id))) {
            mutations.push({
              id: 'ensure-' + proj.id + '-' + Date.now().toString(36),
              type: 'create_project',
              project: proj
            })
          }
        }
      }

      let syncRes = await fetch(cloudBase + '/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + cloudToken
        },
        body: JSON.stringify({ mutations }),
        signal: AbortSignal.timeout(35000)
      })

      // If token expired (401), re-authenticate and retry ONCE
      if (syncRes.status === 401) {
        localStorage.removeItem('krishna-decor-cloud-token')
        cloudToken = await getCloudAuthToken(cloudBase, true)
        syncRes = await fetch(cloudBase + '/sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + cloudToken
          },
          body: JSON.stringify({ mutations }),
          signal: AbortSignal.timeout(35000)
        })
      }

      if (!syncRes.ok) {
        throw new Error('Cloud sync responded with status ' + syncRes.status)
      }

      const cloudData = await syncRes.json()

      // Clear confirmed mutations from queue
      const currentQueue = getCloudQueue()
      const remaining = currentQueue.filter((m) => !sentIds.has(m.id))
      saveCloudQueue(remaining, true)
      setCloudPendingCount(remaining.length)

      if (cloudData) {
        mergeCloudData(cloudData)
      }

      setCloudSyncState('synced')
      if (userInitiated) {
        setToast('Cloud synchronization complete. All projects up to date.')
      }
    } catch (err) {
      setCloudSyncState('offline')
      if (userInitiated) {
        setToast('Cloud unreachable — all data is saved locally on this computer.')
      }
    } finally {
      cloudSyncingRef.current = false
      setCloudPendingCount(getCloudQueue().length)
    }
  }

  const syncAll = async (userInitiated = false) => {
    if (!session || syncingRef.current) return
    syncingRef.current = true
    setSyncState('syncing')
    try {
      const queue = getManagerQueue()
      let syncedData = null

      if (queue.length > 0) {
        const sentIds = new Set(queue.map((m) => m.id))
        try {
          syncedData = await apiRequest('/sync', {
            method: 'POST',
            body: JSON.stringify({ mutations: queue })
          })
          const currentQueue = getManagerQueue()
          const remaining = currentQueue.filter((m) => !sentIds.has(m.id))
          saveManagerQueue(remaining)
          setPendingCount(remaining.length)
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
          const currentQueue = getManagerQueue()
          const unsentIds = new Set(remaining.map((m) => m.id))
          const mergedQueue = currentQueue.filter((m) => !sentIds.has(m.id) || unsentIds.has(m.id))
          saveManagerQueue(mergedQueue)
          setPendingCount(mergedQueue.length)
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

      setProjects((currentProjects) => {
        const pendingQueue = getManagerQueue()
        const pendingProjectIds = new Set(
          pendingQueue.map((m) => m.projectId || m.project?.id).filter(Boolean)
        )

        return nextProjects.map((serverProj) => {
          if (pendingProjectIds.has(serverProj.id)) {
            const localProj = currentProjects.find((p) => p.id === serverProj.id)
            if (localProj) {
              return localProj
            }
          }
          return serverProj
        })
      })
      saveCachedProjects(nextProjects)
      if (Array.isArray(nextStaff)) {
        const cleanStaff = filterDeletedStaff(nextStaff)
        setStaff(cleanStaff)
        saveCachedStaff(cleanStaff)
      }
      setSelectedProjectId((current) => nextProjects.some((item) => item.id === current) ? current : (nextProjects[0]?.id || ''))
      setSyncState('synced')
      if (userInitiated) {
        setToast('Synchronized with local storage.')
      }

      // Automatically mirror live data to Windows desktop local disk backup if running inside desktop hub
      if (typeof window !== 'undefined' && window.krishnaHub?.saveBackup) {
        window.krishnaHub.saveBackup({
          projects: nextProjects,
          staff: filterDeletedStaff(nextStaff)
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
      const interval = window.setInterval(() => syncAll(), 8000)
      const onOnline = () => {
        syncAll()
        if (isDesktopApp()) syncCloud()
      }
      const onFocusOrVisible = () => {
        syncAll()
        if (isDesktopApp()) syncCloud()
      }
      window.addEventListener('online', onOnline)
      window.addEventListener('focus', onFocusOrVisible)
      document.addEventListener('visibilitychange', onFocusOrVisible)
      return () => {
        window.clearInterval(interval)
        window.removeEventListener('online', onOnline)
        window.removeEventListener('focus', onFocusOrVisible)
        document.removeEventListener('visibilitychange', onFocusOrVisible)
      }
    }
  }, [session])

  useEffect(() => {
    if (session && isDesktopApp()) {
      syncCloud()
      const cloudInterval = window.setInterval(() => syncCloud(), 4000)
      return () => window.clearInterval(cloudInterval)
    }
  }, [session])

  useEffect(() => {
    if (session && isDesktopApp() && (page === 'team' || page === 'overview')) {
      syncCloud()
    }
  }, [session, page])

  useEffect(() => {
    if (typeof window !== 'undefined' && window.krishnaHub?.onTriggerSync) {
      const cleanup = window.krishnaHub.onTriggerSync(() => {
        syncAll(true)
        if (isDesktopApp()) syncCloud(true)
      })
      return cleanup
    }
  }, [session])

  useEffect(() => {
    if (typeof window !== 'undefined' && window.krishnaHub?.onCloudUrlChanged) {
      const cleanup = window.krishnaHub.onCloudUrlChanged((newUrl) => {
        if (newUrl) {
          localStorage.setItem('krishna-decor-cloud-api-url', newUrl)
          setToast('Cloud sync address updated to ' + newUrl)
          syncCloud(true)
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

  useEffect(() => {
    if (typeof window !== 'undefined' && window.krishnaHub?.getBackupDirectory) {
      window.krishnaHub.getBackupDirectory().then((res) => {
        if (res) {
          setBackupConfig({
            configured: Boolean(res.configured),
            path: res.backupDirectory || ''
          })
        }
      }).catch(() => {})
    }
    if (typeof window !== 'undefined' && window.krishnaHub?.onBackupDirChanged) {
      const cleanup = window.krishnaHub.onBackupDirChanged((data) => {
        setBackupConfig({
          configured: Boolean(data?.configured),
          path: data?.path || ''
        })
      })
      return cleanup
    }
  }, [])

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
      const deletedStaff = [...getDeletedStaffIds()]
      window.krishnaHub.saveBackup({
        projects: nextProjectsList || projects,
        staff: Array.isArray(nextStaffList) ? nextStaffList : staff,
        deletedStaff
      }).catch(() => {})
    }
  }

  const patchProject = (change, immediateSync = false) => {
    if (!project) return null
    const nextQuotations = change.quotations ? mergeDuplicateQuotations(change.quotations) : project.quotations
    const normalizedChange = change.quotations ? { ...change, quotations: nextQuotations } : change
    const updated = { ...project, ...normalizedChange, updatedAt: new Date().toISOString() }
    const nextList = projects.map((item) => item.id === project.id ? updated : item)
    setProjects(nextList)
    saveCachedProjects(nextList)

    if (backupTimeoutRef.current) clearTimeout(backupTimeoutRef.current)
    backupTimeoutRef.current = setTimeout(() => {
      mirrorToDesktopBackup(nextList, staff)
    }, 600)

    enqueueMutation({ type: 'update_project', projectId: project.id, change: normalizedChange })
    setPendingCount(getManagerQueue().length)

    if (immediateSync) {
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current)
      syncAll()
      debouncedCloudSync(1000)
    } else {
      debouncedSync(1000)
      debouncedCloudSync(4000)
    }

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
    debouncedCloudSync(1500)
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
    debouncedCloudSync(1500)
  }

  const createStaffMember = async (formValues) => {
    const id = uid('staff')
    const staffName = formValues.name.trim()
    unmarkDeletedStaff(staffName, id)
    const newStaff = { id, name: staffName, role: 'staff', createdAt: new Date().toISOString() }
    const nextStaffList = [...filterDeletedStaff(staff).filter((s) => s.id !== id && s.name.toLowerCase() !== staffName.toLowerCase()), newStaff]
    setStaff(nextStaffList)
    saveCachedStaff(nextStaffList)
    mirrorToDesktopBackup(projects, nextStaffList)
    enqueueMutation({
      type: 'create_staff',
      staff: { id, name: staffName, password: formValues.password }
    })
    setPendingCount(getManagerQueue().length)
    syncAll()
    if (isDesktopApp()) {
      syncCloud()
    } else {
      debouncedCloudSync(1000)
    }
  }

  const removeStaffMember = async (person) => {
    if (!person) return
    const personId = String(person.id || '').trim()
    const personName = String(person.name || '').trim()

    // 1. Immediately record in persistent tombstone set
    addDeletedStaffId(personId, personName)

    // 2. Filter local React state and save clean staff
    const nextStaffList = staff.filter((item) => {
      if (personId && item.id === personId) return false
      if (personName && String(item.name || '').trim().toLowerCase() === personName.toLowerCase()) return false
      return true
    })
    setStaff(nextStaffList)
    saveCachedStaff(nextStaffList)

    // 3. Mirror directly to desktop local disk backup & IPC
    mirrorToDesktopBackup(projects, nextStaffList)
    if (typeof window !== 'undefined' && window.krishnaHub?.deleteStaff) {
      window.krishnaHub.deleteStaff({ id: personId, name: personName }).catch(() => {})
    }

    // 4. Send direct DELETE requests to local server AND cloud server
    try {
      if (personId) {
        await apiRequest('/staff/' + encodeURIComponent(personId), { method: 'DELETE' }).catch(async () => {
          if (personName) {
            await apiRequest('/staff/' + encodeURIComponent(personName), { method: 'DELETE' }).catch(() => {})
          }
        })
      }
    } catch {}

    if (isDesktopApp()) {
      try {
        const cloudBase = cloudApiBase()
        const cloudToken = await getCloudAuthToken(cloudBase, false).catch(() => null)
        if (cloudBase && cloudToken) {
          const deleteEndpoint = personId ? '/staff/' + encodeURIComponent(personId) : '/staff/' + encodeURIComponent(personName)
          await fetch(cloudBase + deleteEndpoint, {
            method: 'DELETE',
            headers: { Authorization: 'Bearer ' + cloudToken },
            signal: AbortSignal.timeout(15000)
          }).catch(() => {})
        }
      } catch {}
    }

    // 5. Enqueue mutation with both staffId AND staffName for offline replay
    enqueueMutation({ type: 'delete_staff', staffId: personId, staffName: personName })
    setPendingCount(getManagerQueue().length)

    // 6. Clear assignedStaffId from any projects referencing this staff member
    setProjects((currentProjects) => {
      let changed = false
      const updated = currentProjects.map((p) => {
        if (p.assignedStaffId === personId || (personName && String(p.assignedStaffId || '').toLowerCase() === personName.toLowerCase())) {
          changed = true
          return { ...p, assignedStaffId: '', updatedAt: new Date().toISOString() }
        }
        return p
      })
      if (changed) {
        saveCachedProjects(updated)
      }
      return updated
    })

    syncAll()
    if (isDesktopApp()) {
      syncCloud(true)
    } else {
      debouncedCloudSync(1000)
    }
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
      {mobileMenu && <div className="sidebar-backdrop" onClick={() => setMobileMenu(false)} aria-hidden="true" />}
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
              className={'sync-indicator-btn ' + (isDesktopApp() ? (cloudSyncState === 'syncing' ? 'syncing' : (cloudSyncState === 'offline' && cloudPendingCount > 0 ? 'offline' : 'synced')) : syncState)}
              onClick={() => {
                syncAll(true)
                if (isDesktopApp()) syncCloud(true)
              }}
              title={isDesktopApp()
                ? (cloudSyncState === 'synced' ? 'Local Hub active & Cloud synchronized' : cloudSyncState === 'syncing' ? 'Syncing with cloud…' : `Saved locally (${cloudPendingCount} queued for cloud)`)
                : (syncState === 'synced' ? 'Online & synchronized (click to refresh)' : syncState === 'syncing' ? 'Synchronizing…' : 'Offline — click to retry sync')}
            >
              <span className={'sync-dot ' + (isDesktopApp() ? (cloudSyncState === 'offline' ? 'offline' : (cloudSyncState === 'syncing' ? 'syncing' : 'synced')) : syncState)} />
              <span>
                {isDesktopApp()
                  ? (cloudSyncState === 'syncing'
                    ? 'Syncing Cloud…'
                    : cloudSyncState === 'offline'
                    ? (cloudPendingCount > 0 ? `Local (${cloudPendingCount} pending cloud)` : 'Local (Cloud Offline)')
                    : 'Local & Cloud Synced')
                  : (syncState === 'synced'
                    ? 'Cloud Synced'
                    : syncState === 'syncing'
                    ? 'Syncing…'
                    : pendingCount > 0
                    ? `Offline (${pendingCount} pending)`
                    : 'Offline (Local)')}
              </span>
              <RefreshCw size={12} className={(syncState === 'syncing' || (isDesktopApp() && cloudSyncState === 'syncing')) ? 'spin-anim' : ''} />
            </button>
            <button className="search-button" onClick={() => { setNotificationsOpen(false); setSearchOpen(true) }}><Search size={17} /><span>Search</span><kbd>⌘ K</kbd></button>
            <div className="notification-wrap"><button className="icon-button notification" title="Notifications" aria-label="Notifications" aria-expanded={notificationsOpen} onClick={() => { setSearchOpen(false); setNotificationsOpen((open) => !open) }}><Bell size={19} />{notifications.length ? <i /> : null}</button>{notificationsOpen && <NotificationPanel notifications={notifications} onSelect={(notification) => { selectProject(notification.projectId); setPage(notification.page); setNotificationsOpen(false) }} />}</div>
            {typeof window !== 'undefined' && window.krishnaHub?.openBackupDirectory && (
              <button
                type="button"
                className="icon-button"
                title={backupConfig.configured ? `Open backup_krishna_decor (${backupConfig.path})` : 'Choose backup_krishna_decor location'}
                onClick={async () => {
                  if (backupConfig.configured) {
                    window.krishnaHub.openBackupDirectory().catch(() => {})
                  } else {
                    const res = await window.krishnaHub.selectBackupDirectory()
                    if (res && res.configured) {
                      setBackupConfig({ configured: true, path: res.backupDirectory })
                      setToast('Created backup_krishna_decor at: ' + res.backupDirectory)
                    }
                  }
                }}
              >
                <FolderOpen size={18} />
              </button>
            )}
            <span className="avatar top-avatar">{session.user.name.slice(0, 2).toUpperCase()}</span>
          </div>
        </header>

        {!backupConfig.configured && typeof window !== 'undefined' && window.krishnaHub && (
          <aside className="backup-setup-banner">
            <div className="backup-banner-message">
              <HardDrive size={18} className="backup-banner-icon" />
              <div>
                <strong>Local Backup Setup:</strong> Choose a folder on your system where the main <code>backup_krishna_decor</code> folder will be created. Every project will have its own folder with <code>drafts</code> and <code>invoice</code> saved locally.
              </div>
            </div>
            <button
              type="button"
              className="button primary compact"
              onClick={async () => {
                try {
                  const res = await window.krishnaHub.selectBackupDirectory()
                  if (res && res.configured) {
                    setBackupConfig({ configured: true, path: res.backupDirectory })
                    setToast('Folder backup_krishna_decor created at: ' + res.backupDirectory)
                  }
                } catch {
                  setToast('Could not set backup location.')
                }
              }}
            >
              Choose Location Now
            </button>
          </aside>
        )}
        <section className="page-head">
          <div><p className="eyebrow">{project?.status || 'OWNER WORKSPACE'}</p><h1>{titles[page][0]}</h1><p className="subhead">{titles[page][1]}</p></div>
          <div className="page-actions">{page === 'quotations' && project ? <button className="button primary" onClick={() => makeQuotation(project, patchProject, setToast)}><Plus size={16} />New quotation</button> : null}</div>
        </section>

        {page === 'team' ? <Team projects={projects} staff={staff} onCreateStaff={createStaffMember} onRemoveStaff={removeStaffMember} onRefresh={() => { syncAll(true); if (isDesktopApp()) syncCloud(true); }} toast={setToast} /> : project ? <>
          {page === 'overview' && <Overview project={project} onPage={setPage} onRefresh={() => { syncAll(true); if (isDesktopApp()) syncCloud(true); }} onDeleteProject={deleteProject} patchProject={patchProject} toast={setToast} />}
          {page === 'customer' && <Customer project={project} patchProject={patchProject} toast={setToast} />}
          {page === 'areas' && <Areas project={project} areaId={areaId} setAreaId={setAreaId} updateArea={updateArea} patchProject={patchProject} toast={setToast} />}
          {page === 'quotations' && <Quotations project={project} patchProject={patchProject} toast={setToast} />}
          {page === 'invoice' && <Invoice project={project} toast={setToast} />}
          {page === 'payments' && <Payments project={project} patchProject={patchProject} toast={setToast} />}
        </> : <EmptyWorkspace onCreate={() => setShowCreate(true)} />}
      </main>

      {/* 9:16 Smartphone Bottom Quick-Navigation Bar */}
      <nav className="mobile-bottom-nav" aria-label="Mobile Navigation">
        <button
          type="button"
          className={'mobile-nav-btn' + (page === 'overview' ? ' active' : '')}
          onClick={() => { setPage('overview'); setMobileMenu(false) }}
        >
          <FolderKanban size={18} />
          <span>Overview</span>
        </button>
        <button
          type="button"
          className={'mobile-nav-btn' + (page === 'areas' ? ' active' : '')}
          onClick={() => { setPage('areas'); setMobileMenu(false) }}
        >
          <Ruler size={18} />
          <span>Areas</span>
        </button>
        <button
          type="button"
          className={'mobile-nav-btn' + (page === 'quotations' ? ' active' : '')}
          onClick={() => { setPage('quotations'); setMobileMenu(false) }}
        >
          <FileText size={18} />
          <span>Quotes</span>
          {project?.quotations?.length > 0 && <span className="mobile-badge">{project.quotations.length}</span>}
        </button>
        <button
          type="button"
          className={'mobile-nav-btn' + (page === 'invoice' ? ' active' : '')}
          onClick={() => { setPage('invoice'); setMobileMenu(false) }}
        >
          <Receipt size={18} />
          <span>Invoice</span>
        </button>
        <button
          type="button"
          className={'mobile-nav-btn' + (mobileMenu ? ' active' : '')}
          onClick={() => setMobileMenu((m) => !m)}
        >
          <Menu size={18} />
          <span>Menu</span>
        </button>
      </nav>
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
  return <main className="connection-screen"><section className="connection-card"><div className="auth-brand"><span className="brand-mark">K</span><span>KRISHNA<span>DECOR</span></span></div><p className="eyebrow">{role.toUpperCase()} APP SETUP</p><h1>Connect to your workspace</h1><p>The apps synchronize automatically with the 24/7 cloud backend. You can also specify a custom address below.</p><form onSubmit={connect}><button type="button" className="button secondary preset-cloud-btn" style={{ width: '100%', marginBottom: '14px', border: '1.5px dashed #4E8EA2', background: '#eef6fa', color: '#0A4174', fontWeight: 'bold' }} onClick={() => { setAddress('https://krishna-decor-api.onrender.com/api'); connectWithUrl('https://krishna-decor-api.onrender.com/api'); }}>Connect to 24/7 Cloud (Render + Neon)</button><label>Custom Sync address<input value={address} placeholder="https://krishna-decor-api.onrender.com/api" autoCapitalize="none" autoCorrect="off" inputMode="url" onChange={(event) => setAddress(event.target.value)} /></label>{error && <p className="auth-error">{error}</p>}<button className="button primary auth-submit" disabled={testing}>{testing ? 'Checking connection…' : 'Save & Connect'}<ArrowUpRight size={16} /></button></form><small>Default: <code>https://krishna-decor-api.onrender.com/api</code></small></section></main>
}

function AuthScreen({ onAuthenticated, onConfigure }) {
  const [setupRequired, setSetupRequired] = useState(null)
  const [values, setValues] = useState({ name: '', password: '' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [checking, setChecking] = useState(true)
  const [isOffline, setIsOffline] = useState(() => typeof navigator !== 'undefined' && !navigator.onLine)
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
        setIsOffline(false)
      })
      .catch((err) => {
        // When offline, do not permanently block manager login!
        setIsOffline(true)
        setSetupRequired(false)
        setError('')
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
          setIsOffline(false)
        })
        .catch(() => {
          setIsOffline(true)
        })
    }, 4000)
    return () => clearInterval(timer)
  }, [checkHealth])

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    const trimmedName = values.name.trim()

    try {
      const result = await apiRequest(setupRequired ? '/auth/bootstrap' : '/auth/login', {
        method: 'POST',
        body: JSON.stringify({ ...values, name: trimmedName, email: usernameAlias(trimmedName), role: 'manager' })
      })
      localStorage.setItem('krishna-decor-manager-last-profile', JSON.stringify({ name: trimmedName, session: result }))

      if (isDesktopApp()) {
        const cloudCreds = { name: trimmedName, email: usernameAlias(trimmedName), password: values.password, role: 'manager' }
        localStorage.setItem('krishna-decor-cloud-creds', JSON.stringify(cloudCreds))
        const cloudBase = cloudApiBase()
        if (cloudBase) {
          fetch(cloudBase + (setupRequired ? '/auth/bootstrap' : '/auth/login'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(cloudCreds),
            signal: AbortSignal.timeout(6000)
          }).then((res) => res.json()).then((cloudRes) => {
            if (cloudRes?.token) {
              localStorage.setItem('krishna-decor-cloud-token', cloudRes.token)
            }
          }).catch(() => {})
        }
      }

      onAuthenticated(result)
    } catch (requestError) {
      if (isNetworkError(requestError) || !navigator.onLine || isOffline) {
        // Offline authentication support: let manager enter workspace without internet
        try {
          const cachedProfile = JSON.parse(localStorage.getItem('krishna-decor-manager-last-profile') || 'null')
          if (cachedProfile && cachedProfile.name?.toLowerCase() === trimmedName.toLowerCase() && cachedProfile.session) {
            onAuthenticated(cachedProfile.session)
            return
          }
          const storedSession = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null')
          if (storedSession && storedSession.user?.name?.toLowerCase() === trimmedName.toLowerCase() && storedSession.token) {
            onAuthenticated(storedSession)
            return
          }
          // Default owner manager fallback for offline use
          if (trimmedName.toLowerCase() === 'dinesh' || trimmedName.toLowerCase() === 'sohan' || !trimmedName || trimmedName.toLowerCase() === 'manager') {
            const offlineSession = {
              token: 'manager-offline-session-' + Date.now().toString(36),
              user: {
                id: '3c8d7d36-7fa6-4b1c-8526-179be4456a93',
                name: trimmedName || 'Dinesh',
                role: 'manager'
              }
            }
            localStorage.setItem(SESSION_KEY, JSON.stringify(offlineSession))
            localStorage.setItem('krishna-decor-manager-last-profile', JSON.stringify({ name: trimmedName || 'Dinesh', session: offlineSession }))
            onAuthenticated(offlineSession)
            return
          }
        } catch {}
      }
      setError(requestError.message || 'Login failed')
    } finally {
      setSubmitting(false)
    }
  }
  return (
    <main className="auth-screen">
      <section className="auth-panel">
        <div className="auth-brand">
          <span className="brand-mark">K</span>
          <span>KRISHNA<span>DECOR</span></span>
        </div>
        {setupRequired === null && !error && !isOffline ? (
          <div className="auth-loading">
            <Clock3 size={22} />
            <p>Connecting to your workspace…</p>
          </div>
        ) : (
          <>
            <p className="eyebrow">{setupRequired ? 'SECURE FIRST-TIME SETUP' : 'OWNER SIGN IN'}</p>
            <h1>{setupRequired ? 'Create the owner account' : 'Welcome back'}</h1>
            <p className="auth-copy">
              {setupRequired
                ? 'There are no pre-created accounts or project records. Set the owner user name and password for this installation.'
                : 'Sign in to manage your live Krishna Decor projects.'}
            </p>
            <div
              className="server-status-badge"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 12px',
                margin: '0 0 16px',
                background: isOffline ? '#fff7ed' : '#eef6fa',
                border: '1px solid ' + (isOffline ? '#fed7aa' : '#BDD8E9'),
                borderRadius: '99px',
                fontSize: '11px',
                color: isOffline ? '#9a3412' : '#001D39'
              }}
            >
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: isOffline ? '#f97316' : '#7BBDE8',
                  boxShadow: isOffline ? '0 0 0 2px rgba(249,115,22,.35)' : '0 0 0 2px rgba(123,189,232,.35)'
                }}
              />
              <span>{isOffline ? 'Offline Mode · Working Locally (Syncs when connected)' : (isCloud ? 'Sync: 24/7 Cloud (Render + Neon)' : 'Sync: Custom Server')}</span>
              {!isOffline && <code style={{ fontFamily: 'Consolas, monospace', fontSize: '10px', color: '#0A4174' }}>{currentServer}</code>}
            </div>
            <form onSubmit={submit} className="auth-form" autoComplete="off">
              <Field
                label="User name"
                name="manager-login-name"
                autoComplete="off"
                value={values.name}
                onChange={(event) => setValues({ ...values, name: event.target.value })}
              />
              <Field
                label="Password"
                name="manager-login-password"
                type="password"
                minLength="8"
                value={values.password}
                autoComplete={setupRequired ? 'new-password' : 'current-password'}
                onChange={(event) => setValues({ ...values, password: event.target.value })}
              />
              {error && (
                <div className="auth-error-box">
                  <p className="auth-error">{error}</p>
                  {(!isCloud || /reach|connect|failed|offline/i.test(error)) && (
                    <button
                      type="button"
                      className="button secondary"
                      style={{ marginTop: '0.5rem', width: '100%', background: '#eef6fa', borderColor: '#BDD8E9', color: '#0A4174', fontWeight: 'bold' }}
                      onClick={resetToCloud}
                    >
                      Reset to 24/7 Cloud Server
                    </button>
                  )}
                  <button
                    type="button"
                    className="button secondary"
                    style={{ marginTop: '0.5rem', width: '100%' }}
                    disabled={checking}
                    onClick={checkHealth}
                  >
                    {checking ? 'Connecting…' : 'Retry connection'}
                  </button>
                </div>
              )}
              <button className="button primary auth-submit" disabled={submitting}>
                {submitting ? 'Please wait…' : setupRequired ? 'Create owner account' : (isOffline ? 'Sign in (Offline)' : 'Sign in')}
                <ArrowUpRight size={16} />
              </button>
            </form>
            {onConfigure && (
              <button className="connection-link" onClick={onConfigure}>
                Use a different data server
              </button>
            )}
          </>
        )}
      </section>
      <aside className="auth-aside">
        <p className="eyebrow light">KRISHNA DECOR / OWNER DESK</p>
        <h2 style={{ padding: '24px 0', color: '#fffdf8' }}>Project management that carries the detail.</h2>
        <p>Measurements, materials, approvals and payment tracking live in one secure workspace.</p>
        <div className="auth-points">
          <span><CheckCircle2 size={16} />Works totally offline on device</span>
          <span><CheckCircle2 size={16} />Role-limited field staff access</span>
          <span><CheckCircle2 size={16} />Automatic cloud sync when internet connects</span>
        </div>
      </aside>
    </main>
  )
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
  const activeStaff = filterDeletedStaff(staff)
  return <><div className="team-layout"><section className="panel team-form"><div className="section-heading"><div><p className="eyebrow">FIELD ACCESS</p><h3>Add a staff member</h3></div><Users size={20} /></div><p className="team-copy">Every staff member can select any manager-created project. Each field submission is automatically attributed to their user name.</p><form onSubmit={createStaff} className="team-inputs" autoComplete="off"><Field label="Staff member name" name="new-staff-name" autoComplete="off" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /><Field label="Temporary password" name="new-staff-password" autoComplete="new-password" type="password" minLength="8" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />{error && <p className="auth-error">{error}</p>}<button className="button primary" disabled={submitting}>{submitting ? 'Creating…' : 'Create staff account'}<ArrowUpRight size={16} /></button></form></section><section className="panel team-list"><div className="section-heading"><div><p className="eyebrow">STAFF ACCOUNTABILITY</p><h3>Field activity log</h3></div><div className="activity-actions"><span className="tag">{activity.length} records</span><button className="text-button" onClick={onRefresh}>Refresh activity</button></div></div>{activity.length ? <table className="simple-table audit-table"><thead><tr><th>Staff member</th><th>Project</th><th>Action</th><th>Recorded</th></tr></thead><tbody>{activity.map((entry) => <tr key={entry.id}><td><strong>{entry.actorName}</strong></td><td>{entry.projectName}</td><td><strong>{entry.action}</strong><small>{entry.detail}</small></td><td>{new Date(entry.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</td></tr>)}</tbody></table> : <Empty label="Staff submissions will appear here with the user name and time recorded." />}</section><section className="panel staff-directory"><div className="section-heading"><div><p className="eyebrow">STAFF DIRECTORY</p><h3>Active accounts</h3></div></div>{activeStaff.length ? <div className="directory-grid">{activeStaff.map((person) => <div className="staff-card" key={person.id}><span>{person.name.slice(0, 1).toUpperCase()}</span><div><strong>{person.name}</strong><small>Name and password sign-in</small></div><button type="button" className="button remove-staff" disabled={removingStaffId === person.id} onClick={() => setStaffToRemove(person)}><Trash2 size={14} />{removingStaffId === person.id ? 'Removing...' : 'Remove'}</button></div>)}</div> : <Empty label="No staff accounts have been created." />}</section></div>{staffToRemove && <ConfirmRemovalModal person={staffToRemove} busy={removingStaffId === staffToRemove.id} onClose={() => setStaffToRemove(null)} onConfirm={() => removeStaff(staffToRemove)} />}</>
}

function ConfirmRemovalModal({ person, busy, onClose, onConfirm }) {
  return <div className="modal-layer" onMouseDown={busy ? undefined : onClose}><section className="modal confirm-removal" role="dialog" aria-modal="true" aria-label="Remove staff member" onMouseDown={(event) => event.stopPropagation()}><button className="modal-close" type="button" aria-label="Close" disabled={busy} onClick={onClose}><X size={18} /></button><span className="modal-kicker">REMOVE STAFF ACCESS</span><h2>Remove {person.name}?</h2><p>This account will no longer be able to sign in. Existing field entries remain in the project history.</p><div className="modal-actions"><button type="button" className="button secondary" disabled={busy} onClick={onClose}>Cancel</button><button type="button" className="button danger-button" disabled={busy} onClick={onConfirm}><Trash2 size={15} />{busy ? 'Removing...' : 'Remove staff'}</button></div></section></div>
}

function Overview({ project, onPage, onRefresh, onDeleteProject, patchProject, toast }) {
  const currentQuote = project.quotations[project.quotations.length - 1]
  const totals = getTotals(currentQuote?.items || [])
  const paid = project.payments.reduce((sum, payment) => sum + (payment.state === 'Received' ? payment.amount : 0), 0)
  const staffDrafts = project.staffDrafts || []
  const savedDrafts = staffDrafts
  const [editingDraft, setEditingDraft] = useState(null)
  const removeDraft = (draftId, draftDesc, draftObj = null) => {
    const cleanTarget = String(draftId || draftObj?.rawId || draftObj?.id || '').replace(/^staff-/, '').trim()
    markStaffDraftDeleted(project.id, cleanTarget, draftObj)

    if (cleanTarget) {
      apiRequest('/staff/projects/' + project.id + '/submissions/' + encodeURIComponent(cleanTarget), { method: 'DELETE' }).catch(() => {})
      enqueueMutation({ type: 'delete_submission', projectId: project.id, submissionId: cleanTarget })
      if (isDesktopApp()) syncCloud()
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
      <div className="hero-content">
        <p className="eyebrow light">PROJECT OVERVIEW</p>
        <h2>{project.name}</h2>
        <p>{project.customer.location || 'Add the customer’s location and visit details to start the workflow.'}</p>
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
      {project.areas.length ? <div className="area-preview-grid">{project.areas.slice(0, 4).map((area, index) => {
        const sets = getAreaMeasurementSets(area, project.staffDrafts)
        const { totalSqFt: cov, validSets } = calculateMeasurementSetsCoverage(sets, area.unit)
        const dimLabel = validSets > 1
          ? `${validSets} measurement sets · ${quantity(cov)} sq ft`
          : (sets.length === 1 && sets[0].width && sets[0].height
            ? `${sets[0].width} × ${sets[0].height} ${sets[0].unit || 'in'}`
            : (area.width && area.height ? `${area.width} × ${area.height} in` : 'Dimensions needed'))
        return <div className={'area-preview tone-' + (index % 3)} key={area.id}><span>{String(index + 1).padStart(2, '0')}</span><h4>{area.name}</h4><p>{dimLabel}</p><small>{area.products?.length || 0} materials</small></div>
      })}</div> : <Empty label="No areas have been selected yet." action="Add an area" onClick={() => onPage('areas')} />}</section>
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
  const [form, setForm] = useState(project.customer || {})
  const saveTimeoutRef = useRef(null)

  useEffect(() => {
    setForm(project.customer || {})
  }, [project.id])

  const flushSave = (currentForm) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    patchProject({
      customer: currentForm,
      status: project.status === 'Needs site details' ? 'Site details in progress' : project.status
    })
  }

  const setCustomerField = (key, value) => {
    const nextForm = { ...form, [key]: value }
    setForm(nextForm)
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(() => {
      flushSave(nextForm)
    }, 400)
  }

  const handleBlur = () => {
    flushSave(form)
  }

  const handleExplicitSave = () => {
    flushSave(form)
    toast('Customer details saved.')
  }

  return (
    <div className="customer-layout">
      <section className="panel form-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">CONTACT</p>
            <h3>Customer & site</h3>
          </div>
          <span className="autosave"><CheckCircle2 size={14} />Saved automatically</span>
        </div>
        <div className="form-grid">
          <Field label="Customer name" value={form.name || ''} placeholder="Full name" onChange={(e) => setCustomerField('name', e.target.value)} onBlur={handleBlur} />
          <Field label="Date of visit" type="date" value={form.visitDate || ''} onChange={(e) => setCustomerField('visitDate', e.target.value)} onBlur={handleBlur} />
          <Field label="Site location" value={form.location || ''} placeholder="City, State" onChange={(e) => setCustomerField('location', e.target.value)} onBlur={handleBlur} />
          <Field label="Reference" value={form.reference || ''} placeholder="Architect, designer or referral" onChange={(e) => setCustomerField('reference', e.target.value)} onBlur={handleBlur} />
          <label className="field full"><span>Site address</span><textarea rows="4" value={form.address || ''} placeholder="Complete project address" onChange={(e) => setCustomerField('address', e.target.value)} onBlur={handleBlur} /></label>
        </div>
        <div className="form-footer">
          <p>These details appear on the quotation and invoice records.</p>
          <button className="button primary" onClick={handleExplicitSave}>Save details</button>
        </div>
      </section>
    </div>
  )
}

function Field({ label, onFocus, ...props }) {
  const isNumber = props.type === 'number'
  return (
    <label className="field">
      <span>{label}</span>
      <input
        {...(isNumber ? { inputMode: 'decimal', onWheel: (e) => e.target.blur() } : {})}
        onFocus={(e) => {
          if (isNumber) e.target.select?.()
          onFocus?.(e)
        }}
        {...props}
      />
    </label>
  )
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

function RenameMeasurementModal({ areaId, measurementSet, onClose, onSave }) {
  const [label, setLabel] = useState(measurementSet?.label || '')
  const handleSubmit = (e) => {
    e.preventDefault()
    if (label.trim()) onSave(areaId, measurementSet.id, label.trim())
  }
  return (
    <div className="modal-layer" onMouseDown={onClose}>
      <form className="modal" onSubmit={handleSubmit} onMouseDown={(e) => e.stopPropagation()}>
        <button type="button" className="modal-close" onClick={onClose}><X size={18} /></button>
        <span className="modal-kicker">MEASUREMENT SET</span>
        <h2>Rename measurement</h2>
        <p>Update the name for this measurement (e.g. "Main Window", "French Door", "Balcony"). Associated materials and calculations will update automatically.</p>
        <Field label="Measurement name" value={label} onChange={(e) => setLabel(e.target.value)} autoFocus required />
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
  const [minimumArea, setMinimumArea] = useState(material.minimumArea || 11)
  const [quantity, setQuantity] = useState(material.quantity ?? 0)
  const [quantityOverridden, setQuantityOverridden] = useState(Boolean(material.quantityOverridden || isManualQuantityMaterial(material.product)))
  const [unitPrice, setUnitPrice] = useState(material.unitPrice ?? 0)
  const [gst, setGst] = useState(material.gst || 18)
  const [note, setNote] = useState(material.notes || material.note || '')

  const isStaff = Boolean(material.isStaff)
  const isManual = isManualQuantityMaterial(product)
  const isHardware = isHardwareProduct(product)
  const isBlind = isSquareFootBlind(product) || product.toLowerCase().includes('roman')
  const isCurtainSelected = isCurtainProduct(product)

  // Effective dimensions in inches
  const effectiveWidthInches = toInches(width, unit) || (currentArea ? Number(currentArea.width) : 0)
  const effectiveHeightInches = toInches(height, unit) || (currentArea ? Number(currentArea.height) : 0)

  const prevProductRef = useRef(product)

  useEffect(() => {
    if (isManual) return
    const prodObj = findProductDef(product) || MATERIAL_PRODUCTS.find((p) => p.name === product) || { name: product, gst: 18, formula: 'standard' }
    if (effectiveWidthInches > 0 && (effectiveHeightInches > 0 || prodObj.formula === 'valance' || isStitchingPanelProduct(product) || isHardware)) {
      prodObj.minimumArea = minimumArea
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
  }, [product, effectiveWidthInches, effectiveHeightInches, minimumArea, quantityOverridden, isManual, isHardware])

  const handleSubmit = (e) => {
    e.preventDefault()
    const wVal = Number(width) > 0 ? Number(width) : 0
    const hVal = Number(height) > 0 ? Number(height) : 0
    const wInches = wVal > 0 ? Number(toInches(wVal, unit).toFixed(2)) : (Number(material.width) || 0)
    const hInches = hVal > 0 ? Number(toInches(hVal, unit).toFixed(2)) : (Number(material.height) || 0)
    const measurementSets = (wVal > 0 && hVal > 0)
      ? [{ id: uid('mset'), label: 'Measurement 1', width: wVal, height: hVal, unit }]
      : (Array.isArray(material.measurements) ? material.measurements : [])
    const measureSummary = formatItemMeasurementSummary({
      measurements: measurementSets,
      width: wInches,
      height: hInches,
      unit,
      variantLabel: material.variantLabel
    })

    onSave({
      ...material,
      area: (areaName || '').trim(),
      product,
      width: wInches,
      height: hInches,
      unit,
      clampType: isCurtainSelected ? clampType : '',
      minimumArea: isBlind ? (Number(minimumArea) || 11) : undefined,
      quantity: Number(Number(quantity || 0).toFixed(2)),
      quantityOverridden: isManual ? true : quantityOverridden,
      isManualQuantity: isManual,
      measurements: measurementSets,
      measurementSummary: measureSummary,
      unitPrice: Number(unitPrice) || 0,
      gst: Number(gst) || 18,
      note
    })
  }

  return (
    <div className="modal-layer" onMouseDown={onClose}>
      <form className="modal edit-material-modal" onSubmit={handleSubmit} onMouseDown={(e) => e.stopPropagation()}>
        <button type="button" className="modal-close" onClick={onClose}><X size={18} /></button>
        <div className="modal-header">
          <span className="modal-kicker">
            {isManual ? 'OPTIONAL MEASUREMENTS · MANUAL QUANTITY' : isStaff ? 'FIELD MEASUREMENT' : 'MATERIAL ITEM'} · {areaName || material.area}
          </span>
          <h2>Edit {isStaff ? 'staff entry' : 'material'}</h2>
          <p>Update specifications, dimensions, quantity, MRP and tax rate. Changes are saved to this project workspace.</p>
        </div>

        <div className="modal-scroll-body">
          <label className="field" style={{ marginTop: '4px' }}>
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

          {(isStaff || isCurtainSelected || isManual || Boolean(width || height || currentArea?.width)) && (
            <div className="measure-row" style={{ marginTop: '14px' }}>
              <label className="field" style={{ flex: 1 }}>
                <span>Width ({unit}){isManual ? ' (Optional)' : ''}</span>
                <input
                  type="number"
                  step="any"
                  min="0"
                  inputMode="decimal"
                  required={!isManual}
                  value={width}
                  placeholder={isManual ? 'Optional' : 'Width'}
                  onFocus={(e) => e.target.select?.()}
                  onWheel={(e) => e.target.blur()}
                  onChange={(e) => {
                    setWidth(e.target.value)
                    if (!isManual) setQuantityOverridden(false)
                  }}
                />
              </label>
              <span style={{ alignSelf: 'center', marginTop: '18px', fontWeight: 'bold' }}>×</span>
              <label className="field" style={{ flex: 1 }}>
                <span>Height ({unit}){isManual ? ' (Optional)' : isHardware ? ' (Not needed)' : ''}</span>
                <input
                  type="number"
                  step="any"
                  min="0"
                  inputMode="decimal"
                  required={!isManual && !isHardware}
                  value={height}
                  placeholder={isManual ? 'Optional' : isHardware ? 'Not needed' : 'Height'}
                  onFocus={(e) => e.target.select?.()}
                  onWheel={(e) => e.target.blur()}
                  onChange={(e) => {
                    setHeight(e.target.value)
                    if (!isManual) setQuantityOverridden(false)
                  }}
                />
              </label>
              <label className="field" style={{ width: '130px' }}>
                <span>Unit</span>
                <select
                  value={unit}
                  onChange={(e) => {
                    setUnit(e.target.value)
                    if (!isManual) setQuantityOverridden(false)
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

          {isBlind && (
            <label className="field" style={{ marginTop: '14px' }}>
              <span>Minimum chargeable area</span>
              <select
                value={minimumArea}
                onChange={(e) => {
                  setMinimumArea(e.target.value)
                  setQuantityOverridden(false)
                }}
              >
                <option value="11">11 sq ft</option>
                <option value="16.5">16.5 sq ft</option>
              </select>
            </label>
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
              label={isManual ? `Quantity (${unitLabel(product)}) *` : `Calculated Quantity (${unitLabel(product)})`}
              type="number"
              step="any"
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
            <div style={{ marginTop: '6px', fontSize: '12px', color: '#0A4174', fontWeight: 600 }}>
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
        </div>

        <div className="modal-actions">
          <button type="button" className="button secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="button primary">Save material</button>
        </div>
      </form>
    </div>
  )
}

function AreaDimensionDrawer({ area, onSaveAreaMeasurements, onChangeDimension, onChangeUnit, staffEntriesCount, onSyncToStaff, onRenameMeasurement, onClose }) {
  const [sets, setSets] = useState(() => {
    const existing = getAreaMeasurementSets(area)
    return existing.length > 0 ? existing : [{ id: uid('mset'), label: 'Measurement 1', width: '', height: '', unit: area.unit || 'in' }]
  })
  const saveTimeoutRef = useRef(null)

  useEffect(() => {
    const current = getAreaMeasurementSets(area)
    if (current.length > 0) {
      setSets(current)
    }
  }, [area.id])

  const flushSave = (next) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    const valid = next.find((s) => Number(s.width) > 0 && Number(s.height) > 0) || next[0]
    const u = valid?.unit || area.unit || 'in'
    const wInches = valid?.width && Number(valid.width) > 0 ? toInches(valid.width, u) : (area.width || 0)
    const hInches = valid?.height && Number(valid.height) > 0 ? toInches(valid.height, u) : (area.height || 0)
    if (onSaveAreaMeasurements) {
      onSaveAreaMeasurements(area.id, next, Number(wInches.toFixed(2)), Number(hInches.toFixed(2)), u)
    } else {
      onChangeDimension?.(area.id, 'width', valid?.width || 0)
      onChangeDimension?.(area.id, 'height', valid?.height || 0)
      if (u !== area.unit) onChangeUnit?.(area.id, u)
    }
  }

  const handleUpdateSet = (id, field, value) => {
    const next = sets.map((s) => s.id === id ? { ...s, [field]: value } : s)
    setSets(next)
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(() => {
      flushSave(next)
    }, 500)
  }

  const handleAddSet = () => {
    const newId = uid('mset')
    const newSet = { id: newId, label: 'Measurement ' + (sets.length + 1), width: '', height: '', unit: area.unit || 'in' }
    const next = [...sets, newSet]
    setSets(next)
    flushSave(next)
    setTimeout(() => {
      const el = document.getElementById('mset-width-' + newId)
      if (el) {
        el.focus()
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }
    }, 60)
  }

  const handleRemoveSet = (id) => {
    if (sets.length <= 1) return
    const next = sets.filter((s) => s.id !== id)
    setSets(next)
    flushSave(next)
  }

  const { totalSqFt, validSets } = calculateMeasurementSetsCoverage(sets, area.unit)

  return (
    <div className="area-dimensions-drawer">
      <div className="area-dimensions-drawer-head">
        <div>
          <strong>Edit measurements for {area.name}</strong>
          <span style={{ display: 'block', marginTop: '2px' }}>
            Store one or multiple measurement sets (windows, walls, openings) for this area
          </span>
        </div>
        <button
          type="button"
          className="button secondary small"
          onClick={handleAddSet}
          title="Add another measurement set for this area (retains existing)"
        >
          <Plus size={13} />Add measurement set
        </button>
      </div>

      <div className="msets-container">
        {sets.map((set, index) => {
          const sqft = (Number(set.width) > 0 && Number(set.height) > 0)
            ? ((toInches(set.width, set.unit || 'in') / 12) * (toInches(set.height, set.unit || 'in') / 12)).toFixed(2)
            : null
          return (
            <div key={set.id || index} id={`mset-row-${set.id}`} className="mset-row">
              <span className="measure-chip-num" style={{ fontSize: '11px', fontWeight: 700 }}>#{index + 1}</span>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <input
                  className="mset-label-input"
                  value={set.label || `Measurement ${index + 1}`}
                  placeholder={`Set ${index + 1}`}
                  title="Rename this measurement"
                  onChange={(e) => handleUpdateSet(set.id, 'label', e.target.value)}
                  onBlur={() => flushSave(sets)}
                />
                <button
                  type="button"
                  className="area-action-btn"
                  title={`Rename "${set.label || `Measurement ${index + 1}`}"`}
                  style={{ height: '38px', width: '38px' }}
                  onClick={() => onRenameMeasurement?.({ areaId: area.id, set })}
                >
                  <Pencil size={13} />
                </button>
              </div>
              <div className="mset-inputs">
                <div className="mset-field">
                  <input
                    id={`mset-width-${set.id}`}
                    type="number"
                    min="0"
                    step="any"
                    inputMode="decimal"
                    value={set.width ?? ''}
                    placeholder="0"
                    onFocus={(e) => e.target.select?.()}
                    onWheel={(e) => e.target.blur()}
                    onChange={(e) => handleUpdateSet(set.id, 'width', e.target.value)}
                    onBlur={() => flushSave(sets)}
                  />
                  <small>{set.unit || area.unit || 'in'}</small>
                </div>
                <span className="times" style={{ padding: 0, fontSize: '16px' }}>×</span>
                <div className="mset-field">
                  <input
                    id={`mset-height-${set.id}`}
                    type="number"
                    min="0"
                    step="any"
                    inputMode="decimal"
                    value={set.height ?? ''}
                    placeholder="0"
                    onFocus={(e) => e.target.select?.()}
                    onWheel={(e) => e.target.blur()}
                    onChange={(e) => handleUpdateSet(set.id, 'height', e.target.value)}
                    onBlur={() => flushSave(sets)}
                  />
                  <small>{set.unit || area.unit || 'in'}</small>
                </div>
                <select
                  className="mset-unit-select"
                  value={set.unit || area.unit || 'in'}
                  onChange={(e) => handleUpdateSet(set.id, 'unit', e.target.value)}
                  onBlur={() => flushSave(sets)}
                >
                  <option value="in">Inches</option>
                  <option value="ft">Feet</option>
                  <option value="m">Metres</option>
                  <option value="cm">Centimetres</option>
                </select>
                {sqft && (
                  <span className="mset-sqft-tag">
                    {sqft} sq ft
                  </span>
                )}
                {sets.length > 1 && (
                  <button
                    type="button"
                    className="area-action-btn danger"
                    title="Remove this measurement set"
                    onClick={() => handleRemoveSet(set.id)}
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
          className="button secondary add-set-bottom-btn"
          onClick={handleAddSet}
          style={{
            width: '100%',
            marginTop: '6px',
            padding: '9px 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            border: '1px dashed #b7ccb5',
            background: '#f4f8f3',
            color: '#28522d',
            fontWeight: 600,
            fontSize: '12px',
            borderRadius: '7px',
            cursor: 'pointer'
          }}
        >
          <Plus size={14} /> Add new measurement set for {area.name} (retains existing #{sets.length})
        </button>
      </div>

      <div className="dimensions-drawer-footer">
        <span className="dimensions-note">
          Live coverage: <b>{validSets} measurement {validSets === 1 ? 'set' : 'sets'}</b> · Total <b>{quantity(totalSqFt)} sq ft</b>
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
  const [calcVariantId, setCalcVariantId] = useState('') // specific measurement set id of the active area
  const [showCalculator, setShowCalculator] = useState(true)
  const [editingDimensionsId, setEditingDimensionsId] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [areaChoice, setAreaChoice] = useState('')
  const [customArea, setCustomArea] = useState('')
  const [renamingArea, setRenamingArea] = useState(null)
  const [renamingMeasurement, setRenamingMeasurement] = useState(null)
  const [editingMaterial, setEditingMaterial] = useState(null)
  const [draft, setDraft] = useState({
    product: PRODUCTS[0].name,
    price: 0,
    fabricPrice: 650,
    liningPrice: 290,
    romanType: 'Premium',
    minimumArea: 11,
    clampType: '',
    manualQuantity: '',
    itemMeasurements: [{ id: uid('mset'), label: 'Measurement 1', width: '', height: '', unit: 'in' }]
  })

  // Keep calcAreaId valid if areas change
  useEffect(() => {
    if (!project.areas.some((a) => a.id === calcAreaId) && project.areas[0]) {
      setCalcAreaId(project.areas[0].id)
    }
  }, [project.areas, calcAreaId])

  const targetCalcArea = project.areas.find((a) => a.id === calcAreaId) || project.areas[0]
  const targetAreaSets = useMemo(() => getAreaMeasurementSets(targetCalcArea, project.staffDrafts), [targetCalcArea, project.staffDrafts])

  const selectedVariant = useMemo(() => {
    if (!targetCalcArea || targetAreaSets.length === 0) return null
    const found = targetAreaSets.find((s) => String(s.id) === String(calcVariantId))
    return found || targetAreaSets[0] || null
  }, [targetCalcArea, targetAreaSets, calcVariantId])

  // Automatically keep calcVariantId synced to a valid measurement set of the active area
  useEffect(() => {
    if (targetAreaSets.length > 0 && !targetAreaSets.some((s) => String(s.id) === String(calcVariantId))) {
      setCalcVariantId(targetAreaSets[0].id)
    }
  }, [targetAreaSets, calcVariantId])

  const effectiveCalcWidth = selectedVariant
    ? (Number(selectedVariant.width) > 0 ? toInches(selectedVariant.width, selectedVariant.unit || targetCalcArea?.unit || 'in') : 0)
    : (targetCalcArea?.width || 0)

  const effectiveCalcHeight = selectedVariant
    ? (Number(selectedVariant.height) > 0 ? toInches(selectedVariant.height, selectedVariant.unit || targetCalcArea?.unit || 'in') : 0)
    : (targetCalcArea?.height || 0)

  const effectiveCalcUnit = selectedVariant?.unit || targetCalcArea?.unit || 'in'

  const handleRenameMeasurement = (targetAreaId, setId, newLabel) => {
    const targetArea = project.areas.find(a => a.id === targetAreaId)
    if (!targetArea) return
    const currentSets = getAreaMeasurementSets(targetArea, project.staffDrafts)
    const oldSet = currentSets.find(s => s.id === setId)
    const oldLabel = oldSet?.label || ''

    const nextSets = currentSets.map(s => s.id === setId ? { ...s, label: newLabel } : s)

    const updatedProducts = (targetArea.products || []).map((p) => {
      const isMatch = (p.measurementSetId && p.measurementSetId === setId) ||
        (oldLabel && (p.variantLabel || '').toLowerCase() === oldLabel.toLowerCase())
      if (!isMatch) return p

      const vLabel = newLabel
      let nextNote = p.note || ''
      if (oldLabel && nextNote.startsWith(oldLabel + ':')) {
        nextNote = vLabel + ':' + nextNote.slice(oldLabel.length + 1)
      }
      const mSummary = formatItemMeasurementSummary({
        width: p.width,
        height: p.height,
        unit: p.unit || targetArea.unit || 'in',
        variantLabel: vLabel
      })
      return {
        ...p,
        measurementSetId: setId,
        variantLabel: vLabel,
        note: nextNote,
        measurementSummary: mSummary
      }
    })

    const nextAreas = project.areas.map(a => a.id === targetAreaId ? {
      ...a,
      measurementSets: nextSets,
      products: updatedProducts
    } : a)

    patchProject({ areas: nextAreas })
    setRenamingMeasurement(null)
    toast(`Measurement renamed to "${newLabel}".`)
  }

  const handleSaveAreaMeasurements = (targetId, nextSets, primaryWInches, primaryHInches, unit) => {
    const targetArea = project.areas.find(a => a.id === targetId)
    if (!targetArea) return
    const updatedProducts = (targetArea.products || []).map((p) => {
      if (isManualQuantityMaterial(p.product) || p.isManualQuantity || p.quantityOverridden) return p
      if (Array.isArray(p.measurements) && p.measurements.length > 1) return p

      // Match product to its assigned measurement set
      const matchingSet = p.measurementSetId
        ? nextSets.find(s => s.id === p.measurementSetId)
        : (p.variantLabel
            ? nextSets.find(s => (s.label || '').toLowerCase() === p.variantLabel.toLowerCase())
            : nextSets[0])

      if (!matchingSet) return p

      const vLabel = matchingSet.label || p.variantLabel || ''
      const prodObj = findProductDef(p.product) || MATERIAL_PRODUCTS.find((x) => x.name === p.product) || { name: p.product, gst: p.gst, formula: 'standard' }

      // If matching set lacks positive dimensions (and product requires height), update label at least:
      if (!Number(matchingSet.width) || (!Number(matchingSet.height) && prodObj.formula !== 'valance')) {
        return {
          ...p,
          measurementSetId: matchingSet.id,
          variantLabel: vLabel,
          measurementSummary: formatItemMeasurementSummary({ width: p.width, height: p.height, unit: p.unit || targetArea.unit || 'in', variantLabel: vLabel })
        }
      }

      const itemW = toInches(matchingSet.width, matchingSet.unit || unit)
      const itemH = toInches(matchingSet.height, matchingSet.unit || unit)
      const itemUnit = matchingSet.unit || unit || targetArea.unit || p.unit || 'in'
      const calc = calculateProduct(prodObj, itemW, itemH)
      const lineNote = vLabel ? `${vLabel}: ${calc.note}` : calc.note
      const mSummary = formatItemMeasurementSummary({ width: itemW, height: itemH, unit: itemUnit, variantLabel: vLabel })
      return {
        ...p,
        width: itemW,
        height: itemH,
        unit: itemUnit,
        measurementSetId: matchingSet.id,
        variantLabel: vLabel,
        quantity: Number(Number(calc.quantity || 0).toFixed(2)),
        note: lineNote,
        measurementSummary: mSummary
      }
    })
    const nextAreas = project.areas.map(a => a.id === targetId ? {
      ...a,
      measurementSets: nextSets,
      width: primaryWInches,
      height: primaryHInches,
      unit: unit || a.unit || 'in',
      products: updatedProducts
    } : a)
    patchProject({ areas: nextAreas })
  }

  const handleAddNewMeasurementSet = (targetAreaId) => {
    const targetArea = project.areas.find(a => a.id === targetAreaId)
    if (!targetArea) return
    const currentSets = getAreaMeasurementSets(targetArea, project.staffDrafts)

    let nextSets = []
    let newSetId = ''
    if (currentSets.length === 0) {
      newSetId = uid('mset')
      nextSets = [{
        id: newSetId,
        label: 'Measurement 1',
        width: '',
        height: '',
        unit: targetArea.unit || 'in'
      }]
    } else {
      const retainedSets = currentSets.map((s, idx) => ({
        ...s,
        id: s.id || uid('mset'),
        label: s.label || `Measurement ${idx + 1}`
      }))
      newSetId = uid('mset')
      const newSet = {
        id: newSetId,
        label: `Measurement ${retainedSets.length + 1}`,
        width: '',
        height: '',
        unit: targetArea.unit || 'in'
      }
      nextSets = [...retainedSets, newSet]
    }

    const primary = nextSets.find(s => Number(s.width) > 0 && Number(s.height) > 0) || nextSets[0]
    const u = primary.unit || targetArea.unit || 'in'
    const primaryWInches = primary.width && Number(primary.width) > 0 ? toInches(primary.width, u) : (targetArea.width || 0)
    const primaryHInches = primary.height && Number(primary.height) > 0 ? toInches(primary.height, u) : (targetArea.height || 0)

    handleSaveAreaMeasurements(targetArea.id, nextSets, Number(primaryWInches.toFixed(2)), Number(primaryHInches.toFixed(2)), u)
    setEditingDimensionsId(targetArea.id)
    setCalcAreaId(targetArea.id)
    setCalcVariantId(newSetId)
    setAreaId?.(targetArea.id)
    toast(nextSets.length > 1
      ? `Added measurement set #${nextSets.length} for ${targetArea.name}. Existing sets retained.`
      : `Ready to enter measurements for ${targetArea.name}.`)
    setTimeout(() => {
      const el = document.getElementById('mset-width-' + newSetId)
      if (el) {
        el.focus()
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }
    }, 120)
  }

  const handleTargetSelectionChange = (newAreaId, newVariantId) => {
    if (newVariantId === '__new_set__') {
      handleAddNewMeasurementSet(newAreaId)
      return
    }
    setCalcAreaId(newAreaId)
    setAreaId?.(newAreaId)
    const targetA = project.areas.find((a) => a.id === newAreaId)
    if (!targetA) return
    const sets = getAreaMeasurementSets(targetA, project.staffDrafts)
    const chosenVariantId = (newVariantId && newVariantId !== 'default') ? newVariantId : (sets[0]?.id || '')
    setCalcVariantId(chosenVariantId)
    const v = sets.find((s) => String(s.id) === String(chosenVariantId)) || sets[0]
    if (v && (Number(v.width) > 0 || Number(v.height) > 0)) {
      setDraft((prev) => ({
        ...prev,
        itemMeasurements: [{
          id: uid('mset'),
          label: v.label || 'Measurement 1',
          width: v.width,
          height: v.height,
          unit: v.unit || targetA.unit || 'in'
        }]
      }))
    }
  }

  const selectedProduct = PRODUCTS.find((item) => item.name === draft.product) || PRODUCTS[0]
  const preview = targetCalcArea ? calculateProduct(selectedProduct, effectiveCalcWidth, effectiveCalcHeight, draft) : null

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
    const initialSets = (Number(widthInInches.toFixed(2)) > 0 || Number(heightInInches.toFixed(2)) > 0) ? [{
      id: uid('mset'),
      label: 'Measurement 1',
      width: unit === 'in' ? Math.round(fromInches(widthInInches, unit)) : Number(fromInches(widthInInches, unit).toFixed(2)),
      height: unit === 'in' ? Math.round(fromInches(heightInInches, unit)) : Number(fromInches(heightInInches, unit).toFixed(2)),
      unit
    }] : []
    const newArea = {
      id: uid('area'),
      name: chosenName,
      width: Number(widthInInches.toFixed(2)) || 0,
      height: Number(heightInInches.toFixed(2)) || 0,
      unit,
      measurementSets: initialSets,
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
      if (isManualQuantityMaterial(p.product) || p.isManualQuantity || p.quantityOverridden) return p
      if (Array.isArray(p.measurements) && p.measurements.length > 1) return p
      if (p.measurementSetId && targetArea.measurementSets && targetArea.measurementSets.length > 1) {
        const primarySetId = targetArea.measurementSets[0]?.id
        if (p.measurementSetId !== primarySetId) return p
      }
      const prodObj = findProductDef(p.product) || MATERIAL_PRODUCTS.find((x) => x.name === p.product) || { name: p.product, gst: p.gst, formula: 'standard' }
      const calc = calculateProduct(prodObj, newW, newH, { minimumArea: p.minimumArea })
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
        const calc = calculateProduct(prodObj, newW, newH, { minimumArea: draft.minimumArea })
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
        const calculated = calculateProduct(prodObj, wIn, hIn, { minimumArea: draft.minimumArea })
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
    const isManual = isManualQuantityMaterial(selectedProduct.name)
    const isStitching = isStitchingPanelProduct(selectedProduct.name)
    const isHardware = isHardwareProduct(selectedProduct.name)
    if (!isManual && !isStitching && !isHardware && (!effectiveCalcWidth || !effectiveCalcHeight)) {
      toast(`Add width and height for ${targetCalcArea.name} before calculating a material.`)
      setEditingDimensionsId(targetCalcArea.id)
      return
    }
    if ((isStitching || isHardware) && !effectiveCalcWidth) {
      toast(`Add width for ${targetCalcArea.name} before calculating ${selectedProduct.name}.`)
      setEditingDimensionsId(targetCalcArea.id)
      return
    }

    if (isManual) {
      if (draft.manualQuantity === undefined || draft.manualQuantity === '' || Number(draft.manualQuantity) <= 0) {
        toast(`Please enter a valid quantity for ${selectedProduct.name}.`)
        return
      }
      const validItemSets = (draft.itemMeasurements || []).filter(m => Number(m.width) > 0 && Number(m.height) > 0)
      const primaryW = validItemSets[0]?.width ? toInches(validItemSets[0].width, validItemSets[0].unit || effectiveCalcUnit) : effectiveCalcWidth
      const primaryH = validItemSets[0]?.height ? toInches(validItemSets[0].height, validItemSets[0].unit || effectiveCalcUnit) : effectiveCalcHeight
      const primaryUnit = validItemSets[0]?.unit || effectiveCalcUnit
      const measureSummary = formatItemMeasurementSummary({ measurements: validItemSets, width: primaryW, height: primaryH, unit: primaryUnit })
      const itemNote = selectedVariant?.label ? (draft.note ? `${selectedVariant.label}; ${draft.note}` : selectedVariant.label) : (draft.note || '')

      const manualItem = {
        id: uid('line'),
        area: targetCalcArea.name,
        product: selectedProduct.name,
        width: primaryW,
        height: primaryH,
        unit: primaryUnit,
        measurements: validItemSets,
        measurementSummary: measureSummary,
        quantity: Number(Number(draft.manualQuantity).toFixed(2)),
        quantityOverridden: true,
        isManualQuantity: true,
        unitPrice: Number(draft.price) || 0,
        gst: selectedProduct.gst,
        note: itemNote,
        variantLabel: selectedVariant?.label || ''
      }
      updateArea(targetCalcArea.id, { products: [...(targetCalcArea.products || []), manualItem] })
      toast(`${selectedProduct.name} added to ${targetCalcArea.name}${selectedVariant?.label ? ` (${selectedVariant.label})` : ''}.`)
      setDraft({
        ...draft,
        manualQuantity: '',
        itemMeasurements: [{ id: uid('mset'), label: 'Measurement 1', width: '', height: '', unit: targetCalcArea.unit || 'in' }]
      })
      setTimeout(() => {
        document.getElementById('area-card-' + targetCalcArea.id)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }, 100)
      return
    }

    const activeSet = selectedVariant || targetAreaSets[0] || {
      id: 'single',
      label: '',
      width: fromInches(effectiveCalcWidth, effectiveCalcUnit),
      height: fromInches(effectiveCalcHeight, effectiveCalcUnit),
      unit: effectiveCalcUnit
    }
    const setsToProcess = [activeSet]

    if (setsToProcess.length === 0) {
      toast(`Add valid width and height for ${targetCalcArea.name} before calculating.`)
      setEditingDimensionsId(targetCalcArea.id)
      return
    }

    const allAddedItems = []
    for (const vSet of setsToProcess) {
      const vUnit = vSet.unit || effectiveCalcUnit || 'in'
      const vWidthInches = toInches(vSet.width, vUnit)
      const vHeightInches = toInches(vSet.height, vUnit)
      const vLabel = vSet.label || ''
      const curtainSetId = isCurtainProduct(selectedProduct.name) ? uid('curtain-set') : ''
      const vMeasureSummary = formatItemMeasurementSummary({ width: vWidthInches, height: vHeightInches, unit: vUnit, variantLabel: vLabel })

      const calculated = calculateProduct(selectedProduct, vWidthInches, vHeightInches, draft)
      const lineNote = vLabel ? `${vLabel}: ${calculated.note}` : calculated.note
      allAddedItems.push({
        id: uid('line'),
        area: targetCalcArea.name,
        product: selectedProduct.name,
        width: vWidthInches,
        height: vHeightInches,
        unit: vUnit,
        measurementSetId: vSet.id,
        measurementSummary: vMeasureSummary,
        quantity: calculated.quantity,
        unitPrice: calculated.unitPrice,
        gst: selectedProduct.gst,
        note: lineNote,
        curtainSetId,
        clampType: isCurtainProduct(selectedProduct.name) ? (draft.clampType || '') : '',
        minimumArea: (selectedProduct.formula === 'blind-sqft' || isSquareFootBlind(selectedProduct.name) || selectedProduct.formula === 'roman') ? (Number(draft.minimumArea) || 11) : undefined,
        variantLabel: vLabel
      })
    }

    updateArea(targetCalcArea.id, { products: [...(targetCalcArea.products || []), ...allAddedItems] })
    toast(setsToProcess.length > 1
      ? `${selectedProduct.name} added for all ${setsToProcess.length} measurement sets in ${targetCalcArea.name}.`
      : `${selectedProduct.name} added to ${targetCalcArea.name}${selectedVariant?.label ? ` (${selectedVariant.label})` : ''}.`)
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
      if (isDesktopApp()) syncCloud()
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
            note: updated.note || '',
            isManualQuantity: updated.isManualQuantity,
            measurements: updated.measurements,
            measurementSummary: updated.measurementSummary,
            variantLabel: updated.variantLabel !== undefined ? updated.variantLabel : '',
            measurementSetId: updated.measurementSetId !== undefined ? updated.measurementSetId : ''
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
              note: updated.note || '',
              isManualQuantity: updated.isManualQuantity,
              measurements: updated.measurements,
              measurementSummary: updated.measurementSummary,
              variantLabel: updated.variantLabel !== undefined ? updated.variantLabel : p.variantLabel,
              measurementSetId: updated.measurementSetId !== undefined ? updated.measurementSetId : p.measurementSetId
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
  const totalSqFt = project.areas.reduce((sum, a) => sum + calculateMeasurementSetsCoverage(a).totalSqFt, 0)
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
                    const sets = getAreaMeasurementSets(item, project.staffDrafts)
                    if (sets[0]) setCalcVariantId(sets[0].id)
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
                    <small>
                      {(() => {
                        const { totalSqFt, validSets } = calculateMeasurementSetsCoverage(item, item.unit, project.staffDrafts)
                        if (validSets > 1) {
                          return `${validSets} sets · ${quantity(totalSqFt)} sq ft · ${count} items`
                        }
                        if (item.width && item.height) {
                          return `${fromInches(item.width, item.unit).toFixed(item.unit === 'in' ? 0 : 2)} × ${fromInches(item.height, item.unit).toFixed(item.unit === 'in' ? 0 : 2)} ${item.unit || 'in'} · ${count} items`
                        }
                        return `${count} items · Dimensions needed`
                      })()}
                    </small>
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
              <div className="target-area-selector" style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 600, color: '#0A4174' }}>
                  <span>Target Area:</span>
                  <select
                    style={{ minWidth: '160px', padding: '7px 10px', borderRadius: '6px', border: '1px solid #BDD8E9', background: '#fff', fontSize: '12px', color: '#001D39' }}
                    value={targetCalcArea?.id || ''}
                    onChange={(e) => {
                      const newAreaId = e.target.value
                      setCalcAreaId(newAreaId)
                      setAreaId?.(newAreaId)
                      const targetA = project.areas.find((a) => a.id === newAreaId)
                      const sets = targetA ? getAreaMeasurementSets(targetA, project.staffDrafts) : []
                      const firstSetId = sets[0]?.id || ''
                      setCalcVariantId(firstSetId)
                      if (sets[0] && (Number(sets[0].width) > 0 || Number(sets[0].height) > 0)) {
                        setDraft((prev) => ({
                          ...prev,
                          itemMeasurements: [{
                            id: uid('mset'),
                            label: sets[0].label || 'Measurement 1',
                            width: sets[0].width,
                            height: sets[0].height,
                            unit: sets[0].unit || targetA.unit || 'in'
                          }]
                        }))
                      }
                    }}
                  >
                    {project.areas.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </label>

                {targetCalcArea && (
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 600, color: '#0A4174' }}>
                    <span>Measurement Set:</span>
                    {targetAreaSets.length === 0 ? (
                      <select
                        style={{ minWidth: '180px', padding: '7px 10px', borderRadius: '6px', border: '1px solid #BDD8E9', background: '#fff', fontSize: '12px', color: '#001D39' }}
                        value="no-sets"
                        onChange={(e) => {
                          if (e.target.value === '__new_set__') {
                            handleAddNewMeasurementSet(targetCalcArea.id)
                          }
                        }}
                      >
                        <option value="no-sets">No dimensions yet</option>
                        <option value="__new_set__">+ Add measurement set for {targetCalcArea.name}…</option>
                      </select>
                    ) : (
                      <select
                        style={{ minWidth: '220px', padding: '7px 10px', borderRadius: '6px', border: '1px solid #BDD8E9', background: '#fff', fontSize: '12px', color: '#001D39' }}
                        value={selectedVariant?.id || targetAreaSets[0]?.id || ''}
                        onChange={(e) => {
                          if (e.target.value === '__new_set__') {
                            handleAddNewMeasurementSet(targetCalcArea.id)
                            return
                          }
                          const newVarId = e.target.value
                          setCalcVariantId(newVarId)
                          const v = targetAreaSets.find((s) => String(s.id) === String(newVarId))
                          if (v && (Number(v.width) > 0 || Number(v.height) > 0)) {
                            setDraft((prev) => ({
                              ...prev,
                              itemMeasurements: [{
                                id: uid('mset'),
                                label: v.label || 'Measurement 1',
                                width: v.width,
                                height: v.height,
                                unit: v.unit || targetCalcArea.unit || 'in'
                              }]
                            }))
                          }
                        }}
                      >
                        {targetAreaSets.map((s, idx) => {
                          const sqft = (Number(s.width) > 0 && Number(s.height) > 0)
                            ? ((toInches(s.width, s.unit || targetCalcArea.unit || 'in') / 12) * (toInches(s.height, s.unit || targetCalcArea.unit || 'in') / 12)).toFixed(2)
                            : null
                          const dimText = s.width && s.height ? `${s.width} × ${s.height} ${s.unit || targetCalcArea.unit || 'in'}${sqft ? ` (${sqft} sq ft)` : ''}` : 'No dimensions'
                          return (
                            <option key={s.id || idx} value={s.id}>
                              #{idx + 1} {s.label || `Measurement ${idx + 1}`}: {dimText}
                            </option>
                          )
                        })}
                        <option value="__new_set__">+ Add new measurement set for {targetCalcArea.name}…</option>
                      </select>
                    )}
                  </label>
                )}

                {targetCalcArea && (
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                    {selectedVariant && (
                      <span className="selected-variant-chip" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#eef6fa', border: '1px solid #BDD8E9', color: '#0A4174', padding: '3px 8px', borderRadius: '5px', fontSize: '12px', fontWeight: 600 }}>
                        <Ruler size={12} />
                        {selectedVariant.label || 'Set'}: {selectedVariant.width} × {selectedVariant.height} {selectedVariant.unit || targetCalcArea.unit || 'in'}
                        <button
                          type="button"
                          className="measure-chip-rename-btn"
                          title={`Rename "${selectedVariant.label || 'Set'}"`}
                          onClick={(e) => {
                            e.stopPropagation()
                            setRenamingMeasurement({ areaId: targetCalcArea.id, set: selectedVariant })
                          }}
                        >
                          <Pencil size={11} />
                        </button>
                      </span>
                    )}
                    <button
                      type="button"
                      className="button secondary small"
                      onClick={() => setEditingDimensionsId(editingDimensionsId === targetCalcArea.id ? null : targetCalcArea.id)}
                      title={'Edit dimensions for ' + targetCalcArea.name}
                    >
                      <Ruler size={13} />
                      {targetCalcArea.width && targetCalcArea.height ? 'Adjust dimensions' : 'Enter dimensions'}
                    </button>
                    <button
                      type="button"
                      className="button secondary small"
                      onClick={() => handleAddNewMeasurementSet(targetCalcArea.id)}
                      title={'Record a new measurement set for ' + targetCalcArea.name + ' (retains existing)'}
                    >
                      <Plus size={13} />
                      <span>Add measurement set</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="area-empty-materials" style={{ marginBottom: '14px' }}>
                <p>Add a project area first to begin calculating and adding materials.</p>
              </div>
            )}

            {/* Inline drawer if editing dimensions from within the calculator */}
            {editingDimensionsId === targetCalcArea?.id && (
              <div style={{ margin: '14px 0' }}>
                <AreaDimensionDrawer
                  area={targetCalcArea}
                  onSaveAreaMeasurements={handleSaveAreaMeasurements}
                  onChangeDimension={changeDimension}
                  onChangeUnit={changeUnit}
                  staffEntriesCount={(project.staffDrafts || []).filter(item => (item.area || '').toLowerCase() === targetCalcArea.name.toLowerCase()).length}
                  onSyncToStaff={() => syncAreaDimensionsToStaff(targetCalcArea)}
                  onRenameMeasurement={(info) => setRenamingMeasurement(info)}
                  onClose={() => setEditingDimensionsId(null)}
                />
              </div>
            )}

            <div className="product-controls">
              <label className="field product-select" style={{ gridColumn: isManualQuantityMaterial(draft.product) ? '1 / -1' : undefined }}>
                <span>Product / material</span>
                <select value={draft.product} onChange={(e) => {
                  const nextProduct = PRODUCTS.find((item) => item.name === e.target.value)
                  setDraft({ ...draft, product: e.target.value, clampType: (nextProduct?.curtainSystem || isCurtainProduct(e.target.value)) ? draft.clampType : '' })
                }}>
                  {PRODUCTS.map((item) => <option key={item.name}>{item.name}</option>)}
                </select>
              </label>

              {/* Optional Measurements Panel for the 16 manual materials */}
              {isManualQuantityMaterial(draft.product) && (
                <div className="calc-manual-panel" style={{ gridColumn: '1 / -1', marginTop: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Ruler size={14} color="#059669" />
                      <strong style={{ fontSize: '13px', color: '#072218' }}>Measurements (Optional)</strong>
                      <span style={{ fontSize: '11px', color: '#587163' }}>— reflects in area & materials section only</span>
                    </div>
                    <button
                      type="button"
                      className="button secondary compact"
                      onClick={() => {
                        const currentSets = Array.isArray(draft.itemMeasurements) && draft.itemMeasurements.length > 0
                          ? draft.itemMeasurements
                          : []
                        const newSet = {
                          id: uid('mset'),
                          label: `Measurement ${currentSets.length + 1}`,
                          width: '',
                          height: '',
                          unit: targetCalcArea?.unit || 'in'
                        }
                        setDraft({ ...draft, itemMeasurements: [...currentSets, newSet] })
                      }}
                    >
                      <Plus size={12} />Add measurement set
                    </button>
                  </div>

                  {/* Quick-fill chips from target area's existing measurement sets */}
                  {targetCalcArea && getAreaMeasurementSets(targetCalcArea).length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
                      <span style={{ fontSize: '11px', color: '#64748b' }}>Use {targetCalcArea.name} set:</span>
                      {getAreaMeasurementSets(targetCalcArea).map((s, idx) => {
                        if (!s.width || !s.height) return null
                        return (
                          <button
                            type="button"
                            key={s.id || idx}
                            className="quick-dim-chip"
                            onClick={() => {
                              setDraft({
                                ...draft,
                                itemMeasurements: [{
                                  id: uid('mset'),
                                  label: s.label || `Set ${idx + 1}`,
                                  width: s.width,
                                  height: s.height,
                                  unit: s.unit || targetCalcArea.unit || 'in'
                                }]
                              })
                            }}
                          >
                            {s.label || `Set ${idx + 1}`}: {s.width} × {s.height} {s.unit || targetCalcArea.unit || 'in'}
                          </button>
                        )
                      })}
                    </div>
                  )}

                  {/* Measurement sets inputs */}
                  <div className="msets-container" style={{ margin: '6px 0 12px 0' }}>
                    {(Array.isArray(draft.itemMeasurements) && draft.itemMeasurements.length > 0
                      ? draft.itemMeasurements
                      : [{ id: uid('mset'), label: 'Measurement 1', width: '', height: '', unit: targetCalcArea?.unit || 'in' }]
                    ).map((set, sIdx, allSets) => {
                      const sqft = (Number(set.width) > 0 && Number(set.height) > 0)
                        ? ((toInches(set.width, set.unit || 'in') / 12) * (toInches(set.height, set.unit || 'in') / 12)).toFixed(2)
                        : null
                      return (
                        <div key={set.id || sIdx} className="mset-row">
                          <input
                            className="mset-label-input"
                            value={set.label || `Measurement ${sIdx + 1}`}
                            placeholder={`Set ${sIdx + 1}`}
                            onChange={(e) => {
                              const updated = allSets.map(s => s.id === set.id ? { ...s, label: e.target.value } : s)
                              setDraft({ ...draft, itemMeasurements: updated })
                            }}
                          />
                          <div className="mset-inputs">
                            <div className="mset-field">
                              <input
                                type="number"
                                min="0"
                                step="any"
                                inputMode="decimal"
                                placeholder="Width (opt)"
                                value={set.width ?? ''}
                                onFocus={(e) => e.target.select?.()}
                                onWheel={(e) => e.target.blur()}
                                onChange={(e) => {
                                  const updated = allSets.map(s => s.id === set.id ? { ...s, width: e.target.value } : s)
                                  setDraft({ ...draft, itemMeasurements: updated })
                                }}
                              />
                              <small>{set.unit || targetCalcArea?.unit || 'in'}</small>
                            </div>
                            <span className="times" style={{ padding: 0, fontSize: '16px' }}>×</span>
                            <div className="mset-field">
                              <input
                                type="number"
                                min="0"
                                step="any"
                                inputMode="decimal"
                                placeholder="Height (opt)"
                                value={set.height ?? ''}
                                onFocus={(e) => e.target.select?.()}
                                onWheel={(e) => e.target.blur()}
                                onChange={(e) => {
                                  const updated = allSets.map(s => s.id === set.id ? { ...s, height: e.target.value } : s)
                                  setDraft({ ...draft, itemMeasurements: updated })
                                }}
                              />
                              <small>{set.unit || targetCalcArea?.unit || 'in'}</small>
                            </div>
                            <select
                              className="mset-unit-select"
                              value={set.unit || targetCalcArea?.unit || 'in'}
                              onChange={(e) => {
                                const updated = allSets.map(s => s.id === set.id ? { ...s, unit: e.target.value } : s)
                                setDraft({ ...draft, itemMeasurements: updated })
                              }}
                            >
                              <option value="in">in</option>
                              <option value="ft">ft</option>
                              <option value="m">m</option>
                              <option value="cm">cm</option>
                            </select>
                            {sqft && <span className="mset-sqft-tag">{sqft} sq ft</span>}
                            {allSets.length > 1 && (
                              <button
                                type="button"
                                className="area-action-btn danger"
                                title="Remove measurement set"
                                onClick={() => {
                                  const updated = allSets.filter(s => s.id !== set.id)
                                  setDraft({ ...draft, itemMeasurements: updated })
                                }}
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {(selectedProduct.curtainSystem || isCurtainProduct(selectedProduct.name)) && (
                <label className="field product-select">
                  <span>Mounting clamp <small>(optional)</small></span>
                  <select value={draft.clampType} onChange={(e) => setDraft({ ...draft, clampType: e.target.value })}>
                    <option value="">Select a clamp type</option>
                    {CLAMP_OPTIONS.map((name) => <option key={name} value={name}>{name}</option>)}
                  </select>
                  <small>Clamp options are available only for curtain systems and are not regular material choices.</small>
                </label>
              )}

              {isManualQuantityMaterial(draft.product) ? (
                <>
                  <Field
                    label={`Manual Quantity (${unitLabel(draft.product)})`}
                    type="number"
                    step="any"
                    min="0"
                    placeholder={`Enter quantity in ${unitLabel(draft.product)}`}
                    value={draft.manualQuantity}
                    onChange={(e) => setDraft({ ...draft, manualQuantity: e.target.value })}
                    required
                  />
                  <Field
                    label={`MRP per ${unitLabel(draft.product)} (₹)`}
                    type="number"
                    min="0"
                    placeholder="Enter MRP per unit"
                    value={draft.price}
                    onChange={(e) => setDraft({ ...draft, price: e.target.value })}
                    required
                  />
                </>
              ) : selectedProduct.formula === 'roman' ? (
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
              ) : (selectedProduct.formula === 'blind-sqft' || isSquareFootBlind(selectedProduct.name)) ? (
                <div className="blind-controls">
                  <Field
                    label={`MRP per ${unitLabel(draft.product)} (₹)`}
                    type="number"
                    min="0"
                    placeholder="Enter MRP per unit"
                    value={draft.price}
                    onChange={(e) => setDraft({ ...draft, price: e.target.value })}
                    required
                  />
                  <label className="field">
                    <span>Minimum chargeable area</span>
                    <select value={draft.minimumArea || 11} onChange={(e) => setDraft({ ...draft, minimumArea: e.target.value })}>
                      <option value="11">11 sq ft</option>
                      <option value="16.5">16.5 sq ft</option>
                    </select>
                  </label>
                </div>
              ) : (
                <Field label="MRP per unit" type="number" value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })} />
              )}
            </div>

            {isManualQuantityMaterial(draft.product) ? (
              <div className="calculation-result">
                <div>
                  <span>Manual quantity & measurements</span>
                  <strong>
                    {draft.manualQuantity ? `${draft.manualQuantity} ` : '— '}<small>{unitLabel(draft.product)}</small>
                  </strong>
                  <p>
                    {(() => {
                      const validSets = (draft.itemMeasurements || []).filter(m => Number(m.width) > 0 && Number(m.height) > 0)
                      if (validSets.length > 0) {
                        return formatItemMeasurementSummary({ measurements: validSets }) + ' (Measurement optional)'
                      }
                      return 'Measurement is optional. Quantity and MRP per unit are manually entered.'
                    })()}
                  </p>
                </div>
                <div>
                  <span>MRP per {unitLabel(draft.product)}</span>
                  <strong>{draft.price ? currency(draft.price) : '₹0'}</strong>
                  <p>GST {selectedProduct.gst}% applicable · {draft.manualQuantity && draft.price ? `Line Total: ${currency(Number(draft.manualQuantity) * Number(draft.price))}` : 'Enter quantity and rate'}</p>
                </div>
                <button
                  className="button primary"
                  onClick={addMaterial}
                  disabled={!targetCalcArea || !draft.manualQuantity || Number(draft.manualQuantity) <= 0}
                >
                  <Plus size={16} />Add {draft.product} to {targetCalcArea?.name || 'Area'}{selectedVariant?.label ? ` (${selectedVariant.label})` : ''}
                </button>
              </div>
            ) : (
              <div className="calculation-result">
                <div>
                  <span>{selectedProduct.curtainSystem ? 'Quantity per curtain line' : 'Calculated quantity'}</span>
                  <strong>
                    {quantity(preview?.quantity)} <small>{unitLabel(selectedProduct.name)}</small>
                  </strong>
                  <p>{selectedProduct.curtainSystem ? 'Adds main curtain, sheer and lining together. ' + (preview?.note || '') : (preview?.note || (targetCalcArea ? 'Add measurements to calculate' : 'Select an area'))}</p>
                  {isStitchingPanelProduct(selectedProduct.name) ? (
                    <div style={{ marginTop: '4px', fontSize: '11px', color: '#0A4174', fontWeight: 600 }}>
                      {/american/i.test(selectedProduct.name) ? 'Formula: ⌈W / 18⌉ panels'
                        : /valence|velance|valance/i.test(selectedProduct.name) ? 'Formula: ⌈(W + 14) / 50⌉ panels'
                        : 'Formula: ⌈W / 20⌉ panels'}
                    </div>
                  ) : isHardwareProduct(selectedProduct.name) ? (
                    <div style={{ marginTop: '4px', fontSize: '11px', color: '#0A4174', fontWeight: 600 }}>
                      {/track/i.test(selectedProduct.name) ? 'Formula: ⌈W / 12⌉ running feet'
                        : /runner|hook/i.test(selectedProduct.name) ? 'Formula: ⌈W / 12⌉ × 3 pcs'
                        : 'Formula: ⌈(⌈W / 12⌉) / 2⌉ pcs'}
                    </div>
                  ) : (selectedProduct.formula === 'blind-sqft' || isSquareFootBlind(selectedProduct.name)) ? (
                    <div style={{ marginTop: '4px', fontSize: '11px', color: '#0A4174', fontWeight: 600 }}>
                      Formula: round(W/12) × round(H/12) sq ft (Min. {draft.minimumArea || 11} sq ft)
                    </div>
                  ) : (selectedProduct.formula === 'eyelet' || selectedProduct.formula === 'ripple' || /eyelet|eylet|ripple/i.test(selectedProduct.name)) ? (
                    <div style={{ marginTop: '4px', fontSize: '11px', color: '#0A4174', fontWeight: 600 }}>
                      Formula: ⌈W / 20⌉ × ((H + 15) / 39)
                    </div>
                  ) : null}
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
                  <Plus size={16} />{selectedProduct.curtainSystem ? 'Add curtain set to ' : 'Add to '}{targetCalcArea?.name || 'Area'}{selectedVariant?.label ? ` (${selectedVariant.label})` : ''}
                </button>
              </div>
            )}
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
                          {(() => {
                            const { totalSqFt: cov, validSets } = calculateMeasurementSetsCoverage(area, area.unit, project.staffDrafts)
                            if (validSets > 1) {
                              return `${validSets} measurement sets · ${quantity(cov)} sq ft`
                            }
                            if (area.width && area.height) {
                              return `${fromInches(area.width, area.unit).toFixed(area.unit === 'in' ? 0 : 2)} × ${fromInches(area.height, area.unit).toFixed(area.unit === 'in' ? 0 : 2)} ${area.unit} · ${quantity(cov)} sq ft`
                            }
                            return 'Dimensions needed'
                          })()}
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
                        className="button small secondary"
                        onClick={() => handleAddNewMeasurementSet(area.id)}
                        title={'Add a new measurement set for ' + area.name + ' (retains existing)'}
                      >
                        <Plus size={13} /><span>Add measurement set</span>
                      </button>

                      <button
                        type="button"
                        className="button small primary"
                        onClick={() => {
                          setCalcAreaId(area.id)
                          setAreaId?.(area.id)
                          const sets = getAreaMeasurementSets(area, project.staffDrafts)
                          if (sets[0]) setCalcVariantId(sets[0].id)
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
                  {editingDimensionsId === area.id ? (
                    <AreaDimensionDrawer
                      area={area}
                      onSaveAreaMeasurements={handleSaveAreaMeasurements}
                      onChangeDimension={changeDimension}
                      onChangeUnit={changeUnit}
                      staffEntriesCount={thisAreaStaffDrafts.length}
                      onSyncToStaff={() => syncAreaDimensionsToStaff(area)}
                      onRenameMeasurement={(info) => setRenamingMeasurement(info)}
                      onClose={() => setEditingDimensionsId(null)}
                    />
                  ) : (
                    (() => {
                      const areaSets = getAreaMeasurementSets(area, project.staffDrafts)
                      const { totalSqFt: cov, validSets } = calculateMeasurementSetsCoverage(areaSets, area.unit)
                      if (areaSets.length === 0) return null
                      return (
                        <div className="area-measurements-panel">
                          <div className="area-measurements-panel-header">
                            <div className="area-measurements-summary">
                              <Ruler size={13} />
                              <strong>Area Measurements</strong>
                              <span>— {areaSets.length} {areaSets.length === 1 ? 'opening / set' : 'openings / sets'} · <b>{quantity(cov)} sq ft</b> total</span>
                            </div>
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                              <button
                                type="button"
                                className="button small secondary"
                                onClick={() => setEditingDimensionsId(area.id)}
                                style={{ padding: '3px 8px', fontSize: '11px', height: '26px' }}
                                title={'Edit existing measurements for ' + area.name}
                              >
                                <Pencil size={11} /> Edit measurements
                              </button>
                              <button
                                type="button"
                                className="button small secondary"
                                onClick={() => handleAddNewMeasurementSet(area.id)}
                                style={{ padding: '3px 8px', fontSize: '11px', height: '26px', background: '#eef6fa', borderColor: '#BDD8E9', color: '#0A4174' }}
                                title={'Record a new measurement set for ' + area.name + ' (retains existing)'}
                              >
                                <Plus size={11} /> Add measurement set
                              </button>
                            </div>
                          </div>
                          <div className="area-measurements-grid">
                            {areaSets.map((s, sIdx) => {
                              const sqft = (Number(s.width) > 0 && Number(s.height) > 0)
                                ? ((toInches(s.width, s.unit || area.unit || 'in') / 12) * (toInches(s.height, s.unit || area.unit || 'in') / 12)).toFixed(2)
                                : null
                              return (
                                <div
                                  key={s.id || sIdx}
                                  className="area-measure-item-chip"
                                  style={{ cursor: 'pointer' }}
                                  title={`Use ${s.label || `Measurement ${sIdx + 1}`} in calculator`}
                                  onClick={() => {
                                    setCalcAreaId(area.id)
                                    setAreaId?.(area.id)
                                    setCalcVariantId(s.id)
                                    setShowCalculator(true)
                                    document.getElementById('material-calculator')?.scrollIntoView({ behavior: 'smooth' })
                                  }}
                                >
                                  <span className="measure-chip-num">#{sIdx + 1}</span>
                                  <div className="measure-chip-body">
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
                                      <strong>{s.label || `Measurement ${sIdx + 1}`}</strong>
                                      <button
                                        type="button"
                                        className="measure-chip-rename-btn"
                                        title={`Rename "${s.label || `Measurement ${sIdx + 1}`}"`}
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          setRenamingMeasurement({ areaId: area.id, set: s })
                                        }}
                                      >
                                        <Pencil size={11} />
                                      </button>
                                    </div>
                                    <span>
                                      {s.width && s.height ? `${s.width} × ${s.height} ${s.unit || area.unit || 'in'}` : 'Dimensions needed'}
                                      {sqft && <span className="measure-chip-sqft">{sqft} sq ft</span>}
                                    </span>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })()
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
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                    <strong>{item.product}</strong>
                                    {item.variantLabel && (
                                      <span className="selected-variant-chip" style={{ fontSize: '11px', padding: '1px 6px', background: '#eef3ed', color: '#385a3e', borderRadius: '4px', border: '1px solid #d5e5d3' }}>
                                        {item.variantLabel}
                                      </span>
                                    )}
                                  </div>
                                  {(item.measurementSummary || formatItemMeasurementSummary(item)) && (
                                    <div className="material-measure-badge">
                                      <Ruler size={11} />
                                      <span>{item.measurementSummary || formatItemMeasurementSummary(item)}</span>
                                    </div>
                                  )}
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
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                    <strong>{item.product}</strong>
                                    {item.variantLabel && (
                                      <span className="selected-variant-chip" style={{ fontSize: '11px', padding: '1px 6px', background: '#eef3ed', color: '#385a3e', borderRadius: '4px', border: '1px solid #d5e5d3' }}>
                                        {item.variantLabel}
                                      </span>
                                    )}
                                  </div>
                                  {(item.measurementSummary || formatItemMeasurementSummary(item)) && (
                                    <div className="material-measure-badge">
                                      <Ruler size={11} />
                                      <span>{item.measurementSummary || formatItemMeasurementSummary(item)}</span>
                                    </div>
                                  )}
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
      {renamingMeasurement && (
        <RenameMeasurementModal
          areaId={renamingMeasurement.areaId}
          measurementSet={renamingMeasurement.set}
          onClose={() => setRenamingMeasurement(null)}
          onSave={handleRenameMeasurement}
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

function isDiscountLine(line) {
  if (!line) return false
  if (line.isDiscount) return true
  const p = String(line.product || '').toLowerCase().trim()
  return p === 'discount' || p.includes('discount')
}

function isAccessoryOrServiceLine(line) {
  if (!line || isDiscountLine(line)) return false
  if (line.isAutoHardware) return true
  const area = (line.area || '').toLowerCase().trim()
  if (area === 'hardware' || area === 'services' || area === 'installation' || area === 'stitching' || area === 'delivery') return true
  const p = (line.product || '').toLowerCase().trim()
  if (p === 'track' || p === 'tracks' || p.includes('track') || p.includes('rod')) return true
  if (p === 'runners' || p === 'runner' || (p.includes('runner') && !p.includes('fabric'))) return true
  if (p === 'hooks' || p === 'hook' || p.includes('hook')) return true
  if (p.includes('clamp') || CLAMP_OPTIONS.some((c) => c.toLowerCase() === p)) return true
  if (
    p === 'american stitching' ||
    p === 'valence stitching' ||
    p === 'velance stitching' ||
    p === 'valance stitching' ||
    p === 'eyelet stitching' ||
    p === 'ripple stitching' ||
    isStitchingPanelProduct(p) ||
    p.includes('stitching') ||
    p.includes('making')
  ) return true
  if (p.includes('installation') || p.includes('fitting')) return true
  if (p.includes('delivery') || p.includes('transport') || p.includes('shipping') || p.includes('freight')) return true
  return false
}

function isInstallationServiceLine(line) {
  if (!line) return false
  if (line.isInstallationService) return true
  const p = (line.product || '').toLowerCase().trim()
  return p === 'installation' || p.includes('installation') || p === 'fitting'
}

function isDeliveryServiceLine(line) {
  if (!line) return false
  if (line.isDeliveryService) return true
  const p = (line.product || '').toLowerCase().trim()
  return p === 'delivery' || p.includes('delivery') || p === 'transport' || p === 'shipping' || p === 'freight'
}

function isBlindProduct(name) {
  if (!name) return false
  const p = String(name).toLowerCase().trim()
  return p.includes('blind') || p.includes('roman') || p.includes('roller') ||
    p.includes('zebra') || p.includes('venetian') || p.includes('monsoon')
}

// Formula: Installation will be number of tracks plus number of roman blind or roller or any other blinds
function calculateInstallationBreakdown(items = [], project = null) {
  let numTracks = 0
  let numBlinds = 0

  if (project?.areas && project.areas.length > 0) {
    for (const area of project.areas) {
      const areaCurtains = (area.products || []).filter((p) => isCurtainProduct(p.product))
      if (areaCurtains.length > 0) {
        const groups = new Map()
        for (const c of areaCurtains) {
          const pName = String(c.product || '').toLowerCase()
          if (pName.includes('lining')) continue
          const key = c.curtainSetId || c.measurementSetId || c.variantLabel || 'default'
          if (!groups.has(key)) groups.set(key, [])
          groups.get(key).push(c)
        }
        for (const [, grp] of groups) {
          const hasMain = grp.some((i) => i.product.toLowerCase().includes('main') || (!i.product.toLowerCase().includes('sheer')))
          const hasSheer = grp.some((i) => i.product.toLowerCase().includes('sheer'))
          const hasDouble = grp.some((i) => (i.clampType || '').toLowerCase().includes('double'))
          if (hasDouble || (hasMain && hasSheer)) {
            numTracks += 2
          } else {
            numTracks += 1
          }
        }
      }

      for (const p of area.products || []) {
        if (isBlindProduct(p.product)) {
          const mCount = Array.isArray(p.measurements)
            ? p.measurements.filter((m) => Number(m.width) > 0 || Number(m.height) > 0).length
            : 0
          numBlinds += (mCount > 0 ? mCount : 1)
        }
      }
    }

    for (const d of project.staffDrafts || []) {
      const p = String(d.product || '').toLowerCase()
      if (isBlindProduct(p)) {
        numBlinds += 1
      } else if (isCurtainProduct(p) && !p.includes('lining')) {
        numTracks += 1
      }
    }
  } else {
    const curtainItems = (items || []).filter((i) => isCurtainProduct(i.product) && !String(i.product).toLowerCase().includes('lining'))
    const blindItems = (items || []).filter((i) => isBlindProduct(i.product))

    const areaCurtainMap = new Map()
    for (const it of curtainItems) {
      const key = (it.area || 'default') + '::' + (it.variantLabel || 'set1')
      if (!areaCurtainMap.has(key)) areaCurtainMap.set(key, [])
      areaCurtainMap.get(key).push(it)
    }
    for (const [, grp] of areaCurtainMap) {
      const hasMain = grp.some((i) => i.product.toLowerCase().includes('main'))
      const hasSheer = grp.some((i) => i.product.toLowerCase().includes('sheer'))
      if (hasMain && hasSheer) numTracks += 2
      else numTracks += 1
    }

    for (const it of blindItems) {
      const mCount = Array.isArray(it.measurements)
        ? it.measurements.filter((m) => Number(m.width) > 0 || Number(m.height) > 0).length
        : 0
      numBlinds += (mCount > 0 ? mCount : 1)
    }
  }

  if (numTracks === 0) {
    const trackItem = (items || []).find((i) => (i.product || '').toLowerCase().trim() === 'track')
    if (trackItem) {
      const runningFt = Number(trackItem.quantity) || 0
      numTracks = Math.max(1, Math.round(runningFt / 10))
    }
  }

  return {
    numTracks,
    numBlinds,
    totalInstallation: numTracks + numBlinds
  }
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
        const clampQty = Math.ceil(trackFeet / 2)
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
      const clampQty = Math.ceil(trackFeet / 2)
      clampCounts[item.clampType] = (clampCounts[item.clampType] || 0) + clampQty
    }
  }

  if (totalTrackFeet <= 0) return []

  const hardware = [
    {
      id: 'hardware-unified-track',
      area: 'Hardware',
      product: 'Tracks',
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
      if (key === 'tracks' || key === 'track') { key = 'tracks'; p = 'Tracks' }
      if (key === 'runner') { key = 'runners'; p = 'Runners' }
      if (key === 'hook') { key = 'hooks'; p = 'Hooks' }
      if (key === 'tracks') { p = 'Tracks' }
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
  let items = unifyQuoteItems([...regularItems, ...hardware])
  if (!items.length) { toast('Add at least one material line before creating a quotation.'); return }

  const breakdown = calculateInstallationBreakdown(items, project)
  if (breakdown.totalInstallation > 0) {
    items.push({
      id: uid('line'),
      area: 'Services',
      product: 'Installation',
      quantity: breakdown.totalInstallation,
      unitPrice: 0,
      gst: 18,
      isInstallationService: true,
      note: `Calculated: ${breakdown.totalInstallation} units (${breakdown.numTracks} tracks + ${breakdown.numBlinds} blinds)`
    })
  }

  // Default discount line ready for manual input
  items.push({
    id: uid('line'),
    area: 'Billing',
    product: 'Discount',
    quantity: 1,
    unitPrice: 0,
    gst: 0,
    isDiscount: true,
    note: 'Manual discount on untaxed amount'
  })

  const existingClean = mergeDuplicateQuotations(project.quotations || [])
  const number = nextQuotationId(existingClean)
  const draftIndex = existingClean.length + 1
  const newDraft = {
    id: number,
    title: `Draft ${draftIndex}`,
    date: today(),
    status: 'Draft',
    discount: 0,
    items
  }
  patchProject({ quotations: [...existingClean, newDraft] })
  onCreated?.(number)
  toast(`${number} (Draft ${draftIndex}) created with installation service calculated.`)
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

  // Fast in-memory working items state to eliminate typing input lag
  const [workingItems, setWorkingItems] = useState(() => quote?.items || [])
  const workingItemsRef = useRef(workingItems)
  const pendingPatchTimerRef = useRef(null)

  useEffect(() => {
    if (pendingPatchTimerRef.current) {
      clearTimeout(pendingPatchTimerRef.current)
      pendingPatchTimerRef.current = null
    }
    const nextItems = quote?.items || []
    setWorkingItems(nextItems)
    workingItemsRef.current = nextItems
  }, [quote?.id, quote?.items])

  const flushPendingQuoteUpdates = useCallback(() => {
    if (pendingPatchTimerRef.current) {
      clearTimeout(pendingPatchTimerRef.current)
      pendingPatchTimerRef.current = null
      const currentItems = workingItemsRef.current
      if (!quote) return
      patchProject({
        quotations: cleanQuotations.map((item) => {
          if (item.id !== quote.id) return item
          const discLine = currentItems.find((l) => isDiscountLine(l))
          return {
            ...item,
            discount: discLine ? (Number(discLine.unitPrice) || 0) : item.discount,
            items: currentItems
          }
        })
      })
    }
  }, [cleanQuotations, quote, patchProject])

  useEffect(() => {
    return () => {
      if (pendingPatchTimerRef.current) {
        clearTimeout(pendingPatchTimerRef.current)
        pendingPatchTimerRef.current = null
        const currentItems = workingItemsRef.current
        if (!quote) return
        patchProject({
          quotations: cleanQuotations.map((item) => {
            if (item.id !== quote.id) return item
            const discLine = currentItems.find((l) => isDiscountLine(l))
            return {
              ...item,
              discount: discLine ? (Number(discLine.unitPrice) || 0) : item.discount,
              items: currentItems
            }
          })
        })
      }
    }
  }, [cleanQuotations, quote, patchProject])

  const switchDraft = useCallback((nextId) => {
    if (!nextId || nextId === quoteId) return
    flushPendingQuoteUpdates()
    setQuoteId(nextId)
  }, [flushPendingQuoteUpdates, quoteId])

  const activeWorkingQuote = useMemo(() => {
    if (!quote) return quote
    const discLine = workingItems.find((l) => isDiscountLine(l))
    return {
      ...quote,
      discount: discLine ? (Number(discLine.unitPrice) || 0) : quote.discount,
      items: workingItems
    }
  }, [quote, workingItems])

  // Arrow key draft toggling when not typing in form fields
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return
      if (cleanQuotations.length <= 1) return

      if (e.key === 'ArrowLeft' && (e.altKey || !e.ctrlKey)) {
        if (currentIndex > 0) {
          e.preventDefault()
          switchDraft(cleanQuotations[currentIndex - 1].id)
        }
      } else if (e.key === 'ArrowRight' && (e.altKey || !e.ctrlKey)) {
        if (currentIndex < cleanQuotations.length - 1) {
          e.preventDefault()
          switchDraft(cleanQuotations[currentIndex + 1].id)
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [cleanQuotations, currentIndex, switchDraft])

  const deleteQuotation = (idToDelete) => {
    flushPendingQuoteUpdates()
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
    flushPendingQuoteUpdates()
    const trimmed = newTitle.trim()
    patchProject({
      quotations: cleanQuotations.map((item) =>
        item.id === quote.id ? { ...item, title: trimmed } : item
      )
    })
    setEditingTitle(false)
    toast(`Draft updated: ${trimmed || quote.id}`)
  }

  const editLine = useCallback((lineId, change) => {
    setWorkingItems((prevItems) => {
      let matched = false
      const updated = prevItems.map((line) => {
        if (line.id === lineId) {
          matched = true
          return { ...line, ...change }
        }
        return line
      })
      let finalItems = updated
      if (!matched && String(lineId).startsWith('hardware-unified-')) {
        const key = String(lineId).replace('hardware-unified-', '').replace(/-/g, ' ')
        finalItems = prevItems.map((line) => {
          if (isHardwareLine(line) && line.product?.toLowerCase().includes(key)) {
            return { ...line, ...change }
          }
          return line
        })
      }
      workingItemsRef.current = finalItems
      return finalItems
    })

    if (pendingPatchTimerRef.current) clearTimeout(pendingPatchTimerRef.current)
    pendingPatchTimerRef.current = setTimeout(() => {
      flushPendingQuoteUpdates()
    }, 700)
  }, [flushPendingQuoteUpdates])

  const deleteLine = useCallback((lineId) => {
    flushPendingQuoteUpdates()
    const target = quote?.items?.find((i) => i.id === lineId)
    const updatedQuotations = cleanQuotations.map((item) => {
      if (item.id !== quote.id) return item
      if (target && isInstallationServiceLine(target)) {
        return { ...item, items: (item.items || []).filter((l) => l.id !== lineId && !isInstallationServiceLine(l)) }
      }
      if (target && isDeliveryServiceLine(target)) {
        return { ...item, items: (item.items || []).filter((l) => l.id !== lineId && !isDeliveryServiceLine(l)) }
      }
      if (target && isDiscountLine(target)) {
        return { ...item, discount: 0, items: (item.items || []).filter((l) => l.id !== lineId && !isDiscountLine(l)) }
      }
      return { ...item, items: (item.items || []).filter((line) => line.id !== lineId) }
    })
    patchProject({ quotations: updatedQuotations })
    const currentQ = updatedQuotations.find((q) => q.id === quote?.id)
    if (currentQ) {
      setWorkingItems(currentQ.items || [])
      workingItemsRef.current = currentQ.items || []
    }
    toast(target?.product ? `${target.product} removed from quotation.` : 'Item removed from quotation.')
  }, [cleanQuotations, quote, patchProject, toast, flushPendingQuoteUpdates])

  const addServiceLine = useCallback((productName, defaultQuantity = 1, defaultPrice = 0, defaultNote = '') => {
    flushPendingQuoteUpdates()
    const isInst = isInstallationServiceLine({ product: productName })
    const isDel = isDeliveryServiceLine({ product: productName })
    const isDisc = isDiscountLine({ product: productName })
    const newLine = {
      id: uid('line'),
      area: isDisc ? 'Billing' : 'Services',
      product: isDisc ? 'Discount' : productName,
      quantity: 1,
      unitPrice: defaultPrice,
      gst: isDisc ? 0 : 18,
      isInstallationService: isInst,
      isDeliveryService: isDel,
      isDiscount: isDisc,
      note: defaultNote || (isDisc ? 'Manual discount on untaxed amount' : '')
    }
    const updatedQuotations = cleanQuotations.map((item) => {
      if (item.id !== quote.id) return item
      const existing = (item.items || []).filter((l) => {
        if (isInst && isInstallationServiceLine(l)) return false
        if (isDel && isDeliveryServiceLine(l)) return false
        if (isDisc && isDiscountLine(l)) return false
        return true
      })
      return {
        ...item,
        discount: isDisc ? defaultPrice : item.discount,
        items: [...existing, newLine]
      }
    })
    patchProject({ quotations: updatedQuotations })
    const currentQ = updatedQuotations.find((q) => q.id === quote?.id)
    if (currentQ) {
      setWorkingItems(currentQ.items || [])
      workingItemsRef.current = currentQ.items || []
    }
    toast(`${productName} added to quotation.`)
  }, [cleanQuotations, quote, patchProject, toast, flushPendingQuoteUpdates])

  const changeStatus = (status) => {
    flushPendingQuoteUpdates()
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
    flushPendingQuoteUpdates()
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
    const mergedCurrent = deduplicated.find((q) => q.id === quote.id)
    if (mergedCurrent) {
      setWorkingItems(mergedCurrent.items || [])
      workingItemsRef.current = mergedCurrent.items || []
    }
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
                onChange={(e) => switchDraft(e.target.value)}
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
                  onClick={() => switchDraft(cleanQuotations[currentIndex - 1].id)}
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
                  onClick={() => switchDraft(cleanQuotations[currentIndex + 1].id)}
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
                onClick={() => switchDraft(item.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    switchDraft(item.id)
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
            onChange={(e) => switchDraft(e.target.value)}
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
          <button type="button" className="button secondary" onClick={() => { flushPendingQuoteUpdates(); window.print() }}>
            <Printer size={15} />Print
          </button>
          <button
            type="button"
            className="button secondary"
            onClick={async () => {
              flushPendingQuoteUpdates()
              if (typeof window !== 'undefined' && window.krishnaHub?.saveDocumentPdf) {
                try {
                  const unified = unifyQuoteItems(quote.items || [])
                  const res = await window.krishnaHub.saveDocumentPdf({
                    project,
                    quote: { ...quote, items: unified },
                    isInvoice: false,
                    documentNumber: quote.id
                  })
                  if (res?.success) {
                    toast('Quotation PDF saved successfully.')
                  } else if (!res?.canceled) {
                    window.print()
                  }
                } catch {
                  window.print()
                }
              } else {
                window.print()
              }
            }}
          >
            <Download size={15} />PDF
          </button>
          {typeof window !== 'undefined' && window.krishnaHub?.openProjectFolder && (
            <button
              type="button"
              className="button secondary"
              title="Open local drafts folder in Windows File Explorer"
              onClick={async () => {
                try {
                  await window.krishnaHub.openProjectFolder(project.name, 'drafts')
                } catch (err) {
                  toast(err.message || 'Could not open drafts folder')
                }
              }}
            >
              <FolderOpen size={15} />Open Drafts Folder
            </button>
          )}
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
      <DocumentSheet project={project} quote={activeWorkingQuote || quote} editable onEditLine={editLine} onDeleteLine={deleteLine} onAddLine={addServiceLine} />
    </div>
  )
}

function Total({ label, value, total }) { return <div className={total ? 'total-line total' : 'total-line'}><span>{label}</span><strong>{currency(value)}</strong></div> }

function formatQuotationCalculation(line) {
  // Transparent mathematical formulas removed on quotations as requested
  return ''
}

function cleanInvoiceProductName(name) {
  if (!name) return ''
  return String(name)
    .replace(/\s*[-–—:]?\s*Measurement\s*\d+.*$/i, '')
    .replace(/\s*\(Measurement\s*\d+.*?\)/gi, '')
    .replace(/\s*[-–—:]?\s*⌈.*$/i, '')
    .replace(/\s*[-–—:]?\s*Formula:.*$/i, '')
    .replace(/\s*[-–—:]?\s*(?:Note|Notes|Spec|Specs|Specification|Specifications):.*$/i, '')
    .replace(/\s*\((?:Note|Notes|Spec|Specs|Specification|Specifications).*?\)/gi, '')
    .replace(/\s*[-–—:]?\s*\d+\s*(?:panels|drops|running ft|sq ft|fabric|mtr|m\b).*$/i, '')
    .trim() || name
}

const EditableNumberInput = React.memo(function EditableNumberInput({
  value,
  placeholder,
  ariaLabel,
  onCommit,
  step = 'any',
  min = '0',
  className,
  style
}) {
  const [text, setText] = useState(() => (value !== undefined && value !== null && value !== 0 ? String(value) : (value === 0 ? '0' : '')))
  const isFocusedRef = useRef(false)

  useEffect(() => {
    if (!isFocusedRef.current) {
      setText(value !== undefined && value !== null && value !== 0 ? String(value) : (value === 0 ? '0' : ''))
    }
  }, [value])

  const handleChange = (e) => {
    const val = e.target.value
    setText(val)
    const parsed = val === '' ? 0 : Number(Number(e.target.value).toFixed(2))
    onCommit?.(parsed, val)
  }

  const handleBlur = () => {
    isFocusedRef.current = false
    const parsed = text === '' ? 0 : Number(Number(text).toFixed(2))
    onCommit?.(parsed, text)
  }

  const handleFocus = (e) => {
    isFocusedRef.current = true
    e?.target?.select?.()
  }

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault()
    }
    if (e.key === 'Enter') {
      e.currentTarget.blur()
    }
  }

  return (
    <input
      type="number"
      min={min}
      step={step}
      inputMode="decimal"
      placeholder={placeholder}
      aria-label={ariaLabel}
      className={className}
      style={{
        MozAppearance: 'textfield',
        WebkitAppearance: 'none',
        appearance: 'textfield',
        ...style
      }}
      value={text}
      onFocus={handleFocus}
      onChange={handleChange}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      onWheel={(e) => e.target.blur()}
    />
  )
})

const QuoteRow = React.memo(function QuoteRow({
  line,
  isSecondary = false,
  isInvoice = false,
  editable = false,
  onEditLine,
  onDeleteLine
}) {
  const showArea = line.area && line.area !== 'Hardware' && (!isSecondary || line.area !== 'Services')
  const calcDescription = formatQuotationCalculation(line)

  const handleQuantityCommit = useCallback((num) => {
    onEditLine?.(line.id, { quantity: num })
  }, [onEditLine, line.id])

  const handlePriceCommit = useCallback((num) => {
    onEditLine?.(line.id, { unitPrice: num })
  }, [onEditLine, line.id])

  const handleDelete = useCallback(() => {
    onDeleteLine?.(line.id)
  }, [onDeleteLine, line.id])

  const lineTotal = (Number(line.quantity) || 0) * (Number(line.unitPrice) || 0)

  return (
    <tr>
      <td>
        <strong>{(showArea && !isInvoice ? line.area + ' - ' : '') + cleanInvoiceProductName(line.product)}</strong>
        {!isInvoice && calcDescription && <small className="quotation-calc-note">{calcDescription}</small>}
      </td>
      <td>
        {editable ? (
          <EditableNumberInput
            ariaLabel="Order quantity"
            step="0.01"
            placeholder="0"
            value={line.quantity}
            onCommit={handleQuantityCommit}
          />
        ) : (
          <span>{quantity(line.quantity)} {unitLabel(line.product)}</span>
        )}
      </td>
      <td>
        {editable ? (
          <div className="price-input">
            <span>₹</span>
            <EditableNumberInput
              ariaLabel="Unit price"
              placeholder="0"
              value={line.unitPrice}
              onCommit={handlePriceCommit}
            />
          </div>
        ) : (
          <span>{currency(line.unitPrice)}</span>
        )}
      </td>
      <td><span>GST {line.gst}%</span></td>
      <td><strong>{currency(lineTotal)}</strong></td>
      {editable && (
        <td className="document-action-col" style={{ textAlign: 'center' }}>
          <button
            type="button"
            className="icon-button danger"
            title="Remove line item"
            aria-label="Remove line item"
            onClick={handleDelete}
          >
            <Trash2 size={14} />
          </button>
        </td>
      )}
    </tr>
  )
})

function DocumentSheet({ project, quote, editable = false, onEditLine, onDeleteLine, onAddLine, documentType = 'Quotation', documentNumber = quote.id }) {
  const unifiedItems = useMemo(() => unifyQuoteItems(quote.items || []), [quote.items])
  const totals = getTotals(unifiedItems, quote)
  const customerName = project.customer.name || 'Customer name'
  const address = project.customer.address || project.customer.location || 'Site address to be added'
  const isInvoice = documentType !== 'Quotation'

  // Exclude installation, delivery and discount from product and secondary accessory tables
  const productItems = useMemo(
    () => unifiedItems.filter((item) => !isAccessoryOrServiceLine(item) && !isInstallationServiceLine(item) && !isDeliveryServiceLine(item) && !isDiscountLine(item)),
    [unifiedItems]
  )
  const accessoryItems = useMemo(
    () => unifiedItems.filter((item) => isAccessoryOrServiceLine(item) && !isInstallationServiceLine(item) && !isDeliveryServiceLine(item) && !isDiscountLine(item)),
    [unifiedItems]
  )

  // Untaxed amount for base products and accessories, excluding installation, delivery and discount
  const regularItemsUntaxed = useMemo(() => {
    return unifiedItems
      .filter((item) => !isInstallationServiceLine(item) && !isDeliveryServiceLine(item) && !isDiscountLine(item))
      .reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0), 0)
  }, [unifiedItems])

  const breakdown = useMemo(() => calculateInstallationBreakdown(quote.items || [], project), [quote.items, project])
  const discountLine = useMemo(() => (quote.items || []).find((item) => isDiscountLine(item)), [quote.items])
  const installationLine = useMemo(() => (quote.items || []).find((item) => isInstallationServiceLine(item)), [quote.items])
  const deliveryLine = useMemo(() => (quote.items || []).find((item) => isDeliveryServiceLine(item)), [quote.items])

  const rawDiscount = useMemo(() => Number(discountLine?.unitPrice) || 0, [discountLine])
  const applicableDiscount = useMemo(() => {
    return Math.min(Math.max(0, rawDiscount), regularItemsUntaxed)
  }, [rawDiscount, regularItemsUntaxed])
  const isDiscountCapped = rawDiscount > regularItemsUntaxed && regularItemsUntaxed > 0

  return (
    <article
      className={'quotation-sheet document-sheet' + (isInvoice ? ' invoice-sheet' : '')}
      style={{ backgroundImage: `url(${documentBg})` }}
    >
      <div
        className="document-page-bg"
        aria-hidden="true"
        style={{ backgroundImage: `url(${documentBg})` }}
      />
      <header className="document-header">
        <div className="document-company">
          <h2>Krishna Decor</h2>
          <span className="document-tagline">SPACES DRESSED BEAUTIFULLY</span>
          <p>CTS NO - 1813|2B|2<br />Bapat Galli Car Parking<br /><strong>Belgaum-Karnataka</strong><br />Mob - 9036674138<br />E-mail - krishna.decor2015@gmail.com</p>
          <p className="document-customer"><strong>To:</strong> <strong className="customer-name">{customerName}</strong><br /><span>{project.name}</span></p>
        </div>
        <div className="document-title">
          <h1 className="document-title-badge">
            <span className="doc-type-name">{documentType}</span>
            <span className="doc-hash">#</span>
            <span className="doc-number-val">{documentNumber}</span>
          </h1>
          {quote?.title && !isInvoice && <span className="document-draft-tag">{quote.title}</span>}
          <p>GSTIN: 29AWZPK1722G1Z4</p>
        </div>
      </header>
      <section className="document-details" aria-label={documentType + ' details'}>
        <div><strong>{isInvoice ? 'Invoice Date' : 'Quotation Date'}</strong><span>{quote.date}</span></div>
        <div><strong>{isInvoice ? 'Payment Terms' : 'Expiration'}</strong><span>{isInvoice ? 'As agreed' : 'Valid for 30 days'}</span></div>
        <div><strong>{isInvoice ? 'Billing To' : 'Salesperson'}</strong><span>{isInvoice ? customerName : 'Krishna Decor'}</span></div>
      </section>

      {/* 1. Main Products Table */}
      <div className="document-table-shell">
        <table className="document-table">
          <thead>
            <tr>
              <th>Description</th>
              <th>Quantity</th>
              <th>Unit Price</th>
              <th>Taxes</th>
              <th>Amount</th>
              {editable && <th className="document-action-col" style={{ width: '40px', textAlign: 'center' }}></th>}
            </tr>
          </thead>
          <tbody>
            {productItems.length === 0 ? (
              <tr>
                <td colSpan={editable ? 6 : 5} style={{ textAlign: 'center', padding: '14px', color: '#7a706b' }}>
                  No product items in this document.
                </td>
              </tr>
            ) : (
              productItems.map((line) => (
                <QuoteRow
                  key={line.id}
                  line={line}
                  isSecondary={false}
                  isInvoice={isInvoice}
                  editable={editable}
                  onEditLine={onEditLine}
                  onDeleteLine={onDeleteLine}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 2. Secondary Table: Tracks, Runners, Hooks, Clamps, Stitching */}
      {accessoryItems.length > 0 && (
        <div className="document-table-shell secondary-table-shell">
          <table className="document-table secondary">
            <thead>
              <tr>
                <th>Description</th>
                <th>Quantity</th>
                <th>Unit Price</th>
                <th>Taxes</th>
                <th>Amount</th>
                {editable && <th className="document-action-col" style={{ width: '40px', textAlign: 'center' }}></th>}
              </tr>
            </thead>
            <tbody>
              {accessoryItems.map((line) => (
                <QuoteRow
                  key={line.id}
                  line={line}
                  isSecondary={true}
                  isInvoice={isInvoice}
                  editable={editable}
                  onEditLine={onEditLine}
                  onDeleteLine={onDeleteLine}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="document-summary">
        <section className="document-terms">
          <h3>Terms and conditions</h3>
          <ol>
            <li>NO CREDIT</li>
            <li>70% advance payment</li>
            <li>30% balance payment BEFORE DELIVERY</li>
            <li>Minimum delivery time is 20 days.</li>
            <li>Early delivery is not a commitment or guarantee.</li>
            <li>Scaffolding, ladder and stools required for installation must be provided by the customer.</li>
          </ol>
        </section>
        <section className="document-totals">
          <Total label="Untaxed Amount" value={regularItemsUntaxed} />

          {/* Discount - appears just below Untaxed Amount */}
          {discountLine && (editable || applicableDiscount > 0) && (
            <div className="service-total-row discount-total-row">
              <div className="service-total-header">
                <div className="service-name-wrap">
                  <strong>Discount</strong>
                  <span className="discount-scope-badge">On Untaxed Amount</span>
                </div>
                {editable && (
                  <button
                    type="button"
                    className="service-delete-btn"
                    title="Delete Discount from quotation"
                    aria-label="Delete Discount from quotation"
                    onClick={() => onDeleteLine?.(discountLine.id)}
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>

              <div className="service-formula-hint">
                Applicable only to untaxed amount (max {currency(regularItemsUntaxed)})
              </div>

              <div className="service-calculation-line">
                {editable ? (
                  <div className="service-inputs-wrap">
                    <label className="service-inline-field discount-charge-field">
                      <span>Manual Discount (₹)</span>
                      <EditableNumberInput
                        ariaLabel="Discount amount"
                        step="any"
                        min="0"
                        placeholder="0"
                        value={discountLine.unitPrice}
                        onCommit={(num) => onEditLine?.(discountLine.id, { unitPrice: num })}
                      />
                    </label>
                    {isDiscountCapped && (
                      <span className="discount-capped-badge" title={`Entered discount exceeds untaxed amount (${currency(regularItemsUntaxed)}). Discount is capped at untaxed amount.`}>
                        Capped at untaxed
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="service-qty-rate-read">Manual discount on untaxed amount</span>
                )}
                <strong className="service-amount-val discount-val">
                  {applicableDiscount > 0 ? `-${currency(applicableDiscount)}` : currency(0)}
                </strong>
              </div>
            </div>
          )}

          {/* Installation - appears exactly below Untaxed Amount */}
          {installationLine && (
            <div className="service-total-row installation-service-row">
              <div className="service-total-header">
                <div className="service-name-wrap">
                  <strong>Installation</strong>
                  <span className="service-tax-badge">GST {installationLine.gst || 18}%</span>
                </div>
                {editable && (
                  <button
                    type="button"
                    className="service-delete-btn"
                    title="Delete Installation from quotation"
                    aria-label="Delete Installation from quotation"
                    onClick={() => onDeleteLine?.(installationLine.id)}
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>

              <div className="service-formula-hint">
                Formula: {breakdown.numTracks} track{breakdown.numTracks === 1 ? '' : 's'} + {breakdown.numBlinds} blind{breakdown.numBlinds === 1 ? '' : 's'} = {installationLine.quantity} units
              </div>

              <div className="service-calculation-line">
                {editable ? (
                  <div className="service-inputs-wrap">
                    <label className="service-inline-field">
                      <span>Qty</span>
                      <EditableNumberInput
                        ariaLabel="Installation quantity"
                        step="1"
                        min="0"
                        placeholder="0"
                        value={installationLine.quantity}
                        onCommit={(num) => onEditLine?.(installationLine.id, { quantity: num })}
                      />
                    </label>
                    <span className="service-mul-symbol">×</span>
                    <label className="service-inline-field">
                      <span>Rate (₹)</span>
                      <EditableNumberInput
                        ariaLabel="Installation unit price"
                        step="any"
                        min="0"
                        placeholder="0"
                        value={installationLine.unitPrice}
                        onCommit={(num) => onEditLine?.(installationLine.id, { unitPrice: num })}
                      />
                    </label>
                  </div>
                ) : (
                  <span className="service-qty-rate-read">
                    {installationLine.quantity} units × {currency(installationLine.unitPrice)}
                  </span>
                )}
                <strong className="service-amount-val">
                  {currency((Number(installationLine.quantity) || 0) * (Number(installationLine.unitPrice) || 0))}
                </strong>
              </div>
            </div>
          )}

          {/* Delivery - appears below Installation */}
          {deliveryLine && (
            <div className="service-total-row delivery-service-row">
              <div className="service-total-header">
                <div className="service-name-wrap">
                  <strong>Delivery</strong>
                  <span className="service-tax-badge">GST {deliveryLine.gst || 18}%</span>
                </div>
                {editable && (
                  <button
                    type="button"
                    className="service-delete-btn"
                    title="Delete Delivery from quotation"
                    aria-label="Delete Delivery from quotation"
                    onClick={() => onDeleteLine?.(deliveryLine.id)}
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>

              <div className="service-calculation-line">
                {editable ? (
                  <div className="service-inputs-wrap">
                    <label className="service-inline-field delivery-charge-field">
                      <span>Manual Delivery Charge (₹)</span>
                      <EditableNumberInput
                        ariaLabel="Delivery charge"
                        step="any"
                        min="0"
                        placeholder="0"
                        value={deliveryLine.unitPrice}
                        onCommit={(num) => onEditLine?.(deliveryLine.id, { unitPrice: num })}
                      />
                    </label>
                  </div>
                ) : (
                  <span className="service-qty-rate-read">Manual delivery</span>
                )}
                <strong className="service-amount-val">
                  {currency((Number(deliveryLine.quantity) || 1) * (Number(deliveryLine.unitPrice) || 0))}
                </strong>
              </div>
            </div>
          )}

          {/* Quick-add actions when Discount, Installation or Delivery has been deleted */}
          {editable && (!discountLine || !installationLine || !deliveryLine) && (
            <div className="service-add-bar">
              {!discountLine && (
                <button
                  type="button"
                  className="service-add-pill-btn discount-add-btn"
                  title="Add manual discount on untaxed amount"
                  onClick={() => onAddLine?.('Discount', 1, 0, 'Manual discount on untaxed amount')}
                >
                  <Plus size={13} />
                  <span>+ Add Discount</span>
                </button>
              )}
              {!installationLine && (
                <button
                  type="button"
                  className="service-add-pill-btn"
                  title="Add installation to quotation based on track and blind count"
                  onClick={() => onAddLine?.('Installation', breakdown.totalInstallation || 1, 0, `Formula: ${breakdown.numTracks} tracks + ${breakdown.numBlinds} blinds`)}
                >
                  <Plus size={13} />
                  <span>+ Add Installation{breakdown.totalInstallation > 0 ? ` (${breakdown.totalInstallation} units)` : ''}</span>
                </button>
              )}
              {!deliveryLine && (
                <button
                  type="button"
                  className="service-add-pill-btn"
                  title="Add manual delivery charge to quotation"
                  onClick={() => onAddLine?.('Delivery', 1, 0, 'Manual delivery charge')}
                >
                  <Plus size={13} />
                  <span>+ Add Delivery</span>
                </button>
              )}
            </div>
          )}

          <Total label="SGST / UTGST" value={totals.tax / 2} />
          <Total label="CGST" value={totals.tax / 2} />
          <Total label="Total" value={totals.total} total />
        </section>
      </div>
      <footer className="document-footer">
        <div className="document-bank">
          <p>Bank Details</p>
          <strong>KRISHNA DECOR</strong>
          <span>Ac No 917020002479616<br />Axis Bank IFSC CODE UTIB0002941<br />Kadolkar Galli Branch</span>
        </div>
        <div className="document-signature">
          <p>I accept the above {documentType.toLowerCase()} with the terms and conditions.</p>
          <span>Customer Signature</span>
        </div>
      </footer>
    </article>
  )
}

function Invoice({ project, toast }) {
  const approved = (project.quotations || []).find((quote) => quote.status === 'Approved')
  if (!approved) return <section className="panel invoice-state"><span className="state-icon"><Clock3 size={25} /></span><p className="eyebrow">WAITING FOR APPROVAL</p><h2>Approve a quotation first</h2><p>Invoices are intentionally restricted to approved quotations, so the billing record always matches the agreed scope.</p><button className="button secondary" onClick={() => toast('Open Quotations and mark the client-approved version.')}>View quotations</button></section>
  const invoiceNumber = approved.id.startsWith('KD') ? approved.id : 'KD-' + approved.id.replace(/^INV-?/, '')
  return (
    <div className="quotation-layout invoice-layout">
      <div className="quote-controls panel">
        <span className="status-badge approved">Approved quotation</span>
        <div className="quote-actions">
          <button
            type="button"
            className="button secondary"
            onClick={async () => {
              if (typeof window !== 'undefined' && window.krishnaHub?.saveDocumentPdf) {
                try {
                  const unified = unifyQuoteItems(approved.items || [])
                  const res = await window.krishnaHub.saveDocumentPdf({
                    project,
                    quote: { ...approved, items: unified },
                    isInvoice: true,
                    documentNumber: invoiceNumber
                  })
                  if (res?.success) {
                    toast('Invoice PDF saved successfully.')
                  } else if (!res?.canceled) {
                    window.print()
                  }
                } catch {
                  window.print()
                }
              } else {
                window.print()
              }
            }}
          >
            <Download size={16} />Save PDF
          </button>
          {typeof window !== 'undefined' && window.krishnaHub?.openProjectFolder && (
            <button
              type="button"
              className="button secondary"
              title="Open local invoice folder in Windows File Explorer"
              onClick={async () => {
                try {
                  await window.krishnaHub.openProjectFolder(project.name, 'invoice')
                } catch (err) {
                  toast(err.message || 'Could not open invoice folder')
                }
              }}
            >
              <FolderOpen size={16} />Open Invoice Folder
            </button>
          )}
        </div>
      </div>
      <DocumentSheet project={project} quote={approved} documentType="Tax Invoice" documentNumber={invoiceNumber} />
    </div>
  )
}


function Payments({ project, patchProject, toast }) {
  const quote = project.quotations.find((item) => item.status === 'Approved')
  const total = getTotals(quote?.items || []).total
  const received = project.payments.reduce((sum, payment) => payment.state === 'Received' ? sum + Number(payment.amount) : sum, 0)
  const outstanding = Math.max(0, total - received)
  const canRecordPayment = Boolean(quote) && outstanding > 0
  const defaultInvoiceNo = quote ? (quote.id.startsWith('KD') ? quote.id : 'KD-' + quote.id.replace(/^INV-?/, '')) : ''

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
                  placeholder={defaultInvoiceNo ? `${defaultInvoiceNo} (Optional)` : 'e.g. KD-015 (Optional)'}
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
                  placeholder={defaultInvoiceNo ? `${defaultInvoiceNo} (Optional)` : 'e.g. KD-015 (Optional)'}
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

if (typeof window !== 'undefined') {
  window.addEventListener('wheel', () => {
    if (document.activeElement && document.activeElement.type === 'number') {
      document.activeElement.blur()
    }
  }, { passive: true })
}

createRoot(document.getElementById('root')).render(<App />)
