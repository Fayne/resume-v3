const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const MEDIA_LIBRARY_URL = 'https://media-library.cloudinary.com/global/all.js'

function loadMediaLibrary() {
  if (window.cloudinary?.openMediaLibrary) return Promise.resolve(window.cloudinary)
  return new Promise((resolve, reject) => {
    const script = document.querySelector(`script[src="${MEDIA_LIBRARY_URL}"]`) || document.createElement('script')
    script.src = MEDIA_LIBRARY_URL
    script.async = true
    script.onload = () => resolve(window.cloudinary)
    script.onerror = () => reject(new Error('Cloudinary Media Library Widget 加载失败。'))
    if (!script.parentNode) document.head.appendChild(script)
  })
}

/**
 * Opens Cloudinary's authenticated Media Library modal. The user signs in at
 * Cloudinary, chooses (or uploads) one image, and the selected asset metadata
 * returns through insertHandler. No unsigned upload preset or API secret is used.
 */
export async function openMediaLibrary() {
  if (!CLOUD_NAME) throw new Error('请在 Admin 的环境变量中配置 VITE_CLOUDINARY_CLOUD_NAME。')
  const cloudinary = await loadMediaLibrary()
  return new Promise((resolve) => {
    cloudinary.openMediaLibrary({
      cloud_name: CLOUD_NAME,
      multiple: false,
      max_files: 1,
      z_index: 100000,
      insert_caption: '使用此图片',
    }, {
      insertHandler: (data) => {
        const asset = data.assets?.[0]
        if (!asset) return
        resolve({
          publicId: asset.public_id,
          version: String(asset.version),
          format: asset.format,
        })
      },
    })
  })
}
