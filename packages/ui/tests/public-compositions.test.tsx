import test from 'node:test'
import assert from 'node:assert/strict'
import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import {
    Alert, AlertDescription, AlertTitle, Badge, Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList,
    BreadcrumbPage, BreadcrumbSeparator, Button, ButtonGroup, ButtonGroupSeparator, ButtonGroupText,
    Calendar, Avatar, AvatarFallback, AvatarImage, Command, CommandEmpty, CommandGroup, CommandInput,
    CommandItem, CommandList, CommandSeparator, CommandShortcut, Accordion, AccordionContent,
    AccordionItem, AccordionTrigger, Checkbox, RadioGroup, RadioGroupItem, Switch, Tabs, TabsContent,
    TabsList, TabsTrigger,
    ChartContainer, Sidebar, SidebarContent, SidebarFooter,
    SidebarGroup, SidebarGroupAction, SidebarGroupContent, SidebarGroupLabel, SidebarHeader,
    SidebarInput, SidebarMenu, SidebarMenuAction, SidebarMenuBadge, SidebarMenuButton,
    SidebarMenuItem, SidebarMenuSkeleton, SidebarMenuSub, SidebarMenuSubButton, SidebarMenuSubItem,
    SidebarProvider, SidebarSeparator,
    Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, Empty, EmptyContent,
    EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle, Field, FieldContent, FieldDescription,
    FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSeparator, FieldSet, FieldTitle,
    Input, Kbd, Label, Progress, Separator, Skeleton, Spinner,
    Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow,
    Textarea, Toggle, ToggleGroup, ToggleGroupItem
} from '../src/primitives/index.js'
import { PageHeader } from '../src/components/index.js'
import { MessageState, PageShell } from '../src/compositions/index.js'
import * as Primitive from '../src/primitives/index.js'

void test('public UI compositions preserve accessible content and semantic element structure', () => {
    const markup = renderToStaticMarkup(h('main', null,
        h(PageHeader, { eyebrow: 'WORKSPACE', title: 'Release plan', description: 'Plan the next release.', icon: h('span', null, 'W') }),
        h(PageShell, { width: 'narrow', className: 'test-shell', children: h('p', null, 'Page content') }),
        h(MessageState, { eyebrow: 'EMPTY', title: 'No tasks', description: 'Create a task to get started.', icon: h('span', null, '!'), action: h(Button, null, 'Create task') }),
        h(Alert, { variant: 'destructive' }, h(AlertTitle, null, 'Request failed'), h(AlertDescription, null, 'Try again.')),
        h(Breadcrumb, null, h(BreadcrumbList, null, h(BreadcrumbItem, null, h(BreadcrumbLink, { href: '/workspace' }, 'Workspace')), h(BreadcrumbSeparator), h(BreadcrumbItem, null, h(BreadcrumbPage, null, 'Release')))),
        h(Card, null, h(CardHeader, null, h(CardTitle, null, 'Progress'), h(CardDescription, null, 'Current release')), h(CardContent, null, h(Progress, { value: 60 })), h(CardFooter, null, h(Badge, { variant: 'secondary' }, 'On track'))),
        h(ButtonGroup, { orientation: 'vertical' }, h(Button, null, 'Save'), h(ButtonGroupSeparator), h(ButtonGroupText, null, 'Shortcut')),
        h(Empty, null, h(EmptyHeader, null, h(EmptyMedia, { variant: 'icon' }, 'i'), h(EmptyTitle, null, 'Nothing here'), h(EmptyDescription, null, 'Add the first task.')), h(EmptyContent, null, h(Button, null, 'Add task'))),
        h(FieldSet, null, h(FieldLegend, { variant: 'label' }, 'Task details'), h(FieldGroup, null, h(Field, { orientation: 'horizontal' }, h(FieldLabel, { htmlFor: 'task-title' }, 'Title'), h(FieldContent, null, h(FieldTitle, null, 'Required'), h(Input, { id: 'task-title', 'aria-label': 'Task title' }), h(FieldDescription, null, 'Use a short title.'), h(FieldError, { errors: [{ message: 'A title is required.' }] }))), h(FieldSeparator, { children: 'or' }))),
        h(Label, { htmlFor: 'notes' }, 'Notes'), h(Textarea, { id: 'notes', 'aria-label': 'Notes' }),
        h('p', null, 'Keyboard shortcut ', h(Kbd, null, '⌘K')),
        h(ToggleGroup, { type: 'single', 'aria-label': 'Display density' }, h(ToggleGroupItem, { value: 'compact', 'aria-label': 'Compact' }, 'Compact'), h(ToggleGroupItem, { value: 'comfortable' }, 'Comfortable')),
        h(Toggle, { 'aria-label': 'Pin task', pressed: true }, 'Pinned'),
        h(Separator, { decorative: false }), h(Skeleton, { 'aria-label': 'Loading task' }), h(Spinner, { 'aria-label': 'Loading' }),
        h(Table, null, h(TableCaption, null, 'Release tasks'), h(TableHeader, null, h(TableRow, null, h(TableHead, null, 'Task'))), h(TableBody, null, h(TableRow, null, h(TableCell, null, 'Write tests'))), h(TableFooter, null, h(TableRow, null, h(TableCell, null, '1 task'))))
    ))

    assert.match(markup, /<h1[^>]*>Release plan<\/h1>/)
    assert.match(markup, /role="alert"/)
    assert.match(markup, /aria-label="Task title"/)
    assert.match(markup, /Write tests/)
    assert.match(markup, /No tasks/)
    assert.match(markup, /Compact/)
})

