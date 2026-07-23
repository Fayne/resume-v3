import { createI18n } from 'vue-i18n'
import zh from './locales/zh.json'
import en from './locales/en.json'

const STORAGE_KEY = 'resume-site-locale'

// 默认中文；如果用户之前手动切换过语言，则记住上次的选择
const savedLocale = localStorage.getItem(STORAGE_KEY)
const defaultLocale = savedLocale === 'en' ? 'en' : 'zh'

export const i18n = createI18n({
  legacy: false,
  locale: defaultLocale,
  fallbackLocale: 'zh',
  messages: { zh, en },
})

export function setLocale(locale) {
  i18n.global.locale.value = locale
  localStorage.setItem(STORAGE_KEY, locale)
  document.documentElement.lang = locale === 'zh' ? 'zh-CN' : 'en'
}
