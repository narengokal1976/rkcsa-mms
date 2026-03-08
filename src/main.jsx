import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

---

**File 5 — Also inside the `src` folder**, rename/copy `RKCSA-MMS-App.jsx` to `App.jsx`

---

Your final folder structure should look like this:
```
rkcsa-mms/
├── index.html
├── package.json
├── vite.config.js
└── src/
    ├── main.jsx
    └── App.jsx        ← this is your RKCSA-MMS-App.jsx renamed