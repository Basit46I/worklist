import type { ReactElement } from 'react'

export const AuthBrandPanel = (): ReactElement => <aside aria-label="About Worklist" className="relative hidden flex-col justify-between overflow-hidden bg-[#17251c] p-10 text-white lg:flex xl:p-12">
    <div aria-hidden="true" className="absolute -right-28 -top-24 size-80 rounded-full border border-white/[0.08]" />
    <div className="relative flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-xl bg-[#c7f36b] font-bold text-[#17211c]">W</span>
        <span className="font-semibold tracking-tight">Worklist</span>
    </div>
    <div className="relative max-w-md py-12">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#c7f36b]">A workspace that stays clear</p>
        <h2 className="mt-5 text-5xl font-medium leading-[1.04] tracking-[-0.055em]">Good work starts with <span className="font-serif italic text-[#c7f36b]">clarity.</span></h2>
        <p className="mt-5 max-w-sm text-sm leading-6 text-white/60">Keep ownership, deadlines, and the next step in view—so your team can focus on moving forward.</p>
        <div className="mt-9 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <span className="text-xs font-medium text-white/80">Your team workspace</span>
                <span className="rounded-full bg-[#c7f36b]/10 px-2 py-1 text-[9px] font-semibold uppercase tracking-wider text-[#c7f36b]">In sync</span>
            </div>
            <div className="mt-3 flex items-center gap-3 rounded-xl bg-white/[0.05] p-3"><span className="size-2 rounded-full bg-[#c7f36b]" /><span className="h-2 w-2/5 rounded-full bg-white/25" /><span className="ml-auto text-[10px] text-white/55">In progress</span></div>
            <div className="mt-2 flex items-center gap-3 p-3"><span className="size-2 rounded-full bg-white/30" /><span className="h-2 w-1/3 rounded-full bg-white/15" /><span className="ml-auto text-[10px] text-white/40">Due Friday</span></div>
        </div>
    </div>
    <p className="relative text-xs text-white/40">A calm, dependable place to plan work together.</p>
</aside>
