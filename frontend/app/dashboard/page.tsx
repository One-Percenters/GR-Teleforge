export default function Dashboard() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-6 py-8">
        <h1 className="text-4xl font-black uppercase tracking-wider mb-8">
          <span className="text-white">GR</span>
          <span className="text-red-500 ml-2">Teleforge</span>
          <span className="text-zinc-400 ml-4 text-2xl">Dashboard</span>
        </h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Main workspace will go here */}
          <div className="bg-zinc-900 border-2 border-zinc-800 rounded-lg p-6">
            <h2 className="text-2xl font-bold mb-4">Workspace</h2>
            <p className="text-zinc-400">Main functionality coming soon...</p>
          </div>
          
          {/* Data panel */}
          <div className="bg-zinc-900 border-2 border-zinc-800 rounded-lg p-6">
            <h2 className="text-2xl font-bold mb-4">Data Panel</h2>
            <p className="text-zinc-400">Data visualization coming soon...</p>
          </div>
        </div>
      </div>
    </div>
  );
}
