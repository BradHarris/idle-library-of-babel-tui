import tseslint from 'typescript-eslint';
import solid from 'eslint-plugin-solid/configs/v2';

export default tseslint.config(
  { ignores: ['web/dist/**', 'node_modules/**'] },
  {
    files: ['src/**/*.ts', 'web/src/**/*.{ts,tsx}'],
    ...solid,
    languageOptions: { ...solid.languageOptions, parser: tseslint.parser },
  }
);