void test('calendar, command, selection and disclosure primitives compose their accessible states', (context) => {
    context.mock.timers.enable({ apis: ['Date'], now: new Date('2026-11-05T12:00:00.000Z') })
    const markup = renderToStaticMarkup(h('section', null,
        h(Calendar, { mode: 'single', selected: new Date('2026-11-05T12:00:00.000Z'), defaultMonth: new Date('2026-11-01T12:00:00.000Z'), captionLayout: 'dropdown', showOutsideDays: false, 'aria-label': 'Schedule calendar' }),
        h(Avatar, null, h(AvatarImage, { src: '/avatar.png', alt: 'Ayesha' }), h(AvatarFallback, null, 'AK')),
        h(Command, { 'aria-label': 'Task actions' }, h(CommandInput, { placeholder: 'Find a task' }), h(CommandList, null, h(CommandEmpty, null, 'No results'), h(CommandGroup, { heading: 'Tasks' }, h(CommandItem, { value: 'review' }, 'Review release', h(CommandShortcut, null, '⌘R')), h(CommandSeparator)))),
        h(Tabs, { defaultValue: 'list' }, h(TabsList, null, h(TabsTrigger, { value: 'list' }, 'List'), h(TabsTrigger, { value: 'board' }, 'Board')), h(TabsContent, { value: 'list' }, 'Task list'), h(TabsContent, { value: 'board' }, 'Task board')),
        h(Checkbox, { checked: true, 'aria-label': 'Mark complete' }),
        h(RadioGroup, { defaultValue: 'week', 'aria-label': 'Calendar range' }, h(RadioGroupItem, { value: 'day', 'aria-label': 'Day' }), h(RadioGroupItem, { value: 'week', 'aria-label': 'Week' })),
        h(Switch, { checked: true, 'aria-label': 'Enable notifications' }),
        h(Accordion, { type: 'single', defaultValue: 'details', collapsible: true }, h(AccordionItem, { value: 'details' }, h(AccordionTrigger, null, 'Details'), h(AccordionContent, null, 'Schedule details')))
    ))

    assert.match(markup, /data-slot="calendar"/)
    assert.match(markup, /aria-label="Schedule calendar"/)
    assert.match(markup, /Review release/)
    assert.match(markup, /aria-label="Week"/)
    assert.match(markup, /Schedule details/)
})

