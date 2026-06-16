'use client'

import { useEffect } from 'react'

interface UrlParams {
  kwai: Record<string, string>
  utm: Record<string, string>
  all: Record<string, string>
}

function parseUtmContent(utmContent: string): Record<string, string> {
  const parts = utmContent.split('::')
  if (parts.length >= 3) {
    return {
      CreativeID: parts[0],
      callback: parts[1],
      pixel_id: parts[2],
    }
  }
  if (parts.length === 2) {
    return {
      CreativeID: parts[0],
      callback: parts[1],
    }
  }
  return { utm_content_raw: utmContent }
}

function parseUrlParams(): UrlParams {
  const params = new URLSearchParams(window.location.search)
  const kwaiKeys = [
    'click_id', 'pixel_id', 'CampaignID', 'adSETID', 'CreativeID', 'callback',
    '__CMPNID__', '__ADSETID__', '__ADID__', '__CALLBACK__', '__KS_PIXELID__',
  ]
  const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content']
  const result: UrlParams = { kwai: {}, utm: {}, all: {} }

  params.forEach((value, key) => {
    result.all[key] = value
    const lower = key.toLowerCase()
    if (kwaiKeys.includes(key)) {
      result.kwai[key.replace(/^__|__$/g, '')] = value
    }
    if (utmKeys.includes(lower) || lower.startsWith('utm_')) {
      result.utm[key] = value
    }
    if (key === 'utm_content' && value.includes('::')) {
      const parsed = parseUtmContent(value)
      Object.entries(parsed).forEach(([k, v]) => {
        result.kwai[k] = v
        result.all[`kwai_${k}`] = v
      })
    }
  })

  return result
}

function saveKwaiClickId(clickId: string) {
  try {
    localStorage.setItem('kwai_click_id', clickId)
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toUTCString()
    document.cookie = `kwai_click_id=${encodeURIComponent(clickId)};expires=${expires};path=/;SameSite=Lax`
  } catch { /* */ }
}

function saveUrlParams(parsed: UrlParams) {
  if (Object.keys(parsed.all).length === 0) return

  const enrichedAll = { ...parsed.all, ...Object.fromEntries(
    Object.entries(parsed.kwai).map(([k, v]) => [`kwai_${k}`, v])
  ) }

  localStorage.setItem('kwai_url_params', JSON.stringify(enrichedAll))
  sessionStorage.setItem('kwai_url_params', JSON.stringify(enrichedAll))

  const existing = sessionStorage.getItem('utm_params')
  const merged = { ...(existing ? JSON.parse(existing) : {}), ...enrichedAll }
  sessionStorage.setItem('utm_params', JSON.stringify(merged))
  localStorage.setItem('utm_params', JSON.stringify(merged))

  const callback = parsed.kwai['callback'] || parsed.kwai['click_id'] || parsed.all['click_id']
  if (callback) {
    sessionStorage.setItem('kwai_callback', callback)
    localStorage.setItem('kwai_callback', callback)
    saveKwaiClickId(callback)
  }
}

export default function UTMTracker() {
  useEffect(() => {
    if (typeof window === 'undefined') return

    const capture = () => {
      const parsed = parseUrlParams()
      if (Object.keys(parsed.all).length > 0) {
        saveUrlParams(parsed)
      } else {
        const stored = localStorage.getItem('kwai_url_params')
        if (stored) {
          try { sessionStorage.setItem('kwai_url_params', stored) } catch { /* */ }
        }
      }
    }

    capture()

    window.addEventListener('popstate', capture)
    const originalPushState = history.pushState
    history.pushState = function (...args) {
      originalPushState.apply(history, args)
      setTimeout(capture, 100)
    }

    return () => {
      window.removeEventListener('popstate', capture)
      history.pushState = originalPushState
    }
  }, [])

  return null
}
