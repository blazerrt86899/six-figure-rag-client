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
    const handleDocumentUpload = async (files: File[]) => {
        if (!userId) return;

        const token = await getToken();
        const uploadedDocuments: ProjectDocument[] = [];

        const uploadPromise = files.map(async (file) => {
            console.log("File:", file);
            try {
                const uploadData = await apiClient.post(`/api/projects/${projectId}/files/upload-url`, {
                    filename: file.name,
                    file_size: file.size,
                    file_type: file.type
                }, token)

                const { upload_url, s3_key } = uploadData.data;

                await apiClient.uploadToS3(upload_url, file);

                const confirm_result = await apiClient.post(`/api/projects/${projectId}/files/confirm`, {
                    s3_key: s3_key
                }, token);

                if (confirm_result.data) {
                    toast.success("File upload confirm. Queued for celery to process..")
                }

                uploadedDocuments.push(confirm_result.data)

            } catch (error) {
                toast.error(`Failed to upload ${file.name}`)

            }
        });

        await Promise.allSettled(uploadPromise);

        // Update local state with successfully uploaded document
        setData((prev) => ({
            ...prev,
            documents: [...uploadedDocuments, ...prev.documents]
        }))

        toast.success(`${uploadedDocuments.length} file(s) uploaded.`)

    }

    const handleDocumentDelete = async (documentId: string) => {
        if (!userId) return;

        try {
            const token = await getToken();
            await apiClient.delete(`/api/projects/${projectId}/files/${documentId}`, token);

            setData((prev) => ({
                ...prev,
                documents: prev.documents.filter((doc) => doc.id != documentId),
            }))

            toast.success("Document deleted successfully");



        } catch (error) {
            toast.error("Document deletion failed");
        }

    }

    const handleAddUrl = async (url: string) => {
        if (!userId) return;

        try {
            const token = await getToken();

            const result = await apiClient.post(`/api/projects/${projectId}/urls`, {
                url: url
            }, token);

            const newDocument = result.data;

            setData((prev) => ({
                ...prev,
                documents: [newDocument, ...prev.documents]
            }))
            toast.success("Successfully added url")

        } catch (error) {
            toast.error("Failed to add website url")
        }
    }

    const handleOpenDocument = (documentId: string) => {
        setSelectedDocumentId(documentId);
    }

    // Project Settings Method
    const handleDraftSettings = (updates: any) => {
        setData((prev) => {
            if (!prev.settings) {
                console.warn("Cannot update settings: not loaded yet.")
                return prev;
            }

            return {
                ...prev,
                settings: {
                    ...prev.settings,
                    ...updates
                }
            }
        })
    }

    const handlePublishSettings = async () => {
        if (!userId || !data.settings) {
            toast.error("Cannot save settings!")
        }

        try {
            const token = await getToken();

            const result = await apiClient.put(`/api/projects/${projectId}/settings`, data.settings, token);

            setData((prev) => ({
                ...prev,
                settings: result.data
            }));

            toast.success("Settings saved successfully!")
        } catch (error) {
            toast.error("Failed to save settings")
        }

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