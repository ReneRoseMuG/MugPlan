# Manueller Review-Task

## Wie man ihn ausfuehrt

npm run review

## Was geprueft wird

1. TypeScript Typecheck (tsc --noEmit)
2. ESLint statische Codeanalyse
3. npm audit (bekannte Schwachstellen)
4. gitleaks (Secrets Scan)

## Trennung zu Tests

Tests werden separat ausgefuehrt:

npm run test