void test('chart container maps its public config into chart styles', () => {
    const markup = renderToStaticMarkup(h(ChartContainer, { config: { open: { label: 'Open tasks', color: '#34745b' } }, id: 'workload', children: h('span', null, 'plot') }))
    assert.match(markup, /data-chart="chart-workload"/)
    assert.match(markup, /--color-open: #34745b/)
})

void test('sidebar components render a complete navigation shell with active and compact affordances', () => {
    const markup = renderToStaticMarkup(h(SidebarProvider, { defaultOpen: false },
        h(Sidebar, { variant: 'floating' },
            h(SidebarHeader, null, 'Worklist'),
            h(SidebarInput, { 'aria-label': 'Search navigation' }),
            h(SidebarContent, null,
                h(SidebarGroup, null,
                    h(SidebarGroupLabel, { asChild: true }, h('span', null, 'Workspace')),
                    h(SidebarGroupAction, { 'aria-label': 'Add section' }, '+'),
                    h(SidebarGroupContent, null, h(SidebarMenu, null,
                        h(SidebarMenuItem, null, h(SidebarMenuButton, { isActive: true, tooltip: 'Overview' }, 'Overview'), h(SidebarMenuAction, { showOnHover: true, 'aria-label': 'More actions' }, '…'), h(SidebarMenuBadge, null, '2')),
                        h(SidebarMenuSub, null, h(SidebarMenuSubItem, null, h(SidebarMenuSubButton, { href: '/worklist', size: 'sm', isActive: true }, 'Tasks'))),
                        h(SidebarMenuSkeleton, { showIcon: true })
                    ))
                )
            ),
            h(SidebarSeparator),
            h(SidebarFooter, null, 'Account')
        )
    ))
    assert.match(markup, /data-state="collapsed"/)
    assert.match(markup, /data-sidebar="menu-button"/)
    assert.match(markup, /Overview/)
    assert.match(markup, /data-sidebar="menu-skeleton-icon"/)
    assert.match(markup, /Account/)
})

void test('form controls, pagination, menus, and rich items render their composite contracts', () => {
    const markup = renderToStaticMarkup(h('div', null,
        h(Primitive.InputGroup, null, h(Primitive.InputGroupAddon, { align: 'inline-start' }, 'Search'), h(Primitive.InputGroupInput, { 'aria-label': 'Search workspace' }), h(Primitive.InputGroupButton, { size: 'icon-sm' }, 'Go'), h(Primitive.InputGroupText, null, '⌘K'), h(Primitive.InputGroupTextarea, { 'aria-label': 'Search notes' })),
        h(Primitive.InputOTP, { maxLength: 4, value: '12', onChange: () => {}, children: h(Primitive.InputOTPGroup, null, h(Primitive.InputOTPSlot, { index: 0 }), h(Primitive.InputOTPSlot, { index: 1 }), h(Primitive.InputOTPSeparator), h(Primitive.InputOTPSlot, { index: 2 }), h(Primitive.InputOTPSlot, { index: 3 })) }),
        h(Primitive.ItemGroup, null, h(Primitive.Item, { variant: 'outline' }, h(Primitive.ItemMedia, { variant: 'icon' }, 'W'), h(Primitive.ItemContent, null, h(Primitive.ItemHeader, null, h(Primitive.ItemTitle, null, 'Work item'), h(Primitive.ItemActions, null, 'Today')), h(Primitive.ItemDescription, null, 'Prepare release notes.')), h(Primitive.ItemFooter, null, 'Assigned to Ayesha'))), h(Primitive.ItemSeparator),
        h(Primitive.Pagination, { 'aria-label': 'Task pages' }, h(Primitive.PaginationContent, null, h(Primitive.PaginationItem, null, h(Primitive.PaginationPrevious, { href: '?page=1' })), h(Primitive.PaginationItem, null, h(Primitive.PaginationLink, { href: '?page=2', isActive: true }, '2')), h(Primitive.PaginationItem, null, h(Primitive.PaginationEllipsis)), h(Primitive.PaginationItem, null, h(Primitive.PaginationNext, { href: '?page=3' })))),
        h(Primitive.Menubar, null, h(Primitive.MenubarMenu, null, h(Primitive.MenubarTrigger, null, 'File'), h(Primitive.MenubarContent, null, h(Primitive.MenubarItem, null, 'Export'), h(Primitive.MenubarSeparator), h(Primitive.MenubarShortcut, null, '⌘E')))),
        h(Primitive.NavigationMenu, null, h(Primitive.NavigationMenuList, null, h(Primitive.NavigationMenuItem, null, h(Primitive.NavigationMenuTrigger, null, 'Projects'), h(Primitive.NavigationMenuContent, null, h(Primitive.NavigationMenuLink, { href: '/worklist' }, 'Worklist')))), h(Primitive.NavigationMenuViewport)),
        h(Primitive.ScrollArea, { className: 'h-24' }, h('p', null, 'Scrollable task list'), h(Primitive.ScrollBar, { orientation: 'horizontal' })),
        h(Primitive.Slider, { 'aria-label': 'Effort', defaultValue: [25], max: 100, step: 5 }),
        h(Primitive.Popover, null, h(Primitive.PopoverTrigger, null, 'Open filters'), h(Primitive.PopoverContent, null, 'Filter options')),
        h(Primitive.DropdownMenu, null, h(Primitive.DropdownMenuTrigger, null, 'Actions'), h(Primitive.DropdownMenuContent, null, h(Primitive.DropdownMenuItem, null, 'Duplicate'), h(Primitive.DropdownMenuSeparator), h(Primitive.DropdownMenuLabel, null, 'More'))),
        h(Primitive.ContextMenu, null, h(Primitive.ContextMenuTrigger, null, 'Task row'), h(Primitive.ContextMenuContent, null, h(Primitive.ContextMenuItem, null, 'Archive')))
    ))
    assert.match(markup, /Search workspace/)
    assert.match(markup, /Work item/)
    assert.match(markup, /Assigned to Ayesha/)
    assert.match(markup, /aria-label="Task pages"/)
    assert.match(markup, /Scrollable task list/)
    assert.match(markup, /Task row/)
})
