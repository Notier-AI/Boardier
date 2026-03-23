# Boardier Website

The marketing site, interactive demo, and auto-generated documentation for Boardier.

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Routes

| Route | Description |
|-------|-------------|
| `/` | Marketing homepage |
| `/demo` | Interactive whiteboard demo |
| `/docs` | Auto-generated API documentation |

## Regenerating Documentation

The `/docs` page reads from `src/data/docs.json`. To regenerate after changing source annotations:

```bash
cd ..
npx tsx scripts/parseDocsFromSource.ts
```
