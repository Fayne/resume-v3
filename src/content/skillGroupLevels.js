export const SKILL_GROUP_LEVELS = [
  { value: 'signature', zh: '招牌能力', en: 'Signature', rank: 4 },
  { value: 'core', zh: '核心能力', en: 'Core', rank: 3 },
  { value: 'strong', zh: '强项能力', en: 'Strong', rank: 2 },
  { value: 'supporting', zh: '补充能力', en: 'Supporting', rank: 1 },
]

const SKILL_GROUP_LEVEL_MAP = Object.fromEntries(SKILL_GROUP_LEVELS.map((item) => [item.value, item]))

export function normalizeSkillGroupLevel(value) {
  if (typeof value === 'string' && SKILL_GROUP_LEVEL_MAP[value]) return value
  if (typeof value === 'number' && Number.isFinite(value)) {
    if (value >= 90) return 'signature'
    if (value >= 80) return 'core'
    if (value >= 65) return 'strong'
    return 'supporting'
  }
  return null
}

export function getSkillGroupLevelMeta(value) {
  const normalized = normalizeSkillGroupLevel(value)
  return normalized ? SKILL_GROUP_LEVEL_MAP[normalized] : null
}
