import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { api } from '@/lib/api'
import { deleteLocalProject, getOrCreateGuestUserId, listLocalProjects } from '@/lib/projectStorage'
import type { ProjectSummary } from '@/types/project'

const ProjectsPage = () => {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [projects, setProjects] = useState<ProjectSummary[]>([])

  useEffect(() => {
    const localProjects = listLocalProjects().map((project) => ({
      id: project.id,
      name: project.name,
      bpm: project.bpm,
      key: project.key,
      tags: project.tags,
      updated_at: project.updated_at,
    }))
    setProjects(localProjects)

    const userId = getOrCreateGuestUserId()
    api.listProjects(userId).then((remoteProjects) => {
      if (remoteProjects.length > 0) {
        setProjects(remoteProjects)
      }
    }).catch(() => {
      // Guest/local mode fallback.
    })
  }, [])

  const filteredProjects = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return projects

    return projects.filter((project) => {
      const haystack = [project.name, project.key, ...project.tags].filter(Boolean).join(' ').toLowerCase()
      return haystack.includes(normalized)
    })
  }, [projects, query])

  return (
    <main className="min-h-screen bg-[#050505] px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-zinc-500">Projects</p>
            <h1 className="mt-2 text-3xl font-semibold">Your strudelussy sessions</h1>
          </div>
          <Button className="bg-purple-600 text-white hover:bg-purple-500" onClick={() => navigate('/')}>
            New Project
          </Button>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-zinc-900 bg-black/50 px-4 py-3">
          <Search className="h-4 w-4 text-zinc-500" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name, key, or tag"
            className="w-full bg-transparent text-sm text-white outline-none placeholder:text-zinc-500"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredProjects.map((project) => (
            <Card key={project.id} className="border-zinc-900 bg-black/50 text-white shadow-none">
              <CardHeader className="space-y-2 px-5 py-4">
                <p className="text-lg font-semibold">{project.name}</p>
                <p className="text-xs text-zinc-500">Updated {new Date(project.updated_at).toLocaleString()}</p>
              </CardHeader>
              <CardContent className="space-y-4 px-5 pb-5">
                <div className="flex flex-wrap gap-2 text-xs text-zinc-400">
                  <span className="rounded-full bg-zinc-900 px-2.5 py-1">BPM {project.bpm ?? 'n/a'}</span>
                  <span className="rounded-full bg-zinc-900 px-2.5 py-1">{project.key || 'No key'}</span>
                  {project.tags.map((tag) => (
                    <span key={tag} className="rounded-full bg-purple-950/60 px-2.5 py-1 text-purple-200">#{tag}</span>
                  ))}
                </div>
                <div className="flex items-center justify-between gap-3">
                  <Button asChild className="bg-purple-600 text-white hover:bg-purple-500">
                    <Link to={`/?project=${project.id}`}>Open</Link>
                  </Button>
                  <Button
                    variant="outline"
                    className="border-zinc-700 bg-transparent text-zinc-300 hover:bg-zinc-900"
                    onClick={() => {
                      deleteLocalProject(project.id)
                      setProjects((current) => current.filter((entry) => entry.id !== project.id))
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </main>
  )
}

export default ProjectsPage
