/**
 * Kompres gambar di browser menjadi data URL JPEG kecil, sehingga foto kandidat
 * dapat disimpan langsung di dokumen Firestore (batas 1 MiB) tanpa Firebase Storage.
 */

const MAX_INPUT_BYTES = 8 * 1024 * 1024
const MAX_OUTPUT_CHARS = 600_000
const QUALITIES = [0.85, 0.7, 0.55, 0.4]

const loadImage = (url) =>
  new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Gambar tidak dapat dibaca. Gunakan JPG, PNG, atau WebP.'))
    image.src = url
  })

export async function fileToCompressedDataUrl(file, maxSide = 800) {
  if (!file || !file.type.startsWith('image/')) {
    throw new Error('Berkas harus berupa gambar (JPG, PNG, atau WebP).')
  }
  if (file.size > MAX_INPUT_BYTES) throw new Error('Ukuran gambar maksimal 8 MB.')

  const objectUrl = URL.createObjectURL(file)
  try {
    const image = await loadImage(objectUrl)
    const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))

    const context = canvas.getContext('2d')
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(image, 0, 0, canvas.width, canvas.height)

    for (const quality of QUALITIES) {
      const dataUrl = canvas.toDataURL('image/jpeg', quality)
      if (dataUrl.length <= MAX_OUTPUT_CHARS) return dataUrl
    }
    throw new Error('Gambar terlalu besar setelah dikompres. Gunakan gambar beresolusi lebih kecil.')
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}
