"use client";

import { ConversationsList } from '@/components/projects/ConversationsList';
import { FileDetailsModal } from '@/components/projects/FileDetailsModal';
import { KnowledgeBaseSidebar } from '@/components/projects/KnowledgeBaseSidebar';
import React, { use, useEffect, useState } from 'react';
import { ProjectPageprops } from '@/lib/types/index';
import { useAuth } from '@clerk/nextjs';
import { apiClient } from '@/lib/api';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { NotFound } from '@/components/ui/NotFound';
import toast from 'react-hot-toast';
import { Project, ProjectDocument, Chat, ProjectSettings } from '@/lib/types/index'

interface ProjectData {
    project: Project | null;
    chats: Chat[];
    documents: ProjectDocument[];
    settings: ProjectSettings | null;
}


function ProjectPage({ params }: ProjectPageprops) {

    const { projectId } = use(params);

    const { getToken, userId } = useAuth();

    const [data, setData] = useState<ProjectData>({
        project: null,
        chats: [],
        documents: [],
        settings: null
    })

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [activeTab, setActiveTab] = useState<"documents" | "settings">("documents");

    const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);

    const [isCreatingChat, setIsCreatingChat] = useState(false);


    useEffect(() => {
        const loadAllData = async () => {
            if (!userId) return;

            try {

                setLoading(true);
                setError(null);

                const token = await getToken();

                const [projectRes, chatsRes, documentsRes, settingsRes] = await Promise.all([
                    apiClient.get(`/api/projects/${projectId}`, token),
                    apiClient.get(`/api/projects/${projectId}/chats`, token),
                    apiClient.get(`/api/projects/${projectId}/files`, token),
                    apiClient.get(`/api/projects/${projectId}/settings`, token),
                ])

                setData({
                    project: projectRes.data,
                    chats: chatsRes.data,
                    documents: documentsRes.data,
                    settings: settingsRes.data
                })
            } catch (error) {
                setError("Failed to fetch data")
                toast.error("Failed to fetch data")
            } finally {
                setLoading(false);
            }
        }

        loadAllData();
    }, [userId, projectId])

    // Chat related methods
    const handleCreateNewChat = async () => {
        if (!userId) return;

        try {
            setIsCreatingChat(true);
            const token = await getToken();
            const chatNumber = Date.now() % 10000;

            const result = await apiClient.post("/api/chats", {
                title: `Chat #${chatNumber}`,
                project_id: projectId
            }, token)

            const savedchat = result.data

            setData((prev) => ({
                ...prev,
                chats: [savedchat, ...prev.chats]
            }))

            toast.success("Chat created successfully")
        } catch (error) {
            toast.error("Failed to create chat")
        } finally {
            setIsCreatingChat(false);
        }

    }

    const handleDeleteChat = async (chatId: string) => {
        if (!userId) return;

        try {
            const token = await getToken();

            await apiClient.delete(`/api/chats/${chatId}`, token);

            setData((prev) => ({
                ...prev,
                chats: prev.chats.filter((chat) => chat.id !== chatId)
            }));

            toast.success("Chat deleted successfully!")
        } catch (error) {
            toast.error("Failed to delete chat")
        }
    }

    const handleChatClick = (chatId: string) => {
        console.log("Navigate to Chat: ", chatId)
    }

    // Document related methods
    const handleDocumentUpload = async (file: File[]) => {
        console.log("Document Upload")
    }

    const handleDocumentDelete = async (documentId: string) => {
        console.log("Document deleted with id: ", documentId)
    }

    const handleAddUrl = (url: string) => {
        console.log("Add URL: ", url)
    }

    const handleOpenDocument = (documentId: string) => {
        console.log("Open Document", documentId)
        setSelectedDocumentId(documentId);
    }

    // Project Settings Method
    const handleDraftSettings = (updates: any) => {
        console.log("Update local state with draft settings", updates)
    }

    const handlePublishSettings = async () => {
        console.log("Make API call for publishing settings")
    }

    const selectedDocument = selectedDocumentId ? data.documents.find((doc) => doc.id === selectedDocumentId) : null

    if (loading) {
        return <LoadingSpinner message='Loading project data...' />
    }

    if (!data.project) {
        return <NotFound message='Project not found' />
    }

    return (
        <>
            <div className='flex h-screen bg-[#0d1117] gap-4 p-4'>
                <ConversationsList
                    project={data.project}
                    conversations={data.chats}
                    error={error}
                    loading={isCreatingChat}
                    onCreateNewChat={handleCreateNewChat}
                    onChatClick={handleChatClick}
                    onDeleteChat={handleDeleteChat}
                />

                <KnowledgeBaseSidebar
                    activeTab={activeTab}
                    onSetActiveTab={setActiveTab}
                    projectDocuments={data.documents}
                    onDocumentUpload={handleDocumentUpload}
                    onDocumentDelete={handleDocumentDelete}
                    onOpenDocument={handleOpenDocument}
                    onUrlAdd={handleAddUrl}
                    projectSettings={data.settings}
                    settingsError={null}
                    settingsLoading={false}
                    onUpdateSettings={handleDraftSettings}
                    onApplySettings={handlePublishSettings}
                />
            </div>
            {selectedDocument &&
                <FileDetailsModal document={selectedDocument} onClose={() => setSelectedDocumentId(null)} />}
        </>
    )
}

export default ProjectPage