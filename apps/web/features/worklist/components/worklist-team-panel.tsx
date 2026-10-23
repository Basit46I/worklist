'use client'

import type { ReactElement } from 'react'
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input } from '@workspace/ui/primitives'
import { useWorklistPageState } from '../use-worklist-page-state'
import { useWorklistTeamActions } from '../use-worklist-team-actions'

export type WorklistTeamPanelProps = Readonly<{
    state: ReturnType<typeof useWorklistPageState>
    actions: ReturnType<typeof useWorklistTeamActions>
}>

export const WorklistTeamPanel = ({ state, actions }: WorklistTeamPanelProps): ReactElement | null => {
    const { user, showTeamMembers, setShowTeamMembers, teamMembers, showInviteForm, setShowInviteForm } = state
    const { changeMemberRole, removeMember, submitInvitation } = actions
    if (!user) return null

    return <>
        <Dialog onOpenChange={setShowTeamMembers} open={user.role === 'owner' && showTeamMembers}>
            <DialogContent className="max-h-[85vh] overflow-y-auto rounded-2xl border-[#dce4da] sm:max-w-2xl">
                <DialogHeader className="text-left">
                    <p className="text-[10px] font-semibold uppercase tracking-[.14em] text-[#668356]">Workspace access</p>
                    <DialogTitle>Team members</DialogTitle>
                    <DialogDescription>Review membership and choose the level of access each teammate needs.</DialogDescription>
                </DialogHeader>
                <section aria-label="Team member management">
                    <div className="mb-2 flex justify-end"><span className="rounded-full bg-[#f2f5ef] px-2.5 py-1 text-xs text-[#617064]">{teamMembers.length} {teamMembers.length === 1 ? 'member' : 'members'}</span></div>
                    {teamMembers.length === 0 ? <p className="rounded-lg bg-[#f7f9f5] p-4 text-sm text-[#718076]">No team members found.</p> : <ul className="divide-y divide-[#edf0eb] rounded-xl border border-[#e8ede5] px-4">
                        {teamMembers.map((member) => <li className="flex flex-wrap items-center justify-between gap-3 py-3" key={member.id}>
                            <div className="min-w-0"><p className="truncate text-sm font-medium text-[#2f4035]">{member.name}</p><p className="truncate text-xs text-[#718076]">{member.email}</p></div>
                            <div className="flex items-center gap-2">
                                {member.role === 'owner' ? <span className="rounded-full bg-[#eaf1e8] px-2.5 py-1 text-xs font-medium capitalize text-[#49694c]">Owner</span> : <>
                                    <select aria-label={`Role for ${member.name}`} className="h-9 rounded-lg border border-[#dce4dc] bg-white px-2 text-sm capitalize text-[#405247]" onChange={(event) => changeMemberRole(member.id, event.target.value as 'editor' | 'viewer')} value={member.role}><option value="editor">Editor</option><option value="viewer">Viewer</option></select>
                                    <Button className="h-9 rounded-lg" onClick={() => removeMember(member)} size="sm" variant="outline">Remove</Button>
                                </>}
                            </div>
                        </li>)}
                    </ul>}
                    <details className="mt-3 rounded-xl border border-[#e8ede5] bg-[#fafbf9] p-3">
                        <summary className="cursor-pointer text-sm font-medium text-[#344238]">What can each role do?</summary>
                        <div className="mt-3 overflow-x-auto"><table className="w-full min-w-[480px] text-left text-xs"><thead className="text-[#879188]"><tr><th className="py-2 pr-3 font-medium">Access</th><th className="px-2 py-2 font-medium">Owner</th><th className="px-2 py-2 font-medium">Editor</th><th className="px-2 py-2 font-medium">Viewer</th></tr></thead><tbody className="divide-y divide-[#e8ede5] text-[#59645b]"><tr><th className="py-2 pr-3 font-medium">View tasks and lists</th><td className="px-2">Yes</td><td className="px-2">Yes</td><td className="px-2">Yes</td></tr><tr><th className="py-2 pr-3 font-medium">Create, edit, and delete work</th><td className="px-2">Yes</td><td className="px-2">Yes</td><td className="px-2">No</td></tr><tr><th className="py-2 pr-3 font-medium">Invite and manage members</th><td className="px-2">Yes</td><td className="px-2">No</td><td className="px-2">No</td></tr></tbody></table></div>
                    </details>
                </section>
                <DialogFooter><Button className="bg-[#174638] text-white hover:bg-[#205642]" onClick={() => { setShowTeamMembers(false); setShowInviteForm(true) }} type="button">Invite teammate</Button></DialogFooter>
            </DialogContent>
        </Dialog>

        <Dialog onOpenChange={setShowInviteForm} open={user.role === 'owner' && showInviteForm}>
            <DialogContent className="rounded-2xl border-[#dce4da] sm:max-w-lg">
                <DialogHeader className="text-left"><p className="text-[10px] font-semibold uppercase tracking-[.14em] text-[#668356]">Grow your workspace</p><DialogTitle>Invite a teammate</DialogTitle><DialogDescription>They’ll receive an email with a secure link to join this workspace.</DialogDescription></DialogHeader>
                <form className="grid gap-4" onSubmit={submitInvitation}>
                    <label className="text-xs font-medium text-[#59665c]">Email address<Input aria-label="Invitee email" autoComplete="email" className="mt-1 h-11 rounded-xl border-[#dfe5dc]" name="email" placeholder="name@company.com" required type="email" /></label>
                    <label className="text-xs font-medium text-[#59665c]">Role<select aria-label="Invitee role" className="mt-1 h-11 w-full rounded-xl border border-[#dfe5dc] bg-white px-3 text-sm text-[#3d4c40]" defaultValue="editor" name="role"><option value="editor">Editor · can manage tasks</option><option value="viewer">Viewer · read-only access</option></select></label>
                    <DialogFooter><Button className="bg-[#174638] text-white hover:bg-[#205642]" type="submit">Send invite</Button><Button onClick={() => setShowInviteForm(false)} type="button" variant="ghost">Cancel</Button></DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    </>
}
