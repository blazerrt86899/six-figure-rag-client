import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import React from 'react'


async function Projects() {

    const { userId } = await auth()

    if (userId) {
        return (
            <div>This page shows list of all the projects to logged in users</div>
        )
    } else {
        redirect("/sign-in")
    }

}

export default Projects