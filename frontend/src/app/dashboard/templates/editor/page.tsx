'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Box, CircularProgress, Alert, Button } from '@mui/material'
import { ArrowBack, DataObject as PlaceholderIcon } from '@mui/icons-material'
import { useRouter } from 'next/navigation'
import { config } from '@/config'
import { PlaceholderSidebar } from '@/components/dashboard/templates/placeholder-sidebar'

export default function OnlyOfficeEditor() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const editorRef = useRef<HTMLDivElement>(null)
  const docEditorRef = useRef<any>(null)
  const [retryCount, setRetryCount] = useState(0)
  const [isRetrying, setIsRetrying] = useState(false)
  const [showPlaceholders, setShowPlaceholders] = useState(false)

  // Get parameters from URL
  const documentId = searchParams.get('id')
  const fileName = searchParams.get('filename') || 'Document'
  const fileType = searchParams.get('type') || 'docx'

  // Map file extensions to OnlyOffice documentType
  const getDocumentType = (ext: string): string => {
    switch (ext.toLowerCase()) {
      case 'docx':
      case 'odt':
      case 'rtf':
      case 'txt':
        return 'word'
      case 'xlsx':
      case 'ods':
        return 'cell'
      case 'pptx':
      case 'odp':
        return 'slide'
      case 'pdf':
        return 'pdf'
      case 'vsdx':
      case 'drawio':
        return 'diagram'
      default:
        throw new Error('Unsupported file type: ' + ext)
    }
  }

  useEffect(() => {
    if (!documentId) {
      setError('Document ID is required')
      setLoading(false)
      return
    }

    if (window.DocsAPI) {
      initializeEditor()
      return
    }

    const existingScript = document.querySelector('script[src*="api.js"]')
    if (existingScript) {
      existingScript.addEventListener('load', () => initializeEditor())
      existingScript.addEventListener('error', () => {
        setError('Failed to load OnlyOffice API. Make sure Document Server is running.')
        setLoading(false)
      })
      return
    }

    const script = document.createElement('script')
    script.src = config.onlyoffice.apiUrl
    script.async = true
    script.onload = () => initializeEditor()
    script.onerror = () => {
      setError('Failed to load OnlyOffice API. Make sure Document Server is running.')
      setLoading(false)
    }
    document.head.appendChild(script)

    return () => {
      if (docEditorRef.current) {
        try {
          docEditorRef.current.destroyEditor()
        } catch (e) {
          console.log('Editor cleanup error:', e)
        }
      }
    }
  }, [documentId])

  const initializeEditor = async () => {
    if (!window.DocsAPI) {
      setError('OnlyOffice API not available')
      setLoading(false)
      return
    }

    if (!editorRef.current) {
      setError('Editor container not ready')
      setLoading(false)
      return
    }

    if (docEditorRef.current) {
      try {
        docEditorRef.current.destroyEditor()
      } catch (e) {
        console.log('Previous editor cleanup:', e)
      }
    }

    try {
      // Fetch configuration from backend
      const token = localStorage.getItem('access_token')
      const response = await fetch(`${config.api.baseUrl}/templates/onlyoffice-config/${documentId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch config: ${response.status} ${response.statusText}`)
      }

      const editorConfig = await response.json()

      // Add frontend-specific event handlers
      editorConfig.events = {
        onAppReady: () => {
          console.log('OnlyOffice app is ready')
        },
        onDocumentReady: () => {
          console.log('Document is ready')
          setLoading(false)
        },
        onError: (event: any) => {
          console.error('OnlyOffice error:', event)
          setError(`OnlyOffice error: ${event?.data || 'Unknown error'}`)
          setLoading(false)
        }
      }

      // Force editor mode settings
      editorConfig.type = 'desktop'
      editorConfig.editorConfig.mode = 'edit'

      // Log the final config
      console.log('Final OnlyOffice config:', JSON.stringify(editorConfig, null, 2))

      console.log('OnlyOffice config from backend:', editorConfig)

      docEditorRef.current = new window.DocsAPI.DocEditor('onlyoffice-editor', editorConfig)
    } catch (err: any) {
      console.error('Editor initialization error:', err)
      setError(`Failed to initialize editor: ${err.message}`)
      setLoading(false)
    }
  }

  const handleBack = () => {
    router.push('/dashboard/templates')
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Button startIcon={<ArrowBack />} onClick={handleBack} sx={{ mb: 2 }}>
          Back to Templates
        </Button>
        <Alert severity="error">{error}</Alert>
      </Box>
    )
  }

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Button startIcon={<ArrowBack />} onClick={handleBack} size="small">
          Back to Templates
        </Button>
        <Button
          startIcon={<PlaceholderIcon />}
          onClick={() => setShowPlaceholders((prev) => !prev)}
          size="small"
          variant={showPlaceholders ? 'contained' : 'outlined'}
        >
          Placeholders
        </Button>
      </Box>

      {(loading || isRetrying) && (
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 1000,
            textAlign: 'center'
          }}
        >
          <CircularProgress />
        </Box>
      )}

      <Box
        id="onlyoffice-editor"
        ref={editorRef}
        sx={{ flex: 1, width: '100%', height: '100%' }}
      />

      <PlaceholderSidebar
        open={showPlaceholders}
        onClose={() => setShowPlaceholders(false)}
        templateId={documentId}
      />
    </Box>
  )
}
