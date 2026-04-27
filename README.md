# Comfy AI

A comfortable, Claude-inspired chat interface built with Next.js, React, and Tailwind CSS.

## Features

- **Claude-like UI** - Clean, warm design with a focus on readability
- **Markdown Support** - Full markdown rendering with GitHub-flavored markdown
- **Syntax Highlighting** - Code blocks with language detection and copy-to-clipboard
- **Responsive Design** - Collapsible sidebar and mobile-friendly layout
- **Auto-resizing Input** - Textarea that grows with your message
- **Keyboard Shortcuts** - Enter to send, Shift+Enter for new lines

## Tech Stack

- Next.js 14 (App Router)
- React 18
- TypeScript
- Tailwind CSS
- react-markdown + remark-gfm + rehype-highlight
- Lucide React icons

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Project Structure

```
Comfy-AI/
├── app/                  # Next.js app router
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── chat/             # Chat-specific components
│   │   ├── chat-interface.tsx
│   │   ├── chat-input.tsx
│   │   ├── message-list.tsx
│   │   └── message.tsx
│   ├── sidebar.tsx       # Navigation sidebar
│   └── ui/               # Reusable UI components
│       └── button.tsx
├── lib/
│   └── utils.ts          # Utility functions (cn helper)
└── package.json
```

## License

MIT

Comfy Rules the AI space
