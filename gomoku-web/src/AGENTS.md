# i18n Translation Key Consistency

## Problem
When adding new translation keys to `i18n.ts`, it's easy to forget to add them to all language locales (zh-CN, en-US). This leads to missing keys at runtime.

## Solution
- After adding new keys, run a script to compare key sets across languages.
- Use the Python script `check_i18n3.py` (located in project root) to detect missing keys.
- Add missing keys to the incomplete locale, using existing translations from other locales as reference.

## Script Usage
```bash
python check_i18n3.py
```

## Prevention
Consider adding a pre-commit hook that validates i18n key consistency.