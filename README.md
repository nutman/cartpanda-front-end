# Upsell Funnel Builder

A visual drag-and-drop funnel builder for creating upsell funnels. Built with React, TypeScript, React Flow, and Tailwind CSS.

## 🚀 Live Demo

[View Live Demo](https://Cartpanda.dev/projects/c5389715-e4dd-4ffa-bdef-3e245c225e97)

## ✨ Features

### Core Features (MVP)
- **Infinite Canvas** - Pan and zoom around your funnel with an intuitive grid background
- **5 Node Types** - Sales Page, Order Page, Upsell, Downsell, and Thank You
- **Drag & Drop** - Drag node types from the sidebar palette onto the canvas
- **Visual Connections** - Connect nodes with animated arrows using handles
- **Auto-incrementing Labels** - Upsell 1, Upsell 2, etc. automatically named
- **Validation Warnings** - Visual warnings for orphan nodes and missing connections
- **Persistence** - Auto-saves to localStorage
- **Export/Import JSON** - Download and upload funnel configurations

### Bonus Features
- ✅ Zoom in/out controls
- ✅ Mini-map for navigation
- ✅ Node deletion (Backspace/Delete key)
- ✅ Edge deletion (select and delete)
- ✅ Validation panel showing issues

## 🏃 Running Locally

```bash
# Clone the repository
git clone <repo-url>
cd funnel-builder

# Install dependencies (using bun, npm, or yarn)
bun install
# or: npm install

# Start development server
bun dev
# or: npm run dev

# Open http://localhost:5173
```

## 🏗️ Architecture Decisions

### Technology Stack
- **React 18** - UI framework with hooks
- **TypeScript** - Type safety throughout
- **@xyflow/react (React Flow v12)** - Industry-standard library for node-based UIs
- **Tailwind CSS** - Utility-first styling with custom design system
- **shadcn/ui** - Accessible UI components

### File Structure
```
src/
├── components/
│   └── funnel/
│       ├── FunnelCanvas.tsx    # Main canvas with React Flow
│       ├── FunnelNode.tsx      # Custom node component
│       ├── FunnelToolbar.tsx   # Export/Import/Clear controls
│       └── NodePalette.tsx     # Draggable node sidebar
├── hooks/
│   └── useFunnelStore.ts       # State management + persistence
├── types/
│   └── funnel.ts               # TypeScript types + node config
└── pages/
    └── Index.tsx               # Main page wrapper
```

### State Management
Used a custom hook (`useFunnelStore`) instead of Redux/Zustand for simplicity:
- Manages nodes, edges, and label counters
- Handles localStorage persistence
- Provides validation logic
- Single source of truth for funnel state

### Design System
All colors and styles defined in `index.css` using CSS custom properties:
- Semantic color tokens for each node type
- Consistent shadows and borders
- Dark mode ready (tokens defined, toggle not implemented)

## ⚖️ Tradeoffs & What I'd Improve

### Current Tradeoffs
1. **No undo/redo** - Would require command pattern or state history
2. **No snap-to-grid** - React Flow supports this but adds complexity
3. **Basic validation** - Only checks connections, not business logic
4. **No node editing** - Labels and buttons are static after creation
5. **localStorage only** - No cloud sync or collaboration

### Future Improvements
1. **Undo/Redo** - Implement with `use-undo` or custom history stack
2. **Node Properties Panel** - Edit labels, button text, add images
3. **Snap to Grid** - Enable `snapToGrid` prop in React Flow
4. **Edge Labels** - Add "Yes/No" labels on connections for upsell flows
5. **Templates** - Pre-built funnel templates to start from
6. **Keyboard Shortcuts** - Cmd+Z undo, Cmd+S save, etc.
7. **Mobile Responsiveness** - Collapse sidebar on mobile
8. **Database Persistence** - Move from localStorage to Supabase
9. **Collaboration** - Real-time editing with presence indicators

## 📝 License

MIT
