import { CONTENT_FILE_SET } from '../content/contentFiles'
import { normalizeSkillGroupLevel, SKILL_GROUP_LEVELS } from '../content/skillGroupLevels'
import { SKILL_LEVEL_VALUES } from '../content/skillLevels'

function pushError(errors, path, message) {
  errors.push({ path, message })
}

function isObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value)
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0
}

function isLocalizedText(value) {
  return isObject(value) && isNonEmptyString(value.zh) && isNonEmptyString(value.en)
}

function hasAnyLocalizedText(value) {
  return isObject(value) && (isNonEmptyString(value.zh) || isNonEmptyString(value.en))
}

function validateLocalizedText(errors, path, value) {
  if (!isLocalizedText(value)) pushError(errors, path, '必须是包含 zh / en 的双语文本对象。')
}

function validateAsset(errors, path, value) {
  if (!isObject(value) || !isNonEmptyString(value.publicId) || !isNonEmptyString(value.version) || !isNonEmptyString(value.format)) {
    pushError(errors, path, '必须是包含 publicId / version / format 的图片对象。')
  }
}

function validateString(errors, path, value) {
  if (!isNonEmptyString(value)) pushError(errors, path, '必须是非空字符串。')
}

function validateEnum(errors, path, value, values) {
  if (!values.includes(value)) pushError(errors, path, `必须是以下值之一：${values.join(' / ')}。`)
}

function validateNumber(errors, path, value, { min = Number.NEGATIVE_INFINITY, max = Number.POSITIVE_INFINITY } = {}) {
  if (typeof value !== 'number' || Number.isNaN(value) || value < min || value > max) {
    pushError(errors, path, `必须是 ${min} 到 ${max} 之间的数字。`)
  }
}

function validateStringArray(errors, path, value) {
  if (!Array.isArray(value) || value.some((item) => !isNonEmptyString(item))) {
    pushError(errors, path, '必须是非空字符串数组。')
  }
}

function validateProfile(content, errors) {
  validateLocalizedText(errors, 'name', content.name)
  validateLocalizedText(errors, 'title', content.title)
  validateLocalizedText(errors, 'location', content.location)
  validateLocalizedText(errors, 'availabilityStatus', content.availabilityStatus || content.availability)
  if (!Array.isArray(content.workModes)) {
    pushError(errors, 'workModes', '必须是数组。')
  } else {
    content.workModes.forEach((mode, index) => validateLocalizedText(errors, `workModes.${index}`, mode))
  }
  validateLocalizedText(errors, 'summary', content.summary)
  validateString(errors, 'email', content.email)
  validateAsset(errors, 'avatar', content.avatar)

  if (!Array.isArray(content.links)) {
    pushError(errors, 'links', '必须是链接数组。')
    return
  }
  content.links.forEach((link, index) => {
    if (!isObject(link)) {
      pushError(errors, `links.${index}`, '必须是对象。')
      return
    }
    validateString(errors, `links.${index}.label`, link.label)
    validateString(errors, `links.${index}.href`, link.href)
  })
}

function validateSkills(content, errors) {
  if (!Array.isArray(content)) {
    pushError(errors, 'skills', '必须是数组。')
    return
  }
  content.forEach((group, index) => {
    if (!isObject(group)) {
      pushError(errors, `${index}`, '必须是对象。')
      return
    }
    validateString(errors, `${index}.id`, group.id)
    validateLocalizedText(errors, `${index}.name`, group.name)
    validateLocalizedText(errors, `${index}.description`, group.description)
    const normalizedLevel = normalizeSkillGroupLevel(group.level ?? group.emphasis)
    if (!normalizedLevel) pushError(errors, `${index}.level`, `必须是以下值之一：${SKILL_GROUP_LEVELS.map((item) => item.value).join(' / ')}。`)
    if (!Array.isArray(group.skills)) {
      pushError(errors, `${index}.skills`, '必须是技能数组。')
      return
    }
    group.skills.forEach((skill, skillIndex) => {
      if (!isObject(skill)) {
        pushError(errors, `${index}.skills.${skillIndex}`, '必须是对象。')
        return
      }
      validateString(errors, `${index}.skills.${skillIndex}.name`, skill.name)
      validateNumber(errors, `${index}.skills.${skillIndex}.years`, skill.years, { min: 0, max: 50 })
      validateEnum(errors, `${index}.skills.${skillIndex}.level`, skill.level, SKILL_LEVEL_VALUES)
      if (hasAnyLocalizedText(skill.description)) validateLocalizedText(errors, `${index}.skills.${skillIndex}.description`, skill.description)
    })
  })
}

