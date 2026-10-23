import { useEffect } from 'react'

const isTypingTarget = (target: EventTarget | null): boolean => {
    if (!(target instanceof HTMLElement)) return false
    return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
}

export const useWorklistKeyboardShortcuts = (onNewTask: () => void): void => {
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent): void => {
            if (event.altKey || event.ctrlKey || event.metaKey || event.repeat || isTypingTarget(event.target)) return
            if (event.key.toLocaleLowerCase() === 'n') {
                event.preventDefault()
                onNewTask()
            }
            if (event.key === '/') {
                event.preventDefault()
                document.querySelector<HTMLInputElement>('input[aria-label="Search tasks"]')?.focus()
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [onNewTask])
}
