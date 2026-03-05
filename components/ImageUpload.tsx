'use client'

import { useRef } from 'react'

interface ImageUploadProps {
  onImageSelect: (base64Images: string[]) => void
  selectedImages: string[]
  onRemoveImage: (index: number) => void
  disabled?: boolean
}

export function ImageUpload({
  onImageSelect,
  selectedImages,
  onRemoveImage,
  disabled,
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const base64Promises = Array.from(files).map(file => {
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
    })

    try {
      const base64Images = await Promise.all(base64Promises)
      onImageSelect([...selectedImages, ...base64Images])
    } catch (error) {
      console.error('Failed to read images:', error)
    }

    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileChange}
        style={{ display: 'none' }}
        disabled={disabled}
      />
      <button
        type="button"
        className="upload-button"
        onClick={() => inputRef.current?.click()}
        disabled={disabled}
        title="Upload image"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21,15 16,10 5,21" />
        </svg>
      </button>
      {selectedImages.length > 0 && (
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
          {selectedImages.map((img, i) => (
            <div key={i} className="image-preview">
              <img src={img} alt={`Preview ${i + 1}`} />
              <button
                className="remove-image"
                onClick={() => onRemoveImage(i)}
                type="button"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}