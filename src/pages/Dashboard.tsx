
import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import CandidateDashboard from '../components/Dashboard/CandidateDashboard';
import RecruiterDashboard from '../components/Dashboard/RecruiterDashboard';
import AdminDashboard from '../components/Dashboard/AdminDashboard';
import Navbar from '../components/Layout/Navbar';
import Sidebar from '../components/Layout/Sidebar';

const Dashboard = () => {
  const { user } = useAuth();

  const renderDashboard = () => {
    switch (user?.role) {
      case 'candidate':
        return <CandidateDashboard />;
      case 'recruiter':
        return <RecruiterDashboard />;
      case 'admin':
        return <AdminDashboard />;
      default:
        return <div>Unknown user role</div>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-8">
          {renderDashboard()}
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
