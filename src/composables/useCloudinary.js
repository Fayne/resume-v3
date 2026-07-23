const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const MEDIA_LIBRARY_URL = 'https://media-library.cloudinary.com/global/all.js'

// 缓存脚本加载的 Promise 本身，而不是每次调用都重新赋值 onload/onerror。
// 避免两次调用挤在脚本加载完成之前时，第二次调用的 handler 顶替掉第一次的，
// 导致第一次的 Promise 永远不 resolve。
let scriptPromise = null

function loadMediaLibrary() {
  if (window.cloudinary?.openMediaLibrary) return Promise.resolve(window.cloudinary)
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = MEDIA_LIBRARY_URL
      script.async = true
      script.onload = () => resolve(window.cloudinary)
      script.onerror = () => {
        scriptPromise = null // 加载失败时清空缓存，允许下次重试
        reject(new Error('Cloudinary Media Library Widget 加载失败。'))
      }
      document.head.appendChild(script)
    })
  }
  return scriptPromise
}

/**
 * 打开 Cloudinary 的 Media Library 弹窗（需要用户用自己的 Cloudinary 账号登录）。
 * 选中一张图片后通过 insertHandler 返回；如果用户直接关闭弹窗、没有选图，
 * 通过 hideHandler 兜底 resolve(null)，避免调用方永远卡在 pending 状态。
 */
export async function openMediaLibrary() {
  if (!CLOUD_NAME) throw new Error('请在 Admin 的环境变量中配置 VITE_CLOUDINARY_CLOUD_NAME。')
  const cloudinary = await loadMediaLibrary()

  return new Promise((resolve) => {
    let settled = false

    cloudinary.openMediaLibrary(
      {
        cloud_name: CLOUD_NAME,
        multiple: false,
        max_files: 1,
        z_index: 100000,
        insert_caption: '使用此图片',
      },
      {
        insertHandler: (data) => {
          settled = true
          const asset = data.assets?.[0]
          resolve(
            asset
              ? { publicId: asset.public_id, version: String(asset.version), format: asset.format }
              : null,
          )
        },
        hideHandler: () => {
          // 用户没有选图、直接关闭了弹窗
          if (!settled) {
            settled = true
            resolve(null)
          }
        },
      },
    )
  })
}

/**
 * 统一的 Cloudinary 交付 URL 拼接函数，前台展示页和后台都从这里取，
 * 避免 cloud name 在多处硬编码、以后换账号时漏改导致图片 404。
 * @param {{ publicId: string, version: string, format: string } | null | undefined} asset
 * @param {{ transformation?: string }} [options] 可选的 Cloudinary 转换参数，如 'w_200,h_200,c_fill'
 */
export function cloudinaryUrl(asset, { transformation = '' } = {}) {
  if (!asset?.publicId) return ''
  if (!CLOUD_NAME) {
    console.warn('VITE_CLOUDINARY_CLOUD_NAME 未配置，无法拼接图片地址。')
    return ''
  }
  const t = transformation ? `${transformation}/` : ''
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${t}v${asset.version}/${asset.publicId}.${asset.format}`
}
