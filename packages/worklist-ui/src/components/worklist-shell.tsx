'use client'

import { useState, type ReactElement, type ReactNode } from 'react'
import { Bell, ChevronDown, House, ListChecks, ListTodo, LogOut, PanelLeftClose, PanelLeftOpen, Search, type LucideIcon } from 'lucide-react'

type WorklistRoute = 'dashboard' | 'worklist' | 'board' | 'calendar'
type WorklistPath = `/${WorklistRoute}` | '/worklist?view=board' | '/dashboard#reports'
export type WorklistWorkspaceAction = Readonly<{ label: string; icon: LucideIcon; onClick?: () => void; href?: WorklistPath }>
export type WorklistShellList = Readonly<{ id: string; name: string; spaceName: string; folderName: string }>
export type WorklistShellContext = Readonly<{ spaceName: string; folderName?: string; listName: string }>
export type WorklistShellLinkProps = Readonly<{
    href: WorklistPath
    key: string
    className: string
    children: ReactNode
    'aria-current'?: 'page'
    onClick?: () => void
}>

type WorklistShellUser = Readonly<{ name: string; email: string; teamName: string; role: string }>
export type WorklistShellProps = Readonly<{
    activeRoute: WorklistRoute
    children: ReactNode
    onSignOut: () => void
    signOutBusy: boolean
    user: WorklistShellUser
    workspaceActions?: readonly WorklistWorkspaceAction[]
    workspaceLists?: readonly WorklistShellList[]
    activeListId?: string
    projectContext?: WorklistShellContext
    onListSelect?: (listId: string) => void
    onCreateList?: () => void
    renderLink: (props: WorklistShellLinkProps) => ReactElement
}>

const navigation: readonly Readonly<{ href: WorklistPath; label: string; route: WorklistRoute; icon: LucideIcon }>[] = [
    { href: '/dashboard', label: 'Overview', route: 'dashboard', icon: House },
    { href: '/worklist', label: 'Worklist', route: 'worklist', icon: ListTodo },
]

const initials = (name: string): string => name.split(/\s+/).map((part) => part[0] ?? '').join('').slice(0, 2).toUpperCase()