function validateProjects(content, errors) {
  if (!Array.isArray(content)) {
    pushError(errors, 'projects', '必须是数组。')
    return
  }
  content.forEach((project, index) => {
    if (!isObject(project)) {
      pushError(errors, `${index}`, '必须是对象。')
      return
    }
    validateString(errors, `${index}.id`, project.id)
    validateLocalizedText(errors, `${index}.name`, project.name)
    validateLocalizedText(errors, `${index}.industry`, project.industry)
    validateString(errors, `${index}.period`, project.period)
    validateLocalizedText(errors, `${index}.role`, project.role)
    validateLocalizedText(errors, `${index}.team`, project.team)
    validateLocalizedText(errors, `${index}.summary`, project.summary)
    validateLocalizedText(errors, `${index}.challenge`, project.challenge)
    validateLocalizedText(errors, `${index}.solution`, project.solution)
    validateStringArray(errors, `${index}.technologies`, project.technologies)
    if (project.access != null) {
      if (!isObject(project.access)) {
        pushError(errors, `${index}.access`, '必须是对象。')
      } else {
        validateEnum(errors, `${index}.access.type`, project.access.type, ['url', 'qr'])
        validateLocalizedText(errors, `${index}.access.label`, project.access.label)
        if (project.access.type === 'url') validateString(errors, `${index}.access.href`, project.access.href)
        if (project.access.type === 'qr') validateAsset(errors, `${index}.access.image`, project.access.image)
      }
    }

    if (project.metrics != null) {
      if (!Array.isArray(project.metrics)) {
        pushError(errors, `${index}.metrics`, '必须是数组。')
      } else {
        project.metrics.forEach((metric, metricIndex) => {
          if (!isObject(metric)) {
            pushError(errors, `${index}.metrics.${metricIndex}`, '必须是对象。')
            return
          }
          validateLocalizedText(errors, `${index}.metrics.${metricIndex}.label`, metric.label)
          validateString(errors, `${index}.metrics.${metricIndex}.value`, metric.value)
        })
      }
    }

    if (project.lessons != null) {
      if (!Array.isArray(project.lessons)) {
        pushError(errors, `${index}.lessons`, '必须是数组。')
      } else {
        project.lessons.forEach((lesson, lessonIndex) => validateLocalizedText(errors, `${index}.lessons.${lessonIndex}`, lesson))
      }
    }

    if (project.image != null) validateAsset(errors, `${index}.image`, project.image)
  })
}

function validateTimeline(content, errors) {
  if (!Array.isArray(content)) {
    pushError(errors, 'timeline', '必须是数组。')
    return
  }
  content.forEach((item, index) => {
    if (!isObject(item)) {
      pushError(errors, `${index}`, '必须是对象。')
      return
    }
    validateString(errors, `${index}.id`, item.id)
    validateString(errors, `${index}.year`, item.year)
    validateLocalizedText(errors, `${index}.title`, item.title)
    validateLocalizedText(errors, `${index}.company`, item.company)
    validateLocalizedText(errors, `${index}.role`, item.role)
    validateLocalizedText(errors, `${index}.description`, item.description)
    validateStringArray(errors, `${index}.focus`, item.focus)
  })
}

export function validateContentFile(path, content) {
  const errors = []
  if (!CONTENT_FILE_SET.has(path)) {
    pushError(errors, path, '不支持的内容文件。')
    return { valid: false, errors }
  }
  if (!isObject(content) && !Array.isArray(content)) {
    pushError(errors, path, '内容必须是对象或数组。')
    return { valid: false, errors }
  }

  switch (path) {
    case 'src/data/profile.json':
      validateProfile(content, errors)
      break
    case 'src/data/skills.json':
      validateSkills(content, errors)
      break
    case 'src/data/projects.json':
      validateProjects(content, errors)
      break
    case 'src/data/timeline.json':
      validateTimeline(content, errors)
      break
    default:
      pushError(errors, path, '缺少对应的校验器。')
  }

  return { valid: errors.length === 0, errors }
}
