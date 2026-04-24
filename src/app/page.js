import ManagementDashboard from '@/components/modules/ManagementModule/ManagementDashboard';

export default function Home() {
  return (
    <div className="flex-1 w-full flex flex-col items-center overflow-hidden h-screen bg-black">
      {/* Background aesthetic */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[30%] -left-[10%] w-[70%] h-[70%] rounded-full bg-blue-900/20 blur-[120px] mix-blend-screen" />
        <div className="absolute bottom-[10%] -right-[10%] w-[50%] h-[50%] rounded-full bg-indigo-900/20 blur-[100px] mix-blend-screen" />
      </div>
      
      {/* Main Content Area */}
      <div className="z-10 w-full h-full flex p-4 sm:p-6 lg:p-8 max-w-screen-2xl mx-auto">
        <ManagementDashboard />
      </div>
    </div>
  );
}
