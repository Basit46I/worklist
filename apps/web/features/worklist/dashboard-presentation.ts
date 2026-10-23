export const dateOffset = (date: string, days: number): string => {
    const value = new Date(`${date}T00:00:00.000Z`)
    value.setUTCDate(value.getUTCDate() + days)
    return value.toISOString().slice(0, 10)
}

export const formatDate = (date: string): string =>
    new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00.000Z`))

export const formatCount = (count: number, singular: string): string => `${count} ${singular}${count === 1 ? '' : 's'}`

export const initials = (name: string): string =>
    name
        .split(/\s+/)
        .map((part) => part[0] ?? '')
        .join('')
        .slice(0, 2)
        .toUpperCase()

export const statusColor = (status: string): string =>
    status === 'Done' ? '#3f7c58' : status === 'In progress' ? '#789b5a' : status === 'In review' ? '#5f8491' : '#a5aea6'

export const priorityColor = (priority: string): string => (priority === 'High' ? '#b86155' : priority === 'Medium' ? '#66845c' : '#a5aea6')
