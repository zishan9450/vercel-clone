import { useState } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Card } from './ui/card'
import { GithubIcon, RocketIcon } from 'lucide-react'

interface DeploymentFormProps {
  onDeployment: (id: string) => void
}

export function DeploymentForm({ onDeployment }: DeploymentFormProps) {
  const [repoUrl, setRepoUrl] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('http://localhost:3000/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl })
      })

      if (!response.ok) throw new Error('Deployment failed')

      const data = await response.json()
      onDeployment(data.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        <h2 className="text-2xl font-bold text-center">Deploy Your Project</h2>
        
        <div className="space-y-2">
          <div className="relative">
            <Input
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              placeholder="Enter your GitHub repository URL"
              className="pl-10"
              disabled={isLoading}
            />
            <GithubIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <Button 
          type="submit" 
          className="w-full"
          disabled={isLoading || !repoUrl}
        >
          {isLoading ? (
            <>
              <RocketIcon className="mr-2 h-4 w-4 animate-pulse" />
              Deploying...
            </>
          ) : (
            <>
              <RocketIcon className="mr-2 h-4 w-4" />
              Deploy
            </>
          )}
        </Button>
      </form>
    </Card>
  )
}