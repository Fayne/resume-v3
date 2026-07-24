// 因为 wrangler.admin.jsonc 里设置了 run_worker_first: true，
// 这个 Worker 会在"任何静态文件被返回之前"先跑一遍——包括 admin.html 本身。
// 校验通过才会把请求转给 env.ASSETS 去真正返回静态文件；不通过直接 401。
//
// ADMIN_USER / ADMIN_PASSWORD 通过 Cloudflare Workers 项目的环境变量注入
// （Settings -> Variables and Secrets），不写进代码、不提交进仓库。

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false
  let mismatch = 0
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return mismatch === 0
}

function unauthorized() {
  return new Response('需要身份验证才能访问 Admin。', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Admin", charset="UTF-8"' },
  })
}

export default {
  async fetch(request, env) {
    const expectedUser = env.ADMIN_USER
    const expectedPass = env.ADMIN_PASSWORD

    // 环境变量没配置时直接拒绝，避免"忘了配置=完全不设防"这种更危险的默认状态
    if (!expectedUser || !expectedPass) {
      return new Response(
        'Admin 未配置访问密码，请先在 Cloudflare 项目的环境变量中设置 ADMIN_USER / ADMIN_PASSWORD。',
        { status: 500 },
      )
    }

    const authHeader = request.headers.get('Authorization') || ''
    const [scheme, encoded] = authHeader.split(' ')

    if (scheme === 'Basic' && encoded) {
      let decoded = ''
      try {
        decoded = atob(encoded)
      } catch {
        decoded = ''
      }
      const sepIndex = decoded.indexOf(':')
      const user = sepIndex >= 0 ? decoded.slice(0, sepIndex) : ''
      const pass = sepIndex >= 0 ? decoded.slice(sepIndex + 1) : ''

      if (timingSafeEqual(user, expectedUser) && timingSafeEqual(pass, expectedPass)) {
        return env.ASSETS.fetch(request)
      }
    }

    return unauthorized()
  },
}
