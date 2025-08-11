# Neural Control Hub - Advanced RAT Controller Dashboard

## Overview

This project has been completely migrated from a Flask-based HTML dashboard to a modern React TypeScript frontend with a clean Python Flask backend. All HTML content has been removed from `controller.py` and replaced with a sophisticated React dashboard that provides comprehensive agent control and monitoring capabilities.

## Architecture

### Backend (Python Flask + Socket.IO)
- **File**: `controller.py`
- **Purpose**: Pure backend API with Socket.IO for real-time communication
- **Features**: WebRTC SFU, Agent management, Security controls, File transfer, Authentication

### Frontend (React TypeScript)
- **Framework**: React 18 with TypeScript
- **UI Library**: Shadcn/ui components
- **Styling**: Tailwind CSS
- **Real-time**: WebSocket connections for live updates
- **Routing**: React Router DOM

## Implemented Features

### 🎯 Main Dashboard
- **Overview**: Real-time metrics, charts, and system health monitoring
- **Agent Management**: Comprehensive agent listing with status, capabilities, and controls
- **Navigation**: Clean, organized navigation bar with categorized features

### 🎮 Control Features

#### Basic Streaming Control
- **Location**: `/src/components/streaming/StreamingControlPanel.tsx`
- **Features**: Screen, camera, and audio streaming controls
- **WebRTC**: Basic WebRTC peer connections and media management

#### Advanced WebRTC Control ⚡
- **Location**: `/src/components/streaming/EnhancedWebRTCPanel.tsx`
- **Features**:
  - Adaptive bitrate control
  - Frame dropping for performance optimization
  - Real-time quality monitoring and scoring
  - Production readiness assessment
  - Scalability metrics and alerts
  - Migration planning for mediasoup
  - Enhanced performance statistics

#### Security Control
- **Location**: `/src/components/security/SecurityControlPanel.tsx`
- **Features**: Windows Defender control, AV bypass, process hiding, anti-VM/debug

#### Persistence Control
- **Location**: `/src/components/persistence/PersistenceControlPanel.tsx`
- **Features**: Registry keys, startup entries, scheduled tasks, Windows services

#### Basic Monitoring Control
- **Location**: `/src/components/monitoring/MonitoringControlPanel.tsx`
- **Features**: Basic keylogger, clipboard, reverse shell, voice control

#### Basic File Transfer
- **Location**: `/src/components/filetransfer/FileTransferPanel.tsx`
- **Features**: Simple file upload and download

#### Advanced File Transfer 📁
- **Location**: `/src/components/filetransfer/EnhancedFileTransferPanel.tsx`
- **Features**:
  - Chunked file uploads/downloads (64KB chunks)
  - Remote file browser with directory navigation
  - Transfer queue management with pause/resume
  - Progress tracking and speed monitoring
  - Drag-and-drop file uploads
  - Advanced transfer statistics

### 🛠️ Tools

#### Terminal
- **Location**: `/src/components/terminal/TerminalPanel.tsx`
- **Features**: Command execution, output display, command history

#### Process List
- **Location**: `/src/components/processes/ProcessListPanel.tsx`
- **Features**: Process listing, filtering, sorting, process termination

#### System Information
- **Location**: `/src/components/system/SystemInfoPanel.tsx`
- **Features**: Hardware info, OS details, network configuration, security status

#### Network Monitor
- **Location**: `/src/components/network/NetworkPanel.tsx`
- **Features**: Active connections, network adapters, traffic statistics

#### Advanced Keylogger 🔍
- **Location**: `/src/components/monitoring/KeyloggerPanel.tsx`
- **Features**:
  - Real-time keystroke capture
  - Window context tracking
  - Sensitive data masking
  - Export capabilities
  - Advanced filtering and search

#### Clipboard Monitor 📋
- **Location**: `/src/components/monitoring/ClipboardMonitorPanel.tsx`
- **Features**:
  - Real-time clipboard monitoring
  - Content type detection (text, image, file, URL)
  - Sensitive content detection and masking
  - History management with search and filtering
  - Export to CSV

#### Voice Control 🎤
- **Location**: `/src/components/monitoring/VoiceControlPanel.tsx`
- **Features**:
  - Speech recognition and transcription
  - Voice command execution
  - Multi-language support
  - Confidence scoring
  - Audio level monitoring
  - Command history and statistics

