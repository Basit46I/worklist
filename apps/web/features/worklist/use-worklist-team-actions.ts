import type { Dispatch, FormEvent, SetStateAction } from 'react'
import { fetchTeamMembers, inviteTeamMember, removeTeamMember, updateTeamMemberRole } from './api'
import type { WorklistTeamMember, WorklistUser } from './api'

type Setter<T> = Dispatch<SetStateAction<T>>

type WorklistTeamActionsOptions = Readonly<{
    user: WorklistUser | null
    setTeamMembers: Setter<readonly WorklistTeamMember[]>
    setShowInviteForm: Setter<boolean>
    setShowTeamMembers: Setter<boolean>
    setPageError: Setter<string>
    setPageNotice: Setter<string>
}>

export const useWorklistTeamActions = ({
    user,
    setTeamMembers,
    setShowInviteForm,
    setShowTeamMembers,
    setPageError,
    setPageNotice
}: WorklistTeamActionsOptions) => {
    const submitInvitation = (event: FormEvent<HTMLFormElement>): void => {
        event.preventDefault()
        const form = new FormData(event.currentTarget)
        const role = String(form.get('role') ?? 'editor') as 'editor' | 'viewer'
        void inviteTeamMember(String(form.get('email') ?? ''), role)
            .then(() => {
                setPageNotice('Invitation email sent.')
                setPageError('')
                setShowInviteForm(false)
            })
            .catch((error: unknown) => {
                setPageError(error instanceof Error ? error.message : 'Could not send the invitation.')
            })
    }

    const openTeamMembers = (): void => {
        setShowTeamMembers((shown) => !shown)
        void fetchTeamMembers()
            .then(setTeamMembers)
            .catch((error: unknown) => {
                setPageError(error instanceof Error ? error.message : 'Could not load team members.')
            })
    }

    const changeMemberRole = (memberId: string, role: 'editor' | 'viewer'): void => {
        void updateTeamMemberRole(memberId, role)
            .then(async () => {
                setTeamMembers(await fetchTeamMembers())
                setPageNotice('Team member role updated.')
            })
            .catch((error: unknown) => {
                setPageError(error instanceof Error ? error.message : 'Could not update member role.')
            })
    }

    const removeMember = (member: WorklistTeamMember): void => {
        if (!window.confirm(`Remove ${member.name} from ${user?.teamName}? Their access will end immediately.`)) return
        void removeTeamMember(member.id)
            .then(async () => {
                setTeamMembers(await fetchTeamMembers())
                setPageNotice(`${member.name} was removed from the team.`)
            })
            .catch((error: unknown) => {
                setPageError(error instanceof Error ? error.message : 'Could not remove this member.')
            })
    }

    return { submitInvitation, openTeamMembers, changeMemberRole, removeMember } as const
}
