# 🚀 NeuroChat Quick Start Guide

Get NeuroChat up and running in 5 minutes!

## Prerequisites

Make sure you have the following installed:
- **Node.js** (v18 or higher) - [Download here](https://nodejs.org/)
- **MongoDB** (v4.4 or higher) - [Download here](https://www.mongodb.com/try/download/community)
- **OpenAI API Key** - Get one at https://platform.openai.com/api-keys

## Step 1: Install Dependencies

### Backend
```bash
cd neurochat/backend
npm install
```

### Frontend
```bash
cd ../frontend
npm install
```

## Step 2: Configure Environment

1. **Get your OpenAI API Key**
   - Go to https://platform.openai.com/api-keys
   - Sign up or log in
   - Create a new API key
   - Copy the key (it starts with `sk-`)

2. **Configure Backend**
   
   Navigate to the backend directory and create/edit the `.env` file:
   
   ```bash
   cd neurochat/backend
   nano .env  # or use your preferred editor
   ```
   
   Update these values:
   ```env
   # OpenAI API Configuration
   OPENAI_API_KEY=your_actual_openai_api_key_here
   
   # MongoDB Configuration (update if needed)
   MONGODB_URI=mongodb://localhost:27017/neurochat
   
   # JWT Secret (change in production!)
   JWT_SECRET=your_super_secret_jwt_key
   
   # Other settings can remain as defaults
   ```

3. **Configure Frontend**
   
   The frontend should work with default settings, but you can verify the `.env` file:
   
   ```bash
   cd neurochat/frontend
   cat .env
   ```
   
   It should contain:
   ```env
   VITE_API_URL=http://localhost:5000
   VITE_SOCKET_URL=http://localhost:5000
   ```

## Step 3: Start MongoDB

### Option A: Local MongoDB
```bash
# On macOS (with Homebrew)
brew services start mongodb-community

# On Linux
sudo systemctl start mongod

# On Windows
# MongoDB runs as a service, or run mongod.exe directly
```

### Option B: MongoDB Atlas (Cloud)
1. Go to https://www.mongodb.com/cloud/atlas
2. Create a free account
3. Create a free cluster
4. Get your connection string
5. Update `MONGODB_URI` in backend/.env with your connection string

**Verify MongoDB is running:**
```bash
# Check if MongoDB is responding
mongo --eval "db.version()"
# or
mongosh --eval "db.version()"
```

## Step 4: Run the Application

### Terminal 1 - Backend
```bash
cd neurochat/backend
npm run dev
```

You should see:
```
Server running on port 5000
Environment: development
MongoDB Connected: localhost:27017
```

### Terminal 2 - Frontend
```bash
cd neurochat/frontend
npm run dev
```

You should see:
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

## Step 5: Access NeuroChat

Open your browser and navigate to:
```
http://localhost:5173
```

## First Use

1. **Create an Account**
   - Click "Sign Up"
   - Enter username, email, and password
   - Click "Create Account"

2. **Start Chatting**
   - You'll see a welcome screen
   - Type your message in the input box
   - Press Enter or click Send
   - Watch the AI respond in real-time!

3. **Explore Features**
   - 💬 Click "New Chat" to start a new conversation
   - 🎨 Toggle dark/light mode with the moon/sun icon
   - 📁 Attach PDF or text files for analysis
   - 🎤 Use voice input (click microphone icon)
   - 🔊 Click speaker icon to hear responses
   - ⚙️ Access settings to change language or preferences
   - 📊 View analytics to track your usage

## Troubleshooting

### MongoDB Connection Issues
```
Error: connect ECONNREFUSED 127.0.0.1:27017
```
**Solution:** Make sure MongoDB is running:
```bash
# macOS/Linux
sudo systemctl start mongod
# or
brew services start mongodb-community

# Windows
# Start MongoDB service from Services
```

### OpenAI API Errors
```
Error: Incorrect API key provided
```
**Solution:**
- Verify your API key in backend/.env
- Make sure the key starts with `sk-`
- Check you have credits in your OpenAI account

### Port Already in Use
```
Error: listen EADDRINUSE: address already in use :::5000
```
**Solution:**
```bash
# Find and kill the process using the port
# On macOS/Linux
lsof -ti:5000 | xargs kill -9

# On Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

### Frontend Can't Connect to Backend
```
Network Error / CORS Error
```
**Solution:**
- Verify backend is running on port 5000
- Check VITE_API_URL in frontend/.env
- Make sure both are running locally

## Next Steps

### Customize Your Bot
Edit `neurochat/backend/utils/openai.js` to:
- Add custom system prompts
- Modify bot roles
- Change model parameters
- Add more languages

### Add Features
- Implement more bot roles
- Add more language support
- Create custom themes
- Add more analytics visualizations

### Deploy
Check the main README.md for deployment instructions.

## Need Help?

- 📖 Read the full [README.md](./README.md)
- 🐛 Report issues on GitHub
- 💬 Join our community discussions

---

**Enjoy using NeuroChat! 🧠✨**