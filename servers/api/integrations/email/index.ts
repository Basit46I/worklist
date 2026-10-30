import nodemailer from 'nodemailer'

export type EmailMessage = Readonly<{ to: string; subject: string; text: string; html: string }>
export type EmailSender = Readonly<{ send: (message: EmailMessage) => Promise<void> }>
export type SmtpConfig = Readonly<{ host: string; port: number; user: string; password: string; from: string }>

export const createSmtpEmailSender = (config: SmtpConfig): EmailSender => {
    const transport = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.port === 465,
        auth: { user: config.user, pass: config.password }
    })
    return Object.freeze({
        send: async (message) => {
            await transport.sendMail({ from: config.from, ...message })
        }
    })
}

export { renderWorklistEmail } from './template.js'
