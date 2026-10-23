import type { ReactElement } from "react"

export const WorklistAuthBrand = (): ReactElement => (
        <section
            aria-label="About Worklist"
            className="relative hidden min-h-[calc(100vh-2.5rem)] flex-col justify-between overflow-hidden rounded-[1.75rem] bg-[#17251c] p-10 text-white lg:flex xl:p-14">
            <div
                className="absolute -right-28 top-16 size-[26rem] rounded-full border border-white/[0.08]"
                aria-hidden="true"
            />
            <div
                className="absolute -right-12 top-32 size-72 rounded-full border border-white/[0.08]"
                aria-hidden="true"
            />
            <div
                className="absolute -bottom-56 left-1/3 size-[34rem] rounded-full bg-[#c7f36b]/[0.035] blur-3xl"
                aria-hidden="true"
            />
            <div className="relative flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-[#c7f36b] font-bold text-[#17211c]">W</span>
                <span className="font-semibold tracking-tight">Worklist</span>
                <span className="ml-1 text-xs text-white/35">TEAM WORKSPACE</span>
            </div>
            <div className="relative my-12 max-w-xl">
                <p className="mb-5 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#c7f36b]">A calmer way to get work done</p>
                <h2 className="text-5xl font-medium leading-[1.02] tracking-[-0.055em] xl:text-6xl">
                    Make the work <span className="font-serif font-normal italic text-[#c7f36b]">visible.</span>
                </h2>
                <p className="mt-6 max-w-md text-base leading-7 text-white/60">
                    Keep tasks, owners, and deadlines in one clear place. Give your team the context to move forward together.
                </p>
                <div
                    aria-hidden="true"
                    className="relative mt-10 max-w-lg rounded-2xl border border-white/10 bg-[#223128]/80 p-4 shadow-2xl shadow-black/10 backdrop-blur-sm">
                    <div className="mb-3 flex items-center justify-between border-b border-white/10 pb-3">
                        <span className="text-xs font-medium text-white/80">Team workspace</span>
                        <span className="flex items-center gap-1.5 rounded-full bg-[#c7f36b]/10 px-2.5 py-1 text-[10px] font-medium text-[#c7f36b]">
                            <span className="size-1.5 rounded-full bg-[#c7f36b]" /> In sync
                        </span>
                    </div>
                    <div className="grid grid-cols-[1fr_auto_auto] items-center gap-4 rounded-xl bg-white/[0.06] px-3 py-3">
                        <div className="flex items-center gap-3">
                            <span className="size-2 rounded-full bg-[#c7f36b]" />
                            <span className="h-2 w-36 rounded-full bg-white/25" />
                        </div>
                        <span className="rounded-full bg-[#c7f36b]/10 px-2 py-1 text-[10px] text-[#c7f36b]">In progress</span>
                        <span className="text-[10px] text-white/50">Fri</span>
                    </div>
                    <div className="mt-2 grid grid-cols-[1fr_auto_auto] items-center gap-4 px-3 py-3">
                        <div className="flex items-center gap-3">
                            <span className="size-2 rounded-full bg-white/30" />
                            <span className="h-2 w-28 rounded-full bg-white/15" />
                        </div>
                        <span className="rounded-full bg-white/[0.06] px-2 py-1 text-[10px] text-white/50">To do</span>
                        <span className="text-[10px] text-white/35">Mon</span>
                    </div>
                    <div className="mt-2 flex items-center gap-2 border-t border-white/10 pt-3 text-[10px] text-white/40">
                        <span className="grid size-5 place-items-center rounded-full bg-white/10">A</span> Team ownership{' '}
                        <span className="mx-1 text-white/20">·</span> Clear next steps
                    </div>
                </div>
            </div>
            <p className="relative text-xs text-white/40">One focused place for your team’s next steps.</p>
        </section>
)