export const WorklistShell = ({ activeRoute, children, onSignOut, signOutBusy, user, projectContext, renderLink }: WorklistShellProps): ReactElement => {
    const [accountOpen, setAccountOpen] = useState(false)
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
    const navLinks = (mobile = false): ReactElement[] => navigation.map(({ href, icon: Icon, label, route }) => {
        const current = activeRoute === route || (route === 'worklist' && activeRoute !== 'dashboard')
        return renderLink({
            ...(current ? { 'aria-current': 'page' as const } : {}),
            className: mobile
                ? `flex min-h-12 flex-1 flex-col items-center justify-center gap-1 rounded-xl text-[10px] ${current ? 'bg-[#dfeae1] font-semibold text-[#16483a]' : 'text-[#b9cbc3]'}`
                : `group flex min-h-10 items-center rounded-lg text-[13px] transition-colors ${sidebarCollapsed ? 'justify-center px-2' : 'gap-3 px-3'} ${current ? 'bg-[#dfeae1] font-semibold text-[#174638]' : 'text-[#e2ebe6] hover:bg-white/10 hover:text-white'}`,
            href,
            key: label,
            onClick: () => { setAccountOpen(false) },
            children: <><Icon aria-hidden="true" className="size-[17px] shrink-0" /><span className={mobile || !sidebarCollapsed ? '' : 'sr-only'}>{label}</span></>,
        })
    })
    const accountMenu = accountOpen && <div className="absolute bottom-full right-0 z-50 mb-2 w-64 rounded-2xl border border-[#e5e8e2] bg-white p-2 text-[#263329] shadow-[0_18px_44px_-20px_rgba(23,33,28,.32)] lg:bottom-[calc(100%+8px)] lg:w-full" role="menu">
        <div className="grid gap-1 border-b border-[#edf0eb] px-3 py-2"><strong className="truncate text-sm">{user.name}</strong><span className="truncate text-xs text-[#718076]">{user.email}</span><span className="text-xs capitalize text-[#879188]">{user.teamName} · {user.role}</span></div>
        <button className="mt-1 flex min-h-10 w-full items-center gap-2 rounded-xl px-3 text-left text-sm text-[#59645b] hover:bg-[#f7f9f5] disabled:opacity-60" disabled={signOutBusy} onClick={onSignOut} role="menuitem" type="button"><LogOut aria-hidden="true" className="size-4" />{signOutBusy ? 'Signing out…' : 'Sign out'}</button>
    </div>

    return <div className={`worklist-app min-h-screen bg-[#f7f8f4] text-[#26362d] lg:grid ${sidebarCollapsed ? 'lg:grid-cols-[80px_minmax(0,1fr)]' : 'lg:grid-cols-[232px_minmax(0,1fr)]'}`}>
        <aside aria-label="Workspace navigation" className={`sticky top-0 hidden h-screen min-h-[520px] flex-col bg-[#174638] py-5 text-white transition-[width,padding] duration-200 lg:flex ${sidebarCollapsed ? 'items-center px-3' : 'px-[18px]'}`}>
            <div className={`mb-8 flex w-full items-center ${sidebarCollapsed ? 'justify-center' : 'px-1'}`}>
                {renderLink({ className: `flex min-w-0 items-center font-semibold tracking-tight text-white ${sidebarCollapsed ? 'justify-center' : 'gap-2.5'}`, href: '/dashboard', key: 'brand-link', children: <><ListChecks aria-hidden="true" className="size-6 shrink-0" /><span className={sidebarCollapsed ? 'sr-only' : 'text-[21px] tracking-[-.04em]'}>worklist</span></> })}
            </div>
            {!sidebarCollapsed && <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[.12em] text-[#9db8ac]">Workspace</p>}
            <nav aria-label="Workspace pages" className="grid w-full gap-1">{navLinks()}</nav>
            <div className="mt-auto w-full border-t border-white/10 pt-4">
                <div className="relative flex min-h-12 items-center gap-2 rounded-lg bg-white/[.08] p-1.5">
                    <span aria-label={`${user.name} profile`} className="grid size-8 shrink-0 place-items-center rounded-full bg-[#e1eae0] text-[10px] font-semibold text-[#174638]" title={user.name}>{initials(user.name)}</span>
                    {!sidebarCollapsed && <span className="grid min-w-0 flex-1 gap-0.5"><strong className="truncate text-[11px] font-semibold text-white">{user.name}</strong><span className="truncate text-[10px] text-[#b8cbc2]">{user.role}</span></span>}
                    <button aria-expanded={accountOpen} aria-haspopup="menu" aria-label="Account menu" className="grid size-7 shrink-0 place-items-center rounded-md text-[#c6d6ce] hover:bg-white/10 hover:text-white" onClick={() => { setAccountOpen((open) => !open) }} type="button"><ChevronDown aria-hidden="true" className="size-4" /></button>
                    {accountMenu}
                </div>
            </div>
        </aside>
        <main className="app-content worklist-main min-w-0 pb-20 lg:pb-0">
            <header className="worklist-topbar sticky top-0 z-30 flex h-[68px] items-center justify-between gap-4 border-b border-[#e4e9e2] bg-[#f8f9f5]/95 px-4 backdrop-blur sm:px-8">
                <div className="flex min-w-0 items-center gap-3">
                    <button aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'} className="hidden size-8 shrink-0 place-items-center rounded-lg text-[#66756b] hover:bg-[#edf1ec] lg:grid" onClick={() => { setSidebarCollapsed((value) => !value) }} title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'} type="button">{sidebarCollapsed ? <PanelLeftOpen aria-hidden="true" className="size-[18px]" /> : <PanelLeftClose aria-hidden="true" className="size-[18px]" />}</button>
                    <span className="truncate text-[13px] text-[#718078]">{user.teamName}</span>{projectContext && <><span className="text-xs text-[#adb7ae]">/</span><span className="truncate text-[13px] text-[#718078]">{projectContext.spaceName}</span>{projectContext.folderName && <><span className="text-xs text-[#adb7ae]">/</span><span className="truncate text-[13px] text-[#718078]">{projectContext.folderName}</span></>}<span className="text-xs text-[#adb7ae]">/</span><span className="truncate text-[13px] font-medium text-[#25382e]">{projectContext.listName}</span></>}
                </div>
                <div className="flex shrink-0 items-center gap-1 sm:gap-2">
                    <button aria-label="Focus task search" className="grid size-8 place-items-center rounded-lg text-[#748178] hover:bg-[#edf1ec]" onClick={() => document.querySelector<HTMLInputElement>('input[aria-label="Search tasks"]')?.focus()} type="button"><Search aria-hidden="true" className="size-[17px]" /></button>
                    <button aria-label="Notifications" className="grid size-8 place-items-center rounded-lg text-[#748178] hover:bg-[#edf1ec]" type="button"><Bell aria-hidden="true" className="size-[17px]" /></button>
                    <button aria-expanded={accountOpen} aria-haspopup="menu" aria-label="Open account menu" className="relative ml-1 grid size-8 place-items-center rounded-full bg-[#e7eee6] text-[10px] font-semibold text-[#355844]" onClick={() => { setAccountOpen((open) => !open) }} type="button">{initials(user.name)}</button>
                    {accountMenu}
                </div>
            </header>
            {children}
        </main>
        <nav aria-label="Workspace pages" className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-1 border-t border-[#e8ebe5] bg-white/95 px-3 py-2 pb-[max(.5rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_-20px_rgba(23,33,28,.3)] backdrop-blur lg:hidden">{navLinks(true)}<div className="relative flex flex-1 justify-center"><button aria-expanded={accountOpen} aria-haspopup="menu" className={`flex min-h-12 min-w-16 flex-col items-center justify-center gap-1 rounded-xl text-[11px] ${accountOpen ? 'bg-[#fff0e9] font-semibold text-[#df7548]' : 'text-[#78857d]'}`} onClick={() => { setAccountOpen((open) => !open) }} type="button"><span aria-hidden="true" className="grid size-5 place-items-center rounded-full bg-[#f5d9c8] text-[8px] font-semibold text-[#8d4c30]">{initials(user.name)}</span><span>Account</span></button>{accountMenu}</div></nav>
    </div>
}
