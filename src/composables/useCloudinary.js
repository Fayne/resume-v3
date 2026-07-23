// 使用 Cloudinary 的 unsigned upload，无需在前端暴露 API secret。
// 使用前请在 Cloudinary 后台 Settings -> Upload -> Upload presets 创建一个
// "Unsigned" 模式的 preset，把下面两个值换成你自己的 cloud name 和 preset 名。

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

export async function uploadImage(file) {
  if (!CLOUD_NAME || !UPLOAD_PRESET) throw new Error('请在 Admin 的环境变量中配置 Cloudinary。')
  const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`
  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', UPLOAD_PRESET)

  const res = await fetch(url, { method: 'POST', body: formData })
  if (!res.ok) {
    throw new Error('Cloudinary 上传失败')
  }
  const data = await res.json()
  return { publicId: data.public_id, version: String(data.version), format: data.format }
}
