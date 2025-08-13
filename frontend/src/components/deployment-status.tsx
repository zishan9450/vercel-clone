import { useEffect, useState } from 'react'
import { Card } from './ui/card'
import { CheckCircleIcon, LoaderIcon, XCircleIcon } from 'lucide-react'

interface DeploymentStatusProps {
  deploymentId: string
}

type Status = 'queued' | 'building' | 'deploying' | 'deployed' | 'failed'

export function DeploymentStatus({ deploymentId }: DeploymentStatusProps) {
  const [status, setStatus] = useState<Status>('queued')

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await fetch(`http://localhost:3000/status?id=${deploymentId}`)
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
        
        const data = await response.json()
        console.log('Status update:', data.status)
        setStatus(data.status)

        if (!['deployed', 'failed'].includes(data.status)) {
          setTimeout(checkStatus, 2000)
        }
      } catch (error) {
        console.error('Status check failed:', error)
        // Retry after a delay on error
        setTimeout(checkStatus, 5000)
      }
    }

    checkStatus()
  }, [deploymentId])

  return (
    <Card className="mt-8 p-6 max-w-2xl mx-auto">
      <h3 className="text-xl font-semibold mb-4">Deployment Status</h3>
      
      <div className="space-y-4">
        <StatusItem
          label="Queued"
          isDone={status !== 'queued'}
          isActive={status === 'queued'}
        />
        <StatusItem
          label="Building"
          isDone={['deployed', 'deploying', 'failed'].includes(status)}
          isActive={status === 'building'}
        />
        <StatusItem
          label="Deploying"
          isDone={['deployed', 'failed'].includes(status)}
          isActive={status === 'deploying'}
        />
        
        {status === 'deployed' && (
          <div className="mt-6 text-center">
            <p className="text-green-500 flex items-center justify-center gap-2">
              <CheckCircleIcon className="h-5 w-5" />
              Deployment Complete!
            </p>
            <a
              href={`http://${deploymentId}.localhost:3001`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline mt-2 inline-block"
            >
              View Deployment →
            </a>
          </div>
        )}

        {status === 'failed' && (
          <div className="mt-6 text-center text-red-500 flex items-center justify-center gap-2">
            <XCircleIcon className="h-5 w-5" />
            Deployment Failed
          </div>
        )}
      </div>
    </Card>
  )
}

function StatusItem({ label, isDone, isActive }: { label: string; isDone: boolean; isActive: boolean }) {
  return (
    <div className="flex items-center gap-3">
      {isDone ? (
        <CheckCircleIcon className="h-5 w-5 text-green-500" />
      ) : isActive ? (
        <LoaderIcon className="h-5 w-5 text-blue-500 animate-spin" />
      ) : (
        <div className="h-5 w-5 rounded-full border-2" />
      )}
      <span className={isActive ? 'text-blue-500 font-medium' : isDone ? 'text-muted-foreground' : ''}>
        {label}
      </span>
    </div>
  )
}