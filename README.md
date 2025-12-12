## Setup Instructions

### Prerequisites

- Python 3.8+
- Node.js 16+
- Google Gemini API Key 

### Backend Setup

1. Navigate to server directory:
```bash
   cd server
```

2. Install dependencies:
```bash
   pip install -r requirements.txt
```

3. Create `.env` file:
```bash
   cp .env.example .env
```

4. Add your Gemini API key to `.env`:
```
   GEMINI_API_KEY=your_actual_key_here
```

5. Run the server:
```bash
   python -m uvicorn main:app --reload --port 8000
```

### Frontend Setup

1. Navigate to client directory:
```bash
   cd client
```

2. Install dependencies:
```bash
   npm install
```

3. Run the development server:
```bash
   npm run dev
```

4. Open http://localhost:5173 in your browser
