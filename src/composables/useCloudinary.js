// 使用 Cloudinary 的 unsigned upload，无需在前端暴露 API secret。
// 使用前请在 Cloudinary 后台 Settings -> Upload -> Upload presets 创建一个
// "Unsigned" 模式的 preset，把下面两个值换成你自己的 cloud name 和 preset 名。

const CLOUD_NAME = 'your-cloud-name'
const UPLOAD_PRESET = 'your-unsigned-preset'

export async function uploadImage(file) {
  const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`
  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', UPLOAD_PRESET)

  const res = await fetch(url, { method: 'POST', body: formData })
  if (!res.ok) {
    throw new Error('Cloudinary 上传失败')
  }
  const data = await res.json()
  return data.secure_url
}
