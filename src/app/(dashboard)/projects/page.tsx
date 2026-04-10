'use client'

import { CreateProjectModal } from '@/components/projects/CreateProjectModal'
import { ProjectsGrid } from '@/components/projects/ProjectsGrid'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { apiClient } from '@/lib/api'
import { Project } from '@/lib/types/index'
import { useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'


function ProjectsPage() {
    // Data State
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // UI State
    const [searchQuery, setSearchQuery] = useState("");
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

    // Modal State
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [isCreating, setIsCreating] = useState(false);

    // Auth State
    const { getToken, userId } = useAuth()

    // Router State
    const router = useRouter()

    // Business Logic
    const loadProjects = async () => {
        try {
            setLoading(true);

            const token = await getToken();

            const result = await apiClient.get("/api/projects", token);

            const { data } = result || {};

            setProjects(data);

        } catch (error) {
            console.error("Error loading projects", error);
            toast.error("Failed to load projects")
        } finally {
            setLoading(false);
        }
    }

    const handleCreateProject = async (name: string, description: string) => {
        try {
            setError(null);
            setIsCreating(true);

            const token = await getToken();

            const result = await apiClient.post("/api/projects", {
                name,
                description
            }, token);

            const savedProject = result?.data?.[0] || result?.data
            setProjects((prev) => [savedProject, ...prev])

            setShowCreateModal(false);
            toast.success("Project created successfully!")

        } catch (error) {
            console.error("Error creating project", error);
            toast.error("Failed to create the project");

        } finally {
            setIsCreating(false);
        }
    }

    const handleDeleteProject = async (project_id: string) => {
        try {
            setError(null);

            const token = await getToken();
            await apiClient.delete(`/api/projects/${project_id}`, token);

            setProjects((prev) => prev.filter((project) => project.id !== project_id));
            toast.success("Project deleted successfully!")

        } catch (error) {
            console.error("Error deleting project", error);
            toast.error("Failed to delete the project");
        }
    }

    const handleProjectClick = (project_id: string) => {
        router.push(`/projects/${project_id}`)
    }

    const handleOpenModal = () => {
        setShowCreateModal(true)
    }

    const handleCloseModal = () => {
        setShowCreateModal(false)
    }

    useEffect(() => {
        if (userId) {
            loadProjects();
        }
    }, [userId])

    const filteredProjects = projects.filter(
        (project) =>
            project.name?.toLowerCase().includes(searchQuery.toLowerCase()) || project.description?.toLowerCase().includes(searchQuery.toLowerCase())
    )

    if (loading) {
        return <LoadingSpinner message="Loading projects...." />
    }

    return (
        <div>
            <ProjectsGrid
                projects={filteredProjects}
                loading={loading}
                error={error}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                onProjectClick={handleProjectClick}
                onCreateProject={handleOpenModal}
                onDeleteProject={handleDeleteProject}
            />

            <CreateProjectModal
                isOpen={showCreateModal}
                onClose={handleCloseModal}
                onCreateProject={handleCreateProject}
                isLoading={isCreating}
            />
        </div>
    )
}

export default ProjectsPage