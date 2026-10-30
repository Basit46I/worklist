'use client'

import { useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactElement, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { ChevronLeft, ChevronRight, Clock3, Filter, ZoomIn, ZoomOut } from 'lucide-react'
import { Button } from '@workspace/ui/primitives'
import type { WorkItem } from '../model'
import { useDashboardData } from '../use-dashboard-data'
import { ApplicationShell } from './application-shell'

type TimelineOperation = 'move' | 'start' | 'end'
type TimelineGesture = Readonly<{
    itemId: string
    operation: TimelineOperation
    pointerId: number
    originX: number
    dayWidth: number
    startDate: string
    dueDate: string
    delta: number
}>
type CalendarViewPanelProps = Readonly<{
    items: readonly WorkItem[]
    loading?: boolean
    canEdit?: boolean
    onUpdate?: (itemId: string, changes: Partial<WorkItem>) => void
    hasMoreItems?: boolean
    loadingMoreItems?: boolean
    onLoadMore?: () => void
}>

const toKey = (date: Date): string => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
const fromKey = (key: string): Date => {
    const [year, month, day] = key.split('-').map(Number)
    return new Date(year ?? 2000, (month ?? 1) - 1, day ?? 1)
}
const addCalendarDays = (date: Date, days: number): Date => { const next = new Date(date); next.setDate(next.getDate() + days); return next }
const monday = (date: Date): Date => addCalendarDays(date, -((date.getDay() + 6) % 7))
const addCalendarMonths = (date: Date, months: number): Date => new Date(date.getFullYear(), date.getMonth() + months, 1)
const dateLabel = (key: string, options: Intl.DateTimeFormatOptions): string => new Intl.DateTimeFormat(undefined, options).format(fromKey(key))
const taskStarts = (item: WorkItem): string => item.startDate ?? item.dueDate
const calendarDayDifference = (from: string, to: string): number => {
    const parseUtc = (key: string): number => {
        const [year, month, day] = key.split('-').map(Number)
        return Date.UTC(year ?? 2000, (month ?? 1) - 1, day ?? 1)
    }
    return Math.round((parseUtc(to) - parseUtc(from)) / 86_400_000)
}
const shiftCalendarKey = (key: string, days: number): string => toKey(addCalendarDays(fromKey(key), days))
const isCompleted = (status: string): boolean => /done|complete|closed|resolved/i.test(status)
const taskCardTone = (item: WorkItem, today: string): string => isCompleted(item.status)
    ? 'border-[#dce8d9] bg-[#e6eee2] text-[#344c39]'
    : item.dueDate < today
      ? 'border-[#f0c9bf] bg-[#fbece7] text-[#a34432]'
      : 'border-[#dce6eb] bg-[#e8f0f3] text-[#344c51]'

const CalendarMonthGrid = ({ days, items, today, month, zoom, canEdit, gesture, onBegin, onMove, onFinish, onResizeByKey }: Readonly<{
    days: readonly Date[]
    items: readonly WorkItem[]
    today: string
    month: number
    zoom: number
    canEdit: boolean
    gesture: TimelineGesture | null
    onBegin: (event: ReactPointerEvent<HTMLDivElement | HTMLButtonElement>, item: WorkItem, operation: TimelineOperation, dayWidth: number) => void
    onMove: (event: ReactPointerEvent<HTMLDivElement | HTMLButtonElement>) => void
    onFinish: (event: ReactPointerEvent<HTMLDivElement | HTMLButtonElement>) => void
    onResizeByKey: (event: ReactKeyboardEvent<HTMLButtonElement>, item: WorkItem, operation: 'start' | 'end') => void
}>): ReactElement => <section aria-label="Month calendar" className="overflow-hidden rounded-lg border border-[#dce4da] bg-white">
    <div className="grid grid-cols-7 border-b border-[#dce4da] bg-[#f0f3ed]">
        {days.slice(0, 7).map((day) => <div className="flex h-9 items-center px-3 text-[10px] font-semibold uppercase tracking-[.08em] text-[#718076]" key={toKey(day)}>{dateLabel(toKey(day), { weekday: 'short' })}</div>)}
    </div>
    <div className="grid grid-cols-1">
        {Array.from({ length: Math.ceil(days.length / 7) }, (_value, weekIndex) => {
            const weekDays = days.slice(weekIndex * 7, weekIndex * 7 + 7)
            const weekStart = toKey(weekDays[0] ?? days[0] ?? new Date())
            const weekEnd = toKey(weekDays.at(-1) ?? days.at(-1) ?? new Date())
            const weekItems = items.filter((item) => taskStarts(item) <= weekEnd && item.dueDate >= weekStart)
            const gridColumns = 'repeat(7, minmax(0, 1fr))'
            const dateRowHeight = Math.round(34 * zoom / 100)
            const barHeight = Math.round(22 * zoom / 100)
            const barGap = Math.round(26 * zoom / 100)
            const weekHeight = Math.max(76, dateRowHeight + weekItems.length * barGap + 4)
            return <div className="relative grid border-b border-[#dce4da] last:border-b-0" data-calendar-week={weekStart} key={weekStart} style={{ gridTemplateColumns: gridColumns, minHeight: weekHeight }}>
                    {weekDays.map((day, index) => {
                        const key = toKey(day)
                        const isToday = key === today
                        const inMonth = day.getMonth() === month
                        return <div aria-label={`Calendar day ${dateLabel(key, { weekday: 'long', month: 'long', day: 'numeric' })}`} className={`relative border-r border-[#edf0eb] px-2 py-1.5 last:border-r-0 ${isToday ? 'bg-[#edf4e9]' : day.getDay() === 0 || day.getDay() === 6 ? 'bg-[#f6f7f4]' : ''}`} data-calendar-date={key} key={key} style={{ gridColumn: index + 1 }}><span className={`relative z-10 text-xs ${isToday ? 'font-semibold text-[#315b42]' : inMonth ? 'text-[#40564a]' : 'text-[#aab3ab]'}`}>{dateLabel(key, { day: 'numeric' })}</span></div>
                    })}
                    {weekItems.map((item, laneIndex) => {
                        const itemStart = taskStarts(item)
                        const segmentStart = itemStart > weekStart ? itemStart : weekStart
                        const segmentEnd = item.dueDate < weekEnd ? item.dueDate : weekEnd
                        const startColumn = calendarDayDifference(weekStart, segmentStart) + 1
                        const endColumn = calendarDayDifference(weekStart, segmentEnd) + 2
                        const segmentDays = Math.max(1, endColumn - startColumn)
                        const activeGesture = gesture?.itemId === item.id ? gesture : null
                        const previewStart = activeGesture?.operation === 'move'
                            ? shiftCalendarKey(itemStart, activeGesture.delta)
                            : activeGesture?.operation === 'start'
                              ? shiftCalendarKey(itemStart, Math.min(activeGesture.delta, calendarDayDifference(itemStart, item.dueDate)))
                              : itemStart
                        const previewEnd = activeGesture?.operation === 'move'
                            ? shiftCalendarKey(item.dueDate, activeGesture.delta)
                            : activeGesture?.operation === 'end'
                              ? shiftCalendarKey(item.dueDate, Math.max(activeGesture.delta, -calendarDayDifference(itemStart, item.dueDate)))
                              : item.dueDate
                        const visibleStart = previewStart > weekStart ? previewStart : weekStart
                        const visibleEnd = previewEnd < weekEnd ? previewEnd : weekEnd
                        const gridStart = calendarDayDifference(weekStart, visibleStart) + 1
                        const gridEnd = calendarDayDifference(weekStart, visibleEnd) + 2
                        const duration = Math.max(1, calendarDayDifference(previewStart, previewEnd) + 1)
                        const canAdjust = canEdit
                        const showTitle = itemStart >= weekStart || weekIndex === 0
                        const barStyle: CSSProperties = { left: `${(gridStart - 1) * 100 / 7}%`, width: `${(gridEnd - gridStart) * 100 / 7}%`, top: dateRowHeight + laneIndex * barGap, height: barHeight, borderTopLeftRadius: previewStart >= weekStart ? 5 : 2, borderBottomLeftRadius: previewStart >= weekStart ? 5 : 2, borderTopRightRadius: previewEnd <= weekEnd ? 5 : 2, borderBottomRightRadius: previewEnd <= weekEnd ? 5 : 2 }
                        return <div aria-label={`${item.title} timeline bar`} className={`group absolute z-[2] mx-0.5 flex min-w-0 items-center border px-1 text-[10px] shadow-sm ${taskCardTone(item, today)} ${canAdjust ? 'cursor-grab active:cursor-grabbing' : ''}`} key={`${weekStart}:${item.id}`} onPointerDown={(event) => { if (event.target instanceof Element && event.target.closest('button')) return; onBegin(event, item, 'move', event.currentTarget.getBoundingClientRect().width / segmentDays) }} onPointerMove={onMove} onPointerUp={onFinish} onPointerCancel={onFinish} style={barStyle} title={`${item.title} · ${dateLabel(previewStart, { month: 'short', day: 'numeric' })} – ${dateLabel(previewEnd, { month: 'short', day: 'numeric' })} · ${duration} days`}>
                            {canAdjust && previewStart >= weekStart && <button aria-label={`Resize start of ${item.title}`} className="absolute -left-1.5 z-10 h-6 w-3 cursor-ew-resize rounded-full bg-[#365d45] opacity-60 hover:opacity-100 focus-visible:opacity-100" onKeyDown={(event) => { onResizeByKey(event, item, 'start') }} onPointerDown={(event) => { onBegin(event, item, 'start', (event.currentTarget.closest('[data-calendar-week]')?.getBoundingClientRect().width ?? 7) / 7) }} onPointerMove={onMove} onPointerUp={onFinish} onPointerCancel={onFinish} title="Drag to change start date" type="button" />}
                            {showTitle && <span className="min-w-0 flex-1 truncate text-center font-medium">{item.title} <span className="text-[9px] font-normal opacity-70">{duration}d</span></span>}
                            {canAdjust && previewEnd <= weekEnd && <button aria-label={`Resize due date of ${item.title}`} className="absolute -right-1.5 z-10 h-6 w-3 cursor-ew-resize rounded-full bg-[#365d45] opacity-60 hover:opacity-100 focus-visible:opacity-100" onKeyDown={(event) => { onResizeByKey(event, item, 'end') }} onPointerDown={(event) => { onBegin(event, item, 'end', (event.currentTarget.closest('[data-calendar-week]')?.getBoundingClientRect().width ?? 7) / 7) }} onPointerMove={onMove} onPointerUp={onFinish} onPointerCancel={onFinish} title="Drag to change due date" type="button" />}
                        </div>
                    })}
            </div>
        })}
    </div>
</section>

export const CalendarPage = (): ReactElement => {
    const data = useDashboardData()
    if (!data.user) return <main className="grid min-h-screen place-items-center bg-[#f3f5f1] p-6 text-sm text-[#66736a]">{data.error || 'Loading your calendar…'}</main>

    return <ApplicationShell activeRoute="calendar" onSignOut={data.logout} signOutBusy={data.signOutBusy} user={data.user}>
        <div className="calendar-page mx-auto max-w-[1440px] px-5 pb-10 pt-7 sm:px-8 sm:pt-8">
            {data.error && <p className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700" role="alert">{data.error}</p>}
            <CalendarViewPanel canEdit={data.user.role !== 'viewer'} items={data.scopedItems} loading={data.loading} onUpdate={data.updateItem} />
        </div>
    </ApplicationShell>
}

export const CalendarViewPanel = ({ items, loading = false, canEdit = false, onUpdate, hasMoreItems = false, loadingMoreItems = false, onLoadMore }: CalendarViewPanelProps): ReactElement => {
    const [selectedDate, setSelectedDate] = useState(() => toKey(new Date()))
    const [filterOpen, setFilterOpen] = useState(false)
    const [statusFilter, setStatusFilter] = useState('All')
    const [assigneeFilter, setAssigneeFilter] = useState('All')
    const [zoom, setZoom] = useState(100)
    const [timelineGesture, setTimelineGesture] = useState<TimelineGesture | null>(null)
    const timelineGestureRef = useRef<TimelineGesture | null>(null)
    const date = fromKey(selectedDate)
    const visibleDate = fromKey(selectedDate)
    const firstCalendarDay = addCalendarDays(monday(new Date(visibleDate.getFullYear(), visibleDate.getMonth(), 1)), -7)
    const calendarDays = Array.from({ length: 42 }, (_value, index) => addCalendarDays(firstCalendarDay, index))
    const firstKey = toKey(calendarDays[0] ?? date)
    const lastKey = toKey(calendarDays.at(-1) ?? date)
    const title = dateLabel(selectedDate, { month: 'long', year: 'numeric' })
    const todayKey = toKey(new Date())
    const statuses = [...new Set(items.map((item) => item.status))].sort((left, right) => left.localeCompare(right))
    const assignees = [...new Set(items.map((item) => item.assignee || 'Unassigned'))].sort((left, right) => left.localeCompare(right))
    const filteredItems = items.filter((item) => (statusFilter === 'All' || item.status === statusFilter) && (assigneeFilter === 'All' || (item.assignee || 'Unassigned') === assigneeFilter))

    const navigate = (direction: -1 | 1): void => { setSelectedDate(toKey(addCalendarMonths(date, direction))) }
    const beginTimelineGesture = (event: ReactPointerEvent<HTMLDivElement | HTMLButtonElement>, item: WorkItem, operation: TimelineOperation, dayWidth: number): void => {
        if (!canEdit || !onUpdate) return
        event.preventDefault()
        event.stopPropagation()
        const nextGesture: TimelineGesture = { itemId: item.id, operation, pointerId: event.pointerId, originX: event.clientX, dayWidth, startDate: taskStarts(item), dueDate: item.dueDate, delta: 0 }
        timelineGestureRef.current = nextGesture
        setTimelineGesture(nextGesture)
        event.currentTarget.setPointerCapture(event.pointerId)
    }
    const moveTimelineGesture = (event: ReactPointerEvent<HTMLDivElement | HTMLButtonElement>): void => {
        const current = timelineGestureRef.current
        if (!current || current.pointerId !== event.pointerId) return
        const delta = Math.round((event.clientX - current.originX) / current.dayWidth)
        const nextGesture = { ...current, delta }
        timelineGestureRef.current = nextGesture
        setTimelineGesture(nextGesture)
    }
    const finishTimelineGesture = (event: ReactPointerEvent<HTMLDivElement | HTMLButtonElement>): void => {
        const current = timelineGestureRef.current
        if (!current || current.pointerId !== event.pointerId) return
        timelineGestureRef.current = null
        setTimelineGesture(null)
        if (!onUpdate) return
        if (current.operation === 'move') {
            const hoveredWeek = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-calendar-week]')
            const weekStart = hoveredWeek?.dataset.calendarWeek
            const weekBounds = hoveredWeek?.getBoundingClientRect()
            const dropColumn = weekStart && weekBounds && weekBounds.width > 0
                ? Math.max(0, Math.min(6, Math.floor(((event.clientX - weekBounds.left) / weekBounds.width) * 7)))
                : null
            const dropDate = weekStart && dropColumn !== null ? shiftCalendarKey(weekStart, dropColumn) : null
            const delta = dropDate ? calendarDayDifference(current.startDate, dropDate) : current.delta
            if (delta === 0) return
            onUpdate(current.itemId, { startDate: shiftCalendarKey(current.startDate, delta), dueDate: shiftCalendarKey(current.dueDate, delta) })
            return
        }
        if (current.delta === 0) return
        if (current.operation === 'start') {
            onUpdate(current.itemId, { startDate: shiftCalendarKey(current.startDate, Math.min(current.delta, calendarDayDifference(current.startDate, current.dueDate))) })
            return
        }
        onUpdate(current.itemId, { dueDate: shiftCalendarKey(current.dueDate, Math.max(current.delta, -calendarDayDifference(current.startDate, current.dueDate))) })
    }
    const resizeTimelineByKey = (event: ReactKeyboardEvent<HTMLButtonElement>, item: WorkItem, operation: 'start' | 'end'): void => {
        if (!onUpdate || (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')) return
        event.preventDefault()
        const delta = event.key === 'ArrowLeft' ? -1 : 1
        const start = taskStarts(item)
        if (operation === 'start') onUpdate(item.id, { startDate: shiftCalendarKey(start, Math.min(delta, calendarDayDifference(start, item.dueDate))) })
        else onUpdate(item.id, { dueDate: shiftCalendarKey(item.dueDate, Math.max(delta, -calendarDayDifference(start, item.dueDate))) })
    }
    const orderedItems = [...filteredItems]
        .filter((item) => taskStarts(item) <= lastKey && item.dueDate >= firstKey)
        .sort((left, right) => taskStarts(left).localeCompare(taskStarts(right)) || left.title.localeCompare(right.title))

    return <section aria-label="calendar task timeline" className="space-y-4">
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex flex-wrap items-center gap-2">
                <h2 className="mr-2 font-serif text-[26px] font-normal text-[#294337]">{title}</h2>
                <Button aria-label="Previous calendar period" className="size-9" onClick={() => { navigate(-1) }} size="icon" variant="outline"><ChevronLeft aria-hidden="true" className="size-4" /></Button>
                <Button aria-label="Next calendar period" className="size-9" onClick={() => { navigate(1) }} size="icon" variant="outline"><ChevronRight aria-hidden="true" className="size-4" /></Button>
                <Button className="h-9 px-4" onClick={() => { setSelectedDate(todayKey) }} variant="outline">Today</Button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
                <Button aria-expanded={filterOpen} className="h-9 border-[#d9dfd5] bg-white px-3 text-xs text-[#344b3d] shadow-none" onClick={() => { setFilterOpen((open) => !open) }} variant="outline"><Filter aria-hidden="true" className="size-3.5" />Filters</Button>
                <div aria-label="Calendar zoom" className="flex h-9 items-center gap-1 rounded-lg border border-[#d9dfd5] bg-white px-1">
                    <Button aria-label="Zoom out calendar" className="size-7" disabled={zoom <= 70} onClick={() => { setZoom((current) => Math.max(70, current - 10)) }} size="icon" variant="ghost"><ZoomOut aria-hidden="true" className="size-3.5" /></Button>
                    <span className="min-w-10 text-center text-xs tabular-nums text-[#42564a]">{zoom}%</span>
                    <Button aria-label="Zoom in calendar" className="size-7" disabled={zoom >= 130} onClick={() => { setZoom((current) => Math.min(130, current + 10)) }} size="icon" variant="ghost"><ZoomIn aria-hidden="true" className="size-3.5" /></Button>
                </div>
            </div>
        </header>
        {loading ? <div className="grid min-h-[560px] place-items-center rounded-lg border border-[#dce4da] bg-white text-sm text-[#718076]"><span className="flex items-center gap-2"><Clock3 aria-hidden="true" className="size-4" />Loading calendar tasks…</span></div> : <CalendarMonthGrid days={calendarDays} items={orderedItems} today={todayKey} month={date.getMonth()} zoom={zoom} canEdit={canEdit && Boolean(onUpdate)} gesture={timelineGesture} onBegin={beginTimelineGesture} onMove={moveTimelineGesture} onFinish={finishTimelineGesture} onResizeByKey={resizeTimelineByKey} />}
        {filterOpen && <div className="flex flex-wrap items-center gap-3 rounded-lg border border-[#dce4da] bg-white p-3">
            <label className="grid gap-1 text-[10px] font-semibold uppercase tracking-[.08em] text-[#718076]">Status<select aria-label="Calendar status filter" className="h-8 min-w-36 rounded-md border border-[#dce4da] bg-white px-2 text-xs font-normal normal-case tracking-normal text-[#344b3d]" onChange={(event) => { setStatusFilter(event.target.value) }} value={statusFilter}><option value="All">All statuses</option>{statuses.map((status) => <option key={status}>{status}</option>)}</select></label>
            <label className="grid gap-1 text-[10px] font-semibold uppercase tracking-[.08em] text-[#718076]">Assignee<select aria-label="Calendar assignee filter" className="h-8 min-w-36 rounded-md border border-[#dce4da] bg-white px-2 text-xs font-normal normal-case tracking-normal text-[#344b3d]" onChange={(event) => { setAssigneeFilter(event.target.value) }} value={assigneeFilter}><option value="All">All assignees</option>{assignees.map((assignee) => <option key={assignee}>{assignee}</option>)}</select></label>
            <span className="self-end pb-2 text-xs text-[#7b887e]">{filteredItems.length} tasks</span>
        </div>}
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#718076]"><p>{orderedItems.length} tasks in {title}</p><p>Drag a bar to move it · Drag either end to resize</p></div>
        {hasMoreItems && <div className="border-t border-[#e8ece6] p-3 text-center"><Button disabled={loadingMoreItems} onClick={() => { onLoadMore?.() }} variant="outline">{loadingMoreItems ? 'Loading tasks…' : 'Load more tasks'}</Button></div>}
        {!loading && !items.length && <p className="border-t border-[#edf0eb] p-4 text-center text-sm text-[#718076]">No tasks in this workspace yet. Create one in the Worklist to see it here.</p>}
    </section>
}
