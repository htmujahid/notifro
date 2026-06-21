import js from '@eslint/js'
import globals from 'globals'
import tsPlugin from 'typescript-eslint'

export default tsPlugin.config(
  js.configs.recommended,
  ...tsPlugin.configs.recommended,
  {
    languageOptions: { globals: { ...globals.node } },
    rules: { '@typescript-eslint/no-explicit-any': 'off' },
  },
)
