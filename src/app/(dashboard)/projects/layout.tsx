import { Sidebar } from "@/components/layout/Sidebar";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import React from "react";

async function DashboardLayout({ children }: { children: React.ReactNode }) {

    const { userId } = await auth();

    if (!userId) {
        redirect("/sign-in")
    } else {
        return (
            <div className="flex h-screen bg-gray-50">
                <Sidebar />
                <main className="flex-1 flex flex-col">{children}</main>
            </div>
        )
    }
}

export default DashboardLayout