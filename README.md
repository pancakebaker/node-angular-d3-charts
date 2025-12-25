# Node Angular D3 Charts

A full‑stack demo project that showcases **data visualization with D3.js** using an **Angular frontend** and a **Node.js backend API**.

This project is intended for **learning, demos, and portfolio use**, focusing on clean separation of concerns, testability, and real‑world data handling (weather APIs).

---

## ✨ Features

- 📊 Interactive charts using **D3.js**
  - Bar Chart
  - Pie Chart
- ⚡ Angular (TypeScript) frontend
- 🌐 Node.js + Express backend
- ☁️ Weather data aggregation (Open‑Meteo, BOM)
- 🧪 Unit tests
  - Backend: Jest
  - Frontend: Angular TestBed
- 🔄 API‑driven chart updates
- 🧩 Clean project structure (frontend / backend)

---

## 🗂 Project Structure

```
node-angular-d3-charts/
│
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   ├── services/
│   │   └── utils/
│   ├── tests/
│   ├── server.js
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── pages/
│   │   │   ├── components/
│   │   │   └── services/
│   ├── angular.json
│   └── package.json
│
└── README.md
```

---

## 🚀 Getting Started

### 1️⃣ Prerequisites

- **Node.js** v18+
- **npm** v9+
- **Angular CLI**
  ```bash
  npm install -g @angular/cli
  ```

---

## 🔧 Backend Setup

```bash
cd backend
npm install
npm start
```

Backend will run at:

```
http://localhost:3000
```

### Run Backend Tests

```bash
npm test
```

---

## 🎨 Frontend Setup

```bash
cd frontend
npm install
npm start
```

Frontend will run at:

```
http://localhost:4200
```

### Run Frontend Tests

```bash
npm test
```

---

## 🔌 API Overview

| Endpoint | Method | Description |
|--------|--------|------------|
| `/api/barchart` | GET | Bar chart weather data |
| `/api/piechart` | GET | Pie chart weather data |
| `/api/health` | GET | Health check |

---

## 📊 Charts

- **Bar Chart**
  - Daily temperature comparison
- **Pie Chart**
  - Source‑based distribution (Open‑Meteo vs BOM)

Built using **pure D3.js**, no charting libraries.

---

## 🧪 Testing

### Backend
- Jest
- Supertest

### Frontend
- Angular TestBed

---

## 📄 License

This project is released under the **MIT License**.

---

## 👨‍💻 Author

PancakeBaker  
Senior Full‑Stack Developer  
Angular · Node.js · D3.js · TypeScript

