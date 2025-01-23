import globals from "globals";
import tseslint from "typescript-eslint";


/** @type {import('eslint').Linter.Config[]} */
export default [
  {files: ["**/*.{js,mjs,cjs,ts}"]},
  {languageOptions: { globals: globals.node }},
  ...tseslint.configs.recommended,
  {rules: {
    "semi": ["error", "always"],
    "quotes": ["error", "double"],
    "eol-last": ["error", "always"],
    "indent": ["error", 4],
    "@typescript-eslint/no-unused-vars": [
        "error",
        {
            "args": "all",
            "argsIgnorePattern": "^_",
            "caughtErrors": "all",
            "caughtErrorsIgnorePattern": "^_",
            "destructuredArrayIgnorePattern": "^_",
            "varsIgnorePattern": "^_",
            "ignoreRestSiblings": true
        }
    ]
  }}
];