#### Reverse Shell 💻
- **Location**: `/src/components/monitoring/ReverseShellPanel.tsx`
- **Features**:
  - Interactive shell sessions (CMD, PowerShell, Bash)
  - Command history with arrow key navigation
  - Real-time output display
  - Session management
  - Export capabilities

## Navigation Structure

The navigation is organized into three main categories:

### Main
- **Overview**: Dashboard with metrics and charts
- **Agents**: Agent management and status

### Control
- **Basic Streaming**: Standard WebRTC controls
- **Advanced WebRTC**: Production-grade streaming features
- **Security**: Security evasion and controls
- **Persistence**: Persistence method management
- **Monitoring**: Input monitoring and logging
- **Basic File Transfer**: Simple file operations
- **Advanced File Transfer**: Enhanced file management

### Tools
- **Terminal**: Command execution
- **Processes**: Process management
- **System Info**: System diagnostics
- **Network**: Network monitoring
- **Keylogger**: Advanced keystroke monitoring

## WebSocket Events

The React frontend communicates with the Flask backend using Socket.IO events:

### WebRTC Events
- `webrtc_get_enhanced_stats`
- `webrtc_get_monitoring_data`
- `webrtc_get_production_readiness`
- `webrtc_get_migration_plan`
- `webrtc_adaptive_bitrate_control`
- `webrtc_implement_frame_dropping`
- `webrtc_set_quality`

### Control Events
- `stream_control`
- `security_control`
- `persistence_control`
- `monitoring_control`
- `file_control`

### System Events
- `get_agent_stats`
- `get_system_health`
- `list_processes`
- `refresh_dashboard`
- `issue_command`

## Key Improvements

1. **Separation of Concerns**: Clean separation between backend API and frontend UI
2. **Modern UI**: Professional dashboard using Shadcn/ui components
3. **Real-time Updates**: WebSocket-based live data updates
4. **Enhanced Features**: Advanced WebRTC, monitoring, and file transfer capabilities
5. **Better Organization**: Logical categorization and navigation structure
6. **Type Safety**: Full TypeScript implementation with proper interfaces
7. **Responsive Design**: Mobile-friendly responsive layout
8. **Performance**: Optimized rendering and data handling

## Development (Windows)

### Prerequisites
- Node.js 18+
- Python 3.8+
- Windows 10/11

### Setup
```cmd
# Install frontend dependencies
npm install

# Create and activate virtual environment
python -m venv venv
venv\Scripts\activate.bat

# Install backend dependencies
pip install -r requirements.txt

# Start backend
python controller.py

# Start frontend (in development)
npm run dev
```

### Quick Start (Windows)
```cmd
# Option 1: Use batch file
run.bat

# Option 2: Use bash script (if you have Git Bash/WSL)
./run.sh
```

### Production Deployment
```bash
# Build frontend
npm run build

# Serve static files through Flask
# Frontend build files should be served at / route
```

## Windows Compatibility

### WebRTC Support
- **Default**: WebRTC is disabled due to Windows compatibility issues with `aiortc`
- **Fallback**: Uses Socket.IO streaming for video/audio
- **To Enable WebRTC**: Uncomment the WebRTC dependencies in `requirements.txt` and install Visual Studio Build Tools + FFmpeg

### Troubleshooting
- **RLock Error**: Fixed in the updated `controller.py`
- **Import Errors**: WebRTC imports are now handled gracefully
- **Port Issues**: Change port in configuration or kill existing processes

## Security Considerations

⚠️ **Important**: This is a demonstration/educational project. In production:
- Use proper authentication and authorization
- Implement rate limiting and input validation
- Use HTTPS/WSS for all communications
- Follow security best practices for file transfers
- Implement proper logging and audit trails

## Migration Summary

✅ **Completed Migration Tasks:**
- [x] Removed all HTML content from `controller.py`
- [x] Created modern React TypeScript frontend
- [x] Implemented clean navigation structure
- [x] Added all controller.py features to React components
- [x] Enhanced WebRTC with advanced features
- [x] Advanced monitoring capabilities
- [x] Enhanced file transfer system
- [x] Organized component structure
- [x] WebSocket integration for real-time updates

The dashboard now provides a professional, scalable, and maintainable interface for all RAT controller operations with enhanced features beyond the original HTML implementation.
