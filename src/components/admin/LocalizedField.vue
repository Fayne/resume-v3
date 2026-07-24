<script setup>
import { computed } from 'vue'

const props = defineProps({
  label: { type: String, required: true },
  modelValue: { type: Object, default: () => ({ zh: '', en: '' }) },
  textarea: { type: Boolean, default: false },
  rows: { type: Number, default: 3 },
})

const emit = defineEmits(['update:modelValue'])

const value = computed(() => ({
  zh: props.modelValue?.zh ?? '',
  en: props.modelValue?.en ?? '',
}))

function update(locale, event) {
  emit('update:modelValue', {
    ...value.value,
    [locale]: event.target.value,
  })
}
</script>

<template>
  <div class="localized-field">
    <div class="field-label">{{ label }}</div>
    <div class="localized-grid">
      <label>
        <span>中文</span>
        <textarea
          v-if="textarea"
          :rows="rows"
          :value="value.zh"
          @input="update('zh', $event)"
        />
        <input
          v-else
          type="text"
          :value="value.zh"
          @input="update('zh', $event)"
        />
      </label>
      <label>
        <span>English</span>
        <textarea
          v-if="textarea"
          :rows="rows"
          :value="value.en"
          @input="update('en', $event)"
        />
        <input
          v-else
          type="text"
          :value="value.en"
          @input="update('en', $event)"
        />
      </label>
    </div>
  </div>
</template>

<style scoped>
.localized-field{display:grid;gap:10px}
.field-label{font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#666}
.localized-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
.localized-grid label{display:grid;gap:6px;font-size:12px;color:#666}
.localized-grid input,.localized-grid textarea{width:100%;border:1px solid #d7d5cf;background:#fff;padding:11px 12px;font:14px/1.6 Manrope,"Noto Sans SC",sans-serif;outline:0}
.localized-grid textarea{resize:vertical;min-height:96px}
@media(max-width:760px){.localized-grid{grid-template-columns:1fr}}
</style>
