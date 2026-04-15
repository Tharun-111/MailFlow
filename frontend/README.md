# Frontend — MailFlow Email Automation

Professional React + Vite admin dashboard for email automation.

## 📁 Project Structure

```
frontend/
├── public/                    # Static assets (images, fonts)
├── src/
│   ├── components/            # Reusable UI components
│   │   ├── Badge.jsx
│   │   └── index.js           # Component exports
│   ├── pages/                 # Full-page components
│   │   ├── LoginPage.jsx
│   │   └── DashboardPage.jsx
│   ├── services/              # API calls
│   │   └── api.js             # All backend endpoints
│   ├── hooks/                 # Custom React hooks
│   │   ├── useAuth.js         # Auth state management
│   │   └── useWebSocket.js    # WebSocket connection
│   ├── utils/                 # Utilities
│   │   ├── constants.js       # Email types, colors
│   │   └── helpers.js         # Helper functions
│   ├── styles/                # CSS files
│   │   └── index.css
│   ├── App.jsx                # Main component
│   └── main.jsx               # Entry point
├── package.json
├── vite.config.js
├── Dockerfile
├── nginx.conf
└── STRUCTURE.md
```

## 🚀 Getting Started

### Install Dependencies
```bash
npm install
```

### Development
```bash
npm run dev
# Visit http://localhost:3000
```

### Build for Production
```bash
npm run build
```

## 📚 File Descriptions

### `/src/services/api.js`
Centralized API communication. All backend calls go through here.
```javascript
import { getStudents, sendSingleEmail } from "@/services/api";
```

### `/src/utils/constants.js`
Configuration and constants.
```javascript
import { EMAIL_TYPES, STATUS_COLORS } from "@/utils/constants";
```

### `/src/utils/helpers.js`
Reusable utility functions.
```javascript
import { formatDate, truncate } from "@/utils/helpers";
```

### `/src/hooks/useAuth.js`
Authentication state management.
```javascript
const { user, login, logout } = useAuth();
```

### `/src/hooks/useWebSocket.js`
Real-time WebSocket notifications.
```javascript
const { connect } = useWebSocket(onMessage);
```

### `/src/components/Badge.jsx`
Reusable badge component.
```javascript
<Badge color="#6366f1">Active</Badge>
```

## 🔧 Key Features

✅ **Modular Structure** — Easy to scale and maintain  
✅ **Centralized API** — Single source of truth for backend calls  
✅ **Custom Hooks** — Reusable logic without prop drilling  
✅ **Component Library** — Build UI consistently  
✅ **Type-Safe** — Use JSDoc for documentation  
✅ **Production Ready** — Docker + Nginx configured  

## 🎯 Usage Examples

### Login
```javascript
import { useAuth } from "@/hooks/useAuth";

const { user, login } = useAuth();
await login("admin", "password");
```

### Fetch Students
```javascript
import { getStudents } from "@/services/api";

const students = await getStudents();
```

### WebSocket Notifications
```javascript
import { useWebSocket } from "@/hooks/useWebSocket";

const { connect } = useWebSocket((data) => {
  console.log("Email sent:", data);
});
```

## 📦 Dependencies

- React 18.2
- React DOM 18.2
- Vite 5.4 (build tool)

## 🐳 Docker

Build image:
```bash
docker build -t mailflow-frontend .
```

Run container:
```bash
docker run -p 3000:3000 mailflow-frontend
```

---

**Need help?** Check the backend API docs in `../backend/README.md`
