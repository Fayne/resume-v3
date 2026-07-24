export const CONTENT_FILES = [
  'src/data/profile.json',
  'src/data/skills.json',
  'src/data/projects.json',
  'src/data/timeline.json',
]

export const CONTENT_FILE_LABELS = {
  'src/data/profile.json': 'Profile',
  'src/data/skills.json': 'Skills',
  'src/data/projects.json': 'Projects',
  'src/data/timeline.json': 'Timeline',
}

export const CONTENT_FILE_SET = new Set(CONTENT_FILES)

export function getContentFileLabel(path) {
  return CONTENT_FILE_LABELS[path] || path
}
