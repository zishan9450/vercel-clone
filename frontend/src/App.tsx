import { useState } from 'react'
import { Header } from './components/header'
import { DeploymentForm } from './components/deployment-form'
import { DeploymentStatus } from './components/deployment-status'
import { ThemeProvider } from './components/theme-provider'
import './App.css'

function App() {
  const [deploymentId, setDeploymentId] = useState<string | null>(null)

  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <DeploymentForm onDeployment={setDeploymentId} />
          {deploymentId && <DeploymentStatus deploymentId={deploymentId} />}
        </main>
      </div>
    </ThemeProvider>
  )
}

export default App
