import { useEffect, type Dispatch, type SetStateAction } from 'react'
import { fetchWorklistFolders, fetchWorklistSpaces } from './api'
import type { WorklistFolder, WorklistSpace, WorklistUser } from './api'

type Setter<T> = Dispatch<SetStateAction<T>>
type HierarchyDataOptions = Readonly<{
    user: WorklistUser | null
    spaces: readonly WorklistSpace[]
    newListSpace: string
    setSpaces: Setter<readonly WorklistSpace[]>
    setFolders: Setter<readonly WorklistFolder[]>
    setPageError: (message: string) => void
}>

export const useWorklistHierarchyData = ({ user, spaces, newListSpace, setSpaces, setFolders, setPageError }: HierarchyDataOptions): void => {
    useEffect(() => {
        if (!user) return
        let active = true
        void fetchWorklistSpaces()
            .then((loaded) => { if (active) setSpaces(loaded) })
            .catch((error: unknown) => { if (active) setPageError(error instanceof Error ? error.message : 'Could not load Spaces.') })
        return () => { active = false }
    }, [user, setSpaces, setPageError])

    useEffect(() => {
        if (!user) return
        const space = spaces.find((candidate) => candidate.name === newListSpace)
        if (!space) { setFolders([]); return }
        let active = true
        void fetchWorklistFolders(space.id)
            .then((loaded) => { if (active) setFolders(loaded) })
            .catch((error: unknown) => { if (active) setPageError(error instanceof Error ? error.message : 'Could not load Folders.') })
        return () => { active = false }
    }, [user, spaces, newListSpace, setFolders, setPageError])
}
