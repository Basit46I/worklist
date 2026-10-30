import type { ReactElement } from 'react'
import { ArrowUpRight, Check, Circle, Clock3, Layers3 } from 'lucide-react'

const previewTasks = [
    { title: 'Prepare launch checklist', status: 'In progress', date: 'Today', active: true },
    { title: 'Review the new experience', status: 'To do', date: 'Tomorrow', active: false },
    { title: 'Share the team update', status: 'Done', date: 'Oct 28', active: false },
] as const

export const WorklistAuthBrand = (): ReactElement => (
    <aside aria-label="About Worklist" className="auth-brand relative hidden min-h-[calc(100vh-2.5rem)] flex-col justify-between overflow-hidden rounded-[1.6rem] bg-[#153d31] p-8 text-white lg:flex xl:p-12">
        <div aria-hidden="true" className="auth-brand-orb absolute -right-28 -top-36 size-[34rem] rounded-full border border-white/[.08]" />
        <div aria-hidden="true" className="absolute -bottom-40 -left-24 size-[30rem] rounded-full bg-[#b8d3aa]/[.08] blur-[85px]" />
        <div className="relative flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-[14px] border border-white/15 bg-white/[.09] text-sm font-semibold text-[#e4efd9]">W</span>
            <span className="text-lg font-semibold tracking-[-.04em]">Worklist</span>
            <span className="ml-1 rounded-full border border-white/15 px-2.5 py-1 text-[9px] font-medium uppercase tracking-[.15em] text-white/55">Team workspace</span>
        </div>
        <div className="relative my-10 max-w-2xl">
            <p className="mb-5 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.2em] text-[#bfd6a9]"><span className="size-1.5 rounded-full bg-[#bfd6a9]" />A little more clarity, every day</p>
            <h2 className="max-w-xl text-[3.25rem] font-medium leading-[1.02] tracking-[-.065em] xl:text-[4.4rem]">Make room for <span className="font-serif font-normal italic text-[#c5d8ad]">good work.</span></h2>
            <p className="mt-5 max-w-md text-[14px] leading-7 text-white/65">Plan together, make ownership clear, and keep the next step visible from the first task to the finish line.</p>
            <div aria-label="Example team worklist" className="auth-preview mt-9 max-w-[490px] rounded-2xl border border-white/[.14] bg-[#0e3027]/65 p-3.5 shadow-[0_24px_60px_-25px_rgba(0,0,0,.45)] backdrop-blur-sm">
                <div className="flex items-center justify-between border-b border-white/10 px-2 pb-3"><div><p className="text-[11px] font-medium text-white/85">Website refresh</p><p className="mt-1 text-[9px] text-white/45">Design team · 3 tasks</p></div><span className="flex items-center gap-1.5 rounded-full bg-[#c4d9ad]/10 px-2.5 py-1 text-[9px] font-medium text-[#c9dfb6]"><span className="size-1.5 rounded-full bg-[#b5d29c]" />On track</span></div>
                <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-x-3 px-2 pt-1">{previewTasks.map((task) => <div className="col-span-3 grid grid-cols-subgrid items-center gap-y-0 border-b border-white/[.06] py-3 last:border-0" key={task.title}><span className="flex min-w-0 items-center gap-2.5 text-[10px] text-white/75">{task.active ? <span className="size-2 rounded-full bg-[#c1d9a7]" /> : task.status === 'Done' ? <Check aria-hidden="true" className="size-3 text-[#b7d49d]" /> : <Circle aria-hidden="true" className="size-3 text-white/35" />}<span className="truncate">{task.title}</span></span><span className={`rounded-md px-2 py-1 text-[8px] ${task.active ? 'bg-[#bfd6a9]/10 text-[#d0e2bc]' : 'bg-white/[.06] text-white/50'}`}>{task.status}</span><span className="flex items-center gap-1 text-[9px] text-white/45"><Clock3 aria-hidden="true" className="size-3" />{task.date}</span></div>)}</div>
                <div className="mt-1 flex items-center justify-between border-t border-white/10 px-2 pt-3 text-[9px] text-white/45"><span className="flex items-center gap-1.5"><Layers3 aria-hidden="true" className="size-3" />One shared source of truth</span><ArrowUpRight aria-hidden="true" className="size-3.5" /></div>
            </div>
        </div>
        <div className="relative flex items-center justify-between gap-4 text-[10px] text-white/40"><span>Thoughtful planning for teams that care about the details.</span><span>01 — 03</span></div>
    </aside>
)
