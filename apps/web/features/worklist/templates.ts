export const addUtcDays = (days: number, now = new Date()): string => {
    const dueDate = new Date(now)
    dueDate.setUTCDate(dueDate.getUTCDate() + days)
    return dueDate.toISOString().slice(0, 10)
}
